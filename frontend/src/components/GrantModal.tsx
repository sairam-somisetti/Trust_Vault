import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, X, AlertCircle, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../api.js';
import { DocumentGrant } from '../types.js';

interface GrantModalProps {
  documentId: string;
  documentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const GrantModal: React.FC<GrantModalProps> = ({
  documentId,
  documentName,
  isOpen,
  onClose,
}) => {
  const [grants, setGrants] = useState<DocumentGrant[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [permission, setPermission] = useState<'READ' | 'EDIT'>('READ');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGrants();
    }
  }, [isOpen, documentId]);

  const loadGrants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getGrants(documentId);
      setGrants(res.grants);
    } catch (err: any) {
      setError(err.message || 'Failed to load document permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    setError(null);
    setSuccess(null);
    try {
      await api.grantAccess(documentId, { userEmail, permission, notes });
      setSuccess(`Access granted to ${userEmail} with ${permission} permission.`);
      setUserEmail('');
      setNotes('');
      loadGrants();
    } catch (err: any) {
      setError(err.message || 'Failed to grant access');
    }
  };

  const handleRevoke = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${email}? Taking access away works immediately.`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.revokeAccess(documentId, userId);
      setSuccess(`Access revoked immediately for ${email}. Subsequent requests will be blocked (HTTP 403).`);
      loadGrants();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Access Control & Granular Grants</h3>
            <p className="text-xs text-slate-400 truncate max-w-sm">
              Document: <span className="text-emerald-300 font-mono">{documentName}</span>
            </p>
          </div>
        </div>

        {/* Security Invariant Callout */}
        <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
          <Zap className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <div>
            <span className="font-semibold">Immediate Revocation Guarantee: </span>
            <span>
              TrustVault checks permissions directly against the database on every stream request.
              When you click Revoke, the user's access stops within 0 milliseconds.
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Grant New Permission Form */}
        <form onSubmit={handleGrantAccess} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-5">
          <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center space-x-1.5">
            <UserPlus className="h-3.5 w-3.5 text-blue-400" />
            <span>Grant Access to Named User</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <div className="sm:col-span-2">
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'READ' | 'EDIT')}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="READ">READ (View/Download)</option>
                <option value="EDIT">EDIT (Rename/Category)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional audit reason or notes..."
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
            >
              Grant
            </button>
          </div>
        </form>

        {/* Active Grants List */}
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active Discretionary Grants ({grants.length})
          </div>

          {loading ? (
            <div className="text-center py-6 text-xs text-slate-500">Loading grants...</div>
          ) : grants.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              No named grants issued yet. Document is strictly private to the owner.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {grants.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{g.user.name}</span>
                      <span className="text-slate-400">({g.user.email})</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          g.permission === 'EDIT'
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                            : 'bg-blue-900/60 text-blue-300 border border-blue-700'
                        }`}
                      >
                        {g.permission}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Granted by {g.grantedBy.name} on {new Date(g.grantedAt).toLocaleDateString()}
                      {g.notes && ` • "${g.notes}"`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(g.user.id, g.user.email)}
                    title="Revoke access immediately"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
