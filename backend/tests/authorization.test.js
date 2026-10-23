"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../src/app.js");
const prisma_js_1 = require("../src/lib/prisma.js");
(0, vitest_1.describe)('TrustVault Security & Authorization Test Suite', () => {
    let aliceToken;
    let aliceDocId;
    let bobToken;
    let bobId;
    let adminToken;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Authenticate Alice (Owner)
        const aliceRes = await (0, supertest_1.default)(app_js_1.app)
            .post('/api/auth/login')
            .send({ email: 'owner@trustvault.local', password: 'Password123!' });
        aliceToken = aliceRes.body.token;
        // 2. Authenticate Bob (Viewer)
        const bobRes = await (0, supertest_1.default)(app_js_1.app)
            .post('/api/auth/login')
            .send({ email: 'viewer@trustvault.local', password: 'Password123!' });
        bobToken = bobRes.body.token;
        bobId = bobRes.body.user.id;
        // 3. Authenticate Admin
        const adminRes = await (0, supertest_1.default)(app_js_1.app)
            .post('/api/auth/login')
            .send({ email: 'admin@trustvault.local', password: 'Password123!' });
        adminToken = adminRes.body.token;
        // 4. Alice uploads a highly confidential document
        const uploadRes = await (0, supertest_1.default)(app_js_1.app)
            .post('/api/documents/upload')
            .set('Authorization', `Bearer ${aliceToken}`)
            .field('category', 'Executive-Confidential')
            .attach('file', Buffer.from('%PDF-1.4\n1 0 obj\n<< /Salary (TOP_SECRET_EXECUTIVE_SALARY) >>\nendobj\n%%EOF'), 'Executive_Salaries_Classified.pdf');
        (0, vitest_1.expect)(uploadRes.status).toBe(201);
        aliceDocId = uploadRes.body.document.id;
    });
    (0, vitest_1.afterEach)(async () => {
        // Clean up any temporary grants issued to Bob on aliceDocId
        await prisma_js_1.prisma.documentGrant.deleteMany({
            where: { documentId: aliceDocId, userId: bobId },
        });
    });
    // -------------------------------------------------------------
    // SUITE 1: Negative Authorization (IDOR & Direct Download Block)
    // -------------------------------------------------------------
    (0, vitest_1.describe)('TV-T01: Negative Access Control & IDOR Protection', () => {
        (0, vitest_1.it)('should refuse Bob from viewing Alice metadata (HTTP 403)', async () => {
            const res = await (0, supertest_1.default)(app_js_1.app)
                .get(`/api/documents/${aliceDocId}`)
                .set('Authorization', `Bearer ${bobToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
            (0, vitest_1.expect)(res.body.message).toContain('Access Denied');
        });
        (0, vitest_1.it)('should refuse Bob from downloading Alice document stream (HTTP 403)', async () => {
            const res = await (0, supertest_1.default)(app_js_1.app)
                .get(`/api/documents/${aliceDocId}/download`)
                .set('Authorization', `Bearer ${bobToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('should refuse completely unauthenticated requests (HTTP 401)', async () => {
            const res = await (0, supertest_1.default)(app_js_1.app).get(`/api/documents/${aliceDocId}/download`);
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    // -------------------------------------------------------------
    // SUITE 2: Instant Revocation (Zero-Lag Verification)
    // -------------------------------------------------------------
    (0, vitest_1.describe)('TV-T02: Instant Revocation Guarantee', () => {
        (0, vitest_1.it)('allows Bob to download once Alice grants access, then IMMEDIATELY blocks Bob upon revocation', async () => {
            // Step A: Alice grants READ permission to Bob
            const grantRes = await (0, supertest_1.default)(app_js_1.app)
                .post(`/api/documents/${aliceDocId}/grants`)
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ userEmail: 'viewer@trustvault.local', permission: 'READ' });
            (0, vitest_1.expect)(grantRes.status).toBe(201);
            // Step B: Bob downloads successfully
            const downloadSuccess = await (0, supertest_1.default)(app_js_1.app)
                .get(`/api/documents/${aliceDocId}/download`)
                .set('Authorization', `Bearer ${bobToken}`);
            (0, vitest_1.expect)(downloadSuccess.status).toBe(200);
            const content = downloadSuccess.body ? downloadSuccess.body.toString() : downloadSuccess.text;
            (0, vitest_1.expect)(content).toContain('TOP_SECRET_EXECUTIVE_SALARY');
            // Step C: Alice REVOKES Bob access
            const revokeRes = await (0, supertest_1.default)(app_js_1.app)
                .delete(`/api/documents/${aliceDocId}/grants/${bobId}`)
                .set('Authorization', `Bearer ${aliceToken}`);
            (0, vitest_1.expect)(revokeRes.status).toBe(200);
            // Step D: Bob immediately attempts to download again -> MUST FAIL (HTTP 403)
            const downloadAfterRevoke = await (0, supertest_1.default)(app_js_1.app)
                .get(`/api/documents/${aliceDocId}/download`)
                .set('Authorization', `Bearer ${bobToken}`);
            (0, vitest_1.expect)(downloadAfterRevoke.status).toBe(403);
            (0, vitest_1.expect)(downloadAfterRevoke.body.message).toContain('Access Denied');
        });
    });
    // -------------------------------------------------------------
    // SUITE 3: Information Leakage via Search Filtering
    // -------------------------------------------------------------
    (0, vitest_1.describe)('TV-T05: Document Search & Metadata Isolation', () => {
        (0, vitest_1.it)('does not return Alice confidential documents in Bob search query', async () => {
            const searchRes = await (0, supertest_1.default)(app_js_1.app)
                .get('/api/documents?search=Executive_Salaries_Classified')
                .set('Authorization', `Bearer ${bobToken}`);
            (0, vitest_1.expect)(searchRes.status).toBe(200);
            const matches = searchRes.body.documents.filter((d) => d.id === aliceDocId);
            (0, vitest_1.expect)(matches.length).toBe(0);
        });
        (0, vitest_1.it)('returns the document when Alice (Owner) searches for it', async () => {
            const searchRes = await (0, supertest_1.default)(app_js_1.app)
                .get('/api/documents?search=Executive_Salaries_Classified')
                .set('Authorization', `Bearer ${aliceToken}`);
            (0, vitest_1.expect)(searchRes.status).toBe(200);
            const matches = searchRes.body.documents.filter((d) => d.id === aliceDocId);
            (0, vitest_1.expect)(matches.length).toBe(1);
        });
    });
    // -------------------------------------------------------------
    // SUITE 4: Admin Role Least-Privilege Isolation
    // -------------------------------------------------------------
    (0, vitest_1.describe)('TV-T09: Admin Document Payload Isolation', () => {
        (0, vitest_1.it)('blocks Administrator from reading confidential payload without explicit grant (HTTP 403)', async () => {
            const res = await (0, supertest_1.default)(app_js_1.app)
                .get(`/api/documents/${aliceDocId}/download`)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
            (0, vitest_1.expect)(res.body.message).toContain('Access Denied');
        });
    });
    // -------------------------------------------------------------
    // SUITE 5: Granular Action Enforcement ('READ' vs 'EDIT')
    // -------------------------------------------------------------
    (0, vitest_1.describe)('TV-T10: Granular Permission Enforcement', () => {
        (0, vitest_1.it)('blocks user with READ grant from executing EDIT metadata update', async () => {
            // Alice grants READ to Bob
            await (0, supertest_1.default)(app_js_1.app)
                .post(`/api/documents/${aliceDocId}/grants`)
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ userEmail: 'viewer@trustvault.local', permission: 'READ' });
            // Bob attempts to edit document name
            const editRes = await (0, supertest_1.default)(app_js_1.app)
                .patch(`/api/documents/${aliceDocId}`)
                .set('Authorization', `Bearer ${bobToken}`)
                .send({ name: 'Tampered_Salary_File.pdf' });
            (0, vitest_1.expect)(editRes.status).toBe(403);
            (0, vitest_1.expect)(editRes.body.message).toContain('EDIT');
        });
    });
    // -------------------------------------------------------------
    // SUITE 6: Refused Attempts Logged in Audit Trail
    // -------------------------------------------------------------
    (0, vitest_1.describe)('TV-T08: Audit of Refused Access Attempts', () => {
        (0, vitest_1.it)('verifies that unauthorized access attempts generate ACCESS_DENIED records', async () => {
            // Trigger an unauthorized attempt
            await (0, supertest_1.default)(app_js_1.app)
                .get(`/api/documents/${aliceDocId}`)
                .set('Authorization', `Bearer ${bobToken}`);
            // Inspect audit records directly from DB
            const denialRecord = await prisma_js_1.prisma.auditLog.findFirst({
                where: {
                    action: 'ACCESS_DENIED',
                    resourceId: aliceDocId,
                    actorId: bobId,
                    status: 'DENIED',
                },
                orderBy: { id: 'desc' },
            });
            (0, vitest_1.expect)(denialRecord).not.toBeNull();
            (0, vitest_1.expect)(denialRecord?.status).toBe('DENIED');
        });
    });
});
