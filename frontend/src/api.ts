import { User, DocumentItem, DocumentGrant, AuditRecord, AiSuggestion } from './types.js';

const API_BASE = 'https://trustvault-backend-36v6.onrender.com/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('tv_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    if (response.status === 401) {
      localStorage.removeItem('tv_token');
      window.dispatchEvent(new CustomEvent('tv_unauthorized'));
    }

    throw new ApiError(errorData.message || 'API Request Failed', response.status, errorData);
  }

  // Handle binary blob responses (like downloads)
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    return (await response.blob()) as unknown as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ user: User; token: string; message: string }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }),

  register: (data: { email: string; password: string; name: string; role: string }) =>
    request<{ user: User; token: string; message: string }>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  me: () => request<{ user: User }>('/auth/me'),

  // Documents
  listDocuments: (query: {
    search?: string;
    category?: string;
    owner?: string;
    scope?: 'all' | 'owned' | 'shared';
    includeGrants?: boolean;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.category) params.append('category', query.category);
    if (query.owner) params.append('owner', query.owner);
    if (query.scope) params.append('scope', query.scope);
    if (query.includeGrants) params.append('includeGrants', 'true');
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    return request<{ documents: DocumentItem[] }>(`/documents?${params.toString()}`);
  },

  getDocument: (id: string) => request<{ document: any }>(`/documents/${id}`),

  uploadDocument: (file: File, category: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return request<{ message: string; document: DocumentItem }>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  downloadDocument: async (id: string, filename: string) => {
    const blob = await request<Blob>(`/documents/${id}/download`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  updateDocument: (id: string, data: { name?: string; category?: string }) =>
    request<{ message: string; document: any }>(`/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteDocument: (id: string) =>
    request<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    }),

  // Access Grants
  getGrants: (documentId: string) =>
    request<{ grants: DocumentGrant[] }>(`/documents/${documentId}/grants`),

  grantAccess: (documentId: string, data: { userEmail: string; permission: 'READ' | 'EDIT'; notes?: string }) =>
    request<{ message: string; grant: DocumentGrant }>(`/documents/${documentId}/grants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  revokeAccess: (documentId: string, userId: string) =>
    request<{ message: string }>(`/documents/${documentId}/grants/${userId}`, {
      method: 'DELETE',
    }),

  // AI Suggestions
  suggestAccess: (documentId: string) =>
    request<{ suggestions: AiSuggestion[]; documentName: string; category: string }>(
      `/documents/${documentId}/ai-suggest`,
      { method: 'POST' }
    ),

  approveAiRecommendation: (documentId: string, data: { userEmail: string; permission: 'READ' | 'EDIT'; aiReason?: string }) =>
    request<{ message: string; grant: any }>(`/documents/${documentId}/ai-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Security Overview (Any Authenticated Role)
  getSecurityChainVerification: () =>
    request<{ valid: boolean; totalRecords: number; latestHash?: string; message: string; brokenAtId?: number; reason?: string }>(
      '/documents/security/verify-chain'
    ),

  getSecurityEvents: () =>
    request<{ totalDenialsLast24h: number; totalAuditedRecords: number; recentDenials: any[] }>(
      '/documents/security/events'
    ),

  // Admin Only
  getAuditLogs: (params: { page?: number; limit?: number; action?: string; status?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.action) searchParams.append('action', params.action);
    if (params.status) searchParams.append('status', params.status);
    return request<{ total: number; page: number; limit: number; totalPages: number; records: AuditRecord[] }>(
      `/admin/audit?${searchParams.toString()}`
    );
  },

  verifyAuditIntegrity: () =>
    request<{ valid: boolean; totalRecords: number; latestHash?: string; message: string; brokenAtId?: number; reason?: string }>(
      '/admin/audit/verify'
    ),

  getSecurityAlerts: () =>
    request<{ totalDeniedEventsLast24h: number; suspiciousIps: any[]; suspiciousActors: any[]; recentDenials: any[] }>(
      '/admin/alerts'
    ),

  getUsers: () => request<{ users: any[] }>('/admin/users'),

  toggleUserStatus: (userId: string, isActive: boolean) =>
    request<{ message: string; user: any }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    }),
};
