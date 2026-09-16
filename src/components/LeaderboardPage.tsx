import React, { useState } from 'react';
import { 
  Trophy, 
  Flame, 
  Search, 
  ShieldCheck, 
  ArrowLeft,
  CheckCircle2,
  Users
} from 'lucide-react';
import { User } from '../types';
import { getTrustTier } from '../utils/trustUtils';

interface LeaderboardPageProps {
  currentUser: User;
  peers: User[];
  onProposeExchange: (peer: User) => void;
  onBackToPool: () => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  currentUser,
  peers,
  onProposeExchange,
  onBackToPool,
}) => {
  const [rankingMetric, setRankingMetric] = useState<'trust' | 'success' | 'volume' | 'streak'>('trust');
  const [searchQuery, setSearchQuery] = useState('');

  const allUsers: User[] = [currentUser, ...peers];

  const filteredUsers = allUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.countryCode.toLowerCase().includes(q)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (rankingMetric === 'trust') {
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      return b.successRate - a.successRate;
    }
    if (rankingMetric === 'success') {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return b.trustScore - a.trustScore;
    }
    if (rankingMetric === 'streak') {
      if (b.activeStreak !== a.activeStreak) return b.activeStreak - a.activeStreak;
      return b.trustScore - a.trustScore;
    }
    return b.lifetimeExchanges - a.lifetimeExchanges;
  });

  // Calculate user standing
  const globalSortedByTrust = [...allUsers].sort((a, b) => b.trustScore - a.trustScore);
  const userRank = globalSortedByTrust.findIndex(u => u.id === currentUser.id) + 1;
  const topUser = globalSortedByTrust[0] || currentUser;
  const avgTrust = allUsers.length > 0 ? Math.round(allUsers.reduce((sum, u) => sum + u.trustScore, 0) / allUsers.length) : 100;
  const totalSwaps = allUsers.reduce((sum, u) => sum + u.lifetimeExchanges, 0);
  const avgVerifiedRate = allUsers.length > 0 ? (allUsers.reduce((sum, u) => sum + u.successRate, 0) / allUsers.length).toFixed(1) : '100';

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200">
              <Trophy className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                Reputation Leaderboard
              </h1>
              <p className="text-xs text-zinc-400">
                Live community rankings of verified link exchange members
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBackToPool}
            className="flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Discovery Pool</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Your Standing */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Your Standing</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
              Rank #{userRank}
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold text-white tabular-nums">
              Rank #{userRank}
            </span>
            <span className="text-xs text-zinc-500">of {allUsers.length} active</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-zinc-400 pt-1">
            <span>Score: <strong className="text-zinc-200 tabular-nums">{currentUser.trustScore}</strong></span>
            <span>•</span>
            <span>{currentUser.successRate}% Success</span>
            <span>•</span>
            <span>{currentUser.activeStreak}d Streak</span>
          </div>
        </div>

        {/* Top Node */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Top Ranked Member</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded border border-emerald-900/40 bg-emerald-950/40 text-emerald-400">
              Rank #1
            </span>
          </div>
          <div className="flex items-center space-x-2.5">
            <img
              src={topUser.avatar}
              alt={topUser.username}
              className="h-7 w-7 rounded-md object-cover border border-zinc-800 grayscale"
            />
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>{topUser.username}</span>
                <span className="text-[10px] text-zinc-500">({topUser.countryCode})</span>
              </div>
              <div className="text-xs text-zinc-400 tabular-nums">
                Trust {topUser.trustScore} • {topUser.lifetimeExchanges} Swaps
              </div>
            </div>
          </div>
        </div>

        {/* Network Metrics */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Community Stats</span>
            <Users className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold text-white tabular-nums">
              {avgTrust} PTS
            </span>
            <span className="text-xs text-zinc-500">Avg Network Trust</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-zinc-400 pt-1">
            <span><strong className="text-zinc-200 tabular-nums">{totalSwaps}</strong> Total Swaps</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {avgVerifiedRate}% Verified Rate
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Metric Selector & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
        {/* Metric Selector Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs scrollbar-none pb-1 sm:pb-0">
          <button
            type="button"
            id="metric-trust-btn"
            onClick={() => setRankingMetric('trust')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap font-medium ${
              rankingMetric === 'trust'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Trust Score
          </button>
          <button
            type="button"
            id="metric-success-btn"
            onClick={() => setRankingMetric('success')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap font-medium ${
              rankingMetric === 'success'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Success %
          </button>
          <button
            type="button"
            id="metric-volume-btn"
            onClick={() => setRankingMetric('volume')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap font-medium ${
              rankingMetric === 'volume'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Lifetime Swaps
          </button>
          <button
            type="button"
            id="metric-streak-btn"
            onClick={() => setRankingMetric('streak')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap font-medium ${
              rankingMetric === 'streak'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Active Streak
          </button>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member or country..."
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Full-Screen Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 font-medium">
                <th className="py-3 px-2 sm:px-4 w-12 sm:w-16 text-center">Rank</th>
                <th className="py-3 px-2.5 sm:px-4">Member / Username</th>
                <th className="hidden sm:table-cell py-3 px-3 sm:px-4">Country</th>
                <th className="hidden md:table-cell py-3 px-3 sm:px-4">Trust Tier</th>
                <th className="py-3 px-2.5 sm:px-4">Trust Score</th>
                <th className="hidden sm:table-cell py-3 px-3 sm:px-4">Success Rate</th>
                <th className="hidden lg:table-cell py-3 px-3 sm:px-4">Swaps</th>
                <th className="hidden md:table-cell py-3 px-3 sm:px-4">Streak</th>
                <th className="py-3 px-2.5 sm:px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {sortedUsers.map((user, idx) => {
                const isSelf = user.id === currentUser.id;
                const trustInfo = getTrustTier(user.trustScore);
                const rankNum = idx + 1;

                return (
                  <tr
                    key={user.id}
                    className={`transition-colors ${
                      isSelf 
                        ? 'bg-zinc-800/40 font-medium' 
                        : 'hover:bg-zinc-900/60'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-2 sm:px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs tabular-nums ${
                        rankNum === 1
                          ? 'bg-zinc-100 text-zinc-950 font-bold'
                          : rankNum === 2
                          ? 'bg-zinc-700 text-zinc-100 font-semibold'
                          : rankNum === 3
                          ? 'bg-zinc-800 text-zinc-300 font-semibold'
                          : 'text-zinc-500'
                      }`}>
                        #{rankNum}
                      </span>
                    </td>

                    {/* Node / Username */}
                    <td className="py-3.5 px-2.5 sm:px-4">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="h-8 w-8 rounded-md object-cover border border-zinc-800 grayscale"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-zinc-950 ${
                              user.onlineStatus === 'online'
                                ? 'bg-emerald-500'
                                : user.onlineStatus === 'in_session'
                                ? 'bg-amber-500'
                                : 'bg-zinc-600'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1 sm:space-x-1.5">
                            <span className="text-white font-semibold">
                              {user.username}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] text-zinc-400 font-normal">(You)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                            <span>{user.onlineStatus === 'online' ? 'Available' : user.onlineStatus}</span>
                            <span className="sm:hidden text-zinc-400 font-medium">({user.countryCode})</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Country */}
                    <td className="hidden sm:table-cell py-3.5 px-3 sm:px-4 text-zinc-300 font-medium">
                      {user.countryCode}
                    </td>

                    {/* Trust Tier */}
                    <td className="hidden md:table-cell py-3.5 px-3 sm:px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${trustInfo.badgeClass}`}>
                        {trustInfo.label}
                      </span>
                    </td>

                    {/* Trust Score */}
                    <td className="py-3.5 px-2.5 sm:px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold tabular-nums">
                          {user.trustScore}
                        </span>
                        <div className="hidden min-[480px]:block w-12 sm:w-16 h-1.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-zinc-200 transition-all"
                            style={{ width: `${user.trustScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Success Rate */}
                    <td className="hidden sm:table-cell py-3.5 px-3 sm:px-4">
                      <span className="text-zinc-200 tabular-nums">
                        {user.successRate}%
                      </span>
                    </td>

                    {/* Swaps */}
                    <td className="hidden lg:table-cell py-3.5 px-3 sm:px-4 text-zinc-300 tabular-nums">
                      {user.lifetimeExchanges}
                    </td>

                    {/* Streak */}
                    <td className="hidden md:table-cell py-3.5 px-3 sm:px-4">
                      {user.activeStreak > 0 ? (
                        <div className="flex items-center space-x-1 text-zinc-300">
                          <Flame className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                          <span className="tabular-nums font-medium">{user.activeStreak}d</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-2.5 sm:px-4 text-right">
                      {!isSelf && user.trustScore >= 40 && user.onlineStatus === 'online' ? (
                        <button
                          type="button"
                          id={`leaderboard-exchange-btn-${user.id}`}
                          onClick={() => onProposeExchange(user)}
                          className="rounded bg-white hover:bg-zinc-200 text-zinc-950 px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors"
                        >
                          Exchange
                        </button>
                      ) : isSelf ? (
                        <span className="text-xs text-zinc-500 font-medium">You</span>
                      ) : (
                        <span className="text-xs text-zinc-600">Unavailable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800 gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
          Rankings are updated continuously after every verified exchange session.
        </span>
        <span>Displaying {sortedUsers.length} members</span>
      </div>

    </div>
  );
};
