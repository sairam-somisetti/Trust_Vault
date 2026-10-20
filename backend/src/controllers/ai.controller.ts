import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuditService } from '../services/audit.service.js';
import { authorizeDocumentAccess, AuthorizationError } from '../middleware/authorizeDocument.js';
import { AuthenticatedRequest } from '../types/index.js';

const approveAiSchema = z.object({
  userEmail: z.string().email(),
  permission: z.enum(['READ', 'EDIT']).default('READ'),
  aiReason: z.string().optional(),
});

export class AiController {
  /**
   * Generates intelligent, role-aware access recommendations for a document owner.
   * GUARANTEE: This endpoint is strictly read-only advisory.
   * "The machine must never widen access on its own."
   */
  static async suggestAccess(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const documentId = req.params.id;

    try {
      // Must be owner to manage access recommendations
      const { document } = await authorizeDocumentAccess(req, documentId, 'MANAGE_ACCESS');

      // Fetch potential recipients in company (excluding the owner)
      const potentialUsers = await prisma.user.findMany({
        where: {
          id: { not: actor.id },
          isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });

      // Existing grants already assigned
      const existingGrants = await prisma.documentGrant.findMany({
        where: { documentId },
        select: { userId: true },
      });
      const grantedUserIds = new Set(existingGrants.map((g) => g.userId));

      // Rule & semantic heuristic matching based on category and title keywords
      const suggestions: Array<{
        userId: string;
        userEmail: string;
        userName: string;
        suggestedPermission: 'READ' | 'EDIT';
        confidence: number;
        reason: string;
      }> = [];

      const docCategory = document.category.toLowerCase();
      const docName = document.name.toLowerCase();

      for (const u of potentialUsers) {
        if (grantedUserIds.has(u.id)) continue; // Already has access

        let matched = false;
        let reason = '';
        let confidence = 0.75;
        let suggestedPermission: 'READ' | 'EDIT' = 'READ';

        if (docCategory.includes('hr') || docCategory.includes('payroll') || docName.includes('salary')) {
          if (u.email.includes('hr') || u.name.toLowerCase().includes('hr') || u.role === 'ADMIN') {
            matched = true;
            confidence = 0.95;
            reason = 'Matches Human Resources & Payroll compliance policy.';
          }
        } else if (docCategory.includes('legal') || docCategory.includes('contract')) {
          if (u.email.includes('legal') || u.name.toLowerCase().includes('legal') || u.role === 'ADMIN') {
            matched = true;
            confidence = 0.90;
            reason = 'Document flagged as binding legal agreement or contract.';
          }
        } else if (docCategory.includes('finance') || docCategory.includes('audit')) {
          if (u.email.includes('finance') || u.email.includes('audit') || u.role === 'ADMIN') {
            matched = true;
            confidence = 0.92;
            reason = 'Financial reporting / regulatory audit review requirement.';
          }
        } else {
          // General recommendation for active viewers
          if (u.role === 'VIEWER') {
            matched = true;
            confidence = 0.70;
            reason = 'Active team viewer available for document review.';
          }
        }

        if (matched) {
          suggestions.push({
            userId: u.id,
            userEmail: u.email,
            userName: u.name,
            suggestedPermission,
            confidence,
            reason,
          });
        }
      }

      // Log the AI recommendation event in the cryptographic audit ledger
      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'AI_RECOMMENDATION_GENERATED',
        resourceId: documentId,
        resourceType: 'DOCUMENT',
        status: 'SUCCESS',
        details: {
          documentTitle: document.name,
          category: document.category,
          suggestedCount: suggestions.length,
          candidates: suggestions.map((s) => ({ email: s.userEmail, reason: s.reason })),
        },
      });

      return res.json({
        documentId,
        documentName: document.name,
        category: document.category,
        suggestions,
        notice: 'AI recommendations require human owner confirmation before access is granted.',
      });
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Human owner reviews and explicitly confirms an AI recommendation.
   * Both the AI's suggestion and the human's approval are etched into the audit record.
   */
  static async approveRecommendation(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const documentId = req.params.id;

    try {
      await authorizeDocumentAccess(req, documentId, 'MANAGE_ACCESS');

      const parsed = approveAiSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
      }

      const { userEmail, permission, aiReason } = parsed.data;

      const targetUser = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!targetUser) {
        return res.status(404).json({ error: 'Not Found', message: `Target user '${userEmail}' not found.` });
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
          notes: `AI Recommendation Approved by Owner. Context: ${aiReason || 'Standard approval'}`,
          grantedAt: new Date(),
        },
        create: {
          documentId,
          userId: targetUser.id,
          permission,
          grantedById: actor.id,
          notes: `AI Recommendation Approved by Owner. Context: ${aiReason || 'Standard approval'}`,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Commit AI approval decision into cryptographic audit ledger
      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'AI_RECOMMENDATION_APPROVED',
        resourceId: documentId,
        resourceType: 'GRANT',
        status: 'SUCCESS',
        details: {
          grantedToEmail: targetUser.email,
          permission,
          aiReason,
          humanApproverEmail: actor.email,
        },
      });

      return res.status(201).json({
        message: 'AI recommendation approved and access grant activated.',
        grant,
      });
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({ error: error.name, message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
}
