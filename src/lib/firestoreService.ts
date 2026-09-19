import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured, AuthSessionUser } from './firebase';
import { 
  User, 
  ExchangeSession, 
  TrustLedgerEntry, 
  IPCooldownRecord, 
  DailyGoal, 
  ExchangeProposal,
  PublicTabId,
  TabAccessConfig,
  DEFAULT_TAB_ACCESS,
  PremiumSubscription,
  ReferralRecord
} from '../types';

export const ADMIN_EMAIL = 'test@gmail.com';
export const ADMIN_EMAILS = ['test@gmail.com', 'ccs.krishnakatariya@gmail.com'];

/**
 * Checks if a user has the admin role.
 * Assigned to test@gmail.com, ccs.krishnakatariya@gmail.com, or role === 'admin'.
 */
export function isUserAdmin(
  user?: { email?: string | null; role?: string } | null,
  sessionUser?: AuthSessionUser | null
): boolean {
  const matchesAdmin = (em?: string | null) => 
    em ? ADMIN_EMAILS.some(a => a.toLowerCase() === em.trim().toLowerCase()) : false;

  if (sessionUser && matchesAdmin(sessionUser.email)) {
    return true;
  }
  if (user && matchesAdmin(user.email)) {
    return true;
  }
  if (user && user.role === 'admin') {
    return true;
  }
  return false;
}

/**
 * Foolproof helper to check if a user qualifies as a Pro member.
 * Checks Admin status, user.isPremium flag, and locally persisted authorization.
 */
export function checkIsProMember(
  user?: { id?: string; email?: string | null; role?: string; isPremium?: boolean } | null,
  sessionUser?: AuthSessionUser | null
): boolean {
  if (isUserAdmin(user, sessionUser)) return true;
  if (user?.isPremium) return true;

  if (typeof window !== 'undefined') {
    try {
      if (localStorage.getItem('linkpulse_active_pro') === 'true') return true;
      if (user?.id && localStorage.getItem(`linkpulse_is_premium_${user.id}`) === 'true') return true;
      if (sessionUser?.uid && localStorage.getItem(`linkpulse_is_premium_${sessionUser.uid}`) === 'true') return true;
      if (user?.email && localStorage.getItem(`linkpulse_is_premium_${user.email.trim().toLowerCase()}`) === 'true') return true;
      if (sessionUser?.email && localStorage.getItem(`linkpulse_is_premium_${sessionUser.email.trim().toLowerCase()}`) === 'true') return true;
    } catch (e) {}
  }
  return false;
}

/**
 * Stores Pro status in localStorage for instant synchronization and zero-latency access
 */
export function setLocalProStatus(
  userId?: string,
  email?: string,
  planName: string = 'Pro Monthly',
  rzpPaymentId?: string,
  rzpOrderId?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('linkpulse_active_pro', 'true');
    localStorage.setItem('linkpulse_current_plan', planName);
    if (userId) {
      localStorage.setItem(`linkpulse_is_premium_${userId}`, 'true');
    }
    if (email) {
      localStorage.setItem(`linkpulse_is_premium_${email.trim().toLowerCase()}`, 'true');
    }
    if (rzpPaymentId) {
      localStorage.setItem('linkpulse_last_rzp_payment_id', rzpPaymentId);
    }
    if (rzpOrderId) {
      localStorage.setItem('linkpulse_last_rzp_order_id', rzpOrderId);
    }
  } catch (e) {}
}

/**
 * Clears local Pro status
 */
export function clearLocalProStatus(userId?: string, email?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('linkpulse_active_pro');
    localStorage.removeItem('linkpulse_current_plan');
    if (userId) {
      localStorage.removeItem(`linkpulse_is_premium_${userId}`);
    }
    if (email) {
      localStorage.removeItem(`linkpulse_is_premium_${email.trim().toLowerCase()}`);
    }
  } catch (e) {}
}

export const REAL_INITIAL_GOALS: DailyGoal[] = [
  {
    id: 'g_01',
    title: 'Complete 5 Exchange Sessions',
    description: 'Execute and verify 5 full 1-on-1 exchange sessions today',
    target: 5,
    current: 0,
    unit: 'sessions',
    rewardXp: 150,
    completed: false,
  },
  {
    id: 'g_02',
    title: 'Verify 25 Partner Links',
    description: 'Complete minimum dwell-time verification on 25 links',
    target: 25,
    current: 0,
    unit: 'links',
    rewardXp: 200,
    completed: false,
  },
  {
    id: 'g_03',
    title: 'Maintain 95+ Elite Trust Score',
    description: 'Avoid abandonments, idle penalties, and negative reports',
    target: 95,
    current: 100,
    unit: 'points',
    rewardXp: 100,
    completed: true,
  },
  {
    id: 'g_04',
    title: 'High-CPM Retention Pro',
    description: 'Perform an exchange with 45s dwell time requirement',
    target: 1,
    current: 0,
    unit: 'session',
    rewardXp: 120,
    completed: false,
  }
];

/**
 * Permanently removes any legacy mock, test, or synthetic node accounts from Firestore.
 */
export async function cleanupMockDataFromFirestore(): Promise<void> {
  if (!db) return;
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    for (const d of snap.docs) {
      const data = d.data();
      const id = d.id;
      if (
        data.isNetworkNode === true || 
        id.startsWith('node_') || 
        id.startsWith('usr_peer_') || 
        id === 'guest_user' ||
        id === 'usr_me_01'
      ) {
        await deleteDoc(d.ref).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Cleanup check warning:', err);
  }
}

/**
 * Ensures user document exists in Firestore and attaches a real-time listener.
 */
export function syncUserProfile(
  sessionUser: AuthSessionUser, 
  onUserUpdate: (user: User) => void
): () => void {
  if (!db) {
    const fallbackUser: User = {
      id: sessionUser.uid,
      username: sessionUser.displayName || sessionUser.email?.split('@')[0] || 'User',
      avatar: sessionUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      onlineStatus: 'online',
      trustScore: 100,
      successRate: 100,
      lifetimeExchanges: 0,
      activeStreak: 1,
      preferredShorteners: ['shrinkme.io', 'ouo.io'],
      ipAddress: '192.0.2.84',
      country: 'United States',
      countryCode: 'US',
      joinedDate: 'Just now',
      email: sessionUser.email || undefined,
      authProvider: sessionUser.providerId,
    };
    onUserUpdate(fallbackUser);
    return () => {};
  }

  const userDocRef = doc(db, 'users', sessionUser.uid);

  // Check if profile exists; if not, initialize in Firestore
  getDoc(userDocRef).then((snap) => {
    if (!snap.exists()) {
      const isAdminAccount = (sessionUser.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const generatedRefCode = 'LP-' + (sessionUser.displayName || sessionUser.email?.split('@')[0] || 'CREATOR')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

      const initialProfile: User = {
        id: sessionUser.uid,
        username: sessionUser.displayName || (isAdminAccount ? 'Admin (test)' : (sessionUser.email?.split('@')[0] || 'PeerUser')),
        avatar: sessionUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        onlineStatus: 'online',
        trustScore: 100,
        referralCode: generatedRefCode,
        referralXp: 0,
        referralsCount: 0,
        successRate: 100,
        lifetimeExchanges: 0,
        activeStreak: 1,
        preferredShorteners: ['shrinkme.io', 'ouo.io'],
        ipAddress: '192.0.2.84',
        country: 'United States',
        countryCode: 'US',
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        email: sessionUser.email || undefined,
        role: isAdminAccount ? 'admin' : 'member',
        authProvider: sessionUser.providerId,
      };

      setDoc(userDocRef, {
        ...initialProfile,
        goals: REAL_INITIAL_GOALS,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      }).catch(err => console.warn('Could not initialize user doc in Firestore:', err));

      // Also create initial ledger audit trail
      addDoc(collection(db, 'trust_ledger'), {
        userId: sessionUser.uid,
        delta: 0,
        resultingScore: 100,
        reason: 'Account initialized on LinkPulse network (Default Trust Score: 100)',
        category: 'streak_bonus',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
      }).catch(err => console.warn('Could not initialize ledger in Firestore:', err));
    } else {
      // Mark as online and update last active
      setDoc(userDocRef, {
        onlineStatus: 'online',
        lastActive: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
  }).catch(err => console.warn('User fetch check:', err));

  // Listen to live updates on the user's profile
  const unsubscribe = onSnapshot(userDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const isAdminAccount = (sessionUser.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() || data.role === 'admin';
      const isUserPro = checkIsProMember(
        { id: snap.id, email: sessionUser.email, isPremium: Boolean(data.isPremium), role: data.role },
        sessionUser
      );

      // Backfill referralCode if absent on existing account
      let userReferralCode = data.referralCode;
      if (!userReferralCode) {
        userReferralCode = 'LP-' + (data.username || sessionUser.displayName || 'CREATOR')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 6) + '-' + snap.id.slice(0, 4).toUpperCase();
        setDoc(userDocRef, { referralCode: userReferralCode, referralXp: data.referralXp || 0, referralsCount: data.referralsCount || 0 }, { merge: true }).catch(() => {});
      }

      const user: User = {
        id: snap.id,
        username: data.username || sessionUser.displayName || (isAdminAccount ? 'Admin (test)' : 'PeerUser'),
        avatar: data.avatar || sessionUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        onlineStatus: data.onlineStatus || 'online',
        trustScore: typeof data.trustScore === 'number' ? data.trustScore : 100,
        referralCode: userReferralCode,
        referralXp: typeof data.referralXp === 'number' ? data.referralXp : 0,
        referralsCount: typeof data.referralsCount === 'number' ? data.referralsCount : 0,
        referredBy: data.referredBy || undefined,
        successRate: typeof data.successRate === 'number' ? data.successRate : 100,
        lifetimeExchanges: typeof data.lifetimeExchanges === 'number' ? data.lifetimeExchanges : 0,
        activeStreak: typeof data.activeStreak === 'number' ? data.activeStreak : 1,
        preferredShorteners: Array.isArray(data.preferredShorteners) ? data.preferredShorteners : ['shrinkme.io', 'ouo.io'],
        ipAddress: data.ipAddress || '192.0.2.84',
        country: data.country || 'United States',
        countryCode: data.countryCode || 'US',
        joinedDate: data.joinedDate || 'Recently',
        email: sessionUser.email || undefined,
        role: isAdminAccount ? 'admin' : (data.role || 'member'),
        authProvider: sessionUser.providerId,
        isFavorite: Boolean(data.isFavorite),
        notes: data.notes || '',
        isPremium: isUserPro,
        premiumPlan: data.premiumPlan || (isUserPro ? 'Pro Monthly' : undefined),
        premiumPrice: typeof data.premiumPrice === 'number' ? data.premiumPrice : (isUserPro ? 10 : undefined),
        premiumCurrency: data.premiumCurrency || (isUserPro ? 'INR' : undefined),
        premiumActivatedAt: data.premiumActivatedAt || undefined,
        premiumExpiresAt: data.premiumExpiresAt || undefined,
        razorpayPaymentId: data.razorpayPaymentId || undefined,
        razorpayOrderId: data.razorpayOrderId || undefined,
      };
      onUserUpdate(user);
    }
  });

  return unsubscribe;
}

/**
 * Updates user profile fields in Firestore.
 */
export async function updateUserProfileInFirestore(
  uid: string, 
  data: Partial<User>
): Promise<void> {
  if (!db || !uid) return;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Real-time listener for the Discovery Pool peers from Firestore.
 */
export function subscribeToPeers(
  currentUserId: string, 
  onPeersUpdate: (peers: User[]) => void
): () => void {
  if (!db) {
    onPeersUpdate([]);
    return () => {};
  }

  const usersCol = collection(db, 'users');

  // Real-time snapshot listener on all real registered peers
  const unsubscribe = onSnapshot(usersCol, (snap) => {
    const list: User[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const id = d.id;
      // Exclude current user and any legacy or synthetic mock nodes
      if (
        id !== currentUserId &&
        !id.startsWith('node_') &&
        !id.startsWith('usr_peer_') &&
        id !== 'guest_user' &&
        id !== 'usr_me_01' &&
        !data.isNetworkNode
      ) {
        list.push({
          id: d.id,
          username: data.username || 'Peer',
          avatar: data.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          onlineStatus: data.onlineStatus || 'online',
          trustScore: typeof data.trustScore === 'number' ? data.trustScore : 100,
          successRate: typeof data.successRate === 'number' ? data.successRate : 100,
          lifetimeExchanges: typeof data.lifetimeExchanges === 'number' ? data.lifetimeExchanges : 0,
          activeStreak: typeof data.activeStreak === 'number' ? data.activeStreak : 0,
          preferredShorteners: Array.isArray(data.preferredShorteners) ? data.preferredShorteners : ['shrinkme.io', 'ouo.io'],
          ipAddress: data.ipAddress || '198.51.100.10',
          country: data.country || 'Global',
          countryCode: data.countryCode || 'UN',
          joinedDate: data.joinedDate || 'Recently',
          isFavorite: Boolean(data.isFavorite),
          notes: data.notes || '',
          isPremium: Boolean(data.isPremium),
        });
      }
    });

    // Real-time update with actual real users
    onPeersUpdate(list);
  }, (err) => {
    console.warn('Peers subscription warning:', err);
    onPeersUpdate([]);
  });

  return unsubscribe;
}

/**
 * Real-time listener for the User's Trust Score Ledger audit trail.
 */
export function subscribeToTrustLedger(
  userId: string, 
  onLedgerUpdate: (ledger: TrustLedgerEntry[]) => void
): () => void {
  if (!db || !userId) {
    onLedgerUpdate([]);
    return () => {};
  }

  const ledgerCol = collection(db, 'trust_ledger');
  const q = query(ledgerCol, where('userId', '==', userId));

  const unsubscribe = onSnapshot(q, (snap) => {
    const entries: TrustLedgerEntry[] = [];
    snap.forEach((d) => {
      const data = d.data();
      entries.push({
        id: d.id,
        timestamp: data.timestamp || 'Just now',
        delta: typeof data.delta === 'number' ? data.delta : 0,
        resultingScore: typeof data.resultingScore === 'number' ? data.resultingScore : 100,
        reason: data.reason || 'Trust score adjustment',
        category: data.category || 'exchange_success',
        sessionRef: data.sessionRef || undefined,
      });
    });

    // Sort by timestamp desc
    entries.sort((a, b) => b.id.localeCompare(a.id));
    onLedgerUpdate(entries);
  }, (err) => {
    console.warn('Trust ledger subscription warning:', err);
  });

  return unsubscribe;
}

/**
 * Appends a new trust score delta entry in Firestore and updates the user profile score.
 */
export async function addTrustLedgerEntryInFirestore(
  userId: string,
  delta: number,
  resultingScore: number,
  reason: string,
  category: TrustLedgerEntry['category'],
  sessionRef?: string
): Promise<void> {
  if (!db || !userId) return;

  try {
    await addDoc(collection(db, 'trust_ledger'), {
      userId,
      delta,
      resultingScore,
      reason,
      category,
      sessionRef: sessionRef || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp(),
    });

    // Update user trust score in users/{userId}
    await setDoc(doc(db, 'users', userId), {
      trustScore: resultingScore,
      lastScoreUpdate: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to add trust ledger entry:', err);
  }
}

/**
 * Real-time listener for incoming exchange proposals from Firestore.
 */
export function subscribeToIncomingProposals(
  userId: string,
  onProposalUpdate: (proposal: ExchangeProposal | null) => void
): () => void {
  if (!db || !userId) return () => {};

  const sessionsCol = collection(db, 'sessions');
  const q = query(
    sessionsCol, 
    where('partnerId', '==', userId), 
    where('status', '==', 'setup')
  );

  const unsubscribe = onSnapshot(q, (snap) => {
    if (snap.empty) {
      onProposalUpdate(null);
      return;
    }
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    const proposal: ExchangeProposal = {
      id: docSnap.id,
      sender: {
        id: data.senderId,
        username: data.senderUsername || 'Partner',
        avatar: data.senderAvatar || 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
        onlineStatus: 'online',
        trustScore: data.senderTrustScore || 90,
        successRate: 98,
        lifetimeExchanges: 50,
        activeStreak: 5,
        preferredShorteners: ['ouo.io'],
        ipAddress: data.senderIp || '203.0.113.45',
        country: 'United States',
        countryCode: 'US',
        joinedDate: '2025',
      },
      packageType: data.packageType || '5x5',
      dwellTime: data.dwellTimeSeconds || 30,
      senderLinks: Array.isArray(data.senderLinks) ? data.senderLinks : [],
      createdAt: data.createdAt || new Date().toISOString(),
      note: data.note || 'Ready for instant link exchange verification.',
    };
    onProposalUpdate(proposal);
  }, (err) => {
    console.warn('Proposal listener warning:', err);
  });

  return unsubscribe;
}

/**
 * Sends a real exchange proposal to Firestore.
 */
export async function sendExchangeProposalToFirestore(
  sender: User,
  partner: User,
  packageType: '5x5' | '10x10',
  dwellTimeSeconds: number,
  senderLinks: string[],
  note?: string
): Promise<string> {
  if (!db) return `sim_${Date.now()}`;

  const sessionId = `ses_${Date.now()}`;
  const roomCode = `#LP-${Math.floor(1000 + Math.random() * 9000)}`;

  await setDoc(doc(db, 'sessions', sessionId), {
    id: sessionId,
    roomCode,
    senderId: sender.id,
    senderUsername: sender.username,
    senderAvatar: sender.avatar,
    senderTrustScore: sender.trustScore,
    senderIp: sender.ipAddress,
    partnerId: partner.id,
    partnerUsername: partner.username,
    partnerAvatar: partner.avatar,
    partnerTrustScore: partner.trustScore,
    partnerIp: partner.ipAddress,
    packageType,
    dwellTimeSeconds,
    senderLinks,
    partnerLinks: [],
    status: 'setup',
    note: note || '',
    createdAt: new Date().toISOString(),
    serverTimestamp: serverTimestamp(),
  });

  return sessionId;
}

/**
 * Real-time listener for an active exchange session document.
 */
export function subscribeToExchangeSession(
  sessionId: string,
  onSessionUpdate: (session: ExchangeSession | null) => void
): () => void {
  if (!db || !sessionId) return () => {};

  const sessionRef = doc(db, 'sessions', sessionId);
  const unsubscribe = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      onSessionUpdate(null);
      return;
    }
    const data = snap.data();
    onSessionUpdate(data as ExchangeSession);
  }, (err) => {
    console.warn('Exchange session subscription warning:', err);
  });

  return unsubscribe;
}

/**
 * Updates active session progress in Firestore.
 */
export async function updateSessionInFirestore(
  sessionId: string,
  updates: Partial<ExchangeSession>
): Promise<void> {
  if (!db || !sessionId) return;
  await setDoc(doc(db, 'sessions', sessionId), {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Real-time listener for IP Cooldown records.
 */
export function subscribeToCooldowns(
  userId: string,
  onCooldownsUpdate: (cooldowns: IPCooldownRecord[]) => void
): () => void {
  if (!db || !userId) {
    onCooldownsUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'cooldowns');
  const q = query(colRef, where('userId', '==', userId));

  const unsubscribe = onSnapshot(q, (snap) => {
    const records: IPCooldownRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      records.push({
        partnerId: data.partnerId,
        partnerUsername: data.partnerUsername,
        partnerIp: data.partnerIp,
        expiresAt: data.expiresAt,
        initiatedAt: data.initiatedAt,
      });
    });
    onCooldownsUpdate(records);
  }, (err) => {
    console.warn('Cooldowns listener warning:', err);
  });

  return unsubscribe;
}

/**
 * Adds an IP cooldown record in Firestore.
 */
export async function addCooldownInFirestore(
  userId: string,
  record: IPCooldownRecord
): Promise<void> {
  if (!db || !userId) return;
  const cooldownId = `cd_${userId}_${record.partnerId}`;
  await setDoc(doc(db, 'cooldowns', cooldownId), {
    userId,
    ...record,
    createdAt: serverTimestamp(),
  });
}

const SETTINGS_COLLECTION = 'settings';
const TAB_ACCESS_DOC = 'tab_access';

/**
 * Subscribes to global public tab access configuration.
 */
export function subscribeToTabAccess(onUpdate: (config: TabAccessConfig) => void): () => void {
  // Read from localStorage first for immediate zero-latency hydration
  try {
    const cached = localStorage.getItem('linkpulse_tab_access');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.hiddenTabs)) {
        onUpdate(parsed);
      }
    }
  } catch (e) {}

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  const docRef = doc(db, SETTINGS_COLLECTION, TAB_ACCESS_DOC);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const config: TabAccessConfig = {
        hiddenTabs: Array.isArray(data.hiddenTabs) ? data.hiddenTabs : [],
        hideHeaderTrust: Boolean(data.hideHeaderTrust),
        hideHeaderAuthKey: Boolean(data.hideHeaderAuthKey),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || undefined,
        updatedBy: data.updatedBy,
      };
      try {
        localStorage.setItem('linkpulse_tab_access', JSON.stringify(config));
      } catch (e) {}
      onUpdate(config);
    } else {
      onUpdate(DEFAULT_TAB_ACCESS);
    }
  }, (err) => {
    console.warn('Tab access settings listener:', err);
  });
}

/**
 * Saves updated tab access visibility and header elements to Firestore.
 */
export async function saveTabAccessInFirestore(
  update: Partial<TabAccessConfig> | PublicTabId[],
  updatedByEmail?: string,
  extraOptions?: { hideHeaderTrust?: boolean; hideHeaderAuthKey?: boolean }
): Promise<void> {
  let hiddenTabs: PublicTabId[] = [];
  let hideHeaderTrust = false;
  let hideHeaderAuthKey = false;

  // Read current cached config as fallback base
  try {
    const cached = localStorage.getItem('linkpulse_tab_access');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.hiddenTabs)) hiddenTabs = parsed.hiddenTabs;
      if (typeof parsed.hideHeaderTrust === 'boolean') hideHeaderTrust = parsed.hideHeaderTrust;
      if (typeof parsed.hideHeaderAuthKey === 'boolean') hideHeaderAuthKey = parsed.hideHeaderAuthKey;
    }
  } catch (e) {}

  if (Array.isArray(update)) {
    hiddenTabs = update;
    if (extraOptions?.hideHeaderTrust !== undefined) hideHeaderTrust = extraOptions.hideHeaderTrust;
    if (extraOptions?.hideHeaderAuthKey !== undefined) hideHeaderAuthKey = extraOptions.hideHeaderAuthKey;
  } else if (typeof update === 'object' && update !== null) {
    if (Array.isArray(update.hiddenTabs)) hiddenTabs = update.hiddenTabs;
    if (update.hideHeaderTrust !== undefined) hideHeaderTrust = update.hideHeaderTrust;
    if (update.hideHeaderAuthKey !== undefined) hideHeaderAuthKey = update.hideHeaderAuthKey;
  }

  const config: TabAccessConfig = {
    hiddenTabs,
    hideHeaderTrust,
    hideHeaderAuthKey,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedByEmail || 'admin',
  };

  try {
    localStorage.setItem('linkpulse_tab_access', JSON.stringify(config));
  } catch (e) {}

  if (!db || !isFirebaseConfigured) return;
  const docRef = doc(db, SETTINGS_COLLECTION, TAB_ACCESS_DOC);
  await setDoc(docRef, {
    hiddenTabs,
    hideHeaderTrust,
    hideHeaderAuthKey,
    updatedAt: serverTimestamp(),
    updatedBy: updatedByEmail || 'admin',
  }, { merge: true });
}

export const PREMIUM_SUBSCRIPTIONS_COLLECTION = 'premium_subscriptions';

/**
 * Activates or grants premium status (₹10/mo single plan) to a user.
 * Writes to both the users collection and premium_subscriptions collection.
 */
export async function activatePremiumSubscription(
  userId: string,
  userEmail: string,
  username: string,
  userAvatar?: string,
  paymentMethod: string = 'Razorpay / UPI / Online',
  razorpayPaymentId?: string,
  razorpayOrderId?: string
): Promise<void> {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const nowIso = now.toISOString();
  const expiresIso = expires.toISOString();

  // 1. Immediately persist Pro authorization to local storage for zero-latency access
  setLocalProStatus(userId, userEmail, 'Pro Monthly', razorpayPaymentId, razorpayOrderId);

  // Maintain in local subscriptions ledger
  try {
    const cachedSubsRaw = localStorage.getItem('linkpulse_premium_subscriptions');
    let cachedSubs: PremiumSubscription[] = cachedSubsRaw ? JSON.parse(cachedSubsRaw) : [];
    const existingIndex = cachedSubs.findIndex(s => s.userId === userId);
    const newSub: PremiumSubscription = {
      id: userId,
      userId,
      userEmail: userEmail || 'member@linkpulse.io',
      username: username || 'Member',
      userAvatar,
      planId: 'pro_monthly_10rs',
      planName: 'Pro Monthly',
      price: 10,
      currency: 'INR',
      status: 'active',
      activatedAt: nowIso,
      expiresAt: expiresIso,
      paymentMethod,
      razorpayPaymentId,
      razorpayOrderId,
    };
    if (existingIndex >= 0) {
      cachedSubs[existingIndex] = newSub;
    } else {
      cachedSubs.unshift(newSub);
    }
    localStorage.setItem('linkpulse_premium_subscriptions', JSON.stringify(cachedSubs));
  } catch (e) {}

  // 2. Persist to Firestore asynchronously with isolated error catching
  if (db && isFirebaseConfigured) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        isPremium: true,
        premiumPlan: 'Pro Monthly',
        premiumPrice: 10,
        premiumCurrency: 'INR',
        premiumActivatedAt: nowIso,
        premiumExpiresAt: expiresIso,
        razorpayPaymentId: razorpayPaymentId || null,
        razorpayOrderId: razorpayOrderId || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (uErr) {
      console.warn('Could not update user doc in Firestore:', uErr);
    }

    try {
      const subRef = doc(db, PREMIUM_SUBSCRIPTIONS_COLLECTION, userId);
      await setDoc(subRef, {
        id: userId,
        userId,
        userEmail: userEmail || 'member@linkpulse.io',
        username: username || 'Member',
        userAvatar: userAvatar || '',
        planId: 'pro_monthly_10rs',
        planName: 'Pro Monthly',
        price: 10,
        currency: 'INR',
        status: 'active',
        activatedAt: nowIso,
        expiresAt: expiresIso,
        paymentMethod,
        razorpayPaymentId: razorpayPaymentId || null,
        razorpayOrderId: razorpayOrderId || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (sErr) {
      console.warn('Could not update subscription doc in Firestore:', sErr);
    }
  }
}

/**
 * Revokes or cancels a user's premium subscription.
 */
export async function cancelPremiumSubscription(userId: string): Promise<void> {
  clearLocalProStatus(userId);

  if (db && isFirebaseConfigured) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        isPremium: false,
        premiumPlan: null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {}

    try {
      const subRef = doc(db, PREMIUM_SUBSCRIPTIONS_COLLECTION, userId);
      await setDoc(subRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {}
  }

  try {
    const cachedSubsRaw = localStorage.getItem('linkpulse_premium_subscriptions');
    if (cachedSubsRaw) {
      let cachedSubs: PremiumSubscription[] = JSON.parse(cachedSubsRaw);
      cachedSubs = cachedSubs.map(s => s.userId === userId ? { ...s, status: 'cancelled' } : s);
      localStorage.setItem('linkpulse_premium_subscriptions', JSON.stringify(cachedSubs));
    }
  } catch (e) {}
}

/**
 * Real-time listener for all premium subscriptions (for the Admin Panel).
 */
export function subscribeToPremiumSubscriptions(
  onUpdate: (subscriptions: PremiumSubscription[]) => void
): () => void {
  // Read local cache immediately
  try {
    const cachedSubsRaw = localStorage.getItem('linkpulse_premium_subscriptions');
    if (cachedSubsRaw) {
      const parsed = JSON.parse(cachedSubsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdate(parsed);
      }
    }
  } catch (e) {}

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  const subCol = collection(db, PREMIUM_SUBSCRIPTIONS_COLLECTION);
  const unsubscribe = onSnapshot(subCol, (snap) => {
    const list: PremiumSubscription[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        userId: data.userId || docSnap.id,
        userEmail: data.userEmail || 'member@linkpulse.io',
        username: data.username || 'Member',
        userAvatar: data.userAvatar || undefined,
        planId: data.planId || 'pro_monthly_10rs',
        planName: data.planName || 'Pro Monthly',
        price: typeof data.price === 'number' ? data.price : 10,
        currency: data.currency || 'INR',
        status: data.status || 'active',
        activatedAt: data.activatedAt || new Date().toISOString(),
        expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: data.paymentMethod || 'UPI / Online',
      });
    });

    // Update local cache
    try {
      localStorage.setItem('linkpulse_premium_subscriptions', JSON.stringify(list));
    } catch (e) {}

    onUpdate(list);
  }, (err) => {
    console.warn('Premium subscriptions snapshot warning:', err);
  });

  return unsubscribe;
}

/**
 * Real-time listener for all registered users across the platform (for admin inspection).
 */
export function subscribeToAllUsers(
  onUpdate: (users: User[]) => void
): () => void {
  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  const usersCol = collection(db, 'users');
  const unsubscribe = onSnapshot(usersCol, (snap) => {
    const list: User[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const id = d.id;
      if (!data.isNetworkNode && id !== 'guest_user' && id !== 'usr_me_01') {
        list.push({
          id: d.id,
          username: data.username || 'Member',
          avatar: data.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          onlineStatus: data.onlineStatus || 'offline',
          trustScore: typeof data.trustScore === 'number' ? data.trustScore : 100,
          successRate: typeof data.successRate === 'number' ? data.successRate : 100,
          lifetimeExchanges: typeof data.lifetimeExchanges === 'number' ? data.lifetimeExchanges : 0,
          activeStreak: typeof data.activeStreak === 'number' ? data.activeStreak : 0,
          preferredShorteners: Array.isArray(data.preferredShorteners) ? data.preferredShorteners : ['shrinkme.io', 'ouo.io'],
          ipAddress: data.ipAddress || '198.51.100.10',
          country: data.country || 'Global',
          countryCode: data.countryCode || 'UN',
          joinedDate: data.joinedDate || 'Recently',
          email: data.email || undefined,
          role: data.role || 'member',
          isPremium: Boolean(data.isPremium),
          premiumPlan: data.premiumPlan || undefined,
          premiumPrice: data.premiumPrice || undefined,
          premiumCurrency: data.premiumCurrency || undefined,
          premiumActivatedAt: data.premiumActivatedAt || undefined,
          premiumExpiresAt: data.premiumExpiresAt || undefined,
        });
      }
    });
    onUpdate(list);
  }, (err) => {
    console.warn('All users snapshot warning:', err);
  });

  return unsubscribe;
}

/**
 * Real-time listener for referrals belonging to a specific referrer user.
 */
export function subscribeToUserReferrals(
  userId: string,
  onUpdate: (referrals: ReferralRecord[]) => void
): () => void {
  if (!db || !userId) {
    onUpdate([]);
    return () => {};
  }

  const referralsCol = collection(db, 'referrals');
  const q = query(referralsCol, where('referrerId', '==', userId));

  const unsubscribe = onSnapshot(q, (snap) => {
    const list: ReferralRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        referrerId: data.referrerId || userId,
        referrerEmail: data.referrerEmail || undefined,
        referrerCode: data.referrerCode || 'LP-CODE',
        referredUserId: data.referredUserId || 'usr_peer',
        referredUsername: data.referredUsername || 'Invited Creator',
        referredAvatar: data.referredAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        referralXpAwarded: typeof data.referralXpAwarded === 'number' ? data.referralXpAwarded : 50,
        trustScoreBoostAwarded: typeof data.trustScoreBoostAwarded === 'number' ? data.trustScoreBoostAwarded : 2,
        status: data.status || 'joined',
        createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })) : 'Recently',
      });
    });

    // Sort newest first
    list.sort((a, b) => b.id.localeCompare(a.id));
    onUpdate(list);
  }, (err) => {
    console.warn('User referrals snapshot warning:', err);
    onUpdate([]);
  });

  return unsubscribe;
}

/**
 * Records a successful referral award: grants Referral XP, boosts trust score, and writes a trust ledger entry.
 */
export async function recordReferralAward(
  referrerUser: User,
  invitedUsername: string,
  invitedAvatar: string = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  xpAmount: number = 50,
  trustBoost: number = 2
): Promise<{ success: boolean; newScore: number; newXp: number; record: ReferralRecord }> {
  const referrerId = referrerUser.id;
  const currentTrustScore = referrerUser.trustScore ?? 100;
  const currentReferralXp = referrerUser.referralXp ?? 0;
  const currentCount = referrerUser.referralsCount ?? 0;

  const newScore = Math.min(100, Math.max(0, currentTrustScore + trustBoost));
  const newXp = currentReferralXp + xpAmount;
  const newCount = currentCount + 1;

  const referralDocId = 'ref_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const nowFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const record: ReferralRecord = {
    id: referralDocId,
    referrerId,
    referrerEmail: referrerUser.email,
    referrerCode: referrerUser.referralCode || 'LP-LINKPULSE',
    referredUserId: 'usr_invited_' + Date.now(),
    referredUsername: invitedUsername,
    referredAvatar: invitedAvatar,
    referralXpAwarded: xpAmount,
    trustScoreBoostAwarded: trustBoost,
    status: 'joined',
    createdAt: nowFormatted,
  };

  if (db && referrerId) {
    try {
      // 1. Create referral document
      await setDoc(doc(db, 'referrals', referralDocId), {
        ...record,
        timestamp: serverTimestamp(),
      });

      // 2. Append trust ledger audit entry
      await addDoc(collection(db, 'trust_ledger'), {
        userId: referrerId,
        delta: trustBoost,
        resultingScore: newScore,
        reason: `Referral XP Award: Invited @${invitedUsername} to LinkPulse network (+${trustBoost} Trust pts, +${xpAmount} XP)`,
        category: 'referral_bonus',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
      });

      // 3. Update user profile metrics
      await setDoc(doc(db, 'users', referrerId), {
        trustScore: newScore,
        referralXp: newXp,
        referralsCount: newCount,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('Error saving referral in Firestore:', e);
    }
  }

  return { success: true, newScore, newXp, record };
}

/**
 * Simulates a peer joining LinkPulse through the user's invitation link.
 * Used for live demonstration, onboarding preview, and interactive validation.
 */
export async function simulateReferralInvitation(
  referrerUser: User,
  customName?: string
): Promise<{ success: boolean; message: string; record: ReferralRecord; newScore: number; newXp: number }> {
  const samplePeers = [
    { name: 'Devon Miles', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { name: 'Sora Tanaka', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { name: 'Priya Patel', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
    { name: 'Mateo Rossi', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
    { name: 'Kiran Verma', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
    { name: 'Aaliyah Bennett', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  ];

  const randomPeer = samplePeers[Math.floor(Math.random() * samplePeers.length)];
  const invitedName = customName || randomPeer.name;
  const invitedAvatar = randomPeer.avatar;

  const result = await recordReferralAward(referrerUser, invitedName, invitedAvatar, 50, 2);

  return {
    success: true,
    message: `@${invitedName} joined LinkPulse through your invitation link! You earned +50 Referral XP and +2 Trust Score boost.`,
    record: result.record,
    newScore: result.newScore,
    newXp: result.newXp,
  };
}

/**
 * Redeems an invitation referral code for the current user.
 * Awards the referrer +50 Referral XP & +2 Trust Score boost, and awards the claimer +25 welcome XP!
 */
export async function redeemReferralCode(
  code: string,
  currentUser: User
): Promise<{ success: boolean; message: string; xpAwarded: number; trustBoostAwarded: number }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Please provide a valid referral code.', xpAwarded: 0, trustBoostAwarded: 0 };
  }

  if (currentUser.referralCode && currentUser.referralCode.toUpperCase() === cleanCode) {
    return { success: false, message: 'You cannot redeem your own invitation code.', xpAwarded: 0, trustBoostAwarded: 0 };
  }

  if (currentUser.referredBy) {
    return { success: false, message: `You have already redeemed an invitation code (${currentUser.referredBy}).`, xpAwarded: 0, trustBoostAwarded: 0 };
  }

  if (!db) {
    return {
      success: true,
      message: `Referral code ${cleanCode} redeemed! You received +25 Welcome XP.`,
      xpAwarded: 25,
      trustBoostAwarded: 1,
    };
  }

  try {
    // Look up referrer by referralCode
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('referralCode', '==', cleanCode));
    const snap = await getDocs(q);

    let referrerDocId: string | null = null;
    let referrerData: any = null;

    if (!snap.empty) {
      const firstDoc = snap.docs[0];
      referrerDocId = firstDoc.id;
      referrerData = firstDoc.data();
    }

    if (referrerDocId && referrerDocId === currentUser.id) {
      return { success: false, message: 'You cannot redeem your own invitation code.', xpAwarded: 0, trustBoostAwarded: 0 };
    }

    // 1. Award claimer +25 XP and mark referredBy
    const currentClaimerXp = currentUser.referralXp || 0;
    const currentClaimerScore = currentUser.trustScore || 100;
    const updatedClaimerScore = Math.min(100, currentClaimerScore + 1);

    await setDoc(doc(db, 'users', currentUser.id), {
      referredBy: cleanCode,
      referralXp: currentClaimerXp + 25,
      trustScore: updatedClaimerScore,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Claimer audit log
    await addDoc(collection(db, 'trust_ledger'), {
      userId: currentUser.id,
      delta: 1,
      resultingScore: updatedClaimerScore,
      reason: `Welcome Bonus for joining via referral code ${cleanCode} (+1 Trust pt, +25 XP)`,
      category: 'referral_bonus',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp(),
    });

    // 2. If referrer found in DB, award referrer +50 XP and +2 Trust Score
    if (referrerDocId && referrerData) {
      const referrerNewScore = Math.min(100, (referrerData.trustScore ?? 100) + 2);
      const referrerNewXp = (referrerData.referralXp ?? 0) + 50;
      const referrerNewCount = (referrerData.referralsCount ?? 0) + 1;

      await setDoc(doc(db, 'users', referrerDocId), {
        trustScore: referrerNewScore,
        referralXp: referrerNewXp,
        referralsCount: referrerNewCount,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Create record in referrals collection
      const refId = 'ref_' + Date.now();
      await setDoc(doc(db, 'referrals', refId), {
        id: refId,
        referrerId: referrerDocId,
        referrerEmail: referrerData.email,
        referrerCode: cleanCode,
        referredUserId: currentUser.id,
        referredUsername: currentUser.username || 'Creator Peer',
        referredAvatar: currentUser.avatar,
        referralXpAwarded: 50,
        trustScoreBoostAwarded: 2,
        status: 'joined',
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: serverTimestamp(),
      });

      // Referrer audit log
      await addDoc(collection(db, 'trust_ledger'), {
        userId: referrerDocId,
        delta: 2,
        resultingScore: referrerNewScore,
        reason: `Referral XP & Trust Boost: @${currentUser.username} redeemed your invitation code ${cleanCode} (+2 Trust pts, +50 XP)`,
        category: 'referral_bonus',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
      });
    }

    return {
      success: true,
      message: `Invitation code ${cleanCode} claimed successfully! +25 Welcome XP and +1 Trust Score boost credited.`,
      xpAwarded: 25,
      trustBoostAwarded: 1,
    };
  } catch (err: any) {
    console.error('Error claiming referral code:', err);
    return { success: false, message: 'Could not claim referral code: ' + (err?.message || 'Network error'), xpAwarded: 0, trustBoostAwarded: 0 };
  }
}

/**
 * Allows a user to customize their unique referral handle/code.
 */
export async function updateUserReferralCode(
  userId: string,
  newCode: string
): Promise<{ success: boolean; message?: string }> {
  const sanitized = newCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (sanitized.length < 3 || sanitized.length > 20) {
    return { success: false, message: 'Referral code must be between 3 and 20 alphanumeric characters.' };
  }

  if (!db || !userId) {
    return { success: true };
  }

  try {
    // Check if code is already taken
    const q = query(collection(db, 'users'), where('referralCode', '==', sanitized));
    const snap = await getDocs(q);
    if (!snap.empty && snap.docs.some(d => d.id !== userId)) {
      return { success: false, message: 'This referral code is already in use by another creator. Please pick a unique handle.' };
    }

    await setDoc(doc(db, 'users', userId), {
      referralCode: sanitized,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to update referral code.' };
  }
}

