import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Coffee,
  X,
  Truck,
  CreditCard,
  Building2,
  DollarSign
} from 'lucide-react';
import { MenuItem, ServiceOrder, Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { PaynowServicePaymentModal } from '../payment/PaynowServicePaymentModal';

interface GuestRoomServiceProps {
  activeBooking?: Booking | null;
}

export const GuestRoomService: React.FC<GuestRoomServiceProps> = ({ activeBooking }) => {
  const { currentUser } = useAuth();
  const { notifyRoomServiceOrder } = useNotifications();
  const { success, error } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [myOrders, setMyOrders] = useState<ServiceOrder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Payment Selection
  const [paymentChoice, setPaymentChoice] = useState<'paynow' | 'room_tab'>('paynow');
  const [payingOrder, setPayingOrder] = useState<ServiceOrder | null>(null);

  const isCheckedIn = Boolean(activeBooking && activeBooking.booking_status === 'checked_in');
  const canAddToRoomTab = isCheckedIn;

  // Preferred normalized categories
  const standardCategories: string[] = ['All', 'Breakfast', 'Meals', 'Snacks', 'Beverages', 'Laundry'];
  
  // Also collect any distinct custom categories from menu items
  const extraCategories: string[] = Array.from(
    new Set<string>(
      menuItems
        .map((m) => m.category)
        .filter((cat): cat is string => {
          if (!cat) return false;
          const normalized = cat.toLowerCase().trim();
          return !['breakfast', 'meals', 'all_day_dining', 'snacks', 'beverages', 'laundry', 'laundry_valet', 'all'].includes(normalized);
        })
    )
  );

  const categories: string[] = [...standardCategories, ...extraCategories];

  const formatCategoryName = (cat: string) => {
    if (cat === 'All') return 'All Menu & Amenities';
    if (cat.toLowerCase() === 'breakfast') return 'Breakfast';
    if (cat.toLowerCase() === 'meals' || cat.toLowerCase() === 'all_day_dining') return 'Meals';
    if (cat.toLowerCase() === 'snacks') return 'Snacks';
    if (cat.toLowerCase() === 'beverages') return 'Beverages';
    if (cat.toLowerCase() === 'laundry' || cat.toLowerCase() === 'laundry_valet') return 'Laundry & Valet';
    if (cat.toLowerCase() === 'housekeeping_wellness') return 'Amenities & Linens';
    return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const fetchMenuAndOrders = async () => {
    try {
      const items = await api.getMenuItems();
      setMenuItems(items);

      if (currentUser) {
        const orders = await api.getServiceOrders({ guestId: currentUser.id });
        setMyOrders(orders);
      }
    } catch (err) {
      console.error('Failed to load menu/orders:', err);
    }
  };

  useEffect(() => {
    fetchMenuAndOrders();
    const interval = setInterval(fetchMenuAndOrders, 3000); // Live sync
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const matchesCategory = (itemCategory: string, filterCategory: string) => {
    if (filterCategory === 'All') return true;
    const itemNorm = (itemCategory || '').toLowerCase().trim();
    const filterNorm = filterCategory.toLowerCase().trim();

    if (filterNorm === 'breakfast') {
      return itemNorm === 'breakfast';
    }
    if (filterNorm === 'meals') {
      return itemNorm === 'meals' || itemNorm === 'all_day_dining' || itemNorm === 'dining' || itemNorm === 'main';
    }
    if (filterNorm === 'snacks') {
      return itemNorm === 'snacks' || itemNorm === 'snack';
    }
    if (filterNorm === 'beverages') {
      return itemNorm === 'beverages' || itemNorm === 'beverage' || itemNorm === 'drinks' || itemNorm === 'drink';
    }
    if (filterNorm === 'laundry') {
      return itemNorm === 'laundry' || itemNorm === 'laundry_valet' || itemNorm === 'valet';
    }
    return itemNorm === filterNorm;
  };

  const filteredItems = menuItems.filter((item) => matchesCategory(item.category, selectedCategory));

  const addToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if ((updated[itemId] || 0) > 1) {
        updated[itemId] -= 1;
      } else {
        delete updated[itemId];
      }
      return updated;
    });
  };

  const cartItemCount: number = Object.values(cart).reduce<number>((sum, qty) => sum + Number(qty || 0), 0);

  const cartTotal: number = Object.entries(cart).reduce<number>((total, [itemId, qty]) => {
    const item = menuItems.find((m) => m.id === itemId);
    return total + (item ? item.price * Number(qty || 0) : 0);
  }, 0);

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      error('Please sign in to order room service.');
      return;
    }

    // Rule 2: GUESTS CANNOT USE ROOM SERVICES BEFORE CHECK-IN
    if (!isCheckedIn) {
      error('Room services are available after check-in. Please check in to your room before placing room service orders.');
      return;
    }

    if (cartItemCount === 0) {
      error('Your cart is empty.');
      return;
    }

    const roomId = activeBooking?.room_id || activeBooking?.room?.id || 'room-101';
    const isRoomTab = paymentChoice === 'room_tab' && canAddToRoomTab;

    setIsSubmitting(true);
    try {
      const itemsPayload = Object.entries(cart).map(([menu_item_id, quantity]) => ({
        menu_item_id,
        quantity: Number(quantity)
      }));

      const createdOrder = await api.createServiceOrder({
        guest_id: currentUser.id,
        booking_id: activeBooking?.id || null,
        room_id: roomId,
        notes: orderNotes.trim(),
        addToRoomTab: isRoomTab,
        payment_method: isRoomTab ? 'room_tab' : 'paynow',
        items: itemsPayload
      });

      notifyRoomServiceOrder({
        orderId: createdOrder.id,
        guestId: currentUser.id,
        guestName: currentUser.full_name || 'Guest',
        roomNumber: activeBooking?.room?.room_number || 'Room',
        totalAmount: cartTotal
      });

      setCart({});
      setOrderNotes('');
      setIsCartOpen(false);
      fetchMenuAndOrders();

      if (isRoomTab) {
        success('Room service order placed and charged to your stay tab!');
      } else {
        success('Room service order placed! Opening Paynow checkout...');
        setPayingOrder(createdOrder);
      }
    } catch (err: any) {
      error(err.message || 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Check-in Notice if not checked in */}
      {!isCheckedIn && (
        <div className="bg-[#F5F2ED] border border-[#E5E2D9] rounded-3xl p-5 flex items-start gap-3.5 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
              Room Services Available After Check-in
            </h4>
            <p className="text-xs text-[#8C887D] leading-relaxed">
              In-room dining, beverages, and laundry services are available once you have completed physical check-in to your room at The Haven.
              {activeBooking ? ` Your reservation is currently ${activeBooking.booking_status.replace('_', ' ')}.` : ' You do not currently have an active checked-in stay.'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E2D9] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
            Artisanal In-Room Dining & Amenities
          </div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-[#5A5A40] font-normal">
            Room Service & Hospitality Amenities
          </h1>
          <p className="text-[#8C887D] text-xs mt-1">
            {activeBooking
              ? `Delivering directly to Room ${activeBooking.room?.room_number} (${activeBooking.room?.room_type})`
              : 'Direct in-room delivery within 15–25 minutes.'}
          </p>
        </div>

        {/* View Cart Button */}
        <button
          onClick={() => {
            if (!isCheckedIn) {
              error('Room services are available after check-in.');
              return;
            }
            setIsCartOpen(true);
          }}
          disabled={!isCheckedIn}
          className={`relative px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-colors shadow-xs flex items-center gap-2 self-start md:self-auto ${
            isCheckedIn
              ? 'bg-[#5A5A40] hover:bg-[#484833] text-white'
              : 'bg-[#E5E2D9] text-[#8C887D] cursor-not-allowed'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isCheckedIn ? `View Cart (${cartItemCount})` : 'Available After Check-in'}</span>
          {cartTotal > 0 && <span className="font-bold font-serif italic ml-1">${cartTotal.toFixed(2)}</span>}
          {cartItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#2C2C2C] text-[#C4A484] text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* Categories Filter Strip */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-xs'
                : 'bg-white text-[#8C887D] border-[#E5E2D9] hover:border-[#5A5A40] hover:text-[#2C2C2C]'
            }`}
          >
            {formatCategoryName(cat)}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredItems.map((item) => {
          const inCartQty = cart[item.id] || 0;

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] bg-[#F5F2ED] overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-[#2C2C2C]/80 backdrop-blur-md text-[#E5D7C7] text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full">
                    {formatCategoryName(item.category)}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-md text-[#2C2C2C] px-2.5 py-0.5 rounded-full text-xs font-serif italic font-bold shadow-2xs">
                    {item.price === 0 ? 'Complimentary' : `$${item.price.toFixed(2)}`}
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <h3 className="font-serif italic text-sm font-medium text-[#2C2C2C] line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#8C887D] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Add / Quantity Controls */}
              <div className="p-4 pt-0">
                {inCartQty > 0 ? (
                  <div className="flex items-center justify-between bg-[#FDFCF9] border border-[#E5E2D9] rounded-full p-1.5">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 rounded-full bg-white text-[#2C2C2C] hover:bg-[#F5F2ED] flex items-center justify-center font-bold shadow-2xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-[#5A5A40] font-mono">
                      {inCartQty} in cart
                    </span>
                    <button
                      onClick={() => {
                        if (!isCheckedIn) {
                          error('Room services are available after check-in.');
                          return;
                        }
                        addToCart(item.id);
                      }}
                      className="w-7 h-7 rounded-full bg-[#5A5A40] text-white hover:bg-[#484833] flex items-center justify-center font-bold shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!isCheckedIn) {
                        error('Room services are available after check-in. Please check in to your room before ordering.');
                        return;
                      }
                      addToCart(item.id);
                    }}
                    className={`w-full py-2.5 px-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-2xs ${
                      isCheckedIn
                        ? 'bg-[#2C2C2C] hover:bg-[#5A5A40] text-white'
                        : 'bg-[#F5F2ED] text-[#8C887D] hover:bg-[#E5E2D9]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isCheckedIn ? 'Add to Order' : 'Available After Check-in'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LIVE ORDERS TRACKER SECTION */}
      {myOrders.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-[#E5E2D9]">
          <div className="flex items-center justify-between">
            <h2 className="font-serif italic text-2xl text-[#5A5A40] font-medium flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#5A5A40]" />
              Live Order Status & History
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-[#8C887D] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5A5A40] animate-pulse" />
              Live syncing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myOrders.map((order) => {
              const statusStep =
                order.status === 'pending'
                  ? 1
                  : order.status === 'accepted'
                  ? 2
                  : order.status === 'preparing'
                  ? 3
                  : order.status === 'delivered'
                  ? 4
                  : 0;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-[#E5E2D9] p-6 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#F5F2ED] pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#2C2C2C]">
                        Order #{order.id}
                      </span>
                      <div className="text-[11px] text-[#8C887D]">
                        Room {order.room?.room_number || order.room_id} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                        order.status === 'delivered'
                          ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                          : order.status === 'preparing'
                          ? 'bg-[#F5F2ED] text-[#C4A484] border-[#E5E2D9]'
                          : order.status === 'accepted'
                          ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                          : order.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-[#FDFCF9] text-[#8C887D] border-[#E5E2D9]'
                      }`}
                    >
                      ● {order.status}
                    </span>
                  </div>

                  {/* Visual Step Progress Bar */}
                  {order.status !== 'cancelled' && (
                    <div className="py-1">
                      <div className="flex justify-between text-[9px] text-[#8C887D] font-bold mb-1 uppercase tracking-widest">
                        <span>Received</span>
                        <span>Accepted</span>
                        <span>Preparing</span>
                        <span>Delivered</span>
                      </div>
                      <div className="w-full bg-[#F5F2ED] h-1.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-[#5A5A40] h-full transition-all duration-500 rounded-full"
                          style={{ width: `${(statusStep / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="space-y-1 text-xs text-[#2C2C2C]">
                    {order.items.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>
                          {it.quantity}× {it.menu_item?.name || 'Item'}
                        </span>
                        <span className="font-mono text-[#8C887D]">
                          {it.subtotal === 0 ? 'Free' : `$${it.subtotal.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="text-xs text-[#8C887D] italic bg-[#FDFCF9] p-2.5 rounded-xl border border-[#E5E2D9]">
                      Note: "{order.notes}"
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 border-t border-[#F5F2ED] gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[#8C887D]">Total:</span>
                      <span className="font-serif italic font-bold text-[#5A5A40] text-sm">
                        ${order.total_amount.toFixed(2)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                          order.status === 'cancelled' || order.payment_status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : order.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : order.payment_status === 'room_tab'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : order.payment_status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {order.status === 'cancelled' || order.payment_status === 'cancelled'
                          ? 'Cancelled'
                          : order.payment_status === 'paid'
                          ? '✓ Paid via Paynow'
                          : order.payment_status === 'room_tab'
                          ? 'Room Tab (On Folio)'
                          : order.payment_status === 'failed'
                          ? 'Payment Failed'
                          : 'Payment Pending'}
                      </span>
                    </div>

                    {order.payment_status !== 'paid' && order.status !== 'cancelled' && order.payment_status !== 'cancelled' && (
                      <button
                        onClick={() => setPayingOrder(order)}
                        className="px-3 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-2xs flex items-center gap-1.5 transition-colors self-end sm:self-auto"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay with Paynow</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CART DRAWER MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FDFCF9] w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto border-l border-[#E5E2D9]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="font-serif italic text-lg font-medium text-[#2C2C2C]">
                    Your Room Service Order
                  </h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-[#8C887D] hover:text-[#2C2C2C]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cartItemCount === 0 ? (
                <div className="text-center py-12 text-[#8C887D] text-xs leading-relaxed">
                  Your cart is empty. Add some breakfast items or refreshments from the menu!
                </div>
              ) : (
                <div className="divide-y divide-[#F5F2ED] my-4 space-y-3">
                  {Object.entries(cart).map(([itemId, qty]) => {
                    const item = menuItems.find((m) => m.id === itemId);
                    if (!item) return null;

                    return (
                      <div key={itemId} className="pt-3 flex items-center justify-between">
                        <div className="flex-1 pr-2">
                          <div className="text-xs font-semibold text-[#2C2C2C]">{item.name}</div>
                          <div className="text-[11px] text-[#8C887D]">
                            {item.price === 0 ? 'Complimentary' : `$${item.price.toFixed(2)} each`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-6 h-6 rounded-full bg-white text-[#2C2C2C] border border-[#E5E2D9] hover:bg-[#F5F2ED] flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold font-mono text-[#2C2C2C]">{qty}</span>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="w-6 h-6 rounded-full bg-[#5A5A40] text-white hover:bg-[#484833] flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                          <span className="text-xs font-semibold font-mono text-[#2C2C2C] w-12 text-right">
                            ${(item.price * Number(qty)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Special Delivery Instructions */}
              <div className="mt-6">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                  Delivery Notes & Requests
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Leave at door, extra napkins, oat milk..."
                  className="w-full p-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none resize-none text-[#2C2C2C]"
                />
              </div>

              {/* Payment Settlement Method Option */}
              {cartItemCount > 0 && (
                <div className="mt-6 space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
                    Payment Settlement Option
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentChoice('paynow')}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        paymentChoice === 'paynow'
                          ? 'border-[#5A5A40] bg-[#5A5A40]/5 shadow-2xs'
                          : 'border-[#E5E2D9] bg-white hover:border-[#5A5A40]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-4 h-4 text-[#5A5A40]" />
                        <div>
                          <div className="text-xs font-bold text-[#2C2C2C]">Pay Now with Paynow</div>
                          <div className="text-[10px] text-[#8C887D]">EcoCash, OneMoney, Visa & Mastercard</div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentChoice === 'paynow' ? 'border-[#5A5A40] bg-[#5A5A40]' : 'border-[#E5E2D9]'}`}>
                        {paymentChoice === 'paynow' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={!canAddToRoomTab}
                      onClick={() => setPaymentChoice('room_tab')}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        !canAddToRoomTab
                          ? 'opacity-40 bg-gray-50 border-gray-200 cursor-not-allowed'
                          : paymentChoice === 'room_tab'
                          ? 'border-[#5A5A40] bg-[#5A5A40]/5 shadow-2xs'
                          : 'border-[#E5E2D9] bg-white hover:border-[#5A5A40]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-[#5A5A40]" />
                        <div>
                          <div className="text-xs font-bold text-[#2C2C2C]">Add to Room Tab (Active Stay)</div>
                          <div className="text-[10px] text-[#8C887D]">
                            {canAddToRoomTab
                              ? `Charge to Room ${activeBooking?.room?.room_number || ''} folio, settle at check-out`
                              : 'Requires an active stay reservation'}
                          </div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentChoice === 'room_tab' ? 'border-[#5A5A40] bg-[#5A5A40]' : 'border-[#E5E2D9]'}`}>
                        {paymentChoice === 'room_tab' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="pt-6 border-t border-[#E5E2D9] space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold text-[#2C2C2C]">
                <span>Total Amount:</span>
                <span className="text-lg font-serif italic font-bold text-[#5A5A40]">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || cartItemCount === 0}
                className="w-full py-3.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {paymentChoice === 'room_tab' ? 'Charge to Room Tab' : 'Place Order & Pay with Paynow'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYNOW SERVICE PAYMENT MODAL */}
      {payingOrder && (
        <PaynowServicePaymentModal
          serviceOrder={payingOrder}
          isOpen={Boolean(payingOrder)}
          onClose={() => setPayingOrder(null)}
          onPaymentSuccess={() => {
            setPayingOrder(null);
            fetchMenuAndOrders();
          }}
        />
      )}
    </div>
  );
};
