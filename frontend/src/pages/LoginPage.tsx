import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Key, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/documents';
  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get('expired') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-panel rounded-3xl max-w-md w-full p-8 shadow-2xl relative border border-white/10">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 items-center justify-center text-blue-400 mb-3 shadow-lg shadow-blue-500/10">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TrustVault Authentication</h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Trust Confidential Document Access & Audit Ledger
          </p>
        </div>

        {isExpired && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center space-x-2">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Your session has expired. Please sign in again to continue.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2.5 glass-input rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 glass-input rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-xs shadow-lg shadow-blue-600/20 transition flex items-center justify-center space-x-2"
          >
            <Key className="h-4 w-4" />
            <span>{loading ? 'Verifying Identity...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an authorized account?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition">
            Register new account
          </Link>
        </div>
      </div>
    </div>
  );
};
