import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Zap, 
  Shield, 
  Flame, 
  Users, 
  Trophy, 
  Target, 
  Radio, 
  ChevronDown,
  Circle,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  ChevronRight,
  KeyRound,
  LogIn,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { User, TabAccessConfig } from '../types';
import { getTrustTier } from '../utils/trustUtils';

interface NavbarProps {
  currentUser: User;
  activeTab: 'marketplace' | 'room' | 'leaderboard' | 'goals' | 'auth' | 'admin';
  setActiveTab: (tab: 'marketplace' | 'room' | 'leaderboard' | 'goals' | 'auth' | 'admin') => void;
  hasActiveSession: boolean;
  activeRoomCode?: string;
  isAdmin?: boolean;
  tabAccessConfig?: TabAccessConfig;
  onOpenTrustInspector: () => void;
  onOpenGoals: () => void;
  onOpenLeaderboard: () => void;
  onToggleUserStatus: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  hasActiveSession,
  activeRoomCode,
  isAdmin = false,
  tabAccessConfig,
  onOpenTrustInspector,
  onOpenGoals,
  onOpenLeaderboard,
  onToggleUserStatus,
  onSignOut,
}) => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const trustInfo = getTrustTier(currentUser.trustScore);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = '';
      }
    };
  }, [isMobileMenuOpen]);

  // Handle ESC key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const hiddenTabs = tabAccessConfig?.hiddenTabs || [];

  const rawNavItems = [
    {
      id: 'marketplace' as const,
      label: 'Discovery Pool',
      subtitle: 'Browse active members & link exchange pool',
      icon: Users,
      badge: undefined,
    },
    {
      id: 'room' as const,
      label: hasActiveSession ? `Room ${activeRoomCode}` : 'Exchange Session',
      subtitle: hasActiveSession ? 'Live exchange room in progress' : 'Start a 1-on-1 link exchange',
      icon: hasActiveSession ? Circle : Radio,
      badge: hasActiveSession ? 'Active' : undefined,
      isPulse: hasActiveSession,
    },
    {
      id: 'leaderboard' as const,
      label: 'Leaderboard',
      subtitle: 'Top members, trust scores & rankings',
      icon: Trophy,
      badge: undefined,
    },
    {
      id: 'goals' as const,
      label: 'Daily Quests',
      subtitle: 'Daily exchange challenges & milestones',
      icon: Target,
      badge: '2/4',
    },
    {
      id: 'auth' as const,
      label: currentUser.email ? 'Account & Profile' : 'Sign In / Register',
      subtitle: currentUser.email ? `Signed in as ${currentUser.email}` : 'Sign in with Google or Email',
      icon: KeyRound,
      badge: currentUser.email ? 'Verified' : 'Firebase',
    },
  ];

  // Filter public items based on admin settings:
  // If not admin, hide tabs that are marked as hidden.
  // If admin, show all tabs, and note hidden state.
  const navItems = rawNavItems.filter((item) => {
    if (isAdmin) return true;
    return !hiddenTabs.includes(item.id);
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#09090b]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Identity */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          <button 
            id="brand-logo-btn"
            onClick={() => {
              setActiveTab('marketplace');
              setIsMobileMenuOpen(false);
            }}
            className="cursor-pointer text-left focus:outline-none py-1"
          >
            <span className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-zinc-200 transition-colors">
              Link<span className="text-zinc-400 font-normal">Pulse</span>
            </span>
          </button>

          {/* Navigation Links (Desktop Only - lg+) */}
          <nav className="hidden lg:flex items-center space-x-1 pl-4 border-l border-zinc-800">
            {(isAdmin || !hiddenTabs.includes('marketplace')) && (
              <button
                id="nav-marketplace-btn"
                onClick={() => setActiveTab('marketplace')}
                className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'marketplace'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Discovery Pool</span>
                {isAdmin && hiddenTabs.includes('marketplace') && (
                  <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60">
                    Hidden
                  </span>
                )}
              </button>
            )}

            {(isAdmin || !hiddenTabs.includes('room')) && (
              <button
                id="nav-room-btn"
                onClick={() => setActiveTab('room')}
                className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'room'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : hasActiveSession
                    ? 'bg-zinc-900 text-zinc-200 border border-zinc-700 hover:bg-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {hasActiveSession ? (
                  <>
                    <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                    <span>Room {activeRoomCode}</span>
                  </>
                ) : (
                  <>
                    <Radio className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                    <span>Exchange Session</span>
                  </>
                )}
                {isAdmin && hiddenTabs.includes('room') && (
                  <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60">
                    Hidden
                  </span>
                )}
              </button>
            )}

            {(isAdmin || !hiddenTabs.includes('leaderboard')) && (
              <button
                id="nav-leaderboard-btn"
                onClick={() => setActiveTab('leaderboard')}
                className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'leaderboard'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Trophy className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Leaderboard</span>
                {isAdmin && hiddenTabs.includes('leaderboard') && (
                  <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60">
                    Hidden
                  </span>
                )}
              </button>
            )}

            {(isAdmin || !hiddenTabs.includes('goals')) && (
              <button
                id="nav-daily-goals-btn"
                onClick={() => setActiveTab('goals')}
                className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'goals'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Target className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Daily Quests</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300 border border-zinc-700 tabular-nums">
                  2/4
                </span>
                {isAdmin && hiddenTabs.includes('goals') && (
                  <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60">
                    Hidden
                  </span>
                )}
              </button>
            )}

            {(isAdmin || !hiddenTabs.includes('auth')) && (
              <button
                id="nav-auth-btn"
                onClick={() => setActiveTab('auth')}
                className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'auth'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>{currentUser.email ? 'Account' : 'Sign In'}</span>
                {currentUser.email && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
                {isAdmin && hiddenTabs.includes('auth') && (
                  <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60">
                    Hidden
                  </span>
                )}
              </button>
            )}

            {/* Desktop Admin Panel Button (only visible to admin role) */}
            {isAdmin && (
              <button
                id="nav-admin-panel-btn"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors border cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-red-950 text-red-200 border-red-700 shadow-sm'
                    : 'bg-red-950/30 text-red-300 hover:text-white hover:bg-red-950/60 border-red-900/60'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" strokeWidth={1.75} />
                <span>Admin Panel</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right User Telemetry & Menu Button */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          
          {/* Quick Auth Trigger Button (Key Icon beside Profile) */}
          {(isAdmin || !tabAccessConfig?.hideHeaderAuthKey) && (
            <button
              id="header-auth-trigger-btn"
              onClick={() => setActiveTab('auth')}
              title={currentUser.email ? `Signed in as ${currentUser.email}` : "Sign In with Google or Email"}
              className={`flex items-center space-x-1.5 rounded-md px-2 sm:px-2.5 py-1 text-xs font-medium transition-colors border cursor-pointer ${
                activeTab === 'auth'
                  ? 'bg-zinc-800 text-white border-zinc-600'
                  : currentUser.email
                  ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  : 'bg-white text-zinc-950 border-white hover:bg-zinc-200 font-semibold'
              }`}
            >
              {currentUser.email ? (
                <>
                  <KeyRound className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  <span className="hidden sm:inline text-zinc-300 text-[11px]">Account</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </>
              ) : (
                <>
                  <LogIn className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Sign In</span>
                </>
              )}
              {isAdmin && tabAccessConfig?.hideHeaderAuthKey && (
                <span className="text-[9px] text-amber-300 bg-amber-950/70 px-1 py-0.2 rounded border border-amber-800/60 ml-0.5">
                  Hidden
                </span>
              )}
            </button>
          )}

          {onSignOut && (
            <button
              id="header-signout-btn"
              onClick={onSignOut}
              title="Sign Out of LinkPulse"
              className="hidden sm:flex items-center space-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
            >
              <LogOut className="h-3 w-3 text-zinc-400" strokeWidth={1.5} />
              <span className="text-[11px]">Sign Out</span>
            </button>
          )}

          {/* Trust Score Pill beside Profile */}
          {(isAdmin || !tabAccessConfig?.hideHeaderTrust) && (
            <button
              id="trust-score-badge-btn"
              onClick={onOpenTrustInspector}
              title="Inspect Trust Score"
              className="flex items-center space-x-1.5 sm:space-x-2 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 sm:px-2.5 py-1 transition-colors text-xs shrink-0 cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 text-zinc-300 shrink-0" strokeWidth={1.5} />
              <div className="flex items-center space-x-1">
                <span className="hidden min-[420px]:inline text-zinc-500 text-[10px]">TRUST</span>
                <span className="font-semibold text-white tabular-nums">{currentUser.trustScore}</span>
              </div>
              <span className={`hidden sm:inline-block text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-medium border ${trustInfo.badgeClass}`}>
                {trustInfo.tier.toUpperCase()}
              </span>
              {isAdmin && tabAccessConfig?.hideHeaderTrust && (
                <span className="text-[9px] text-amber-300 bg-amber-950/70 px-1 py-0.2 rounded border border-amber-800/60 ml-0.5">
                  Hidden
                </span>
              )}
            </button>
          )}

          {/* Active Streak */}
          <div 
            title={`${currentUser.activeStreak} consecutive days completed`}
            className="hidden lg:flex items-center space-x-1.5 rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs"
          >
            <Flame className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
            <span className="font-medium text-zinc-200 tabular-nums">{currentUser.activeStreak}d</span>
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-zinc-800">
            <button
              onClick={onToggleUserStatus}
              title={`Status: ${currentUser.onlineStatus}. Click to toggle status.`}
              className="relative cursor-pointer focus:outline-none"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="h-7 w-7 rounded-md object-cover border border-zinc-800 grayscale"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${
                  currentUser.onlineStatus === 'online'
                    ? 'bg-zinc-200 ring-1 ring-zinc-950'
                    : 'bg-zinc-600 ring-1 ring-zinc-950'
                }`}
              />
            </button>

            <div className="hidden lg:block text-left">
              <button
                id="toggle-online-status-btn"
                onClick={onToggleUserStatus}
                className="flex items-center space-x-1 text-xs text-zinc-300 hover:text-white transition-colors"
              >
                <span className="font-medium">{currentUser.username}</span>
                <ChevronDown className="h-3 w-3 text-zinc-500" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Sidebar Toggle Button */}
          <button
            id="mobile-sidebar-toggle-btn"
            type="button"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex lg:hidden items-center justify-center h-8 w-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors ml-1 focus:outline-none cursor-pointer"
          >
            {isMobileMenuOpen ? (
              <X className="h-4 w-4 text-white" strokeWidth={2} />
            ) : (
              <Menu className="h-4 w-4 text-zinc-200" strokeWidth={2} />
            )}
          </button>
        </div>

      </div>

      {/* FULL SCREEN SIDEBAR / MOBILE & TABLET NAVIGATION HUB PORTAL */}
      {mounted && typeof document !== 'undefined' && Boolean(document.body) && createPortal(
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-fullscreen-sidebar"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-[100] flex flex-col bg-[#09090b] text-white w-screen h-[100dvh] overflow-hidden lg:hidden"
            >
              {/* Top Bar inside Sidebar */}
              <div className="border-b border-zinc-800/80 px-5 sm:px-8 py-3.5 shrink-0 bg-[#09090b]">
                <div className="max-w-2xl w-full mx-auto flex items-center justify-between">
                  <button
                    onClick={() => {
                      setActiveTab('marketplace');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left focus:outline-none cursor-pointer"
                  >
                    <span className="text-xl font-bold tracking-tight text-white">
                      Link<span className="text-zinc-400 font-normal">Pulse</span>
                    </span>
                    <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                      Navigation Menu
                    </span>
                  </button>

                  <button
                    id="close-mobile-sidebar-btn"
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer shadow-lg"
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Scrollable middle container */}
              <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-8 py-6">
                <div className="max-w-2xl w-full mx-auto flex flex-col justify-between h-full space-y-6">
                  <div className="space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-2 pb-1">
                      Navigation Destinations
                    </div>

                    {navItems.map((item, index) => {
                      const isActive = activeTab === item.id;
                      const IconComponent = item.icon;

                      return (
                        <motion.button
                          key={item.id}
                          id={`mobile-nav-${item.id}-btn`}
                          type="button"
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04, duration: 0.2 }}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`group relative flex w-full items-center justify-between rounded-xl p-3.5 sm:p-4 text-left transition-all duration-200 cursor-pointer ${
                            isActive
                              ? 'bg-zinc-900/90 border border-zinc-700/90 text-white shadow-lg'
                              : 'border border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40 hover:border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-2">
                            {/* Active pill indicator */}
                            {isActive && (
                              <motion.span 
                                layoutId="activeTabPill"
                                className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}

                            {/* Icon */}
                            <div className={`flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 shrink-0 ${
                              isActive 
                                ? 'bg-zinc-800 text-white border border-zinc-600' 
                                : 'bg-zinc-950 text-zinc-400 border border-zinc-800/80 group-hover:text-white group-hover:bg-zinc-900'
                            }`}>
                              {item.isPulse ? (
                                <Circle className="h-4 w-4 fill-emerald-500 text-emerald-500 animate-pulse" />
                              ) : (
                                <IconComponent className="h-5 w-5" strokeWidth={1.75} />
                              )}
                            </div>

                            {/* Labels with BIG FONTS & NO OVERFLOW */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xl min-[380px]:text-2xl font-bold tracking-tight transition-colors duration-150 truncate ${
                                  isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                                }`}>
                                  {item.label}
                                </span>

                                {item.badge && (
                                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                    isActive
                                      ? 'bg-white text-zinc-950'
                                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400 font-normal mt-0.5 leading-snug line-clamp-1">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Right Arrow / Active Indicator with hover slide effect */}
                          <div className="flex items-center shrink-0">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                              isActive
                                ? 'bg-white text-zinc-950'
                                : 'text-zinc-500 group-hover:text-zinc-200 group-hover:translate-x-1'
                            }`}>
                              <ArrowRight className="h-4 w-4" strokeWidth={2} />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                    {/* Admin button on public sidebar only visible to admin role */}
                    {isAdmin && (
                      <div className="pt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-red-400 px-2 pb-2 flex items-center space-x-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                          <span>Admin Console</span>
                        </div>
                        <motion.button
                          id="mobile-sidebar-admin-btn"
                          type="button"
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25, duration: 0.2 }}
                          onClick={() => {
                            setActiveTab('admin');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`group relative flex w-full items-center justify-between rounded-xl p-3.5 sm:p-4 text-left transition-all duration-200 cursor-pointer ${
                            activeTab === 'admin'
                              ? 'bg-red-950/80 border border-red-700 text-white shadow-xl'
                              : 'bg-red-950/20 border border-red-900/40 text-red-200 hover:bg-red-950/50 hover:border-red-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-2">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 shrink-0 ${
                              activeTab === 'admin'
                                ? 'bg-red-900 text-white border border-red-600'
                                : 'bg-red-950/80 text-red-400 border border-red-900/60 group-hover:text-white'
                            }`}>
                              <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xl min-[380px]:text-2xl font-bold tracking-tight text-white truncate">
                                  Admin Panel
                                </span>
                                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-red-900/60 text-red-200 border border-red-700">
                                  Role
                                </span>
                              </div>
                              <p className="text-xs text-red-300/80 font-normal mt-0.5 leading-snug line-clamp-1">
                                Tab access & system controls
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-900/40 text-red-300 group-hover:bg-red-800 group-hover:text-white transition-all">
                              <ArrowRight className="h-4 w-4" strokeWidth={2} />
                            </div>
                          </div>
                        </motion.button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                    {onSignOut && (
                      <button
                        type="button"
                        id="sidebar-signout-btn"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full py-2.5 rounded-xl text-center text-sm font-medium text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out of LinkPulse</span>
                      </button>
                    )}
                    <button
                      type="button"
                      id="sidebar-close-footer-btn"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full py-3 rounded-xl text-center text-sm font-medium text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                    >
                      Close Navigation
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
};
