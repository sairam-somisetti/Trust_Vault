import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { DocumentList } from './components/DocumentList.js';
import { AdminAuditView } from './components/AdminAuditView.js';
import { AuthModal } from './components/AuthModal.js';
import { api } from './api.js';
import { User } from './types.js';
import { ShieldCheck, Lock, Activity, EyeOff } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'audit'>('documents');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    const token = localStorage.getItem('tv_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.me();
      setCurrentUser(res.user);
    } catch {
      localStorage.removeItem('tv_token');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab(user.role === 'ADMIN' ? 'audit' : 'documents');
  };

  const handleLogout = () => {
    localStorage.removeItem('tv_token');
    setCurrentUser(null);
  };

  const handleSwitchUser = async (email: string) => {
    try {
      const res = await api.login({ email, password: 'Password123!' });
      localStorage.setItem('tv_token', res.token);
      setCurrentUser(res.user);
      setActiveTab(res.user.role === 'ADMIN' ? 'audit' : 'documents');
    } catch (err: any) {
      alert(`Switch user failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">
        Initializing TrustVault Zero-Trust Security Environment...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Core System Security Posture Banner */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-white">Central Authorization Choke Point</div>
              <div className="text-slate-400 text-[11px]">Server validates DB grants at 0ms stream</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-white">Cryptographic SHA-256 Hash Chaining</div>
              <div className="text-slate-400 text-[11px]">Append-only ledger detects any quiet edit</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-white">Instant Revocation (Zero-Lag)</div>
              <div className="text-slate-400 text-[11px]">No presigned URLs • No stale tokens</div>
            </div>
          </div>
        </div>

        {currentUser && (
          <>
            {activeTab === 'documents' && <DocumentList currentUser={currentUser} />}
            {activeTab === 'audit' && currentUser.role === 'ADMIN' && <AdminAuditView />}
          </>
        )}
      </main>

      {!currentUser && <AuthModal onSuccess={handleLoginSuccess} />}
    </div>
  );
}
export default App;
