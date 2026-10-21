import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Share2, Download, ExternalLink, FileText, Search, AlertCircle, User } from 'lucide-react';
import { api } from '../api.js';
import { DocumentItem } from '../types.js';

export const SharedWithMePage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedDocuments();
  }, [search]);

  const loadSharedDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listDocuments({ scope: 'shared', search });
      setDocuments(res.documents);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shared documents.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-blue-400" />
            <span>Shared with Me</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-normal">
              {documents.length} Files
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Confidential documents explicitly shared with your identity by document owners
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shared files..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Shared Documents Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3.5 px-5">Document</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Shared By (Owner)</th>
                <th className="py-3.5 px-3">Granted Permission</th>
                <th className="py-3.5 px-3">Date Shared</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Querying authorized discretionary grants...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="inline-flex p-3 rounded-2xl bg-slate-800/60 text-slate-400 border border-white/5">
                        <Share2 className="h-6 w-6" />
                      </div>
                      <div className="text-xs font-semibold text-slate-200">No shared documents</div>
                      <p className="text-[11px] text-slate-500">
                        No document owners have issued an access grant to your email address yet.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <Link
                            to={`/documents/${doc.id}`}
                            className="font-medium text-white hover:text-blue-400 transition"
                          >
                            {doc.name}
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
                      <div className="text-slate-200 flex items-center space-x-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{doc.owner?.name || 'Owner'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{doc.owner?.email}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          doc.userPermission === 'EDIT'
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
                        <Link
                          to={`/documents/${doc.id}`}
                          title="View Details"
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>

                        <button
                          onClick={() => handleDownload(doc)}
                          title="Download Decrypted File"
                          className="p-2 text-blue-400 hover:text-white hover:bg-blue-600/30 rounded-lg border border-transparent hover:border-blue-500/30 transition"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
