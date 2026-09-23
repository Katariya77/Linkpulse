import React from 'react';
import { 
  Shield, 
  X, 
  TrendingUp, 
  TrendingDown, 
  History, 
  Play
} from 'lucide-react';
import { User, TrustLedgerEntry } from '../types';
import { getTrustTier } from '../utils/trustUtils';

interface TrustInspectorModalProps {
  currentUser: User;
  ledger: TrustLedgerEntry[];
  onClose: () => void;
  onSimulateScoreChange: (delta: number, reason: string, category: any) => void;
}

export const TrustInspectorModal: React.FC<TrustInspectorModalProps> = ({
  currentUser,
  ledger,
  onClose,
  onSimulateScoreChange,
}) => {
  const currentTier = getTrustTier(currentUser.trustScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="trust-inspector-modal"
        className="relative w-full max-w-2xl rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
              <Shield className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Trust Score Inspector
              </h2>
              <p className="text-xs text-zinc-400">
                Transparent reputation & anti-abuse safeguard audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Main Score Banner */}
          <div className="rounded border border-zinc-800 bg-zinc-950 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-medium text-zinc-400">
                Current Trust Score
              </span>
              <div className="flex items-baseline justify-center sm:justify-start space-x-2">
                <span className="text-4xl font-semibold text-white tabular-nums">
                  {currentUser.trustScore}
                </span>
                <span className="text-xs text-zinc-500 tabular-nums">/ 100</span>
              </div>
              <p className="text-xs text-zinc-400 max-w-sm">
                {currentTier.description}
              </p>
            </div>

            {/* Gauge */}
            <div className="w-full sm:w-56 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>0 Suspended</span>
                <span>60</span>
                <span>100 Elite</span>
              </div>
              <div className="h-2 w-full rounded bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-zinc-200 transition-all duration-300"
                  style={{ width: `${currentUser.trustScore}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span><span className="tabular-nums">{currentUser.successRate}%</span> Success</span>
                <span><span className="tabular-nums">{currentUser.lifetimeExchanges}</span> Swaps</span>
              </div>
            </div>
          </div>

          {/* Tier Matrix */}
          <div>
            <h3 className="text-xs font-medium text-zinc-400 mb-2">
              Tier Thresholds & Privileges
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5 space-y-0.5">
                <span className="text-xs font-semibold text-zinc-200 tabular-nums">95 - 100</span>
                <h4 className="text-xs font-semibold text-white">Elite</h4>
                <p className="text-[10px] text-zinc-500">10x10 enabled • Priority</p>
              </div>

              <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5 space-y-0.5">
                <span className="text-xs font-semibold text-zinc-300 tabular-nums">75 - 94</span>
                <h4 className="text-xs font-semibold text-white">Reliable</h4>
                <p className="text-[10px] text-zinc-500">Standard market access</p>
              </div>

              <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5 space-y-0.5">
                <span className="text-xs font-semibold text-zinc-400 tabular-nums">60 - 74</span>
                <h4 className="text-xs font-semibold text-white">Caution</h4>
                <p className="text-[10px] text-zinc-500">5x5 only • Restricted</p>
              </div>

              <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5 space-y-0.5">
                <span className="text-xs font-semibold text-zinc-500 tabular-nums">&lt; 40</span>
                <h4 className="text-xs font-semibold text-white">Suspended</h4>
                <p className="text-[10px] text-zinc-500">Matching locked</p>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Sandbox */}
          <div className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Play className="h-3 w-3 text-zinc-400" strokeWidth={1.5} />
                Sandbox: Test Score Events
              </span>
              <span className="text-xs text-zinc-500">Live reactivity test</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                id="test-score-plus2"
                onClick={() => onSimulateScoreChange(2, 'Simulated exchange completion', 'exchange_success')}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs hover:bg-zinc-800 transition-colors font-medium"
              >
                +2 (Complete)
              </button>
              <button
                type="button"
                id="test-score-minus10"
                onClick={() => onSimulateScoreChange(-10, 'Left active exchange early', 'session_abandon')}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs hover:bg-zinc-800 transition-colors"
              >
                -10 (Leave Exchange)
              </button>
              <button
                type="button"
                id="test-score-minus15"
                onClick={() => onSimulateScoreChange(-15, 'Simulated dispute penalty', 'dispute_penalty')}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs hover:bg-zinc-800 transition-colors"
              >
                -15 (Dispute)
              </button>
              <button
                type="button"
                id="test-score-reset"
                onClick={() => onSimulateScoreChange(100 - currentUser.trustScore, 'Reset score to base 100', 'streak_bonus')}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs hover:bg-zinc-800 transition-colors"
              >
                Reset to 100
              </button>
            </div>
          </div>

          {/* Audit Ledger History */}
          <div>
            <h3 className="text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              Score History Ledger
            </h3>
            <div className="rounded border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800/80 overflow-hidden">
              {ledger.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  No score adjustments logged yet. Clean initial baseline score: 100 PTS.
                </div>
              ) : (
                ledger.map((entry) => (
                  <div key={entry.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                        {entry.delta > 0 ? (
                          <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
                        ) : (
                          <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
                        )}
                      </div>
                      <div>
                        <p className="text-zinc-200 font-medium">{entry.reason}</p>
                        <p className="text-[10px] text-zinc-500">
                          {entry.timestamp} {entry.sessionRef && `• ${entry.sessionRef}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-semibold tabular-nums ${entry.delta > 0 ? 'text-zinc-100' : 'text-zinc-400'}`}>
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta} PTS
                      </span>
                      <p className="text-[10px] text-zinc-500 tabular-nums">Result: {entry.resultingScore}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-900 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
