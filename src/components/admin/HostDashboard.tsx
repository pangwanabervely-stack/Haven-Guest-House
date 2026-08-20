import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  BedDouble,
  CreditCard,
  UtensilsCrossed,
  Sparkles,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  LogIn,
  UserCheck,
  BarChart3
} from 'lucide-react';
import { DashboardStats, Booking, Room, ServiceOrder } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { HostVisualizations } from './HostVisualizations';

interface HostDashboardProps {
  onNavigate: (view: string) => void;
  onRefreshAll: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ onNavigate, onRefreshAll }) => {
  const { success, error } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [dirtyRooms, setDirtyRooms] = useState<Room[]>([]);
  const [pendingOrders, setPendingOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHostData = async () => {
    try {
      const [fetchedStats, fetchedBookings, fetchedRooms, fetchedOrders] = await Promise.all([
        api.getDashboardStats(),
        api.getBookings(),
        api.getRooms(),
        api.getServiceOrders({ status: 'pending' })
      ]);

      setStats(fetchedStats);
      setAllBookings(fetchedBookings);
      setAllRooms(fetchedRooms);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayList = fetchedBookings.filter(
        (b) =>
          b.booking_status !== 'cancelled' &&
          (b.check_in_date === todayStr || b.check_out_date === todayStr || b.booking_status === 'checked_in')
      );
      setTodayBookings(todayList);

      setDirtyRooms(fetchedRooms.filter((r) => r.cleaning_status === 'dirty' || r.cleaning_status === 'in_progress'));
      setPendingOrders(fetchedOrders);
    } catch (err) {
      console.error('Failed to fetch host dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHostData();
    const interval = setInterval(fetchHostData, 3000); // 3s live polling
    return () => clearInterval(interval);
  }, []);

  const handleQuickCheckIn = async (bookingId: string) => {
    try {
      await api.checkInGuest(bookingId);
      success('Guest checked in! Room marked as occupied.');
      fetchHostData();
      onRefreshAll();
    } catch (err: any) {
      error(err.message || 'Check-in failed.');
    }
  };

  const handleQuickCheckOut = async (bookingId: string) => {
    try {
      await api.checkOutGuest(bookingId);
      success('Guest checked out! Room automatically sent to Cleaning Queue.');
      fetchHostData();
      onRefreshAll();
    } catch (err: any) {
      error(err.message || 'Check-out failed.');
    }
  };

  const handleMarkClean = async (roomId: string) => {
    try {
      await api.updateRoom(roomId, { cleaning_status: 'clean' });
      success('Room marked sanitized and ready for guests!');
      fetchHostData();
      onRefreshAll();
    } catch (err: any) {
      error(err.message || 'Cleaning update failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2D9] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D] mb-1">
            Host Management & Operations
          </div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-[#5A5A40] font-medium">
            Property Operations Dashboard
          </h1>
          <p className="text-[#8C887D] text-sm mt-1">
            Real-time status of reservations, housekeeping queue, revenue ledgers, and dining requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('admin-bookings')}
            className="px-5 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest shadow-xs transition-colors"
          >
            Manage All Stays
          </button>
        </div>
      </div>

      {/* LIVE STATS CARDS GRID */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Today's Check-ins */}
          <div
            onClick={() => onNavigate('admin-bookings')}
            className="bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#5A5A40] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                Arrivals
              </span>
              <LogIn className="w-4 h-4 text-[#5A5A40]" />
            </div>
            <div className="text-3xl font-serif text-[#2C2C2C]">
              {stats.todayCheckIns}
            </div>
            <div className="text-[10px] text-[#8C887D]">Today check-ins</div>
          </div>

          {/* Today's Check-outs */}
          <div
            onClick={() => onNavigate('admin-bookings')}
            className="bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#5A5A40] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                Departures
              </span>
              <LogOut className="w-4 h-4 text-[#C4A484]" />
            </div>
            <div className="text-3xl font-serif text-[#2C2C2C]">
              {stats.todayCheckOuts}
            </div>
            <div className="text-[10px] text-[#8C887D]">Today check-outs</div>
          </div>

          {/* Occupied Rooms & Occupancy Rate */}
          <div
            onClick={() => onNavigate('admin-rooms')}
            className="bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#5A5A40] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                Occupancy
              </span>
              <BedDouble className="w-4 h-4 text-[#5A5A40]" />
            </div>
            <div className="text-3xl font-serif text-[#2C2C2C]">
              {stats.occupiedRooms}/{stats.totalRooms}
            </div>
            <div className="text-[10px] text-[#5A5A40] font-semibold">
              {stats.occupancyRate}% active
            </div>
          </div>

          {/* Cleaning Queue */}
          <div
            onClick={() => onNavigate('admin-cleaning')}
            className="bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#5A5A40] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                Housekeeping
              </span>
              <Sparkles className="w-4 h-4 text-[#C4A484]" />
            </div>
            <div className="text-3xl font-serif text-[#C4A484]">
              {stats.roomsToCleanCount}
            </div>
            <div className="text-[10px] text-[#8C887D]">
              {stats.cleaningInProgressCount} cleaning now
            </div>
          </div>

          {/* Pending Service Orders */}
          <div
            onClick={() => onNavigate('admin-room-service')}
            className="bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#5A5A40] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                Room Services
              </span>
              <UtensilsCrossed className="w-4 h-4 text-[#5A5A40]" />
            </div>
            <div className="text-3xl font-serif text-[#2C2C2C]">
              {stats.pendingOrdersCount}
            </div>
            <div className="text-[10px] text-[#8C887D]">Kitchen & Laundry</div>
          </div>

          {/* Pending Payments */}
          <div
            onClick={() => onNavigate('admin-payments')}
            className="bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#5A5A40] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                Due Balance
              </span>
              <CreditCard className="w-4 h-4 text-[#C4A484]" />
            </div>
            <div className="text-3xl font-serif text-[#5A5A40]">
              ${stats.totalPendingPaymentAmount}
            </div>
            <div className="text-[10px] text-[#8C887D]">
              {stats.pendingPaymentsCount} pending
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZATION DASHBOARD: RECHARTS MONTHLY BOOKING TRENDS & REVENUE GROWTH */}
      <HostVisualizations
        bookings={allBookings}
        rooms={allRooms}
        onRefresh={fetchHostData}
      />

      {/* 2-COLUMN OPERATIONAL SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT (8 cols): Today's Stay Operations (Check-in / Check-out quick actions) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif italic text-2xl text-[#5A5A40] font-medium flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#5A5A40]" />
              Active Stays & Today's Schedule
            </h2>
            <button
              onClick={() => onNavigate('admin-bookings')}
              className="text-xs font-semibold text-[#5A5A40] hover:underline"
            >
              Full Register →
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs">
            {todayBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C887D]">
                No check-ins or active stays scheduled for today.
              </div>
            ) : (
              <div className="divide-y divide-[#F5F2ED]">
                {todayBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FDFCF9] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#2C2C2C] text-sm">
                          {b.guest?.full_name || 'Guest'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2D9]">
                          Room {b.room?.room_number || b.room_id}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            b.booking_status === 'checked_in'
                              ? 'bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20'
                              : 'bg-[#C4A484]/15 text-[#8C6442] border border-[#C4A484]/30'
                          }`}
                        >
                          {b.booking_status}
                        </span>
                      </div>

                      <div className="text-xs text-[#8C887D] flex flex-wrap items-center gap-3">
                        <span>
                          {b.check_in_date} → {b.check_out_date}
                        </span>
                        <span>•</span>
                        <span>Total: ${b.total_amount}</span>
                        <span>•</span>
                        <span className={b.payment_status === 'paid' ? 'text-[#5A5A40] font-medium' : 'text-[#C4A484] font-medium'}>
                          Paid: ${b.amount_paid} (Bal: ${b.total_amount - b.amount_paid})
                        </span>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {b.booking_status === 'confirmed' && (
                        <button
                          onClick={() => handleQuickCheckIn(b.id)}
                          className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-2xs transition-colors flex items-center gap-1.5"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Check In
                        </button>
                      )}

                      {b.booking_status === 'checked_in' && (
                        <button
                          onClick={() => handleQuickCheckOut(b.id)}
                          className="px-4 py-1.5 bg-[#C4A484] hover:bg-[#b09072] text-[#2C2C2C] text-[10px] font-bold uppercase tracking-widest rounded-full shadow-2xs transition-colors flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Check Out
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT (4 cols): Housekeeping Urgent Board & Room Service Quick Peek */}
        <div className="lg:col-span-4 space-y-6">
          {/* Housekeeping Action Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E2D9] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif italic text-xl text-[#5A5A40] font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C4A484]" />
                Housekeeping Queue
              </h2>
              <button
                onClick={() => onNavigate('admin-cleaning')}
                className="text-xs font-semibold text-[#5A5A40] hover:underline"
              >
                Board →
              </button>
            </div>

            {dirtyRooms.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#5A5A40] bg-[#F5F2ED] rounded-2xl border border-[#E5E2D9]">
                ✓ All suites sanitized and ready for guests!
              </div>
            ) : (
              <div className="space-y-2">
                {dirtyRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-3 bg-[#FDFCF9] rounded-2xl border border-[#E5E2D9] flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#2C2C2C]">
                        Room {room.room_number} ({room.room_type})
                      </div>
                      <div className="text-[10px] text-[#C4A484] font-semibold capitalize">
                        ● {room.cleaning_status}
                      </div>
                    </div>

                    <button
                      onClick={() => handleMarkClean(room.id)}
                      className="px-3 py-1 bg-white hover:bg-[#F5F2ED] text-[#5A5A40] border border-[#5A5A40] text-[10px] font-bold uppercase tracking-wider rounded-full shadow-2xs"
                    >
                      Ready ✓
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Kitchen Orders Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E2D9] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif italic text-xl text-[#5A5A40] font-medium flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-[#5A5A40]" />
                Room Service Orders ({pendingOrders.length})
              </h2>
              <button
                onClick={() => onNavigate('admin-room-service')}
                className="text-xs font-semibold text-[#5A5A40] hover:underline"
              >
                Service Queue →
              </button>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8C887D] bg-[#F5F2ED] rounded-2xl">
                No pending kitchen tickets.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingOrders.slice(0, 3).map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 bg-[#FDFCF9] rounded-2xl border border-[#E5E2D9] text-xs space-y-1"
                  >
                    <div className="flex justify-between font-semibold text-[#2C2C2C]">
                      <span>Room {ord.room?.room_number || ord.room_id}</span>
                      <span className="font-mono text-[#5A5A40]">${ord.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] text-[#8C887D]">
                      {ord.items.map((i) => `${i.quantity}x ${i.menu_item?.name || 'item'}`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
