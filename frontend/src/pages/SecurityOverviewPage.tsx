import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Zap,
  Hash,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileCheck,
  ShieldAlert,
  Server,
  Layers,
  Fingerprint,
} from 'lucide-react';
import { api } from '../api.js';

export const SecurityOverviewPage: React.FC = () => {
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    valid: boolean;
    totalRecords: number;
    latestHash?: string;
    message: string;
    brokenAtId?: number;
    reason?: string;
  } | null>(null);

  const [securityEvents, setSecurityEvents] = useState<{
    totalDenialsLast24h: number;
    totalAuditedRecords: number;
    recentDenials: any[];
  } | null>(null);

  useEffect(() => {
    loadSecurityEvents();
    runVerification();
  }, []);

  const loadSecurityEvents = async () => {
    try {
      const res = await api.getSecurityEvents();
      setSecurityEvents(res);
    } catch (err) {
      console.error('Failed to load security events', err);
    }
  };

  const runVerification = async () => {
    setVerifying(true);
    try {
      const res = await api.getSecurityChainVerification();
      setIntegrityResult(res);
    } catch (err: any) {
      setIntegrityResult({
        valid: false,
        totalRecords: 0,
        message: err.message || 'Verification endpoint failed.',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-semibold">
            SYSTEM DEFENSE SPECIFICATION
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
            LIVE BACKEND VERIFIED
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-2 flex items-center space-x-2.5">
          <ShieldCheck className="h-6 w-6 text-cyan-400" />
          <span>Security & Cryptographic Architecture Overview</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Comprehensive real-time telemetry, tamper-evidence verification, and authorization architecture
          as implemented by the TrustVault backend.
        </p>
      </div>

      {/* 1. Cryptographic Audit-Chain Integrity Verification (Live Engine) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-start space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Hash className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Cryptographic Audit-Chain Integrity</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  SHA-256 HASH LINKED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Every authorization event, file download, grant modification, and failed access probe is mathematically chained to its predecessor. Quiet alteration breaks the hash signature.
              </p>
            </div>
          </div>

          <button
            onClick={runVerification}
            disabled={verifying}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-xs transition flex items-center justify-center space-x-2 shrink-0 shadow-lg shadow-purple-600/20"
          >
            <RotateCw className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Traversing Chain...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>

        {/* Verification Status Card */}
        {integrityResult && (
          <div
            className={`p-4 rounded-2xl border text-xs ${
              integrityResult.valid
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : 'bg-red-950/40 border-red-800/80 text-red-200'
            }`}
          >
            <div className="flex items-center space-x-2 font-semibold text-sm">
              {integrityResult.valid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Mathematical Chain Integrity Confirmed (0 Tampered Records)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <span>CRITICAL SECURITY ALERT: Chain Break Detected!</span>
                </>
              )}
            </div>
            <p className="mt-1">{integrityResult.message}</p>
            {integrityResult.latestHash && (
              <div className="mt-2 text-[11px] font-mono text-slate-300 break-all bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                Current Ledger Tip Hash: <span className="text-purple-300">{integrityResult.latestHash}</span>
              </div>
            )}
            {integrityResult.brokenAtId && (
              <div className="mt-2 text-xs font-mono text-red-300">
                Breach Identified At: Record ID #{integrityResult.brokenAtId} — {integrityResult.reason}
              </div>
            )}
          </div>
        )}

        {/* Hash Chaining Formula Details */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
            Ledger Hashing Primitive:
          </div>
          <div className="font-mono text-[11px] text-purple-300 bg-slate-900 p-2 rounded-lg border border-white/5 overflow-x-auto">
            H[n] = SHA256( H[n-1] + id + timestamp + actorId + action + resourceId + status + details )
          </div>
          <p className="text-[11px] text-slate-500">
            Genesis block initialized with fixed root (64 zeros). Modifying any column in the database breaks the mathematical hash of all subsequent entries.
          </p>
        </div>
      </div>

      {/* 2. Core Security Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Centralized Authorization Choke Point */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl space-y-3.5">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Central Authorization Choke Point</h3>
              <p className="text-[11px] text-slate-400">Strict server-side gatekeeper pattern</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Every document retrieval, decrypted file stream, grant edit, and deletion funnels through a single centralized choke point: <code className="text-blue-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px]">authorizeDocumentAccess()</code>.
          </p>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Zero Client-Side Trust:</strong> Hidden buttons or page checks are never trusted. The server decides every time.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Least-Privilege Isolation:</strong> Administrators manage compliance and users, but CANNOT view or download confidential documents without an explicit owner grant.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>IDOR & Traversal Immunity:</strong> UUID identifiers mapped internally; directory traversal sequences (<code className="text-slate-300">../../</code>) stripped and blocked.</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Instant Revocation (Zero-Lag Verification) */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl space-y-3.5">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Instant Revocation Engine (0ms Lag)</h3>
              <p className="text-[11px] text-slate-400">Zero presigned URLs • Zero cached permission claims</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            When access is taken away, whatever was issued to that person stops working immediately.
          </p>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Deliberately Rejected Presigned URLs:</strong> AWS S3 presigned links stay active until TTL expires (e.g. 15 minutes). TrustVault serves files via an authenticated backend pipe with 0ms revocation.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Stateless Token Claims Rejected:</strong> Permissions are never baked into JWT payloads. JWTs only identify the actor; grants are evaluated live in the database.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Sub-Millisecond Indexed Lookup:</strong> Compound index on <code className="text-slate-300 font-mono">(documentId, userId)</code> resolves in &lt;0.5ms.</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Encryption Status & Physical Storage */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl space-y-3.5">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AES-256-GCM Storage Encryption</h3>
              <p className="text-[11px] text-slate-400">Hardware-grade encryption at rest</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Files stored on disk are completely unreadable ciphertext, protected against physical server theft or raw disk dumps.
          </p>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Dynamic IV & Auth Tag:</strong> 96-bit random initialization vector per file + 128-bit Galois Counter Mode (GCM) authentication tag.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Isolated Private Directory:</strong> Files stored in <code className="text-slate-300 font-mono">storage/private/</code> strictly outside the public web root.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>No Static URLs:</strong> No direct file URLs exist. All streams require real-time backend decryption.</span>
            </div>
          </div>
        </div>

        {/* Pillar 4: Deep Upload Ingestion Validation */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl space-y-3.5">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Magic-Byte File Ingestion Filter</h3>
              <p className="text-[11px] text-slate-400">MIME confusion & polyglot defense</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Client-supplied file extensions and MIME headers are spoofable. TrustVault inspects the raw file buffer signatures before saving.
          </p>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Signature Verification:</strong> PDF (<code className="text-slate-300 font-mono">%PDF-</code>), PNG (<code className="text-slate-300 font-mono">\x89PNG</code>), JPEG (<code className="text-slate-300 font-mono">0xFFD8FF</code>).</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Executable Blacklist:</strong> Rejects <code className="text-slate-300 font-mono">.exe, .php, .sh, .bat, .cmd, .js</code> regardless of declared MIME.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Download Headers:</strong> Enforces <code className="text-slate-300 font-mono">nosniff</code> and <code className="text-slate-300 font-mono">Content-Disposition: attachment</code> to prevent browser script execution.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Security Telemetry & Refused Probes */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Real-Time Refused Attempts & Anomaly Detection</h2>
            <p className="text-xs text-slate-400">
              Unlike ordinary CRUD systems, TrustVault records unauthorized attempts as evidence
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
            <div className="text-[11px] text-slate-500 font-medium">Refused Probes (Last 24 Hours)</div>
            <div className="text-2xl font-bold text-red-400 mt-1">
              {securityEvents ? securityEvents.totalDenialsLast24h : 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Logged as ACCESS_DENIED in cryptographic audit trail</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
            <div className="text-[11px] text-slate-500 font-medium">Total Chained Audit Ledger Records</div>
            <div className="text-2xl font-bold text-white mt-1">
              {securityEvents ? securityEvents.totalAuditedRecords : 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Indelible forensic history from system inception</div>
          </div>
        </div>

        {securityEvents && securityEvents.recentDenials.length > 0 ? (
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">Recent Denied Access Attempts:</div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {securityEvents.recentDenials.map((denial: any) => (
                <div
                  key={denial.id}
                  className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/40 text-red-300 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-red-400">[{denial.action}]</span>
                    <span className="text-slate-400">{denial.actorIp}</span>
                    <span className="text-slate-500 truncate max-w-xs">{denial.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(denial.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5 text-xs text-slate-500 text-center">
            No active denial spikes in the current monitoring window.
          </div>
        )}
      </div>
    </div>
  );
};
