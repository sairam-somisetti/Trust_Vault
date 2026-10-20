import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('TrustVault Security & Authorization Test Suite', () => {
  let aliceToken: string;
  let aliceDocId: string;
  let bobToken: string;
  let bobId: string;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Authenticate Alice (Owner)
    const aliceRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@trustvault.local', password: 'Password123!' });
    aliceToken = aliceRes.body.token;

    // 2. Authenticate Bob (Viewer)
    const bobRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@trustvault.local', password: 'Password123!' });
    bobToken = bobRes.body.token;
    bobId = bobRes.body.user.id;

    // 3. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@trustvault.local', password: 'Password123!' });
    adminToken = adminRes.body.token;

    // 4. Alice uploads a highly confidential document
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${aliceToken}`)
      .field('category', 'Executive-Confidential')
      .attach(
        'file',
        Buffer.from('%PDF-1.4\n1 0 obj\n<< /Salary (TOP_SECRET_EXECUTIVE_SALARY) >>\nendobj\n%%EOF'),
        'Executive_Salaries_Classified.pdf'
      );

    expect(uploadRes.status).toBe(201);
    aliceDocId = uploadRes.body.document.id;
  });

  afterEach(async () => {
    // Clean up any temporary grants issued to Bob on aliceDocId
    await prisma.documentGrant.deleteMany({
      where: { documentId: aliceDocId, userId: bobId },
    });
  });

  // -------------------------------------------------------------
  // SUITE 1: Negative Authorization (IDOR & Direct Download Block)
  // -------------------------------------------------------------
  describe('TV-T01: Negative Access Control & IDOR Protection', () => {
    it('should refuse Bob from viewing Alice metadata (HTTP 403)', async () => {
      const res = await request(app)
        .get(`/api/documents/${aliceDocId}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access Denied');
    });

    it('should refuse Bob from downloading Alice document stream (HTTP 403)', async () => {
      const res = await request(app)
        .get(`/api/documents/${aliceDocId}/download`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should refuse completely unauthenticated requests (HTTP 401)', async () => {
      const res = await request(app).get(`/api/documents/${aliceDocId}/download`);
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------
  // SUITE 2: Instant Revocation (Zero-Lag Verification)
  // -------------------------------------------------------------
  describe('TV-T02: Instant Revocation Guarantee', () => {
    it('allows Bob to download once Alice grants access, then IMMEDIATELY blocks Bob upon revocation', async () => {
      // Step A: Alice grants READ permission to Bob
      const grantRes = await request(app)
        .post(`/api/documents/${aliceDocId}/grants`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ userEmail: 'viewer@trustvault.local', permission: 'READ' });

      expect(grantRes.status).toBe(201);

      // Step B: Bob downloads successfully
      const downloadSuccess = await request(app)
        .get(`/api/documents/${aliceDocId}/download`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(downloadSuccess.status).toBe(200);
      const content = downloadSuccess.body ? downloadSuccess.body.toString() : downloadSuccess.text;
      expect(content).toContain('TOP_SECRET_EXECUTIVE_SALARY');

      // Step C: Alice REVOKES Bob access
      const revokeRes = await request(app)
        .delete(`/api/documents/${aliceDocId}/grants/${bobId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(revokeRes.status).toBe(200);

      // Step D: Bob immediately attempts to download again -> MUST FAIL (HTTP 403)
      const downloadAfterRevoke = await request(app)
        .get(`/api/documents/${aliceDocId}/download`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(downloadAfterRevoke.status).toBe(403);
      expect(downloadAfterRevoke.body.message).toContain('Access Denied');
    });
  });

  // -------------------------------------------------------------
  // SUITE 3: Information Leakage via Search Filtering
  // -------------------------------------------------------------
  describe('TV-T05: Document Search & Metadata Isolation', () => {
    it('does not return Alice confidential documents in Bob search query', async () => {
      const searchRes = await request(app)
        .get('/api/documents?search=Executive_Salaries_Classified')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(searchRes.status).toBe(200);
      const matches = searchRes.body.documents.filter((d: any) => d.id === aliceDocId);
      expect(matches.length).toBe(0);
    });

    it('returns the document when Alice (Owner) searches for it', async () => {
      const searchRes = await request(app)
        .get('/api/documents?search=Executive_Salaries_Classified')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(searchRes.status).toBe(200);
      const matches = searchRes.body.documents.filter((d: any) => d.id === aliceDocId);
      expect(matches.length).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // SUITE 4: Admin Role Least-Privilege Isolation
  // -------------------------------------------------------------
  describe('TV-T09: Admin Document Payload Isolation', () => {
    it('blocks Administrator from reading confidential payload without explicit grant (HTTP 403)', async () => {
      const res = await request(app)
        .get(`/api/documents/${aliceDocId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access Denied');
    });
  });

  // -------------------------------------------------------------
  // SUITE 5: Granular Action Enforcement ('READ' vs 'EDIT')
  // -------------------------------------------------------------
  describe('TV-T10: Granular Permission Enforcement', () => {
    it('blocks user with READ grant from executing EDIT metadata update', async () => {
      // Alice grants READ to Bob
      await request(app)
        .post(`/api/documents/${aliceDocId}/grants`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ userEmail: 'viewer@trustvault.local', permission: 'READ' });

      // Bob attempts to edit document name
      const editRes = await request(app)
        .patch(`/api/documents/${aliceDocId}`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ name: 'Tampered_Salary_File.pdf' });

      expect(editRes.status).toBe(403);
      expect(editRes.body.message).toContain('EDIT');
    });
  });

  // -------------------------------------------------------------
  // SUITE 6: Refused Attempts Logged in Audit Trail
  // -------------------------------------------------------------
  describe('TV-T08: Audit of Refused Access Attempts', () => {
    it('verifies that unauthorized access attempts generate ACCESS_DENIED records', async () => {
      // Trigger an unauthorized attempt
      await request(app)
        .get(`/api/documents/${aliceDocId}`)
        .set('Authorization', `Bearer ${bobToken}`);

      // Inspect audit records directly from DB
      const denialRecord = await prisma.auditLog.findFirst({
        where: {
          action: 'ACCESS_DENIED',
          resourceId: aliceDocId,
          actorId: bobId,
          status: 'DENIED',
        },
        orderBy: { id: 'desc' },
      });

      expect(denialRecord).not.toBeNull();
      expect(denialRecord?.status).toBe('DENIED');
    });
  });
});
