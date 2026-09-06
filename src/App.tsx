/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DiscoveryPool } from './components/DiscoveryPool';
import { ExchangeSessionPage } from './components/ExchangeSessionPage';
import { LeaderboardPage } from './components/LeaderboardPage';
import { DailyQuestsPage } from './components/DailyQuestsPage';
import { AuthPage } from './components/AuthPage';
import { subscribeToAuth, logoutUser, firebaseConfig, AuthSessionUser } from './lib/firebase';
import { DisputeModal } from './components/DisputeModal';
import { TrustInspectorModal } from './components/TrustInspectorModal';
import { 
  User, 
  ExchangeSession, 
  ExchangeLink, 
  TrustLedgerEntry, 
  IPCooldownRecord, 
  DailyGoal, 
  ExchangeProposal, 
  PackageType 
} from './types';
import { 
  CURRENT_USER, 
  INITIAL_PEERS, 
  INITIAL_TRUST_LEDGER, 
  INITIAL_IP_COOLDOWNS, 
  INITIAL_DAILY_GOALS,
  DEFAULT_USER_LINKS_5,
  DEFAULT_USER_LINKS_10
} from './data/mockData';
import { extractDomain, formatTimeRemaining } from './utils/trustUtils';
import { ShieldCheck, Check, AlertCircle, Sparkles, X, Shield } from 'lucide-react';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'marketplace' | 'room' | 'leaderboard' | 'goals' | 'auth'>('marketplace');

  // Firebase authenticated session state
  const [sessionUser, setSessionUser] = useState<AuthSessionUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // User profile & online pool
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);
  const [peers, setPeers] = useState<User[]>(INITIAL_PEERS);
  const [ipCooldowns, setIpCooldowns] = useState<IPCooldownRecord[]>(INITIAL_IP_COOLDOWNS);
  const [trustLedger, setTrustLedger] = useState<TrustLedgerEntry[]>(INITIAL_TRUST_LEDGER);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>(INITIAL_DAILY_GOALS);

  // Active exchange session (if any)
  const [activeSession, setActiveSession] = useState<ExchangeSession | null>(null);

  // Proposal modal state
  const [proposePartner, setProposePartner] = useState<User | null>(null);

  // Incoming simulated proposal
  const [incomingProposal, setIncomingProposal] = useState<ExchangeProposal | null>(null);

  // Modals state
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [showTrustInspector, setShowTrustInspector] = useState<boolean>(false);

  // Global notification banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'alert' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'alert' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setSessionUser(null);
    setCurrentUser(CURRENT_USER);
    showToast('Signed out of LinkPulse', 'info');
  };

  // Trigger an initial incoming proposal for a live interactive experience after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      const prospectivePartner = peers.find(p => p.id === 'usr_peer_02'); // TrafficNinja
      if (prospectivePartner && !activeSession) {
        setIncomingProposal({
          id: 'prop_init_01',
          sender: prospectivePartner,
          packageType: '5x5',
          dwellTime: 30,
          senderLinks: [
            'https://ouo.io/98hX2a',
            'https://ouo.io/kL4910',
            'https://gplinks.co/best-vpn-2025',
            'https://ouo.io/qW810z',
            'https://gplinks.co/game-patch-update',
          ],
          createdAt: new Date().toISOString(),
          note: 'Hey! Ready for an instant 5x5 exchange. Clean links!',
        });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Listen for Firebase Auth session changes
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setSessionUser(user);
      setIsAuthLoading(false);
      if (user) {
        setCurrentUser(prev => ({
          ...prev,
          username: user.displayName || prev.username,
          email: user.email || undefined,
          avatar: user.photoURL || prev.avatar,
          authProvider: user.providerId,
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Update Trust Score helper
  const applyTrustDelta = (
    delta: number, 
    reason: string, 
    category: TrustLedgerEntry['category'], 
    sessionRef?: string
  ) => {
    setCurrentUser(prev => {
      const newScore = Math.max(0, Math.min(100, prev.trustScore + delta));
      const newEntry: TrustLedgerEntry = {
        id: `t_${Date.now()}`,
        timestamp: 'Just now',
        delta,
        resultingScore: newScore,
        reason,
        category,
        sessionRef,
      };
      setTrustLedger(l => [newEntry, ...l]);
      return {
        ...prev,
        trustScore: newScore,
      };
    });
  };

  // Handle Propose Exchange Action
  const handleOpenProposeModal = (partner: User) => {
    setProposePartner(partner);
    setActiveTab('room');
  };

  // Launch Room from Proposal
  const handleLaunchProposal = (
    packageType: PackageType, 
    dwellTime: number, 
    links: string[], 
    note?: string
  ) => {
    if (!proposePartner) return;

    const count = packageType === '5x5' ? 5 : 10;
    
    // User links provided by currentUser
    const userLinks: ExchangeLink[] = links.slice(0, count).map((url, i) => ({
      id: `usr_link_${i + 1}`,
      url,
      shortenerName: extractDomain(url),
      status: 'pending',
      dwellTimeRequired: dwellTime,
      dwellTimeRemaining: dwellTime,
      isOpened: false,
    }));

    // Partner links to be completed by user
    const partnerBase = [
      `https://${proposePartner.preferredShorteners[0] || 'shrinkme.io'}/media-release-v2`,
      `https://${proposePartner.preferredShorteners[1] || 'ouo.io'}/crypto-bonus-pack`,
      `https://${proposePartner.preferredShorteners[0] || 'shrinkme.io'}/direct-download-mirror`,
      `https://${proposePartner.preferredShorteners[1] || 'ouo.io'}/software-key-patch`,
      `https://${proposePartner.preferredShorteners[0] || 'shrinkme.io'}/tech-setup-notes`,
      `https://${proposePartner.preferredShorteners[1] || 'ouo.io'}/premium-cfg-bin`,
      `https://${proposePartner.preferredShorteners[0] || 'shrinkme.io'}/verified-doc-access`,
      `https://${proposePartner.preferredShorteners[1] || 'ouo.io'}/cloud-backup-direct`,
      `https://${proposePartner.preferredShorteners[0] || 'shrinkme.io'}/ultra-vpn-guide`,
      `https://${proposePartner.preferredShorteners[1] || 'ouo.io'}/instant-bonus-ref`,
    ];

    const partnerLinks: ExchangeLink[] = partnerBase.slice(0, count).map((url, i) => ({
      id: `ptr_link_${i + 1}`,
      url,
      shortenerName: extractDomain(url),
      status: 'pending',
      dwellTimeRequired: dwellTime,
      dwellTimeRemaining: dwellTime,
      isOpened: false,
    }));

    const randomRoomNumber = Math.floor(10000 + Math.random() * 90000);
    const roomCode = `#${randomRoomNumber}`;

    const newSession: ExchangeSession = {
      id: `sess_${Date.now()}`,
      roomCode,
      partner: proposePartner,
      packageType,
      dwellTimeSeconds: dwellTime,
      status: 'active',
      userLinks,
      partnerLinks,
      partnerTelemetry: {
        currentLinkIndex: 0,
        currentLinkStatus: 'waiting',
        secondsRemaining: dwellTime,
        completedCount: 0,
        totalCount: count,
        lastActionText: 'Peer connected. Queue initialized.',
        latencyMs: 32,
      },
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setActiveSession(newSession);
    setProposePartner(null);
    setActiveTab('room');
    showToast(`Exchange Room ${roomCode} active with @${proposePartner.username}`, 'info');
  };

  // Accept Incoming Proposal
  const handleAcceptIncomingProposal = (proposal: ExchangeProposal) => {
    const count = proposal.packageType === '5x5' ? 5 : 10;
    const baseUserLinks = proposal.packageType === '5x5' ? DEFAULT_USER_LINKS_5 : DEFAULT_USER_LINKS_10;

    const userLinks: ExchangeLink[] = baseUserLinks.slice(0, count).map((url, i) => ({
      id: `usr_link_${i + 1}`,
      url,
      shortenerName: extractDomain(url),
      status: 'pending',
      dwellTimeRequired: proposal.dwellTime,
      dwellTimeRemaining: proposal.dwellTime,
      isOpened: false,
    }));

    const partnerLinks: ExchangeLink[] = proposal.senderLinks.slice(0, count).map((url, i) => ({
      id: `ptr_link_${i + 1}`,
      url,
      shortenerName: extractDomain(url),
      status: 'pending',
      dwellTimeRequired: proposal.dwellTime,
      dwellTimeRemaining: proposal.dwellTime,
      isOpened: false,
    }));

    const randomRoomNumber = Math.floor(10000 + Math.random() * 90000);
    const roomCode = `#${randomRoomNumber}`;

    const newSession: ExchangeSession = {
      id: `sess_${Date.now()}`,
      roomCode,
      partner: proposal.sender,
      packageType: proposal.packageType,
      dwellTimeSeconds: proposal.dwellTime,
      status: 'active',
      userLinks,
      partnerLinks,
      partnerTelemetry: {
        currentLinkIndex: 0,
        currentLinkStatus: 'waiting',
        secondsRemaining: proposal.dwellTime,
        completedCount: 0,
        totalCount: count,
        lastActionText: 'Proposal accepted. Connected to room.',
        latencyMs: 28,
      },
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setActiveSession(newSession);
    setIncomingProposal(null);
    setActiveTab('room');
    showToast(`Joined Exchange Room ${roomCode} with @${proposal.sender.username}`, 'success');
  };

  const handleDeclineIncomingProposal = () => {
    setIncomingProposal(null);
    showToast('Incoming proposal declined.', 'info');
  };

  const handleSimulateNewIncomingProposal = () => {
    const availablePeers = peers.filter(p => p.onlineStatus === 'online' && p.trustScore >= 75);
    const randomPeer = availablePeers[Math.floor(Math.random() * availablePeers.length)] || peers[0];

    setIncomingProposal({
      id: `prop_${Date.now()}`,
      sender: randomPeer,
      packageType: '5x5',
      dwellTime: 30,
      senderLinks: [
        `https://${randomPeer.preferredShorteners[0] || 'shrinkme.io'}/download-bundle`,
        `https://${randomPeer.preferredShorteners[0] || 'shrinkme.io'}/free-asset-pack`,
        `https://${randomPeer.preferredShorteners[1] || 'ouo.io'}/exclusive-release-v3`,
        `https://${randomPeer.preferredShorteners[0] || 'shrinkme.io'}/direct-zip-source`,
        `https://${randomPeer.preferredShorteners[1] || 'ouo.io'}/cloud-link-backup`,
      ],
      createdAt: new Date().toISOString(),
      note: 'Looking for prompt verification! Let us exchange 5x5 now.',
    });
    showToast(`New proposal from @${randomPeer.username}`, 'info');
  };

  // Complete Exchange Session
  const handleCompleteSession = (rating: { stars: number; tags: string[]; feedback: string }) => {
    if (!activeSession) return;

    const partner = activeSession.partner;
    const sessionRef = activeSession.roomCode;

    // 1. Reward Trust Score (+2)
    applyTrustDelta(2, `Completed ${activeSession.packageType} exchange with @${partner.username}`, 'exchange_success', sessionRef);

    // 2. Increment lifetime exchanges and update user stats
    setCurrentUser(prev => ({
      ...prev,
      lifetimeExchanges: prev.lifetimeExchanges + 1,
    }));

    // 3. Update Daily Goals progress
    setDailyGoals(goals =>
      goals.map(g => {
        if (g.id === 'g_01') {
          const updated = g.current + 1;
          return { ...g, current: updated, completed: updated >= g.target };
        }
        if (g.id === 'g_02') {
          const linksCompleted = activeSession.packageType === '5x5' ? 5 : 10;
          const updated = g.current + linksCompleted;
          return { ...g, current: updated, completed: updated >= g.target };
        }
        return g;
      })
    );

    // 4. Register 24-Hour IP Cooldown for this partner (Section 2.D)
    const newCooldown: IPCooldownRecord = {
      partnerId: partner.id,
      partnerUsername: partner.username,
      partnerIp: partner.ipAddress,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      initiatedAt: new Date().toISOString(),
    };
    setIpCooldowns(prev => [newCooldown, ...prev.filter(c => c.partnerId !== partner.id)]);

    // 5. Update partner stats
    setPeers(prev =>
      prev.map(p =>
        p.id === partner.id
          ? {
              ...p,
              lifetimeExchanges: p.lifetimeExchanges + 1,
              trustScore: Math.min(100, p.trustScore + 1),
            }
          : p
      )
    );

    // Reset session and return to marketplace
    setActiveSession(null);
    setActiveTab('marketplace');
    showToast(`Exchange ${sessionRef} finalized. +2 Trust Score & 24h IP isolation active.`, 'success');
  };

  // Forfeit / Abandon Session
  const handleAbandonSession = () => {
    if (!activeSession) return;

    const sessionRef = activeSession.roomCode;
    const partner = activeSession.partner;

    applyTrustDelta(-10, `Abandoned active exchange room with @${partner.username}`, 'session_abandon', sessionRef);

    setActiveSession(null);
    setActiveTab('marketplace');
    showToast(`Session forfeited. -10 Trust Score penalty applied.`, 'alert');
  };

  // Submit Formal Dispute
  const handleSubmitDispute = (reason: string, notes: string, evidenceUrl?: string) => {
    if (!activeSession) return;

    const sessionRef = activeSession.roomCode;
    const partner = activeSession.partner;

    setPeers(prev =>
      prev.map(p =>
        p.id === partner.id
          ? {
              ...p,
              trustScore: Math.max(0, p.trustScore - 15),
              notes: `Disputed in ${sessionRef}: ${reason}`,
            }
          : p
      )
    );

    setShowDisputeModal(false);
    setActiveSession(null);
    setActiveTab('marketplace');
    showToast(`Dispute lodged for ${sessionRef}. Session frozen.`, 'alert');
  };

  const handleToggleFavorite = (peerId: string) => {
    setPeers(prev =>
      prev.map(p => (p.id === peerId ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  const handleToggleUserStatus = () => {
    setCurrentUser(prev => ({
      ...prev,
      onlineStatus: prev.onlineStatus === 'online' ? 'away' : 'online',
    }));
  };

  const partnerCooldownActive = proposePartner
    ? ipCooldowns.some(c => c.partnerId === proposePartner.id && new Date(c.expiresAt).getTime() > Date.now())
    : false;

  const partnerCooldownRecord = proposePartner
    ? ipCooldowns.find(c => c.partnerId === proposePartner.id && new Date(c.expiresAt).getTime() > Date.now())
    : null;

  // Loading state while verifying Firebase Auth session
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse">
            <Shield className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-sm font-semibold text-white tracking-wide">LinkPulse</h2>
            <p className="text-xs text-zinc-500 font-mono">Connecting to Firebase ({firebaseConfig.projectId})...</p>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged out, ONLY show auth page
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
        {toastMessage && (
          <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center space-x-2.5 rounded-lg border border-zinc-700 px-3.5 py-2.5 shadow-xl backdrop-blur-sm animate-in fade-in duration-150 max-w-sm bg-zinc-900/95 text-xs text-zinc-200">
            {toastMessage.type === 'success' && <Check className="h-4 w-4 text-zinc-100 shrink-0" strokeWidth={2} />}
            {toastMessage.type === 'alert' && <AlertCircle className="h-4 w-4 text-zinc-300 shrink-0" strokeWidth={1.5} />}
            {toastMessage.type === 'info' && <Shield className="h-4 w-4 text-zinc-300 shrink-0" strokeWidth={1.5} />}
            <p className="flex-1 font-medium">{toastMessage.text}</p>
            <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white p-1">
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
        <AuthPage
          currentUser={currentUser}
          sessionUser={null}
          onAuthSuccess={(user) => {
            setSessionUser(user);
            setCurrentUser(prev => ({
              ...prev,
              username: user.displayName || prev.username,
              email: user.email || undefined,
              avatar: user.photoURL || prev.avatar,
              authProvider: user.providerId,
            }));
            showToast(`Welcome to LinkPulse, ${user.displayName || user.email}!`, 'success');
            setActiveTab('marketplace');
          }}
          onSignOut={handleSignOut}
          onNavigateToApp={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveSession={!!activeSession}
        activeRoomCode={activeSession?.roomCode}
        onOpenTrustInspector={() => setShowTrustInspector(true)}
        onOpenGoals={() => setActiveTab('goals')}
        onOpenLeaderboard={() => setActiveTab('leaderboard')}
        onToggleUserStatus={handleToggleUserStatus}
        onSignOut={handleSignOut}
      />

      {/* Global Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center space-x-2.5 rounded-lg border border-zinc-700 px-3.5 py-2.5 shadow-xl backdrop-blur-sm animate-in fade-in duration-150 max-w-sm bg-zinc-900/95 text-xs text-zinc-200">
          {toastMessage.type === 'success' && <Check className="h-4 w-4 text-zinc-100 shrink-0" strokeWidth={2} />}
          {toastMessage.type === 'alert' && <AlertCircle className="h-4 w-4 text-zinc-300 shrink-0" strokeWidth={1.5} />}
          {toastMessage.type === 'info' && <Shield className="h-4 w-4 text-zinc-300 shrink-0" strokeWidth={1.5} />}
          <p className="flex-1 font-medium">{toastMessage.text}</p>
          <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white p-1">
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Tab 1: Marketplace / Online Discovery Pool */}
        {activeTab === 'marketplace' && (
          <DiscoveryPool
            currentUser={currentUser}
            peers={peers}
            ipCooldowns={ipCooldowns}
            incomingProposal={incomingProposal}
            onProposeExchange={handleOpenProposeModal}
            onAcceptProposal={handleAcceptIncomingProposal}
            onDeclineProposal={handleDeclineIncomingProposal}
            onSimulateIncomingProposal={handleSimulateNewIncomingProposal}
            onToggleFavorite={handleToggleFavorite}
            onOpenTrustInspector={() => setShowTrustInspector(true)}
          />
        )}

        {/* Tab 2: Full-Screen Synchronized Exchange Session Page */}
        {activeTab === 'room' && (
          <ExchangeSessionPage
            session={activeSession}
            currentUser={currentUser}
            peers={peers}
            proposePartner={proposePartner}
            isCooldownActive={partnerCooldownActive}
            cooldownRemainingFormatted={
              partnerCooldownRecord
                ? formatTimeRemaining(new Date(partnerCooldownRecord.expiresAt).getTime() - Date.now())
                : undefined
            }
            onSelectPartnerForProposal={(partner) => {
              setProposePartner(partner);
            }}
            onSubmitProposal={handleLaunchProposal}
            onUpdateSession={(updated) => setActiveSession(updated)}
            onCompleteSession={handleCompleteSession}
            onAbandonSession={handleAbandonSession}
            onOpenDispute={() => setShowDisputeModal(true)}
            onBackToPool={() => {
              setProposePartner(null);
              setActiveTab('marketplace');
            }}
            onJoinRoomByCode={(code) => {
              const eligible = peers.find(p => p.onlineStatus === 'online') || peers[0];
              showToast(`Joined session room ${code} with @${eligible.username}`, 'success');
              handleOpenProposeModal(eligible);
            }}
          />
        )}

        {/* Tab 3: Full-Screen Reputation Leaderboard Page */}
        {activeTab === 'leaderboard' && (
          <LeaderboardPage
            currentUser={currentUser}
            peers={peers}
            onProposeExchange={(peer) => {
              handleOpenProposeModal(peer);
            }}
            onBackToPool={() => setActiveTab('marketplace')}
          />
        )}

        {/* Tab 4: Full-Screen Daily Quests Page */}
        {activeTab === 'goals' && (
          <DailyQuestsPage
            goals={dailyGoals}
            currentUser={currentUser}
            onClaimReward={(goalId) => {
              setDailyGoals(goals =>
                goals.map(g => (g.id === goalId ? { ...g, completed: true } : g))
              );
              showToast('Reward claimed for quest! +XP and Trust bonus applied.', 'success');
            }}
            onBackToPool={() => setActiveTab('marketplace')}
          />
        )}

        {/* Tab 5: Firebase Authentication & Profile Page */}
        {activeTab === 'auth' && (
          <AuthPage
            currentUser={currentUser}
            sessionUser={sessionUser}
            onAuthSuccess={(user) => {
              setSessionUser(user);
              setCurrentUser(prev => ({
                ...prev,
                username: user.displayName || prev.username,
                email: user.email || undefined,
                avatar: user.photoURL || prev.avatar,
                authProvider: user.providerId,
              }));
              showToast(`Logged in as ${user.displayName || user.email}`, 'success');
              setActiveTab('marketplace');
            }}
            onSignOut={handleSignOut}
            onNavigateToApp={() => setActiveTab('marketplace')}
          />
        )}

      </main>

      {/* Global Modals (Specific Inspection & Reporting only) */}
      {showDisputeModal && activeSession && (
        <DisputeModal
          session={activeSession}
          onClose={() => setShowDisputeModal(false)}
          onSubmitDispute={handleSubmitDispute}
        />
      )}

      {showTrustInspector && (
        <TrustInspectorModal
          currentUser={currentUser}
          ledger={trustLedger}
          onClose={() => setShowTrustInspector(false)}
          onSimulateScoreChange={(delta, reason, cat) => applyTrustDelta(delta, reason, cat)}
        />
      )}

    </div>
  );
}
