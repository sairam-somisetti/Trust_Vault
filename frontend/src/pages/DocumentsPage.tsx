import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Share2,
  Trash2,
  Plus,
  Search,
  Lock,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api.js';
import { DocumentItem } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { UploadModal } from '../components/UploadModal.js';
import { GrantModal } from '../components/GrantModal.js';
import { AiSuggestModal } from '../components/AiSuggestModal.js';

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeGrantDoc, setActiveGrantDoc] = useState<{ id: string; name: string } | null>(null);
  const [activeAiDoc, setActiveAiDoc] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [search, category]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listDocuments({ search, category: category || undefined });
      setDocuments(res.documents);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch authorized documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      await api.downloadDocument(doc.id, doc.name);
    } catch (err: any) {
      alert(`Download Refused (HTTP ${err.status}): ${err.message}`);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm(`Are you sure you want to delete '${doc.name}'? This cannot be undone.`)) return;

    try {
      await api.deleteDocument(doc.id);
      loadDocuments();
    } catch (err: any) {
      alert(`Delete Refused: ${err.message}`);
    }
  };

  const categories = ['All', 'Payroll', 'Legal', 'Finance', 'Engineering', 'General'];

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Confidential Documents</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-normal">
              {documents.length} Available
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Decrypted dynamically in real-time via server authorization choke point
          </p>
        </div>

        {/* Upload Button */}
        {user?.role !== 'VIEWER' && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-medium transition flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 glass-panel rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, owner, or keyword..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => {
            const active = (c === 'All' && !category) || category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c === 'All' ? '' : c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Document Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3.5 px-5">Document</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Owner</th>
                <th className="py-3.5 px-3">Your Permission</th>
                <th className="py-3.5 px-3">Date Added</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Querying authorized document index...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="inline-flex p-3 rounded-2xl bg-slate-800/60 text-slate-400 border border-white/5">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="text-xs font-semibold text-slate-200">No documents found</div>
                      <p className="text-[11px] text-slate-500">
                        No documents match your query or have been granted to your account.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isOwner = doc.isOwner;

                  return (
                    <tr key={doc.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <Link
                              to={`/documents/${doc.id}`}
                              className="font-medium text-white hover:text-blue-400 transition flex items-center space-x-1.5"
                            >
                              <span>{doc.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 hover:opacity-100 transition text-slate-400" />
                            </Link>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {(doc.fileSize / 1024).toFixed(1)} KB • {doc.mimeType}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-900 border border-white/10 text-slate-300">
                          {doc.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-200">{doc.owner?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{doc.owner?.email}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                            isOwner
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : doc.userPermission === 'EDIT'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {doc.userPermission}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Details Page */}
                          <Link
                            to={`/documents/${doc.id}`}
                            title="View details & permissions"
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(doc)}
                            title="Download decrypted file"
                            className="p-2 text-blue-400 hover:text-white hover:bg-blue-600/30 rounded-lg border border-transparent hover:border-blue-500/30 transition"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Share / Manage Access (Owner only) */}
                          {isOwner && (
                            <button
                              onClick={() => setActiveGrantDoc({ id: doc.id, name: doc.name })}
                              title="Manage Access Grants"
                              className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-600/30 rounded-lg border border-transparent hover:border-emerald-500/30 transition"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* AI Suggestions (Owner only) */}
                          {isOwner && (
                            <button
                              onClick={() => setActiveAiDoc({ id: doc.id, name: doc.name })}
                              title="AI Access Advisor"
                              className="p-2 text-purple-400 hover:text-white hover:bg-purple-600/30 rounded-lg border border-transparent hover:border-purple-500/30 transition"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete Button (Owner only) */}
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(doc)}
                              title="Delete Document"
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg border border-transparent hover:border-red-800/40 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => loadDocuments()}
      />

      {activeGrantDoc && (
        <GrantModal
          documentId={activeGrantDoc.id}
          documentName={activeGrantDoc.name}
          isOpen={true}
          onClose={() => {
            setActiveGrantDoc(null);
            loadDocuments();
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
            loadDocuments();
          }}
          onGrantAdded={() => loadDocuments()}
        />
      )}
    </div>
  );
};
