import { Response } from 'express';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { StorageService } from '../services/storage.service.js';
import { AuditService } from '../services/audit.service.js';
import { authorizeDocumentAccess, AuthorizationError } from '../middleware/authorizeDocument.js';
import { AuthenticatedRequest } from '../types/index.js';

const grantAccessSchema = z.object({
  userEmail: z.string().email(),
  permission: z.enum(['READ', 'EDIT']).default('READ'),
  notes: z.string().optional(),
});

const updateMetadataSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
});

export class DocumentController {
  /**
   * Uploads and encrypts a confidential document with AES-256-GCM.
   */
  static async upload(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Bad Request', message: 'No file attached to upload.' });
      }

      const originalName = path.basename(req.file.originalname);
      const category = (req.body.category as string) || 'General';

      // 1. Deep signature inspection (Magic Bytes)
      const validation = StorageService.validateFileSignature(req.file.buffer, originalName);
      if (!validation.valid) {
        await AuditService.log({
          actorId: actor.id,
          actorEmail: actor.email,
          actorIp,
          action: 'ACCESS_DENIED',
          status: 'DENIED',
          details: {
            reason: `Malicious or unverified file upload rejected: ${validation.error}`,
            filename: originalName,
          },
        });
        return res.status(400).json({
          error: 'File Validation Rejected',
          message: validation.error,
        });
      }

      // 2. Encrypt at rest with AES-256-GCM
      const storageResult = await StorageService.encryptAndStore(req.file.buffer, originalName);

      // 3. Persist document record
      const document = await prisma.document.create({
        data: {
          name: originalName,
          storageKey: storageResult.storageKey,
          mimeType: validation.mimeType,
          fileSize: storageResult.fileSize,
          category,
          ownerId: actor.id,
          encryptionIv: storageResult.encryptionIv,
          encryptionAuthTag: storageResult.encryptionAuthTag,
          checksum: storageResult.checksum,
        },
        select: {
          id: true,
          name: true,
          category: true,
          mimeType: true,
          fileSize: true,
          checksum: true,
          createdAt: true,
        },
      });

      // 4. Audit upload
      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'DOCUMENT_UPLOAD',
        resourceId: document.id,
        resourceType: 'DOCUMENT',
        status: 'SUCCESS',
        details: {
          name: document.name,
          category: document.category,
          sizeBytes: document.fileSize,
          checksum: document.checksum,
        },
      });

      return res.status(201).json({
        message: 'Document uploaded and encrypted successfully.',
        document,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Lists and searches documents.
   * STRICT ACCESS FILTERING: Only returns documents where user is Owner OR has active Grant.
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;

    try {
      const search = (req.query.search as string) || '';
      const category = (req.query.category as string) || '';
      const ownerEmail = (req.query.owner as string) || '';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Base query: Only documents owned by or granted to actor
      const where: any = {
        isDeleted: false,
        OR: [
          { ownerId: actor.id },
          { grants: { some: { userId: actor.id } } },
        ],
      };

      if (search) {
        where.name = { contains: search };
      }
      if (category) {
        where.category = { contains: category };
      }
      if (ownerEmail) {
        where.owner = { email: { contains: ownerEmail } };
      }
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const documents = await prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          category: true,
          mimeType: true,
          fileSize: true,
          ownerId: true,
          owner: { select: { id: true, name: true, email: true } },
          createdAt: true,
          updatedAt: true,
          grants: {
            where: { userId: actor.id },
            select: { permission: true, grantedAt: true },
          },
        },
      });

      // Map to include user's effective permission
      const result = documents.map((doc) => {
        const isOwner = doc.ownerId === actor.id;
        const grant = doc.grants[0];
        return {
          id: doc.id,
          name: doc.name,
          category: doc.category,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          owner: doc.owner,
          isOwner,
          userPermission: isOwner ? 'OWNER' : grant ? grant.permission : 'NONE',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      });

      return res.json({ documents: result });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Retrieves single document metadata. Protected by central choke point.
   */
  static async getById(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const documentId = req.params.id;

    try {
      const { document, grant } = await authorizeDocumentAccess(req, documentId, 'READ');

      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'DOCUMENT_READ',
        resourceId: document.id,
        resourceType: 'DOCUMENT',
        status: 'SUCCESS',
        details: { isOwner: document.ownerId === actor.id, permission: grant?.permission || 'OWNER' },
      });

      return res.json({
        document: {
          id: document.id,
          name: document.name,
          category: document.category,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          ownerId: document.ownerId,
          checksum: document.checksum,
          isOwner: document.ownerId === actor.id,
          permission: document.ownerId === actor.id ? 'OWNER' : grant?.permission,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Downloads and decrypts document in real-time.
   * Central authorization choke point ensures ZERO revocation lag.
   */
  static async download(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const documentId = req.params.id;

    try {
      // 1. Live authorization verification at millisecond of download
      const { document } = await authorizeDocumentAccess(req, documentId, 'READ');

      // 2. Decrypt on the fly using AES-256-GCM
      const decryptedBuffer = await StorageService.readAndDecrypt(
        document.storageKey,
        document.encryptionIv,
        document.encryptionAuthTag
      );

      // 3. Log download success in cryptographic audit ledger
      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'DOCUMENT_DOWNLOAD',
        resourceId: document.id,
        resourceType: 'DOCUMENT',
        status: 'SUCCESS',
        details: { filename: document.name, sizeBytes: decryptedBuffer.length },
      });

      // 4. Secure headers: block inline browser execution of untrusted scripts
      const safeFilename = encodeURIComponent(document.name);
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');

      return res.send(decryptedBuffer);
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Updates document metadata (Owner or EDIT grant required).
   */
  static async update(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const documentId = req.params.id;

    try {
      await authorizeDocumentAccess(req, documentId, 'EDIT');

      const parsed = updateMetadataSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
      }

      const updated = await prisma.document.update({
        where: { id: documentId },
        data: {
          ...(parsed.data.name && { name: path.basename(parsed.data.name) }),
          ...(parsed.data.category && { category: parsed.data.category }),
        },
        select: { id: true, name: true, category: true, updatedAt: true },
      });

      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'DOCUMENT_EDIT',
        resourceId: documentId,
        resourceType: 'DOCUMENT',
        status: 'SUCCESS',
        details: parsed.data,
      });

      return res.json({ message: 'Document updated successfully.', document: updated });
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Deletes document (Owner only).
   */
  static async delete(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const documentId = req.params.id;

    try {
      const { document } = await authorizeDocumentAccess(req, documentId, 'DELETE');

      // Soft delete from DB
      await prisma.document.update({
        where: { id: documentId },
        data: { isDeleted: true },
      });

      // Clean up encrypted storage artifact
      await StorageService.deleteFile(document.storageKey);

      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'DOCUMENT_DELETE',
        resourceId: documentId,
        resourceType: 'DOCUMENT',
        status: 'SUCCESS',
        details: { filename: document.name },
      });

      return res.json({ message: 'Document deleted successfully.' });
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Lists all grants for a document (Owner only).
   */
  static async getGrants(req: AuthenticatedRequest, res: Response) {
    const documentId = req.params.id;

    try {
      await authorizeDocumentAccess(req, documentId, 'MANAGE_ACCESS');

      const grants = await prisma.documentGrant.findMany({
        where: { documentId },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          grantedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { grantedAt: 'desc' },
      });

      return res.json({ grants });
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Grants access to a named user (Owner only).
   */
  static async grantAccess(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const documentId = req.params.id;

    try {
      await authorizeDocumentAccess(req, documentId, 'MANAGE_ACCESS');

      const parsed = grantAccessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
      }

      const { userEmail, permission, notes } = parsed.data;

      const targetUser = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!targetUser) {
        return res.status(404).json({ error: 'Not Found', message: `User with email '${userEmail}' not found.` });
      }

      if (targetUser.id === actor.id) {
        return res.status(400).json({ error: 'Bad Request', message: 'You already own this document.' });
      }

      const grant = await prisma.documentGrant.upsert({
        where: {
          documentId_userId: {
            documentId,
            userId: targetUser.id,
          },
        },
        update: {
          permission,
          grantedById: actor.id,
          notes,
          grantedAt: new Date(),
        },
        create: {
          documentId,
          userId: targetUser.id,
          permission,
          grantedById: actor.id,
          notes,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'GRANT_CREATED',
        resourceId: documentId,
        resourceType: 'GRANT',
        status: 'SUCCESS',
        details: {
          grantedToEmail: targetUser.email,
          grantedToId: targetUser.id,
          permission,
          notes,
        },
      });

      return res.status(201).json({ message: 'Access grant issued successfully.', grant });
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Revokes access from a user immediately (Owner only).
   */
  static async revokeAccess(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const documentId = req.params.id;
    const targetUserId = req.params.userId;

    try {
      await authorizeDocumentAccess(req, documentId, 'MANAGE_ACCESS');

      const existingGrant = await prisma.documentGrant.findUnique({
        where: {
          documentId_userId: {
            documentId,
            userId: targetUserId,
          },
        },
        include: { user: { select: { email: true } } },
      });

      if (!existingGrant) {
        return res.status(404).json({ error: 'Not Found', message: 'No active grant found for this user.' });
      }

      // Hard delete grant row: Instant revocation on the next millisecond
      await prisma.documentGrant.delete({
        where: {
          documentId_userId: {
            documentId,
            userId: targetUserId,
          },
        },
      });

      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'GRANT_REVOKED',
        resourceId: documentId,
        resourceType: 'GRANT',
        status: 'SUCCESS',
        details: {
          revokedUserEmail: existingGrant.user.email,
          revokedUserId: targetUserId,
          revokedPermission: existingGrant.permission,
        },
      });

      return res.json({ message: 'Access revoked immediately. User can no longer access this document.' });
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
}
