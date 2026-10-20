import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  Users,
  Lock,
  Hash,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api.js';
import { AuditRecord } from '../types.js';

export const AdminAuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Integrity Check State
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    valid: boolean;
    totalRecords: number;
    latestHash?: string;
    message: string;
    brokenAtId?: number;
    reason?: string;
  } | null>(null);

  // Security Alerts
  const [alerts, setAlerts] = useState<{
    totalDeniedEventsLast24h: number;
    suspiciousIps: any[];
    suspiciousActors: any[];
  } | null>(null);

  // Users Management
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadAuditLogs();
    loadSecurityAlerts();
    loadUsers();
  }, [page, actionFilter, statusFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        page,
        limit: 15,
        action: actionFilter || undefined,
        status: statusFilter || undefined,
      });
      setLogs(res.records);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityAlerts = async () => {
    try {
      const res = await api.getSecurityAlerts();
      setAlerts(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyAuditIntegrity();
      setIntegrityResult(result);
    } catch (err: any) {
      setIntegrityResult({
        valid: false,
        totalRecords: 0,
        message: err.message || 'Integrity verification failed.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleUser = async (userId: string, currentActive: boolean) => {
    try {
      await api.toggleUserStatus(userId, !currentActive);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Cryptographic Chain Verification Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Cryptographic Audit Chain Integrity</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  SHA-256 LINKED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Each record is mathematically chained to its predecessor. Quiet alteration breaks the cryptographic hash.
              </p>
            </div>
          </div>

          <button
            onClick={handleVerifyIntegrity}
            disabled={verifying}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition flex items-center justify-center space-x-2 shrink-0"
          >
            <RotateCw className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Verifying Chain...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>

        {integrityResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs ${
              integrityResult.valid
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : 'bg-red-950/40 border-red-800/80 text-red-200'
            }`}
          >
            <div className="flex items-center space-x-2 font-semibold text-sm">
              {integrityResult.valid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Mathematical Chain Integrity Verified (Zero Tampering)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <span>CRITICAL ALERT: Tampering Detected in Audit Ledger!</span>
                </>
              )}
            </div>
            <p className="mt-1">{integrityResult.message}</p>
            {integrityResult.latestHash && (
              <div className="mt-2 text-[11px] font-mono text-slate-400 break-all">
                Tip Hash: <span className="text-white">{integrityResult.latestHash}</span>
              </div>
            )}
            {integrityResult.brokenAtId && (
              <div className="mt-2 text-xs font-mono text-red-300">
                Tamper point: Record ID #{integrityResult.brokenAtId} — {integrityResult.reason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Security Anomalies & Refused Access Section */}
      {alerts && alerts.totalDeniedEventsLast24h > 0 && (
        <div className="bg-red-950/30 border border-red-900/60 rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-red-400 font-semibold text-sm mb-3">
            <ShieldAlert className="h-5 w-5" />
            <span>Refused Access Probes (Last 24 Hours: {alerts.totalDeniedEventsLast24h} Events)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-red-900/40">
              <div className="font-medium text-slate-300 mb-2">Flagged Suspicious IP Addresses:</div>
              {alerts.suspiciousIps.length === 0 ? (
                <div className="text-slate-500">No elevated IP denial spikes.</div>
              ) : (
                <div className="space-y-1.5">
                  {alerts.suspiciousIps.map((ip) => (
                    <div key={ip.ip} className="flex justify-between items-center text-slate-300">
                      <span className="font-mono">{ip.ip}</span>
                      <span className="text-red-400 font-semibold">{ip.count} denied attempts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-red-900/40">
              <div className="font-medium text-slate-300 mb-2">Flagged Suspicious User Accounts:</div>
              {alerts.suspiciousActors.length === 0 ? (
                <div className="text-slate-500">No elevated account denial spikes.</div>
              ) : (
                <div className="space-y-1.5">
                  {alerts.suspiciousActors.map((actor) => (
                    <div key={actor.email} className="flex justify-between items-center text-slate-300">
                      <span className="font-mono">{actor.email}</span>
                      <span className="text-red-400 font-semibold">{actor.count} denied attempts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Comprehensive Audit Trail Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">System Audit Ledger</h3>
            <p className="text-xs text-slate-400">
              Showing {logs.length} of {total} cryptographic audit records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Actions</option>
              <option value="ACCESS_DENIED">ACCESS_DENIED</option>
              <option value="DOCUMENT_DOWNLOAD">DOCUMENT_DOWNLOAD</option>
              <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
              <option value="GRANT_CREATED">GRANT_CREATED</option>
              <option value="GRANT_REVOKED">GRANT_REVOKED</option>
              <option value="AI_RECOMMENDATION_APPROVED">AI_RECOMMENDATION_APPROVED</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="DENIED">DENIED</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">IP Address</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Cryptographic Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading cryptographic ledger records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No audit records matching filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-400">#{log.id}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-white font-sans">{log.actorEmail || 'Unauthenticated'}</div>
                      {log.actorId && <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{log.actorId}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{log.actorIp}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.action === 'ACCESS_DENIED'
                            ? 'bg-red-900/60 text-red-300 border border-red-700'
                            : log.action.includes('GRANT')
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                            : 'bg-blue-900/60 text-blue-300 border border-blue-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/60' : 'text-red-400 bg-red-950/60'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-[10px] text-slate-500 truncate max-w-[180px]" title={`Prev: ${log.prevHash}\nHash: ${log.hash}`}>
                        Hash: {log.hash.substring(0, 16)}...
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
          <div>
            Page {page} of {totalPages || 1}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. User Directory & Instant Suspension Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">System Directory & Session Control</h3>
            <p className="text-xs text-slate-400">Deactivating a user instantly revokes all authentication and download capabilities</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Owned Docs</th>
                <th className="py-2.5 px-3">Active Grants</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-medium text-white">{u.name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{u._count?.ownedDocuments || 0}</td>
                  <td className="py-2.5 px-3 text-slate-400">{u._count?.grants || 0}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.isActive ? 'text-emerald-400 bg-emerald-950/60' : 'text-red-400 bg-red-950/60'
                      }`}
                    >
                      {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {u.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleToggleUser(u.id, u.isActive)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                          u.isActive
                            ? 'bg-red-900/40 hover:bg-red-900/70 text-red-300 border border-red-800'
                            : 'bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
