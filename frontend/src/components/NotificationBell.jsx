import { useState, useEffect, useRef, useCallback } from "react";
import { FaBell, FaCheck, FaExclamationCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import "./NotificationBell.css";

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const NotificationBell = () => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const containerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!token || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/api/notifications");
      if (response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
    }
  }, [token, user?.id, fetchNotifications]);

  // Handle clicking outside & Escape key to close popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActionError(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setActionError(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    setActionError(null);
  };

  const handleMarkAsRead = async (notification) => {
    if (Boolean(notification.is_read)) return;

    try {
      setActionError(null);
      await api.put(`/api/notifications/${notification.id}/read`);

      // Update local state immediately on success
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: 1 } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      setActionError("Could not mark notification as read. Please try again.");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    setIsMarkingAll(true);
    setActionError(null);

    try {
      await api.put("/api/notifications/read-all");

      // Update local state immediately on success
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: 1 }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      setActionError("Could not mark all as read. Please try again.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  if (!token || !user) {
    return null;
  }

  return (
    <div className="notification-bell-container" ref={containerRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={toggleDropdown}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="region" aria-label="Notifications panel">
          <div className="notification-header">
            <div className="notification-header-title">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="notification-header-unread-tag">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? "Marking..." : "Mark all as read"}
              </button>
            )}
          </div>

          {actionError && (
            <div className="notification-action-error">
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {loading ? (
            <div className="notification-loading">
              <div className="notification-spinner" />
              <p>Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="notification-error">
              <FaExclamationCircle style={{ color: "#ef4444", fontSize: "24px" }} />
              <p className="notification-error-msg">{error}</p>
              <button
                type="button"
                className="notification-retry-btn"
                onClick={fetchNotifications}
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <FaCheck style={{ color: "#16a34a", fontSize: "24px", marginBottom: "4px" }} />
              <p>You&apos;re all caught up!</p>
              <p style={{ fontSize: "11px", color: "#9ca3af" }}>No notifications at this time.</p>
            </div>
          ) : (
            <ul className="notification-list">
              {notifications.map((item) => {
                const isUnread = !Boolean(item.is_read);
                return (
                  <li
                    key={item.id}
                    className={`notification-item ${isUnread ? "unread" : ""}`}
                    onClick={() => handleMarkAsRead(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleMarkAsRead(item);
                      }
                    }}
                    aria-label={`${isUnread ? "Unread: " : ""}${item.title || "Notification"}: ${item.message || ""}`}
                  >
                    {isUnread && <span className="notification-dot" aria-hidden="true" />}
                    <div className="notification-content">
                      <h4 className="notification-title">{item.title}</h4>
                      <p className="notification-message">{item.message}</p>
                      {item.created_at && (
                        <p className="notification-time">{formatTimeAgo(item.created_at)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
