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
  ExternalLink,
  KeyRound,
  Check
} from 'lucide-react';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  isFirebaseConfigured,
  firebaseConfig,
  AuthSessionUser 
} from '../lib/firebase';
import { User } from '../types';

interface AuthPageProps {
  currentUser: User;
  sessionUser: AuthSessionUser | null;
  onAuthSuccess: (user: AuthSessionUser) => void;
  onSignOut: () => void;
  onNavigateToApp: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  currentUser,
  sessionUser,
  onAuthSuccess,
  onSignOut,
  onNavigateToApp,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const user = await loginWithGoogle();
      onAuthSuccess(user);
      setSuccessNotice(`Signed in successfully as ${user.displayName || user.email}!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
      setErrorMessage('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (mode === 'signup' && cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      let user: AuthSessionUser;
      if (mode === 'signin') {
        try {
          user = await loginWithEmail(cleanEmail, cleanPassword);
        } catch (loginErr: any) {
          // If admin test account doesn't exist yet, auto-register it transparently
          if (cleanEmail === 'test@gmail.com') {
            user = await registerWithEmail(cleanEmail, cleanPassword, 'Admin');
          } else {
            throw loginErr;
          }
        }
        setSuccessNotice(`Welcome back, ${user.displayName || user.email}!`);
      } else {
        user = await registerWithEmail(cleanEmail, cleanPassword, username.trim() || undefined);
        setSuccessNotice(`Account created successfully! Welcome, ${user.displayName || user.email}!`);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutClick = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      onSignOut();
      setSuccessNotice('Signed out successfully.');
    } catch (err: any) {
      setErrorMessage('Error signing out');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-[#09090b] text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto space-y-6">

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
            <span className={`h-2 w-2 rounded-full shrink-0 ${isFirebaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-mono text-zinc-300 font-medium">{firebaseConfig.projectId}</span>
            <span className="text-zinc-600">/</span>
            <span className="font-mono text-zinc-400">{firebaseConfig.firestoreDatabaseId || 'linkpulse-db'}</span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-emerald-400 border border-emerald-900/60 font-medium">LIVE</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {sessionUser ? 'Account Profile' : mode === 'signin' ? 'Welcome to LinkPulse' : 'Create an Account'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {sessionUser 
              ? 'Your account is active and connected to the link exchange community.'
              : mode === 'signin'
              ? 'Sign in to access live exchange rooms and start trading shortlinks.'
              : 'Join the community to exchange shortlinks and grow verified clicks safely.'}
          </p>
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

        {/* Authenticated State Card */}
        {sessionUser ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={sessionUser.photoURL || currentUser.avatar}
                  alt={sessionUser.displayName || 'User'}
                  className="h-14 w-14 rounded-full object-cover border-2 border-zinc-700 grayscale"
                />
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
              </div>

              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold text-white truncate">
                    {sessionUser.displayName || currentUser.username}
                  </h3>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                    {sessionUser.providerId}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">
                  {sessionUser.email || `${currentUser.username.toLowerCase()}@member.linkpulse.io`}
                </p>
                <div className="flex items-center space-x-2 pt-1 text-[11px] text-zinc-500">
                  <span>Trust Score: <strong className="text-zinc-300">{currentUser.trustScore}/100</strong></span>
                  <span>•</span>
                  <span>Streak: <strong className="text-zinc-300">{currentUser.activeStreak}d</strong></span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                id="auth-return-app-btn"
                type="button"
                onClick={onNavigateToApp}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-white text-zinc-950 hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md"
              >
                <span>Continue to Exchange Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                id="auth-signout-btn"
                type="button"
                onClick={handleSignOutClick}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4 text-zinc-400" />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Unauthenticated State: Sign In / Sign Up Card */
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
            
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
              <span className="bg-[#121215] px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                or with email
              </span>
              <div className="border-t border-zinc-800 w-full" />
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                id="auth-mode-signin-tab"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
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
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
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
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <span className="text-[11px] text-zinc-500">
                      Minimum 6 characters
                    </span>
                  )}
                </div>
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Fill Helper */}
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

        {/* Security & Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2">
          <div className="p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/60">
            <Shield className="h-4 w-4 text-zinc-400 mx-auto mb-1" />
            <div className="text-[11px] font-medium text-zinc-300">End-to-End</div>
            <div className="text-[9px] text-zinc-500">Safe sessions</div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/60">
            <KeyRound className="h-4 w-4 text-zinc-400 mx-auto mb-1" />
            <div className="text-[11px] font-medium text-zinc-300">Firebase Auth</div>
            <div className="text-[9px] text-zinc-500">Google & Pass</div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/60">
            <Sparkles className="h-4 w-4 text-zinc-400 mx-auto mb-1" />
            <div className="text-[11px] font-medium text-zinc-300">Trust Sync</div>
            <div className="text-[9px] text-zinc-500">Score & Streaks</div>
          </div>
        </div>

        {/* Back to App button (Only when authenticated) */}
        {sessionUser && (
          <div className="text-center pt-2">
            <button
              type="button"
              id="auth-back-to-app-footer-btn"
              onClick={onNavigateToApp}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              ← Return to Discovery Pool
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
