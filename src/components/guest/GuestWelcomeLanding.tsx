import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  UtensilsCrossed,
  MessageSquare,
  BedDouble,
  Compass,
  Phone,
  Sun,
  Moon,
  Sunset,
  ArrowRight,
  CheckCircle2,
  Car,
  Camera,
  Star,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Coffee,
  HeartHandshake,
  Send,
  Printer,
  Edit,
  CreditCard,
  Search,
  Filter,
  Info
} from 'lucide-react';
import { Booking, Room } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { LOCAL_RECOMMENDATIONS, LocalRecommendation } from '../../data/localRecommendations';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { PROPERTY_IMAGES } from '../../lib/images';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';

interface GuestWelcomeLandingProps {
  bookings: Booking[];
  rooms: Room[];
  onNavigate: (view: string) => void;
  onRefreshBookings: () => void | Promise<any>;
  onSelectBookingDetail?: (booking: Booking) => void;
  onOpenModifyModal?: (booking: Booking) => void;
  onOpenPaymentModal?: (booking: Booking) => void;
}

export const GuestWelcomeLanding: React.FC<GuestWelcomeLandingProps> = ({
  bookings,
  rooms,
  onNavigate,
  onRefreshBookings,
  onSelectBookingDetail,
  onOpenModifyModal,
  onOpenPaymentModal
}) => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const { notifyRoomDirty } = useNotifications();

  const [activeTab, setActiveTab] = useState<'welcome' | 'itinerary' | 'recommendations'>('welcome');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttraction, setSelectedAttraction] = useState<LocalRecommendation | null>(null);
  const [conciergeModalOpen, setConciergeModalOpen] = useState(false);
  const [conciergeMessage, setConciergeMessage] = useState('');
  const [conciergeSubject, setConciergeSubject] = useState('');
  const [sendingConcierge, setSendingConcierge] = useState(false);

  // Housekeeping cleaning request state
  const [cleaningModalOpen, setCleaningModalOpen] = useState(false);
  const [requestingCleaning, setRequestingCleaning] = useState(false);

  // Determine current active/upcoming booking
  const activeBooking = bookings.find(
    (b) => b.booking_status === 'checked_in' || b.booking_status === 'confirmed'
  ) || bookings[0];

  const activeRoom = rooms.find((r) => r.id === activeBooking?.room_id) || activeBooking?.room;

  const handleConfirmCleaningRequest = async () => {
    if (!activeRoom || !activeBooking || !currentUser) return;

    // Rule 3: GUESTS CANNOT REQUEST ROOM CLEANING BEFORE CHECK-IN
    if (activeBooking.booking_status !== 'checked_in') {
      error('Room cleaning requests are available after check-in. Please check in before requesting housekeeping service.');
      setCleaningModalOpen(false);
      return;
    }

    setRequestingCleaning(true);
    try {
      await api.requestRoomCleaning(activeRoom.id, currentUser.id);
      notifyRoomDirty({
        roomNumber: activeRoom.room_number || activeBooking.room_id,
        roomId: activeRoom.id,
        reason: 'Guest requested room cleaning',
        guestId: currentUser.id
      });
      success('Housekeeping request submitted. Your room has been marked for cleaning.');
      setCleaningModalOpen(false);
      if (onRefreshBookings) {
        await onRefreshBookings();
      }
    } catch (err: any) {
      error(err.message || 'Failed to submit cleaning request.');
    } finally {
      setRequestingCleaning(false);
    }
  };

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: 'Good morning', icon: Sun, timeLabel: 'Morning in Gweru' };
    } else if (hour >= 12 && hour < 17) {
      return { text: 'Good afternoon', icon: Sun, timeLabel: 'Afternoon in Gweru' };
    } else if (hour >= 17 && hour < 21) {
      return { text: 'Good evening', icon: Sunset, timeLabel: 'Sunset in Woodlands' };
    } else {
      return { text: 'Good night', icon: Moon, timeLabel: 'Tranquil Night' };
    }
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Filter recommendations
  const filteredRecommendations = LOCAL_RECOMMENDATIONS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', 'Wildlife & Safari', 'Heritage & Culture', 'Nature & Scenery', 'Artisan & Shopping', 'Dining & Drinks', 'Leisure & Sports'];

  // Handle sending concierge inquiry about attraction or custom stay request
  const handleSendConciergeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conciergeMessage.trim()) return;

    setSendingConcierge(true);
    try {
      if (currentUser?.id) {
        // Send message to host with dynamic host profile resolution in api.sendMessage
        await api.sendMessage({
          sender_id: currentUser.id,
          receiver_id: 'host', // api.sendMessage automatically resolves real host UUID
          booking_id: activeBooking?.id || null,
          message: `[Concierge Inquiry: ${conciergeSubject || 'Guest Itinerary'}]\n${conciergeMessage.trim()}`
        });
      }
      success('Your inquiry has been sent to Host Bervely Pangwana. She will respond shortly via Concierge Chat.');
      setConciergeModalOpen(false);
      setConciergeMessage('');
      setConciergeSubject('');
    } catch (err: any) {
      error(err.message || 'Failed to send concierge message. Please try again.');
    } finally {
      setSendingConcierge(false);
    }
  };

  const openConciergeForAttraction = (attraction: LocalRecommendation) => {
    setSelectedAttraction(attraction);
    setConciergeSubject(`Transport & Visit Assistance: ${attraction.name}`);
    setConciergeMessage(`Hello Bervely, I am interested in visiting ${attraction.name} (${attraction.distance} away). Could you please provide advice on the best departure time, vehicle transport options from The Haven, and admission booking?`);
    setConciergeModalOpen(true);
  };

  const openSpecialRequestModal = (type: string) => {
    setConciergeSubject(type);
    if (type === 'Early Check-in Request') {
      setConciergeMessage(`Hello Bervely, regarding my reservation (Room ${activeBooking?.room?.room_number || ''}), I would like to request an early arrival check-in if possible.`);
    } else if (type === 'Late Check-out Request') {
      setConciergeMessage(`Hello Bervely, I would like to inquire about extending my check-out time on ${activeBooking?.check_out_date || 'my departure day'}.`);
    } else if (type.includes('Transport') || type === 'Airport & City Transfer') {
      setConciergeMessage(`Hello Bervely, could you assist me in coordinating paid transport transfer assistance between The Haven Guest House and Gweru / transit destination?`);
    } else {
      setConciergeMessage(`Hello Bervely, I have a special request for my stay at The Haven: `);
    }
    setConciergeModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. PERSONALIZED WELCOME HERO BANNER */}
      <div className="relative rounded-[32px] overflow-hidden bg-[#2C2C2C] text-white border border-[#3E3E3E] shadow-lg">
        {/* Subtle background image overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <img
            src={PROPERTY_IMAGES.hero}
            alt="The Haven Grounds"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative z-10 p-6 sm:p-10 lg:p-12">
          {/* Top meta strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10 text-xs">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#E5D7C7]">
              <GreetingIcon className="w-4 h-4 text-[#C4A484]" />
              <span className="font-bold tracking-wider uppercase text-[10px]">{greeting.timeLabel}</span>
              <span className="w-1 h-1 rounded-full bg-[#C4A484]"></span>
              <span className="text-[#FDFCF9]">24°C • Woodlands Sanctuary</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#E5E2D9]/70 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C4A484]" />
                3669 Woodlands Phase 2, Gweru
              </span>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/30"></span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Solar Backup Active
              </span>
            </div>
          </div>

          {/* Main Welcome Message */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#C4A484]">
                <Sparkles className="w-3.5 h-3.5" />
                Personalized Guest Sanctuary Portal
              </div>
              <h1 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl font-normal text-[#FDFCF9] leading-tight">
                {greeting.text}, {currentUser?.full_name || 'Valued Guest'}
              </h1>
              <p className="text-xs sm:text-sm text-[#E5E2D9]/90 max-w-2xl leading-relaxed">
                Welcome to your peaceful haven in the heart of Midlands Zimbabwe. We have curated your daily itinerary, dining arrangements, and the finest local safari and cultural attractions to make your stay unforgettable.
              </p>

              {/* Host Bervely note snippet */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 max-w-2xl mt-4">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                  alt="Host Bervely Pangwana"
                  className="w-10 h-10 rounded-full object-cover border border-[#C4A484] shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="text-xs">
                  <div className="font-bold text-[#FDFCF9] flex items-center gap-2">
                    <span>Bervely Pangwana</span>
                    <span className="text-[9px] font-normal uppercase tracking-widest text-[#C4A484] bg-white/10 px-2 py-0.5 rounded-full">
                      Resident Host
                    </span>
                  </div>
                  <p className="text-[#E5E2D9]/80 italic mt-0.5 text-[11px] leading-relaxed">
                    "Our kitchen is prepared for your fresh farm breakfast, and the gardens are in bloom. Let me know if you need private transport arranged for Antelope Park or the Ruins."
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Cards / Stay Snapshot */}
            <div className="lg:col-span-4 space-y-3">
              {activeBooking ? (
                <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C4A484]">
                      Current Stay Status
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      activeBooking.booking_status === 'checked_in'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-[#C4A484]/20 text-[#E5D7C7] border border-[#C4A484]/40'
                    }`}>
                      {activeBooking.booking_status === 'checked_in' ? 'Checked In' : 'Confirmed'}
                    </span>
                  </div>

                  <div>
                    <div className="font-serif italic text-xl text-white">
                      Room {activeBooking.room?.room_number || activeBooking.room_id}
                    </div>
                    <div className="text-xs text-[#E5E2D9]/80">
                      {activeBooking.room?.room_type || 'Suites Sanctuary'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/10">
                    <div>
                      <div className="text-[9px] text-[#E5E2D9]/60 uppercase font-bold">Check-in</div>
                      <div className="font-semibold text-[#FDFCF9]">{activeBooking.check_in_date}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#E5E2D9]/60 uppercase font-bold">Check-out</div>
                      <div className="font-semibold text-[#FDFCF9]">{activeBooking.check_out_date}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setActiveTab('itinerary')}
                      className="flex-1 py-2 px-3 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>View Itinerary</span>
                    </button>
                    <button
                      onClick={() => onNavigate('guest-messages')}
                      className="py-2 px-3 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                      title="Direct chat with host"
                    >
                      <MessageSquare className="w-3 h-3 text-[#C4A484]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-center space-y-3">
                  <BedDouble className="w-8 h-8 text-[#C4A484] mx-auto" />
                  <div className="font-serif italic text-lg text-white">Plan Your Next Sanctuary Stay</div>
                  <p className="text-xs text-[#E5E2D9]/80">
                    Experience calm luxury and local Zimbabwean hospitality in Gweru.
                  </p>
                  <button
                    onClick={() => onNavigate('rooms')}
                    className="w-full py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                    Browse Suites & Reserve
                  </button>
                </div>
              )}

              {/* Quick Contact & Room Service */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onNavigate('guest-room-service')}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#C4A484]/20 flex items-center justify-center text-[#C4A484] shrink-0">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white">Room Services</div>
                    <div className="text-[10px] text-[#E5E2D9]/70">Food & Laundry</div>
                  </div>
                </button>

                <button
                  onClick={() => openSpecialRequestModal('Transport Assistance (Paid Service)')}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white">Transfers</div>
                    <div className="text-[10px] text-[#E5E2D9]/70">Paid Service</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="bg-[#222222] px-6 sm:px-10 py-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'welcome'
                  ? 'bg-[#FDFCF9] text-[#2C2C2C] shadow-sm'
                  : 'text-[#E5E2D9]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C4A484]" />
              <span>Welcome Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'itinerary'
                  ? 'bg-[#FDFCF9] text-[#2C2C2C] shadow-sm'
                  : 'text-[#E5E2D9]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Upcoming Itinerary</span>
              {activeBooking && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'recommendations'
                  ? 'bg-[#FDFCF9] text-[#2C2C2C] shadow-sm'
                  : 'text-[#E5E2D9]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#C4A484]" />
              <span>Gweru & Midlands Area Guide</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-[#C4A484]">
                {LOCAL_RECOMMENDATIONS.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openSpecialRequestModal('Special Sanctuary Request')}
              className="text-xs text-[#C4A484] hover:text-[#E5D7C7] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Concierge Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TAB: WELCOME OVERVIEW (Default View) */}
      {activeTab === 'welcome' && (
        <div className="space-y-8">
          {/* Quick Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Daily Farm-to-Table Dining */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5E2D9] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#5A5A40]/40 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
                  <Coffee className="w-5 h-5" />
                </div>
                <h3 className="font-serif italic text-xl text-[#2C2C2C] font-medium">
                  Room Services & Breakfast
                </h3>
                <p className="text-xs text-[#8C887D] leading-relaxed">
                  Complimentary full breakfast served daily from 07:00 – 10:00. Room service meals, snacks, and comprehensive laundry valet delivered directly to your suite.
                </p>
              </div>
              <button
                onClick={() => onNavigate('guest-room-service')}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5A5A40] hover:text-[#484833] pt-2 cursor-pointer"
              >
                <span>Explore Room Services</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Top Midlands Safari: Antelope Park */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5E2D9] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#C4A484]/60 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-[#C4A484]/15 flex items-center justify-center text-[#C4A484]">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-serif italic text-xl text-[#2C2C2C] font-medium">
                  Antelope Park Safari
                </h3>
                <p className="text-xs text-[#8C887D] leading-relaxed">
                  Only 14 km (18 mins) from The Haven. Walk with lions, encounter majestic African elephants, embark on horseback safari trails, and enjoy picturesque sunset dam cruises.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('recommendations');
                  setSelectedCategory('Wildlife & Safari');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C4A484] hover:text-[#B08D6D] pt-2"
              >
                <span>Explore Safari Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. Sanctuary Concierge & Solar Guarantee */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5E2D9] shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-600/40 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-serif italic text-xl text-[#2C2C2C] font-medium">
                  24/7 Solar & Water Security
                </h3>
                <p className="text-xs text-[#8C887D] leading-relaxed">
                  Enjoy seamless high-speed fiber Wi-Fi, uninterrupted lighting, borehole-purified hot water showers, secure gated premises, and dedicated concierge host support throughout your stay.
                </p>
              </div>
              <button
                onClick={() => onNavigate('guest-messages')}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-800 pt-2"
              >
                <span>Chat Concierge</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* HIGHLIGHTED ITINERARY PREVIEW STRIP */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E2D9] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F5F2ED]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
                  Your Sanctuary Timeline
                </div>
                <h2 className="font-serif italic text-2xl text-[#2C2C2C] font-medium">
                  Personalized Stay Schedule
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('itinerary')}
                className="px-5 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
              >
                <span>View Full Day-by-Day Itinerary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visual Schedule Timeline Preview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-[#FDFCF9] border border-[#E5E2D9] relative space-y-2">
                <div className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider flex items-center justify-between">
                  <span>07:00 – 10:00</span>
                  <Coffee className="w-3.5 h-3.5 text-[#C4A484]" />
                </div>
                <div className="font-serif italic text-base font-semibold text-[#2C2C2C]">
                  Farm Fresh Breakfast
                </div>
                <p className="text-xs text-[#8C887D] leading-relaxed">
                  Sadza, fresh eggs, honey pancakes, and Midlands teas on the terrace.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-[#FDFCF9] border border-[#E5E2D9] relative space-y-2">
                <div className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider flex items-center justify-between">
                  <span>10:30 – 14:30</span>
                  <Compass className="w-3.5 h-3.5 text-[#C4A484]" />
                </div>
                <div className="font-serif italic text-base font-semibold text-[#2C2C2C]">
                  Midlands Sightseeing
                </div>
                <p className="text-xs text-[#8C887D] leading-relaxed">
                  Safari at Antelope Park or waterside relaxation at Ngamu Dam Resort.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-[#FDFCF9] border border-[#E5E2D9] relative space-y-2">
                <div className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider flex items-center justify-between">
                  <span>16:00 – 17:30</span>
                  <Sun className="w-3.5 h-3.5 text-[#C4A484]" />
                </div>
                <div className="font-serif italic text-base font-semibold text-[#2C2C2C]">
                  Afternoon High Tea
                </div>
                <p className="text-xs text-[#8C887D] leading-relaxed">
                  Complimentary tea & pastries in the manicured Woodlands garden.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-2xl bg-[#FDFCF9] border border-[#E5E2D9] relative space-y-2">
                <div className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider flex items-center justify-between">
                  <span>18:30 – 21:00</span>
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#C4A484]" />
                </div>
                <div className="font-serif italic text-base font-semibold text-[#2C2C2C]">
                  Chef Dinner Service
                </div>
                <p className="text-xs text-[#8C887D] leading-relaxed">
                  Flame braai, beef stew, or light supper delivered to your room door.
                </p>
              </div>
            </div>
          </div>

          {/* TOP 3 LOCAL RECOMMENDATIONS PREVIEW */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
                  Midlands Highlights
                </div>
                <h2 className="font-serif italic text-2xl text-[#2C2C2C] font-medium">
                  Curated Local Experiences
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('recommendations')}
                className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] hover:text-[#484833] inline-flex items-center gap-1.5"
              >
                <span>View All {LOCAL_RECOMMENDATIONS.length} Recommendations</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {LOCAL_RECOMMENDATIONS.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/10] bg-[#2C2C2C] overflow-hidden">
                      <ImageWithFallback
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#2C2C2C]/90 text-[#E5D7C7] backdrop-blur-md border border-white/10">
                          {item.category}
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider bg-black/70 text-white backdrop-blur-md flex items-center gap-1">
                          <Car className="w-3 h-3 text-[#C4A484]" />
                          {item.distance} ({item.driveTime})
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{item.rating}</span>
                          <span className="text-[#8C887D] font-normal text-[10px]">({item.reviewCount})</span>
                        </div>
                        <span className="text-[10px] text-[#8C887D]">{item.admission}</span>
                      </div>

                      <h3 className="font-serif italic text-lg font-medium text-[#2C2C2C] line-clamp-1">
                        {item.name}
                      </h3>

                      <p className="text-xs text-[#8C887D] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="p-3 rounded-xl bg-[#FDFCF9] border border-[#E5E2D9] text-[11px] text-[#5A5A40] italic">
                        <strong>Host Tip:</strong> "{item.hostTip}"
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-[#F5F2ED] mt-2 flex items-center justify-between">
                    <button
                      onClick={() => openConciergeForAttraction(item)}
                      className="w-full py-2 rounded-full bg-[#F5F2ED] hover:bg-[#E5E2D9] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider transition-colors text-center flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Car className="w-3.5 h-3.5 text-[#5A5A40]" />
                      <span>Arrange Transport & Guide</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: UPCOMING ITINERARY (Full Detailed Breakdown) */}
      {activeTab === 'itinerary' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Active Booking Focus Card */}
          {activeBooking && (
            <div className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-4 relative aspect-[16/11] lg:aspect-auto bg-[#2C2C2C]">
                  <ImageWithFallback
                    src={activeBooking.room?.image_url}
                    roomNumber={activeBooking.room?.room_number}
                    roomType={activeBooking.room?.room_type}
                    alt={activeBooking.room?.room_type}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2C2C2C]/90 text-[#E5D7C7] backdrop-blur-md border border-white/10">
                      Room {activeBooking.room?.room_number || activeBooking.room_id} • {activeBooking.room?.room_type}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F5F2ED]">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484]">
                          Primary Reservation
                        </div>
                        <h2 className="font-serif italic text-2xl text-[#2C2C2C] font-medium">
                          {activeBooking.room?.room_type || 'Guest Suite'} Sanctuary Stay
                        </h2>
                      </div>
                      <span className="text-xs font-mono px-3 py-1 bg-[#F5F2ED] rounded-full text-[#8C887D]">
                        Ref #{activeBooking.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-[#F5F2ED]">
                      <div>
                        <div className="text-[10px] font-bold text-[#8C887D] uppercase">Check-in Date</div>
                        <div className="text-xs font-semibold text-[#2C2C2C] mt-0.5">{activeBooking.check_in_date}</div>
                        <div className="text-[10px] text-[#5A5A40]">From 14:00</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#8C887D] uppercase">Check-out Date</div>
                        <div className="text-xs font-semibold text-[#2C2C2C] mt-0.5">{activeBooking.check_out_date}</div>
                        <div className="text-[10px] text-[#5A5A40]">Until 10:00</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#8C887D] uppercase">Total Rate</div>
                        <div className="text-xs font-semibold text-[#2C2C2C] mt-0.5">${activeBooking.total_amount}</div>
                        <div className="text-[10px] text-emerald-600 font-bold capitalize">● {activeBooking.payment_status}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#8C887D] uppercase">Guests</div>
                        <div className="text-xs font-semibold text-[#2C2C2C] mt-0.5">{activeBooking.number_of_guests || 1} Guests</div>
                        <div className="text-[10px] text-[#8C887D]">Private Suite</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Housekeeping / Room Cleaning Request Button */}
                      {activeBooking?.booking_status !== 'checked_in' ? (
                        <button
                          onClick={() => error('Room cleaning requests are available after check-in. Please check in before requesting housekeeping.')}
                          className="px-4 py-2 rounded-full bg-[#F5F2ED] text-[#8C887D] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer border border-[#E5E2D9]"
                          title="Available after check-in"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#8C887D]" />
                          <span>Cleaning (After Check-in)</span>
                        </button>
                      ) : activeRoom?.cleaning_status === 'dirty' ? (
                        <button
                          onClick={() => success('Housekeeping has already been notified and will sanitize your room shortly.')}
                          className="px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Cleaning request is pending"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Cleaning Requested</span>
                        </button>
                      ) : activeRoom?.cleaning_status === 'in_progress' ? (
                        <button
                          onClick={() => success('Housekeeping is currently in progress for your suite.')}
                          className="px-4 py-2 rounded-full bg-[#F5F2ED] border border-[#5A5A40] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Housekeeping is currently active"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#5A5A40] animate-ping" />
                          <span>Cleaning In Progress</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setCleaningModalOpen(true)}
                          className="px-4 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#E5D7C7]" />
                          <span>Request Room Cleaning</span>
                        </button>
                      )}

                      <button
                        onClick={() => openSpecialRequestModal('Early Check-in Request')}
                        className="px-4 py-2 rounded-full bg-[#F5F2ED] hover:bg-[#E5E2D9] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Request Early Check-in</span>
                      </button>
                      <button
                        onClick={() => openSpecialRequestModal('Late Check-out Request')}
                        className="px-4 py-2 rounded-full bg-[#F5F2ED] hover:bg-[#E5E2D9] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Request Late Check-out</span>
                      </button>
                      {onOpenModifyModal && activeBooking.booking_status !== 'checked_in' && activeBooking.booking_status !== 'checked_out' && activeBooking.booking_status !== 'cancelled' && (
                        <button
                          onClick={() => onOpenModifyModal(activeBooking)}
                          className="px-4 py-2 rounded-full border border-[#E5E2D9] hover:bg-[#FDFCF9] text-[#2C2C2C] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#5A5A40]" />
                          <span>Modify Dates</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onSelectBookingDetail && (
                        <button
                          onClick={() => onSelectBookingDetail(activeBooking)}
                          className="px-4 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Voucher & Details</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DAY-BY-DAY ITINERARY TIMELINE */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E2D9] shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#F5F2ED]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
                  Chronological Stay Flow
                </div>
                <h2 className="font-serif italic text-2xl text-[#2C2C2C] font-medium">
                  Detailed Itinerary & Activity Planner
                </h2>
              </div>
              <button
                onClick={() => openSpecialRequestModal('Custom Day Trip & Excursion Arrangement')}
                className="px-4 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Customize My Schedule</span>
              </button>
            </div>

            {/* Timeline cards */}
            <div className="space-y-6">
              {/* Phase 1: Arrival & Welcome */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-xs">
                  Day 1
                </div>
                <div className="flex-1 bg-[#FDFCF9] rounded-2xl p-5 border border-[#E5E2D9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
                      Arrival & Sanctuary Welcome
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E5E2D9]/60 text-[#2C2C2C] font-semibold">
                      Check-in Phase
                    </span>
                  </div>
                  <h3 className="font-serif italic text-lg text-[#2C2C2C]">
                    Check-in, Garden Welcome Drink & Suite Orientation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#8C887D] pt-2">
                    <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
                      <div className="font-bold text-[#2C2C2C]">14:00 - 15:00</div>
                      <div>Fast-track registration with Host Bervely and welcome baobab juice.</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
                      <div className="font-bold text-[#2C2C2C]">15:30 - 17:00</div>
                      <div>Complimentary afternoon Tanganda tea & scones in the garden.</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
                      <div className="font-bold text-[#2C2C2C]">19:00 - 21:00</div>
                      <div>Traditional Zimbabwean Welcome Dinner (Room service or dining terrace).</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phase 2: Daily Rhythm & Morning Breakfast */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#C4A484] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-xs">
                  Daily
                </div>
                <div className="flex-1 bg-[#FDFCF9] rounded-2xl p-5 border border-[#E5E2D9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C4A484]">
                      Morning Wellbeing & Sustenance
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E5E2D9]/60 text-[#2C2C2C] font-semibold">
                      Included with Stay
                    </span>
                  </div>
                  <h3 className="font-serif italic text-lg text-[#2C2C2C]">
                    Farm-to-Table Breakfast & Housekeeping Refresh
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#8C887D] pt-2">
                    <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
                      <div className="font-bold text-[#2C2C2C]">07:00 – 10:00 Breakfast</div>
                      <div>Full English, eggs to order, sadza & relish, seasonal fruit, hot roast coffee.</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
                      <div className="font-bold text-[#2C2C2C]">09:30 Housekeeping</div>
                      <div>Discreet suite tidy, fresh towels, sanitized surfaces by Chipo Sithole.</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
                      <div className="font-bold text-[#2C2C2C]">Solar Power & High-Speed Net</div>
                      <div>Seamless 24/7 power backup for business, remote work, and streaming.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phase 3: Midlands Excursions & Safari */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#2C2C2C] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-xs">
                  Day 2+
                </div>
                <div className="flex-1 bg-[#FDFCF9] rounded-2xl p-5 border border-[#E5E2D9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                      Midlands Explorations
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      Recommended
                    </span>
                  </div>
                  <h3 className="font-serif italic text-lg text-[#2C2C2C]">
                    Antelope Park Safari & Ngamu Dam Waterside Day Tour
                  </h3>
                  <p className="text-xs text-[#8C887D] leading-relaxed">
                    Our concierge coordinates direct gate passes and reliable private vehicle transfers for safari game drives, scenic lakeside excursions to Ngamu Dam Resort, or golf tee times.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('recommendations');
                        setSelectedCategory('Nature & Scenery');
                      }}
                      className="px-4 py-1.5 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#F5F2ED] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Compass className="w-3 h-3 text-[#C4A484]" />
                      <span>Explore Ngamu Dam Excursions</span>
                    </button>
                    <button
                      onClick={() => openSpecialRequestModal('Packed Picnic Hamper for Day Trip')}
                      className="px-4 py-1.5 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#F5F2ED] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <UtensilsCrossed className="w-3 h-3 text-[#5A5A40]" />
                      <span>Order Packed Picnic Hamper</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Phase 4: Departure & Express Check-out */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-xs">
                  End
                </div>
                <div className="flex-1 bg-[#FDFCF9] rounded-2xl p-5 border border-[#E5E2D9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
                      Farewell & Departure
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E5E2D9]/60 text-[#2C2C2C] font-semibold">
                      Until 10:00
                    </span>
                  </div>
                  <h3 className="font-serif italic text-lg text-[#2C2C2C]">
                    Complimentary Baggage Storage & Transport Assistance (Paid Service)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#8C887D] pt-2">
                    <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
                      <div className="font-bold text-[#2C2C2C]">10:00 Standard Checkout</div>
                      <div>Key handover, automated folio receipt sent to your email, Paynow balance reconciliation.</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E5E2D9]">
                      <div className="font-bold text-[#2C2C2C]">Transport Assistance & Luggage Hold</div>
                      <div>Safe luggage storage and coordination of paid private transport transfers for your onward journey.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB: LOCAL AREA & SAFARI RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header & Controls */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E2D9] shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
                  Curated by Host Bervely
                </div>
                <h2 className="font-serif italic text-2xl sm:text-3xl text-[#2C2C2C] font-medium">
                  Gweru & Midlands Area Guide
                </h2>
                <p className="text-xs text-[#8C887D] mt-1 max-w-xl">
                  Hand-picked wildlife safaris, national heritage monuments, craft markets, and dining destinations within easy reach of The Haven Guest House.
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-[#8C887D] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search safari, ruins, dining..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-full text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-t border-[#F5F2ED] pt-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#5A5A40] text-white shadow-xs'
                      : 'bg-[#F5F2ED] text-[#8C887D] hover:text-[#2C2C2C] hover:bg-[#E5E2D9]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecommendations.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-[#2C2C2C] overflow-hidden">
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#2C2C2C]/90 text-[#E5D7C7] backdrop-blur-md border border-white/10">
                        {item.category}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider bg-black/70 text-white backdrop-blur-md flex items-center gap-1">
                        <Car className="w-3 h-3 text-[#C4A484]" />
                        {item.distance} ({item.driveTime})
                      </span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{item.rating}</span>
                        <span className="text-[#8C887D] font-normal text-[10px]">({item.reviewCount} reviews)</span>
                      </div>
                      <span className="text-[10px] text-[#8C887D] font-medium">{item.admission}</span>
                    </div>

                    <h3 className="font-serif italic text-xl font-medium text-[#2C2C2C]">
                      {item.name}
                    </h3>

                    <p className="text-xs text-[#8C887D] leading-relaxed">
                      {item.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-0.5 rounded-full text-[9px] font-medium bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2D9]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Host Insider Tip */}
                    <div className="p-3.5 rounded-2xl bg-[#FDFCF9] border border-[#E5E2D9] text-[11px] text-[#5A5A40] space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#C4A484]">
                        <Sparkles className="w-3 h-3" />
                        <span>Host Bervely's Insider Advice</span>
                      </div>
                      <p className="italic leading-relaxed">"{item.hostTip}"</p>
                    </div>

                    <div className="text-[10px] text-[#8C887D] flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3 text-[#5A5A40]" />
                      <span>Best visited: <strong>{item.bestTime}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 pt-0 border-t border-[#F5F2ED] mt-3">
                  <button
                    onClick={() => openConciergeForAttraction(item)}
                    className="w-full py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Car className="w-3.5 h-3.5 text-[#C4A484]" />
                    <span>Coordinate Visit & Transport</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* LOCAL LOGISTICS & GWERU TRAVEL ADVISORY CARD */}
          <div className="bg-[#2C2C2C] text-white rounded-3xl p-6 sm:p-8 border border-[#3E3E3E] space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#C4A484]">
              <Info className="w-3.5 h-3.5" />
              <span>Gweru & Midlands Traveler Guidance</span>
            </div>
            <h3 className="font-serif italic text-2xl text-[#FDFCF9]">
              Getting Around & Essential Midlands Travel Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#E5E2D9]/80 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Car className="w-3.5 h-3.5 text-[#C4A484]" />
                  <span>Private Transport & Taxis</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  We work with trusted, vetted private drivers in Gweru. Ask reception 30 minutes in advance for airport runs, CBD shopping, or safari transfers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-[#C4A484]" />
                  <span>Payments & Currency</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  USD Cash, Paynow Zimbabwe (EcoCash, OneMoney, InnBucks), and Visa/Mastercard are accepted. Small USD notes are recommended for local curio markets.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Safety & Woodlands Peace</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Woodlands Phase 2 is an upscale, quiet residential neighborhood. The Haven features 24-hour perimeter security and safe gated on-site parking.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONCIERGE / ATTRACTION INQUIRY MODAL */}
      {conciergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FDFCF9] rounded-[28px] max-w-lg w-full overflow-hidden border border-[#E5E2D9] shadow-2xl space-y-4 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484]">
                  Sanctuary Concierge Service
                </div>
                <h3 className="font-serif italic text-2xl font-medium text-[#2C2C2C]">
                  {conciergeSubject || 'Inquire with Host Bervely'}
                </h3>
              </div>
              <button
                onClick={() => setConciergeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F5F2ED] hover:bg-[#E5E2D9] text-[#2C2C2C] flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendConciergeRequest} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  required
                  value={conciergeSubject}
                  onChange={(e) => setConciergeSubject(e.target.value)}
                  placeholder="e.g. Antelope Park Transfer, Early Check-in"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                  Your Message to Host Bervely Pangwana
                </label>
                <textarea
                  rows={4}
                  required
                  value={conciergeMessage}
                  onChange={(e) => setConciergeMessage(e.target.value)}
                  placeholder="Tell Bervely how we can customize your stay, arrange transport, or prepare for your arrival..."
                  className="w-full p-3.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div className="p-3 bg-[#F5F2ED] rounded-xl text-[11px] text-[#5A5A40] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#5A5A40] mt-0.5" />
                <span>
                  Host Bervely receives your message directly in the sanctuary dashboard and will respond via the Concierge Chat channel.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConciergeModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#8C887D] hover:text-[#2C2C2C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingConcierge}
                  className="px-6 py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {sendingConcierge ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to Host</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOM CLEANING REQUEST CONFIRMATION MODAL */}
      {cleaningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FDFCF9] rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#E5E2D9] shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F2ED] border border-[#E5E2D9] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-[#5A5A40]" />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484]">
                  Housekeeping Request
                </div>
                <h3 className="font-serif italic text-2xl font-normal text-[#2C2C2C]">
                  Request Suite Sanitization?
                </h3>
                <p className="text-xs text-[#8C887D] leading-relaxed">
                  Your suite (Room {activeRoom?.room_number || activeBooking?.room_id}) will be flagged for immediate housekeeping and turn-down service.
                </p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E5E2D9] space-y-2 text-xs">
              <div className="flex justify-between text-[#8C887D]">
                <span>Room Number:</span>
                <span className="font-semibold text-[#2C2C2C]">Room {activeRoom?.room_number || activeBooking?.room_id}</span>
              </div>
              <div className="flex justify-between text-[#8C887D]">
                <span>Suite Type:</span>
                <span className="font-semibold text-[#2C2C2C]">{activeRoom?.room_type || 'Sanctuary Suite'}</span>
              </div>
              <div className="flex justify-between text-[#8C887D]">
                <span>Standard Turnaround:</span>
                <span className="font-semibold text-[#5A5A40]">15 - 30 minutes</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCleaningModalOpen(false)}
                disabled={requestingCleaning}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#8C887D] hover:text-[#2C2C2C] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCleaningRequest}
                disabled={requestingCleaning}
                className="px-6 py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {requestingCleaning ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Confirm Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
