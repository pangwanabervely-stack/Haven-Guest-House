import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { AppNotification, UserRole } from '../types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  // Matrix event helpers
  notifyPaymentReceived: (payload: { guestId?: string; guestName?: string; amount: number; bookingId?: string; roomNumber?: string }) => void;
  notifyCheckout: (payload: { bookingId?: string; guestId?: string; guestName?: string; roomNumber?: string; roomId?: string }) => void;
  notifyRoomDirty: (payload: { roomNumber: string; roomId?: string; reason?: string }) => void;
  notifyNewBooking: (payload: { bookingId: string; guestId: string; guestName: string; roomNumber: string; totalAmount: number }) => void;
  notifyRoomServiceOrder: (payload: { orderId: string; guestId: string; guestName: string; roomNumber: string; totalAmount: number }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'the_haven_notifications_v2';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, role } = useAuth();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Non-blocking
    }
    return [
      {
        id: 'notif-welcome',
        title: 'Welcome to The Haven',
        message: 'Experience peaceful sanctuary & heritage hospitality in Gweru.',
        type: 'system',
        timestamp: new Date().toISOString(),
        read: false,
        recipientRoles: ['guest', 'host', 'cleaning_staff']
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allNotifications));
    } catch {
      // Non-blocking
    }
  }, [allNotifications]);

  // Strict Role & Recipient Filter:
  // - GUEST: Only their own notifications (recipientRoles.includes('guest') & recipientId === currentUser.id or system)
  // - HOST: Host operations, bookings, payments, room services, cleaning updates
  // - CLEANING STAFF: Housekeeping/cleaning turnaround only. STRICTLY NO financial/payment notices.
  const notifications = useMemo(() => {
    if (!currentUser) {
      return allNotifications.filter((n) => !n.recipientRoles || n.recipientRoles.includes('guest') || n.type === 'system');
    }

    if (role === 'cleaning_staff') {
      return allNotifications.filter((n) => {
        // Cleaning staff only sees cleaning tasks and system notices, NEVER payments or guest receipts
        if (n.type === 'payment') return false;
        if (n.recipientRoles && !n.recipientRoles.includes('cleaning_staff')) return false;
        return n.type === 'cleaning' || n.recipientRoles?.includes('cleaning_staff');
      });
    }

    if (role === 'host') {
      return allNotifications.filter((n) => {
        if (n.recipientRoles && !n.recipientRoles.includes('host')) return false;
        return true;
      });
    }

    // Default: Guest role
    return allNotifications.filter((n) => {
      // Guests only see their own notifications or public system announcements
      if (n.type === 'cleaning') return false;
      if (n.recipientRoles && !n.recipientRoles.includes('guest')) return false;
      if (n.recipientId && n.recipientId !== currentUser.id) return false;
      return true;
    });
  }, [allNotifications, currentUser, role]);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    setAllNotifications((prev) => [newNotif, ...prev]);
  };

  const markAsRead = (id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    const visibleIds = new Set(notifications.map((n) => n.id));
    setAllNotifications((prev) =>
      prev.map((n) => (visibleIds.has(n.id) ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    const visibleIds = new Set(notifications.map((n) => n.id));
    setAllNotifications((prev) => prev.filter((n) => !visibleIds.has(n.id)));
  };

  // Matrix scenario helpers
  const notifyPaymentReceived = ({
    guestId,
    guestName = 'Guest',
    amount,
    bookingId,
    roomNumber = 'Room'
  }: {
    guestId?: string;
    guestName?: string;
    amount: number;
    bookingId?: string;
    roomNumber?: string;
  }) => {
    const now = new Date().toISOString();
    const formattedAmount = `$${Number(amount).toFixed(2)}`;

    // 1. Guest Notification (Only for this specific guest)
    if (guestId) {
      addNotification({
        title: 'Payment Confirmed',
        message: `Your payment of ${formattedAmount} for Suite ${roomNumber} has been received and verified.`,
        type: 'payment',
        recipientRoles: ['guest'],
        recipientId: guestId,
        bookingId,
        linkView: 'guest-dashboard'
      });
    }

    // 2. Host Notification (Operational ledger)
    addNotification({
      title: 'Payment Received',
      message: `Verified payment of ${formattedAmount} received from ${guestName} for Suite ${roomNumber}.`,
      type: 'payment',
      recipientRoles: ['host'],
      bookingId,
      linkView: 'admin-bookings'
    });

    // Cleaning staff intentionally receives NO payment notification
  };

  const notifyCheckout = ({
    bookingId,
    guestId,
    guestName = 'Guest',
    roomNumber = 'Room',
    roomId
  }: {
    bookingId?: string;
    guestId?: string;
    guestName?: string;
    roomNumber?: string;
    roomId?: string;
  }) => {
    // 1. Cleaning Staff Notification (Turnaround required)
    addNotification({
      title: 'Room Cleaning Turnaround Required',
      message: `Suite ${roomNumber} checkout is complete. Sanitization & fresh linen turnaround required.`,
      type: 'cleaning',
      recipientRoles: ['cleaning_staff'],
      bookingId,
      linkView: 'cleaning-dashboard'
    });

    // 2. Host Notification
    addNotification({
      title: 'Guest Checkout Completed',
      message: `${guestName} has checked out of Suite ${roomNumber}. Room assigned to cleaning queue.`,
      type: 'booking',
      recipientRoles: ['host'],
      bookingId,
      linkView: 'admin-cleaning'
    });

    // 3. Guest Confirmation
    if (guestId) {
      addNotification({
        title: 'Checkout Confirmation',
        message: `You have successfully checked out of Suite ${roomNumber}. We look forward to welcoming you back to The Haven!`,
        type: 'system',
        recipientRoles: ['guest'],
        recipientId: guestId,
        bookingId,
        linkView: 'guest-dashboard'
      });
    }
  };

  const notifyRoomDirty = ({
    roomNumber,
    reason = 'Flagged for cleaning'
  }: {
    roomNumber: string;
    roomId?: string;
    reason?: string;
  }) => {
    // 1. Cleaning Staff Notification
    addNotification({
      title: 'Sanitization Alert',
      message: `Suite ${roomNumber} is marked dirty and ready for cleaning (${reason}).`,
      type: 'cleaning',
      recipientRoles: ['cleaning_staff'],
      linkView: 'cleaning-dashboard'
    });

    // 2. Host Notification
    addNotification({
      title: 'Room Flagged Dirty',
      message: `Suite ${roomNumber} moved to housekeeping queue.`,
      type: 'cleaning',
      recipientRoles: ['host'],
      linkView: 'admin-cleaning'
    });
  };

  const notifyNewBooking = ({
    bookingId,
    guestId,
    guestName,
    roomNumber,
    totalAmount
  }: {
    bookingId: string;
    guestId: string;
    guestName: string;
    roomNumber: string;
    totalAmount: number;
  }) => {
    // 1. Guest Confirmation
    addNotification({
      title: 'Booking Confirmed',
      message: `Your reservation for Suite ${roomNumber} has been recorded ($${totalAmount.toFixed(2)}).`,
      type: 'booking',
      recipientRoles: ['guest'],
      recipientId: guestId,
      bookingId,
      linkView: 'guest-dashboard'
    });

    // 2. Host Notification
    addNotification({
      title: 'New Reservation',
      message: `New booking received from ${guestName} for Suite ${roomNumber} ($${totalAmount.toFixed(2)}).`,
      type: 'booking',
      recipientRoles: ['host'],
      bookingId,
      linkView: 'admin-bookings'
    });
  };

  const notifyRoomServiceOrder = ({
    orderId,
    guestId,
    guestName,
    roomNumber,
    totalAmount
  }: {
    orderId: string;
    guestId: string;
    guestName: string;
    roomNumber: string;
    totalAmount: number;
  }) => {
    // 1. Guest Confirmation
    addNotification({
      title: 'Order Placed',
      message: `Your room service order #${orderId.slice(0, 6).toUpperCase()} ($${totalAmount.toFixed(2)}) has been sent to the kitchen.`,
      type: 'service',
      recipientRoles: ['guest'],
      recipientId: guestId,
      linkView: 'guest-dashboard'
    });

    // 2. Host Notification
    addNotification({
      title: 'New Room Service Order',
      message: `New order from Suite ${roomNumber} (${guestName}) for $${totalAmount.toFixed(2)}.`,
      type: 'service',
      recipientRoles: ['host'],
      linkView: 'admin-orders'
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        notifyPaymentReceived,
        notifyCheckout,
        notifyRoomDirty,
        notifyNewBooking,
        notifyRoomServiceOrder
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
