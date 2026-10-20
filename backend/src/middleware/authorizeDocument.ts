import { prisma } from '../lib/prisma.js';
import { AuditService } from '../services/audit.service.js';
import { AuthenticatedRequest, RequiredAction } from '../types/index.js';

export interface AuthorizationResult {
  document: {
    id: string;
    name: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
    category: string;
    ownerId: string;
    encryptionIv: string;
    encryptionAuthTag: string;
    checksum: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  grant?: {
    id: string;
    permission: string;
    grantedAt: Date;
  };
}

export class AuthorizationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

/**
 * THE CENTRAL AUTHORIZATION CHOKE POINT.
 *
 * Every document retrieval, download, edit, grant, and deletion MUST funnel through this function.
 * If this line or function is bypassed or removed, security tests will fail immediately.
 *
 * @param req Authenticated Express request with user context and client IP
 * @param documentId UUID of the target document
 * @param requiredAction The intended action ('READ' | 'EDIT' | 'DELETE' | 'MANAGE_ACCESS')
 * @returns The resolved document entity and active grant if authorized
 * @throws AuthorizationError (403 or 404) and automatically commits an immutable ACCESS_DENIED audit record
 */
export async function authorizeDocumentAccess(
  req: AuthenticatedRequest,
  documentId: string,
  requiredAction: RequiredAction
): Promise<AuthorizationResult> {
  const actor = req.user;
  const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!actor) {
    throw new AuthorizationError('Authentication required to access documents.', 401);
  }

  // 1. Fetch document existence
  const document = await prisma.document.findFirst({
    where: { id: documentId, isDeleted: false },
  });

  if (!document) {
    // Audit failed probe attempt to detect IDOR scanning
    await AuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorIp,
      action: 'ACCESS_DENIED',
      resourceId: documentId,
      resourceType: 'DOCUMENT',
      status: 'DENIED',
      details: {
        reason: 'Document not found or soft-deleted during authorization check',
        attemptedAction: requiredAction,
      },
    });
    throw new AuthorizationError('Document not found or inaccessible.', 404);
  }

  // 2. Document Owner has full access for all actions
  if (document.ownerId === actor.id) {
    return { document };
  }

  // 3. Actions reserved strictly for the document owner: DELETE and MANAGE_ACCESS
  if (requiredAction === 'DELETE' || requiredAction === 'MANAGE_ACCESS') {
    await AuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorIp,
      action: 'ACCESS_DENIED',
      resourceId: documentId,
      resourceType: 'DOCUMENT',
      status: 'DENIED',
      details: {
        reason: `Only the document owner can execute '${requiredAction}'`,
        attemptedAction: requiredAction,
        ownerId: document.ownerId,
      },
    });
    throw new AuthorizationError(
      `Permission denied: Only the document owner can perform '${requiredAction}'.`,
      403
    );
  }

  // 4. Real-time DB lookup for active permission grant (Zero revocation lag)
  const grant = await prisma.documentGrant.findUnique({
    where: {
      documentId_userId: {
        documentId,
        userId: actor.id,
      },
    },
  });

  // 5. If no active grant exists in database -> Halt immediately
  if (!grant) {
    await AuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorIp,
      action: 'ACCESS_DENIED',
      resourceId: documentId,
      resourceType: 'DOCUMENT',
      status: 'DENIED',
      details: {
        reason: 'No active grant exists for user on this document',
        attemptedAction: requiredAction,
        userRole: actor.role,
      },
    });
    throw new AuthorizationError(
      'Access Denied: You have not been granted access to this document.',
      403
    );
  }

  // 6. Enforce Granular Permission Boundaries ('EDIT' vs 'READ')
  if (requiredAction === 'EDIT' && grant.permission !== 'EDIT') {
    await AuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorIp,
      action: 'ACCESS_DENIED',
      resourceId: documentId,
      resourceType: 'DOCUMENT',
      status: 'DENIED',
      details: {
        reason: "User possesses 'READ' grant but attempted 'EDIT' action",
        attemptedAction: requiredAction,
        grantedPermission: grant.permission,
      },
    });
    throw new AuthorizationError(
      "Permission Denied: This document grant is 'READ' only. 'EDIT' permissions are required.",
      403
    );
  }

  // 7. Access authorized
  return {
    document,
    grant: {
      id: grant.id,
      permission: grant.permission,
      grantedAt: grant.grantedAt,
    },
  };
}
