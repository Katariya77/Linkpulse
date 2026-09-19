import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  ArrowLeft,
  ExternalLink,
  QrCode,
  Award,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  MessageCircle,
  Twitter,
  Send,
  UserPlus
} from 'lucide-react';
import { User, ReferralRecord } from '../types';
import { 
  subscribeToUserReferrals, 
  simulateReferralInvitation, 
  redeemReferralCode, 
  updateUserReferralCode 
} from '../lib/firestoreService';

interface ReferralPageProps {
  currentUser: User;
  onBackToPool: () => void;
  onOpenTrustInspector?: () => void;
  initialReferralCodeFromUrl?: string;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({
  currentUser,
  onBackToPool,
  onOpenTrustInspector,
  initialReferralCodeFromUrl,
}) => {
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Custom code edit state
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState(currentUser.referralCode || '');
  const [editStatusMessage, setEditStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingCode, setIsSavingCode] = useState(false);

  // Redeem friend's code state
  const [redeemInput, setRedeemInput] = useState(initialReferralCodeFromUrl || '');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; message: string } | null>(null);

  // Live simulation sandbox state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationName, setSimulationName] = useState('');
  const [simulationBanner, setSimulationBanner] = useState<string | null>(null);

  // Current active referral code
  const activeReferralCode = currentUser.referralCode || `LP-${(currentUser.username || 'CREATOR').slice(0, 6).toUpperCase()}-${currentUser.id.slice(0, 4).toUpperCase()}`;
  
  // Build referral link
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://linkpulse.io';
  const referralLink = `${originUrl}/?ref=${activeReferralCode}`;

  // Real-time listener for referrals
  useEffect(() => {
    const unsub = subscribeToUserReferrals(currentUser.id, (records) => {
      setReferrals(records);
    });
    return () => unsub();
  }, [currentUser.id]);

  // Keep customCodeInput synced if currentUser changes and not currently editing
  useEffect(() => {
    if (!isEditingCode && currentUser.referralCode) {
      setCustomCodeInput(currentUser.referralCode);
    }
  }, [currentUser.referralCode, isEditingCode]);

  // Handle copy invitation link
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Handle copy referral code only
  const handleCopyCodeOnly = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(activeReferralCode);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {}
  };

  // Save customized code
  const handleSaveCustomCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCodeInput.trim()) return;
    setIsSavingCode(true);
    setEditStatusMessage(null);
    const res = await updateUserReferralCode(currentUser.id, customCodeInput);
    setIsSavingCode(false);
    if (res.success) {
      setIsEditingCode(false);
      setEditStatusMessage({ type: 'success', text: 'Referral code updated successfully!' });
      setTimeout(() => setEditStatusMessage(null), 3500);
    } else {
      setEditStatusMessage({ type: 'error', text: res.message || 'Failed to update code.' });
    }
  };

  // Handle redeem friend's code
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemInput.trim() || redeemLoading) return;
    setRedeemLoading(true);
    setRedeemResult(null);
    const res = await redeemReferralCode(redeemInput.trim(), currentUser);
    setRedeemLoading(false);
    setRedeemResult({ success: res.success, message: res.message });
  };

  // Handle live test simulation
  const handleSimulateInvite = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationBanner(null);
    const res = await simulateReferralInvitation(currentUser, simulationName.trim() || undefined);
    setIsSimulating(false);
    setSimulationBanner(res.message);
    setSimulationName('');
    setTimeout(() => {
      setSimulationBanner(null);
    }, 6000);
  };

  // Social share urls
  const shareText = encodeURIComponent(`Join me on LinkPulse to exchange verified shortlinks, build high-dwell compliance, and earn daily rewards! Use my invite code: ${activeReferralCode}`);
  const encodedLink = encodeURIComponent(referralLink);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}%20${encodedLink}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedLink}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedLink}&text=${shareText}`;

  // Metrics calculation
  const totalReferralXp = currentUser.referralXp || (referrals.length * 50);
  const totalTrustBoost = (currentUser.referralsCount || referrals.length) * 2;
  const count = referrals.length || currentUser.referralsCount || 0;

  // Ambassador tier
  const getAmbassadorTier = (referralCount: number) => {
    if (referralCount >= 10) return { name: 'Pulse Vanguard', level: 'Level 4', nextGoal: 20, icon: Sparkles, color: 'text-emerald-400' };
    if (referralCount >= 5) return { name: 'Pulse Ambassador', level: 'Level 3', nextGoal: 10, icon: Award, color: 'text-amber-400' };
    if (referralCount >= 3) return { name: 'Community Builder', level: 'Level 2', nextGoal: 5, icon: Users, color: 'text-indigo-400' };
    if (referralCount >= 1) return { name: 'Network Spark', level: 'Level 1', nextGoal: 3, icon: Zap, color: 'text-cyan-400' };
    return { name: 'Novice Scout', level: 'Starter', nextGoal: 1, icon: UserPlus, color: 'text-zinc-400' };
  };

  const ambassador = getAmbassadorTier(count);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            id="back-to-pool-button"
            onClick={onBackToPool}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Pool
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-950/70 border border-emerald-800/80 text-emerald-400">
                <Gift className="h-3.5 w-3.5" />
              </div>
              <h1 className="text-base font-semibold text-white tracking-tight">
                Creator Referral Program
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
                +2 Trust / Invite
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Invite peer creators to LinkPulse. Earn Referral XP and continuously elevate your Trust Score rating.
            </p>
          </div>
        </div>

        {onOpenTrustInspector && (
          <button
            type="button"
            onClick={onOpenTrustInspector}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
            Inspect Trust Ledger
          </button>
        )}
      </div>

      {/* Simulation Feedback Alert */}
      {simulationBanner && (
        <div className="rounded-lg border border-emerald-800/80 bg-emerald-950/40 p-3.5 flex items-start space-x-3 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200">
            <p className="font-semibold text-emerald-300">Live Simulation Successful!</p>
            <p className="mt-0.5 text-emerald-200/90">{simulationBanner}</p>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Referral XP Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Referral XP</span>
            <Zap className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {totalReferralXp}
            </span>
            <span className="text-xs text-zinc-500 font-medium">XP</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            +50 XP credited for each joined creator
          </p>
        </div>

        {/* Trust Score Boost Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Trust Score Boost</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400 tabular-nums">
              +{totalTrustBoost}
            </span>
            <span className="text-xs text-zinc-500 font-medium">PTS</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Permanent reputation restoration & boost
          </p>
        </div>

        {/* Friends Invited Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Creators Invited</span>
            <Users className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {count}
            </span>
            <span className="text-xs text-zinc-500 font-medium">Members</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Active in exchange rooms & discovery
          </p>
        </div>

        {/* Ambassador Tier Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Ambassador Rank</span>
            <Award className={`h-3.5 w-3.5 ${ambassador.color}`} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-base sm:text-lg font-bold text-white truncate`}>
              {ambassador.name}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            {count >= ambassador.nextGoal 
              ? 'Max Tier achieved!' 
              : `${ambassador.nextGoal - count} more invite${ambassador.nextGoal - count > 1 ? 's' : ''} to next rank`}
          </p>
        </div>
      </div>

      {/* Main Referral Link & Code Generator Section */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3.5">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Share2 className="h-4 w-4 text-emerald-400" />
              Your Unique Invitation Link & Code
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Share your link with shortlink creators on Telegram, WhatsApp, Discord, or YouTube communities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="toggle-qr-code-button"
              onClick={() => setShowQrModal(!showQrModal)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <QrCode className="h-3.5 w-3.5 text-zinc-400" />
              {showQrModal ? 'Hide QR' : 'Show QR'}
            </button>
          </div>
        </div>

        {/* Link Input Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 flex items-center rounded-md border border-zinc-700/80 bg-zinc-900 px-3 py-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full bg-transparent text-xs text-zinc-200 font-mono focus:outline-none select-all"
            />
          </div>

          <button
            type="button"
            id="copy-referral-link-button"
            onClick={handleCopyLink}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded font-medium text-xs transition-colors shrink-0 ${
              isCopied 
                ? 'bg-emerald-600 text-white' 
                : 'bg-zinc-100 text-zinc-900 hover:bg-white'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Code Customization & Quick Share */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Custom Code Pill */}
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Referral Code Handle</span>
              {!isEditingCode ? (
                <button
                  type="button"
                  id="edit-referral-code-button"
                  onClick={() => setIsEditingCode(true)}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Edit3 className="h-3 w-3" />
                  Customize
                </button>
              ) : null}
            </div>

            {isEditingCode ? (
              <form onSubmit={handleSaveCustomCode} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCodeInput}
                    onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. LP-VIPCREATOR"
                    maxLength={20}
                    className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white uppercase font-mono focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={isSavingCode}
                    className="px-2.5 py-1 rounded bg-zinc-200 text-zinc-900 text-xs font-medium hover:bg-white disabled:opacity-50 flex items-center gap-1"
                  >
                    <Save className="h-3 w-3" />
                    {isSavingCode ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingCode(false);
                      setCustomCodeInput(currentUser.referralCode || '');
                    }}
                    className="px-2 py-1 rounded border border-zinc-800 text-zinc-400 text-xs hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
                {editStatusMessage && (
                  <p className={`text-[11px] ${editStatusMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {editStatusMessage.text}
                  </p>
                )}
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded">
                  {activeReferralCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCodeOnly}
                  className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                >
                  Copy Code Only
                </button>
              </div>
            )}
          </div>

          {/* Instant Social Sharing Buttons */}
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3 flex flex-col justify-between gap-2">
            <span className="text-xs text-zinc-400 font-medium">Quick 1-Click Share</span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-xs font-medium hover:bg-emerald-900 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950/70 border border-cyan-800/70 text-cyan-300 text-xs font-medium hover:bg-cyan-900 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Telegram
              </a>
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-medium hover:bg-zinc-800 transition-colors"
              >
                <Twitter className="h-3.5 w-3.5" />
                X (Twitter)
              </a>
            </div>
          </div>
        </div>

        {/* Collapsible SVG QR Code Drawer */}
        {showQrModal && (
          <div className="rounded border border-zinc-800 bg-zinc-900/90 p-4 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
            <div className="bg-white p-3 rounded-lg shadow-inner">
              {/* Clean SVG QR Visualizer representation */}
              <svg 
                className="w-36 h-36" 
                viewBox="0 0 100 100" 
                fill="black"
              >
                {/* Position Markers */}
                <rect x="5" y="5" width="28" height="28" fill="#000" rx="3" />
                <rect x="9" y="9" width="20" height="20" fill="#fff" rx="2" />
                <rect x="13" y="13" width="12" height="12" fill="#000" rx="1" />

                <rect x="67" y="5" width="28" height="28" fill="#000" rx="3" />
                <rect x="71" y="9" width="20" height="20" fill="#fff" rx="2" />
                <rect x="75" y="13" width="12" height="12" fill="#000" rx="1" />

                <rect x="5" y="67" width="28" height="28" fill="#000" rx="3" />
                <rect x="9" y="71" width="20" height="20" fill="#fff" rx="2" />
                <rect x="13" y="75" width="12" height="12" fill="#000" rx="1" />

                {/* Simulated Data Grid Cells */}
                <rect x="40" y="8" width="6" height="6" />
                <rect x="52" y="8" width="6" height="6" />
                <rect x="44" y="18" width="6" height="6" />
                <rect x="56" y="24" width="6" height="6" />
                <rect x="40" y="32" width="6" height="6" />
                <rect x="10" y="44" width="6" height="6" />
                <rect x="22" y="40" width="6" height="6" />
                <rect x="30" y="48" width="6" height="6" />
                <rect x="42" y="44" width="6" height="6" />
                <rect x="52" y="44" width="6" height="6" />
                <rect x="62" y="40" width="6" height="6" />
                <rect x="74" y="44" width="6" height="6" />
                <rect x="86" y="40" width="6" height="6" />
                <rect x="44" y="56" width="6" height="6" />
                <rect x="56" y="56" width="6" height="6" />
                <rect x="68" y="56" width="6" height="6" />
                <rect x="80" y="56" width="6" height="6" />
                <rect x="40" y="68" width="6" height="6" />
                <rect x="52" y="74" width="6" height="6" />
                <rect x="64" y="68" width="6" height="6" />
                <rect x="76" y="76" width="6" height="6" />
                <rect x="44" y="84" width="6" height="6" />
                <rect x="58" y="84" width="6" height="6" />
                <rect x="72" y="84" width="6" height="6" />
                <rect x="86" y="84" width="6" height="6" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-200">Scan to join via {activeReferralCode}</p>
              <p className="text-[11px] text-zinc-400">Direct mobile camera onboarding for peer link exchangers</p>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: Live Testing Sandbox & Friend Code Redemption */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Interactive Live Simulation Sandbox */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 text-emerald-400" />
                Test Referral Sandbox (Live Demo)
              </h3>
              <span className="text-[10px] bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 px-1.5 py-0.5 rounded">
                Interactive Test
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Simulate an incoming creator joining through your unique invitation link to test the instant +50 XP and +2 Trust Score boost in real-time.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={simulationName}
                onChange={(e) => setSimulationName(e.target.value)}
                placeholder="Optional creator name (or random)"
                className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="button"
                id="simulate-referral-button"
                onClick={handleSimulateInvite}
                disabled={isSimulating}
                className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {isSimulating ? 'Simulating...' : 'Simulate Join'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              Automatically creates a verified referral record in Firestore and appends an immutable Trust Ledger audit log entry.
            </p>
          </div>
        </div>

        {/* Claim / Redeem Friend's Code */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-indigo-400" />
                Have a Peer's Referral Code?
              </h3>
              {currentUser.referredBy && (
                <span className="text-[10px] bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 px-1.5 py-0.5 rounded">
                  Redeemed: {currentUser.referredBy}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Were you invited by another LinkPulse member? Redeem their code to give them +50 XP and earn a +25 Welcome XP boost for yourself!
            </p>
          </div>

          <form onSubmit={handleRedeemCode} className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                disabled={Boolean(currentUser.referredBy)}
                value={redeemInput}
                onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
                placeholder={currentUser.referredBy ? `Claimed code ${currentUser.referredBy}` : 'e.g. LP-PEER99'}
                className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 uppercase font-mono focus:outline-none focus:border-zinc-600 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={Boolean(currentUser.referredBy) || redeemLoading || !redeemInput.trim()}
                id="redeem-code-button"
                className="px-3.5 py-1.5 rounded bg-zinc-100 text-zinc-900 text-xs font-medium hover:bg-white transition-colors disabled:opacity-50 shrink-0"
              >
                {redeemLoading ? 'Redeeming...' : 'Claim Code'}
              </button>
            </div>

            {redeemResult && (
              <div className={`p-2 rounded text-xs flex items-start gap-1.5 ${
                redeemResult.success 
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' 
                  : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
              }`}>
                {redeemResult.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                <span>{redeemResult.message}</span>
              </div>
            )}
          </form>
        </div>

      </div>

      {/* Trust Score & XP Tier Multiplier Breakdown */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            How Referrals Boost Your Trust Score
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            LinkPulse uses Trust Scores to enforce verified dwell time and link legitimacy. Inviting verified peers is rewarded with reputational credit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Per Successful Invite</span>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">+2 Trust PTS</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Every peer who accepts your invitation restores up to +2 points directly to your Trust Score (capped at max 100 Elite rating).
            </p>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Referral XP Multiplier</span>
              <span className="text-xs font-bold text-amber-400 tabular-nums">+50 XP</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Earn +50 XP immediately when they register. When they complete their first verified swap room, earn an extra +100 XP bonus.
            </p>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Reputation Recovery</span>
              <span className="text-xs font-bold text-indigo-400">Safe & Organic</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              If an idle timeout or network disconnection lowered your score, referrals allow you to climb back to 95-100 Elite standing.
            </p>
          </div>
        </div>
      </div>

      {/* Referral History & Peer Roster Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">
              Invited Creators Roster
            </h3>
            <span className="text-xs text-zinc-500 tabular-nums">
              ({referrals.length})
            </span>
          </div>

          <span className="text-xs text-zinc-500">
            Real-time synchronization
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <p className="text-xs font-semibold text-zinc-300">No referrals logged yet</p>
              <p className="text-[11px] text-zinc-500">
                Copy your unique invitation link above or run a test in the Sandbox to see how referrals grant instant Referral XP and Trust Score boosts.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Invitation Link
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/50 text-[11px] font-medium text-zinc-400">
                <tr>
                  <th className="px-4 py-2.5">Creator Member</th>
                  <th className="px-4 py-2.5">Date Joined</th>
                  <th className="px-4 py-2.5">Referral Code</th>
                  <th className="px-4 py-2.5 text-right">Referral XP</th>
                  <th className="px-4 py-2.5 text-right">Trust Boost</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={ref.referredAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={ref.referredUsername}
                          className="h-6 w-6 rounded-full object-cover border border-zinc-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-medium text-zinc-200">
                          {ref.referredUsername}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {ref.createdAt}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                        {ref.referrerCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-amber-400 tabular-nums">
                        +{ref.referralXpAwarded} XP
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-emerald-400 tabular-nums">
                        +{ref.trustScoreBoostAwarded} PTS
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 border border-emerald-800/60 text-emerald-400">
                        Joined & Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
