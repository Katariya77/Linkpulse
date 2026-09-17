export type UserStatus = 'online' | 'in_session' | 'away' | 'offline';
export type TrustTier = 'elite' | 'reliable' | 'caution' | 'at_risk' | 'suspended';
export type PackageType = '5x5' | '10x10';
export type UserRole = 'admin' | 'member';

export type PublicTabId = 'marketplace' | 'room' | 'leaderboard' | 'goals' | 'auth';

export interface TabAccessConfig {
  hiddenTabs: PublicTabId[];
  hideHeaderTrust?: boolean;
  hideHeaderAuthKey?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_TAB_ACCESS: TabAccessConfig = {
  hiddenTabs: [],
  hideHeaderTrust: false,
  hideHeaderAuthKey: false,
};

export interface HeaderElementMeta {
  id: 'trust' | 'key';
  name: string;
  description: string;
  location: string;
}

export const HEADER_ELEMENTS_LIST: HeaderElementMeta[] = [
  {
    id: 'trust',
    name: 'Trust Score Badge',
    description: 'Displays the user trust rating pill and breakdown inspector beside the profile avatar',
    location: 'Top header, next to profile avatar',
  },
  {
    id: 'key',
    name: 'Key & Account Trigger',
    description: 'Displays the quick sign-in / account status button with key icon beside the profile avatar',
    location: 'Top header, next to profile avatar',
  },
];

export interface PublicTabMeta {
  id: PublicTabId;
  name: string;
  description: string;
  defaultVisible: boolean;
}

export const PUBLIC_TABS_LIST: PublicTabMeta[] = [
  {
    id: 'marketplace',
    name: 'Discovery Pool',
    description: 'Public member marketplace and online link exchange pool',
    defaultVisible: true,
  },
  {
    id: 'room',
    name: 'Exchange Session',
    description: 'Live 1-on-1 link verification rooms',
    defaultVisible: true,
  },
  {
    id: 'leaderboard',
    name: 'Leaderboard',
    description: 'Top members, trust scores, and community rankings',
    defaultVisible: true,
  },
  {
    id: 'goals',
    name: 'Daily Quests',
    description: 'Daily exchange challenges and reward milestones',
    defaultVisible: true,
  },
  {
    id: 'auth',
    name: 'Account & Sign In',
    description: 'User registration, login, and profile settings',
    defaultVisible: true,
  },
];

export interface User {
  id: string;
  username: string;
  avatar: string;
  onlineStatus: UserStatus;
  trustScore: number; // 0 - 100
  successRate: number; // %
  lifetimeExchanges: number;
  activeStreak: number;
  preferredShorteners: string[];
  ipAddress: string;
  country: string;
  countryCode: string;
  joinedDate: string;
  email?: string;
  role?: UserRole;
  authProvider?: 'google' | 'password' | 'demo';
  isFavorite?: boolean;
  notes?: string;
  soundAlerts?: boolean;
  autoAcceptMatches?: boolean;
  poolVisibility?: boolean;
}

export interface ExchangeLink {
  id: string;
  url: string;
  shortenerName: string;
  status: 'pending' | 'in_progress' | 'verified' | 'flagged';
  dwellTimeRequired: number; // seconds (30 or 45)
  dwellTimeRemaining: number;
  isOpened: boolean;
  verifiedAt?: string;
}

export interface PartnerTelemetry {
  currentLinkIndex: number;
  currentLinkStatus: 'waiting' | 'dwelling' | 'solved' | 'verified';
  secondsRemaining: number;
  completedCount: number;
  totalCount: number;
  lastActionText: string;
  latencyMs: number;
}

export interface ExchangeSession {
  id: string;
  roomCode: string; // e.g. '#18492'
  partner: User;
  packageType: PackageType;
  dwellTimeSeconds: number; // 30 or 45
  status: 'setup' | 'active' | 'review' | 'completed' | 'disputed' | 'cancelled';
  userLinks: ExchangeLink[];
  partnerLinks: ExchangeLink[];
  partnerTelemetry: PartnerTelemetry;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  mutualRating?: {
    stars: number;
    tags: string[];
    feedback: string;
  };
  dispute?: {
    reason: string;
    notes: string;
    evidenceUrl?: string;
    filedAt: string;
    status: 'under_review' | 'resolved';
  };
}

export interface TrustLedgerEntry {
  id: string;
  timestamp: string;
  delta: number; // e.g. +2, -10, -15
  resultingScore: number;
  reason: string;
  category: 'exchange_success' | 'session_abandon' | 'dispute_penalty' | 'streak_bonus' | 'idle_timeout';
  sessionRef?: string;
}

export interface IPCooldownRecord {
  partnerId: string;
  partnerUsername: string;
  partnerIp: string;
  expiresAt: string; // ISO string 24h later
  initiatedAt: string;
}

export interface DailyGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  rewardXp: number;
  completed: boolean;
}

export interface ExchangeProposal {
  id: string;
  sender: User;
  packageType: PackageType;
  dwellTime: number;
  senderLinks: string[];
  createdAt: string;
  note?: string;
}
