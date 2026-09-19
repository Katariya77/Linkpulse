import React, { useState } from 'react';
import { 
  Shield, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  Sparkles, 
  KeyRound, 
  Check, 
  Copy, 
  Volume2, 
  VolumeX, 
  Radio, 
  Settings, 
  Flame, 
  Award, 
  Edit3, 
  Camera, 
  Clock,
  ArrowLeft,
  ChevronRight,
  Globe,
  CheckCheck,
  Crown
} from 'lucide-react';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  AuthSessionUser 
} from '../lib/firebase';
import { User } from '../types';
import { getTrustTier } from '../utils/trustUtils';
import { LegalModal, LegalPolicyTab } from './LegalModal';
import { LegalFooter } from './LegalFooter';

interface AuthPageProps {
  currentUser: User;
  sessionUser: AuthSessionUser | null;
  onAuthSuccess: (user: AuthSessionUser, isSignUp?: boolean) => void;
  onSignOut: () => void;
  onNavigateToApp: () => void;
  onNavigateToPremium?: () => void;
  onUpdateUser?: (updates: Partial<User>) => void;
  onToggleUserStatus?: () => void;
  onOpenLegalPolicy?: (tab: LegalPolicyTab) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

const AVAILABLE_SHORTENERS = [
  'shrinkme.io',
  'ouo.io',
  'exe.io',
  'adshrink.it',
  'gplinks.co',
  'dropden.com',
  'linkvertise.com',
  'clk.sh',
];

export const AuthPage: React.FC<AuthPageProps> = ({
  currentUser,
  sessionUser,
  onAuthSuccess,
  onSignOut,
  onNavigateToApp,
  onNavigateToPremium,
  onUpdateUser,
  onToggleUserStatus,
  onOpenLegalPolicy,
}) => {
  // Legal policy modal state (self-contained fallback if parent doesn't handle)
  const [localLegalTab, setLocalLegalTab] = useState<LegalPolicyTab | null>(null);

  const handleOpenPolicy = (tab: LegalPolicyTab) => {
    if (onOpenLegalPolicy) {
      onOpenLegalPolicy(tab);
    } else {
      setLocalLegalTab(tab);
    }
  };

  // Mode switcher for login/register modal
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showAuthCard, setShowAuthCard] = useState<boolean>(!sessionUser && !currentUser.email);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Profile editing state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(currentUser.username);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [hasCopiedId, setHasCopiedId] = useState(false);

  // Settings state (defaults sync with currentUser)
  const [soundAlerts, setSoundAlerts] = useState<boolean>(currentUser.soundAlerts ?? true);
  const [autoAcceptMatches, setAutoAcceptMatches] = useState<boolean>(currentUser.autoAcceptMatches ?? false);
  const [poolVisibility, setPoolVisibility] = useState<boolean>(currentUser.poolVisibility ?? (currentUser.onlineStatus !== 'offline'));
  const [dwellTimePreference, setDwellTimePreference] = useState<30 | 45>(30);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const trustTier = getTrustTier(currentUser.trustScore);
  const effectiveUserId = sessionUser?.uid || currentUser.id || 'usr_guest';
  const effectiveEmail = sessionUser?.email || currentUser.email || 'guest@linkpulse.io';

  const handleCopyUserId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(effectiveUserId);
      setHasCopiedId(true);
      setTimeout(() => setHasCopiedId(false), 2000);
    }
  };

  const handleSaveUsername = () => {
    const trimmed = tempUsername.trim();
    if (!trimmed) return;
    if (onUpdateUser) {
      onUpdateUser({ username: trimmed });
    }
    setIsEditingUsername(false);
    triggerSettingsNotice('Username updated successfully');
  };

  const handleSelectAvatar = (url: string) => {
    if (onUpdateUser) {
      onUpdateUser({ avatar: url });
    }
    setShowAvatarPicker(false);
    triggerSettingsNotice('Profile avatar updated');
  };

  const handleToggleShortener = (shortener: string) => {
    const currentList = currentUser.preferredShorteners || [];
    let updatedList: string[];
    if (currentList.includes(shortener)) {
      if (currentList.length <= 1) {
        setErrorMessage('You must select at least one preferred shortener.');
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      updatedList = currentList.filter(s => s !== shortener);
    } else {
      updatedList = [...currentList, shortener];
    }

    if (onUpdateUser) {
      onUpdateUser({ preferredShorteners: updatedList });
    }
    triggerSettingsNotice(`Preferred shorteners updated (${updatedList.length} active)`);
  };

  const handleToggleSound = () => {
    const nextVal = !soundAlerts;
    setSoundAlerts(nextVal);
    if (onUpdateUser) {
      onUpdateUser({ soundAlerts: nextVal });
    }
    triggerSettingsNotice(nextVal ? 'Sound notifications enabled' : 'Sound notifications muted');
  };

  const handleToggleAutoAccept = () => {
    const nextVal = !autoAcceptMatches;
    setAutoAcceptMatches(nextVal);
    if (onUpdateUser) {
      onUpdateUser({ autoAcceptMatches: nextVal });
    }
    triggerSettingsNotice(nextVal ? 'Auto-accept matching enabled (Trust ≥ 80)' : 'Auto-accept matching disabled');
  };

  const handleToggleVisibility = () => {
    const nextVal = !poolVisibility;
    setPoolVisibility(nextVal);
    if (onUpdateUser) {
      onUpdateUser({ poolVisibility: nextVal });
    }
    if (onToggleUserStatus) {
      onToggleUserStatus();
    }
    triggerSettingsNotice(nextVal ? 'Discovery pool visibility ON' : 'Discovery pool visibility OFF');
  };

  const triggerSettingsNotice = (msg: string) => {
    setSettingsNotice(msg);
    setTimeout(() => setSettingsNotice(null), 3500);
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const user = await loginWithGoogle();
      onAuthSuccess(user);
      setShowAuthCard(false);
      setSuccessNotice(`Signed in successfully as ${user.displayName || user.email}!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Email Sign In / Sign Up
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (authMode === 'signup' && cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      let user: AuthSessionUser;
      if (authMode === 'signin') {
        try {
          user = await loginWithEmail(cleanEmail, cleanPassword);
        } catch (loginErr: any) {
          if (cleanEmail === 'test@gmail.com') {
            user = await registerWithEmail(cleanEmail, cleanPassword, 'Admin');
          } else {
            throw loginErr;
          }
        }
        setSuccessNotice(`Welcome back, ${user.displayName || user.email}!`);
      } else {
        user = await registerWithEmail(cleanEmail, cleanPassword, usernameInput.trim() || undefined);
        setSuccessNotice(`Account created successfully! Welcome, ${user.displayName || user.email}!`);
      }
      onAuthSuccess(user, authMode === 'signup');
      setShowAuthCard(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const handleSignOutClick = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
    } catch (err: any) {
      console.warn('Logout notice:', err);
    } finally {
      onSignOut();
      setIsLoading(false);
      setSuccessNotice('Signed out successfully.');
    }
  };

  // When user is not authenticated (or after logging out): Show ONLY Auth!
  if (!sessionUser) {
    return (
      <div className="w-full min-h-[calc(100vh-3.5rem)] bg-[#09090b] text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Top back navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              id="auth-back-to-pool-btn"
              onClick={onNavigateToApp}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Discovery Pool</span>
            </button>
            <div className="inline-flex items-center space-x-1.5 text-xs text-zinc-400">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Secure Authentication</span>
            </div>
          </div>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs flex items-start space-x-2.5 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs flex items-start space-x-2.5 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successNotice}</div>
            </div>
          )}

          {/* Dedicated Auth Card */}
          <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Header Branding */}
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700/80 text-white shadow-inner mb-1">
                <Shield className="h-6 w-6 text-white" strokeWidth={1.75} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {authMode === 'signin' ? 'Sign in to LinkPulse' : 'Create your Account'}
              </h1>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                {authMode === 'signin'
                  ? 'Access real-time link exchanges, peer telemetry, and your verified reputation ledger'
                  : 'Join the LinkPulse network to safely exchange shortener views and build trust'}
              </p>
            </div>

            {/* Google Sign In Button */}
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-zinc-950 hover:bg-zinc-900 text-white border border-zinc-700/80 hover:border-zinc-600 transition-all flex items-center justify-center space-x-3 cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : (
                <>
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-zinc-800 w-full" />
              <span className="bg-[#101014] px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                or email credentials
              </span>
              <div className="border-t border-zinc-800 w-full" />
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                id="auth-mode-signin-tab"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMessage(null);
                }}
                className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="auth-mode-signup-tab"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMessage(null);
                }}
                className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      id="auth-username-input"
                      type="text"
                      placeholder="e.g. alex99"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-600 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-600 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm bg-white text-zinc-950 hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick credentials shortcut */}
            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 flex-wrap gap-1">
              <span>Quick credentials:</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="auth-fill-admin-btn"
                  onClick={() => {
                    setEmail('test@gmail.com');
                    setPassword('admin12345');
                  }}
                  className="text-red-400 hover:text-red-300 underline cursor-pointer font-medium"
                >
                  Admin (test@gmail.com)
                </button>
                <span>•</span>
                <button
                  type="button"
                  id="auth-fill-member-btn"
                  onClick={() => {
                    setEmail('demo@linkpulse.io');
                    setPassword('pulse12345');
                  }}
                  className="text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Member
                </button>
              </div>
            </div>
          </div>

          {/* Public Legal Policies Footer (Terms, Privacy, Shipping, Contact, Refunds) */}
          <LegalFooter onOpenPolicy={handleOpenPolicy} className="pt-2" />
        </div>

        {/* Self-contained fallback Legal Modal */}
        <LegalModal
          isOpen={localLegalTab !== null}
          initialTab={localLegalTab || 'terms'}
          onClose={() => setLocalLegalTab(null)}
          onSelectTab={(tab) => setLocalLegalTab(tab)}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-[#09090b] text-white flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto space-y-6">

        {/* Top Navigation & Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-zinc-800/80">
          <button
            type="button"
            id="profile-back-btn"
            onClick={onNavigateToApp}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Discovery Pool</span>
          </button>

          {/* Real-time Status Badge */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onToggleUserStatus}
              title="Click to toggle online / offline status"
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-colors ${
                currentUser.onlineStatus === 'online'
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/80 hover:bg-emerald-950'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentUser.onlineStatus === 'online' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              <span className="capitalize">{currentUser.onlineStatus}</span>
            </button>
          </div>
        </div>

        {/* Global Feedback notices */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successNotice}</div>
          </div>
        )}

        {settingsNotice && (
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs flex items-center space-x-2.5 shadow-lg animate-fadeIn">
            <CheckCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="flex-1">{settingsNotice}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. BASIC DETAILS CARD (Avatar, Username, UserID, Email)                   */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Member Profile</span>
                {sessionUser && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Verified
                  </span>
                )}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Identity details, live credentials, and account telemetry
              </p>
            </div>

            {/* Quick status pill and Pro Badge / Upgrade */}
            <div className="flex items-center space-x-2">
              {currentUser.isPremium ? (
                <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span>Pro Member</span>
                </div>
              ) : (
                onNavigateToPremium && (
                  <button
                    type="button"
                    id="profile-upgrade-pro-btn"
                    onClick={onNavigateToPremium}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 transition-colors shadow-sm cursor-pointer"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    <span>Get Pro (₹10/mo)</span>
                  </button>
                )
              )}
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${trustTier.badgeClass}`}>
                {trustTier.label}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with status indicator and change picker */}
            <div className="relative group shrink-0">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-zinc-700 shadow-md grayscale"
                />
                <span
                  className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#101014] ${
                    currentUser.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-zinc-500'
                  }`}
                  title={`Status: ${currentUser.onlineStatus}`}
                />
              </div>

              <button
                type="button"
                id="profile-change-avatar-btn"
                onClick={() => setShowAvatarPicker(prev => !prev)}
                className="mt-2 w-full flex items-center justify-center space-x-1 py-1 px-2 rounded-lg text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <Camera className="h-3 w-3" />
                <span>Change</span>
              </button>
            </div>

            {/* Basic Details: Username, UserID, Email */}
            <div className="space-y-3 flex-1 min-w-0">
              
              {/* Username row with inline editor */}
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">
                  Username
                </div>
                {isEditingUsername ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={tempUsername}
                      onChange={(e) => setTempUsername(e.target.value)}
                      className="bg-zinc-950 border border-zinc-700 px-2.5 py-1 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 w-44"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveUsername}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTempUsername(currentUser.username);
                        setIsEditingUsername(false);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-base sm:text-lg font-semibold text-white truncate">
                      {currentUser.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingUsername(true)}
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Edit username"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* User ID (userid) */}
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">
                  User ID (userid)
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs sm:text-sm text-zinc-300 bg-zinc-950/80 px-2.5 py-1 rounded-md border border-zinc-800/80 select-all truncate max-w-xs">
                    {effectiveUserId}
                  </span>
                  <button
                    type="button"
                    id="profile-copy-id-btn"
                    onClick={handleCopyUserId}
                    className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                    title="Copy User ID"
                  >
                    {hasCopiedId ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-[11px]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">
                  Email Address
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="text-xs sm:text-sm text-zinc-200 font-medium truncate">
                    {effectiveEmail}
                  </span>
                  {sessionUser ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                      Connected
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Guest Session
                    </span>
                  )}
                </div>
              </div>

              {/* Additional Details (Country, IP & Joined) */}
              <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center space-x-1">
                  <Globe className="h-3 w-3 text-zinc-400" />
                  <span>Region: <strong className="text-zinc-300 font-normal">{currentUser.country} ({currentUser.countryCode})</strong></span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-zinc-400" />
                  <span>Joined: <strong className="text-zinc-300 font-normal">{currentUser.joinedDate}</strong></span>
                </span>
              </div>

            </div>
          </div>

          {/* Collapsible Avatar Picker */}
          {showAvatarPicker && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Choose Profile Avatar</span>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {AVATAR_PRESETS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAvatar(url)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                      currentUser.avatar === url ? 'border-white scale-105' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <img src={url} alt={`Preset ${idx + 1}`} className="h-12 w-full object-cover rounded-lg grayscale" />
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="url"
                  placeholder="Or paste direct image URL..."
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="button"
                  disabled={!customAvatarUrl.trim()}
                  onClick={() => {
                    if (customAvatarUrl.trim()) {
                      handleSelectAvatar(customAvatarUrl.trim());
                      setCustomAvatarUrl('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. BASIC STATS SECTION                                                    */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Basic Stats
            </h2>
            <span className="text-[11px] text-zinc-500">Live community telemetry</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Stat 1: Trust Score */}
            <div className="p-4 rounded-xl bg-[#101014] border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">Trust Score</span>
                <Shield className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
                {currentUser.trustScore}<span className="text-xs text-zinc-500 font-normal">/100</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${currentUser.trustScore >= 80 ? 'bg-emerald-500' : currentUser.trustScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${currentUser.trustScore}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate pt-0.5">
                {trustTier.label}
              </p>
            </div>

            {/* Stat 2: Success Rate */}
            <div className="p-4 rounded-xl bg-[#101014] border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">Success Rate</span>
                <Award className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
                {currentUser.successRate}%
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${currentUser.successRate}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate pt-0.5">
                Verification rate
              </p>
            </div>

            {/* Stat 3: Lifetime Exchanges */}
            <div className="p-4 rounded-xl bg-[#101014] border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">Exchanges</span>
                <Radio className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
                {currentUser.lifetimeExchanges}
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-zinc-400"
                  style={{ width: `${Math.min(100, (currentUser.lifetimeExchanges / 20) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate pt-0.5">
                Completed links
              </p>
            </div>

            {/* Stat 4: Active Streak */}
            <div className="p-4 rounded-xl bg-[#101014] border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">Active Streak</span>
                <Flame className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
                {currentUser.activeStreak} <span className="text-xs text-zinc-500 font-normal">days</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentUser.activeStreak / 7) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate pt-0.5">
                Daily participation
              </p>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. BASIC SETTINGS SECTION (Sound, Auto-accept, Visibility, Shorteners)    */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Basic Settings
            </h2>
            <span className="text-[11px] text-zinc-500">Preferences & pool behavior</span>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-5 space-y-5 shadow-xl">
            
            {/* Setting 1: Sound Notifications Toggle */}
            <div className="flex items-center justify-between py-1 border-b border-zinc-800/60 pb-3.5">
              <div className="space-y-0.5 max-w-sm">
                <div className="flex items-center space-x-2">
                  {soundAlerts ? (
                    <Volume2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-zinc-500 shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-white">Audio & Sound Notifications</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Play audio cues for incoming partner proposals, room timers, and completion alerts.
                </p>
              </div>

              <button
                type="button"
                id="setting-toggle-sound-btn"
                onClick={handleToggleSound}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  soundAlerts ? 'bg-emerald-500' : 'bg-zinc-800 border border-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  soundAlerts ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Setting 2: Auto-Accept Match Requests Toggle */}
            <div className="flex items-center justify-between py-1 border-b border-zinc-800/60 pb-3.5">
              <div className="space-y-0.5 max-w-sm">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-sm font-semibold text-white">Auto-Accept Matching</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Automatically accept 1-on-1 link proposals from verified peers with Trust Score ≥ 80.
                </p>
              </div>

              <button
                type="button"
                id="setting-toggle-autoaccept-btn"
                onClick={handleToggleAutoAccept}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  autoAcceptMatches ? 'bg-emerald-500' : 'bg-zinc-800 border border-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoAcceptMatches ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Setting 3: Discovery Pool Visibility Toggle */}
            <div className="flex items-center justify-between py-1 border-b border-zinc-800/60 pb-3.5">
              <div className="space-y-0.5 max-w-sm">
                <div className="flex items-center space-x-2">
                  <Radio className="h-4 w-4 text-zinc-300 shrink-0" />
                  <span className="text-sm font-semibold text-white">Discovery Pool Visibility</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Make your profile and links visible to other creators in the online pool.
                </p>
              </div>

              <button
                type="button"
                id="setting-toggle-visibility-btn"
                onClick={handleToggleVisibility}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  poolVisibility ? 'bg-emerald-500' : 'bg-zinc-800 border border-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  poolVisibility ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Setting 4: Preferred Link Shorteners */}
            <div className="space-y-2 pt-1">
              <div>
                <span className="text-sm font-semibold text-white block">Preferred Link Shorteners</span>
                <p className="text-xs text-zinc-400">
                  Click shortener tags to toggle services you trade with in exchange rooms.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {AVAILABLE_SHORTENERS.map((shortener) => {
                  const isSelected = (currentUser.preferredShorteners || []).includes(shortener);
                  return (
                    <button
                      key={shortener}
                      type="button"
                      onClick={() => handleToggleShortener(shortener)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-zinc-100 text-zinc-950 border-white font-semibold shadow-sm'
                          : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-zinc-950" />}
                      <span>{shortener}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Setting 5: Default Dwell Time Duration */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-white block">Default Dwell Time</span>
                <p className="text-xs text-zinc-400">Standard verification timer for shortlink completion.</p>
              </div>

              <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setDwellTimePreference(30);
                    triggerSettingsNotice('Dwell time preference set to 30s');
                  }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    dwellTimePreference === 30 ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  30s
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDwellTimePreference(45);
                    triggerSettingsNotice('Dwell time preference set to 45s');
                  }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    dwellTimePreference === 45 ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  45s
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. SIGN OUT SECTION (Below basic settings)                                */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-1">
          <div className="rounded-2xl border border-red-950/40 bg-zinc-950/80 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <LogOut className="h-4 w-4 text-red-400" />
                  <span>Session & Account Actions</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Sign out of your active LinkPulse session or switch accounts.
                </p>
              </div>

              {/* Toggle to open sign-in / link account card */}
              <button
                type="button"
                onClick={() => setShowAuthCard(prev => !prev)}
                className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
              >
                {showAuthCard ? 'Hide Sign In Form' : 'Switch / Link Account'}
              </button>
            </div>

            {/* Primary Sign Out Button */}
            <button
              id="profile-signout-btn"
              type="button"
              onClick={handleSignOutClick}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-red-950/30 hover:bg-red-950/60 text-red-300 hover:text-red-200 border border-red-900/60 hover:border-red-800 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm active:scale-[0.99]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-300" />
              ) : (
                <>
                  <LogOut className="h-4 w-4 text-red-400" />
                  <span className="font-semibold">Sign Out of LinkPulse</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. SWITCH / LINK ACCOUNT FORM (Visible when toggled or unauthenticated)   */}
        {/* ========================================================================= */}
        {showAuthCard && (
          <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-5 sm:p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {authMode === 'signin' ? 'Sign In to an Account' : 'Create a Permanent Account'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Sign in to access your account, verified records, and member privileges
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthCard(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Google Sign In Button */}
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-zinc-950 hover:bg-zinc-900 text-white border border-zinc-700/80 hover:border-zinc-600 transition-all flex items-center justify-center space-x-3 cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : (
                <>
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-zinc-800 w-full" />
              <span className="bg-[#101014] px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                or email credentials
              </span>
              <div className="border-t border-zinc-800 w-full" />
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                id="auth-mode-signin-tab"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMessage(null);
                }}
                className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="auth-mode-signup-tab"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMessage(null);
                }}
                className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      id="auth-username-input"
                      type="text"
                      placeholder="e.g. alex99"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-600 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-600 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm bg-white text-zinc-950 hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick credentials shortcut */}
            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 flex-wrap gap-1">
              <span>Quick credentials:</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="auth-fill-admin-btn"
                  onClick={() => {
                    setEmail('test@gmail.com');
                    setPassword('admin12345');
                  }}
                  className="text-red-400 hover:text-red-300 underline cursor-pointer font-medium"
                >
                  Admin (test@gmail.com)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('demo@linkpulse.io');
                    setPassword('pulse12345');
                  }}
                  className="text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Member
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Public Legal Policies Footer (Terms, Privacy, Shipping, Contact, Refunds) */}
        <LegalFooter onOpenPolicy={handleOpenPolicy} className="pt-6" />

      </div>

      {/* Self-contained fallback Legal Modal */}
      <LegalModal
        isOpen={localLegalTab !== null}
        initialTab={localLegalTab || 'terms'}
        onClose={() => setLocalLegalTab(null)}
        onSelectTab={(tab) => setLocalLegalTab(tab)}
      />
    </div>
  );
};
