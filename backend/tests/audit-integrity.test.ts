import { describe, it, expect } from 'vitest';
import { AuditService } from '../src/services/audit.service.js';
import { prisma } from '../src/lib/prisma.js';

describe('TrustVault Cryptographic Audit Ledger Integrity', () => {
  it('mathematically validates an untampered audit chain', async () => {
    // 1. Add known entries
    await AuditService.log({
      actorIp: '127.0.0.1',
      action: 'DOCUMENT_UPLOAD',
      resourceType: 'DOCUMENT',
      resourceId: 'test-doc-1',
      status: 'SUCCESS',
      details: { step: 'one' },
    });

    await AuditService.log({
      actorIp: '127.0.0.1',
      action: 'DOCUMENT_READ',
      resourceType: 'DOCUMENT',
      resourceId: 'test-doc-1',
      status: 'SUCCESS',
      details: { step: 'two' },
    });

    const verification = await AuditService.verifyIntegrity();
    expect(verification.valid).toBe(true);
    expect(verification.totalRecords).toBeGreaterThanOrEqual(2);
  });

  it('detects tampering when an attacker modifies a record payload in the database', async () => {
    // 1. Add record
    const targetRecord = await AuditService.log({
      actorIp: '192.168.1.50',
      action: 'DOCUMENT_DOWNLOAD',
      resourceType: 'DOCUMENT',
      resourceId: 'classified-doc-x',
      status: 'SUCCESS',
      details: { downloadedBy: 'insider' },
    });

    // 2. Add subsequent record
    await AuditService.log({
      actorIp: '192.168.1.50',
      action: 'DOCUMENT_READ',
      resourceType: 'DOCUMENT',
      resourceId: 'classified-doc-x',
      status: 'SUCCESS',
      details: { subsequent: true },
    });

    // 3. Attacker modifies targetRecord's action from DOCUMENT_DOWNLOAD to ACCESS_DENIED
    await prisma.auditLog.update({
      where: { id: targetRecord.id },
      data: { action: 'ACCESS_DENIED' },
    });

    // 4. Verification engine MUST detect the payload tampering
    const verification = await AuditService.verifyIntegrity();
    expect(verification.valid).toBe(false);
    expect(verification.brokenAtId).toBe(targetRecord.id);
    expect(verification.reason).toContain('Tampered payload detected');

    // 5. Cleanup: revert so following tests remain clean
    await prisma.auditLog.update({
      where: { id: targetRecord.id },
      data: { action: 'DOCUMENT_DOWNLOAD' },
    });
  });
});
