import React, { useEffect, useState, useRef } from "react";
import { Bell, X, Check, RotateCcw, Trash2, Package, CircleAlert, Stethoscope, ClipboardCheck, Megaphone } from "lucide-react";
import { operationsApi } from "../lib/operationsApi";

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  readAt: string | null;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const result = await operationsApi<{ data: NotificationItem[] }>("/notifications");
      const data = result.data || [];
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.readAt).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await operationsApi(`/notifications/${id}/read`, "PATCH");
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markUnread = async (id: string) => {
    try {
      await operationsApi(`/notifications/${id}/unread`, "PATCH");
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: null } : n))
      );
      setUnreadCount((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to mark as unread:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await operationsApi(`/notifications/${id}`, "DELETE");
      const deleted = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (deleted && !deleted.readAt) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n._id);
    try {
      await Promise.all(unreadIds.map((id) => operationsApi(`/notifications/${id}/read`, "PATCH")));
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const EntityIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
      case "order": return <Package size={10} />;
      case "problem": return <CircleAlert size={10} />;
      case "visit": return <Stethoscope size={10} />;
      case "task": return <ClipboardCheck size={10} />;
      case "announcement": return <Megaphone size={10} />;
      default: return <Bell size={10} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition text-slate-600 hover:text-slate-900"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                <RotateCcw className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                <p className="mt-2 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification._id} className={`p-4 hover:bg-slate-50 transition ${!notification.readAt ? "bg-emerald-50/30" : ""}`}>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {notification.readAt ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markUnread(notification._id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            aria-label="Mark as unread"
                          >
                            <Check size={14} className="text-emerald-600" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markRead(notification._id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            aria-label="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-medium text-sm ${!notification.readAt ? "text-slate-900" : "text-slate-700"}`}>
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="flex-shrink-0 p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                            aria-label="Delete notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{notification.body}</p>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{formatTime(notification.createdAt)}</span>
                          {notification.entityType && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              <EntityIcon type={notification.entityType} />
                              {notification.entityType.charAt(0).toUpperCase() + notification.entityType.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && !loading && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                {notifications.filter((n) => !n.readAt).length} unread of {notifications.length} total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};