import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { StorageService } from '../src/services/storage.service.js';
import { AuditService } from '../src/services/audit.service.js';

async function main() {
  console.log('Seeding TrustVault database with benchmark accounts & encrypted documents...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.documentGrant.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed benchmark accounts (one for each role)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@trustvault.local',
      name: 'System Administrator',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: 'owner@trustvault.local',
      name: 'Sarah Connor (Document Owner)',
      passwordHash: hashedPassword,
      role: 'DOCUMENT_OWNER',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@trustvault.local',
      name: 'John Doe (Authorized Viewer)',
      passwordHash: hashedPassword,
      role: 'VIEWER',
    },
  });

  const attacker = await prisma.user.create({
    data: {
      email: 'attacker@trustvault.local',
      name: 'Eve Malicious (Unauthorized User)',
      passwordHash: hashedPassword,
      role: 'VIEWER',
    },
  });

  console.log('Created accounts:');
  console.log(`- Admin:    ${admin.email} / ${defaultPassword}`);
  console.log(`- Owner:    ${owner.email} / ${defaultPassword}`);
  console.log(`- Viewer:   ${viewer.email} / ${defaultPassword}`);
  console.log(`- Attacker: ${attacker.email} / ${defaultPassword}`);

  // 2. Audit account seedings
  await AuditService.log({
    actorId: admin.id,
    actorEmail: admin.email,
    actorIp: '127.0.0.1',
    action: 'AUTH_REGISTER',
    resourceId: admin.id,
    resourceType: 'USER',
    status: 'SUCCESS',
    details: { message: 'Admin account seeded' },
  });

  // 3. Seed confidential files with AES-256-GCM encryption
  const dummyPdfHeader = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Title (Confidential Executive Salary Review) /Author (TrustVault) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  );

  const contractBuffer = Buffer.from(
    '%PDF-1.5\n1 0 obj\n<< /Title (Master Client Service Agreement 2026) /Confidential true >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  );

  const encryptedDoc1 = await StorageService.encryptAndStore(dummyPdfHeader, 'Executive_Salaries_2026.pdf');
  const encryptedDoc2 = await StorageService.encryptAndStore(contractBuffer, 'Client_Service_Agreement_Acme.pdf');

  const doc1 = await prisma.document.create({
    data: {
      name: 'Executive_Salaries_2026.pdf',
      storageKey: encryptedDoc1.storageKey,
      mimeType: 'application/pdf',
      fileSize: encryptedDoc1.fileSize,
      category: 'Payroll',
      ownerId: owner.id,
      encryptionIv: encryptedDoc1.encryptionIv,
      encryptionAuthTag: encryptedDoc1.encryptionAuthTag,
      checksum: encryptedDoc1.checksum,
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      name: 'Client_Service_Agreement_Acme.pdf',
      storageKey: encryptedDoc2.storageKey,
      mimeType: 'application/pdf',
      fileSize: encryptedDoc2.fileSize,
      category: 'Legal',
      ownerId: owner.id,
      encryptionIv: encryptedDoc2.encryptionIv,
      encryptionAuthTag: encryptedDoc2.encryptionAuthTag,
      checksum: encryptedDoc2.checksum,
    },
  });

  await AuditService.log({
    actorId: owner.id,
    actorEmail: owner.email,
    actorIp: '127.0.0.1',
    action: 'DOCUMENT_UPLOAD',
    resourceId: doc1.id,
    resourceType: 'DOCUMENT',
    status: 'SUCCESS',
    details: { name: doc1.name, category: doc1.category },
  });

  await AuditService.log({
    actorId: owner.id,
    actorEmail: owner.email,
    actorIp: '127.0.0.1',
    action: 'DOCUMENT_UPLOAD',
    resourceId: doc2.id,
    resourceType: 'DOCUMENT',
    status: 'SUCCESS',
    details: { name: doc2.name, category: doc2.category },
  });

  // 4. Grant READ access to doc2 for viewer
  await prisma.documentGrant.create({
    data: {
      documentId: doc2.id,
      userId: viewer.id,
      permission: 'READ',
      grantedById: owner.id,
      notes: 'Initial legal review grant for client contract',
    },
  });

  await AuditService.log({
    actorId: owner.id,
    actorEmail: owner.email,
    actorIp: '127.0.0.1',
    action: 'GRANT_CREATED',
    resourceId: doc2.id,
    resourceType: 'GRANT',
    status: 'SUCCESS',
    details: { grantedToEmail: viewer.email, permission: 'READ' },
  });

  // 5. Verify the cryptographic audit chain immediately
  const integrity = await AuditService.verifyIntegrity();
  console.log('Cryptographic audit chain verification result:', integrity);

  console.log('Seeding complete! Database is ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
