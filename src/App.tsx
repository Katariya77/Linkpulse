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
import { AdminPanel } from './components/AdminPanel';
import { NotificationsPage } from './components/NotificationsPage';
import { PremiumBuyPage } from './components/PremiumBuyPage';
import { ReferralPage } from './components/ReferralPage';
import { subscribeToAuth, logoutUser, firebaseConfig, AuthSessionUser } from './lib/firebase';
import { DisputeModal } from './components/DisputeModal';
import { TrustInspectorModal } from './components/TrustInspectorModal';
import { WaitingExchangeScreen } from './components/WaitingExchangeScreen';
import { RequestTimeoutModal } from './components/RequestTimeoutModal';
import { 
  User, 
  UserStatus,
  ExchangeSession, 
  ExchangeLink, 
  TrustLedgerEntry, 
  IPCooldownRecord, 
  DailyGoal, 
  ExchangeProposal, 
  OutgoingInvitation,
  PackageType,
  PublicTabId,
  TabAccessConfig,
  DEFAULT_TAB_ACCESS,
  AppNotification
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
  REAL_INITIAL_GOALS,
  isUserAdmin,
  subscribeToTabAccess,
  saveTabAccessInFirestore,
  ADMIN_EMAIL,
  activatePremiumSubscription,
  checkIsProMember,
  setLocalProStatus,
  clearLocalProStatus
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
  soundAlerts: true,
  autoAcceptMatches: false,
  poolVisibility: true,
};

const INITIAL_MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'match',
    title: 'Exchange Match Accepted',
    message: 'Elena Rostova (Trust 96) accepted your 5x5 shortlink proposal. Room #LP-8821 is active and awaiting link clicks.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    timeAgo: '5m ago',
    isRead: false,
    actionTab: 'room',
    actionLabel: 'Enter Room',
    actor: {
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      trustScore: 96,
    },
  },
  {
    id: 'notif-2',
    type: 'verification',
    title: 'Shortlink Click Verified',
    message: 'Marcus Chen verified your shrinkme.io link with 35s dwell time. Link recorded successfully in session history.',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    timeAgo: '22m ago',
    isRead: false,
    actionTab: 'marketplace',
    actionLabel: 'View Pool',
    actor: {
      name: 'Marcus Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      trustScore: 88,
    },
  },
  {
    id: 'notif-3',
    type: 'trust',
    title: 'Trust Score Rating Upgraded',
    message: 'Your score was raised to 100/100 (+2pts) for maintaining a 100% completion rate over 10 consecutive exchange sessions.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    timeAgo: '2h ago',
    isRead: false,
    actionTab: 'auth',
    actionLabel: 'View Trust Profile',
  },
  {
    id: 'notif-4',
    type: 'quest',
    title: 'Daily Quest Completed: Speed Runner',
    message: 'You completed 3 link verifications within the 45s target dwell window today. +150 Community XP collected!',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    timeAgo: '5h ago',
    isRead: true,
    actionTab: 'goals',
    actionLabel: 'Daily Quests',
  },
  {
    id: 'notif-5',
    type: 'security',
    title: 'Anti-Cheat Audit Passed',
    message: 'Automated LinkPulse Telemetry verified tab focus adherence and IP consistency for your recent exchanges.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    timeAgo: '1d ago',
    isRead: true,
  },
  {
    id: 'notif-6',
    type: 'system',
    title: 'LinkPulse System Update v2.4',
    message: 'Firestore real-time synchronization is active for online discovery pools and session verification logs.',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    timeAgo: '2d ago',
    isRead: true,
  },
];

export default function App() {
  // Navigation tab (Default to 'auth' for new/unauthenticated visitors)
  const [activeTab, setActiveTab] = useState<'marketplace' | 'room' | 'leaderboard' | 'goals' | 'auth' | 'admin' | 'notifications' | 'premium' | 'referral'>('auth');
  const [isFirstTimeSignUp, setIsFirstTimeSignUp] = useState<boolean>(false);

  // Incoming referral link detection (?ref=LP-XYZ)
  const [urlReferralCode, setUrlReferralCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) return ref.trim().toUpperCase();
      try {
        return sessionStorage.getItem('linkpulse_pending_ref') || '';
      } catch (e) {}
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        setUrlReferralCode(cleanRef);
        try {
          sessionStorage.setItem('linkpulse_pending_ref', cleanRef);
        } catch (e) {}
      }
    }
  }, []);

  // Firebase authenticated session state
  const [sessionUser, setSessionUser] = useState<AuthSessionUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Tab access configuration (synced from Firestore)
  const [tabAccessConfig, setTabAccessConfig] = useState<TabAccessConfig>(DEFAULT_TAB_ACCESS);

  // Notifications State (persisted locally with mock starter data)
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem('linkpulse_mock_notifications');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return INITIAL_MOCK_NOTIFICATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('linkpulse_mock_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleResetMockNotifications = () => {
    setNotifications(INITIAL_MOCK_NOTIFICATIONS);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

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

  // Outgoing exchange invitation state & 30s countdown
  const [outgoingInvitation, setOutgoingInvitation] = useState<OutgoingInvitation | null>(null);
  const [inviteSecondsRemaining, setInviteSecondsRemaining] = useState<number>(30);
  const [timeoutPartner, setTimeoutPartner] = useState<User | null>(null);

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

  // Check if current user has admin privileges (assigned to test@gmail.com or ccs.krishnakatariya@gmail.com)
  const isAdmin = isUserAdmin(currentUser, sessionUser);
  const isProMember = checkIsProMember(currentUser, sessionUser);

  // Subscribe to public tab visibility settings in real time
  useEffect(() => {
    const unsub = subscribeToTabAccess((config) => {
      setTabAccessConfig(config);
    });
    return () => unsub();
  }, []);

  // Strict Access Control and URL / Address Bar Synchronization:
  // - Unauthenticated visitors: ONLY allowed on 'auth'. Changing address bar URL/hash redirects to '#auth'.
  // - Free users (logged in, !isProMember): ONLY allowed on 'premium'. Changing address bar URL/hash redirects to '#premium'.
  // - Pro members and Admins: Full unhindered navigation across all tabs with live URL hash sync.
  useEffect(() => {
    if (isAuthLoading) return;

    // 1. Guest users: strictly locked to 'auth'
    if (!sessionUser) {
      if (activeTab !== 'auth') {
        setActiveTab('auth');
      }
      if (window.location.hash !== '#auth') {
        window.history.replaceState(null, '', '#auth');
      }
      return;
    }

    // 2. Free users: strictly locked to 'premium'
    if (!isProMember) {
      if (activeTab !== 'premium') {
        setActiveTab('premium');
      }
      if (window.location.hash !== '#premium') {
        window.history.replaceState(null, '', '#premium');
      }
      return;
    }

    // 3. Pro members and Admin: Full navigation allowed
    // Helper to determine first non-hidden fallback tab for non-admin users
    const getFirstVisibleTab = (): typeof activeTab => {
      const candidateTabs: PublicTabId[] = ['marketplace', 'room', 'leaderboard', 'goals', 'referral', 'auth'];
      const visible = candidateTabs.find((tabId) => !tabAccessConfig.hiddenTabs.includes(tabId));
      return visible || 'notifications';
    };

    if (activeTab === 'admin' && !isAdmin) {
      const fallback = getFirstVisibleTab();
      setActiveTab(fallback);
      window.history.replaceState(null, '', `#${fallback}`);
      return;
    }

    // Strict Tab Access Protocol: If a tab is hidden by admin, hide and block it for EVERYONE except admin!
    if (!isAdmin && tabAccessConfig.hiddenTabs.includes(activeTab as any)) {
      const fallback = getFirstVisibleTab();
      setActiveTab(fallback);
      window.history.replaceState(null, '', `#${fallback}`);
      return;
    }

    // Keep the browser address bar hash synchronized with activeTab
    if (window.location.hash !== `#${activeTab}`) {
      window.history.replaceState(null, '', `#${activeTab}`);
    }
  }, [sessionUser, isProMember, isAdmin, isAuthLoading, activeTab, tabAccessConfig.hiddenTabs]);

  // Handle browser Back/Forward navigation and manual address bar URL hash changes
  useEffect(() => {
    const handleHashOrPopState = () => {
      if (isAuthLoading) return;

      if (!sessionUser) {
        if (window.location.hash !== '#auth') {
          window.history.replaceState(null, '', '#auth');
        }
        setActiveTab('auth');
        return;
      }

      if (!isProMember) {
        if (window.location.hash !== '#premium') {
          window.history.replaceState(null, '', '#premium');
        }
        setActiveTab('premium');
        return;
      }

      const currentHash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const validTabs: Array<typeof activeTab> = [
        'marketplace',
        'room',
        'leaderboard',
        'goals',
        'auth',
        'admin',
        'notifications',
        'premium',
        'referral'
      ];

      const getFirstVisibleTab = (): typeof activeTab => {
        const candidateTabs: PublicTabId[] = ['marketplace', 'room', 'leaderboard', 'goals', 'referral', 'auth'];
        const visible = candidateTabs.find((tabId) => !tabAccessConfig.hiddenTabs.includes(tabId));
        return visible || 'notifications';
      };

      if (currentHash && validTabs.includes(currentHash as any)) {
        if (currentHash === 'admin' && !isAdmin) {
          const fallback = getFirstVisibleTab();
          setActiveTab(fallback);
          window.history.replaceState(null, '', `#${fallback}`);
        } else if (!isAdmin && tabAccessConfig.hiddenTabs.includes(currentHash as any)) {
          // Block non-admin users from navigating to admin-hidden tabs via hash
          const fallback = getFirstVisibleTab();
          setActiveTab(fallback);
          window.history.replaceState(null, '', `#${fallback}`);
        } else {
          setActiveTab(currentHash as any);
        }
      }
    };

    window.addEventListener('hashchange', handleHashOrPopState);
    window.addEventListener('popstate', handleHashOrPopState);
    return () => {
      window.removeEventListener('hashchange', handleHashOrPopState);
      window.removeEventListener('popstate', handleHashOrPopState);
    };
  }, [sessionUser, isProMember, isAdmin, isAuthLoading, tabAccessConfig.hiddenTabs]);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    clearLocalProStatus();
    setIsFirstTimeSignUp(false);
    setSessionUser(null);
    setCurrentUser(INITIAL_FALLBACK_USER);
    setActiveTab('auth');
    showToast('Signed out of LinkPulse', 'info');
  };

  // Helper to safely navigate to the default landing tab (respecting admin-hidden tabs)
  const navigateToDefaultTab = () => {
    if (!isAdmin && tabAccessConfig.hiddenTabs.includes('marketplace')) {
      const candidates: PublicTabId[] = ['room', 'leaderboard', 'goals', 'referral', 'auth'];
      const available = candidates.find((t) => !tabAccessConfig.hiddenTabs.includes(t));
      setActiveTab(available || 'notifications');
    } else {
      setActiveTab('marketplace');
    }
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

  // Handle Propose Exchange Action (fallback modal)
  const handleOpenProposeModal = (partner: User) => {
    setProposePartner(partner);
    setActiveTab('room');
  };

  // Handle Invite to Exchange: Sends request to User B and displays waiting screen to User A
  const handleInviteToExchange = async (partner: User) => {
    // Check if cooldown is active
    const cooldownRecord = ipCooldowns.find(c => c.partnerId === partner.id);
    if (cooldownRecord && new Date(cooldownRecord.expiresAt).getTime() > Date.now()) {
      showToast(`24-hour IP cooldown active with @${partner.username}. Please select another peer.`, 'alert');
      return;
    }

    const shortener1 = currentUser.preferredShorteners?.[0] || 'shrinkme.io';
    const shortener2 = currentUser.preferredShorteners?.[1] || 'ouo.io';
    const senderLinks = [
      `https://${shortener1}/ref-${currentUser.username.toLowerCase()}-dl1`,
      `https://${shortener1}/ref-${currentUser.username.toLowerCase()}-dl2`,
      `https://${shortener2}/ref-${currentUser.username.toLowerCase()}-pk3`,
      `https://${shortener1}/ref-${currentUser.username.toLowerCase()}-dl4`,
      `https://${shortener2}/ref-${currentUser.username.toLowerCase()}-pk5`,
    ];

    let sessionId = `ses_${Date.now()}`;
    if (sessionUser) {
      try {
        sessionId = await sendExchangeProposalToFirestore(
          currentUser,
          partner,
          '5x5',
          30,
          senderLinks,
          'Ready for instant 5x5 link exchange verification.'
        );
      } catch (err) {
        console.warn('Failed to send proposal to Firestore:', err);
      }
    }

    const invitation: OutgoingInvitation = {
      sessionId,
      partner,
      packageType: '5x5',
      dwellTime: 30,
      senderLinks,
      createdAt: Date.now(),
      status: 'pending',
    };

    setOutgoingInvitation(invitation);
    setInviteSecondsRemaining(30);
    setActiveTab('marketplace');

    // Add activity notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      type: 'match',
      title: 'Exchange Invitation Sent',
      message: `Sent 5x5 exchange invitation to @${partner.username}. Awaiting response...`,
      timestamp: new Date().toISOString(),
      timeAgo: 'Just now',
      isRead: false,
      actionTab: 'marketplace',
      actionLabel: 'Discovery Pool',
      actor: {
        name: partner.username,
        avatar: partner.avatar,
        trustScore: partner.trustScore,
      },
    };
    setNotifications(prev => [newNotif, ...prev]);
    showToast(`Exchange invitation sent to @${partner.username}. Waiting for acceptance...`, 'info');
  };

  // Cancel Outgoing Invitation
  const handleCancelOutgoingInvitation = () => {
    if (outgoingInvitation && sessionUser && outgoingInvitation.sessionId.startsWith('ses_')) {
      updateSessionInFirestore(outgoingInvitation.sessionId, { status: 'cancelled' }).catch(() => {});
    }
    setOutgoingInvitation(null);
    showToast('Exchange invitation cancelled.', 'info');
  };

  // Simulate Peer Acceptance (for single-tab development preview evaluation)
  const handleSimulatePeerAccept = () => {
    if (!outgoingInvitation) return;
    const partner = outgoingInvitation.partner;
    const count = 5;
    const dwellTime = 30;

    const userLinks: ExchangeLink[] = outgoingInvitation.senderLinks.map((url, i) => ({
      id: `usr_link_${i + 1}`,
      url,
      shortenerName: extractDomain(url),
      status: 'pending',
      dwellTimeRequired: dwellTime,
      dwellTimeRemaining: dwellTime,
      isOpened: false,
    }));

    const partnerBase = [
      `https://${partner.preferredShorteners[0] || 'shrinkme.io'}/media-release-v2`,
      `https://${partner.preferredShorteners[1] || 'ouo.io'}/crypto-bonus-pack`,
      `https://${partner.preferredShorteners[0] || 'shrinkme.io'}/direct-download-mirror`,
      `https://${partner.preferredShorteners[1] || 'ouo.io'}/software-key-patch`,
      `https://${partner.preferredShorteners[0] || 'shrinkme.io'}/tech-setup-notes`,
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
    const sessionId = outgoingInvitation.sessionId;

    const newSession: ExchangeSession = {
      id: sessionId,
      roomCode,
      partner,
      packageType: '5x5',
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
        lastActionText: 'Peer connected. Real-time Firebase room synchronized.',
        latencyMs: 14,
      },
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    if (sessionUser && sessionId.startsWith('ses_')) {
      updateSessionInFirestore(sessionId, newSession).catch(() => {});
    }

    setActiveSession(newSession);
    setOutgoingInvitation(null);
    setActiveTab('room');
    showToast(`@${partner.username} accepted! Entering room ${roomCode}`, 'success');
  };

  // Monitor 30-second countdown for outgoing exchange invitation & subscribe to session updates
  useEffect(() => {
    if (!outgoingInvitation || outgoingInvitation.status !== 'pending') {
      return;
    }

    const timer = setInterval(() => {
      setInviteSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 30-second acceptance timeout exceeded!
          const expiredPartner = outgoingInvitation.partner;
          if (sessionUser && outgoingInvitation.sessionId.startsWith('ses_')) {
            updateSessionInFirestore(outgoingInvitation.sessionId, { status: 'cancelled' }).catch(() => {});
          }
          setOutgoingInvitation(null);
          setTimeoutPartner(expiredPartner);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let unsubscribeSession = () => {};
    if (sessionUser && outgoingInvitation.sessionId.startsWith('ses_')) {
      unsubscribeSession = subscribeToExchangeSession(outgoingInvitation.sessionId, (liveSession) => {
        if (!liveSession) return;

        if (liveSession.status === 'active') {
          clearInterval(timer);
          const userLinks = outgoingInvitation.senderLinks.map((url, i) => ({
            id: `usr_link_${i + 1}`,
            url,
            shortenerName: extractDomain(url),
            status: 'pending' as const,
            dwellTimeRequired: outgoingInvitation.dwellTime,
            dwellTimeRemaining: outgoingInvitation.dwellTime,
            isOpened: false,
          }));

          const partnerLinks = Array.isArray(liveSession.userLinks) && liveSession.userLinks.length > 0
            ? liveSession.userLinks
            : outgoingInvitation.partner.preferredShorteners.map((sh, i) => ({
                id: `ptr_link_${i + 1}`,
                url: `https://${sh}/dest-${i + 1}`,
                shortenerName: sh,
                status: 'pending' as const,
                dwellTimeRequired: outgoingInvitation.dwellTime,
                dwellTimeRemaining: outgoingInvitation.dwellTime,
                isOpened: false,
              }));

          const synchronizedSession: ExchangeSession = {
            ...liveSession,
            partner: outgoingInvitation.partner,
            userLinks,
            partnerLinks,
          };

          setActiveSession(synchronizedSession);
          setOutgoingInvitation(null);
          setActiveTab('room');
          showToast(`@${outgoingInvitation.partner.username} accepted your exchange! Entering room...`, 'success');
        } else if (liveSession.status === 'cancelled') {
          clearInterval(timer);
          setOutgoingInvitation(prev => prev ? { ...prev, status: 'declined' } : null);
        }
      });
    }

    return () => {
      clearInterval(timer);
      unsubscribeSession();
    };
  }, [outgoingInvitation?.sessionId, outgoingInvitation?.status, sessionUser]);

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
    const shortenerB1 = currentUser.preferredShorteners?.[0] || 'shrinkme.io';
    const shortenerB2 = currentUser.preferredShorteners?.[1] || 'ouo.io';
    const baseUserLinks: string[] = [
      `https://${shortenerB1}/ref-${currentUser.username.toLowerCase()}-dl1`,
      `https://${shortenerB1}/ref-${currentUser.username.toLowerCase()}-dl2`,
      `https://${shortenerB2}/ref-${currentUser.username.toLowerCase()}-pk3`,
      `https://${shortenerB1}/ref-${currentUser.username.toLowerCase()}-dl4`,
      `https://${shortenerB2}/ref-${currentUser.username.toLowerCase()}-pk5`,
      `https://${shortenerB1}/ref-${currentUser.username.toLowerCase()}-dl6`,
      `https://${shortenerB2}/ref-${currentUser.username.toLowerCase()}-pk7`,
      `https://${shortenerB1}/ref-${currentUser.username.toLowerCase()}-dl8`,
      `https://${shortenerB2}/ref-${currentUser.username.toLowerCase()}-pk9`,
      `https://${shortenerB1}/ref-${currentUser.username.toLowerCase()}-dl10`,
    ];

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
    const nextStatus: UserStatus = currentUser.onlineStatus === 'online' ? 'offline' : 'online';
    setCurrentUser(prev => ({
      ...prev,
      onlineStatus: nextStatus,
    }));
    if (sessionUser) {
      updateUserProfileInFirestore(sessionUser.uid, { onlineStatus: nextStatus }).catch(console.error);
    }
    showToast(`Status changed to ${nextStatus.toUpperCase()}`, 'info');
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    setCurrentUser(prev => ({
      ...prev,
      ...updates,
    }));
    if (sessionUser) {
      updateUserProfileInFirestore(sessionUser.uid, updates).catch(console.error);
    }
    showToast('Profile updated successfully.', 'success');
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
          onAuthSuccess={(user, isSignUp) => {
            setSessionUser(user);
            setCurrentUser(prev => ({
              ...prev,
              username: user.displayName || prev.username,
              email: user.email || undefined,
              avatar: user.photoURL || prev.avatar,
              authProvider: user.providerId,
            }));
            const isPro = checkIsProMember(currentUser, user);
            showToast(`Welcome to LinkPulse, ${user.displayName || user.email}!`, 'success');
            if (isSignUp || !isPro) {
              setIsFirstTimeSignUp(Boolean(isSignUp));
              setActiveTab('premium');
            } else {
              setActiveTab('marketplace');
            }
          }}
          onSignOut={handleSignOut}
          onNavigateToApp={() => {}}
          onUpdateUser={handleUpdateUser}
          onToggleUserStatus={handleToggleUserStatus}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        sessionUser={sessionUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveSession={!!activeSession}
        activeRoomCode={activeSession?.roomCode}
        isAdmin={isAdmin}
        tabAccessConfig={tabAccessConfig}
        unreadNotificationsCount={unreadNotificationsCount}
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
        
        {/* PLATFORM ACCESS CONTROL GATE 1: Free guests can ONLY see AuthPage */}
        {!sessionUser ? (
          <AuthPage
            currentUser={currentUser}
            sessionUser={sessionUser}
            onAuthSuccess={(user, isSignUp) => {
              setSessionUser(user);
              setCurrentUser(prev => ({
                ...prev,
                username: user.displayName || prev.username,
                email: user.email || undefined,
                avatar: user.photoURL || prev.avatar,
                authProvider: user.providerId,
              }));
              const isPro = checkIsProMember(currentUser, user);
              showToast(`Logged in as ${user.displayName || user.email}`, 'success');
              if (isSignUp || !isPro) {
                setIsFirstTimeSignUp(Boolean(isSignUp));
                setActiveTab('premium');
              } else {
                navigateToDefaultTab();
              }
            }}
            onSignOut={handleSignOut}
            onNavigateToApp={() => navigateToDefaultTab()}
            onNavigateToPremium={() => {
              setIsFirstTimeSignUp(false);
              setActiveTab('premium');
            }}
            onUpdateUser={handleUpdateUser}
            onToggleUserStatus={handleToggleUserStatus}
          />
        ) : !isProMember ? (
          /* PLATFORM ACCESS CONTROL GATE 2: Free users CANNOT skip or access app - ONLY Premium Buy Page */
          <PremiumBuyPage
            currentUser={currentUser}
            isFirstTimeSignUp={isFirstTimeSignUp}
            onPlanPurchased={async ({ planName, price, razorpayPaymentId, razorpayOrderId }) => {
              const uid = sessionUser?.uid || currentUser.id || 'usr_' + Date.now();
              const email = sessionUser?.email || currentUser.email || 'user@linkpulse.io';
              const username = currentUser.username || 'Member';

              // 1. Immediately store Pro status locally & in state synchronously for zero latency
              setLocalProStatus(uid, email, planName, razorpayPaymentId, razorpayOrderId);
              setCurrentUser(prev => ({
                ...prev,
                isPremium: true,
                premiumPlan: planName,
                premiumPrice: price,
                premiumCurrency: 'INR',
                razorpayPaymentId,
                razorpayOrderId,
              }));
              setIsFirstTimeSignUp(false);
              navigateToDefaultTab();

              // 2. Persist to Firestore asynchronously
              try {
                await activatePremiumSubscription(
                  uid, 
                  email, 
                  username, 
                  currentUser.avatar,
                  'Razorpay / UPI / Cards',
                  razorpayPaymentId,
                  razorpayOrderId
                );
                showToast('LinkPulse Pro Monthly activated via Razorpay (₹10/mo)!', 'success');
              } catch (err) {
                console.error('Failed to sync premium with Firestore:', err);
                showToast('Pro activated! Welcome to LinkPulse.', 'success');
              }
            }}
            onContinueToApp={() => {
              const uid = sessionUser?.uid || currentUser.id;
              const email = sessionUser?.email || currentUser.email;
              setLocalProStatus(uid, email, 'Pro Monthly');
              setCurrentUser(prev => ({ ...prev, isPremium: true }));
              setIsFirstTimeSignUp(false);
              navigateToDefaultTab();
            }}
            onSignOut={handleSignOut}
          />
        ) : (
          /* PLATFORM ACCESS CONTROL GATE 3: Pro members and Admin have full access */
          <>
            {/* Tab 1: Marketplace / Online Discovery Pool */}
            {activeTab === 'marketplace' && (
          outgoingInvitation ? (
            <WaitingExchangeScreen
              partner={outgoingInvitation.partner}
              packageType={outgoingInvitation.packageType}
              dwellTime={outgoingInvitation.dwellTime}
              secondsRemaining={inviteSecondsRemaining}
              isDeclined={outgoingInvitation.status === 'declined'}
              onCancel={handleCancelOutgoingInvitation}
              onSimulateAccept={handleSimulatePeerAccept}
            />
          ) : (
            <DiscoveryPool
              currentUser={currentUser}
              peers={peers}
              ipCooldowns={ipCooldowns}
              incomingProposal={incomingProposal}
              onProposeExchange={handleInviteToExchange}
              onAcceptProposal={handleAcceptIncomingProposal}
              onDeclineProposal={handleDeclineIncomingProposal}
              onSimulateIncomingProposal={handleSimulateNewIncomingProposal}
              onToggleFavorite={handleToggleFavorite}
              onOpenTrustInspector={() => setShowTrustInspector(true)}
            />
          )
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
              navigateToDefaultTab();
            }}
            onJoinRoomByCode={(code) => {
              const eligible = peers.find(p => p.onlineStatus === 'online') || peers[0];
              showToast(`Joined session room ${code} with @${eligible.username}`, 'success');
              handleInviteToExchange(eligible);
            }}
          />
        )}

        {/* Tab 3: Full-Screen Reputation Leaderboard Page */}
        {activeTab === 'leaderboard' && (
          <LeaderboardPage
            currentUser={currentUser}
            peers={peers}
            onProposeExchange={(peer) => {
              handleInviteToExchange(peer);
            }}
            onBackToPool={() => navigateToDefaultTab()}
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
            onBackToPool={() => navigateToDefaultTab()}
          />
        )}

        {/* Tab 5: Firebase Authentication & Profile Page */}
        {activeTab === 'auth' && (
          <AuthPage
            currentUser={currentUser}
            sessionUser={sessionUser}
            onAuthSuccess={(user, isSignUp) => {
              setSessionUser(user);
              setCurrentUser(prev => ({
                ...prev,
                username: user.displayName || prev.username,
                email: user.email || undefined,
                avatar: user.photoURL || prev.avatar,
                authProvider: user.providerId,
              }));
              const isPro = checkIsProMember(currentUser, user);
              showToast(`Logged in as ${user.displayName || user.email}`, 'success');
              if (isSignUp || !isPro) {
                setIsFirstTimeSignUp(Boolean(isSignUp));
                setActiveTab('premium');
              } else {
                setActiveTab('marketplace');
              }
            }}
            onSignOut={handleSignOut}
            onNavigateToApp={() => setActiveTab('marketplace')}
            onNavigateToPremium={() => {
              setIsFirstTimeSignUp(false);
              setActiveTab('premium');
            }}
            onUpdateUser={handleUpdateUser}
            onToggleUserStatus={handleToggleUserStatus}
          />
        )}

        {/* Tab 6: Dedicated Admin Panel (Role: test@gmail.com) */}
        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminPanel
              currentUser={currentUser}
              sessionUser={sessionUser}
              tabAccess={tabAccessConfig}
              onUpdateTabAccess={async (update) => {
                try {
                  await saveTabAccessInFirestore(
                    update,
                    sessionUser?.email || currentUser.email || ADMIN_EMAIL
                  );
                  showToast('Visibility settings saved in real time.', 'success');
                } catch (err: any) {
                  console.error('Error saving tab access:', err);
                  showToast('Failed to save visibility settings.', 'alert');
                }
              }}
              onExitToPublic={() => navigateToDefaultTab()}
              onSignOut={handleSignOut}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-4 shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-950/60 border border-red-900/60 text-red-400 mx-auto">
                <Shield className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">Administrator Access Required</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The Admin Panel is reserved for system administrators. Please sign in with the assigned admin email (<strong className="text-red-300 font-mono">test@gmail.com</strong>).
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  id="admin-forbidden-signin-btn"
                  onClick={() => setActiveTab('auth')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Sign In as Admin
                </button>
                <button
                  type="button"
                  onClick={() => navigateToDefaultTab()}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
                >
                  Return to App
                </button>
              </div>
            </div>
          )
        )}

        {/* Tab 7: Dedicated Notifications & Activity Page */}
        {activeTab === 'notifications' && (
          <NotificationsPage
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDeleteNotification={handleDeleteNotification}
            onClearAllNotifications={handleClearAllNotifications}
            onResetMockNotifications={handleResetMockNotifications}
            onNavigateToTab={(tab) => {
              if (!isAdmin && tabAccessConfig.hiddenTabs.includes(tab as any)) {
                showToast('This tab is currently hidden by the administrator.', 'alert');
                return;
              }
              setActiveTab(tab);
            }}
            onBack={() => navigateToDefaultTab()}
          />
        )}

        {/* Tab 8: Premium Buy Page (Single plan ₹10/month) */}
        {activeTab === 'premium' && (
          <PremiumBuyPage
            currentUser={currentUser}
            isFirstTimeSignUp={isFirstTimeSignUp}
            onPlanPurchased={async ({ planName, price, razorpayPaymentId, razorpayOrderId }) => {
              const uid = sessionUser?.uid || currentUser.id || 'usr_' + Date.now();
              const email = sessionUser?.email || currentUser.email || 'user@linkpulse.io';
              const username = currentUser.username || 'Member';

              // 1. Immediately store Pro status locally & in state synchronously for zero latency
              setLocalProStatus(uid, email, planName, razorpayPaymentId, razorpayOrderId);
              setCurrentUser(prev => ({
                ...prev,
                isPremium: true,
                premiumPlan: planName,
                premiumPrice: price,
                premiumCurrency: 'INR',
                razorpayPaymentId,
                razorpayOrderId,
              }));
              setIsFirstTimeSignUp(false);
              navigateToDefaultTab();

              // 2. Persist to Firestore asynchronously
              try {
                await activatePremiumSubscription(
                  uid, 
                  email, 
                  username, 
                  currentUser.avatar,
                  'Razorpay / UPI / Cards',
                  razorpayPaymentId,
                  razorpayOrderId
                );
                showToast('LinkPulse Pro Monthly activated via Razorpay (₹10/mo)!', 'success');
              } catch (err) {
                console.error('Failed to sync premium with Firestore:', err);
                showToast('Pro activated! Welcome to LinkPulse.', 'success');
              }
            }}
            onContinueToApp={() => {
              const uid = sessionUser?.uid || currentUser.id;
              const email = sessionUser?.email || currentUser.email;
              setLocalProStatus(uid, email, 'Pro Monthly');
              setCurrentUser(prev => ({ ...prev, isPremium: true }));
              setIsFirstTimeSignUp(false);
              navigateToDefaultTab();
            }}
            onSignOut={handleSignOut}
          />
        )}

        {/* Tab 9: Dedicated Referral & Invitation Program */}
        {activeTab === 'referral' && (
          <ReferralPage
            currentUser={currentUser}
            initialReferralCodeFromUrl={urlReferralCode}
            onBackToPool={() => navigateToDefaultTab()}
            onOpenTrustInspector={() => setShowTrustInspector(true)}
          />
        )}
          </>
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

      {/* 30-second Exchange Request Timeout Modal */}
      <RequestTimeoutModal
        partner={timeoutPartner}
        onClose={() => setTimeoutPartner(null)}
      />

    </div>
  );
}
