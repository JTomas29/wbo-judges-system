import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../../services/notificationService';
import { getNotificationRoute } from '../../services/notificationNavigation';
import ConfirmModal from './modals/ConfirmModal';

const TYPE_CONFIG = {
  assignment: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-100 dark:ring-blue-800/30',
    dot: 'bg-blue-500',
    label: 'Assignment',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  status_change: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-100 dark:ring-amber-800/30',
    dot: 'bg-amber-500',
    label: 'Status',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
      </svg>
    ),
  },
  reminder: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-100 dark:ring-red-800/30',
    dot: 'bg-red-500',
    label: 'Reminder',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  system: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-100 dark:ring-emerald-800/30',
    dot: 'bg-emerald-500',
    label: 'System',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const getDateGroup = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This week';
  return 'Older';
};

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Older'];

const groupNotifications = (notifications) => {
  const groups = {};
  for (const n of notifications) {
    const group = getDateGroup(n.created_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  }
  return GROUP_ORDER.filter((g) => groups[g]).map((g) => ({ label: g, items: groups[g] }));
};

const getRelativeTime = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const SkeletonCard = () => (
  <div className="px-4 py-3.5 border-b border-slate-100/80 dark:border-[#1E293B]/60 animate-pulse">
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1E293B] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-100 dark:bg-[#1E293B] rounded-lg w-3/4" />
        <div className="h-2.5 bg-slate-50 dark:bg-[#1F2937] rounded-lg w-full" />
        <div className="h-2 bg-slate-50 dark:bg-[#1F2937] rounded-lg w-1/4 mt-1" />
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-6">
    <div className="relative mb-5">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#1E293B] dark:to-[#1F2937] flex items-center justify-center ring-1 ring-slate-200/60 dark:ring-[#334155]">
        <svg className="w-9 h-9 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-[#0F172A] flex items-center justify-center ring-1 ring-slate-200 dark:ring-[#1E293B]">
        <svg className="w-3 h-3 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
    </div>
    <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">You have no notifications</p>
    <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-[240px] leading-relaxed">
      Important updates will appear here automatically.
    </p>
  </div>
);

const NotificationCard = ({ notification, onRead, onDelete, isNew, onNavigate, userRole }) => {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const isUnread = !notification.is_read;

  const handleClick = () => {
    const { path, deleted } = getNotificationRoute(notification, userRole);
    if (isUnread) onRead(notification.id);
    onNavigate(path, deleted);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className={`group relative px-4 py-3 border-b border-slate-100/60 dark:border-[#1E293B]/60 transition-all duration-200 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-[#1E293B]/40 hover:pl-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40 focus-visible:ring-inset ${
        isUnread
          ? 'bg-gradient-to-r from-red-50/40 via-white to-white dark:from-red-900/10 dark:via-[#0F172A] dark:to-[#0F172A] hover:from-red-50/60 dark:hover:from-red-900/15'
          : ''
      } ${isNew ? 'animate-notifSlideIn' : ''}`}
    >
      <div className="flex gap-3">
        <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ${config.bg} ${config.text} ${config.ring}`}>
          {config.icon}
          {isUnread && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${config.dot} ring-1.5 ring-white dark:ring-[#0F172A]`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[13px] leading-snug pr-1 ${isUnread ? 'font-semibold text-slate-800 dark:text-[#F8FAFC]' : 'font-medium text-slate-600 dark:text-[#CBD5E1]'}`}>
              {notification.title}
            </p>
            <button
              onClick={handleDelete}
              aria-label="Delete notification"
              className="sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 shrink-0 mt-[-1px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {getRelativeTime(notification.created_at)}
            </span>
            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${config.bg} ${config.text} opacity-70`}>
              {config.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [newIds, setNewIds] = useState(new Set());
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const prevUnreadRef = useRef(0);
  const scrollRef = useRef(null);
  const panelRef = useRef(null);
  const LIMIT = 20;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      const prev = prevUnreadRef.current;
      if (data.count > prev && prev > 0) {
        const fresh = await getNotifications(5, 0);
        const latestIds = new Set(
          fresh.notifications.filter((n) => !n.is_read).map((n) => n.id)
        );
        setNewIds(latestIds);
        setTimeout(() => setNewIds(new Set()), 600);
      }
      prevUnreadRef.current = data.count;
      setUnreadCount(data.count);
    } catch { /* silent */ }
  }, []);

  const fetchNotifications = useCallback(async (pageNum = 0, append = false) => {
    try {
      setLoading(true);
      const data = await getNotifications(LIMIT, pageNum * LIMIT);
      if (append) {
        setNotifications((prev) => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setUnreadCount(data.unreadCount);
      prevUnreadRef.current = data.unreadCount;
      setHasMore(data.notifications.length === LIMIT);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setHasMore(true);
      fetchNotifications(0, false);
    }
  }, [isOpen, fetchNotifications]);

  const handleScroll = () => {
    if (!scrollRef.current || !hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 80) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage, true);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch { /* silent */ }
  };

  const handleClearAll = async () => {
    setClearing(true);
    setFeedback(null);
    try {
      await deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadRef.current = 0;
      setFeedback({ type: 'success', message: 'Notification inbox cleared successfully.' });
      setShowClearModal(false);
      setTimeout(() => setIsOpen(false), 1200);
    } catch {
      setFeedback({ type: 'error', message: 'Error clearing the notification inbox.' });
    } finally {
      setClearing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    const confirmed = window.confirm(`Delete notification "${target.title}"?`);
    if (!confirmed) return;
    try {
      await deleteNotification(id);
      const wasUnread = target && !target.is_read;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
      }
    } catch { /* silent */ }
  };

  const handleNavigate = useCallback((path, deleted) => {
    setIsOpen(false);
    if (deleted) {
      navigate('/dashboard', {
        state: { toast: { type: 'info', message: 'The content is no longer available' } },
      });
    } else {
      navigate(path);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (showClearModal) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, showClearModal]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const grouped = groupNotifications(notifications);

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className={`relative p-2 min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl transition-all duration-200 ${
          isOpen
            ? 'text-wbo-700 bg-wbo-50 dark:text-wbo-400 dark:bg-wbo-500/10'
            : 'text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-white/[0.06]'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0F172A] animate-badgePulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[2px] z-50 transition-opacity duration-300" />
      )}

      {/* Drawer */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-[#0F172A] shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] z-50 flex flex-col animate-slideInRight"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E293B] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-[15px] font-bold text-slate-800 dark:text-[#F8FAFC] truncate">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-1 ring-red-200/60 dark:ring-red-800/40 animate-scaleIn shrink-0">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                {notifications.length > 0 && (
                  <button
                    onClick={() => setShowClearModal(true)}
                    className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    title="Clear inbox"
                    aria-label="Clear inbox"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-wbo-700 dark:hover:text-wbo-400 hover:bg-wbo-50 dark:hover:bg-wbo-500/10 transition-all duration-200"
                    title="Mark all as read"
                    aria-label="Mark all as read"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                )}
                <div className="w-px h-5 bg-slate-200 dark:bg-[#1E293B] mx-0.5 sm:mx-1 hidden sm:block" />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all duration-200"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Notification list */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin"
          >
            {feedback && (
              <div className={`mx-4 mt-3 mb-1 px-4 py-2.5 rounded-xl text-sm font-medium ring-1 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-800/40'
              }`}>
                {feedback.message}
              </div>
            )}
            {initialLoading ? (
              <div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {grouped.map((group) => (
                  <div key={group.label}>
                    <div className="sticky top-0 z-10 px-4 py-2 bg-slate-50/90 dark:bg-[#0B1120]/90 backdrop-blur-sm border-b border-slate-100/60 dark:border-[#1E293B]/60">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {group.label}
                      </p>
                    </div>
                    {group.items.map((n) => (
                      <NotificationCard
                        key={n.id}
                        notification={n}
                        onRead={handleMarkRead}
                        onDelete={handleDelete}
                        isNew={newIds.has(n.id)}
                        onNavigate={handleNavigate}
                        userRole={user?.role}
                      />
                    ))}
                  </div>
                ))}
                {loading && (
                  <div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonCard key={`load-${i}`} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => { if (!clearing) setShowClearModal(false); }}
        onConfirm={handleClearAll}
        title="Clear notification inbox"
        description="All notifications will be permanently deleted. This action cannot be undone."
        confirmLabel="Clear inbox"
        cancelLabel="Cancel"
        danger
        loading={clearing}
      />
    </>
  );
};

export default NotificationCenter;
