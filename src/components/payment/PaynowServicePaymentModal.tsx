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
  DollarSign,
  UtensilsCrossed
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ServiceOrder } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../ui/Toast';

interface PaynowServicePaymentModalProps {
  serviceOrder: ServiceOrder;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (updatedOrder: ServiceOrder) => void;
}

export const PaynowServicePaymentModal: React.FC<PaynowServicePaymentModalProps> = ({
  serviceOrder,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const { currentUser } = useAuth();
  const { notifyPaymentReceived } = useNotifications();
  const { success, error: toastError } = useToast();

  const totalAmount = Number(serviceOrder.total_amount || 0);

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'ecocash' | 'onemoney'>('web');
  const [mobilePhone, setMobilePhone] = useState<string>(currentUser?.phone || '');

  // Processing & Polling State
  const [step, setStep] = useState<'review' | 'initiating' | 'awaiting' | 'success' | 'failed' | 'cancelled'>('review');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paynowRef, setPaynowRef] = useState<string>('');
  const [pollUrl, setPollUrl] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [redirectUrl, setRedirectUrl] = useState<string>('');
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('review');
      setErrorMessage('');
      setMobilePhone(currentUser?.phone || '');
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, currentUser?.phone]);

  useEffect(() => {
    if (step === 'success' && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step, isOpen, onClose]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  const handleInitiatePaynow = async () => {
    if (totalAmount <= 0) {
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

      const result = await api.initiatePaynowServicePayment({
        serviceOrderId: serviceOrder.id,
        method: paymentMethod,
        phone: mobilePhone.trim(),
        guestEmail: currentUser?.email || serviceOrder.guest?.email,
        guestName: currentUser?.full_name || serviceOrder.guest?.full_name
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to initiate Paynow payment.');
      }

      setPaynowRef(result.reference);
      setPollUrl(result.pollUrl || '');
      setRedirectUrl(result.redirectUrl || '');
      setInstructions(result.instructions || '');

      setStep('awaiting');

      if (result.redirectUrl && paymentMethod === 'web' && !result.simulated) {
        window.open(result.redirectUrl, '_blank', 'noopener,noreferrer');
      }

      startStatusPolling(result.pollUrl || '', result.reference);
    } catch (err: any) {
      setStep('failed');
      setErrorMessage(err.message || 'Payment initiation failed.');
    }
  };

  const startStatusPolling = (url: string, reference: string) => {
    stopPolling();
    setIsPolling(true);

    let attempts = 0;
    const maxAttempts = 60; // 3 minutes maximum

    pollIntervalRef.current = setInterval(async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        stopPolling();
        return;
      }

      try {
        const pollResult = await api.pollPaynowStatus({
          pollUrl: url,
          reference,
          serviceOrderId: serviceOrder.id
        });

        if (pollResult.paid || pollResult.status === 'paid') {
          stopPolling();
          setStep('success');

          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 }
            });
          } catch {
            // Ignore confetti issues in headless test mode
          }

          notifyPaymentReceived({
            bookingId: serviceOrder.booking_id || serviceOrder.id,
            guestName: currentUser?.full_name || serviceOrder.guest?.full_name || 'Guest',
            amount: totalAmount,
            reference: reference
          });

          success(`Payment of $${totalAmount.toFixed(2)} verified via Paynow!`);

          const updatedOrder: ServiceOrder = {
            ...serviceOrder,
            payment_status: 'paid',
            amount_paid: totalAmount
          };

          if (onPaymentSuccess) {
            onPaymentSuccess(updatedOrder);
          }
        } else if (pollResult.status === 'cancelled' || pollResult.status === 'failed') {
          stopPolling();
          setStep('failed');
          setErrorMessage(pollResult.message || 'The payment was not completed or was cancelled.');
        }
      } catch (pollErr: any) {
        console.warn('Poll error:', pollErr);
      }
    }, 3000);
  };

  const handleManualCheck = async () => {
    if (!pollUrl && !paynowRef) return;
    setIsPolling(true);
    try {
      const pollResult = await api.pollPaynowStatus({
        pollUrl,
        reference: paynowRef,
        serviceOrderId: serviceOrder.id
      });

      if (pollResult.paid || pollResult.status === 'paid') {
        stopPolling();
        setStep('success');
        success(`Payment of $${totalAmount.toFixed(2)} confirmed!`);
        if (onPaymentSuccess) {
          onPaymentSuccess({
            ...serviceOrder,
            payment_status: 'paid',
            amount_paid: totalAmount
          });
        }
      } else {
        toastError('Payment is still awaiting confirmation from the payment provider.');
      }
    } catch (err: any) {
      toastError('Could not verify status. Please try again.');
    } finally {
      setIsPolling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FDFCF9] rounded-[32px] max-w-lg w-full border border-[#E5E2D9] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#E5E2D9] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484]">
                Room Service Settlement
              </div>
              <h2 className="font-serif italic text-xl text-[#2C2C2C] font-normal">
                Paynow Payment Gateway
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              stopPolling();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#F5F2ED] text-[#8C887D] hover:text-[#2C2C2C] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: REVIEW & SELECT METHOD */}
          {step === 'review' && (
            <div className="space-y-6">
              {/* Order Summary Box */}
              <div className="p-4 bg-white rounded-2xl border border-[#E5E2D9] space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#F5F2ED]">
                  <span className="text-[#8C887D]">Order Reference:</span>
                  <span className="font-mono font-bold text-[#2C2C2C]">#{serviceOrder.id.slice(0, 8)}</span>
                </div>

                <div className="space-y-1 text-xs">
                  {serviceOrder.items?.map((it) => (
                    <div key={it.id} className="flex justify-between text-[#2C2C2C]">
                      <span>{it.quantity}× {it.menu_item?.name || 'Service Item'}</span>
                      <span className="font-mono text-[#8C887D]">${it.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#F5F2ED] flex justify-between items-center text-xs font-bold">
                  <span className="text-[#2C2C2C]">Total Amount to Pay:</span>
                  <span className="font-serif italic text-base text-[#5A5A40]">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
                  Select Paynow Zimbabwe Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('web')}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'web'
                        ? 'border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40] shadow-xs'
                        : 'border-[#E5E2D9] bg-white text-[#8C887D] hover:border-[#C4A484]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[11px] font-bold">Visa / Master</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ecocash')}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'ecocash'
                        ? 'border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40] shadow-xs'
                        : 'border-[#E5E2D9] bg-white text-[#8C887D] hover:border-[#C4A484]'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    <span className="text-[11px] font-bold text-blue-700">EcoCash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('onemoney')}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'onemoney'
                        ? 'border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40] shadow-xs'
                        : 'border-[#E5E2D9] bg-white text-[#8C887D] hover:border-[#C4A484]'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-amber-600" />
                    <span className="text-[11px] font-bold text-amber-700">OneMoney</span>
                  </button>
                </div>
              </div>

              {/* Mobile Number for EcoCash / OneMoney */}
              {(paymentMethod === 'ecocash' || paymentMethod === 'onemoney') && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
                    {paymentMethod === 'ecocash' ? 'EcoCash Number (e.g. 0771234567)' : 'OneMoney Number (e.g. 0711234567)'}
                  </label>
                  <input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    placeholder="077..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E2D9] rounded-xl text-xs font-mono text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                  />
                  <p className="text-[11px] text-[#8C887D]">
                    A USSD prompt will be pushed to this mobile phone to authorize the transaction.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleInitiatePaynow}
                className="w-full py-3.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <span>Proceed to Pay (${totalAmount.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: INITIATING */}
          {step === 'initiating' && (
            <div className="text-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-[#5A5A40] animate-spin mx-auto" />
              <div>
                <h3 className="font-serif italic text-lg text-[#2C2C2C]">
                  Connecting to Paynow Zimbabwe...
                </h3>
                <p className="text-xs text-[#8C887D] mt-1">
                  Generating authoritative secure transaction token.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: AWAITING PAYMENT / POLLING */}
          {step === 'awaiting' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#5A5A40]/10 border border-[#5A5A40]/20 flex items-center justify-center mx-auto text-[#5A5A40] animate-pulse">
                <Smartphone className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-serif italic text-xl text-[#2C2C2C]">
                  Awaiting Payment Authorization
                </h3>
                <p className="text-xs text-[#8C887D] mt-1">
                  {instructions || 'Please complete the transaction on your device or in the opened gateway window.'}
                </p>
              </div>

              {redirectUrl && (
                <div className="p-4 bg-white rounded-2xl border border-[#E5E2D9] space-y-3 text-left">
                  <div className="text-xs text-[#2C2C2C] font-semibold">
                    Pay Online with Card / Zimswitch:
                  </div>
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-2xs"
                  >
                    <span>Open Paynow Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={isPolling}
                  className="px-4 py-2 border border-[#E5E2D9] hover:border-[#5A5A40] bg-white text-[#2C2C2C] text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
                  <span>Check Status</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif italic text-2xl text-[#2C2C2C]">
                  Payment Verified!
                </h3>
                <p className="text-xs text-[#8C887D] mt-1">
                  Your room service order is paid and kitchen staff have been notified.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: FAILED */}
          {step === 'failed' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-serif italic text-lg text-[#2C2C2C]">
                  Payment Not Completed
                </h3>
                <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">
                  {errorMessage || 'Payment could not be confirmed.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('review')}
                className="px-6 py-2.5 bg-[#5A5A40] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-xs"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
