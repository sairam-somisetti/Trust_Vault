import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { config } from '../src/config/index.js';
import { prisma } from '../src/lib/prisma.js';

describe('TrustVault File Upload & Storage Security', () => {
  let ownerToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@trustvault.local', password: 'Password123!' });
    ownerToken = loginRes.body.token;
  });

  describe('TV-T06: Malicious File Upload & MIME Spoofing Defense', () => {
    it('rejects uploads with executable extensions (.php) immediately (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('<?php echo "evil"; ?>'), 'malware.php');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('strictly prohibited');
    });

    it('rejects polyglot/disguised files (PHP shell renamed to .pdf with invalid header)', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('<?php system($_GET["cmd"]); ?>'), 'fake_invoice.pdf');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('File signature mismatch');
    });

    it('accepts legitimate PDF documents with verified %PDF- magic bytes', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach(
          'file',
          Buffer.from('%PDF-1.4\n1 0 obj\n<< /Legal (Genuine Contract Document) >>\nendobj\n%%EOF'),
          'valid_contract.pdf'
        );

      expect(res.status).toBe(201);
      expect(res.body.document.name).toBe('valid_contract.pdf');
    });
  });

  describe('TV-T11: Storage Encryption at Rest Verification (AES-256-GCM)', () => {
    it('proves that uploaded files are encrypted on the physical filesystem and not stored plaintext', async () => {
      const sensitiveSecret = 'SUPER_CONFIDENTIAL_SALARY_FIGURE_999999';
      const fileBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj\n<< /Payload (${sensitiveSecret}) >>\nendobj\n%%EOF`
      );

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', fileBuffer, 'confidential_payroll_proof.pdf');

      expect(res.status).toBe(201);
      const docId = res.body.document.id;

      // Fetch the storage key from DB
      const docRecord = await prisma.document.findUnique({
        where: { id: docId },
      });
      expect(docRecord).not.toBeNull();

      // Read raw file directly from filesystem
      const rawDiskPath = path.join(config.storageDir, docRecord!.storageKey);
      expect(fs.existsSync(rawDiskPath)).toBe(true);

      const rawCiphertext = await fs.promises.readFile(rawDiskPath);

      // Verify that the raw disk file does NOT contain the sensitive plaintext string
      expect(rawCiphertext.includes(Buffer.from(sensitiveSecret))).toBe(false);
      expect(rawCiphertext.includes(Buffer.from('%PDF-1.4'))).toBe(false);
    });
  });
});
