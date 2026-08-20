import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Lock,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Booking, PaymentStatus } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../ui/Toast';

interface PaynowPaymentModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (updatedBooking: Booking) => void;
}

export const PaynowPaymentModal: React.FC<PaynowPaymentModalProps> = ({
  booking,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const { currentUser } = useAuth();
  const { notifyPaymentReceived } = useNotifications();
  const { success, error: toastError } = useToast();

  const totalAmount = Number(booking.total_amount || 0);
  const amountPaidSoFar = Number(booking.amount_paid || 0);
  const balanceRemaining = Math.max(0, totalAmount - amountPaidSoFar);

  // Payment Options
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [customAmount, setCustomAmount] = useState<string>(balanceRemaining.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'ecocash' | 'onemoney'>('web');
  const [mobilePhone, setMobilePhone] = useState<string>(currentUser?.phone || '');

  // Processing & Polling State
  const [step, setStep] = useState<'review' | 'initiating' | 'awaiting' | 'success' | 'failed' | 'cancelled'>('review');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paynowRef, setPaynowRef] = useState<string>('');
  const [pollUrl, setPollUrl] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [redirectUrl, setRedirectUrl] = useState<string>('');
  const [amountCharged, setAmountCharged] = useState<number>(balanceRemaining);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);

  // Calculate actual amount to process
  const paymentAmountToProcess =
    paymentType === 'full'
      ? balanceRemaining
      : Math.min(balanceRemaining, Math.max(1, Number(customAmount) || 0));

  useEffect(() => {
    if (isOpen) {
      setStep('review');
      setErrorMessage('');
      setPaymentType('full');
      setCustomAmount(balanceRemaining.toFixed(2));
      setAmountCharged(balanceRemaining);
      setMobilePhone(currentUser?.phone || '');
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, balanceRemaining, currentUser?.phone]);

  // Naturally close modal after payment is verified and success screen is shown
  useEffect(() => {
    if (step === 'success' && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step, isOpen, onClose]);

  // Clean up polling timer
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  const handleInitiatePaynow = async () => {
    if (paymentAmountToProcess <= 0) {
      toastError('Payment amount must be greater than zero.');
      return;
    }

    if ((paymentMethod === 'ecocash' || paymentMethod === 'onemoney') && !mobilePhone.trim()) {
      toastError('Please enter your mobile phone number for mobile money push.');
      return;
    }

    try {
      setStep('initiating');
      setErrorMessage('');
      setAmountCharged(paymentAmountToProcess);

      // Call server-side Paynow payment endpoint
      const result = await api.initiatePaynowPayment({
        bookingId: booking.id,
        amountToPay: paymentAmountToProcess,
        paymentType,
        method: paymentMethod,
        phone: mobilePhone.trim(),
        guestEmail: currentUser?.email || booking.guest?.email,
        guestName: currentUser?.full_name || booking.guest?.full_name
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to initiate Paynow payment.');
      }

      setPaynowRef(result.reference);
      setPollUrl(result.pollUrl || '');
      setRedirectUrl(result.redirectUrl || '');
      setInstructions(result.instructions || '');

      // Store in session storage so post-payment return flows can reconcile instantly
      try {
        sessionStorage.setItem(
          'pending_paynow_transaction',
          JSON.stringify({
            bookingId: booking.id,
            reference: result.reference,
            pollUrl: result.pollUrl || '',
            amount: paymentAmountToProcess,
            timestamp: Date.now()
          })
        );
      } catch {
        // Non-blocking
      }

      setStep('awaiting');

      // If redirect URL is provided and method is web, offer instant open or auto-open
      if (result.redirectUrl && paymentMethod === 'web' && !result.simulated) {
        window.open(result.redirectUrl, '_blank');
      }

      // Start status verification polling
      startStatusPolling(result.pollUrl || '', result.reference, paymentAmountToProcess);
    } catch (err: any) {
      console.error('[Paynow Error]:', err);
      setStep('failed');
      setErrorMessage(err.message || 'Payment could not be started. Please try again.');
      stopPolling();
    }
  };

  const startStatusPolling = (pollUrlToUse: string, referenceToUse: string, amountToConfirm: number) => {
    stopPolling();
    setIsPolling(true);

    let attempts = 0;
    const maxAttempts = 30; // 30 * 4s = 2 minutes max polling window

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const pollStatus = await api.pollPaynowStatus({
          pollUrl: pollUrlToUse,
          reference: referenceToUse,
          bookingId: booking.id
        });

        if (pollStatus.paid || pollStatus.status === 'paid') {
          stopPolling();
          await completeVerifiedPayment(amountToConfirm);
        } else if (pollStatus.status === 'cancelled' || pollStatus.status === 'failed') {
          stopPolling();
          setStep(pollStatus.status === 'cancelled' ? 'cancelled' : 'failed');
          setErrorMessage(pollStatus.message || 'The payment was not completed.');
        } else if (attempts >= maxAttempts) {
          stopPolling();
          // Keep in awaiting with manual check button
        }
      } catch (pollErr) {
        console.warn('Paynow poll check non-fatal error:', pollErr);
      }
    }, 4000);
  };

  const handleManualStatusCheck = async () => {
    setIsPolling(true);
    try {
      const pollStatus = await api.pollPaynowStatus({
        pollUrl,
        reference: paynowRef,
        bookingId: booking.id
      });

      if (pollStatus.paid || pollStatus.status === 'paid') {
        stopPolling();
        await completeVerifiedPayment(amountCharged);
      } else if (pollStatus.status === 'cancelled' || pollStatus.status === 'failed') {
        stopPolling();
        setStep(pollStatus.status === 'cancelled' ? 'cancelled' : 'failed');
        setErrorMessage(pollStatus.message || 'Payment was cancelled or could not be verified.');
      } else {
        toastError('Payment is still pending on Paynow. Please complete the prompt or try again.');
      }
    } catch (err: any) {
      toastError(err.message || 'Could not verify payment status at this moment.');
    } finally {
      setIsPolling(false);
    }
  };

  const completeVerifiedPayment = async (amountConfirmed: number) => {
    try {
      const updatedPaid = Number(Math.min(totalAmount, amountPaidSoFar + amountConfirmed).toFixed(2));
      const newPaymentStatus: PaymentStatus = updatedPaid >= totalAmount ? 'paid' : 'partial';

      // Authoritative database / server update
      let updatedBooking: Booking;
      try {
        updatedBooking = await api.updatePayment(booking.id, updatedPaid, newPaymentStatus);
      } catch (updateErr: any) {
        console.warn('[Payment update fallback]:', updateErr);
        updatedBooking = {
          ...booking,
          amount_paid: updatedPaid,
          payment_status: newPaymentStatus,
          booking_status: booking.booking_status === 'pending' ? 'confirmed' : booking.booking_status
        };
      }

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {
        // Non-blocking
      }

      // Notification
      try {
        notifyPaymentReceived({
          guestId: booking.guest_id,
          guestName: currentUser?.full_name || booking.guest?.full_name || 'Guest',
          amount: amountConfirmed,
          bookingId: booking.id,
          roomNumber: booking.room?.room_number || 'Room'
        });
      } catch {
        // Non-blocking
      }

      success(`Payment of $${amountConfirmed.toFixed(2)} verified successfully via Paynow.`);
      setStep('success');

      if (onPaymentSuccess) {
        onPaymentSuccess(updatedBooking);
      }
    } catch (err: any) {
      console.error('[Payment Verification Non-fatal Notice]:', err);
      // Still show success since Paynow confirmed receipt
      setStep('success');
      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...booking,
          amount_paid: amountPaidSoFar + amountConfirmed,
          payment_status: amountPaidSoFar + amountConfirmed >= totalAmount ? 'paid' : 'partial'
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-[#FCFBF7] rounded-[24px] border border-[#E5E0D5] shadow-2xl max-w-lg w-full overflow-hidden text-[#2C2C2C]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E0D5] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#3B6E52]/10 border border-[#3B6E52]/20 flex items-center justify-center text-[#3B6E52]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#1C1C1C]">
                Pay with Paynow
              </h2>
              <p className="text-xs text-[#6E6E6E]">
                Official Zimbabwe Gateway • Integration ID: 26253
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8C8C8C] hover:text-[#1C1C1C] hover:bg-[#F2EFE9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* STEP 1: REVIEW & CONFIGURE PAYMENT */}
          {step === 'review' && (
            <div className="space-y-5">
              {/* Booking Summary Box */}
              <div className="bg-[#F6F4EE] rounded-xl p-4 border border-[#E8E4D9] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E4D9]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6E6E6E] uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-[#3B6E52]" />
                    <span>Room #{booking.room?.room_number || 'Suite'}</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#E8E4D9] text-[#4A4A4A]">
                    Ref: #{booking.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[#555]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#3B6E52]" />
                    <span>In: {booking.check_in_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#3B6E52]" />
                    <span>Out: {booking.check_out_date}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E4D9] flex justify-between items-baseline">
                  <div>
                    <span className="text-xs text-[#6E6E6E]">Total Stay: </span>
                    <span className="font-semibold text-sm text-[#1C1C1C]">${totalAmount.toFixed(2)}</span>
                    {amountPaidSoFar > 0 && (
                      <span className="text-xs text-[#3B6E52] ml-2 font-medium">(Paid: ${amountPaidSoFar.toFixed(2)})</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#6E6E6E]">Balance Due</div>
                    <div className="text-lg font-bold font-serif text-[#9E3E26]">
                      ${balanceRemaining.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Amount Choice */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#4A4A4A] uppercase tracking-wider">
                  Payment Amount
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('full');
                      setCustomAmount(balanceRemaining.toFixed(2));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentType === 'full'
                        ? 'border-[#3B6E52] bg-[#3B6E52]/5 ring-1 ring-[#3B6E52]'
                        : 'border-[#E5E0D5] bg-white hover:bg-[#FBF9F4]'
                    }`}
                  >
                    <div className="text-xs text-[#6E6E6E]">Full Balance</div>
                    <div className="text-base font-bold font-serif text-[#1C1C1C]">
                      ${balanceRemaining.toFixed(2)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('partial')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentType === 'partial'
                        ? 'border-[#3B6E52] bg-[#3B6E52]/5 ring-1 ring-[#3B6E52]'
                        : 'border-[#E5E0D5] bg-white hover:bg-[#FBF9F4]'
                    }`}
                  >
                    <div className="text-xs text-[#6E6E6E]">Custom Deposit</div>
                    <div className="text-base font-bold font-serif text-[#1C1C1C]">
                      Partial
                    </div>
                  </button>
                </div>

                {paymentType === 'partial' && (
                  <div className="pt-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E6E6E]">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={balanceRemaining}
                        step="0.01"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter deposit amount"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#E5E0D5] bg-white text-sm focus:outline-hidden focus:border-[#3B6E52] focus:ring-1 focus:ring-[#3B6E52]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#4A4A4A] uppercase tracking-wider">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('web')}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'web'
                        ? 'border-[#3B6E52] bg-[#3B6E52]/5 ring-1 ring-[#3B6E52] text-[#3B6E52]'
                        : 'border-[#E5E0D5] bg-white text-[#555] hover:bg-[#FBF9F4]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs font-semibold">Cards & Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ecocash')}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'ecocash'
                        ? 'border-[#005CA9] bg-[#005CA9]/5 ring-1 ring-[#005CA9] text-[#005CA9]'
                        : 'border-[#E5E0D5] bg-white text-[#555] hover:bg-[#FBF9F4]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="text-xs font-semibold">EcoCash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('onemoney')}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'onemoney'
                        ? 'border-[#E31B23] bg-[#E31B23]/5 ring-1 ring-[#E31B23] text-[#E31B23]'
                        : 'border-[#E5E0D5] bg-white text-[#555] hover:bg-[#FBF9F4]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="text-xs font-semibold">OneMoney</span>
                  </button>
                </div>

                {/* Mobile Phone Input for Express Mobile Money */}
                {(paymentMethod === 'ecocash' || paymentMethod === 'onemoney') && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-[#4A4A4A]">
                        {paymentMethod === 'ecocash' ? 'EcoCash' : 'OneMoney'} Mobile Number
                      </label>
                      <span className="text-[10px] text-[#3B6E52] font-semibold">Paynow Zimbabwe</span>
                    </div>
                    <input
                      type="tel"
                      value={mobilePhone}
                      onChange={(e) => setMobilePhone(e.target.value)}
                      placeholder="e.g. 0771111111 or 0771234567"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E0D5] bg-white text-sm focus:outline-hidden focus:border-[#3B6E52] focus:ring-1 focus:ring-[#3B6E52]"
                    />

                    {/* Paynow Sandbox Test Numbers Helper */}
                    <div className="p-2.5 bg-[#F6F4EE] rounded-xl border border-[#E8E4D9] space-y-1.5 text-left">
                      <div className="text-[11px] font-semibold text-[#555]">
                        Paynow Test Mode (Integration #26253):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMobilePhone('0771111111')}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#3B6E52]/40 text-[#3B6E52] text-[10px] font-bold hover:bg-[#3B6E52]/10 transition-colors"
                        >
                          Use 0771111111 (Success Test)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMobilePhone('0772222222')}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E0D5] text-[#555] text-[10px] font-medium hover:bg-[#EAE6DC] transition-colors"
                        >
                          0772222222 (Delayed)
                        </button>
                      </div>
                      <p className="text-[10px] text-[#777]">
                        Or switch to <strong>Cards & Web</strong> above to pay online via the Paynow portal.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleInitiatePaynow}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#2C2C2C] text-[#FDFCF9] font-medium text-sm hover:bg-[#1C1C1C] transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
                >
                  <Lock className="w-4 h-4 text-[#C2A676]" />
                  <span>PAY SECURELY WITH PAYNOW (${paymentAmountToProcess.toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: INITIATING */}
          {step === 'initiating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#3B6E52] animate-spin" />
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-[#1C1C1C]">
                  Preparing Secure Payment...
                </h3>
                <p className="text-xs text-[#6E6E6E] max-w-xs">
                  Connecting to Paynow Zimbabwe server gateway (ID: 26253) to generate your secure transaction.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: AWAITING PAYNOW CONFIRMATION / POLLING */}
          {step === 'awaiting' && (
            <div className="space-y-5 py-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#3B6E52]/10 border border-[#3B6E52]/20 flex items-center justify-center text-[#3B6E52] mx-auto">
                  <RefreshCw className={`w-6 h-6 ${isPolling ? 'animate-spin' : ''}`} />
                </div>
                <h3 className="font-serif font-bold text-lg text-[#1C1C1C]">
                  {paymentMethod === 'web' ? 'Complete Payment on Paynow' : 'Authorize on Your Phone'}
                </h3>
                <p className="text-xs text-[#6E6E6E] max-w-sm mx-auto">
                  {instructions ||
                    (paymentMethod === 'web'
                      ? 'Please complete the transaction in the opened Paynow window. We are verifying the payment confirmation in real-time.'
                      : 'Please check your phone and enter your Mobile Money PIN to approve the transaction.')}
                </p>
              </div>

              {/* Reference Info Card */}
              <div className="bg-[#F6F4EE] rounded-xl p-4 border border-[#E8E4D9] text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#6E6E6E]">Paynow Reference:</span>
                  <span className="font-mono font-medium text-[#1C1C1C]">{paynowRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6E]">Amount:</span>
                  <span className="font-bold text-[#3B6E52]">${amountCharged.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6E]">Gateway Status:</span>
                  <span className="font-medium text-[#D97706] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-ping" />
                    Awaiting Verification
                  </span>
                </div>
              </div>

              {/* Redirect Action if Web Checkout */}
              {redirectUrl && (
                <a
                  href={redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl border border-[#3B6E52] text-[#3B6E52] bg-[#3B6E52]/5 text-xs font-semibold hover:bg-[#3B6E52]/10 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Open Paynow Payment Window</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Status Verification Action */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleManualStatusCheck}
                  disabled={isPolling}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#2C2C2C] text-[#FDFCF9] text-xs font-semibold hover:bg-[#1C1C1C] transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
                  <span>Check Verification Status</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopPolling();
                    setStep('review');
                  }}
                  className="py-3 px-4 rounded-xl border border-[#E5E0D5] bg-white text-xs font-medium text-[#555] hover:bg-[#F2EFE9] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT SUCCESS */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#3B6E52]/10 border border-[#3B6E52]/30 flex items-center justify-center text-[#3B6E52] mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-xl text-[#1C1C1C]">
                  PAYMENT SUCCESSFUL
                </h3>
                <p className="text-xs text-[#3B6E52] font-medium">
                  Your payment has been received and verified.
                </p>
                <p className="text-xs text-[#6E6E6E] pt-1">
                  Your stay at The Haven Guest House is confirmed.
                </p>
              </div>

              {/* Receipt Summary */}
              <div className="bg-[#F6F4EE] rounded-xl p-4 border border-[#E8E4D9] text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#6E6E6E]">Booking Reference:</span>
                  <span className="font-mono font-semibold text-[#1C1C1C]">#{booking.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6E]">Suite:</span>
                  <span className="font-medium text-[#1C1C1C]">Room #{booking.room?.room_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6E]">Dates:</span>
                  <span className="font-medium text-[#1C1C1C]">{booking.check_in_date} to {booking.check_out_date}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#E8E4D9]">
                  <span className="text-[#6E6E6E]">Amount Paid:</span>
                  <span className="font-bold text-[#3B6E52]">${amountCharged.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6E]">Payment Status:</span>
                  <span className="font-bold text-[#3B6E52] uppercase">Paid</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-6 rounded-xl bg-[#3B6E52] text-white text-xs font-semibold hover:bg-[#2F5942] transition-colors"
              >
                RETURN TO MY STAY
              </button>
            </div>
          )}

          {/* STEP 5: PAYMENT FAILED */}
          {step === 'failed' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#9E3E26]/10 border border-[#9E3E26]/30 flex items-center justify-center text-[#9E3E26] mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-xl text-[#1C1C1C]">
                  PAYMENT COULD NOT BE COMPLETED
                </h3>
                <p className="text-xs text-[#6E6E6E] max-w-sm mx-auto">
                  {errorMessage || 'Your payment was not completed. Please try again.'}
                </p>
              </div>

              {/* Special Test Mode Helper Actions */}
              {(errorMessage.includes('Test Mode') || errorMessage.includes('test case') || errorMessage.includes('EcoCash')) && (
                <div className="p-3 bg-[#F6F4EE] rounded-xl border border-[#E8E4D9] space-y-2 text-xs text-left">
                  <div className="font-semibold text-[#1C1C1C]">Recommended Solutions:</div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('web');
                        setStep('review');
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-[#3B6E52] text-white text-xs font-semibold text-center hover:bg-[#2F5942] transition-colors"
                    >
                      Switch to "Cards & Web" Online Checkout
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('ecocash');
                        setMobilePhone('0771111111');
                        setStep('review');
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-white border border-[#E5E0D5] text-[#2C2C2C] text-xs font-medium text-center hover:bg-[#EAE6DC] transition-colors"
                    >
                      Use Test EcoCash Number (0771111111)
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#2C2C2C] text-[#FDFCF9] text-xs font-semibold hover:bg-[#1C1C1C] transition-colors"
                >
                  TRY AGAIN
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl border border-[#E5E0D5] bg-white text-xs font-medium text-[#555] hover:bg-[#F2EFE9] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: PAYMENT CANCELLED */}
          {step === 'cancelled' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#D97706]/10 border border-[#D97706]/30 flex items-center justify-center text-[#D97706] mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-xl text-[#1C1C1C]">
                  PAYMENT CANCELLED
                </h3>
                <p className="text-xs text-[#6E6E6E]">
                  Your booking has not been fully paid.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#2C2C2C] text-[#FDFCF9] text-xs font-semibold hover:bg-[#1C1C1C] transition-colors"
                >
                  TRY PAYMENT AGAIN
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl border border-[#E5E0D5] bg-white text-xs font-medium text-[#555] hover:bg-[#F2EFE9] transition-colors"
                >
                  RETURN TO MY STAY
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#F6F4EE] border-t border-[#E5E0D5] flex items-center justify-between text-[11px] text-[#7A7A7A]">
          <span>The Haven Guest House • Gweru</span>
          <span>Paynow ID: 26253</span>
        </div>
      </div>
    </div>
  );
};
