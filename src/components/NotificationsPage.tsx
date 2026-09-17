import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  ArrowLeft, 
  Check, 
  Radio, 
  ShieldCheck, 
  CheckCircle2, 
  Target, 
  Shield, 
  Zap, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Filter,
  Eye,
  EyeOff,
  Flame,
  AlertCircle
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';

interface NotificationsPageProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onResetMockNotifications: () => void;
  onNavigateToTab: (tab: 'marketplace' | 'room' | 'leaderboard' | 'goals' | 'auth') => void;
  onBack: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onResetMockNotifications,
  onNavigateToTab,
  onBack,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const showNotificationNotice = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3000);
  };

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'match':
        return <Radio className="h-4 w-4 text-emerald-400" />;
      case 'verification':
        return <CheckCircle2 className="h-4 w-4 text-cyan-400" />;
      case 'trust':
        return <ShieldCheck className="h-4 w-4 text-indigo-400" />;
      case 'quest':
        return <Target className="h-4 w-4 text-amber-400" />;
      case 'security':
        return <Shield className="h-4 w-4 text-rose-400" />;
      case 'system':
        return <Zap className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case 'match':
        return {
          label: 'Proposal & Match',
          bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
        };
      case 'verification':
        return {
          label: 'Verification',
          bg: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60',
        };
      case 'trust':
        return {
          label: 'Trust Score',
          bg: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60',
        };
      case 'quest':
        return {
          label: 'Daily Quest',
          bg: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
        };
      case 'security':
        return {
          label: 'Security Audit',
          bg: 'bg-rose-950/40 text-rose-300 border-rose-800/60',
        };
      case 'system':
        return {
          label: 'System Notice',
          bg: 'bg-zinc-800/60 text-zinc-300 border-zinc-700',
        };
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-[#09090b] text-white flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl mx-auto space-y-5">
        
        {/* Top Header & Navigation Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-zinc-800/80">
          <button
            type="button"
            id="notifications-back-btn"
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Discovery Pool</span>
          </button>

          {/* Quick Header Bulk Actions */}
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                type="button"
                id="notifications-mark-all-read-btn"
                onClick={() => {
                  onMarkAllAsRead();
                  showNotificationNotice('All notifications marked as read');
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Mark all as read</span>
              </button>
            )}

            {notifications.length > 0 ? (
              <button
                type="button"
                id="notifications-clear-all-btn"
                onClick={() => {
                  onClearAllNotifications();
                  showNotificationNotice('Notifications cleared');
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 hover:bg-red-950/40 text-zinc-400 hover:text-red-300 border border-zinc-800 hover:border-red-900/50 text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear all</span>
              </button>
            ) : (
              <button
                type="button"
                id="notifications-reset-demo-btn"
                onClick={() => {
                  onResetMockNotifications();
                  showNotificationNotice('Mock notifications restored');
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Load Demo Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Temporary Toast feedback */}
        {toastNotice && (
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs flex items-center space-x-2.5 shadow-lg animate-fadeIn">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="flex-1">{toastNotice}</div>
          </div>
        )}

        {/* Main Title Section */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <Bell className="h-4 w-4 text-emerald-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold tabular-nums">
                    {unreadCount} unread
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-normal">
                    All caught up
                  </span>
                )}
              </h1>
            </div>
            <p className="text-xs text-zinc-400 pl-11">
              Real-time activity alerts, peer proposals, dwell confirmations, and trust telemetry.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center space-x-2 text-xs bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span className="text-zinc-500">Total:</span>
            <span className="font-semibold text-white tabular-nums">{notifications.length}</span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-500">Unread:</span>
            <span className="font-semibold text-emerald-400 tabular-nums">{unreadCount}</span>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 border ${
              filter === 'all'
                ? 'bg-zinc-100 text-zinc-950 border-white font-semibold'
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            All ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 border flex items-center space-x-1.5 ${
              filter === 'unread'
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-semibold'
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            {unreadCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />}
            <span>Unread ({unreadCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('match')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 border ${
              filter === 'match'
                ? 'bg-zinc-100 text-zinc-950 border-white font-semibold'
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            Matches
          </button>

          <button
            type="button"
            onClick={() => setFilter('verification')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 border ${
              filter === 'verification'
                ? 'bg-zinc-100 text-zinc-950 border-white font-semibold'
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            Verifications
          </button>

          <button
            type="button"
            onClick={() => setFilter('trust')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 border ${
              filter === 'trust'
                ? 'bg-zinc-100 text-zinc-950 border-white font-semibold'
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            Trust & Security
          </button>

          <button
            type="button"
            onClick={() => setFilter('quest')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 border ${
              filter === 'quest'
                ? 'bg-zinc-100 text-zinc-950 border-white font-semibold'
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            Quests & Rewards
          </button>
        </div>

        {/* Notifications List Container */}
        <div className="space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-8 sm:p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-500">
                <Bell className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">No notifications found</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {filter === 'unread' 
                    ? "You've read all your active notifications. Great job!" 
                    : filter === 'all'
                    ? "You don't have any notifications right now."
                    : `No notifications matching the "${filter}" filter.`}
                </p>
              </div>

              {notifications.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onResetMockNotifications();
                    showNotificationNotice('Demo notifications loaded');
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer shadow-md transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Restore Mock Notifications</span>
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const badge = getTypeBadge(notification.type);
              return (
                <div
                  key={notification.id}
                  id={`notification-card-${notification.id}`}
                  className={`group relative rounded-xl border p-4 transition-all ${
                    !notification.isRead
                      ? 'bg-[#121217] border-zinc-700/90 shadow-md ring-1 ring-emerald-500/20'
                      : 'bg-[#101014]/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-[#101014]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    
                    {/* Icon or Actor Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      {notification.actor?.avatar ? (
                        <div className="relative">
                          <img
                            src={notification.actor.avatar}
                            alt={notification.actor.name}
                            className="h-10 w-10 rounded-xl object-cover border border-zinc-700 grayscale"
                          />
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                            {getTypeIcon(notification.type)}
                          </div>
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          {getTypeIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      
                      {/* Top Header: Badge, Title & Time */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.bg}`}>
                            {badge.label}
                          </span>
                          
                          {notification.actor && (
                            <span className="text-xs font-semibold text-zinc-300">
                              {notification.actor.name}
                              {notification.actor.trustScore !== undefined && (
                                <span className="ml-1 text-[10px] text-zinc-400 font-mono">
                                  ({notification.actor.trustScore})
                                </span>
                              )}
                            </span>
                          )}

                          {!notification.isRead && (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>New</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 text-[11px] text-zinc-500 shrink-0">
                          <Clock className="h-3 w-3" />
                          <span>{notification.timeAgo}</span>
                        </div>
                      </div>

                      {/* Notification Title */}
                      <h4 className={`text-sm font-semibold leading-snug ${!notification.isRead ? 'text-white' : 'text-zinc-200'}`}>
                        {notification.title}
                      </h4>

                      {/* Notification Message */}
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {notification.message}
                      </p>

                      {/* Action Row */}
                      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                        {notification.actionTab ? (
                          <button
                            type="button"
                            onClick={() => {
                              onMarkAsRead(notification.id);
                              onNavigateToTab(notification.actionTab!);
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm"
                          >
                            <span>{notification.actionLabel || 'View Details'}</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        ) : <div />}

                        {/* Card Utilities (Read toggle & Delete) */}
                        <div className="flex items-center space-x-1 text-zinc-500">
                          <button
                            type="button"
                            title={notification.isRead ? "Mark as unread" : "Mark as read"}
                            onClick={() => onMarkAsRead(notification.id)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
                          >
                            {notification.isRead ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Delete notification"
                            onClick={() => {
                              onDeleteNotification(notification.id);
                              showNotificationNotice('Notification deleted');
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
