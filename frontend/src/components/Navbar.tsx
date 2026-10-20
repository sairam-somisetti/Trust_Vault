import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, FileText, Share2, KeyRound, ShieldCheck, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'DOCUMENT_OWNER':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'VIEWER':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <NavLink to="/documents" className="flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:border-blue-500/60 transition shadow-lg shadow-blue-500/10">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">TrustVault</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-semibold">
                  ZERO-TRUST
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Cryptographic Document Protection
              </p>
            </div>
          </NavLink>
        </div>

        {/* Navigation Routes */}
        <nav className="hidden md:flex items-center space-x-1 p-1 bg-slate-900/60 rounded-xl border border-white/5">
          <NavLink
            to="/documents"
            className={({ isActive }) =>
              `flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Documents</span>
          </NavLink>

          <NavLink
            to="/shared-with-me"
            className={({ isActive }) =>
              `flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Shared with Me</span>
          </NavLink>

          {user.role === 'DOCUMENT_OWNER' && (
            <NavLink
              to="/access-management"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Access Management</span>
            </NavLink>
          )}

          <NavLink
            to="/security"
            className={({ isActive }) =>
              `flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-cyan-600/90 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Security Overview</span>
          </NavLink>

          {user.role === 'ADMIN' && (
            <NavLink
              to="/admin/audit"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-purple-600/90 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Admin Audit</span>
            </NavLink>
          )}
        </nav>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-xs font-medium text-slate-200">{user.name}</div>
            <div className="flex items-center justify-end space-x-1.5 mt-0.5">
              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold tracking-wider ${getRoleBadge(user.role)}`}>
                {user.role}
              </span>
              <span className="text-[11px] text-slate-400 hidden lg:inline">{user.email}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/5 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
