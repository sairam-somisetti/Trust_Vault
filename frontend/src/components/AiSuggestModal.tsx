import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { AiSuggestion } from '../types.js';

interface AiSuggestModalProps {
  documentId: string;
  documentName: string;
  isOpen: boolean;
  onClose: () => void;
  onGrantAdded: () => void;
}

export const AiSuggestModal: React.FC<AiSuggestModalProps> = ({
  documentId,
  documentName,
  isOpen,
  onClose,
  onGrantAdded,
}) => {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvedEmails, setApprovedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, documentId]);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    setApprovedEmails(new Set());

    try {
      const res = await api.suggestAccess(documentId);
      setSuggestions(res.suggestions);
      setCategory(res.category);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (suggestion: AiSuggestion) => {
    try {
      await api.approveAiRecommendation(documentId, {
        userEmail: suggestion.userEmail,
        permission: suggestion.suggestedPermission,
        aiReason: suggestion.reason,
      });

      setApprovedEmails((prev) => new Set(prev).add(suggestion.userEmail));
      onGrantAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to approve AI suggestion');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Document Access Advisor</h3>
            <p className="text-xs text-slate-400">Intelligent policy-aware permission recommendations</p>
          </div>
        </div>

        {/* Security Rule Guardrail Badge */}
        <div className="mb-4 p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl text-xs text-purple-300 flex items-start space-x-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
          <div>
            <span className="font-semibold">Security Guardrail Active: </span>
            <span>
              The machine is strictly advisory and cannot widen access on its own.
              You must inspect and click "Approve" for each grant. Both the recommendation and your approval are etched into the cryptographic audit trail.
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-1">
            Document: <span className="text-white font-mono">{documentName}</span> (Category: <span className="text-blue-400">{category}</span>)
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Analyzing document classification & company directory...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
              No additional recipients recommended. All relevant users already possess grants.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {suggestions.map((s) => {
                const isApproved = approvedEmails.has(s.userEmail);
                return (
                  <div
                    key={s.userId}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="max-w-[70%]">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-medium text-white">{s.userName}</span>
                        <span className="text-slate-400 truncate">({s.userEmail})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{s.reason}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] text-purple-300 font-mono">
                          Confidence: {(s.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-900/40 text-blue-300 border border-blue-800">
                          Suggested: {s.suggestedPermission}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isApproved ? (
                        <div className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold px-3 py-1.5 bg-emerald-950/40 border border-emerald-800 rounded-lg">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approved</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApprove(s)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-xs transition flex items-center space-x-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
