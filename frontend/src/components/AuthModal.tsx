import React, { useState } from 'react';
import { Shield, Key, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { api } from '../api.js';
import { User, UserRole } from '../types.js';

interface AuthModalProps {
  onSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('owner@trustvault.local');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('Sarah Connor');
  const [role, setRole] = useState<UserRole>('DOCUMENT_OWNER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const res = await api.register({ email, password, name, role });
        localStorage.setItem('tv_token', res.token);
        onSuccess(res.user, res.token);
      } else {
        const res = await api.login({ email, password });
        localStorage.setItem('tv_token', res.token);
        onSuccess(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const setTestAccount = (testEmail: string, testName: string, testRole: UserRole) => {
    setEmail(testEmail);
    setPassword('Password123!');
    setName(testName);
    setRole(testRole);
    setIsRegister(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/30 items-center justify-center text-blue-400 mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">TrustVault Authentication</h2>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to access your confidential documents and audit ledger
          </p>
        </div>

        {/* Quick Benchmark Preset Accounts */}
        <div className="mb-6 p-3 bg-slate-950 rounded-xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Select Benchmark Account:</span>
            <span className="text-[10px] text-blue-400">1-Click Login</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTestAccount('admin@trustvault.local', 'System Administrator', 'ADMIN')}
              className={`p-2 rounded border text-left transition ${
                email === 'admin@trustvault.local'
                  ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-purple-400">Administrator</div>
              <div className="text-[10px] text-slate-500 truncate">admin@trustvault.local</div>
            </button>

            <button
              type="button"
              onClick={() => setTestAccount('owner@trustvault.local', 'Sarah Connor', 'DOCUMENT_OWNER')}
              className={`p-2 rounded border text-left transition ${
                email === 'owner@trustvault.local'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-emerald-400">Document Owner</div>
              <div className="text-[10px] text-slate-500 truncate">owner@trustvault.local</div>
            </button>

            <button
              type="button"
              onClick={() => setTestAccount('viewer@trustvault.local', 'John Doe', 'VIEWER')}
              className={`p-2 rounded border text-left transition ${
                email === 'viewer@trustvault.local'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-blue-400">Authorized Viewer</div>
              <div className="text-[10px] text-slate-500 truncate">viewer@trustvault.local</div>
            </button>

            <button
              type="button"
              onClick={() => setTestAccount('attacker@trustvault.local', 'Eve Malicious', 'VIEWER')}
              className={`p-2 rounded border text-left transition ${
                email === 'attacker@trustvault.local'
                  ? 'border-red-500 bg-red-500/20 text-red-200'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-red-400">Unauthorized User</div>
              <div className="text-[10px] text-slate-500 truncate">attacker@trustvault.local</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alice Smith"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Initial Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="VIEWER">Viewer (Read-only access)</option>
                <option value="DOCUMENT_OWNER">Document Owner (Upload & grant access)</option>
                <option value="ADMIN">System Administrator (Audit & user compliance)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-lg transition flex items-center justify-center space-x-2"
          >
            <Key className="h-4 w-4" />
            <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register new user'}
          </button>
        </div>
      </div>
    </div>
  );
};
