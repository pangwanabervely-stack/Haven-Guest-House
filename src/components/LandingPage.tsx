import React from 'react';
import {
  BedDouble,
  Users,
  Wifi,
  Coffee,
  Sparkles,
  MapPin,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Star,
  Check,
  Phone,
  Clock,
  HeartHandshake
} from 'lucide-react';
import { Room, FeaturedOffer } from '../types';
import { FeaturedOffers } from './FeaturedOffers';

interface LandingPageProps {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
  onExploreRooms: () => void;
  onBookDirect: () => void;
  onClaimOffer?: (offer: FeaturedOffer, room?: Room) => void;
  onCleaningStaffLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  rooms,
  onSelectRoom,
  onExploreRooms,
  onBookDirect,
  onClaimOffer,
  onCleaningStaffLogin
}) => {
  const featuredRooms = rooms.slice(0, 3);

  const handleClaimOffer = (offer: FeaturedOffer, targetRoom?: Room) => {
    if (onClaimOffer) {
      onClaimOffer(offer, targetRoom);
    } else {
      onBookDirect();
    }
  };

  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="relative min-h-[580px] rounded-[36px] overflow-hidden mx-4 sm:mx-6 lg:mx-8 mt-4 shadow-sm border border-[#E5E2D9]">
        {/* Background Image with Dark Vignette */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85"
            alt="The Haven Guest House Estate"
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2C2C2C]/95 via-[#2C2C2C]/75 to-[#2C2C2C]/50" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-12 py-16 lg:py-24 text-white flex flex-col justify-center min-h-[580px]">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C4A484]/20 border border-[#C4A484]/40 text-[#E5D7C7] text-[10px] font-bold uppercase tracking-widest mb-6 backdrop-blur-sm self-start">
            <Sparkles className="w-3.5 h-3.5 text-[#C4A484]" />
            Warm Organic & Cultural Sanctuary
          </div>

          <h1 className="font-serif italic text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#FDFCF9] leading-[1.15] mb-6">
            A Heritage Sanctuary for Rest, Stillness & Mindful Stays.
          </h1>

          <p className="text-base sm:text-lg text-[#E5E2D9]/90 font-light leading-relaxed max-w-2xl mb-10">
            Immerse yourself in authentic warm organic hospitality. Handcrafted sourdough morning breakfasts, tranquil cedar courtyards, artisan botanical suites, and attentive care.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={onBookDirect}
              className="px-8 py-3.5 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-widest shadow-sm transition-all flex items-center gap-3 group"
            >
              <span>Reserve Your Suite</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onExploreRooms}
              className="px-7 py-3.5 rounded-full bg-[#FDFCF9]/10 hover:bg-[#FDFCF9]/20 text-[#FDFCF9] border border-[#E5E2D9]/40 text-xs font-bold uppercase tracking-widest backdrop-blur-md transition-colors"
            >
              Explore Suites
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 mt-10 border-t border-white/10 text-[#E5E2D9]">
            <div>
              <div className="text-2xl font-serif text-[#C4A484] font-medium">100%</div>
              <div className="text-xs text-[#A3A094] mt-0.5">Direct Availability</div>
            </div>
            <div>
              <div className="text-2xl font-serif text-[#C4A484] font-medium">4.9 ★</div>
              <div className="text-xs text-[#A3A094] mt-0.5">Verified Guest Rating</div>
            </div>
            <div>
              <div className="text-2xl font-serif text-[#C4A484] font-medium">24/7</div>
              <div className="text-xs text-[#A3A094] mt-0.5">Concierge Support</div>
            </div>
            <div>
              <div className="text-2xl font-serif text-[#C4A484] font-medium">Artisan</div>
              <div className="text-xs text-[#A3A094] mt-0.5">Farm-to-Table Dining</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED OFFERS BANNER & CURATED PACKAGES */}
      <FeaturedOffers
        rooms={rooms}
        onClaimOffer={handleClaimOffer}
        onExploreRooms={onExploreRooms}
      />

      {/* FEATURED ROOMS SHOWCASE */}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D] mb-2">
              Curated Accommodations
            </div>
            <h2 className="font-serif italic text-3xl sm:text-4xl text-[#5A5A40] font-medium">
              Featured Suites & Chambers
            </h2>
          </div>
          <button
            onClick={onExploreRooms}
            className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] hover:text-[#2C2C2C] flex items-center gap-1.5 group self-start md:self-auto"
          >
            <span>View All {rooms.length} Suites</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#E5E2D9] shadow-xs hover:shadow-sm hover:border-[#5A5A40] transition-all flex flex-col group"
            >
              {/* Image with Room badge */}
              <div className="relative aspect-[16/10] overflow-hidden bg-[#F5F2ED]">
                <img
                  src={room.image_url}
                  alt={room.description}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-[#2C2C2C]/85 backdrop-blur-md text-[#E5D7C7] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">
                  Room {room.room_number} • {room.room_type}
                </div>
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-[#2C2C2C] px-3.5 py-1 rounded-full text-xs font-bold shadow-xs border border-[#E5E2D9]">
                  ${room.price_per_night} <span className="text-[10px] font-normal text-[#8C887D]">/ night</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-xs text-[#8C887D] mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#8C887D]" />
                      Up to {room.capacity} Guests
                    </span>
                    <span>•</span>
                    <span className="capitalize">{room.bed_type || 'King Bed'}</span>
                  </div>

                  <p className="text-sm text-[#2C2C2C]/80 leading-relaxed line-clamp-2 mb-4">
                    {room.description}
                  </p>

                  {/* Amenities Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {room.amenities.slice(0, 3).map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2D9]"
                      >
                        {amenity}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F2ED] text-[#8C887D]">
                        +{room.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F5F2ED] flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    room.room_status === 'available' ? 'text-[#5A5A40]' : 'text-[#C4A484]'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      room.room_status === 'available' ? 'bg-[#5A5A40]' : 'bg-[#C4A484]'
                    }`} />
                    {room.room_status === 'available' ? 'Available' : 'Occupied'}
                  </span>

                  <button
                    onClick={() => onSelectRoom(room)}
                    className="px-4 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest transition-colors shadow-2xs"
                  >
                    View & Reserve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOSPITALITY & AMENITIES GRID */}
      <section className="bg-[#F5F2ED] py-16 px-4 sm:px-6 lg:px-8 border-y border-[#E5E2D9]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D] mb-2">
              The Haven Experience
            </div>
            <h2 className="font-serif italic text-3xl sm:text-4xl text-[#5A5A40] font-medium mb-4">
              Carefully Crafted for Unhurried Stays
            </h2>
            <p className="text-[#8C887D] text-sm leading-relaxed">
              We have eliminated the hassle of paper slips and friction. Enjoy instant digital service, immaculate housekeeping, and comforting organic hospitality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-[#E5E2D9] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F2ED] text-[#5A5A40] flex items-center justify-center mb-6 border border-[#E5E2D9]">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif italic text-[#2C2C2C] mb-2">
                Artisan Morning Breakfast
              </h3>
              <p className="text-xs text-[#8C887D] leading-relaxed">
                Warm rustic sourdough bread, locally roasted pour-over espresso, freshly pressed botanical juices, and seasonal harvest delicacies.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#E5E2D9] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F2ED] text-[#5A5A40] flex items-center justify-center mb-6 border border-[#E5E2D9]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif italic text-[#2C2C2C] mb-2">
                Pristine Sanitization Protocol
              </h3>
              <p className="text-xs text-[#8C887D] leading-relaxed">
                Every suite undergoes thorough hospital-grade botanical cleansing, pure linen refreshing, and inspection before your arrival.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#E5E2D9] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F2ED] text-[#5A5A40] flex items-center justify-center mb-6 border border-[#E5E2D9]">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif italic text-[#2C2C2C] mb-2">
                Digital Room Service & Chat
              </h3>
              <p className="text-xs text-[#8C887D] leading-relaxed">
                Order extra linen, hot beverages, or fresh breakfast directly from your guest portal. Message host Bervely directly in real-time.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#E5E2D9] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F2ED] text-[#5A5A40] flex items-center justify-center mb-6 border border-[#E5E2D9]">
                <Wifi className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif italic text-[#2C2C2C] mb-2">
                High-Speed Wi-Fi & Solar Backup
              </h3>
              <p className="text-xs text-[#8C887D] leading-relaxed">
                Reliable high-speed Wi-Fi in every room with 24/7 solar inverter backup and borehole water security for an uninterrupted comfortable stay.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#E5E2D9] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F2ED] text-[#5A5A40] flex items-center justify-center mb-6 border border-[#E5E2D9]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif italic text-[#2C2C2C] mb-2">
                Double-Booking Protection
              </h3>
              <p className="text-xs text-[#8C887D] leading-relaxed">
                Our transactional reservation database guarantees that reserved dates are locked instantly with zero risk of scheduling conflicts.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#E5E2D9] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F2ED] text-[#5A5A40] flex items-center justify-center mb-6 border border-[#E5E2D9]">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif italic text-[#2C2C2C] mb-2">
                Peaceful Woodlands 2 Setting
              </h3>
              <p className="text-xs text-[#8C887D] leading-relaxed">
                Conveniently located at 3669 Woodlands 2 in Gweru, offering a serene garden ambiance, gated security, and warm Zimbabwean hospitality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT STORY SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="aspect-[4/3] rounded-[36px] overflow-hidden shadow-sm border border-[#E5E2D9]">
              <img
                src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"
                alt="The Haven Lounge"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-sm border border-[#E5E2D9] max-w-xs hidden sm:block">
              <div className="flex items-center gap-1 mb-2 text-[#C4A484]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#C4A484]" />
                ))}
              </div>
              <p className="text-xs text-[#2C2C2C] italic">
                "The tranquil garden setting, solar reliability, and warm hospitality made our stay in Gweru exceptionally comfortable."
              </p>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mt-2">
                — Tawanda & Ruvimbo M.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
              Our Hospitality Heritage
            </div>
            <h2 className="font-serif italic text-3xl sm:text-4xl text-[#5A5A40] font-medium leading-tight">
              Quiet Comfort with Modern Convenience.
            </h2>
            <p className="text-[#8C887D] text-sm leading-relaxed">
              Located in Woodlands 2, Gweru, The Haven Guest House provides a serene and secure haven for business travelers, families, and vacationers. Our rooms are designed for comfort, natural light, and quiet relaxation.
            </p>
            <p className="text-[#8C887D] text-sm leading-relaxed">
              Equipped with solar backup power, reliable borehole water, and personalized hosting led by Bervely Pangwana, we ensure every detail of your stay is peaceful and hassle-free.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-[#2C2C2C]">
                <Check className="w-4 h-4 text-[#5A5A40] shrink-0" />
                <span>Transparent pricing with no hidden cleaning or reservation fees</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#2C2C2C]">
                <Check className="w-4 h-4 text-[#5A5A40] shrink-0" />
                <span>Solar inverter backup and borehole water security</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#2C2C2C]">
                <Check className="w-4 h-4 text-[#5A5A40] shrink-0" />
                <span>Direct communication with your host Bervely Pangwana</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onBookDirect}
                className="px-6 py-3 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-xs"
              >
                Plan Your Stay
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#2C2C2C] text-[#E5E2D9] pt-16 pb-12 border-t border-[#3E3E3E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2 space-y-4">
              <div className="font-serif italic text-2xl font-medium text-[#FDFCF9]">
                The Haven Guest House
              </div>
              <p className="text-xs text-[#A3A094] max-w-sm leading-relaxed">
                A serene guest house retreat in Gweru offering comfortable rooms, fresh breakfast, solar power backup, and attentive hosting by Bervely Pangwana.
              </p>
              <div className="flex flex-col gap-2 text-xs text-[#A3A094] pt-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C4A484] shrink-0" />
                  <span>3669 Woodlands 2, Gweru, Zimbabwe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#C4A484] shrink-0" />
                  <span>+263 772 529 212</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-4">
                Accommodations
              </div>
              <ul className="space-y-2 text-xs text-[#A3A094]">
                <li><button onClick={onExploreRooms} className="hover:text-white">Standard Garden Room</button></li>
                <li><button onClick={onExploreRooms} className="hover:text-white">Deluxe King Room</button></li>
                <li><button onClick={onExploreRooms} className="hover:text-white">Executive Balcony Suite</button></li>
                <li><button onClick={onExploreRooms} className="hover:text-white">Family Haven Suite</button></li>
              </ul>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-4">
                Property Amenities
              </div>
              <ul className="space-y-2 text-xs text-[#A3A094]">
                <li>• 24/7 Solar Backup Power</li>
                <li>• Borehole Water Security</li>
                <li>• High-Speed Wi-Fi & DStv</li>
                <li>• Fresh Morning Breakfast</li>
                <li>• Secure On-Site Parking</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#3E3E3E] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C887D] gap-4">
            <div>
              © 2026 The Haven Guest House • Host: Bervely Pangwana (Gweru, Zimbabwe)
            </div>
            <div className="flex items-center gap-4">
              {onCleaningStaffLogin && (
                <button
                  onClick={onCleaningStaffLogin}
                  className="text-[11px] text-[#A3A094] hover:text-[#E5D7C7] underline underline-offset-2 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#C4A484]" />
                  <span>Housekeeping Portal</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5A5A40]" />
                <span className="text-[#A3A094]">All Services Online</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
