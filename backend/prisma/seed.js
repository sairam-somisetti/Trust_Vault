"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_js_1 = require("../src/lib/prisma.js");
const storage_service_js_1 = require("../src/services/storage.service.js");
const audit_service_js_1 = require("../src/services/audit.service.js");
async function main() {
    console.log('Seeding TrustVault database with benchmark accounts & encrypted documents...');
    // Clean existing data
    await prisma_js_1.prisma.auditLog.deleteMany();
    await prisma_js_1.prisma.documentGrant.deleteMany();
    await prisma_js_1.prisma.document.deleteMany();
    await prisma_js_1.prisma.user.deleteMany();
    const defaultPassword = 'Password123!';
    const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
    // 1. Seed benchmark accounts (one for each role)
    const admin = await prisma_js_1.prisma.user.create({
        data: {
            email: 'admin@trustvault.local',
            name: 'System Administrator',
            passwordHash: hashedPassword,
            role: 'ADMIN',
        },
    });
    const owner = await prisma_js_1.prisma.user.create({
        data: {
            email: 'owner@trustvault.local',
            name: 'Sarah Connor (Document Owner)',
            passwordHash: hashedPassword,
            role: 'DOCUMENT_OWNER',
        },
    });
    const viewer = await prisma_js_1.prisma.user.create({
        data: {
            email: 'viewer@trustvault.local',
            name: 'John Doe (Authorized Viewer)',
            passwordHash: hashedPassword,
            role: 'VIEWER',
        },
    });
    const attacker = await prisma_js_1.prisma.user.create({
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
    await audit_service_js_1.AuditService.log({
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
    const dummyPdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Confidential Executive Salary Review) /Author (TrustVault) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    const contractBuffer = Buffer.from('%PDF-1.5\n1 0 obj\n<< /Title (Master Client Service Agreement 2026) /Confidential true >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    const encryptedDoc1 = await storage_service_js_1.StorageService.encryptAndStore(dummyPdfHeader, 'Executive_Salaries_2026.pdf');
    const encryptedDoc2 = await storage_service_js_1.StorageService.encryptAndStore(contractBuffer, 'Client_Service_Agreement_Acme.pdf');
    const doc1 = await prisma_js_1.prisma.document.create({
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
    const doc2 = await prisma_js_1.prisma.document.create({
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
    await audit_service_js_1.AuditService.log({
        actorId: owner.id,
        actorEmail: owner.email,
        actorIp: '127.0.0.1',
        action: 'DOCUMENT_UPLOAD',
        resourceId: doc1.id,
        resourceType: 'DOCUMENT',
        status: 'SUCCESS',
        details: { name: doc1.name, category: doc1.category },
    });
    await audit_service_js_1.AuditService.log({
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
    await prisma_js_1.prisma.documentGrant.create({
        data: {
            documentId: doc2.id,
            userId: viewer.id,
            permission: 'READ',
            grantedById: owner.id,
            notes: 'Initial legal review grant for client contract',
        },
    });
    await audit_service_js_1.AuditService.log({
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
    const integrity = await audit_service_js_1.AuditService.verifyIntegrity();
    console.log('Cryptographic audit chain verification result:', integrity);
    console.log('Seeding complete! Database is ready.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_js_1.prisma.$disconnect();
});
