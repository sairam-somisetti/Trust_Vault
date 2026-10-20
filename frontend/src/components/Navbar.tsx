import React from 'react';
import { Shield, Lock, FileText, CheckCircle2, LogOut, UserCheck } from 'lucide-react';
import { User, UserRole } from '../types.js';

interface NavbarProps {
  currentUser: User | null;
  activeTab: 'documents' | 'audit';
  setActiveTab: (tab: 'documents' | 'audit') => void;
  onLogout: () => void;
  onSwitchUser: (email: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onSwitchUser,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-900/60 text-purple-300 border-purple-700';
      case 'DOCUMENT_OWNER':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
      case 'VIEWER':
        return 'bg-blue-900/60 text-blue-300 border-blue-700';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">TrustVault</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                ZERO-TRUST
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Confidential Document Sharing & Cryptographic Audit Trail
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {currentUser && (
          <nav className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </button>

            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  activeTab === 'audit'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Lock className="h-4 w-4" />
                <span>Admin Audit & Compliance</span>
              </button>
            )}
          </nav>
        )}

        {/* User Profile & Demo Switcher */}
        {currentUser ? (
          <div className="flex items-center space-x-3">
            {/* Quick Role Switcher for Evaluators / Judges */}
            <div className="hidden lg:flex items-center space-x-1 text-xs">
              <span className="text-slate-500 mr-1 flex items-center">
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Switch:
              </span>
              <button
                onClick={() => onSwitchUser('admin@trustvault.local')}
                className={`px-2 py-1 rounded border transition ${
                  currentUser.role === 'ADMIN'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-bold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => onSwitchUser('owner@trustvault.local')}
                className={`px-2 py-1 rounded border transition ${
                  currentUser.role === 'DOCUMENT_OWNER'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Owner
              </button>
              <button
                onClick={() => onSwitchUser('viewer@trustvault.local')}
                className={`px-2 py-1 rounded border transition ${
                  currentUser.role === 'VIEWER' && currentUser.email.includes('viewer')
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300 font-bold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Viewer
              </button>
              <button
                onClick={() => onSwitchUser('attacker@trustvault.local')}
                className={`px-2 py-1 rounded border transition ${
                  currentUser.email.includes('attacker')
                    ? 'border-red-500 bg-red-500/20 text-red-300 font-bold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Attacker
              </button>
            </div>

            {/* User Info */}
            <div className="text-right">
              <div className="text-sm font-medium text-slate-200">{currentUser.name}</div>
              <div className="flex items-center justify-end space-x-1.5">
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${getRoleBadge(currentUser.role)}`}>
                  {currentUser.role}
                </span>
                <span className="text-xs text-slate-400">{currentUser.email}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
