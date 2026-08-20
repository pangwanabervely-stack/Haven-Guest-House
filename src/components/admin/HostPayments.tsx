import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
  User,
  Plus,
  UtensilsCrossed,
  RefreshCw,
  Clock,
  Check
} from 'lucide-react';
import { Booking, ServiceOrder } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

interface HostPaymentsProps {
  bookings: Booking[];
  onRefreshBookings: () => void;
}

export const HostPayments: React.FC<HostPaymentsProps> = ({ bookings, onRefreshBookings }) => {
  const { success, error } = useToast();
  const [filter, setFilter] = useState<string>('All');
  const [serviceFilter, setServiceFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);

  // Accommodation Payment Recording
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'bank_transfer'>('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);

  // Service Order Settlement Recording
  const [activeServiceOrder, setActiveServiceOrder] = useState<ServiceOrder | null>(null);
  const [servicePaymentMethod, setServicePaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'bank_transfer'>('cash');
  const [isProcessingService, setIsProcessingService] = useState(false);

  const fetchServices = async () => {
    setIsLoadingServices(true);
    try {
      const orders = await api.getServiceOrders();
      setServiceOrders(orders);
    } catch (err) {
      console.warn('Failed to load service orders for host ledger:', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Accommodation Totals
  const totalAccommodationGross = bookings.reduce((sum, b) => (b.booking_status !== 'cancelled' ? sum + Number(b.total_amount || 0) : sum), 0);
  const totalAccommodationPaid = bookings.reduce((sum, b) => (b.booking_status !== 'cancelled' ? sum + Number(b.amount_paid || 0) : sum), 0);
  const totalAccommodationOutstanding = totalAccommodationGross - totalAccommodationPaid;

  // Service Orders Totals
  const nonCancelledServices = serviceOrders.filter((s) => s.status !== 'cancelled');
  const totalServicesGross = nonCancelledServices.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalServicesPaid = nonCancelledServices.reduce((sum, s) => {
    if (s.payment_status === 'paid') return sum + Number(s.total_amount || 0);
    return sum + Number(s.amount_paid || 0);
  }, 0);
  const totalServicesOutstanding = nonCancelledServices
    .filter((s) => s.payment_status !== 'paid')
    .reduce((sum, s) => sum + (Number(s.total_amount || 0) - Number(s.amount_paid || 0)), 0);

  // Grand Combined Totals
  const grandTotalGross = totalAccommodationGross + totalServicesGross;
  const grandTotalCollected = totalAccommodationPaid + totalServicesPaid;
  const grandTotalOutstanding = totalAccommodationOutstanding + totalServicesOutstanding;

  const filteredBookings = bookings.filter((b) => {
    if (b.booking_status === 'cancelled') return false;
    if (filter !== 'All' && b.payment_status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.guest?.full_name?.toLowerCase().includes(q);
      const matchRef = b.id.toLowerCase().includes(q);
      const matchRoom = b.room?.room_number?.toLowerCase().includes(q);
      if (!matchName && !matchRef && !matchRoom) return false;
    }
    return true;
  });

  const filteredServices = serviceOrders.filter((s) => {
    if (s.status === 'cancelled') return false;
    if (serviceFilter !== 'All' && s.payment_status !== serviceFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchGuest = s.guest?.full_name?.toLowerCase().includes(q) || s.guest?.email?.toLowerCase().includes(q);
      const matchRoom = s.room?.room_number?.toLowerCase().includes(q);
      const matchItems = s.items?.some((it) => it.menu_item?.name?.toLowerCase().includes(q));
      if (!matchGuest && !matchRoom && !matchItems) return false;
    }
    return true;
  });

  const handleOpenPayment = (b: Booking) => {
    setActiveBooking(b);
    setPaymentAmount(Math.max(0, Number(b.total_amount) - Number(b.amount_paid)));
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;

    setIsProcessing(true);
    try {
      const newPaid = Number(activeBooking.amount_paid) + Number(paymentAmount);
      await api.updateBookingPayment(activeBooking.id, newPaid, paymentMethod);
      success(`Recorded payment of $${paymentAmount} via ${paymentMethod.replace('_', ' ')}!`);
      setActiveBooking(null);
      onRefreshBookings();
      fetchServices();
    } catch (err: any) {
      error(err.message || 'Failed to record payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordServiceSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServiceOrder) return;

    setIsProcessingService(true);
    try {
      await api.updateServiceOrderPayment(
        activeServiceOrder.id,
        'paid',
        Number(activeServiceOrder.total_amount)
      );
      success(`Service order marked as Paid via ${servicePaymentMethod.replace('_', ' ')}!`);
      setActiveServiceOrder(null);
      fetchServices();
      onRefreshBookings();
    } catch (err: any) {
      error(err.message || 'Failed to settle service order.');
    } finally {
      setIsProcessingService(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E5E2D9] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
            Financial Records & Balances
          </div>
          <h1 className="font-serif italic text-3xl font-normal text-[#5A5A40]">
            Payment Ledger & Accounts Receivable
          </h1>
          <p className="text-[#8C887D] text-xs mt-1">
            Track received deposits, reconcile on-site room tabs, and monitor outstanding customer balances.
          </p>
        </div>
        <button
          onClick={() => {
            onRefreshBookings();
            fetchServices();
          }}
          className="self-start sm:self-auto px-4 py-2 bg-white border border-[#E5E2D9] rounded-full text-xs font-bold uppercase tracking-wider text-[#5A5A40] hover:bg-[#FDFCF9] flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServices ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
            <span>Total Gross Revenue</span>
            <TrendingUp className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-3xl font-serif italic font-bold text-[#2C2C2C]">
            ${grandTotalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#8C887D] flex flex-wrap gap-x-2">
            <span>Accommodations: ${totalAccommodationGross.toFixed(2)}</span>
            <span>•</span>
            <span>Services: ${totalServicesGross.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#5A5A40]">
            <span>Total Revenue Collected</span>
            <CheckCircle2 className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-3xl font-serif italic font-bold text-[#5A5A40]">
            ${grandTotalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#8C887D] flex flex-wrap gap-x-2">
            <span>Accommodations: ${totalAccommodationPaid.toFixed(2)}</span>
            <span>•</span>
            <span>Services: ${totalServicesPaid.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#C4A484]">
            <span>Total Outstanding Due</span>
            <AlertCircle className="w-4 h-4 text-[#C4A484]" />
          </div>
          <div className="text-3xl font-serif italic font-bold text-[#2C2C2C]">
            ${grandTotalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#8C887D] flex flex-wrap gap-x-2">
            <span>Accommodations: ${totalAccommodationOutstanding.toFixed(2)}</span>
            <span>•</span>
            <span>Room Tabs/Incidentals: ${totalServicesOutstanding.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div className="bg-white p-4 rounded-3xl border border-[#E5E2D9] shadow-xs flex items-center gap-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#8C887D] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by guest name, room number, or meal/service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2C2C2C]"
          />
        </div>
      </div>

      {/* SECTION 1: ACCOMMODATION RESERVATIONS LEDGER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif italic text-2xl text-[#5A5A40] font-medium">
              Accommodation Reservations
            </h2>
            <p className="text-xs text-[#8C887D]">
              Suite bookings, stay dates, room charges, and received deposit allocations.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {['All', 'paid', 'partial', 'pending'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border cursor-pointer ${
                  filter === st
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-2xs'
                    : 'bg-[#FDFCF9] text-[#8C887D] border-[#E5E2D9] hover:text-[#2C2C2C]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F2ED] text-[#8C887D] text-[10px] font-bold uppercase tracking-widest border-b border-[#E5E2D9]">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Booking Ref & Guest</th>
                  <th className="px-6 py-3.5 font-bold">Room & Dates</th>
                  <th className="px-6 py-3.5 font-bold">Total Cost</th>
                  <th className="px-6 py-3.5 font-bold">Amount Paid</th>
                  <th className="px-6 py-3.5 font-bold">Balance Due</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F2ED] text-[#2C2C2C]">
                {filteredBookings.map((b) => {
                  const balance = Number(b.total_amount) - Number(b.amount_paid);

                  return (
                    <tr key={b.id} className="hover:bg-[#FDFCF9]">
                      <td className="px-6 py-4">
                        <div className="font-mono text-[10px] font-bold text-[#8C887D] mb-0.5">{b.id}</div>
                        <div className="font-semibold text-[#2C2C2C]">{b.guest?.full_name || 'Guest'}</div>
                        <div className="text-[11px] text-[#8C887D]">{b.guest?.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#2C2C2C]">
                          Room {b.room?.room_number || b.room_id} ({b.room?.room_type})
                        </div>
                        <div className="text-[11px] text-[#8C887D]">
                          {b.check_in_date} → {b.check_out_date}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-serif italic font-bold text-[#2C2C2C]">
                        ${Number(b.total_amount).toFixed(2)}
                      </td>

                      <td className="px-6 py-4 font-serif italic font-bold text-[#5A5A40]">
                        ${Number(b.amount_paid).toFixed(2)}
                      </td>

                      <td className="px-6 py-4 font-serif italic font-bold text-[#C4A484]">
                        ${balance.toFixed(2)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                            b.payment_status === 'paid'
                              ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                              : b.payment_status === 'partial'
                              ? 'bg-[#F5F2ED] text-[#C4A484] border-[#E5E2D9]'
                              : 'bg-[#FDFCF9] text-[#8C887D] border-[#E5E2D9]'
                          }`}
                        >
                          ● {b.payment_status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {balance > 0 ? (
                          <button
                            onClick={() => handleOpenPayment(b)}
                            className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs cursor-pointer"
                          >
                            Record Payment
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Fully Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: ROOM SERVICES & INCIDENTALS LEDGER */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif italic text-2xl text-[#5A5A40] font-medium flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-[#5A5A40]" />
              <span>Room Services & Incidentals Ledger</span>
            </h2>
            <p className="text-xs text-[#8C887D]">
              Ordered meals, beverages, laundry, and room tab charges for all active and completed stays.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {['All', 'paid', 'room_tab', 'pending', 'unpaid'].map((st) => (
              <button
                key={st}
                onClick={() => setServiceFilter(st)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border cursor-pointer ${
                  serviceFilter === st
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-2xs'
                    : 'bg-[#FDFCF9] text-[#8C887D] border-[#E5E2D9] hover:text-[#2C2C2C]'
                }`}
              >
                {st === 'room_tab' ? 'Room Tab' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F2ED] text-[#8C887D] text-[10px] font-bold uppercase tracking-widest border-b border-[#E5E2D9]">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Guest & Room</th>
                  <th className="px-6 py-3.5 font-bold">Service / Items</th>
                  <th className="px-6 py-3.5 font-bold">Amount</th>
                  <th className="px-6 py-3.5 font-bold">Order Status</th>
                  <th className="px-6 py-3.5 font-bold">Payment Status</th>
                  <th className="px-6 py-3.5 font-bold">Date & Time</th>
                  <th className="px-6 py-3.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F2ED] text-[#2C2C2C]">
                {filteredServices.map((order) => {
                  const isPaid = order.payment_status === 'paid';
                  const isLaundry = order.items?.some(
                    (it) => it.menu_item?.name?.toLowerCase().includes('laundry') || it.menu_item?.category?.toLowerCase().includes('laundry')
                  );

                  return (
                    <tr key={order.id} className="hover:bg-[#FDFCF9]">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#2C2C2C]">{order.guest?.full_name || 'Guest'}</div>
                        <div className="text-[11px] text-[#8C887D]">
                          Room {order.room?.room_number || order.room_id} {order.room?.room_type ? `(${order.room.room_type})` : ''}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#2C2C2C]">
                          {order.items && order.items.length > 0
                            ? order.items.map((it) => `${it.quantity} × ${it.menu_item?.name || 'Item'}`).join(', ')
                            : isLaundry ? 'Laundry Service' : 'Room Service Meal'}
                        </div>
                        {order.notes && (
                          <div className="text-[10px] text-[#8C887D] italic mt-0.5">
                            Note: {order.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 font-serif italic font-bold text-[#2C2C2C]">
                        ${Number(order.total_amount).toFixed(2)}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                          order.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : order.status === 'preparing'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : order.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                        }`}>
                          {order.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : order.payment_status === 'room_tab'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : order.payment_status === 'pending'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {order.payment_status === 'room_tab'
                            ? 'Room Tab'
                            : order.payment_status === 'paid'
                            ? 'Paid'
                            : order.payment_status === 'pending'
                            ? 'Pending'
                            : 'Unpaid'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-[#8C887D] text-[11px]">
                        {new Date(order.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {!isPaid && order.status !== 'cancelled' ? (
                          <button
                            onClick={() => setActiveServiceOrder(order)}
                            className="px-3 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ACCOMMODATION PAYMENT MODAL */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FDFCF9] rounded-[32px] p-6 sm:p-8 max-w-md w-full border border-[#E5E2D9] shadow-2xl space-y-6">
            <h3 className="font-serif italic text-xl font-normal text-[#5A5A40] border-b border-[#E5E2D9] pb-3">
              Record Guest Settlement
            </h3>

            <div className="p-4 bg-white rounded-2xl border border-[#E5E2D9] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Guest:</span>
                <span className="font-bold text-[#2C2C2C]">{activeBooking.guest?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Total Bill:</span>
                <span className="font-bold text-[#2C2C2C]">${Number(activeBooking.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Currently Paid:</span>
                <span className="font-bold text-[#5A5A40]">${Number(activeBooking.amount_paid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#C4A484] pt-1.5 border-t border-[#F5F2ED]">
                <span>Remaining Balance:</span>
                <span>${(Number(activeBooking.total_amount) - Number(activeBooking.amount_paid)).toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Payment Amount to Log ($)
                </label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none font-bold text-[#2C2C2C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Settlement Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none text-[#2C2C2C]"
                >
                  <option value="credit_card">Credit Card POS Terminal</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="cash">Direct Cash</option>
                  <option value="bank_transfer">Wire / Bank Transfer</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
                <button
                  type="button"
                  onClick={() => setActiveBooking(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#8C887D] hover:text-[#2C2C2C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors shadow-xs cursor-pointer"
                >
                  {isProcessing ? 'Processing...' : 'Apply Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE ORDER SETTLEMENT MODAL */}
      {activeServiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FDFCF9] rounded-[32px] p-6 sm:p-8 max-w-md w-full border border-[#E5E2D9] shadow-2xl space-y-6">
            <h3 className="font-serif italic text-xl font-normal text-[#5A5A40] border-b border-[#E5E2D9] pb-3">
              Settle Room Service / Incidentals
            </h3>

            <div className="p-4 bg-white rounded-2xl border border-[#E5E2D9] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Guest:</span>
                <span className="font-bold text-[#2C2C2C]">{activeServiceOrder.guest?.full_name || 'Guest'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Room:</span>
                <span className="font-bold text-[#2C2C2C]">Room {activeServiceOrder.room?.room_number || activeServiceOrder.room_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Service Items:</span>
                <span className="font-bold text-[#2C2C2C]">
                  {activeServiceOrder.items?.map((it) => it.menu_item?.name || 'Item').join(', ') || 'Room Service'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-[#5A5A40] pt-1.5 border-t border-[#F5F2ED]">
                <span>Total Amount Due:</span>
                <span>${Number(activeServiceOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordServiceSettlement} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Settlement Method Received
                </label>
                <select
                  value={servicePaymentMethod}
                  onChange={(e: any) => setServicePaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none text-[#2C2C2C]"
                >
                  <option value="cash">Direct Cash</option>
                  <option value="credit_card">Credit Card POS Terminal</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_transfer">Wire / Bank Transfer</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
                <button
                  type="button"
                  onClick={() => setActiveServiceOrder(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#8C887D] hover:text-[#2C2C2C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingService}
                  className="px-6 py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors shadow-xs cursor-pointer"
                >
                  {isProcessingService ? 'Processing...' : 'Confirm Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
