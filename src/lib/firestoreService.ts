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
  PremiumSubscription
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
      const initialProfile: User = {
        id: sessionUser.uid,
        username: sessionUser.displayName || (isAdminAccount ? 'Admin (test)' : (sessionUser.email?.split('@')[0] || 'PeerUser')),
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

      const user: User = {
        id: snap.id,
        username: data.username || sessionUser.displayName || (isAdminAccount ? 'Admin (test)' : 'PeerUser'),
        avatar: data.avatar || sessionUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        onlineStatus: data.onlineStatus || 'online',
        trustScore: typeof data.trustScore === 'number' ? data.trustScore : 100,
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
