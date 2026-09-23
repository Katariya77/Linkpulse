import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ExternalLink, 
  Check, 
  Shield, 
  AlertTriangle, 
  Lock, 
  Star, 
  Activity, 
  Sliders,
  Eye,
  Radio,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ExchangeSession, ExchangeLink, User } from '../types';
import { getTrustTier, extractDomain } from '../utils/trustUtils';

interface ExchangeRoomProps {
  session: ExchangeSession;
  currentUser: User;
  onUpdateSession: (updatedSession: ExchangeSession) => void;
  onCompleteSession: (rating: { stars: number; tags: string[]; feedback: string }) => void;
  onAbandonSession: () => void;
  onOpenDispute: () => void;
  onCloseRoom: () => void;
}

export const ExchangeRoom: React.FC<ExchangeRoomProps> = ({
  session,
  currentUser,
  onUpdateSession,
  onCompleteSession,
  onAbandonSession,
  onOpenDispute,
  onCloseRoom,
}) => {
  const [simulationSpeed, setSimulationSpeed] = useState<'normal' | 'fast' | 'instant'>('fast');
  const [activeUserLinkIndex, setActiveUserLinkIndex] = useState<number>(0);
  const [isTabFocused, setIsTabFocused] = useState<boolean>(true);
  const [currentDwellCountdown, setCurrentDwellCountdown] = useState<number>(0);
  const [isDwellRunning, setIsDwellRunning] = useState<boolean>(false);
  const [openedLinkIds, setOpenedLinkIds] = useState<Set<string>>(new Set());

  // Toggle dropdown view to see all links vs single active link
  const [showAllUserQueue, setShowAllUserQueue] = useState<boolean>(false);
  const [showAllPartnerProgress, setShowAllPartnerProgress] = useState<boolean>(false);

  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingTags, setRatingTags] = useState<string[]>(['Fast Verification', 'Clean Links']);
  const [ratingFeedback, setRatingFeedback] = useState<string>('Smooth exchange session, verified without issue.');
  const [showForfeitModal, setShowForfeitModal] = useState<boolean>(false);

  const [isUserLocked, setIsUserLocked] = useState<boolean>(session?.status !== 'setup');
  const [isPartnerLocked, setIsPartnerLocked] = useState<boolean>(session?.status !== 'setup');

  const partnerLinks = Array.isArray(session?.partnerLinks) ? session.partnerLinks : [];
  const userLinks = Array.isArray(session?.userLinks) ? session.userLinks : [];
  const partner = session?.partner || {
    id: 'partner_fallback',
    username: 'Partner',
    trustScore: 80,
    ipAddress: '192.168.1.1',
  };
  const partnerTelemetry = session?.partnerTelemetry || {
    currentLinkIndex: 0,
    currentLinkStatus: 'idle',
    secondsRemaining: 0,
    completedCount: 0,
    totalCount: userLinks.length,
    lastActionText: 'Connected and synchronized.',
    latencyMs: 24,
  };

  const partnerTrust = getTrustTier(partner.trustScore);

  const userVerifiedCount = partnerLinks.filter(l => l.status === 'verified').length;
  const userTotalCount = partnerLinks.length;
  const userProgressPercent = userTotalCount > 0 ? Math.round((userVerifiedCount / userTotalCount) * 100) : 0;

  const partnerVerifiedCount = userLinks.filter(l => l.status === 'verified').length;
  const partnerTotalCount = userLinks.length;
  const partnerProgressPercent = partnerTotalCount > 0 ? Math.round((partnerVerifiedCount / partnerTotalCount) * 100) : 0;

  const isUserAllDone = userTotalCount > 0 && userVerifiedCount === userTotalCount;
  const activeUserLink = partnerLinks[activeUserLinkIndex] || partnerLinks[0];

  const partnerWorkingIndex = userLinks.findIndex(l => l.status === 'in_progress' || l.status === 'pending');
  const partnerActiveIndex = partnerWorkingIndex !== -1 ? partnerWorkingIndex : (userLinks.length > 0 ? userLinks.length - 1 : 0);
  const currentPartnerWorkingLink = userLinks[partnerActiveIndex];
  const isPartnerAllDone = partnerTotalCount > 0 && partnerVerifiedCount === partnerTotalCount;

  const isBothCompleted = userProgressPercent === 100 && partnerProgressPercent === 100;

  useEffect(() => {
    const handleFocus = () => setIsTabFocused(true);
    const handleBlur = () => setIsTabFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (session?.status === 'setup' && isUserLocked && !isPartnerLocked) {
      const timer = setTimeout(() => {
        setIsPartnerLocked(true);
        onUpdateSession({
          ...session,
          status: 'active',
          startedAt: new Date().toISOString(),
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [session, isUserLocked, isPartnerLocked, onUpdateSession]);

  useEffect(() => {
    const firstPendingIdx = partnerLinks.findIndex(l => l.status !== 'verified');
    if (firstPendingIdx !== -1) {
      setActiveUserLinkIndex(firstPendingIdx);
    }
  }, [partnerLinks]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isDwellRunning && currentDwellCountdown > 0) {
      interval = setInterval(() => {
        setCurrentDwellCountdown(prev => {
          if (prev <= 1) {
            setIsDwellRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDwellRunning, currentDwellCountdown]);

  // Partner Simulated Progress
  useEffect(() => {
    if (session.status !== 'active' || partnerProgressPercent >= 100) return;

    const stepDuration = simulationSpeed === 'normal' ? 8000 : simulationSpeed === 'fast' ? 2200 : 800;

    const partnerTimer = setTimeout(() => {
      const updatedUserLinks = [...userLinks];
      const nextPendingIndex = updatedUserLinks.findIndex(l => l.status === 'pending' || l.status === 'in_progress');

      if (nextPendingIndex !== -1) {
        const link = updatedUserLinks[nextPendingIndex];
        
        if (link.status === 'pending') {
          updatedUserLinks[nextPendingIndex] = {
            ...link,
            status: 'in_progress',
          };
          onUpdateSession({
            ...session,
            userLinks: updatedUserLinks,
            partnerTelemetry: {
              ...partnerTelemetry,
              currentLinkIndex: nextPendingIndex,
              currentLinkStatus: 'verifying',
              secondsRemaining: simulationSpeed === 'normal' ? 24 : 4,
              totalCount: userLinks.length,
              lastActionText: `Verifying link #${nextPendingIndex + 1} (${extractDomain(link.url)})`,
              latencyMs: 24,
            }
          });
        } else if (link.status === 'in_progress') {
          updatedUserLinks[nextPendingIndex] = {
            ...link,
            status: 'verified',
            verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          const newCompletedCount = updatedUserLinks.filter(l => l.status === 'verified').length;
          onUpdateSession({
            ...session,
            userLinks: updatedUserLinks,
            partnerTelemetry: {
              ...partnerTelemetry,
              currentLinkIndex: nextPendingIndex,
              currentLinkStatus: 'verified',
              secondsRemaining: 0,
              completedCount: newCompletedCount,
              totalCount: userLinks.length,
              lastActionText: `Link #${nextPendingIndex + 1} verified.`,
              latencyMs: 22,
            }
          });
        }
      }
    }, stepDuration);

    return () => clearTimeout(partnerTimer);
  }, [session, userLinks, partnerTelemetry, partnerProgressPercent, simulationSpeed, onUpdateSession]);

  const handleOpenLinkAndStartTimer = (link: ExchangeLink, index: number) => {
    try {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback
    }

    setOpenedLinkIds(prev => new Set(prev).add(link.id));
    const dwellDuration = simulationSpeed === 'normal' ? link.dwellTimeRequired : simulationSpeed === 'fast' ? 5 : 1;
    setCurrentDwellCountdown(dwellDuration);
    setIsDwellRunning(true);

    const updated = [...partnerLinks];
    updated[index] = {
      ...updated[index],
      status: 'in_progress',
      isOpened: true,
    };

    onUpdateSession({
      ...session,
      partnerLinks: updated,
    });
  };

  const handleVerifyLink = (index: number) => {
    const updated = [...partnerLinks];
    updated[index] = {
      ...updated[index],
      status: 'verified',
      verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setIsDwellRunning(false);
    setCurrentDwellCountdown(0);

    const nextIdx = updated.findIndex(l => l.status !== 'verified');
    if (nextIdx !== -1) {
      setActiveUserLinkIndex(nextIdx);
    }

    onUpdateSession({
      ...session,
      partnerLinks: updated,
    });
  };

  const toggleRatingTag = (tag: string) => {
    if (ratingTags.includes(tag)) {
      setRatingTags(ratingTags.filter(t => t !== tag));
    } else {
      setRatingTags([...ratingTags, tag]);
    }
  };

  const AVAILABLE_TAGS = [
    'Fast Verification',
    'Clean Links',
    'Responsive Partner',
    'Reliable Partner',
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Session Top Status Bar */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Room ID & Partner Info */}
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100">
              <Radio className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-semibold text-white">
                  Room <span className="font-mono">{session.roomCode}</span>
                </h1>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 border border-zinc-700">
                  {session.packageType}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                  {session.dwellTimeSeconds}s verification
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Partner: @{session.partner.username} • 24h IP isolation active
              </p>
            </div>
          </div>

          {/* Controls & Test speed */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-zinc-950 border border-zinc-800 rounded-md p-0.5 text-xs">
              <span className="text-[10px] text-zinc-500 px-1.5 font-medium">
                Speed:
              </span>
              <button
                type="button"
                id="speed-normal-btn"
                onClick={() => setSimulationSpeed('normal')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  simulationSpeed === 'normal' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                30s
              </button>
              <button
                type="button"
                id="speed-fast-btn"
                onClick={() => setSimulationSpeed('fast')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  simulationSpeed === 'fast' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                5s (Fast)
              </button>
              <button
                type="button"
                id="speed-instant-btn"
                onClick={() => setSimulationSpeed('instant')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  simulationSpeed === 'instant' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                1s
              </button>
            </div>

            <button
              type="button"
              id="report-dispute-btn"
              onClick={onOpenDispute}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Report
            </button>

            {session.status !== 'completed' && (
              <button
                type="button"
                id="abandon-session-btn"
                onClick={() => setShowForfeitModal(true)}
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Leave Exchange
              </button>
            )}
          </div>
        </div>

        {/* Minimal Progress Bars */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-800/80">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400">Your Queue</span>
              <span className="text-zinc-200 tabular-nums">
                {userVerifiedCount}/{userTotalCount} ({userProgressPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-950 border border-zinc-800/80 overflow-hidden">
              <div
                className="h-full bg-zinc-200 transition-all duration-300"
                style={{ width: `${userProgressPercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400">Partner Progress (@{session.partner.username})</span>
              <span className="text-zinc-200 tabular-nums">
                {partnerVerifiedCount}/{partnerTotalCount} ({partnerProgressPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-950 border border-zinc-800/80 overflow-hidden">
              <div
                className="h-full bg-zinc-400 transition-all duration-300"
                style={{ width: `${partnerProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Dual-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* COLUMN 1: YOUR TASKS */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
            <div>
              <h2 className="text-xs font-semibold text-white">
                1. Your Queue
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Visit & verify partner's links
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded tabular-nums">
                {userVerifiedCount}/{userTotalCount} Done
              </span>
              <button
                type="button"
                id="toggle-user-queue-dropdown-btn"
                onClick={() => setShowAllUserQueue(prev => !prev)}
                title={showAllUserQueue ? "Collapse to active link" : "Show all links dropdown"}
                aria-label="Toggle all links dropdown"
                className={`p-1 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                  showAllUserQueue
                    ? 'border-zinc-700 bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {showAllUserQueue ? (
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {/* Anti-Abuse Sensor */}
          <div className="mb-3 rounded border border-zinc-800/80 bg-zinc-950/60 px-3 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-zinc-400">
              <Eye className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              <span>Tab Sensor:</span>
            </div>
            <span className={`text-xs ${isTabFocused ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
              {isTabFocused ? 'Focused' : 'Unfocused'}
            </span>
          </div>

          {/* Links Queue Area */}
          <div className="space-y-2 flex-1">
            {isUserAllDone ? (
              <div className="rounded-md border border-zinc-800/80 bg-zinc-950/60 p-4 text-center space-y-1.5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <Check className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="text-xs font-semibold text-white">All Links in Your Queue Verified</div>
                <p className="text-[11px] text-zinc-400">
                  You have verified all {userTotalCount} links series-wise.
                </p>
              </div>
            ) : !showAllUserQueue && activeUserLink ? (
              /* SINGLE ACTIVE LINK VIEW (Default) */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono px-0.5">
                  <span>Active Link #{activeUserLinkIndex + 1} of {userTotalCount}</span>
                  <span className="text-zinc-500">Auto-advances series-wise</span>
                </div>

                <div
                  id={`partner-link-card-${activeUserLinkIndex}`}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-3.5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 border border-zinc-700 font-mono text-xs font-bold text-white">
                        {activeUserLinkIndex + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-mono rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-300 border border-zinc-800">
                            {activeUserLink.shortenerName}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {session.dwellTimeSeconds}s verification
                          </span>
                        </div>
                        <div className="font-mono text-xs truncate mt-1 text-white select-all">
                          {activeUserLink.url}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                      {!activeUserLink.isOpened ? (
                        <button
                          type="button"
                          id={`open-link-btn-${activeUserLinkIndex}`}
                          onClick={() => handleOpenLinkAndStartTimer(activeUserLink, activeUserLinkIndex)}
                          className="rounded bg-white text-zinc-950 hover:bg-zinc-200 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      ) : isDwellRunning && currentDwellCountdown > 0 ? (
                        <div className="flex items-center space-x-1.5 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded text-zinc-200 text-xs font-mono">
                          <Clock className="h-3.5 w-3.5 text-zinc-400 animate-spin" strokeWidth={1.5} />
                          <span>{currentDwellCountdown}s</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          id={`verify-task-btn-${activeUserLinkIndex}`}
                          onClick={() => handleVerifyLink(activeUserLinkIndex)}
                          className="rounded bg-emerald-400 hover:bg-emerald-300 text-zinc-950 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={2} />
                          <span>Verify</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllUserQueue(true)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View all {userTotalCount} links dropdown</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* DROPDOWN OF ALL QUEUE LINKS */}
            {showAllUserQueue && (
              <div className="space-y-2 pt-1 border-t border-zinc-800/60 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono px-0.5">
                  <span>All Links in Queue ({partnerLinks.length})</span>
                  <button
                    type="button"
                    onClick={() => setShowAllUserQueue(false)}
                    className="text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Show active only</span>
                    <ChevronUp className="h-3 w-3" />
                  </button>
                </div>

                {partnerLinks.map((link, idx) => {
                  const isVerified = link.status === 'verified';
                  const isCurrent = idx === activeUserLinkIndex;
                  const isLocked = idx > activeUserLinkIndex && !isVerified;

                  return (
                    <div
                      key={link.id}
                      id={`partner-link-card-${idx}`}
                      className={`rounded-md border p-3 transition-colors ${
                        isVerified
                          ? 'border-zinc-800/60 bg-zinc-950/40 text-zinc-400'
                          : isCurrent
                          ? 'border-zinc-700 bg-zinc-900/70 text-zinc-100'
                          : 'border-zinc-800/40 bg-zinc-950/20 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <div className="shrink-0 font-mono text-xs text-zinc-400">
                            {isVerified ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-zinc-200">
                                <Check className="h-3 w-3" strokeWidth={2} />
                              </span>
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                {idx + 1}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-mono rounded bg-zinc-950 px-1.5 py-0.2 text-zinc-400 border border-zinc-800">
                                {link.shortenerName}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {session.dwellTimeSeconds}s verification
                              </span>
                            </div>
                            <div className="font-mono text-xs truncate mt-0.5 text-zinc-200">
                              {link.url}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0">
                          {isVerified ? (
                            <span className="text-[11px] font-mono text-zinc-400">
                              Verified
                            </span>
                          ) : isLocked ? (
                            <span className="text-[11px] text-zinc-600 font-mono">
                              Locked
                            </span>
                          ) : !link.isOpened ? (
                            <button
                              type="button"
                              id={`open-link-btn-${idx}`}
                              onClick={() => handleOpenLinkAndStartTimer(link, idx)}
                              className="rounded bg-white text-zinc-950 hover:bg-zinc-200 px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Open Link</span>
                              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          ) : isDwellRunning && currentDwellCountdown > 0 ? (
                            <div className="flex items-center space-x-1.5 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded text-zinc-200 text-xs font-mono">
                              <Clock className="h-3 w-3 text-zinc-400 animate-spin" strokeWidth={1.5} />
                              <span>{currentDwellCountdown}s</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              id={`verify-task-btn-${idx}`}
                              onClick={() => handleVerifyLink(idx)}
                              className="rounded bg-white text-zinc-950 hover:bg-zinc-200 px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="h-3 w-3" strokeWidth={2} />
                              <span>Verify</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: PARTNER PROGRESS */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
            <div>
              <h2 className="text-xs font-semibold text-white">
                2. Partner Progress
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                @{session.partner.username} verifying your links
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded tabular-nums">
                {partnerVerifiedCount}/{partnerTotalCount} Done
              </span>
              <button
                type="button"
                id="toggle-partner-progress-dropdown-btn"
                onClick={() => setShowAllPartnerProgress(prev => !prev)}
                title={showAllPartnerProgress ? "Collapse to active link" : "Show all links dropdown"}
                aria-label="Toggle all partner links dropdown"
                className={`p-1 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                  showAllPartnerProgress
                    ? 'border-zinc-700 bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {showAllPartnerProgress ? (
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {/* Activity Feed Banner */}
          <div className="mb-3 rounded border border-zinc-800/80 bg-zinc-950/60 px-3 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-zinc-400">
              <Activity className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              <span>Live Action:</span>
            </div>
            <span className="text-xs text-zinc-300 truncate max-w-[240px]">
              {partnerTelemetry.lastActionText}
            </span>
          </div>

          {/* User Links Area (Partner Progress) */}
          <div className="space-y-2 flex-1">
            {isPartnerAllDone ? (
              <div className="rounded-md border border-zinc-800/80 bg-zinc-950/60 p-4 text-center space-y-1.5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <Check className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="text-xs font-semibold text-white">All Links Verified by Partner</div>
                <p className="text-[11px] text-zinc-400">
                  @{session.partner.username} verified all {partnerTotalCount} of your links.
                </p>
              </div>
            ) : !showAllPartnerProgress && currentPartnerWorkingLink ? (
              /* SINGLE ACTIVE LINK VIEW (Partner Working Link) */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono px-0.5">
                  <span>Partner Working On: Link #{partnerActiveIndex + 1} of {partnerTotalCount}</span>
                  <span className="text-zinc-500">Live Telemetry</span>
                </div>

                <div
                  id={`user-link-telemetry-${partnerActiveIndex}`}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-3.5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 border border-zinc-700 font-mono text-xs font-bold text-white">
                        {partnerActiveIndex + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-mono rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-300 border border-zinc-800">
                            {currentPartnerWorkingLink.shortenerName}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Your link #{partnerActiveIndex + 1}
                          </span>
                        </div>
                        <div className="font-mono text-xs truncate mt-1 text-zinc-200">
                          {currentPartnerWorkingLink.url}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right font-mono text-xs">
                      {currentPartnerWorkingLink.status === 'verified' ? (
                        <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
                          Verified
                        </span>
                      ) : currentPartnerWorkingLink.status === 'in_progress' || partnerTelemetry.currentLinkStatus === 'verifying' ? (
                        <div className="flex items-center space-x-1.5 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded text-zinc-200 text-xs">
                          <Clock className="h-3 w-3 text-zinc-400 animate-spin" strokeWidth={1.5} />
                          <span>Verifying ({partnerTelemetry.secondsRemaining}s)</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllPartnerProgress(true)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View all {partnerTotalCount} links dropdown</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* DROPDOWN OF ALL PARTNER PROGRESS LINKS */}
            {showAllPartnerProgress && (
              <div className="space-y-2 pt-1 border-t border-zinc-800/60 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono px-0.5">
                  <span>All Your Links ({userLinks.length})</span>
                  <button
                    type="button"
                    onClick={() => setShowAllPartnerProgress(false)}
                    className="text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Show active only</span>
                    <ChevronUp className="h-3 w-3" />
                  </button>
                </div>

                {userLinks.map((link, idx) => {
                  const isVerified = link.status === 'verified';
                  const isInProgress = link.status === 'in_progress';
                  const isCurrentWorking = idx === partnerActiveIndex && !isVerified;

                  return (
                    <div
                      key={link.id}
                      id={`user-link-telemetry-${idx}`}
                      className={`rounded-md border p-3 transition-colors ${
                        isVerified
                          ? 'border-zinc-800/60 bg-zinc-950/40 text-zinc-400'
                          : isCurrentWorking || isInProgress
                          ? 'border-zinc-700 bg-zinc-900/80 text-zinc-100'
                          : 'border-zinc-800/40 bg-zinc-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <div className="shrink-0 font-mono text-xs text-zinc-400">
                            {isVerified ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-zinc-200">
                                <Check className="h-3 w-3" strokeWidth={2} />
                              </span>
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                {idx + 1}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-mono rounded bg-zinc-950 px-1.5 py-0.2 text-zinc-400 border border-zinc-800">
                                {link.shortenerName}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Your link #{idx + 1}
                              </span>
                            </div>
                            <div className="font-mono text-xs truncate mt-0.5 text-zinc-300">
                              {link.url}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right font-mono text-xs">
                          {isVerified ? (
                            <span className="text-zinc-400">Verified</span>
                          ) : isInProgress || (isCurrentWorking && partnerTelemetry.currentLinkStatus === 'verifying') ? (
                            <span className="text-zinc-200 flex items-center gap-1">
                              <Clock className="h-3 w-3 animate-spin text-zinc-400" />
                              Verifying...
                            </span>
                          ) : (
                            <span className="text-zinc-600">Pending</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Completion Bar */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-center">
        {isBothCompleted ? (
          <div className="max-w-md mx-auto space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Mutual Verification Complete (100%)
            </h3>
            <p className="text-xs text-zinc-400">
              Both queues satisfied. Finalize to claim +2 Trust Score and enable 24h IP isolation.
            </p>
            <button
              type="button"
              id="finalize-exchange-btn"
              onClick={() => setShowRatingModal(true)}
              className="rounded-md bg-white text-zinc-950 hover:bg-zinc-200 px-5 py-2 text-xs font-semibold transition-colors"
            >
              Finalize & Claim +2 Trust
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                Completion Status
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Completion unlocks when both sides reach 100% verified status.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 text-zinc-300 tabular-nums">
                You: {userProgressPercent}%
              </span>
              <span className="bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 text-zinc-300 tabular-nums">
                Partner: {partnerProgressPercent}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Rate Exchange with @{session.partner.username}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Helps keep everyone honest and updates partner trust scores.
              </p>
            </div>

            <div className="flex justify-center items-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingStars(star)}
                  className="p-1 text-zinc-600 hover:text-zinc-200 transition-colors"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= ratingStars ? 'fill-zinc-100 text-zinc-100' : 'text-zinc-700'
                    }`}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleRatingTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      ratingTags.includes(tag)
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Review
              </label>
              <input
                type="text"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
              />
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5 text-xs space-y-1 text-zinc-400">
              <div className="flex justify-between text-zinc-200">
                <span>Trust Reward:</span>
                <span className="tabular-nums font-medium">+2 Points</span>
              </div>
              <div className="flex justify-between">
                <span>IP Cooldown:</span>
                <span>24 hours activated</span>
              </div>
            </div>

            <button
              type="button"
              id="submit-rating-btn"
              onClick={() => {
                setShowRatingModal(false);
                onCompleteSession({
                  stars: ratingStars,
                  tags: ratingTags,
                  feedback: ratingFeedback,
                });
              }}
              className="w-full rounded bg-white text-zinc-950 hover:bg-zinc-200 py-2 text-xs font-semibold transition-colors"
            >
              Submit & Finalize
            </button>
          </div>
        </div>
      )}

      {/* Forfeit Confirm Modal */}
      {showForfeitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Leave Active Exchange?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Leaving an active exchange applies a -10 Trust Score penalty recorded on your public ledger.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForfeitModal(false)}
                className="rounded px-3 py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-forfeit-btn"
                onClick={() => {
                  setShowForfeitModal(false);
                  onAbandonSession();
                }}
                className="rounded bg-zinc-100 text-zinc-950 hover:bg-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Leave Exchange (-10 PTS)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
