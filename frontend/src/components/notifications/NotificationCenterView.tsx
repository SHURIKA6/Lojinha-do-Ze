import React from 'react';
import { FiBell, FiX, FiCheck, FiInfo, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import { Notification as AppNotification } from '@/types';

interface NotificationCenterViewProps {
  notifications: AppNotification[];
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  permission: NotificationPermission;
  unreadCount: number;
  requestPermission: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  formatTime: (timestamp?: string | number | Date) => string;
}

export default function NotificationCenterView({
  notifications,
  isOpen,
  setIsOpen,
  permission,
  unreadCount,
  requestPermission,
  markAsRead,
  markAllAsRead,
  removeNotification,
  formatTime
}: NotificationCenterViewProps) {
  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success': return <FiCheck className="notification-icon--success" />;
      case 'warning': return <FiAlertTriangle className="notification-icon--warning" />;
      case 'error': return <FiAlertCircle className="notification-icon--error" />;
      case 'info':
      default: return <FiInfo className="notification-icon--info" />;
    }
  };

  return (
    <div className="notification-center">
      <button
        className="notification-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lidas)` : ''}`}
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notificações</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button
                  className="notification-action-btn"
                  onClick={markAllAsRead}
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                className="notification-close-btn"
                onClick={() => setIsOpen(false)}
              >
                <FiX />
              </button>
            </div>
          </div>

          {permission !== 'granted' && (
            <div className="notification-permission">
              <p>Ative as notificações para receber atualizações</p>
              <button onClick={requestPermission}>
                Ativar Notificações
              </button>
            </div>
          )}

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <FiBell className="notification-empty__icon" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'notification-item--unread' : ''}`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <h4 className="notification-title">{notification.title}</h4>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>

                  <button
                    className="notification-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                  >
                    <FiX />
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <a href="/account/notifications">
                Ver todas as notificações
              </a>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .notification-center {
          position: relative;
        }

        .notification-trigger {
          position: relative;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: color 0.2s ease;
        }

        .notification-trigger:hover {
          color: var(--primary-500);
        }

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: var(--danger-500);
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        .notification-panel {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          width: 380px;
          max-height: 500px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          box-shadow: var(--shadow-xl);
          z-index: 1000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .notification-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .notification-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notification-action-btn {
          background: none;
          border: none;
          color: var(--primary-500);
          font-size: 0.875rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .notification-action-btn:hover {
          background: var(--bg-secondary);
        }

        .notification-close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .notification-close-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .notification-permission {
          padding: 16px;
          background: var(--bg-secondary);
          text-align: center;
        }

        .notification-permission p {
          margin: 0 0 12px;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .notification-permission button {
          background: var(--primary-500);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .notification-permission button:hover {
          background: var(--primary-600);
        }

        .notification-list {
          flex: 1;
          overflow-y: auto;
          max-height: 350px;
        }

        .notification-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--text-secondary);
        }

        .notification-empty__icon {
          font-size: 2rem;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .notification-item:hover {
          background: var(--bg-secondary);
        }

        .notification-item--unread {
          background: var(--primary-50);
        }

        .notification-item--unread:hover {
          background: var(--primary-100);
        }

        .notification-icon {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: 'center';
          justify-content: 'center';
          background: var(--bg-secondary);
        }

        .notification-icon--success { color: var(--success-500); }
        .notification-icon--warning { color: var(--warning-500); }
        .notification-icon--error { color: var(--danger-500); }
        .notification-icon--info { color: var(--info-500); }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          margin: 0 0 4px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .notification-message {
          margin: 0 0 4px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .notification-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .notification-remove {
          flex-shrink: 0;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
          opacity: 0;
        }

        .notification-item:hover .notification-remove {
          opacity: 1;
        }

        .notification-remove:hover {
          background: var(--danger-100);
          color: var(--danger-500);
        }

        .notification-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border-color);
          text-align: center;
        }

        .notification-footer a {
          color: var(--primary-500);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .notification-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .notification-panel {
            width: calc(100vw - 32px);
            right: -8px;
          }
        }
      `}</style>
    </div>
  );
}
