import { useEffect, useRef, useState } from 'react';
import { API_BASE, getToken } from '../../apis/client';
import '../../styles/components/notification-bell.css';

const NotificationIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const autoCloseTimer = useRef(null);

  const clearAutoClose = () => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
  };

  const scheduleAutoClose = () => {
    clearAutoClose();
    autoCloseTimer.current = setTimeout(() => {
      setOpen(false);
    }, 3000);
  };

  async function fetchAll() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.ok ? await res.json() : [];
      setItems(list || []);
      // tính lại unread dựa trên is_read từ server
      const anyUnread = (list || []).some((n) => n.is_read === false || n.is_read === 0);
      setHasUnread(anyUnread);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll().catch(() => {});
  }, []);

  useEffect(() => {
    function handleClientNotification(e) {
      const { message, created_at, type } = e.detail || {};
      if (!message) return;
      setHasUnread(true);
      setItems((prev) => [
        {
          id: `local-${Date.now()}`,
          type: type || 'info',
          message,
          is_read: false,
          created_at,
        },
        ...prev,
      ]);
    }
    window.addEventListener('thung-notification', handleClientNotification);
    return () => window.removeEventListener('thung-notification', handleClientNotification);
  }, []);

  const toggleOpen = async () => {
    const token = getToken();
    if (!open) {
      await fetchAll();
      if (hasUnread && token) {
        await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
        setHasUnread(false);
      }
    }
    setOpen((v) => !v);
    if (!open) {
      // vừa mở dropdown -> bắt đầu đếm 3s
      scheduleAutoClose();
    } else {
      // đang mở mà bấm lại đóng luôn
      clearAutoClose();
    }
  };

  useEffect(() => {
    return () => {
      clearAutoClose();
    };
  }, []);

  return (
    <div className="notif-wrap">
      <button
        type="button"
        className="notif-btn"
        onClick={toggleOpen}
        aria-label="Thông báo"
      >
        <NotificationIcon />
        {hasUnread && <span className="notif-dot" />}
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className="notif-dropdown"
          onMouseEnter={clearAutoClose}
          onMouseLeave={scheduleAutoClose}
        >
          {loading ? (
            <div className="notif-empty">Đang tải thông báo...</div>
          ) : (items || []).length === 0 ? (
            <div className="notif-empty">Không có thông báo mới.</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className="notif-item">
                <div className="notif-message">{n.message}</div>
                <div className="notif-time">
                  {new Date(n.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;