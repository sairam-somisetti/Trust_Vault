"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const audit_service_js_1 = require("../src/services/audit.service.js");
const prisma_js_1 = require("../src/lib/prisma.js");
(0, vitest_1.describe)('TrustVault Cryptographic Audit Ledger Integrity', () => {
    (0, vitest_1.it)('mathematically validates an untampered audit chain', async () => {
        // 1. Add known entries
        await audit_service_js_1.AuditService.log({
            actorIp: '127.0.0.1',
            action: 'DOCUMENT_UPLOAD',
            resourceType: 'DOCUMENT',
            resourceId: 'test-doc-1',
            status: 'SUCCESS',
            details: { step: 'one' },
        });
        await audit_service_js_1.AuditService.log({
            actorIp: '127.0.0.1',
            action: 'DOCUMENT_READ',
            resourceType: 'DOCUMENT',
            resourceId: 'test-doc-1',
            status: 'SUCCESS',
            details: { step: 'two' },
        });
        const verification = await audit_service_js_1.AuditService.verifyIntegrity();
        (0, vitest_1.expect)(verification.valid).toBe(true);
        (0, vitest_1.expect)(verification.totalRecords).toBeGreaterThanOrEqual(2);
    });
    (0, vitest_1.it)('detects tampering when an attacker modifies a record payload in the database', async () => {
        // 1. Add record
        const targetRecord = await audit_service_js_1.AuditService.log({
            actorIp: '192.168.1.50',
            action: 'DOCUMENT_DOWNLOAD',
            resourceType: 'DOCUMENT',
            resourceId: 'classified-doc-x',
            status: 'SUCCESS',
            details: { downloadedBy: 'insider' },
        });
        // 2. Add subsequent record
        await audit_service_js_1.AuditService.log({
            actorIp: '192.168.1.50',
            action: 'DOCUMENT_READ',
            resourceType: 'DOCUMENT',
            resourceId: 'classified-doc-x',
            status: 'SUCCESS',
            details: { subsequent: true },
        });
        // 3. Attacker modifies targetRecord's action from DOCUMENT_DOWNLOAD to ACCESS_DENIED
        await prisma_js_1.prisma.auditLog.update({
            where: { id: targetRecord.id },
            data: { action: 'ACCESS_DENIED' },
        });
        // 4. Verification engine MUST detect the payload tampering
        const verification = await audit_service_js_1.AuditService.verifyIntegrity();
        (0, vitest_1.expect)(verification.valid).toBe(false);
        (0, vitest_1.expect)(verification.brokenAtId).toBe(targetRecord.id);
        (0, vitest_1.expect)(verification.reason).toContain('Tampered payload detected');
        // 5. Cleanup: revert so following tests remain clean
        await prisma_js_1.prisma.auditLog.update({
            where: { id: targetRecord.id },
            data: { action: 'DOCUMENT_DOWNLOAD' },
        });
    });
});
