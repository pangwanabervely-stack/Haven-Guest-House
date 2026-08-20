import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  CheckCheck,
  Building,
  AlertCircle
} from 'lucide-react';
import { Message, Booking, Profile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/Toast';

interface GuestMessagesProps {
  activeBooking?: Booking | null;
}

export const GuestMessages: React.FC<GuestMessagesProps> = ({ activeBooking }) => {
  const { currentUser, availableProfiles } = useAuth();
  const { error } = useToast();

  const [hostProfile, setHostProfile] = useState<Profile | null>(() => {
    return availableProfiles.find((p) => p.role === 'host') || null;
  });
  const [loadingHost, setLoadingHost] = useState<boolean>(!hostProfile);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch or verify host profile directly from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadHostProfile = async () => {
      // First check in availableProfiles from context
      const existingHost = availableProfiles.find((p) => p.role === 'host');
      if (existingHost) {
        if (isMounted) {
          setHostProfile(existingHost);
          setLoadingHost(false);
        }
        return;
      }

      // Query Supabase directly for a profile with role = 'host'
      try {
        setLoadingHost(true);
        const { data, error: fetchErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'host')
          .limit(1)
          .maybeSingle();

        if (fetchErr) {
          console.warn('Could not query host profile:', fetchErr.message);
        }

        if (isMounted) {
          if (data) {
            setHostProfile(data as Profile);
          } else {
            setHostProfile(null);
          }
        }
      } catch (err) {
        console.error('Error loading host profile:', err);
        if (isMounted) setHostProfile(null);
      } finally {
        if (isMounted) setLoadingHost(false);
      }
    };

    loadHostProfile();

    return () => {
      isMounted = false;
    };
  }, [availableProfiles]);

  const fetchMessages = async () => {
    if (!currentUser) return;
    try {
      const msgs = await api.getMessages({ guestId: currentUser.id });
      setMessages(msgs);

      // Mark messages received from host as read
      if (hostProfile?.id) {
        api.markMessagesRead(currentUser.id, hostProfile.id).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to Supabase Realtime message updates
    const unsubscribe = api.subscribeToMessages((newMsg) => {
      if (
        currentUser &&
        (newMsg.sender_id === currentUser.id ||
          newMsg.receiver_id === currentUser.id ||
          newMsg.booking_id === activeBooking?.id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        if (newMsg.receiver_id === currentUser.id && hostProfile?.id) {
          api.markMessagesRead(currentUser.id, hostProfile.id).catch(() => {});
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, activeBooking?.id, hostProfile?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || !currentUser) return;

    if (!hostProfile) {
      error('Host messaging is currently unavailable.');
      return;
    }

    // Verify current authenticated Supabase user session before dispatching
    try {
      const {
        data: { user },
        error: authErr
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        error('Please sign in again to send messages.');
        return;
      }

      setIsSending(true);
      const sent = await api.sendMessage({
        sender_id: user.id, // Strictly uses authenticated Supabase user ID
        receiver_id: hostProfile.id,
        booking_id: activeBooking?.id || null,
        message: textToSend
      });
      setInputMessage('');
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (err: any) {
      error(err.message || 'Failed to deliver message.');
    } finally {
      setIsSending(false);
    }
  };

  const quickTemplates = [
    'Could we request two extra warm bath towels?',
    'What time is the artisanal breakfast served in the morning?',
    'Can we arrange early check-in or luggage drop-off?',
    'Everything in our suite is wonderful, thank you!'
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Host Profile Header */}
      <div className="bg-white rounded-3xl p-5 border border-[#E5E2D9] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={
                hostProfile?.profile_image ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
              }
              alt={hostProfile?.full_name || 'Host'}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-[#5A5A40]/20"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                hostProfile ? 'bg-emerald-500' : 'bg-gray-400'
              }`}
            ></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif italic font-bold text-lg text-[#2C2C2C]">
                {hostProfile?.full_name || 'Host & Concierge'}
              </h2>
              <span className="text-[10px] bg-[#F5F2ED] text-[#5A5A40] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[#E5E2D9]">
                Host & Concierge
              </span>
            </div>
            <p className="text-xs text-[#8C887D] flex items-center gap-1.5 mt-0.5">
              <Building className="w-3 h-3 text-[#5A5A40]" />
              The Haven Guest House Concierge Desk • Realtime Direct Messaging
            </p>
          </div>
        </div>

        {activeBooking && (
          <div className="hidden sm:block text-right bg-[#FDFCF9] px-3.5 py-2 rounded-2xl border border-[#E5E2D9]">
            <div className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold">
              Current Reservation
            </div>
            <div className="text-xs font-bold text-[#5A5A40]">
              Suite #{activeBooking.room?.room_number || '101'} • {activeBooking.check_in_date} to {activeBooking.check_out_date}
            </div>
          </div>
        )}
      </div>

      {/* Chat Thread Container */}
      <div className="bg-white rounded-3xl border border-[#E5E2D9] shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FDFCF9]/60">
          {loadingHost ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-10 h-10 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-[#8C887D]">Connecting to concierge desk...</p>
            </div>
          ) : !hostProfile ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F5F2ED] flex items-center justify-center text-[#5A5A40]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="font-serif italic text-base text-[#2C2C2C]">
                Host messaging is currently unavailable.
              </div>
              <p className="text-xs text-[#8C887D] max-w-sm">
                The host is currently offline or unreachable. Please try again shortly or contact the front desk.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F5F2ED] flex items-center justify-center text-[#5A5A40]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="font-serif italic text-base text-[#2C2C2C]">
                Direct Chat with Host {hostProfile.full_name ? hostProfile.full_name.split(' ')[0] : 'Bervely'}
              </div>
              <p className="text-xs text-[#8C887D] max-w-sm">
                Have questions about your check-in, breakfast times, housekeeping, or local recommendations? Send a message below!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <img
                      src={
                        hostProfile?.profile_image ||
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
                      }
                      alt="Host"
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-[#E5E2D9] mb-1"
                    />
                  )}
                  <div
                    className={`max-w-[75%] sm:max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                      isMe
                        ? 'bg-[#5A5A40] text-white rounded-br-xs'
                        : 'bg-white text-[#2C2C2C] border border-[#E5E2D9] rounded-bl-xs'
                    }`}
                  >
                    <p>{msg.message}</p>
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isMe ? 'text-white/70' : 'text-[#8C887D]'
                      }`}
                    >
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3 text-white/90" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Prompts */}
        <div className="px-6 py-2 bg-[#F5F2ED] border-t border-[#E5E2D9] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-[#8C887D] uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#5A5A40]" />
            Quick Suggestions:
          </span>
          {quickTemplates.map((tpl, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(tpl)}
              disabled={!hostProfile || isSending}
              className="text-[11px] bg-white hover:bg-[#FDFCF9] text-[#2C2C2C] border border-[#E5E2D9] px-3 py-1 rounded-full whitespace-nowrap transition-colors shadow-2xs disabled:opacity-40"
            >
              {tpl}
            </button>
          ))}
        </div>

        {/* Input Bar */}
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
            disabled={!hostProfile || isSending}
            placeholder={
              hostProfile
                ? 'Type your message to the host...'
                : 'Host messaging is currently unavailable.'
            }
            className="flex-1 px-4 py-3 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-full text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending || !hostProfile}
            className="w-11 h-11 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white flex items-center justify-center transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
