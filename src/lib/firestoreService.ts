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
  DEFAULT_TAB_ACCESS
} from '../types';

export const ADMIN_EMAIL = 'test@gmail.com';

/**
 * Checks if a user has the admin role.
 * Assigned to test@gmail.com or role === 'admin'.
 */
export function isUserAdmin(
  user?: { email?: string | null; role?: string } | null,
  sessionUser?: AuthSessionUser | null
): boolean {
  if (sessionUser && sessionUser.email && sessionUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  if (user && user.email && user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  if (user && user.role === 'admin') {
    return true;
  }
  return false;
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
