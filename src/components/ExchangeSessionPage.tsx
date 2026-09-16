import React, { useState } from 'react';
import { 
  Radio, 
  Send, 
  Layers, 
  AlertCircle, 
  ArrowLeft,
  Users,
  KeyRound,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { ExchangeSession, User, PackageType } from '../types';
import { ExchangeRoom } from './ExchangeRoom';
import { getTrustTier } from '../utils/trustUtils';

interface ExchangeSessionPageProps {
  session: ExchangeSession | null;
  currentUser: User;
  peers: User[];
  proposePartner: User | null;
  isCooldownActive: boolean;
  cooldownRemainingFormatted?: string;
  onSelectPartnerForProposal: (partner: User | null) => void;
  onSubmitProposal: (packageType: PackageType, dwellTime: number, links: string[], note?: string) => void;
  onUpdateSession: (updated: ExchangeSession) => void;
  onCompleteSession: (rating: { stars: number; tags: string[]; feedback: string }) => void;
  onAbandonSession: () => void;
  onOpenDispute: () => void;
  onBackToPool: () => void;
  onJoinRoomByCode?: (code: string) => void;
}

export const ExchangeSessionPage: React.FC<ExchangeSessionPageProps> = ({
  session,
  currentUser,
  peers,
  proposePartner,
  isCooldownActive,
  cooldownRemainingFormatted,
  onSelectPartnerForProposal,
  onSubmitProposal,
  onUpdateSession,
  onCompleteSession,
  onAbandonSession,
  onOpenDispute,
  onBackToPool,
  onJoinRoomByCode,
}) => {
  // If an active session is in progress, render the full-screen Exchange Room
  if (session) {
    return (
      <div className="w-full">
        <ExchangeRoom
          session={session}
          currentUser={currentUser}
          onUpdateSession={onUpdateSession}
          onCompleteSession={onCompleteSession}
          onAbandonSession={onAbandonSession}
          onOpenDispute={onOpenDispute}
          onCloseRoom={onBackToPool}
        />
      </div>
    );
  }

  // If user selected a partner to configure/propose an exchange session
  if (proposePartner) {
    return (
      <ExchangeProposalView
        partner={proposePartner}
        currentUser={currentUser}
        isCooldownActive={isCooldownActive}
        cooldownRemainingFormatted={cooldownRemainingFormatted}
        onCancel={() => onSelectPartnerForProposal(null)}
        onSubmitProposal={onSubmitProposal}
      />
    );
  }

  // Otherwise, render the full-screen Exchange Session Hub
  return (
    <ExchangeSessionHub
      currentUser={currentUser}
      peers={peers}
      onSelectPartner={onSelectPartnerForProposal}
      onBackToPool={onBackToPool}
      onJoinRoomByCode={onJoinRoomByCode}
    />
  );
};

/* ========================================================================= */
/* Subcomponent: Full-Screen Exchange Proposal View                          */
/* ========================================================================= */

interface ExchangeProposalViewProps {
  partner: User;
  currentUser: User;
  isCooldownActive: boolean;
  cooldownRemainingFormatted?: string;
  onCancel: () => void;
  onSubmitProposal: (packageType: PackageType, dwellTime: number, links: string[], note?: string) => void;
}

const ExchangeProposalView: React.FC<ExchangeProposalViewProps> = ({
  partner,
  currentUser,
  isCooldownActive,
  cooldownRemainingFormatted,
  onCancel,
  onSubmitProposal,
}) => {
  const [packageType, setPackageType] = useState<PackageType>('5x5');
  const [dwellTime, setDwellTime] = useState<number>(30);
  const [links, setLinks] = useState<string[]>(Array(5).fill(''));
  const [note, setNote] = useState<string>('Ready for synchronized exchange. Verified clean shortener links.');

  const partnerTrust = getTrustTier(partner.trustScore);
  const is10x10Allowed = currentUser.trustScore >= 75 && partner.trustScore >= 75;

  const handlePackageChange = (type: PackageType) => {
    if (type === '10x10' && !is10x10Allowed) return;
    setPackageType(type);
    if (type === '5x5') {
      setLinks(Array(5).fill(''));
    } else {
      setLinks(Array(10).fill(''));
    }
  };

  const handleUpdateLink = (index: number, val: string) => {
    const updated = [...links];
    updated[index] = val;
    setLinks(updated);
  };

  const targetCount = packageType === '5x5' ? 5 : 10;
  const isReady = links.filter(l => l.trim().length > 0).length === targetCount && !isCooldownActive;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200">
            <Layers className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">
              Configure Exchange Session
            </h1>
            <p className="text-xs text-zinc-400">
              1-on-1 link exchange with @{partner.username}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Back to Pool</span>
        </button>
      </div>

      {/* IP Cooldown Alert if active */}
      {isCooldownActive && (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 flex items-start space-x-3 text-xs">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h4 className="font-semibold text-amber-200 text-sm">24-Hour Exchange Cooldown Active</h4>
            <p className="text-zinc-300 mt-1 leading-relaxed">
              Exchanges between your IP and {partner.username}&apos;s IP are limited to once every 24 hours to ensure high quality and protect shortener stats.
            </p>
            <div className="mt-2 text-zinc-200 font-medium">
              Time Remaining: <span className="tabular-nums font-mono text-amber-300">{cooldownRemainingFormatted || 'Active'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Columns: Package & URLs */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Partner Info Card */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={partner.avatar}
                alt={partner.username}
                className="h-10 w-10 rounded-md object-cover border border-zinc-800 grayscale"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-white">{partner.username}</span>
                  <span className="text-xs text-zinc-500">({partner.countryCode})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${partnerTrust.badgeClass}`}>
                    {partnerTrust.label}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
                  <span>Trust Score: <strong className="text-zinc-200 font-medium tabular-nums">{partner.trustScore}/100</strong></span>
                  <span>•</span>
                  <span><span className="tabular-nums">{partner.successRate}%</span> Success Rate</span>
                  <span>•</span>
                  <span><span className="tabular-nums">{partner.lifetimeExchanges}</span> Swaps</span>
                </div>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                IP Clean
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {partner.ipAddress}
              </span>
            </div>
          </div>

          {/* Package Volume Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 block">
              Exchange Volume Package
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="setup-package-5x5"
                onClick={() => handlePackageChange('5x5')}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  packageType === '5x5'
                    ? 'border-zinc-400 bg-zinc-800 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">5x5 Package</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-medium text-zinc-300">
                    Standard
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  5 links each • ~3 minutes estimated duration
                </p>
              </button>

              <button
                type="button"
                id="setup-package-10x10"
                disabled={!is10x10Allowed}
                onClick={() => handlePackageChange('10x10')}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  !is10x10Allowed
                    ? 'opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-950'
                    : packageType === '10x10'
                    ? 'border-zinc-400 bg-zinc-800 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">10x10 Package</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-medium text-zinc-300">
                    Tier 75+ Required
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  10 links each • ~6 minutes estimated duration
                </p>
              </button>
            </div>
          </div>

          {/* Retention Dwell Time */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 block">
              Retention Dwell Time (Per Link)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="setup-dwell-30"
                onClick={() => setDwellTime(30)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  dwellTime === 30
                    ? 'border-zinc-400 bg-zinc-800 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-semibold block mb-0.5">30 Seconds Minimum Dwell</span>
                <span className="text-xs text-zinc-400">Standard retention compliance</span>
              </button>

              <button
                type="button"
                id="setup-dwell-45"
                onClick={() => setDwellTime(45)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  dwellTime === 45
                    ? 'border-zinc-400 bg-zinc-800 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-semibold block mb-0.5">45 Seconds High-Retention</span>
                <span className="text-xs text-zinc-400">Maximizes ad network payout tiers</span>
              </button>
            </div>
          </div>

          {/* Shortened URLs Form */}
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <span>Destination URLs</span>
                <span className="text-xs text-zinc-400 font-normal">
                  ({links.filter(l => l.trim().length > 0).length} of {targetCount} entered)
                </span>
              </label>
              <button
                type="button"
                onClick={() => setLinks(Array(targetCount).fill(''))}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear Inputs</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Enter your legitimate monetized shortlinks (ShrinkMe, ShrinkEarn, Ouom, etc.). They will be verified step-by-step by @{partner.username}.
            </p>

            <div className="space-y-2 pt-2">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="h-7 w-7 shrink-0 flex items-center justify-center rounded bg-zinc-950 text-xs font-semibold text-zinc-400 border border-zinc-800 tabular-nums">
                    #{idx + 1}
                  </span>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleUpdateLink(idx, e.target.value)}
                    placeholder="https://shrinkme.io/..."
                    className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 block">
              Message / Note for Partner (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Instant verification ready"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
          </div>

        </div>

        {/* Right 1 Column: Summary & Launch Action */}
        <div className="space-y-4">
          
          {/* Summary Box */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white">
              Session Checklist
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">Partner:</span>
                <span className="text-zinc-200 font-medium">@{partner.username}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">Volume:</span>
                <span className="text-zinc-200 font-medium">{packageType} ({targetCount} links each)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">Dwell Requirement:</span>
                <span className="text-zinc-200 font-medium">{dwellTime} seconds</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">Cooldown Guard:</span>
                <span className="text-zinc-200 font-medium">24 Hours Applied on finish</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Completion Reward:</span>
                <span className="text-emerald-400 font-medium">+2 Trust PTS</span>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                id="launch-exchange-session-btn"
                disabled={!isReady}
                onClick={() => onSubmitProposal(packageType, dwellTime, links, note)}
                className={`w-full flex items-center justify-center space-x-2 rounded-md py-2.5 text-xs font-semibold transition-colors ${
                  isReady
                    ? 'bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                }`}
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Launch Exchange Room</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200 py-1.5 transition-colors"
              >
                Cancel & Return
              </button>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950 p-4 space-y-2 text-xs text-zinc-400">
            <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              Bilateral Verification Guard
            </h4>
            <p className="leading-relaxed">
              Both parties must verify 100% of URLs and abide by dwell timers before completion unlocks. Abandoning an active room penalizes Trust Score by -10 PTS.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

/* ========================================================================= */
/* Subcomponent: Full-Screen Exchange Session Hub (when idle)                */
/* ========================================================================= */

interface ExchangeSessionHubProps {
  currentUser: User;
  peers: User[];
  onSelectPartner: (partner: User) => void;
  onBackToPool: () => void;
  onJoinRoomByCode?: (code: string) => void;
}

const ExchangeSessionHub: React.FC<ExchangeSessionHubProps> = ({
  currentUser,
  peers,
  onSelectPartner,
  onBackToPool,
  onJoinRoomByCode,
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const eligiblePeers = peers.filter(p => p.onlineStatus === 'online' && p.trustScore >= 40);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCodeInput.trim().toUpperCase();
    if (!clean) {
      setCodeError('Please enter a 6-character room code.');
      return;
    }
    if (onJoinRoomByCode) {
      onJoinRoomByCode(clean);
    } else if (eligiblePeers.length > 0) {
      // Connect with top peer as demonstration
      onSelectPartner(eligiblePeers[0]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200">
            <Radio className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">
              Exchange Session Engine
            </h1>
            <p className="text-xs text-zinc-400">
              Synchronized 1-on-1 link verification rooms with retention isolation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToPool}
          className="flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors self-start md:self-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Browse Discovery Pool</span>
        </button>
      </div>

      {/* Main Grid: Status Banner & Join Room */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left 2 Cols: Session Status & Quick Match */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Idle Status Banner */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 space-y-3">
            <div className="inline-flex items-center space-x-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              <span>No Active Session Room</span>
            </div>
            
            <h2 className="text-lg font-semibold text-white">
              Ready for Instant Traffic Exchange
            </h2>
            
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              Exchange rooms let you trade shortlinks 1-on-1 and verify clicks together in real time. Choose an online member below or enter an invite code to begin.
            </p>
          </div>

          {/* Quick Match with Online Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-zinc-400" />
                <span>Online Members Ready to Exchange ({eligiblePeers.length})</span>
              </h3>
              <span className="text-[11px] text-zinc-500">Verified IP clean</span>
            </div>

            {eligiblePeers.length === 0 ? (
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/20 p-6 text-center text-xs text-zinc-400 space-y-1">
                <p className="text-zinc-300 font-medium">No other members online right now</p>
                <p className="text-zinc-500">
                  You are the first active user online. Share LinkPulse with a friend or test with another account to start a live exchange room.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eligiblePeers.slice(0, 4).map((peer) => {
                  const tier = getTrustTier(peer.trustScore);
                  return (
                    <div
                      key={peer.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3.5 flex items-center justify-between hover:border-zinc-700 transition-colors"
                    >
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={peer.avatar}
                        alt={peer.username}
                        className="h-9 w-9 rounded-md object-cover border border-zinc-800 grayscale"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-semibold text-white">{peer.username}</span>
                          <span className="text-[10px] text-zinc-500">({peer.countryCode})</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-0.5">
                          <span className={`text-[9px] px-1 py-0.1 rounded border ${tier.badgeClass}`}>
                            {tier.label}
                          </span>
                          <span className="tabular-nums">Trust {peer.trustScore}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      id={`quick-exchange-btn-${peer.id}`}
                      onClick={() => onSelectPartner(peer)}
                      className="rounded bg-white hover:bg-zinc-200 text-zinc-950 px-3 py-1.5 text-xs font-semibold transition-colors"
                    >
                      Start
                    </button>
                  </div>
                );
              })}
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Col: Join by Room Code & Protocol Info */}
        <div className="space-y-4">
          
          {/* Join by Room Code Box */}
          <form
            onSubmit={handleJoinByCode}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-3"
          >
            <div className="flex items-center space-x-2 text-xs font-semibold text-white">
              <KeyRound className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <span>Join via Room Code</span>
            </div>
            
            <p className="text-xs text-zinc-400">
              Have a 6-character room code from an exchange partner?
            </p>

            <div className="space-y-1.5">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => {
                  setRoomCodeInput(e.target.value);
                  setCodeError('');
                }}
                maxLength={8}
                placeholder="e.g. EX-8291"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 font-mono tracking-wider focus:border-zinc-600 focus:outline-none uppercase"
              />
              {codeError && (
                <p className="text-[11px] text-red-400">{codeError}</p>
              )}
            </div>

            <button
              type="submit"
              id="join-room-code-btn"
              className="w-full rounded-md bg-white hover:bg-zinc-200 text-zinc-950 py-2 text-xs font-semibold transition-colors"
            >
              Enter Session
            </button>
          </form>

          {/* Protocol Highlights */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-2.5 text-xs">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              Protocol Architecture
            </h4>
            <div className="space-y-2 text-zinc-400">
              <p>
                • <strong>IP Isolation:</strong> Guaranteed unique IP per exchange pair to safeguard publisher ad network accounts.
              </p>
              <p>
                • <strong>30s/45s Dwell Enforcement:</strong> Automatic timer locks validation until retention threshold is met.
              </p>
              <p>
                • <strong>Mutual Verification:</strong> 100% completion unlocks trust rewards; abandonment applies -10 PTS penalty.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
