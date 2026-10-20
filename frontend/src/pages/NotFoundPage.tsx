import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full p-8 rounded-3xl text-center border border-white/10 shadow-2xl">
        <div className="inline-flex p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
          <HelpCircle className="h-10 w-10" />
        </div>

        <div className="text-3xl font-bold font-mono text-white mb-2">404</div>
        <h1 className="text-lg font-bold text-white mb-2">Endpoint Not Found</h1>
        <p className="text-xs text-slate-400 mb-6">
          The requested route or resource does not exist in the TrustVault system.
        </p>

        <Link
          to="/documents"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-blue-500/20"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Documents</span>
        </Link>
      </div>
    </div>
  );
};
