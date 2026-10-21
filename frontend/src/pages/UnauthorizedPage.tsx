import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="glass-panel max-w-lg w-full p-8 rounded-3xl text-center border border-red-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-4 shadow-lg shadow-red-500/10">
          <ShieldAlert className="h-12 w-12" />
        </div>

        <div className="inline-block mb-3">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono font-semibold">
            HTTP 403 ACCESS BARRIER ENFORCED
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          Unauthorized Access Attempt
        </h1>

        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto mb-6">
          The server has enforced a zero-trust authorization check. Your identity{' '}
          {user && <span className="text-white font-mono">({user.email})</span>} does not possess
          the required role or active document grant to access this resource.
        </p>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 text-[11px] text-slate-500 font-mono mb-6 text-left space-y-1">
          <div className="text-slate-400 font-semibold flex items-center space-x-1.5">
            <Lock className="h-3 w-3 text-red-400" />
            <span>Forensic Notice:</span>
          </div>
          <div>Refused attempts are automatically etched into the cryptographic audit trail.</div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/documents"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition flex items-center justify-center space-x-2 border border-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Documents</span>
          </Link>

          <button
            onClick={logout}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl text-xs font-medium transition flex items-center justify-center space-x-2 border border-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign In as Different Role</span>
          </button>
        </div>
      </div>
    </div>
  );
};
