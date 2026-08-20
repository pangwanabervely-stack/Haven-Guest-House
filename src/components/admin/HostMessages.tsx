import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCheck,
  Sparkles,
  Phone
} from 'lucide-react';
import { Message, Profile, Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

interface HostMessagesProps {
  bookings: Booking[];
}

export const HostMessages: React.FC<HostMessagesProps> = ({ bookings }) => {
  const { currentUser, availableProfiles } = useAuth();
  const { success, error } = useToast();

  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const guestProfiles = availableProfiles.filter((p) => p.role === 'guest');
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedGuestId && guestProfiles.length > 0) {
      setSelectedGuestId(guestProfiles[0].id);
    }
  }, [guestProfiles, selectedGuestId]);

  const fetchMessages = async () => {
    try {
      const msgs = await api.getMessages();
      setAllMessages(msgs);

      // Mark unread from this guest as read
      if (selectedGuestId && currentUser?.id) {
        api.markMessagesRead(currentUser.id, selectedGuestId).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load host messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to Supabase Realtime message updates
    const unsubscribe = api.subscribeToMessages((newMsg) => {
      setAllMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (newMsg.sender_id === selectedGuestId && currentUser?.id) {
        api.markMessagesRead(currentUser.id, selectedGuestId).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedGuestId, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedGuestId]);

  const selectedGuest = availableProfiles.find((p) => p.id === selectedGuestId) || guestProfiles[0];
  const activeGuestBooking = bookings.find(
    (b) => b.guest_id === selectedGuestId && b.booking_status !== 'cancelled'
  );

  const currentConversationMessages = allMessages.filter(
    (m) =>
      (m.sender_id === selectedGuestId && m.receiver_id === currentUser?.id) ||
      (m.sender_id === currentUser?.id && m.receiver_id === selectedGuestId) ||
      (m.sender_id === selectedGuestId) // also show guest broadcasts
  );

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !currentUser || !selectedGuestId) return;

    setIsSending(true);
    try {
      const sent = await api.sendMessage({
        sender_id: currentUser.id,
        receiver_id: selectedGuestId,
        booking_id: activeGuestBooking?.id || null,
        message: text
      });
      setInputMessage('');
      setAllMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (err: any) {
      error(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const hostQuickReplies = [
    'Fresh towels and amenities have just been dispatched to your room.',
    'Artisanal breakfast is served daily in the terrace courtyard from 7:30 AM to 10:30 AM.',
    'Early check-in is approved! Your suite is fully sanitized and ready.',
    'Delighted to assist! Please let us know if there is anything else you need.'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E5E2D9] pb-6">
        <div className="text-[10px] uppercase tracking-widest text-[#8C887D] font-bold">
          Host Operations & Concierge
        </div>
        <h1 className="text-3xl font-serif italic text-[#2C2C2C] mt-1">
          Guest Communications & Realtime Inquiries
        </h1>
        <p className="text-xs text-[#8C887D] mt-1">
          Instant two-way messaging with staying guests for seamless hospitality.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-3xl border border-[#E5E2D9] shadow-xs overflow-hidden h-[620px]">
        {/* Left Guest Directory */}
        <div className="border-r border-[#E5E2D9] flex flex-col bg-[#FDFCF9]/60">
          <div className="p-4 border-b border-[#E5E2D9]">
            <div className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-2">
              Guest Inboxes ({guestProfiles.length})
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E2D9]/60">
            {guestProfiles.map((guest) => {
              const guestBooking = bookings.find((b) => b.guest_id === guest.id && b.booking_status !== 'cancelled');
              const guestMsgs = allMessages.filter(
                (m) => m.sender_id === guest.id || m.receiver_id === guest.id
              );
              const lastMsg = guestMsgs[guestMsgs.length - 1];
              const isSelected = selectedGuestId === guest.id;

              return (
                <button
                  key={guest.id}
                  onClick={() => setSelectedGuestId(guest.id)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    isSelected ? 'bg-[#F5F2ED] border-l-4 border-[#5A5A40]' : 'hover:bg-white'
                  }`}
                >
                  <img
                    src={guest.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'}
                    alt={guest.full_name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-[#E5E2D9]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-serif italic font-bold text-sm text-[#2C2C2C] truncate">
                        {guest.full_name}
                      </div>
                      {lastMsg && (
                        <span className="text-[10px] text-[#8C887D]">
                          {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {guestBooking && (
                      <div className="text-[10px] font-bold text-[#5A5A40]">
                        Suite #{guestBooking.room?.room_number || '101'} • {guestBooking.booking_status}
                      </div>
                    )}
                    <p className="text-xs text-[#8C887D] truncate mt-1">
                      {lastMsg ? lastMsg.message : 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Conversation Area */}
        <div className="md:col-span-2 flex flex-col h-full">
          {/* Active Guest Header */}
          <div className="p-4 border-b border-[#E5E2D9] bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={selectedGuest?.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'}
                alt={selectedGuest?.full_name || 'Guest'}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover ring-1 ring-[#E5E2D9]"
              />
              <div>
                <div className="font-serif italic font-bold text-base text-[#2C2C2C]">
                  {selectedGuest?.full_name || 'Guest Conversation'}
                </div>
                <div className="text-[11px] text-[#8C887D] flex items-center gap-2">
                  <span>{selectedGuest?.email}</span>
                  {selectedGuest?.phone && <span>• {selectedGuest.phone}</span>}
                </div>
              </div>
            </div>

            {activeGuestBooking && (
              <div className="text-right">
                <span className="text-[10px] bg-[#F5F2ED] text-[#5A5A40] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-[#E5E2D9]">
                  Room #{activeGuestBooking.room?.room_number} ({activeGuestBooking.room?.room_type})
                </span>
              </div>
            )}
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FDFCF9]/50">
            {currentConversationMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#8C887D]">
                <MessageSquare className="w-8 h-8 text-[#5A5A40]/40" />
                <p className="text-xs">No prior messages in this conversation. Send a greeting below.</p>
              </div>
            ) : (
              currentConversationMessages.map((msg) => {
                const isHostSender = msg.sender_id === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${isHostSender ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isHostSender && (
                      <img
                        src={selectedGuest?.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'}
                        alt="Guest"
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#E5E2D9] mb-1"
                      />
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                        isHostSender
                          ? 'bg-[#5A5A40] text-white rounded-br-xs'
                          : 'bg-white text-[#2C2C2C] border border-[#E5E2D9] rounded-bl-xs'
                      }`}
                    >
                      <p>{msg.message}</p>
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isHostSender ? 'text-white/70' : 'text-[#8C887D]'
                        }`}
                      >
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isHostSender && <CheckCheck className="w-3 h-3 text-white/90" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Bar */}
          <div className="px-4 py-2 bg-[#F5F2ED] border-t border-[#E5E2D9] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-[#8C887D] uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#5A5A40]" />
              Quick Dispatch:
            </span>
            {hostQuickReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(reply)}
                className="text-[11px] bg-white hover:bg-[#FDFCF9] text-[#2C2C2C] border border-[#E5E2D9] px-3 py-1 rounded-full whitespace-nowrap transition-colors shadow-2xs"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 bg-white border-t border-[#E5E2D9] flex items-center gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Reply to ${selectedGuest?.full_name || 'guest'}...`}
              className="flex-1 px-4 py-3 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-full text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="w-11 h-11 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white flex items-center justify-center transition-colors shadow-xs disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
