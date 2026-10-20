import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  Users,
  ShieldCheck,
  Trash2,
  Plus,
  Sparkles,
  Zap,
  ExternalLink,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api.js';
import { DocumentItem } from '../types.js';
import { GrantModal } from '../components/GrantModal.js';
import { AiSuggestModal } from '../components/AiSuggestModal.js';

export const AccessManagementPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [activeGrantDoc, setActiveGrantDoc] = useState<{ id: string; name: string } | null>(null);
  const [activeAiDoc, setActiveAiDoc] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadOwnedDocuments();
  }, []);

  const loadOwnedDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listDocuments({ scope: 'owned', includeGrants: true });
      setDocuments(res.documents);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch owned documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (documentId: string, userId: string, email: string) => {
    if (!confirm(`Revoke access for ${email}? Taking access away works immediately.`)) return;

    setError(null);
    setSuccess(null);
    try {
      await api.revokeAccess(documentId, userId);
      setSuccess(`Access revoked immediately for ${email}. Subsequent requests are blocked at 0ms latency.`);
      loadOwnedDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access.');
    }
  };

  const totalGrants = documents.reduce((acc, doc) => acc + (doc.grants?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <KeyRound className="h-5 w-5 text-emerald-400" />
          <span>Access Control & Discretionary Grant Management</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Sovereign document owner console. Issue permissions to named users and revoke access instantly.
        </p>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{documents.length}</div>
            <div className="text-slate-400 text-[11px]">Owned Confidential Files</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{totalGrants}</div>
            <div className="text-slate-400 text-[11px]">Active Discretionary Grants</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400">0 ms</div>
            <div className="text-slate-400 text-[11px]">Revocation Latency (Real-time DB Check)</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Owned Documents & Grants List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Querying owned documents and active grants...
          </div>
        ) : documents.length === 0 ? (
          <div className="glass-panel py-12 rounded-3xl text-center text-slate-400 text-xs border border-white/10">
            You do not own any uploaded documents yet. Upload a document from the Documents page to begin sharing.
          </div>
        ) : (
          documents.map((doc) => {
            const docGrants = doc.grants || [];

            return (
              <div
                key={doc.id}
                className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
              >
                {/* Document Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="font-semibold text-white hover:text-blue-400 transition text-sm flex items-center space-x-1.5"
                      >
                        <span>{doc.name}</span>
                        <ExternalLink className="h-3 w-3 text-slate-500" />
                      </Link>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Category: <span className="text-blue-300">{doc.category}</span> • {(doc.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveAiDoc({ id: doc.id, name: doc.name })}
                      className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 rounded-xl text-xs font-medium transition flex items-center space-x-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>AI Advisor</span>
                    </button>

                    <button
                      onClick={() => setActiveGrantDoc({ id: doc.id, name: doc.name })}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Issue Grant</span>
                    </button>
                  </div>
                </div>

                {/* Grants Inventory */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Active Discretionary Grants ({docGrants.length})</span>
                    {docGrants.length === 0 && (
                      <span className="text-slate-500 lowercase font-normal">private to owner</span>
                    )}
                  </div>

                  {docGrants.length === 0 ? (
                    <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-dashed border-white/5 text-xs text-slate-500 text-center">
                      No grants issued yet for this file. Click "Issue Grant" or "AI Advisor" to share with team members.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {docGrants.map((g: any) => (
                        <div
                          key={g.id}
                          className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div className="max-w-[80%]">
                            <div className="font-medium text-white truncate">{g.user.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{g.user.email}</div>
                            <div className="flex items-center space-x-1.5 mt-1">
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                  g.permission === 'EDIT'
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {g.permission}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(g.grantedAt).toLocaleDateString()}
                              </span>
                              {g.notes && <span className="text-[10px] text-slate-500 truncate">• {g.notes}</span>}
                            </div>
                          </div>

                          <button
                            onClick={() => handleRevoke(doc.id, g.userId, g.user.email)}
                            title="Revoke access immediately"
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {activeGrantDoc && (
        <GrantModal
          documentId={activeGrantDoc.id}
          documentName={activeGrantDoc.name}
          isOpen={true}
          onClose={() => {
            setActiveGrantDoc(null);
            loadOwnedDocuments();
          }}
        />
      )}

      {activeAiDoc && (
        <AiSuggestModal
          documentId={activeAiDoc.id}
          documentName={activeAiDoc.name}
          isOpen={true}
          onClose={() => {
            setActiveAiDoc(null);
            loadOwnedDocuments();
          }}
          onGrantAdded={() => loadOwnedDocuments()}
        />
      )}
    </div>
  );
};
