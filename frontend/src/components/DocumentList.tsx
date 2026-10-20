import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Share2,
  Trash2,
  Plus,
  Search,
  Filter,
  Lock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { api } from '../api.js';
import { DocumentItem, User } from '../types.js';
import { UploadModal } from './UploadModal.js';
import { GrantModal } from './GrantModal.js';
import { AiSuggestModal } from './AiSuggestModal.js';

interface DocumentListProps {
  currentUser: User;
}

export const DocumentList: React.FC<DocumentListProps> = ({ currentUser }) => {
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
      setError(err.message || 'Failed to fetch authorized documents');
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
    <div className="space-y-5">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by name or keyword..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Button (Owners & Admins) */}
        {currentUser.role !== 'VIEWER' && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-600/20 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Authorized Vault Files ({documents.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:block">
            Decrypted on the fly • AES-256-GCM
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3">Your Permission</th>
                <th className="py-3 px-3">Date Added</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Querying authorized document index...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-500">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="text-xs font-semibold text-slate-300">No documents found</div>
                      <p className="text-[11px] text-slate-500">
                        You have not uploaded any documents, and no documents have been shared with you.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isOwner = doc.isOwner;
                  const canEdit = isOwner || doc.userPermission === 'EDIT';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-white flex items-center space-x-1.5">
                              <span>{doc.name}</span>
                              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                AES-256
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {(doc.fileSize / 1024).toFixed(1)} KB • {doc.mimeType}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {doc.category}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-200">{doc.owner?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{doc.owner?.email}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOwner
                              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                              : doc.userPermission === 'EDIT'
                              ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                              : 'bg-blue-900/60 text-blue-300 border border-blue-700'
                          }`}
                        >
                          {doc.userPermission}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(doc)}
                            title="Download decrypted file"
                            className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600/30 rounded-lg transition"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Share / Manage Access Button (Owner only) */}
                          {isOwner && (
                            <button
                              onClick={() => setActiveGrantDoc({ id: doc.id, name: doc.name })}
                              title="Manage Access & Grants"
                              className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-600/30 rounded-lg transition"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* AI Suggestions Button (Owner only) */}
                          {isOwner && (
                            <button
                              onClick={() => setActiveAiDoc({ id: doc.id, name: doc.name })}
                              title="AI Access Advisor"
                              className="p-1.5 text-purple-400 hover:text-white hover:bg-purple-600/30 rounded-lg transition"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete Button (Owner only) */}
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(doc)}
                              title="Delete Document"
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
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
