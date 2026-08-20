import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  XCircle,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';
import { ServiceOrder } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

export const HostRoomService: React.FC = () => {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fetchOrders = async () => {
    try {
      const ords = await api.getServiceOrders();
      setOrders(ords);
    } catch (err) {
      console.error('Failed to load host orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // 3s live polling
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: 'pending' | 'accepted' | 'preparing' | 'delivered' | 'cancelled') => {
    try {
      await api.updateServiceOrderStatus(orderId, newStatus);
      success(`Order marked as ${newStatus}!`);
      fetchOrders();
    } catch (err: any) {
      error(err.message || 'Failed to update order status.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'All') return true;
    return o.status === statusFilter;
  });

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing' || o.status === 'accepted').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2D9] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
            Kitchen & Hospitality Fulfillment
          </div>
          <h1 className="font-serif italic text-3xl font-normal text-[#5A5A40]">
            Room Service & Orders Queue
          </h1>
          <p className="text-[#8C887D] text-xs mt-1">
            Receive incoming guest orders for breakfast, amenities, and room deliveries in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3.5 py-1.5 rounded-full bg-[#F5F2ED] border border-[#E5E2D9] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#5A5A40]" />
              {pendingCount} Pending Orders
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['All', 'pending', 'accepted', 'preparing', 'delivered', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
              statusFilter === st
                ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-2xs'
                : 'bg-white text-[#8C887D] border-[#E5E2D9] hover:text-[#2C2C2C]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5E2D9] space-y-2">
          <UtensilsCrossed className="w-12 h-12 text-[#8C887D] mx-auto opacity-50" />
          <h3 className="font-serif italic text-lg font-normal text-[#5A5A40]">No Orders in this Status</h3>
          <p className="text-xs text-[#8C887D]">All tickets have been fulfilled or matched filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-[#E5E2D9] p-6 shadow-2xs flex flex-col justify-between space-y-5 hover:shadow-xs transition-shadow"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b border-[#F5F2ED] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#2C2C2C] text-[#E5D7C7] text-[10px] font-bold uppercase tracking-wider">
                          Room {order.room?.room_number || order.room_id}
                        </span>
                        <span className="text-xs font-semibold text-[#2C2C2C]">
                          {order.guest?.full_name || 'Guest'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8C887D] mt-1">
                        Order #{order.id} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                        order.status === 'delivered'
                          ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                          : order.status === 'preparing'
                          ? 'bg-[#F5F2ED] text-[#C4A484] border-[#E5E2D9]'
                          : order.status === 'accepted'
                          ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                          : order.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-[#F5F2ED] text-[#8C887D] border-[#E5E2D9]'
                      }`}
                    >
                      ● {order.status}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#8C887D] uppercase tracking-wider">
                      Ordered Items
                    </div>
                    <div className="space-y-1.5 bg-[#FDFCF9] p-3 rounded-2xl border border-[#F5F2ED]">
                      {order.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-xs text-[#2C2C2C]">
                          <span className="font-medium">
                            {it.quantity}× {it.menu_item?.name || 'Item'}
                          </span>
                          <span className="font-serif italic text-[#8C887D]">
                            {it.subtotal === 0 ? 'Free' : `$${it.subtotal.toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="text-xs text-[#5A5A40] italic bg-[#F5F2ED] p-2.5 rounded-xl border border-[#E5E2D9]">
                      Special instructions: "{order.notes}"
                    </div>
                  )}

                  {/* Payment Details Section */}
                  <div className="bg-[#FDFCF9] p-3 rounded-2xl border border-[#E5E2D9] space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">Payment Status</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.payment_status === 'room_tab'
                            ? 'bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2D9]'
                            : order.payment_status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {order.payment_status === 'paid'
                          ? '● Paid'
                          : order.payment_status === 'room_tab'
                          ? '● Room Tab'
                          : order.payment_status === 'pending'
                          ? '● Pending Paynow'
                          : '● Unpaid'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[#8C887D]">
                      <span>Amount Paid:</span>
                      <span className="font-serif italic font-semibold text-[#2C2C2C]">
                        ${(order.amount_paid || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[#8C887D]">
                      <span>Balance Due:</span>
                      <span className="font-serif italic font-semibold text-[#2C2C2C]">
                        ${Math.max(0, order.total_amount - (order.amount_paid || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-[#F5F2ED] text-xs font-semibold text-[#2C2C2C]">
                    <span>Order Total:</span>
                    <span className="font-serif italic font-bold text-sm text-[#2C2C2C]">
                      ${order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="pt-3 border-t border-[#F5F2ED] flex flex-wrap items-center justify-between gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'accepted')}
                      className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs"
                    >
                      Accept Order
                    </button>
                  )}

                  {order.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      className="w-full py-2.5 bg-[#C4A484] hover:bg-[#b09072] text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs"
                    >
                      Start Preparing in Kitchen
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'delivered')}
                      className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Mark Delivered to Room
                    </button>
                  )}

                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                      className="text-[10px] text-[#8C887D] hover:text-rose-600 transition-colors mx-auto font-bold uppercase tracking-wider"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
