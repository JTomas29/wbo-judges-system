import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../../services/notificationService';

const TYPE_CONFIG = {
  assignment: {
    color: 'bg-blue-50 text-blue-600 ring-blue-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  status_change: {
    color: 'bg-amber-50 text-amber-600 ring-amber-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  reminder: {
    color: 'bg-purple-50 text-purple-600 ring-purple-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  system: {
    color: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const getRelativeTime = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHr < 24) return `Hace ${diffHr}h`;
  if (diffDay === 1) return 'Ayer';
  if (diffDay < 7) return `Hace ${diffDay} días`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

const SkeletonCard = () => (
  <div className="px-4 py-3.5 border-b border-slate-100 animate-pulse">
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-100 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-50 rounded-lg w-full" />
        <div className="h-2.5 bg-slate-50 rounded-lg w-1/3 mt-1" />
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-6">
    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 ring-1 ring-slate-100">
      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    </div>
    <p className="text-sm font-semibold text-slate-500 mb-1">Sin notificaciones</p>
    <p className="text-xs text-slate-400 text-center max-w-[200px]">
      Cuando haya novedades aparecerán aquí
    </p>
  </div>
);

const NotificationCard = ({ notification, onRead, onDelete }) => {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const isUnread = !notification.is_read;

  const handleClick = () => {
    if (isUnread) onRead(notification.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative px-4 py-3.5 border-b border-slate-100 transition-all duration-200 cursor-pointer hover:bg-slate-50/80 ${
        isUnread ? 'bg-red-50/30' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[13px] leading-snug pr-2 ${isUnread ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
              {notification.title}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-slate-400 font-medium">
              {getRelativeTime(notification.created_at)}
            </span>
            {isUnread && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulseDot" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const scrollRef = useRef(null);
  const panelRef = useRef(null);
  const LIMIT = 20;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
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
    } catch { /* silent */ }
  };

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-scaleIn">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 transition-opacity duration-300" />
      )}

      {/* Drawer */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col animate-slideInRight"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-800">Notificaciones</h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 ring-1 ring-red-200/60">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-wbo-700 hover:text-wbo-800 transition-colors duration-150"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Notification list */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overscroll-contain"
          >
            {initialLoading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onRead={handleMarkRead}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
                {loading && (
                  <div className="py-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonCard key={`load-${i}`} />
                    ))}
                  </div>
                )}
                {!hasMore && notifications.length > 0 && (
                  <p className="text-center text-[11px] text-slate-400 py-4 font-medium">
                    No hay más notificaciones
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationCenter;
