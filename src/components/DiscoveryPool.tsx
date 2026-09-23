import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  Clock, 
  Star, 
  Flame, 
  ShieldAlert, 
  Zap, 
  ArrowRight,
  Check,
  X,
  Lock,
  Globe
} from 'lucide-react';
import { User, IPCooldownRecord, ExchangeProposal } from '../types';
import { getTrustTier, formatTimeRemaining } from '../utils/trustUtils';

interface DiscoveryPoolProps {
  currentUser: User;
  peers: User[];
  ipCooldowns?: IPCooldownRecord[];
  incomingProposal: ExchangeProposal | null;
  onProposeExchange: (peer: User) => void;
  onAcceptProposal: (proposal: ExchangeProposal) => void;
  onDeclineProposal: () => void;
  onSimulateIncomingProposal: () => void;
  onToggleFavorite: (peerId: string) => void;
  onOpenTrustInspector: () => void;
}

export const DiscoveryPool: React.FC<DiscoveryPoolProps> = ({
  currentUser,
  peers = [],
  ipCooldowns = [],
  incomingProposal,
  onProposeExchange,
  onAcceptProposal,
  onDeclineProposal,
  onSimulateIncomingProposal,
  onToggleFavorite,
  onOpenTrustInspector,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'high_trust' | 'available' | 'favorites'>('all');
  const [incomingSecondsLeft, setIncomingSecondsLeft] = useState<number>(30);

  // 30-second acceptance countdown for incoming request card on top
  React.useEffect(() => {
    if (!incomingProposal) {
      setIncomingSecondsLeft(30);
      return;
    }
    setIncomingSecondsLeft(30);
    const interval = setInterval(() => {
      setIncomingSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDeclineProposal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingProposal?.id]);

  const safeCooldowns = Array.isArray(ipCooldowns) ? ipCooldowns : [];
  const safePeers = Array.isArray(peers) ? peers : [];

  const getPeerCooldown = (peerId: string) => {
    const record = safeCooldowns.find(c => c.partnerId === peerId);
    if (!record) return null;
    const remainingMs = new Date(record.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) return null;
    return {
      record,
      remainingFormatted: formatTimeRemaining(remainingMs),
    };
  };

  const filteredPeers = safePeers.filter(peer => {
    const matchesSearch = 
      peer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      peer.preferredShorteners.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      peer.country.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'high_trust') return peer.trustScore >= 90;
    if (activeFilter === 'favorites') return peer.isFavorite;
    if (activeFilter === 'available') {
      const cooldown = getPeerCooldown(peer.id);
      return !cooldown && peer.onlineStatus === 'online' && peer.trustScore >= 40;
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Incoming Exchange Proposal Alert Banner / Card on Top */}
      {incomingProposal && (
        <div 
          id="incoming-proposal-banner"
          className="rounded-xl border border-emerald-500/40 bg-zinc-950 p-4 sm:p-5 shadow-2xl transition-all relative overflow-hidden"
        >
          {/* Accent top line and subtle glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className="relative">
                <img
                  src={incomingProposal.sender.avatar}
                  alt={incomingProposal.sender.username}
                  className="h-12 w-12 rounded-lg object-cover border border-emerald-500/50 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center space-x-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                    Incoming Exchange Request
                  </span>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-200 border border-zinc-700">
                    {incomingProposal.packageType} Swap
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {incomingProposal.dwellTime}s verification
                  </span>
                  <span className="inline-flex items-center text-[11px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                    Trust: {incomingProposal.sender.trustScore}/100
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                  @{incomingProposal.sender.username} wants to exchange shortlinks with you
                </h3>

                {incomingProposal.note ? (
                  <p className="text-xs text-zinc-400 mt-0.5 italic">
                    "{incomingProposal.note}"
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Ready for 1-on-1 dwell verification. Both users enter the synchronized exchange room upon accepting.
                  </p>
                )}
              </div>
            </div>

            {/* Countdown & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
              {/* 30-second live countdown */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center px-2 py-1 bg-zinc-900/60 rounded-md border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 font-medium">Acceptance Window</span>
                <span className="text-xs font-bold text-amber-400 tabular-nums">
                  {incomingSecondsLeft}s remaining
                </span>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="decline-proposal-btn"
                  onClick={onDeclineProposal}
                  className="flex-1 sm:flex-initial rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer text-center"
                >
                  Decline
                </button>
                <button
                  type="button"
                  id="accept-proposal-btn"
                  onClick={() => onAcceptProposal(incomingProposal)}
                  className="flex-1 sm:flex-initial rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span>Accept & Join Room</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Overview Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Active Members</span>
            <Users className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-xl font-semibold text-white tabular-nums">
              {safePeers.length}
            </span>
            <span className="text-xs text-zinc-400">members online</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Completion Rate</span>
            <Shield className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-xl font-semibold text-white tabular-nums">
              {currentUser.lifetimeExchanges > 0 ? `${currentUser.successRate}%` : '100%'}
            </span>
            <span className="text-xs text-zinc-400">
              {currentUser.lifetimeExchanges > 0 ? `${currentUser.lifetimeExchanges} completed` : 'verified'}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Fair Play Protection</span>
            <Clock className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-xl font-semibold text-zinc-200">Active</span>
            <span className="text-xs text-zinc-400">anti-spam guard</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Your Trust Rating</span>
            <button
              onClick={onOpenTrustInspector}
              className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
            >
              View breakdown
            </button>
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-xl font-semibold text-white tabular-nums">{currentUser.trustScore}</span>
            <span className="text-xs text-zinc-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Main Discovery Pool Interface */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        
        {/* Controls Bar */}
        <div className="p-4 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Community Member Pool
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select an active member to propose a 1-on-1 link exchange
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              id="instant-match-broadcast-btn"
              onClick={onSimulateIncomingProposal}
              className="flex items-center justify-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors cursor-pointer"
              title="Find an available exchange partner instantly"
            >
              <Zap className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              <span>Quick Partner Match</span>
            </button>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
              <input
                type="text"
                id="search-peers-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search members by name, link network..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="px-4 py-2 border-b border-zinc-800/60 flex items-center space-x-1.5 overflow-x-auto text-xs bg-zinc-950/40">
          <button
            id="filter-all"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Members ({peers.length})
          </button>
          <button
            id="filter-high-trust"
            onClick={() => setActiveFilter('high_trust')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              activeFilter === 'high_trust'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Top Rated (90+)
          </button>
          <button
            id="filter-available"
            onClick={() => setActiveFilter('available')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              activeFilter === 'available'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Available Now
          </button>
          <button
            id="filter-favorites"
            onClick={() => setActiveFilter('favorites')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              activeFilter === 'favorites'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Favorites
          </button>
        </div>

        {/* Member Table List */}
        <div className="divide-y divide-zinc-800/60">
          {safePeers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Users className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-white">No other members online yet</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You are currently the only member active in LinkPulse right now. When another member signs in or joins, their profile will appear here automatically for 1-on-1 link exchanges.
                </p>
              </div>
            </div>
          ) : filteredPeers.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No members found matching your search or filter.
            </div>
          ) : (
            filteredPeers.map((peer) => {
              const peerTrust = getTrustTier(peer.trustScore);
              const cooldown = getPeerCooldown(peer.id);
              const isSuspended = peer.trustScore < 40;
              const isInSession = peer.onlineStatus === 'in_session';

              return (
                <div
                  key={peer.id}
                  id={`peer-row-${peer.id}`}
                  className="p-4 hover:bg-zinc-900/40 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  {/* Left: User Details */}
                  <div className="flex items-start space-x-3">
                    <div className="relative shrink-0">
                      <img
                        src={peer.avatar}
                        alt={peer.username}
                        className="h-10 w-10 rounded-md object-cover border border-zinc-800 grayscale"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${
                          peer.onlineStatus === 'online'
                            ? 'bg-zinc-200'
                            : 'bg-zinc-600'
                        }`}
                        title={peer.onlineStatus === 'online' ? 'Online' : 'Away'}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onToggleFavorite(peer.id)}
                          className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer"
                          title={peer.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star 
                            className={`h-3.5 w-3.5 ${peer.isFavorite ? 'fill-zinc-300 text-zinc-300' : ''}`} 
                            strokeWidth={1.5}
                          />
                        </button>
                        <span className="text-xs font-semibold text-white">
                          {peer.username}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {peer.countryCode}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border ${peerTrust.badgeClass}`}>
                          {peerTrust.label}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="text-zinc-300">
                          Trust: <span className="tabular-nums font-medium">{peer.trustScore}</span>
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span><span className="tabular-nums">{peer.successRate}%</span> Completion</span>
                        <span className="text-zinc-600">•</span>
                        <span><span className="tabular-nums">{peer.lifetimeExchanges}</span> Exchanges</span>
                        {peer.activeStreak > 0 && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-300 flex items-center gap-0.5">
                              <Flame className="h-3 w-3 text-zinc-400" strokeWidth={1.5} /> {peer.activeStreak}d streak
                            </span>
                          </>
                        )}
                      </div>

                      {/* Networks */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {peer.preferredShorteners.map((s, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-800"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/40">
                    {cooldown ? (
                      <div className="flex items-center space-x-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-400">
                        <Clock className="h-3 w-3 text-zinc-500" strokeWidth={1.5} />
                        <span>Daily Cooldown ({cooldown.remainingFormatted})</span>
                      </div>
                    ) : isSuspended ? (
                      <div className="flex items-center space-x-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-500">
                        <ShieldAlert className="h-3 w-3 text-zinc-500" strokeWidth={1.5} />
                        <span>Suspended</span>
                      </div>
                    ) : isInSession ? (
                      <div className="flex items-center space-x-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                        <span>In Exchange</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-500 sm:hidden">Available for exchange</span>
                    )}

                    <button
                      type="button"
                      id={`propose-btn-${peer.id}`}
                      disabled={!!cooldown || isSuspended || isInSession}
                      onClick={() => onProposeExchange(peer)}
                      className={`rounded-md px-4 py-2 sm:py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        cooldown || isSuspended || isInSession
                          ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                          : 'bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer shadow-sm'
                      }`}
                    >
                      <span>Start</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
