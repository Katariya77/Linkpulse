import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Menu, 
  X, 
  ArrowLeft, 
  LogOut, 
  Check, 
  Sliders, 
  Users, 
  Radio, 
  Trophy, 
  Target, 
  KeyRound, 
  Lock, 
  Shield,
  Sparkles,
  Crown
} from 'lucide-react';
import { User, PublicTabId, TabAccessConfig, PUBLIC_TABS_LIST, PremiumSubscription } from '../types';
import { AuthSessionUser } from '../lib/firebase';
import { 
  ADMIN_EMAIL, 
  subscribeToPremiumSubscriptions, 
  subscribeToAllUsers,
  activatePremiumSubscription,
  cancelPremiumSubscription
} from '../lib/firestoreService';
import { AdminPremiumUsersPage } from './AdminPremiumUsersPage';

interface AdminPanelProps {
  currentUser: User;
  sessionUser?: AuthSessionUser | null;
  tabAccess: TabAccessConfig;
  onUpdateTabAccess: (update: Partial<TabAccessConfig> | PublicTabId[]) => Promise<void> | void;
  onExitToPublic: () => void;
  onSignOut?: () => void;
}

const TAB_ICONS: Record<PublicTabId, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  marketplace: Users,
  room: Radio,
  leaderboard: Trophy,
  goals: Target,
  auth: KeyRound,
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  sessionUser,
  tabAccess,
  onUpdateTabAccess,
  onExitToPublic,
  onSignOut,
}) => {
  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [adminActiveTab, setAdminActiveTab] = useState<'tabs' | 'premium'>('tabs');
  const [premiumSubscriptions, setPremiumSubscriptions] = useState<PremiumSubscription[]>([]);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<User[]>([]);
  const [savingTab, setSavingTab] = useState<PublicTabId | null>(null);
  const [savingHeaderItem, setSavingHeaderItem] = useState<'trust' | 'key' | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Subscribe to premium subscriptions in real time
  useEffect(() => {
    const unsub = subscribeToPremiumSubscriptions((subs) => {
      setPremiumSubscriptions(subs);
    });
    return () => unsub();
  }, []);

  // Subscribe to all registered users for the admin roster & manual granting
  useEffect(() => {
    const unsub = subscribeToAllUsers((users) => {
      setAllRegisteredUsers(users);
    });
    return () => unsub();
  }, []);

  const handleGrantPremium = async (target: { id: string; email: string; username: string; avatar?: string }) => {
    await activatePremiumSubscription(target.id, target.email, target.username, target.avatar);
  };

  const handleRevokePremium = async (userId: string) => {
    await cancelPremiumSubscription(userId);
  };

  const displayEmail = sessionUser?.email || currentUser.email || ADMIN_EMAIL;
  const hiddenTabs = tabAccess.hiddenTabs || [];
  const isTrustHidden = Boolean(tabAccess.hideHeaderTrust);
  const isKeyHidden = Boolean(tabAccess.hideHeaderAuthKey);

  const visibleTabsCount = PUBLIC_TABS_LIST.length - hiddenTabs.length;
  const hasAnyHidden = hiddenTabs.length > 0 || isTrustHidden || isKeyHidden;

  const handleToggleTabVisibility = async (tabId: PublicTabId) => {
    setSavingTab(tabId);
    const isCurrentlyHidden = hiddenTabs.includes(tabId);
    let updated: PublicTabId[];

    if (isCurrentlyHidden) {
      updated = hiddenTabs.filter(id => id !== tabId);
      setNotification(`Tab "${tabId}" is now visible to public members.`);
    } else {
      updated = [...hiddenTabs, tabId];
      setNotification(`Tab "${tabId}" is now hidden from public members.`);
    }

    try {
      await onUpdateTabAccess({
        hiddenTabs: updated,
        hideHeaderTrust: isTrustHidden,
        hideHeaderAuthKey: isKeyHidden,
      });
    } finally {
      setSavingTab(null);
      setTimeout(() => {
        setNotification(null);
      }, 3500);
    }
  };

  const handleToggleHeaderTrust = async () => {
    setSavingHeaderItem('trust');
    const nextValue = !isTrustHidden;
    try {
      await onUpdateTabAccess({
        hiddenTabs,
        hideHeaderTrust: nextValue,
        hideHeaderAuthKey: isKeyHidden,
      });
      setNotification(
        nextValue 
          ? 'Trust score pill beside header profile is now hidden from public visitors.' 
          : 'Trust score pill beside header profile is now visible to public visitors.'
      );
    } finally {
      setSavingHeaderItem(null);
      setTimeout(() => {
        setNotification(null);
      }, 3500);
    }
  };

  const handleToggleHeaderKey = async () => {
    setSavingHeaderItem('key');
    const nextValue = !isKeyHidden;
    try {
      await onUpdateTabAccess({
        hiddenTabs,
        hideHeaderTrust: isTrustHidden,
        hideHeaderAuthKey: nextValue,
      });
      setNotification(
        nextValue 
          ? 'Key / Account icon button beside header profile is now hidden from public visitors.' 
          : 'Key / Account icon button beside header profile is now visible to public visitors.'
      );
    } finally {
      setSavingHeaderItem(null);
      setTimeout(() => {
        setNotification(null);
      }, 3500);
    }
  };

  const handleResetAllVisible = async () => {
    setSavingTab('marketplace');
    try {
      await onUpdateTabAccess({
        hiddenTabs: [],
        hideHeaderTrust: false,
        hideHeaderAuthKey: false,
      });
      setNotification('All navigation tabs and header profile items have been restored to visible.');
    } finally {
      setSavingTab(null);
      setTimeout(() => {
        setNotification(null);
      }, 3500);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#09090b] text-zinc-100 rounded-xl border border-zinc-800/80 overflow-hidden shadow-2xl my-2">
      
      {/* MOBILE TOP BAR (Visible only on small screens) */}
      <div className="md:hidden flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950">
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            id="admin-mobile-menu-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
            aria-label="Open Admin Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-sm tracking-tight text-white">LinkPulse</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950/60 text-red-300 border border-red-900/50">
              Admin
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onExitToPublic}
          className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit</span>
        </button>
      </div>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85%] bg-[#09090b] border-r border-zinc-800 h-full z-10 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <span className="font-bold text-sm text-white">Admin Console</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Admin User Badge */}
            <div className="my-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-400/90 mb-1 flex items-center space-x-1">
                <Lock className="h-2.5 w-2.5" />
                <span>Admin Role</span>
              </div>
              <p className="text-xs font-mono text-zinc-200 truncate">{displayEmail}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Assigned Administrator</p>
            </div>

            {/* Navigation items */}
            <div className="flex-1 space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-2 py-1">
                Management
              </div>

              {/* Tab 1: Tab & Header Access */}
              <button
                type="button"
                onClick={() => {
                  setAdminActiveTab('tabs');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  adminActiveTab === 'tabs'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Sliders className="h-4 w-4" />
                  <span>Tab & Header Access</span>
                </div>
                {adminActiveTab === 'tabs' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </button>

              {/* Tab 2: Premium Users */}
              <button
                type="button"
                onClick={() => {
                  setAdminActiveTab('premium');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  adminActiveTab === 'premium'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Crown className="h-4 w-4 text-amber-400" />
                  <span>Premium Users</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {premiumSubscriptions.filter(s => s.status === 'active').length}
                </span>
              </button>
            </div>

            {/* Bottom actions */}
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  onExitToPublic();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Public App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED DESKTOP ADMIN SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800/90 bg-[#09090b] shrink-0 p-5">
        
        {/* Top Header */}
        <div className="pb-5 border-b border-zinc-800/80">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold tracking-tight text-white">LinkPulse</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/70 text-red-300 border border-red-900/60 uppercase tracking-wide">
              Admin
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">System Control & Moderation</p>
        </div>

        {/* Admin Assigned User Card */}
        <div className="my-5 p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-400/90 mb-1">
            <span className="flex items-center space-x-1">
              <ShieldAlert className="h-3 w-3 text-red-400" />
              <span>Admin Role</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs font-mono text-zinc-200 truncate" title={displayEmail}>{displayEmail}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Assigned to {ADMIN_EMAIL}</p>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-2 pb-2">
            Admin Navigation
          </div>

          {/* Nav Item 1: Tab & Header Access */}
          <button
            type="button"
            id="admin-tab-access-nav-btn"
            onClick={() => setAdminActiveTab('tabs')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              adminActiveTab === 'tabs'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sliders className="h-4 w-4" strokeWidth={1.5} />
              <span>Tab & Header Access</span>
            </div>
            {adminActiveTab === 'tabs' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </button>

          {/* Nav Item 2: Premium Users */}
          <button
            type="button"
            id="admin-premium-users-nav-btn"
            onClick={() => setAdminActiveTab('premium')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              adminActiveTab === 'premium'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Crown className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
              <span>Premium Users</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {premiumSubscriptions.filter(s => s.status === 'active').length}
            </span>
          </button>
        </nav>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-2">
          <button
            type="button"
            id="admin-exit-public-btn"
            onClick={onExitToPublic}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Public App</span>
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN CONTENT AREA */}
      <main className="flex-1 bg-zinc-950/60 p-4 sm:p-6 lg:p-8 flex flex-col justify-between min-h-0 overflow-y-auto">
        <div className="space-y-6 max-w-4xl w-full">
          
          {/* Notification banner */}
          {notification && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 shadow-md">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>{notification}</span>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {adminActiveTab === 'premium' ? (
            <AdminPremiumUsersPage
              subscriptions={premiumSubscriptions}
              allUsers={allRegisteredUsers}
              onGrantPremium={handleGrantPremium}
              onRevokePremium={handleRevokePremium}
            />
          ) : (
            <>
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Visibility & Access Management
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {visibleTabsCount} of {PUBLIC_TABS_LIST.length} Tabs Visible
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Configure which public navigation tabs and header profile elements are visible to regular members. Changes sync immediately.
              </p>
            </div>

            {hasAnyHidden && (
              <button
                type="button"
                id="reset-all-tabs-btn"
                onClick={handleResetAllVisible}
                disabled={savingTab !== null || savingHeaderItem !== null}
                className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-zinc-400" />
                <span>Unhide All Elements</span>
              </button>
            )}
          </div>

          {/* SECTION 1: HEADER PROFILE ICONS (TRUST BADGE & KEY ICON) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-zinc-400" />
                  <span>Header Elements (Beside Profile Avatar)</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Control the visibility of the Trust rating pill and Key / Account button displayed next to the profile avatar on the top navigation bar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* 1. Trust Score Badge Toggle Card */}
              <div 
                id="header-element-card-trust"
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 ${
                  isTrustHidden
                    ? 'bg-zinc-900/30 border-zinc-800/60 opacity-90'
                    : 'bg-zinc-900/80 border-zinc-700/80 shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-3.5 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 border ${
                    isTrustHidden
                      ? 'bg-zinc-950 text-zinc-500 border-zinc-800'
                      : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                  }`}>
                    <Shield className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white truncate">
                        Trust Score Badge
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                        Header
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      Displays member trust score number, tier badge, and inspection modal trigger beside profile.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 mt-1">
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    isTrustHidden
                      ? 'bg-amber-950/30 text-amber-300 border-amber-800/40'
                      : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40'
                  }`}>
                    {isTrustHidden ? (
                      <>
                        <EyeOff className="h-3 w-3 text-amber-400" />
                        <span>Hidden</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 text-emerald-400" />
                        <span>Visible</span>
                      </>
                    )}
                  </span>

                  <button
                    type="button"
                    id="toggle-header-trust-btn"
                    onClick={handleToggleHeaderTrust}
                    disabled={savingHeaderItem === 'trust'}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      isTrustHidden
                        ? 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {isTrustHidden ? (
                      <>
                        <Eye className="h-3.5 w-3.5 text-zinc-950" />
                        <span>{savingHeaderItem === 'trust' ? 'Updating...' : 'Unhide Trust'}</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{savingHeaderItem === 'trust' ? 'Updating...' : 'Hide Trust'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Key Icon / Account Trigger Toggle Card */}
              <div 
                id="header-element-card-key"
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 ${
                  isKeyHidden
                    ? 'bg-zinc-900/30 border-zinc-800/60 opacity-90'
                    : 'bg-zinc-900/80 border-zinc-700/80 shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-3.5 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 border ${
                    isKeyHidden
                      ? 'bg-zinc-950 text-zinc-500 border-zinc-800'
                      : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                  }`}>
                    <KeyRound className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white truncate">
                        Key & Account Button
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                        Header
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      Displays quick sign-in / account status button with key icon beside profile.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 mt-1">
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    isKeyHidden
                      ? 'bg-amber-950/30 text-amber-300 border-amber-800/40'
                      : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40'
                  }`}>
                    {isKeyHidden ? (
                      <>
                        <EyeOff className="h-3 w-3 text-amber-400" />
                        <span>Hidden</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 text-emerald-400" />
                        <span>Visible</span>
                      </>
                    )}
                  </span>

                  <button
                    type="button"
                    id="toggle-header-key-btn"
                    onClick={handleToggleHeaderKey}
                    disabled={savingHeaderItem === 'key'}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      isKeyHidden
                        ? 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {isKeyHidden ? (
                      <>
                        <Eye className="h-3.5 w-3.5 text-zinc-950" />
                        <span>{savingHeaderItem === 'key' ? 'Updating...' : 'Unhide Key Icon'}</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{savingHeaderItem === 'key' ? 'Updating...' : 'Hide Key Icon'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: PUBLIC NAVIGATION TABS */}
          <div className="space-y-3 pt-2">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Sliders className="h-4 w-4 text-zinc-400" />
                <span>Public Navigation Tabs</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Hide or unhide specific main navigation tabs from public visitors and unregistered users.
              </p>
            </div>

            <div className="space-y-3">
              {PUBLIC_TABS_LIST.map((tab) => {
                const isHidden = hiddenTabs.includes(tab.id);
                const isProcessing = savingTab === tab.id;
                const IconComponent = TAB_ICONS[tab.id] || Sliders;

                return (
                  <div
                    key={tab.id}
                    id={`tab-access-card-${tab.id}`}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                      isHidden
                        ? 'bg-zinc-900/30 border-zinc-800/60 opacity-85'
                        : 'bg-zinc-900/80 border-zinc-700/80 shadow-sm'
                    }`}
                  >
                    {/* Left info */}
                    <div className="flex items-start sm:items-center space-x-3.5 mb-3 sm:mb-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 border ${
                        isHidden 
                          ? 'bg-zinc-950 text-zinc-500 border-zinc-800' 
                          : 'bg-zinc-800 text-white border-zinc-700'
                      }`}>
                        <IconComponent className="h-5 w-5" strokeWidth={1.5} />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-white">
                            {tab.name}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                            /{tab.id}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {tab.description}
                        </p>
                      </div>
                    </div>

                    {/* Right Status & Toggle */}
                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        isHidden
                          ? 'bg-amber-950/30 text-amber-300 border-amber-800/40'
                          : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40'
                      }`}>
                        {isHidden ? (
                          <>
                            <EyeOff className="h-3 w-3 text-amber-400" />
                            <span>Hidden from Public</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 text-emerald-400" />
                            <span>Visible to Public</span>
                          </>
                        )}
                      </span>

                      {/* Action Toggle Button */}
                      <button
                        type="button"
                        id={`toggle-tab-btn-${tab.id}`}
                        onClick={() => handleToggleTabVisibility(tab.id)}
                        disabled={isProcessing}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                          isHidden
                            ? 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        {isHidden ? (
                          <>
                            <Eye className="h-3.5 w-3.5 text-zinc-950" />
                            <span>{isProcessing ? 'Updating...' : 'Unhide Tab'}</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{isProcessing ? 'Updating...' : 'Hide Tab'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Information & Security Note */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-400 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
              <Lock className="h-3.5 w-3.5 text-red-400" />
              <span>Admin Visibility Protocol</span>
            </div>
            <p>
              When a tab or header element is marked as <strong className="text-zinc-200">Hidden from Public</strong>, regular visitors and unauthenticated users will not see it on the page or in navigation drawers.
            </p>
            <p className="text-zinc-400">
              Users signed in with the administrator account (<code className="text-red-300 font-mono">{ADMIN_EMAIL}</code>) can see all elements with a subtle <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60">Hidden</span> badge for verification.
            </p>
          </div>
          </>
          )}

        </div>

        {/* Footer info */}
        <div className="pt-6 mt-6 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
          <span>LinkPulse Admin Panel</span>
          <span>Role: System Administrator ({ADMIN_EMAIL})</span>
        </div>
      </main>

    </div>
  );
};
