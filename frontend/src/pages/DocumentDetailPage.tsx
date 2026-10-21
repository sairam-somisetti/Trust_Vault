import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Share2,
  Trash2,
  ArrowLeft,
  Lock,
  Sparkles,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  Clock,
  HardDrive,
  Fingerprint,
  User,
  Zap,
} from 'lucide-react';
import { api, ApiError } from '../api.js';
import { DocumentGrant } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { GrantModal } from '../components/GrantModal.js';
import { AiSuggestModal } from '../components/AiSuggestModal.js';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit metadata form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Grants state (if owner)
  const [grants, setGrants] = useState<DocumentGrant[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPermission, setNewPermission] = useState<'READ' | 'EDIT'>('READ');
  const [newNotes, setNewNotes] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantMessage, setGrantMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // AI Modal
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  const loadDocument = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDocument(id);
      setDoc(res.document);
      setName(res.document.name);
      setCategory(res.document.category);
      if (res.document.grants) {
        setGrants(res.document.grants);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setError('ACCESS_DENIED');
      } else {
        setError(err.message || 'Failed to load document details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!doc) return;
    try {
      await api.downloadDocument(doc.id, doc.name);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;
    setSaveLoading(true);
    try {
      await api.updateDocument(doc.id, { name, category });
      setIsEditing(false);
      loadDocument();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newEmail) return;
    setGrantLoading(true);
    setGrantMessage(null);

    try {
      await api.grantAccess(id, { userEmail: newEmail, permission: newPermission, notes: newNotes });
      setGrantMessage({ text: `Granted ${newPermission} access to ${newEmail}.`, type: 'success' });
      setNewEmail('');
      setNewNotes('');
      loadDocument();
    } catch (err: any) {
      setGrantMessage({ text: err.message || 'Failed to grant access.', type: 'error' });
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevoke = async (userId: string, email: string) => {
    if (!id) return;
    if (!confirm(`Revoke access for ${email}? Taking access away works immediately.`)) return;

    try {
      await api.revokeAccess(id, userId);
      setGrantMessage({ text: `Access revoked immediately for ${email}.`, type: 'success' });
      loadDocument();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm(`Are you sure you want to permanently delete '${doc.name}'?`)) return;

    try {
      await api.deleteDocument(doc.id);
      navigate('/documents');
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 text-sm">
        Verifying cryptographic access authorization...
      </div>
    );
  }

  // Handle Unauthorized (403) Barrier
  if (error === 'ACCESS_DENIED') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="glass-panel p-8 rounded-3xl text-center border border-red-500/20 shadow-2xl">
          <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Barrier Enforced (HTTP 403)</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            You do not possess an active discretionary grant to read or download this confidential file.
            This refused attempt has been logged into the cryptographic audit trail.
          </p>
          <div className="flex justify-center space-x-3">
            <Link
              to="/documents"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition"
            >
              Return to Documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center text-slate-400">
        <p className="text-sm">{error || 'Document not found.'}</p>
        <Link to="/documents" className="text-blue-400 text-xs mt-3 inline-block">
          &larr; Back to documents
        </Link>
      </div>
    );
  }

  const isOwner = doc.isOwner;
  const canEdit = isOwner || doc.permission === 'EDIT';

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/documents"
          className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Documents</span>
        </Link>

        <div className="flex items-center space-x-2">
          {isOwner && (
            <button
              onClick={() => setIsAiOpen(true)}
              className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 rounded-xl text-xs font-medium transition flex items-center space-x-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Access Advisor</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleDelete}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/5 transition"
              title="Delete Document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details & Access Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Document Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center space-x-3.5">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">{doc.name}</h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-300">
                      {doc.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">
                      AES-256-GCM ENCRYPTED
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-medium transition flex items-center space-x-2 shadow-lg shadow-blue-500/20 shrink-0"
              >
                <Download className="h-4 w-4" />
                <span>Download Decrypted</span>
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-4 border-t border-white/5">
              <div className="p-3 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="text-slate-500 text-[11px] flex items-center space-x-1.5 mb-1">
                  <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                  <span>File Size & MIME</span>
                </div>
                <div className="font-mono text-white">
                  {(doc.fileSize / 1024).toFixed(1)} KB • {doc.mimeType}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="text-slate-500 text-[11px] flex items-center space-x-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Uploaded On</span>
                </div>
                <div className="text-white">{new Date(doc.createdAt).toLocaleString()}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="text-slate-500 text-[11px] flex items-center space-x-1.5 mb-1">
                  <User className="h-3.5 w-3.5 text-purple-400" />
                  <span>Document Owner</span>
                </div>
                <div className="text-white">{doc.owner?.name || 'Owner'}</div>
                <div className="text-[10px] text-slate-500 font-mono">{doc.owner?.email}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="text-slate-500 text-[11px] flex items-center space-x-1.5 mb-1">
                  <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                  <span>Your Effective Access</span>
                </div>
                <div className="font-semibold text-white tracking-wide">
                  {doc.permission} {isOwner && '(Full Sovereign Access)'}
                </div>
              </div>
            </div>

            {/* Checksum & Storage Security */}
            {doc.checksum && (
              <div className="mt-4 p-3 rounded-2xl bg-slate-950/70 border border-white/5 text-[11px]">
                <div className="text-slate-500 flex items-center space-x-1.5 mb-1">
                  <Fingerprint className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Cryptographic Plaintext Checksum (SHA-256)</span>
                </div>
                <div className="font-mono text-cyan-300 break-all select-all">{doc.checksum}</div>
              </div>
            )}

            {/* Edit Metadata Section */}
            {canEdit && (
              <div className="mt-6 pt-5 border-t border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-300">Document Settings</span>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    {isEditing ? 'Cancel' : 'Edit Name / Category'}
                  </button>
                </div>

                {isEditing && (
                  <form onSubmit={handleSaveMetadata} className="space-y-3 p-4 bg-slate-900/40 rounded-2xl border border-white/5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Document Title</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 glass-input rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 glass-input rounded-xl text-xs text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
                    >
                      {saveLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Access Control & Discretionary Grants */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex items-center space-x-2.5 mb-4">
              <Share2 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Discretionary Access Grants</h2>
            </div>

            {/* Instant Revocation Notice */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 mb-4 flex items-start space-x-2">
              <Zap className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>
                Zero revocation lag: Revoking a grant takes effect on the next millisecond stream request.
              </span>
            </div>

            {grantMessage && (
              <div
                className={`p-3 rounded-xl text-xs mb-4 flex items-center space-x-2 ${
                  grantMessage.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/40 border border-red-800 text-red-300'
                }`}
              >
                {grantMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                )}
                <span>{grantMessage.text}</span>
              </div>
            )}

            {/* Grant New Permission (Owner Only) */}
            {isOwner ? (
              <form onSubmit={handleGrantAccess} className="space-y-2.5 mb-5 p-3.5 bg-slate-950/60 rounded-2xl border border-white/5">
                <div className="text-[11px] font-semibold text-slate-300">Grant Access to Named User</div>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-1.5 glass-input rounded-xl text-xs text-white"
                />
                <div className="flex space-x-2">
                  <select
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value as 'READ' | 'EDIT')}
                    className="px-2 py-1.5 glass-input rounded-xl text-xs text-white"
                  >
                    <option value="READ" className="bg-slate-900">READ (Download)</option>
                    <option value="EDIT" className="bg-slate-900">EDIT (Rename)</option>
                  </select>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Reason/Notes..."
                    className="flex-1 px-3 py-1.5 glass-input rounded-xl text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={grantLoading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition"
                >
                  {grantLoading ? 'Issuing Grant...' : 'Grant Access'}
                </button>
              </form>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 text-[11px] text-slate-400 mb-4">
                Access to this document is managed by the owner ({doc.owner?.name}). Only the owner can issue or revoke discretionary grants.
              </div>
            )}

            {/* Active Grants List */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Active Granted Users ({grants.length})
              </div>

              {grants.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-white/5">
                  No named grants issued yet. Document is strictly private to the owner.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {grants.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="max-w-[80%]">
                        <div className="font-medium text-white truncate">{g.user.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{g.user.email}</div>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {g.permission}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(g.grantedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleRevoke(g.user.id, g.user.email)}
                          title="Revoke access immediately"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {isAiOpen && (
        <AiSuggestModal
          documentId={doc.id}
          documentName={doc.name}
          isOpen={true}
          onClose={() => setIsAiOpen(false)}
          onGrantAdded={() => loadDocument()}
        />
      )}
    </div>
  );
};
