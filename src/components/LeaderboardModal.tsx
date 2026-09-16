import React, { useState } from 'react';
import { 
  Trophy, 
  X, 
  Flame
} from 'lucide-react';
import { User } from '../types';
import { getTrustTier } from '../utils/trustUtils';

interface LeaderboardModalProps {
  currentUser: User;
  peers: User[];
  onClose: () => void;
  onProposeExchange: (peer: User) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  currentUser,
  peers,
  onClose,
  onProposeExchange,
}) => {
  const [rankingMetric, setRankingMetric] = useState<'trust' | 'success' | 'volume'>('trust');

  const allUsers: User[] = [currentUser, ...peers];

  const sortedUsers = [...allUsers].sort((a, b) => {
    if (rankingMetric === 'trust') {
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      return b.successRate - a.successRate;
    }
    if (rankingMetric === 'success') {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return b.trustScore - a.trustScore;
    }
    return b.lifetimeExchanges - a.lifetimeExchanges;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="leaderboard-modal"
        className="relative w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
              <Trophy className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Reputation Leaderboard
              </h2>
              <p className="text-xs text-zinc-400">
                Ranked by trust score and verified exchange history
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

        {/* Tab Selector */}
        <div className="px-5 py-2 border-b border-zinc-800 flex items-center space-x-1.5 bg-zinc-950 text-xs">
          <button
            type="button"
            onClick={() => setRankingMetric('trust')}
            className={`px-2.5 py-1 rounded transition-colors ${
              rankingMetric === 'trust'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Trust (0-100)
          </button>
          <button
            type="button"
            onClick={() => setRankingMetric('success')}
            className={`px-2.5 py-1 rounded transition-colors ${
              rankingMetric === 'success'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Success Rate %
          </button>
          <button
            type="button"
            onClick={() => setRankingMetric('volume')}
            className={`px-2.5 py-1 rounded transition-colors ${
              rankingMetric === 'volume'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Lifetime Volume
          </button>
        </div>

        {/* List of Users */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/80 p-2">
          {sortedUsers.map((user, idx) => {
            const isSelf = user.id === currentUser.id;
            const trustInfo = getTrustTier(user.trustScore);

            return (
              <div
                key={user.id}
                className={`p-3 rounded-md flex items-center justify-between transition-colors ${
                  isSelf ? 'bg-zinc-800/60 border border-zinc-700' : 'hover:bg-zinc-950/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 text-center font-medium text-xs text-zinc-500 tabular-nums">
                    #{idx + 1}
                  </div>

                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="h-8 w-8 rounded-md object-cover border border-zinc-800 grayscale"
                  />

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">
                        {user.username} {isSelf && <span className="text-zinc-400 text-[10px]">(You)</span>}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border ${trustInfo.badgeClass}`}>
                        {trustInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
                      <span className="text-zinc-200">Trust: <span className="tabular-nums font-medium">{user.trustScore}</span></span>
                      <span className="text-zinc-700">•</span>
                      <span><span className="tabular-nums">{user.successRate}%</span> Success</span>
                      <span className="text-zinc-700">•</span>
                      <span><span className="tabular-nums">{user.lifetimeExchanges}</span> Swaps</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  {user.activeStreak > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-zinc-400">
                      <Flame className="h-3 w-3 text-zinc-500" strokeWidth={1.5} />
                      <span className="tabular-nums">{user.activeStreak}d</span>
                    </div>
                  )}

                  {!isSelf && user.trustScore >= 40 && user.onlineStatus === 'online' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onProposeExchange(user);
                      }}
                      className="rounded bg-white hover:bg-zinc-200 text-zinc-950 px-2.5 py-1 text-xs font-semibold transition-colors"
                    >
                      Exchange
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-900 px-5 py-3 flex justify-between items-center text-xs text-zinc-500">
          <span>Real-time reputation ranking</span>
          <button
            onClick={onClose}
            className="rounded bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
