import React, { useState } from 'react';
import { Upload, X, ShieldAlert, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import { api } from '../api.js';
import { DocumentItem } from '../types.js';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (doc: DocumentItem) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Payroll');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);

      // Client pre-warning for disallowed executables
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (['exe', 'php', 'sh', 'bat', 'cmd', 'js'].includes(ext || '')) {
        setError(`Executable files (.${ext}) are strictly prohibited and will be rejected by the server.`);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.uploadDocument(file, category);
      onUploaded(res.document);
      onClose();
    } catch (err: any) {
      setError(err.message || 'File upload rejected');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Upload Confidential Document</h3>
            <p className="text-xs text-slate-400">Files are validated, encrypted, and isolated outside web root</p>
          </div>
        </div>

        {/* Security Architecture Info Box */}
        <div className="mb-5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center space-x-2 text-blue-400 font-medium">
            <Lock className="h-3.5 w-3.5" />
            <span>Zero-Trust Ingestion Pipeline:</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Deep magic-byte signature inspection (blocks polyglots & MIME spoofing).</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Encrypted at rest using AES-256-GCM with dynamic 12-byte IV.</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Stored under randomized UUID key in private storage outside public root.</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select File</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-slate-950 border border-slate-800 rounded-lg p-2"
            />
            {file && (
              <div className="mt-1.5 text-[11px] text-slate-400">
                Selected: <span className="text-white font-mono">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Document Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Payroll">Payroll / Salaries (Confidential)</option>
              <option value="Legal">Legal & Contracts</option>
              <option value="Finance">Financial Audit & Taxes</option>
              <option value="Engineering">Engineering & IP Architecture</option>
              <option value="General">General Corporate</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-medium text-white transition flex items-center space-x-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{loading ? 'Encrypting & Storing...' : 'Upload & Encrypt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
