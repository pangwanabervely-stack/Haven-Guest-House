import React, { useState } from 'react';
import { X, Star, Sparkles, MessageSquare, CheckCircle } from 'lucide-react';
import { Booking } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { useNotifications } from '../../context/NotificationContext';

interface GuestReviewModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export const GuestReviewModal: React.FC<GuestReviewModalProps> = ({
  booking,
  isOpen,
  onClose,
  onReviewSubmitted
}) => {
  const { success, error } = useToast();
  const { addNotification } = useNotifications();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !booking) return null;

  // Strict check: only allowed after booking_status is checked_out
  const isEligible = booking.booking_status === 'checked_out';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligible) {
      error('Reviews can only be written after your checkout is complete.');
      return;
    }
    if (!title.trim() || !comment.trim()) {
      error('Please provide both a title and review comments.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createReview({
        booking_id: booking.id,
        room_id: booking.room_id,
        rating,
        title: title.trim(),
        comment: comment.trim()
      });

      setSubmitted(true);
      success('Thank you for sharing your experience at The Haven!');

      addNotification({
        title: 'Review Published',
        message: `Thank you for rating Room ${booking.room?.room_number} ${rating} stars!`,
        type: 'system',
        linkView: 'guest-bookings'
      });

      setTimeout(() => {
        if (onReviewSubmitted) onReviewSubmitted();
        onClose();
        setSubmitted(false);
      }, 1800);
    } catch (err: any) {
      error(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FDFCF9] rounded-[28px] shadow-2xl max-w-md w-full overflow-hidden border border-[#E5E2D9]">
        {/* Header */}
        <div className="bg-[#2C2C2C] text-white p-6 relative border-b border-[#3E3E3E]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#E5E2D9] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-[10px] uppercase tracking-widest text-[#C4A484] font-bold mb-1">
            Guest Experience & Feedback
          </div>
          <h2 className="text-2xl font-serif italic font-normal text-[#FDFCF9]">
            Review Your Stay
          </h2>
          <p className="text-xs text-[#E5E2D9]/80 mt-1">
            Room {booking.room?.room_number} &bull; {booking.room?.name}
          </p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-serif italic text-2xl text-[#2C2C2C]">
              Review Submitted
            </h3>
            <p className="text-xs text-[#8C887D] max-w-xs mx-auto">
              Your feedback helps us continuously elevate our boutique sanctuary hospitality.
            </p>
          </div>
        ) : !isEligible ? (
          <div className="p-6 space-y-4 text-center">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-left text-xs text-amber-900 leading-relaxed">
              <strong>Checkout Required:</strong> To maintain genuine reviews from verified stays, feedback can be submitted once your reservation has reached <strong>Checked Out</strong> status.
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#5A5A40] text-white text-xs font-bold uppercase tracking-wider rounded-full"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Star Rating Selector */}
            <div className="text-center space-y-1.5 pb-2 border-b border-[#E5E2D9]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#8C887D]">
                Your Rating
              </div>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-500 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-xs font-semibold text-[#5A5A40]">
                {rating === 5 && 'Outstanding Experience'}
                {rating === 4 && 'Very Good Stay'}
                {rating === 3 && 'Average Experience'}
                {rating === 2 && 'Room for Improvement'}
                {rating === 1 && 'Disappointing'}
              </div>
            </div>

            {/* Headline */}
            <div>
              <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                Headline / Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Peaceful haven with extraordinary hospitality"
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
              />
            </div>

            {/* Detailed Comment */}
            <div>
              <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                Your Review *
              </label>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about the room comfort, amenities, cleanliness, staff, or quiet ambiance..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E5E2D9]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#8C887D] hover:text-[#2C2C2C] uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 px-4 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Publish Review</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
