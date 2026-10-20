export type UserRole = 'ADMIN' | 'DOCUMENT_OWNER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive?: boolean;
}

export interface DocumentItem {
  id: string;
  name: string;
  category: string;
  mimeType: string;
  fileSize: number;
  isOwner: boolean;
  userPermission: 'OWNER' | 'READ' | 'EDIT' | 'NONE';
  owner?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentGrant {
  id: string;
  documentId: string;
  userId: string;
  permission: 'READ' | 'EDIT';
  grantedAt: string;
  notes?: string;
  user: { id: string; name: string; email: string; role: string };
  grantedBy: { id: string; name: string; email: string };
}

export interface AuditRecord {
  id: number;
  timestamp: string;
  actorId?: string;
  actorEmail?: string;
  actorIp: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  status: 'SUCCESS' | 'DENIED';
  details?: string;
  prevHash: string;
  hash: string;
}

export interface AiSuggestion {
  userId: string;
  userEmail: string;
  userName: string;
  suggestedPermission: 'READ' | 'EDIT';
  confidence: number;
  reason: string;
}
