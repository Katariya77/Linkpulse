import React from 'react';
import { 
  Clock, 
  ArrowLeft, 
  Shield, 
  Layers, 
  Timer, 
  X, 
  Radio
} from 'lucide-react';
import { User, PackageType } from '../types';
import { getTrustTier } from '../utils/trustUtils';

interface WaitingExchangeScreenProps {
  partner: User;
  packageType: PackageType;
  dwellTime: number;
  secondsRemaining: number;
  isDeclined?: boolean;
  onCancel: () => void;
  onSimulateAccept?: () => void;
}

export const WaitingExchangeScreen: React.FC<WaitingExchangeScreenProps> = ({
  partner,
  packageType,
  dwellTime,
  secondsRemaining,
  isDeclined = false,
  onCancel,
  onSimulateAccept,
}) => {
  const partnerTier = getTrustTier(partner.trustScore);
  const percentLeft = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100));

  return (
    <div 
      id="waiting-exchange-screen"
      className="max-w-2xl mx-auto py-4 px-2 sm:px-4 space-y-6 animate-in fade-in duration-200"
    >
      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          id="back-to-pool-from-waiting-btn"
          onClick={onCancel}
          className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Cancel & Back to Discovery Pool</span>
        </button>

        <div className="inline-flex items-center space-x-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300">
          <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span>Live Invitation Stream</span>
        </div>
      </div>

      {/* Main Waiting Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

        {isDeclined ? (
          /* Declined State */
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700 text-zinc-400">
              <X className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Invitation Declined</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                <span className="text-zinc-200 font-medium">@{partner.username}</span> is currently busy or declined this exchange session.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                id="waiting-declined-return-btn"
                onClick={onCancel}
                className="rounded-lg bg-white px-5 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Return to Discovery Pool
              </button>
            </div>
          </div>
        ) : (
          /* Active Waiting State */
          <div className="space-y-6">
            {/* Header Radar & Title */}
            <div className="text-center space-y-3">
              {/* Radar pulse avatar container */}
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                {/* Radar rings */}
                <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
                <div className="absolute -inset-2 rounded-full border border-emerald-500/10 animate-pulse" />
                
                <img
                  src={partner.avatar}
                  alt={partner.username}
                  className="relative z-10 h-16 w-16 rounded-full object-cover border-2 border-emerald-500/60 shadow-lg"
                />

                <span className="absolute bottom-1 right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950">
                  <span className="h-2 w-2 rounded-full bg-zinc-950" />
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Waiting for @{partner.username}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Exchange invitation sent. Awaiting partner confirmation to launch the room.
                </p>
              </div>
            </div>

            {/* Partner & Package Metadata Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-xs">
              <div className="flex items-center space-x-2.5">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-[10px] text-zinc-400">Partner Trust</div>
                  <div className="font-semibold text-zinc-200 tabular-nums">
                    {partner.trustScore}/100 • {partnerTier.label}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 border-t sm:border-t-0 sm:border-l border-zinc-800/80 pt-2 sm:pt-0 sm:pl-3">
                <Layers className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-[10px] text-zinc-400">Exchange Format</div>
                  <div className="font-semibold text-zinc-200">
                    {packageType} Swap ({packageType === '5x5' ? '5 Links' : '10 Links'})
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 border-t sm:border-t-0 sm:border-l border-zinc-800/80 pt-2 sm:pt-0 sm:pl-3">
                <Timer className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-[10px] text-zinc-400">Verification Rule</div>
                  <div className="font-semibold text-zinc-200">
                    {dwellTime}s Min Dwell Time
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown Progress Card */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-zinc-300">
                  <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="font-medium">Acceptance Window (30s max)</span>
                </div>
                <div className="font-bold text-white tabular-nums text-sm">
                  {secondsRemaining}s <span className="text-zinc-500 font-normal text-xs">remaining</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                <div 
                  className={`h-full transition-all duration-1000 ease-linear ${
                    secondsRemaining <= 10 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percentLeft}%` }}
                />
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                If @{partner.username} does not accept within 30 seconds, the request will automatically expire and return you to the pool with zero penalty.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {/* Optional test button for single-device preview evaluation */}
              {onSimulateAccept ? (
                <button
                  type="button"
                  id="simulate-peer-accept-btn"
                  onClick={onSimulateAccept}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer transition-colors"
                  title="Click to simulate that the peer accepted immediately"
                >
                  (Dev preview: Simulate Peer Accept)
                </button>
              ) : <div />}

              <button
                type="button"
                id="cancel-waiting-invite-btn"
                onClick={onCancel}
                className="w-full sm:w-auto rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel Invitation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
