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
  syncUserProfile, 
  updateUserProfileInFirestore, 
  subscribeToPeers, 
  subscribeToTrustLedger, 
  addTrustLedgerEntryInFirestore,
  subscribeToIncomingProposals,
  sendExchangeProposalToFirestore,
  subscribeToExchangeSession,
  updateSessionInFirestore,
  subscribeToCooldowns,
  addCooldownInFirestore,
  cleanupMockDataFromFirestore,
  REAL_INITIAL_GOALS
} from './lib/firestoreService';
import { extractDomain, formatTimeRemaining } from './utils/trustUtils';
import { ShieldCheck, Check, AlertCircle, Sparkles, X, Shield } from 'lucide-react';

const INITIAL_FALLBACK_USER: User = {
  id: 'guest_user',
  username: 'Visiting Peer',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  onlineStatus: 'online',
  trustScore: 100,
  successRate: 100,
  lifetimeExchanges: 0,
  activeStreak: 1,
  preferredShorteners: ['shrinkme.io', 'ouo.io'],
  ipAddress: '192.0.2.84',
  country: 'United States',
  countryCode: 'US',
  joinedDate: 'Today',
};

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'marketplace' | 'room' | 'leaderboard' | 'goals' | 'auth'>('marketplace');

  // Firebase authenticated session state
  const [sessionUser, setSessionUser] = useState<AuthSessionUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // User profile & online pool (synced with Firebase Firestore in real time)
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_FALLBACK_USER);
  const [peers, setPeers] = useState<User[]>([]);
  const [ipCooldowns, setIpCooldowns] = useState<IPCooldownRecord[]>([]);
  const [trustLedger, setTrustLedger] = useState<TrustLedgerEntry[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>(REAL_INITIAL_GOALS);

  // Active exchange session (if any)
  const [activeSession, setActiveSession] = useState<ExchangeSession | null>(null);

  // Proposal modal state
  const [proposePartner, setProposePartner] = useState<User | null>(null);

  // Incoming proposal (real-time Firestore synced)
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
    setCurrentUser(INITIAL_FALLBACK_USER);
    showToast('Signed out of LinkPulse', 'info');
  };

  // Real-time Firestore synchronization for Auth, User Profile, Peers, Trust Ledger, Proposals, and Cooldowns
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      setSessionUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Listen to User Profile when authenticated
  useEffect(() => {
    if (!sessionUser) return;
    cleanupMockDataFromFirestore();
    const unsubUser = syncUserProfile(sessionUser, (profile) => {
      setCurrentUser(profile);
    });
    return () => unsubUser();
  }, [sessionUser]);

  // Listen to Peers collection in real time
  useEffect(() => {
    const activeUid = sessionUser ? sessionUser.uid : '';
    const unsubPeers = subscribeToPeers(activeUid, (livePeers) => {
      setPeers(livePeers);
    });
    return () => unsubPeers();
  }, [sessionUser]);

  // Listen to Trust Ledger in real time
  useEffect(() => {
    if (!sessionUser) return;
    const unsubLedger = subscribeToTrustLedger(sessionUser.uid, (entries) => {
      setTrustLedger(entries);
    });
    return () => unsubLedger();
  }, [sessionUser]);

  // Listen to incoming proposals in real time from Firestore
  useEffect(() => {
    if (!sessionUser) return;
    const unsubProposals = subscribeToIncomingProposals(sessionUser.uid, (prop) => {
      setIncomingProposal(prop);
    });
    return () => unsubProposals();
  }, [sessionUser]);

  // Listen to IP cooldowns in real time from Firestore
  useEffect(() => {
    if (!sessionUser) return;
    const unsubCooldowns = subscribeToCooldowns(sessionUser.uid, (cooldowns) => {
      setIpCooldowns(cooldowns);
    });
    return () => unsubCooldowns();
  }, [sessionUser]);

  // Listen to Active Session in real time if active
  useEffect(() => {
    if (!activeSession?.id) return;
    const unsubSession = subscribeToExchangeSession(activeSession.id, (updated) => {
      if (updated) {
        setActiveSession(prev => prev ? { ...prev, ...updated } : updated);
      }
    });
    return () => unsubSession();
  }, [activeSession?.id]);

  // Update Trust Score helper (persisting to Firestore)
  const applyTrustDelta = (
    delta: number, 
    reason: string, 
    category: TrustLedgerEntry['category'], 
    sessionRef?: string
  ) => {
    const newScore = Math.max(0, Math.min(100, currentUser.trustScore + delta));
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
    setCurrentUser(prev => ({
      ...prev,
      trustScore: newScore,
    }));

    if (sessionUser) {
      addTrustLedgerEntryInFirestore(sessionUser.uid, delta, newScore, reason, category, sessionRef);
    }
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
    const roomCode = `#LP-${randomRoomNumber}`;
    const sessionId = `sess_${Date.now()}`;

    const newSession: ExchangeSession = {
      id: sessionId,
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
        lastActionText: 'Peer connected. Real-time Firebase room initialized.',
        latencyMs: 18,
      },
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setActiveSession(newSession);
    setProposePartner(null);
    setActiveTab('room');

    if (sessionUser) {
      updateSessionInFirestore(sessionId, newSession).catch(err => console.warn('Firestore session write:', err));
    }

    showToast(`Exchange Room ${roomCode} active with @${proposePartner.username}`, 'info');
  };

  // Accept Incoming Proposal
  const handleAcceptIncomingProposal = (proposal: ExchangeProposal) => {
    const count = proposal.packageType === '5x5' ? 5 : 10;
    const baseUserLinks: string[] = Array(count).fill('');

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
    const roomCode = `#LP-${randomRoomNumber}`;
    const sessionId = proposal.id.startsWith('ses_') ? proposal.id : `sess_${Date.now()}`;

    const newSession: ExchangeSession = {
      id: sessionId,
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
        lastActionText: 'Proposal accepted. Real-time Firebase room synchronized.',
        latencyMs: 14,
      },
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setActiveSession(newSession);
    setIncomingProposal(null);
    setActiveTab('room');

    if (sessionUser) {
      updateSessionInFirestore(sessionId, newSession).catch(err => console.warn('Firestore proposal acceptance:', err));
    }

    showToast(`Joined Exchange Room ${roomCode} with @${proposal.sender.username}`, 'success');
  };

  const handleDeclineIncomingProposal = () => {
    if (incomingProposal && sessionUser && incomingProposal.id.startsWith('ses_')) {
      updateSessionInFirestore(incomingProposal.id, { status: 'cancelled' }).catch(() => {});
    }
    setIncomingProposal(null);
    showToast('Incoming proposal declined.', 'info');
  };

  const handleSimulateNewIncomingProposal = async () => {
    const availablePeers = peers.filter(p => p.onlineStatus === 'online' && p.trustScore >= 75);
    const randomPeer = availablePeers[Math.floor(Math.random() * availablePeers.length)] || peers[0];
    if (!randomPeer) {
      showToast('No other peers in the pool yet. Wait for a peer to register or invite a partner!', 'info');
      return;
    }

    if (sessionUser) {
      try {
        await sendExchangeProposalToFirestore(
          randomPeer,
          currentUser,
          '5x5',
          30,
          [
            `https://${randomPeer.preferredShorteners[0] || 'shrinkme.io'}/download-bundle`,
            `https://${randomPeer.preferredShorteners[0] || 'shrinkme.io'}/free-asset-pack`,
            `https://${randomPeer.preferredShorteners[1] || 'ouo.io'}/exclusive-release-v3`,
            `https://${randomPeer.preferredShorteners[0] || 'shrinkme.io'}/direct-zip-source`,
            `https://${randomPeer.preferredShorteners[1] || 'ouo.io'}/cloud-link-backup`,
          ],
          'Looking for prompt verification! Real-time 5x5 exchange requested.'
        );
        showToast(`Broadcasting exchange invite with @${randomPeer.username} via Firebase`, 'info');
      } catch (err) {
        console.warn('Failed to broadcast proposal to Firestore:', err);
      }
    } else {
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
    }
  };

  // Complete Exchange Session
  const handleCompleteSession = (rating: { stars: number; tags: string[]; feedback: string }) => {
    if (!activeSession) return;

    const partner = activeSession.partner;
    const sessionRef = activeSession.roomCode;

    // 1. Reward Trust Score (+2)
    applyTrustDelta(2, `Completed ${activeSession.packageType} exchange with @${partner.username}`, 'exchange_success', sessionRef);

    // 2. Increment lifetime exchanges and update user stats in Firestore
    const nextExchanges = currentUser.lifetimeExchanges + 1;
    const nextScore = Math.min(100, currentUser.trustScore + 2);
    setCurrentUser(prev => ({
      ...prev,
      lifetimeExchanges: nextExchanges,
      trustScore: nextScore,
    }));

    if (sessionUser) {
      updateUserProfileInFirestore(sessionUser.uid, {
        lifetimeExchanges: nextExchanges,
        trustScore: nextScore,
      });
    }

    // 3. Register 24-Hour IP Cooldown for this partner in Firestore
    const newCooldown: IPCooldownRecord = {
      partnerId: partner.id,
      partnerUsername: partner.username,
      partnerIp: partner.ipAddress,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      initiatedAt: new Date().toISOString(),
    };
    setIpCooldowns(prev => [newCooldown, ...prev.filter(c => c.partnerId !== partner.id)]);
    if (sessionUser) {
      addCooldownInFirestore(sessionUser.uid, newCooldown);
    }

    // 4. Update session status in Firestore
    if (sessionUser && activeSession.id) {
      updateSessionInFirestore(activeSession.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        mutualRating: rating,
      });
    }

    // Reset session and return to marketplace
    setActiveSession(null);
    setActiveTab('marketplace');
    showToast(`Exchange ${sessionRef} finalized. +2 Trust Score & 24h IP isolation stored to Firebase.`, 'success');
  };

  // Forfeit / Abandon Session
  const handleAbandonSession = () => {
    if (!activeSession) return;

    const sessionRef = activeSession.roomCode;
    const partner = activeSession.partner;

    applyTrustDelta(-10, `Abandoned active exchange room with @${partner.username}`, 'session_abandon', sessionRef);

    if (sessionUser && activeSession.id) {
      updateSessionInFirestore(activeSession.id, {
        status: 'cancelled',
      });
    }

    setActiveSession(null);
    setActiveTab('marketplace');
    showToast(`Session forfeited. -10 Trust Score penalty applied to Firebase audit log.`, 'alert');
  };

  // Submit Formal Dispute
  const handleSubmitDispute = (reason: string, notes: string, evidenceUrl?: string) => {
    if (!activeSession) return;

    const sessionRef = activeSession.roomCode;
    const partner = activeSession.partner;

    if (sessionUser && activeSession.id) {
      updateSessionInFirestore(activeSession.id, {
        status: 'disputed',
        dispute: {
          reason,
          notes,
          evidenceUrl,
          filedAt: new Date().toISOString(),
          status: 'under_review',
        }
      });
    }

    setShowDisputeModal(false);
    setActiveSession(null);
    setActiveTab('marketplace');
    showToast(`Dispute lodged for ${sessionRef}. Session frozen in Firebase.`, 'alert');
  };

  const handleToggleFavorite = (peerId: string) => {
    setPeers(prev =>
      prev.map(p => {
        if (p.id === peerId) {
          const nextFav = !p.isFavorite;
          if (sessionUser) {
            updateUserProfileInFirestore(p.id, { isFavorite: nextFav });
          }
          return { ...p, isFavorite: nextFav };
        }
        return p;
      })
    );
  };

  const handleToggleUserStatus = () => {
    const nextStatus = currentUser.onlineStatus === 'online' ? 'away' : 'online';
    setCurrentUser(prev => ({
      ...prev,
      onlineStatus: nextStatus,
    }));
    if (sessionUser) {
      updateUserProfileInFirestore(sessionUser.uid, { onlineStatus: nextStatus });
    }
  };

  const handleUpdateSession = (updated: ExchangeSession) => {
    setActiveSession(updated);
    if (sessionUser && updated.id) {
      updateSessionInFirestore(updated.id, updated).catch(() => {});
    }
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
            onUpdateSession={handleUpdateSession}
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
