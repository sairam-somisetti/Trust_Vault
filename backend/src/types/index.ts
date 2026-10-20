import { Request } from 'express';

export type UserRole = 'ADMIN' | 'DOCUMENT_OWNER' | 'VIEWER';

export type DocumentPermission = 'READ' | 'EDIT';

export type RequiredAction = 'READ' | 'EDIT' | 'DELETE' | 'MANAGE_ACCESS';

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_REGISTER'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_READ'
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_EDIT'
  | 'DOCUMENT_DELETE'
  | 'GRANT_CREATED'
  | 'GRANT_REVOKED'
  | 'ACCESS_DENIED'
  | 'AI_RECOMMENDATION_GENERATED'
  | 'AI_RECOMMENDATION_APPROVED'
  | 'AUDIT_VERIFIED';

export type AuditStatus = 'SUCCESS' | 'DENIED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
