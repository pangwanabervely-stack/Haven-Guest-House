import React, { useState } from 'react';
import {
  Tag,
  Sparkles,
  Percent,
  Gift,
  Calendar,
  Clock,
  ArrowRight,
  Check,
  Copy,
  HeartHandshake,
  Coffee,
  Wine,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { FeaturedOffer, Room } from '../types';
import { useToast } from './ui/Toast';
import { ImageWithFallback } from './ui/ImageWithFallback';

export const FEATURED_OFFERS: FeaturedOffer[] = [
  {
    id: 'harvest-serenity',
    title: 'Late Summer & Harvest Serenity',
    subtitle: 'Stay 3+ Nights & Save 25%',
    description: 'Immerse in the peaceful seasonal shift. Enjoy uninterrupted stillness, morning mist over the courtyard, and significant savings on multi-night retreats.',
    category: 'seasonal',
    discountType: 'percentage',
    discountValue: 25,
    discountLabel: '25% OFF',
    badge: 'MOST POPULAR',
    promoCode: 'HARVEST25',
    inclusions: [
      '25% discount on stays of 3+ consecutive nights',
      'Daily artisanal sourdough & organic fruit basket',
      'Complimentary late 1:00 PM check-out on departure',
      'Artisan botanical herbal tea welcome gift'
    ],
    validDates: 'Valid for stays through November 30, 2026',
    minNights: 3,
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    highlightPerk: 'Complimentary Late Check-out'
  },
  {
    id: 'artisan-gastronomy',
    title: 'Artisan Gastronomy & Wine Pairing',
    subtitle: 'Complimentary 4-Course Tasting Dinner',
    description: 'A culinary journey curated by our resident private chef. Includes an intimate courtyard dinner with local organic wine pairings and morning pastry deliveries.',
    category: 'package',
    discountType: 'package_perk',
    discountValue: 0,
    discountLabel: 'COMPLIMENTARY DINING',
    badge: 'CHEF\'S SPECIAL',
    promoCode: 'ARTISANPAIR',
    inclusions: [
      'Complimentary 4-course seasonal tasting dinner for two',
      'Bottle of organic coastal reserve red or white wine',
      'Handmade chocolate truffle tasting plate on arrival',
      'Daily made-to-order courtyard hot breakfast'
    ],
    validDates: 'Available on all Friday – Sunday reservations',
    minNights: 2,
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    highlightPerk: '4-Course Tasting Dinner Included'
  },
  {
    id: 'midweek-escape',
    title: 'Midweek Rejuvenation & Remote Focus',
    subtitle: 'Save $60 / Night (Sunday – Thursday)',
    description: 'Swap noise for nature. Designed for digital nomads, solo writers, and mid-week recharge seekers with dedicated fiber workstations and tranquil study spaces.',
    category: 'midweek',
    discountType: 'fixed',
    discountValue: 60,
    discountLabel: 'SAVE $60 / NIGHT',
    badge: 'MIDWEEK SPECIAL',
    promoCode: 'MIDWEEKREST',
    inclusions: [
      '$60 nightly rate deduction for Sun–Thu check-ins',
      'Dedicated Gigabit fiber Wi-Fi in suite & garden nook',
      'Unlimited locally roasted pour-over espresso',
      'Complimentary same-day garment refresh & laundry'
    ],
    validDates: 'Valid for stays checking in Sunday through Thursday',
    minNights: 2,
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    highlightPerk: 'Gigabit Workspace + Coffee Pass'
  },
  {
    id: 'heritage-romance',
    title: 'Heritage Romance & Botanical Spa',
    subtitle: 'Chilled Champagne, Lavender Spa & In-Bed Breakfast',
    description: 'Celebrate anniversaries and quiet milestones. Unwind with handcrafted botanical bath soaks, chilled artisan prosecco, and unhurried mornings.',
    category: 'romance',
    discountType: 'package_perk',
    discountValue: 0,
    discountLabel: 'ROMANCE EXTRAS INCLUDED',
    badge: 'ANNIVERSARY & COUPLES',
    promoCode: 'ROMANCEHAVEN',
    inclusions: [
      'Chilled bottle of organic coastal prosecco upon arrival',
      'Artisan lavender & eucalyptus essential bath therapy kit',
      'Fresh botanical flower arrangement in your suite',
      'Deluxe breakfast in bed served at your requested hour'
    ],
    validDates: 'Year-round reservation package',
    minNights: 2,
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    highlightPerk: 'Prosecco & Botanical Spa Basket'
  }
];

interface FeaturedOffersProps {
  rooms: Room[];
  onClaimOffer: (offer: FeaturedOffer, room?: Room) => void;
  onExploreRooms: () => void;
}

export const FeaturedOffers: React.FC<FeaturedOffersProps> = ({
  rooms,
  onClaimOffer,
  onExploreRooms
}) => {
  const { success } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredOffers = activeCategory === 'all'
    ? FEATURED_OFFERS
    : FEATURED_OFFERS.filter(o => o.category === activeCategory);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    success(`Promo code "${code}" copied! It will be automatically applied at booking.`);
    setTimeout(() => {
      setCopiedCode(null);
    }, 3000);
  };

  const heroOffer = FEATURED_OFFERS[0]; // Spotlight the main seasonal campaign

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F5F2ED] border border-[#E5E2D9] text-[#5A5A40] text-[10px] font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C4A484]" />
            Seasonal Specials & Curated Packages
          </div>
          <h2 className="font-serif italic text-3xl sm:text-4xl text-[#5A5A40] font-normal">
            Featured Offers & Special Packages
          </h2>
          <p className="text-xs sm:text-sm text-[#8C887D] max-w-2xl mt-2 leading-relaxed">
            Reserve direct with The Haven to unlock seasonal rate savings, complimentary tasting menus, romantic touches, and extended stay privileges.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none self-start md:self-auto">
          {[
            { id: 'all', label: 'All Specials' },
            { id: 'seasonal', label: 'Seasonal 25% Off' },
            { id: 'package', label: 'Dining Packages' },
            { id: 'midweek', label: 'Midweek Savings' },
            { id: 'romance', label: 'Romance & Spa' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeCategory === tab.id
                  ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-2xs'
                  : 'bg-white text-[#8C887D] border-[#E5E2D9] hover:text-[#2C2C2C] hover:bg-[#FDFCF9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SPOTLIGHT HERO OFFER BANNER */}
      {activeCategory === 'all' && (
        <div className="relative rounded-[36px] overflow-hidden border border-[#E5E2D9] bg-[#2C2C2C] text-[#FDFCF9] shadow-sm">
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0">
            <ImageWithFallback
              src={heroOffer.imageUrl}
              alt={heroOffer.title}
              className="w-full h-full object-cover object-center opacity-30 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#2C2C2C] via-[#2C2C2C]/90 to-transparent" />
          </div>

          <div className="relative z-10 p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Offer Details (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-[#C4A484] text-[#2C2C2C] text-[10px] font-bold uppercase tracking-widest shadow-2xs">
                  {heroOffer.badge}
                </span>
                <span className="px-3.5 py-1 rounded-full bg-white/10 text-[#E5D7C7] text-[10px] font-bold uppercase tracking-widest border border-white/15 backdrop-blur-md">
                  {heroOffer.discountLabel}
                </span>
                <span className="text-xs text-[#A3A094] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C4A484]" />
                  {heroOffer.validDates}
                </span>
              </div>

              <div>
                <h3 className="font-serif italic text-3xl sm:text-4xl text-[#FDFCF9] font-normal leading-tight">
                  {heroOffer.title}
                </h3>
                <p className="text-sm text-[#E5E2D9]/80 font-light mt-3 leading-relaxed max-w-xl">
                  {heroOffer.description}
                </p>
              </div>

              {/* Inclusions pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {heroOffer.inclusions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[#E5E2D9]">
                    <Check className="w-3.5 h-3.5 text-[#C4A484] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Promo Code & Action Bar */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A094]">
                    Promo Code:
                  </span>
                  <span className="font-mono text-xs font-bold text-[#E5D7C7]">
                    {heroOffer.promoCode}
                  </span>
                  <button
                    onClick={(e) => handleCopyCode(e, heroOffer.promoCode)}
                    title="Copy promo code"
                    className="p-1 rounded-full hover:bg-white/20 text-[#E5E2D9] transition-colors ml-1"
                  >
                    {copiedCode === heroOffer.promoCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => onClaimOffer(heroOffer)}
                  className="px-7 py-3 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 group"
                >
                  <span>Claim 25% Off & Book</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Right Visual Card (5 cols) */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between text-xs text-[#E5D7C7] border-b border-white/10 pb-3">
                  <span className="font-bold uppercase tracking-wider text-[10px]">Package Value</span>
                  <span className="text-emerald-300 font-bold">Save up to $180+</span>
                </div>

                <div className="space-y-2 text-xs text-[#E5E2D9]/90">
                  <div className="flex justify-between">
                    <span>Deluxe King Suite (3 Nights):</span>
                    <span className="line-through text-[#A3A094]">$750</span>
                  </div>
                  <div className="flex justify-between text-[#C4A484] font-semibold">
                    <span>With HARVEST25 Discount:</span>
                    <span>$562.50</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#A3A094]">
                    <span>Includes Morning Breakfast Basket:</span>
                    <span className="text-emerald-400">FREE</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#A3A094]">
                    <span>Includes 1:00 PM Late Checkout:</span>
                    <span className="text-emerald-400">FREE</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[10px] text-[#A3A094]">No booking fees applied</div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Instant Confirmation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CURATED OFFERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredOffers.map((offer) => {
          const isCopied = copiedCode === offer.promoCode;

          return (
            <div
              key={offer.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#E5E2D9] shadow-xs hover:shadow-md hover:border-[#5A5A40] transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Image Header with Badge */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#F5F2ED]">
                  <ImageWithFallback
                    src={offer.imageUrl}
                    alt={offer.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="bg-[#2C2C2C]/90 backdrop-blur-md text-[#E5D7C7] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">
                      {offer.badge}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="bg-[#5A5A40] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                      {offer.discountLabel}
                    </span>
                    <span className="text-[11px] font-medium backdrop-blur-md bg-black/40 px-2.5 py-0.5 rounded-full text-[#E5D7C7]">
                      {offer.minNights ? `${offer.minNights}+ Nights` : 'Special'}
                    </span>
                  </div>
                </div>

                {/* Offer Content */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-serif italic text-xl text-[#2C2C2C] font-normal leading-snug group-hover:text-[#5A5A40] transition-colors">
                      {offer.title}
                    </h3>
                    <div className="text-xs font-bold text-[#C4A484] mt-1">
                      {offer.subtitle}
                    </div>
                  </div>

                  <p className="text-xs text-[#8C887D] leading-relaxed line-clamp-3">
                    {offer.description}
                  </p>

                  {/* Highlight Inclusions */}
                  <div className="space-y-2 pt-2 border-t border-[#F5F2ED]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
                      Package Privileges
                    </div>
                    <div className="space-y-1.5">
                      {offer.inclusions.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-[#2C2C2C]">
                          <Check className="w-3 h-3 text-[#5A5A40] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Promo Code & CTA */}
              <div className="p-6 pt-0 space-y-3">
                {/* Promo Code Box */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FDFCF9] border border-[#E5E2D9]">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-[#C4A484]" />
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-[#8C887D] font-bold">Use Promo Code</div>
                      <div className="font-mono text-xs font-bold text-[#2C2C2C]">{offer.promoCode}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleCopyCode(e, offer.promoCode)}
                    className="px-3 py-1 rounded-full bg-white hover:bg-[#F5F2ED] border border-[#E5E2D9] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => onClaimOffer(offer)}
                  className="w-full py-3 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest transition-all shadow-2xs flex items-center justify-center gap-2 group/btn"
                >
                  <span>Book with This Offer</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* TRUST & GUARANTEE FOOTNOTE */}
      <div className="bg-[#F5F2ED] rounded-3xl p-6 sm:p-8 border border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#2C2C2C]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-white text-[#5A5A40] flex items-center justify-center border border-[#E5E2D9] shrink-0 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-[#5A5A40]" />
          </div>
          <div>
            <div className="font-bold text-[#2C2C2C]">Direct Reservation Best Rate Guarantee</div>
            <div className="text-[#8C887D] text-[11px]">
              Special package inclusions and promo codes apply exclusively to direct bookings through this platform.
            </div>
          </div>
        </div>

        <button
          onClick={onExploreRooms}
          className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] hover:text-[#2C2C2C] flex items-center gap-1.5 shrink-0"
        >
          <span>View All Suites</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
