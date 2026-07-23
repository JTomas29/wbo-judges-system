import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../../services/notificationService';

const TYPE_CONFIG = {
  assignment: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    ring: 'ring-blue-100',
    dot: 'bg-blue-500',
    label: 'Asignación',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  status_change: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    ring: 'ring-amber-100',
    dot: 'bg-amber-500',
    label: 'Estado',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
      </svg>
    ),
  },
  reminder: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    ring: 'ring-red-100',
    dot: 'bg-red-500',
    label: 'Recordatorio',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  system: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    ring: 'ring-emerald-100',
    dot: 'bg-emerald-500',
    label: 'Sistema',
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

  if (date >= startOfToday) return 'Hoy';
  if (date >= startOfYesterday) return 'Ayer';
  if (date >= startOfWeek) return 'Esta semana';
  return 'Más antiguas';
};

const GROUP_ORDER = ['Hoy', 'Ayer', 'Esta semana', 'Más antiguas'];

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

  if (diffMin < 1) return 'Ahora';
  if (diffMin === 1) return 'Hace 1 min';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHr === 1) return 'Hace 1 hora';
  if (diffHr < 24) return `Hace ${diffHr}h`;
  if (diffDay === 1) return 'Ayer';
  if (diffDay < 7) return `Hace ${diffDay} días`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

const SkeletonCard = () => (
  <div className="px-4 py-3.5 border-b border-slate-100/80 animate-pulse">
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-100 rounded-lg w-3/4" />
        <div className="h-2.5 bg-slate-50 rounded-lg w-full" />
        <div className="h-2 bg-slate-50 rounded-lg w-1/4 mt-1" />
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-6">
    <div className="relative mb-5">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center ring-1 ring-slate-200/60">
        <svg className="w-9 h-9 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center ring-1 ring-slate-200">
        <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
    </div>
    <p className="text-sm font-semibold text-slate-500 mb-1">Sin notificaciones</p>
    <p className="text-xs text-slate-400 text-center max-w-[220px] leading-relaxed">
      Cuando haya novedades en el sistema aparecerán aquí
    </p>
  </div>
);

const NotificationCard = ({ notification, onRead, onDelete, isNew }) => {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const isUnread = !notification.is_read;

  return (
    <div
      onClick={() => { if (isUnread) onRead(notification.id); }}
      className={`group relative px-4 py-3 border-b border-slate-100/60 transition-all duration-200 cursor-pointer hover:bg-slate-50/60 ${
        isUnread ? 'bg-gradient-to-r from-red-50/40 via-white to-white' : ''
      } ${isNew ? 'animate-notifSlideIn' : ''}`}
    >
      <div className="flex gap-3">
        <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ${config.bg} ${config.text} ${config.ring}`}>
          {config.icon}
          {isUnread && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${config.dot} ring-1.5 ring-white`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[13px] leading-snug pr-1 ${isUnread ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
              {notification.title}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 shrink-0 mt-[-1px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400 font-medium">
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
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [newIds, setNewIds] = useState(new Set());
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
    try {
      await deleteNotification(id);
      const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
      }
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

  const grouped = groupNotifications(notifications);

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          isOpen
            ? 'text-wbo-700 bg-wbo-50'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-badgePulse">
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
          <div className="px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-bold text-slate-800">Notificaciones</h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 ring-1 ring-red-200/60 animate-scaleIn">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-wbo-700 hover:text-wbo-800 hover:bg-wbo-50 px-2.5 py-1.5 rounded-lg transition-all duration-150"
                  >
                    Marcar todo leído
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
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
            className="flex-1 overflow-y-auto overscroll-contain"
          >
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
                    <div className="sticky top-0 z-10 px-4 py-2 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100/60">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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

          {/* Footer */}
          {!initialLoading && notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
              <button
                onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-wbo-700 bg-wbo-50 hover:bg-wbo-100 ring-1 ring-wbo-200/60 transition-all duration-200 hover:shadow-sm"
              >
                Ver todas las notificaciones
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default NotificationCenter;
