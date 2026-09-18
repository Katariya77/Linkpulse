import React, { useState } from 'react';
import { 
  Crown, 
  Search, 
  Sparkles, 
  IndianRupee, 
  UserCheck, 
  Calendar, 
  ShieldAlert, 
  Check, 
  X, 
  UserPlus, 
  Loader2, 
  TrendingUp,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { PremiumSubscription, User } from '../types';

interface AdminPremiumUsersPageProps {
  subscriptions: PremiumSubscription[];
  allUsers: User[];
  onGrantPremium: (user: { id: string; email: string; username: string; avatar?: string }) => Promise<void>;
  onRevokePremium: (userId: string) => Promise<void>;
}

export const AdminPremiumUsersPage: React.FC<AdminPremiumUsersPageProps> = ({
  subscriptions,
  allUsers,
  onGrantPremium,
  onRevokePremium,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled'>('all');
  const [isGrantModalOpen, setIsGrantModalOpen] = useState<boolean>(false);
  const [selectedUserIdToGrant, setSelectedUserIdToGrant] = useState<string>('');
  const [manualEmailInput, setManualEmailInput] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Compute metrics
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const activeCount = activeSubs.length;
  const mrr = activeSubs.reduce((acc, curr) => acc + (curr.price || 10), 0);

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      (sub.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.userId || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && sub.status === 'active') ||
      (filterStatus === 'cancelled' && sub.status === 'cancelled');

    return matchesSearch && matchesStatus;
  });

  const handleRevoke = async (userId: string, username: string) => {
    setActionLoadingId(userId);
    try {
      await onRevokePremium(userId);
      setNoticeMessage({ text: `Revoked Pro membership for ${username}.`, type: 'success' });
    } catch (e: any) {
      setNoticeMessage({ text: e.message || 'Failed to revoke premium.', type: 'error' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setNoticeMessage(null), 3500);
    }
  };

  const handleReactivate = async (sub: PremiumSubscription) => {
    setActionLoadingId(sub.userId);
    try {
      await onGrantPremium({
        id: sub.userId,
        email: sub.userEmail,
        username: sub.username,
        avatar: sub.userAvatar,
      });
      setNoticeMessage({ text: `Reactivated Pro membership for ${sub.username}.`, type: 'success' });
    } catch (e: any) {
      setNoticeMessage({ text: e.message || 'Failed to reactivate premium.', type: 'error' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setNoticeMessage(null), 3500);
    }
  };

  const handleConfirmGrant = async () => {
    if (!selectedUserIdToGrant && !manualEmailInput.trim()) {
      setNoticeMessage({ text: 'Please select a user or enter an email.', type: 'error' });
      return;
    }

    let targetUser = allUsers.find(u => u.id === selectedUserIdToGrant);
    const emailToUse = targetUser?.email || manualEmailInput.trim();
    const idToUse = targetUser?.id || `usr_manual_${Date.now()}`;
    const nameToUse = targetUser?.username || emailToUse.split('@')[0] || 'Member';

    setActionLoadingId('modal_grant');
    try {
      await onGrantPremium({
        id: idToUse,
        email: emailToUse,
        username: nameToUse,
        avatar: targetUser?.avatar,
      });
      setIsGrantModalOpen(false);
      setSelectedUserIdToGrant('');
      setManualEmailInput('');
      setNoticeMessage({ text: `Successfully granted Pro membership to ${nameToUse}!`, type: 'success' });
    } catch (e: any) {
      setNoticeMessage({ text: e.message || 'Failed to grant premium.', type: 'error' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setNoticeMessage(null), 3500);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl w-full animate-fadeIn">
      {/* Top Banner Notice */}
      {noticeMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg ${
          noticeMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
            : 'bg-red-950/40 border-red-800 text-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            {noticeMessage.type === 'success' ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
            <span>{noticeMessage.text}</span>
          </div>
          <button onClick={() => setNoticeMessage(null)} className="text-zinc-400 hover:text-white cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Premium Subscribers</h1>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold">
              ₹10 / mo plan
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time subscriber roster, monthly recurring revenue, and tier administration.
          </p>
        </div>

        <button
          type="button"
          id="admin-grant-premium-modal-btn"
          onClick={() => setIsGrantModalOpen(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-md shadow-amber-500/10 cursor-pointer active:scale-[0.99]"
        >
          <UserPlus className="h-4 w-4" />
          <span>Grant Pro Access</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#101014] border border-zinc-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium">
            <span>Total Subscribers</span>
            <Crown className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
            {subscriptions.length}
          </div>
          <p className="text-[10px] text-zinc-500">All-time subscriptions</p>
        </div>

        <div className="p-4 rounded-xl bg-[#101014] border border-zinc-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium">
            <span>Active Pro Users</span>
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums tracking-tight">
            {activeCount}
          </div>
          <p className="text-[10px] text-zinc-500">Active monthly plans</p>
        </div>

        <div className="p-4 rounded-xl bg-[#101014] border border-zinc-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium">
            <span>Monthly Revenue</span>
            <IndianRupee className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
            ₹{mrr}
          </div>
          <p className="text-[10px] text-zinc-500">Calculated at ₹10/mo</p>
        </div>

        <div className="p-4 rounded-xl bg-[#101014] border border-zinc-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium">
            <span>Active Plan</span>
            <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="text-sm font-bold text-zinc-200 mt-1">
            Pro Monthly
          </div>
          <p className="text-[10px] text-zinc-500">Single tier • ₹10/mo</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#101014] p-3 rounded-xl border border-zinc-800">
        <div className="relative w-full sm:w-80">
          <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterStatus === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({subscriptions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterStatus === 'active'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterStatus === 'cancelled'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Cancelled ({subscriptions.length - activeCount})
          </button>
        </div>
      </div>

      {/* Subscriptions Table / List */}
      <div className="rounded-xl border border-zinc-800 bg-[#101014] overflow-hidden shadow-lg">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-10 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Crown className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">No Premium Subscribers Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {searchQuery 
                  ? `No subscriptions match "${searchQuery}".` 
                  : 'When users subscribe to the ₹10/mo plan, they will automatically appear here in real-time.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGrantModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 text-amber-400" />
              <span>Grant Pro to a Member</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Plan & Price</th>
                  <th className="px-4 py-3">Activated Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredSubscriptions.map((sub) => {
                  const isActive = sub.status === 'active';
                  const isBusy = actionLoadingId === sub.userId;

                  return (
                    <tr key={sub.id || sub.userId} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Member Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="relative shrink-0">
                            <img
                              src={sub.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={sub.username}
                              className="h-8 w-8 rounded-full object-cover border border-zinc-700"
                              referrerPolicy="no-referrer"
                            />
                            {isActive && (
                              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-bold text-zinc-950">
                                ★
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-white truncate">{sub.username}</span>
                              {isActive && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  PRO
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono truncate">{sub.userEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Price */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-medium text-zinc-200">{sub.planName || 'Pro Monthly'}</div>
                          <div className="text-[11px] text-amber-400 font-semibold">₹{sub.price || 10} / month</div>
                          {sub.razorpayPaymentId && (
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center space-x-1">
                              <span className="text-[#38bdf8]">Rzp:</span>
                              <span className="truncate max-w-[120px]">{sub.razorpayPaymentId}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Activated Date */}
                      <td className="px-4 py-3.5 text-zinc-400">
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Calendar className="h-3 w-3 text-zinc-500" />
                          <span>
                            {sub.activatedAt ? new Date(sub.activatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            <span>Cancelled</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(sub.userId, sub.username)}
                            disabled={isBusy}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-950/40 hover:bg-red-950/80 text-red-300 hover:text-red-200 border border-red-900/60 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? 'Processing...' : 'Revoke'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReactivate(sub)}
                            disabled={isBusy}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? 'Processing...' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: GRANT PRO TO A MEMBER */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsGrantModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#111116] border border-zinc-800 rounded-2xl p-6 shadow-2xl z-10 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Grant Pro Membership</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGrantModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">Select from Registered Members</label>
                <select
                  value={selectedUserIdToGrant}
                  onChange={(e) => {
                    setSelectedUserIdToGrant(e.target.value);
                    if (e.target.value) setManualEmailInput('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500/60"
                >
                  <option value="">-- Choose a registered user --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email || u.id}) {u.isPremium ? '★ Already Pro' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-800" />
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-zinc-500">Or by email</span>
                <div className="flex-grow border-t border-zinc-800" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">Member Email Address</label>
                <input
                  type="email"
                  value={manualEmailInput}
                  onChange={(e) => {
                    setManualEmailInput(e.target.value);
                    if (e.target.value) setSelectedUserIdToGrant('');
                  }}
                  placeholder="e.g. member@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Plan info notice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start space-x-2">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Grants immediate Pro Monthly (₹10/mo) status, priority discovery pool routing, and verified Pro crown badge.</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsGrantModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-admin-grant-btn"
                onClick={handleConfirmGrant}
                disabled={actionLoadingId === 'modal_grant'}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                {actionLoadingId === 'modal_grant' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm & Grant Pro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
