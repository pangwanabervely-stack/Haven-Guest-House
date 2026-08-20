import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  UtensilsCrossed,
  Sparkles,
  CreditCard,
  MessageSquare,
  Info,
  X
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { AppNotification } from '../../types';

interface NotificationDropdownProps {
  onNavigate: (view: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'booking':
        return <CalendarCheck className="w-4 h-4 text-emerald-600" />;
      case 'service':
        return <UtensilsCrossed className="w-4 h-4 text-amber-600" />;
      case 'cleaning':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-[#5A5A40]" />;
      default:
        return <Info className="w-4 h-4 text-[#8C887D]" />;
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.linkView) {
      onNavigate(n.linkView);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#5A5A40] hover:bg-[#F5F2ED] rounded-full transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-700 rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FDFCF9] rounded-2xl shadow-xl border border-[#E5E2D9] z-50 overflow-hidden animate-fade-in">
          <div className="p-3.5 bg-[#F5F2ED] border-b border-[#E5E2D9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif italic font-medium text-sm text-[#2C2C2C]">
                Guest House Alerts
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#5A5A40] text-white rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-[#5A5A40] hover:text-[#2C2C2C] flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#8C887D] hover:text-[#2C2C2C] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#E5E2D9]/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8C887D]">
                No notifications at this time.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-[#F5F2ED] transition-colors cursor-pointer flex gap-3 items-start ${
                    !n.read ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-[#E5E2D9] shadow-2xs shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-xs font-bold text-[#2C2C2C] truncate">
                        {n.title}
                      </div>
                      <div className="text-[9px] text-[#8C887D] whitespace-nowrap">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <p className="text-xs text-[#5A5A40] mt-0.5 leading-snug">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 bg-[#F5F2ED] border-t border-[#E5E2D9] text-center">
              <button
                onClick={clearNotifications}
                className="text-[11px] font-semibold text-[#8C887D] hover:text-rose-700"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
