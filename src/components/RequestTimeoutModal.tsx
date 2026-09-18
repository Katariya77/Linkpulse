import React from 'react';
import { Clock, X, AlertTriangle } from 'lucide-react';
import { User } from '../types';

interface RequestTimeoutModalProps {
  partner: User | null;
  onClose: () => void;
}

export const RequestTimeoutModal: React.FC<RequestTimeoutModalProps> = ({
  partner,
  onClose,
}) => {
  if (!partner) return null;

  return (
    <div 
      id="request-timeout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div 
        id="request-timeout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timeout-modal-title"
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl transition-all"
      >
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="h-5 w-5" strokeWidth={2} />
          </div>
          <button
            type="button"
            id="close-timeout-modal-icon-btn"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
              Request Expired (30s Limit)
            </span>
          </div>

          <h3 
            id="timeout-modal-title" 
            className="mt-2 text-base font-semibold text-white tracking-tight"
          >
            Exchange Request Timed Out
          </h3>

          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Your 1-on-1 link exchange invitation to <span className="text-zinc-200 font-medium">@{partner.username}</span> exceeded the 30-second response window without being accepted.
          </p>

          {/* Partner Preview Chip */}
          <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3">
            <div className="flex items-center space-x-3">
              <img
                src={partner.avatar}
                alt={partner.username}
                className="h-9 w-9 rounded-md object-cover border border-zinc-700/80"
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  @{partner.username}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {partner.country} • {partner.preferredShorteners?.[0] || 'shrinkme.io'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-zinc-200 tabular-nums">
                {partner.trustScore}/100
              </div>
              <div className="text-[10px] text-zinc-400">
                Trust Score
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-zinc-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-zinc-400 shrink-0" />
            <span>The partner may be away from keyboard or in another session. No trust penalties were applied.</span>
          </p>
        </div>

        {/* Action button */}
        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            id="timeout-modal-okay-btn"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-white px-6 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};
