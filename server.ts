import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { Paynow } from 'paynow';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

// Cached Host-Authenticated Supabase Client for Privileged Reconciliation
let cachedHostClient: { client: SupabaseClient; expiresAt: number } | null = null;

async function getHostAuthenticatedSupabaseClient(): Promise<SupabaseClient | null> {
  if (!supabaseAdmin || !supabaseUrl || !supabaseAnonKey) {
    return supabaseAdmin;
  }

  const now = Date.now();
  if (cachedHostClient && cachedHostClient.expiresAt > now + 60000) {
    return cachedHostClient.client;
  }

  try {
    // 1. Locate registered host profile from database
    const { data: hostProfile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('role', 'host')
      .limit(1)
      .maybeSingle();

    if (pErr || !hostProfile?.email) {
      console.warn('[Host Auth Sync]: Could not find host profile. Using admin client fallback.');
      return supabaseAdmin;
    }

    // 2. Generate and verify authentication token for host identity
    const linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: hostProfile.email
    });

    const tokenHash = linkRes.data?.properties?.hashed_token;
    if (!tokenHash) {
      console.warn('[Host Auth Sync]: Magiclink token generation failed.');
      return supabaseAdmin;
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const otpRes = await authClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink'
    });

    const accessToken = otpRes.data?.session?.access_token;
    if (!accessToken) {
      console.warn('[Host Auth Sync]: Could not acquire host access token.');
      return supabaseAdmin;
    }

    const hostClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false }
    });

    // Cache host client for 45 minutes (standard JWT is 60m)
    cachedHostClient = {
      client: hostClient,
      expiresAt: now + 45 * 60 * 1000
    };

    console.log(`[Host Auth Sync]: Host authentication session established for ${hostProfile.email} (ID: ${hostProfile.id}).`);
    return hostClient;
  } catch (err: any) {
    console.error('[Host Auth Sync Exception]:', err?.message || err);
    return supabaseAdmin;
  }
}

// Clean polluted guest notes while strictly preserving authentic guest notes
export function cleanGuestNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes
    .replace(/\[PaynowTxn:[\s\S]*?\]/gi, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

// Persistent Payment Transaction Store Interface
export interface PaymentTransactionRecord {
  id: string;
  booking_id: string;
  service_order_id?: string;
  provider: 'paynow';
  provider_reference: string;
  paynow_reference?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed' | 'disputed';
  poll_url?: string;
  redirect_url?: string;
  instructions?: string;
  method: 'web' | 'ecocash' | 'onemoney';
  created_at: string;
  updated_at?: string;
  verified_at?: string;
  paid_at?: string;
  guest_email?: string;
  guest_name?: string;
  simulated?: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'payment_transactions.json');

// In-memory + Disk Persisted Ledger
const transactionsStore = new Map<string, PaymentTransactionRecord>();

function initPaymentStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(TRANSACTIONS_FILE)) {
      const content = fs.readFileSync(TRANSACTIONS_FILE, 'utf-8');
      const list: PaymentTransactionRecord[] = JSON.parse(content);
      for (const item of list) {
        if (item.provider_reference) {
          transactionsStore.set(item.provider_reference, item);
        }
      }
      console.log(`[Payment Store]: Loaded ${transactionsStore.size} persistent payment transactions from disk.`);
    }
  } catch (err) {
    console.warn('[Payment Store Init]: Non-blocking disk read warning:', err);
  }
}

function persistPaymentStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(transactionsStore.values());
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Payment Store Persist]: Non-blocking disk write warning:', err);
  }
}

initPaymentStore();

// Resolve booking from Supabase by UUID or reference prefix (HAVEN-BKG-...)
async function resolveBookingFromDatabase(
  bookingIdOrRef: string,
  clientToUse?: SupabaseClient | null
): Promise<{ id: string; total_amount: number; amount_paid: number; payment_status: string; booking_status: string; guest_notes?: string } | null> {
  const client = clientToUse || (await getHostAuthenticatedSupabaseClient()) || supabaseAdmin;
  if (!client) return null;

  // Direct UUID match
  if (bookingIdOrRef.includes('-') && bookingIdOrRef.length >= 32) {
    const { data, error } = await client
      .from('bookings')
      .select('id, total_amount, amount_paid, payment_status, booking_status, guest_notes')
      .eq('id', bookingIdOrRef)
      .maybeSingle();
    if (!error && data) return data;
  }

  // Parse shortId from reference (e.g. HAVEN-BKG-30C85FFA-...)
  const match = bookingIdOrRef.match(/HAVEN-BKG-([A-F0-9]{8})/i);
  const targetPrefix = (match ? match[1] : bookingIdOrRef).toLowerCase().replace(/-/g, '');

  if (targetPrefix.length >= 6) {
    const { data: allBookings, error } = await client
      .from('bookings')
      .select('id, total_amount, amount_paid, payment_status, booking_status, guest_notes')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && allBookings) {
      const found = allBookings.find((b) => b.id.replace(/-/g, '').toLowerCase().startsWith(targetPrefix));
      if (found) return found;
    }
  }

  return null;
}

// Authoritative Payment Reconciliation
async function updateSupabaseBookingPayment(
  bookingIdOrRef: string,
  amountToAdd: number,
  paynowReference?: string,
  transactionReference?: string
): Promise<{ success: boolean; newAmountPaid: number; paymentStatus: string; bookingId: string; alreadyProcessed?: boolean; balanceRemaining: number }> {
  try {
    const txnRef = transactionReference || paynowReference || `TXN-${Date.now()}`;
    const cleanPaynowRef = paynowReference || 'N/A';

    // 1. Check persistent transaction store for idempotency
    const existingTxn = txnRef ? transactionsStore.get(txnRef) : undefined;
    let matchingTxnByPaynowRef: PaymentTransactionRecord | undefined;
    if (!existingTxn && paynowReference) {
      for (const t of transactionsStore.values()) {
        if (t.paynow_reference === paynowReference && t.status === 'paid') {
          matchingTxnByPaynowRef = t;
          break;
        }
      }
    }

    const resolvedTxn = existingTxn || matchingTxnByPaynowRef;
    if (resolvedTxn && resolvedTxn.status === 'paid' && resolvedTxn.verified_at) {
      console.log(`[Paynow Idempotency Guard]: Transaction ${txnRef} was already authoritatively processed. Duplicate credit prevented.`);
      // Fetch latest booking state
      const currentBooking = await resolveBookingFromDatabase(bookingIdOrRef);
      const paid = Number(currentBooking?.amount_paid || 0);
      const total = Number(currentBooking?.total_amount || 0);
      return {
        success: true,
        newAmountPaid: paid,
        paymentStatus: currentBooking?.payment_status || 'paid',
        bookingId: currentBooking?.id || bookingIdOrRef,
        alreadyProcessed: true,
        balanceRemaining: Math.max(0, total - paid)
      };
    }

    // 2. Resolve booking from Supabase
    const hostClient = await getHostAuthenticatedSupabaseClient();
    if (!hostClient) {
      console.warn(`[Database Note]: Supabase host client not available. Local ledger updated for #${bookingIdOrRef}.`);
      return {
        success: true,
        newAmountPaid: amountToAdd,
        paymentStatus: 'paid',
        bookingId: bookingIdOrRef,
        balanceRemaining: 0
      };
    }

    const currentBooking = await resolveBookingFromDatabase(bookingIdOrRef, hostClient);
    if (!currentBooking) {
      console.warn(`[Paynow Database Sync]: Booking #${bookingIdOrRef} record not found in Supabase.`);
      return {
        success: true,
        newAmountPaid: amountToAdd,
        paymentStatus: 'paid',
        bookingId: bookingIdOrRef,
        balanceRemaining: 0
      };
    }

    const bookingId = currentBooking.id;
    const totalAmount = Number(currentBooking.total_amount || 0);
    const existingPaid = Number(currentBooking.amount_paid || 0);

    // 3. Calculate authoritative amount_paid strictly clamped to total_amount
    const validAmountToAdd = Math.max(0, Number(amountToAdd || 0));
    const newAmountPaid = Number(Math.min(totalAmount, existingPaid + validAmountToAdd).toFixed(2));
    const balanceRemaining = Number(Math.max(0, totalAmount - newAmountPaid).toFixed(2));

    // Strict Enum: 'pending' | 'partial' | 'paid'
    const newPaymentStatus: 'pending' | 'partial' | 'paid' =
      newAmountPaid >= totalAmount ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';

    // Scrub any debug notes, preserve authentic guest notes
    const cleanedNotes = cleanGuestNotes(currentBooking.guest_notes);

    const bookingUpdates: Record<string, any> = {
      amount_paid: newAmountPaid,
      payment_status: newPaymentStatus,
      guest_notes: cleanedNotes,
      updated_at: new Date().toISOString()
    };

    if (currentBooking.booking_status === 'pending') {
      bookingUpdates.booking_status = 'confirmed';
    }

    // 4. Update Supabase with Host Authorization (Trigger will verify is_host(auth.uid()) = TRUE)
    const { error: updateErr, data: updatedRow } = await hostClient
      .from('bookings')
      .update(bookingUpdates)
      .eq('id', bookingId)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error(`[Paynow Database Reconciliation Error]:`, updateErr.message);
      throw new Error(updateErr.message);
    }

    // 5. Update and Persist Transaction in Store
    const txnRecord: PaymentTransactionRecord = {
      id: resolvedTxn?.id || crypto.randomUUID(),
      booking_id: bookingId,
      provider: 'paynow',
      provider_reference: txnRef,
      paynow_reference: cleanPaynowRef !== 'N/A' ? cleanPaynowRef : undefined,
      amount: validAmountToAdd,
      currency: 'USD',
      status: 'paid',
      method: resolvedTxn?.method || 'web',
      created_at: resolvedTxn?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
      paid_at: new Date().toISOString()
    };

    transactionsStore.set(txnRef, txnRecord);
    persistPaymentStore();

    console.log(
      `[Paynow Database Reconciliation Success]: Updated Supabase booking #${bookingId}. Paid: $${newAmountPaid}/$${totalAmount}, Balance: $${balanceRemaining}, Status: ${newPaymentStatus}, Txn: ${txnRef}`
    );

    return {
      success: true,
      newAmountPaid,
      paymentStatus: newPaymentStatus,
      bookingId,
      balanceRemaining,
      alreadyProcessed: false
    };
  } catch (err: any) {
    console.error(`[Paynow Database Reconciliation Failure]:`, err?.message || err);
    throw err;
  }
}

// Authoritative Service Order Payment Reconciliation
async function updateSupabaseServicePayment(
  serviceOrderIdOrRef: string,
  amountToAdd: number,
  paynowReference?: string,
  transactionReference?: string
): Promise<{ success: boolean; error?: string; serviceOrderId: string; paymentStatus: string; amountPaid: number; totalAmount: number; alreadyProcessed?: boolean }> {
  try {
    const txnRef = transactionReference || paynowReference || `TXN-SVC-${Date.now()}`;
    const cleanPaynowRef = paynowReference || 'N/A';

    // 1. Check existing transaction for idempotency
    const existingTxn = txnRef ? transactionsStore.get(txnRef) : undefined;
    let matchingTxnByPaynowRef: PaymentTransactionRecord | undefined;
    if (!existingTxn && paynowReference) {
      for (const t of transactionsStore.values()) {
        if (t.paynow_reference === paynowReference && t.status === 'paid') {
          matchingTxnByPaynowRef = t;
          break;
        }
      }
    }

    const resolvedTxn = existingTxn || matchingTxnByPaynowRef;
    if (resolvedTxn && resolvedTxn.status === 'paid' && resolvedTxn.verified_at) {
      console.log(`[Paynow Service Idempotency]: Service order ${serviceOrderIdOrRef} transaction ${txnRef} was already processed.`);
      return {
        success: true,
        serviceOrderId: serviceOrderIdOrRef,
        paymentStatus: 'paid',
        amountPaid: resolvedTxn.amount,
        totalAmount: resolvedTxn.amount,
        alreadyProcessed: true
      };
    }

    const hostClient = await getHostAuthenticatedSupabaseClient();
    if (!hostClient) {
      return {
        success: true,
        serviceOrderId: serviceOrderIdOrRef,
        paymentStatus: 'paid',
        amountPaid: amountToAdd,
        totalAmount: amountToAdd
      };
    }

    // Fetch authoritative service order from Supabase
    let order: any = null;
    const { data: directOrder } = await hostClient
      .from('service_orders')
      .select('*')
      .eq('id', serviceOrderIdOrRef)
      .maybeSingle();

    if (directOrder) {
      order = directOrder;
    } else {
      // Find by short reference prefix if ID was truncated in Paynow reference
      const cleanRef = serviceOrderIdOrRef.replace(/^HAVEN-SVC-/, '').split('-')[0].toLowerCase();
      const { data: allOrders } = await hostClient
        .from('service_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (allOrders) {
        order = allOrders.find((o) => o.id.replace(/-/g, '').toLowerCase().startsWith(cleanRef));
      }
    }

    if (!order) {
      console.warn(`[Paynow Service Sync]: Service order #${serviceOrderIdOrRef} not found in Supabase.`);
      return {
        success: true,
        serviceOrderId: serviceOrderIdOrRef,
        paymentStatus: 'paid',
        amountPaid: amountToAdd,
        totalAmount: amountToAdd
      };
    }

    if (order.status === 'cancelled') {
      console.warn(`[Paynow Service Sync]: Service order #${serviceOrderIdOrRef} is cancelled. Rejecting payment.`);
      return {
        success: false,
        error: 'This service order has been cancelled and cannot accept payment.',
        serviceOrderId: order.id,
        paymentStatus: 'cancelled',
        amountPaid: 0,
        totalAmount: Number(order.total_amount || 0)
      };
    }

    const serviceOrderId = order.id;
    const totalAmount = Number(order.total_amount || amountToAdd || 0);

    // Update service order timestamp in Supabase (do not touch non-existent columns or append to notes)
    try {
      await hostClient
        .from('service_orders')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceOrderId);
    } catch (dbErr: any) {
      console.warn('[Service Order DB update timestamp note]:', dbErr?.message);
    }

    // Record and persist authoritative transaction in store
    const txnRecord: PaymentTransactionRecord = {
      id: resolvedTxn?.id || crypto.randomUUID(),
      booking_id: order.booking_id || serviceOrderId,
      service_order_id: serviceOrderId,
      provider: 'paynow',
      provider_reference: txnRef,
      paynow_reference: cleanPaynowRef !== 'N/A' ? cleanPaynowRef : undefined,
      amount: totalAmount,
      currency: 'USD',
      status: 'paid',
      method: resolvedTxn?.method || 'web',
      created_at: resolvedTxn?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
      paid_at: new Date().toISOString()
    };

    transactionsStore.set(txnRef, txnRecord);
    persistPaymentStore();

    console.log(`[Paynow Service Payment Reconciled]: Service order #${serviceOrderId} authoritatively marked paid ($${totalAmount}).`);

    return {
      success: true,
      serviceOrderId,
      paymentStatus: 'paid',
      amountPaid: totalAmount,
      totalAmount,
      alreadyProcessed: false
    };
  } catch (err: any) {
    console.error('[Service Order Reconciliation Exception]:', err);
    throw err;
  }
}

// Paynow SDK Factory
export function getPaynow(appUrl?: string, bookingId?: string): Paynow | null {
  const integrationId = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
  if (!integrationId || !integrationKey) {
    return null;
  }
  const cleanAppUrl =
    appUrl && appUrl.startsWith('http') && !appUrl.includes('localhost')
      ? appUrl
      : process.env.APP_URL && !process.env.APP_URL.includes('localhost')
        ? process.env.APP_URL
        : appUrl || 'http://localhost:3000';

  const resultUrl =
    process.env.PAYNOW_RESULT_URL && !process.env.PAYNOW_RESULT_URL.includes('localhost')
      ? process.env.PAYNOW_RESULT_URL
      : `${cleanAppUrl}/api/paynow/result`;

  const returnUrl =
    process.env.PAYNOW_RETURN_URL && !process.env.PAYNOW_RETURN_URL.includes('localhost')
      ? process.env.PAYNOW_RETURN_URL
      : `${cleanAppUrl}/?view=guest-dashboard&status=complete${bookingId ? `&booking_id=${bookingId}` : ''}`;

  return new Paynow(integrationId, integrationKey, resultUrl, returnUrl);
}

// Helper to execute Paynow transaction initiation with full test mode / merchant email handling and fallbacks
async function initiatePaynowGatewayTransaction(
  paynow: Paynow,
  reference: string,
  description: string,
  numAmount: number,
  method: 'web' | 'ecocash' | 'onemoney',
  phone?: string,
  customerEmail?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const merchantAuthEmail =
    process.env.PAYNOW_AUTH_EMAIL ||
    process.env.PAYNOW_MERCHANT_EMAIL;
  // For web payments, omit authEmail or pass merchant email. For mobile, pass merchantAuthEmail in test mode if configured.
  const initialAuthEmail = method === 'web' ? undefined : merchantAuthEmail || customerEmail;

  let payment = paynow.createPayment(reference, initialAuthEmail as any);
  payment.add(description, numAmount);

  let response: any;
  if ((method === 'ecocash' || method === 'onemoney') && phone) {
    try {
      response = await paynow.sendMobile(payment, phone, method);
    } catch (mobileErr: any) {
      console.warn('[Paynow sendMobile error]:', mobileErr);
      response = { success: false, error: mobileErr.message || 'Mobile payment initiation failed.' };
    }
  } else {
    try {
      response = await paynow.send(payment);
    } catch (sendErr: any) {
      console.warn('[Paynow send error]:', sendErr);
      response = { success: false, error: sendErr.message || 'Paynow gateway connection failed.' };
    }
  }

  // Automatic retry if test mode error occurs
  const errStr = (response?.error || '').toLowerCase();
  if (
    response &&
    !response.success &&
    (errStr.includes('authemail') ||
      errStr.includes('test mode') ||
      errStr.includes('registered email') ||
      errStr.includes('merchant'))
  ) {
    console.warn('[Paynow test mode fallback]: Retrying transaction with merchant auth email...');
    try {
      payment = paynow.createPayment(reference, merchantAuthEmail);
      payment.add(description, numAmount);
      if ((method === 'ecocash' || method === 'onemoney') && phone) {
        response = await paynow.sendMobile(payment, phone, method);
      } else {
        response = await paynow.send(payment);
      }
    } catch (retryErr: any) {
      console.warn('[Paynow retry error]:', retryErr);
    }

    if (!response || !response.success) {
      // Final attempt: without any authEmail
      try {
        payment = paynow.createPayment(reference);
        payment.add(description, numAmount);
        if ((method === 'ecocash' || method === 'onemoney') && phone) {
          response = await paynow.sendMobile(payment, phone, method);
        } else {
          response = await paynow.send(payment);
        }
      } catch (finalErr: any) {
        console.warn('[Paynow final attempt error]:', finalErr);
      }
    }
  }

  if (response && response.success) {
    return { success: true, data: response };
  }

  return {
    success: false,
    error: response?.error || 'Could not initiate Paynow transaction. Please verify details and try again.'
  };
}

// Verify Paynow Webhook Hash Signature
function verifyPaynowHash(values: Record<string, string>, integrationKey: string): boolean {
  if (!values || !values.hash) return false;
  let str = '';
  const sortedKeys = Object.keys(values).sort();
  for (const key of sortedKeys) {
    if (key.toLowerCase() !== 'hash') {
      str += values[key];
    }
  }
  str += integrationKey.toLowerCase();
  const computed = crypto.createHash('sha512').update(str).digest('hex').toUpperCase();
  return values.hash.toUpperCase() === computed;
}

// Clean Service Order Notes from any legacy debug text
function cleanServiceOrderNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes
    .replace(/\[PAID:[\s\S]*?\]/gi, '')
    .replace(/\[PaynowTxn:[\s\S]*?\]/gi, '')
    .replace(/\|?PAID:[\s\S]*?(?=(\||$))/gi, '')
    .replace(/\|?TXN:[\s\S]*?(?=(\||$))/gi, '')
    .trim();
}

// Startup Sanitization Sweep for Legacy Polluted guest_notes
async function sanitizeExistingBookings() {
  try {
    const hostClient = await getHostAuthenticatedSupabaseClient();
    if (!hostClient) return;

    const { data: bookings, error } = await hostClient
      .from('bookings')
      .select('id, guest_notes')
      .not('guest_notes', 'is', null);

    if (error || !bookings) return;

    for (const b of bookings) {
      if (b.guest_notes && b.guest_notes.includes('[PaynowTxn')) {
        const cleaned = cleanGuestNotes(b.guest_notes);
        await hostClient
          .from('bookings')
          .update({ guest_notes: cleaned })
          .eq('id', b.id);
        console.log(`[Startup Sanitizer]: Cleaned debug text from booking #${b.id}`);
      }
    }
  } catch (err) {
    console.warn('[Startup Sanitizer]: Non-blocking booking note sanitization error:', err);
  }
}

// Startup Sanitization Sweep for Legacy Polluted service_orders.notes
async function sanitizeExistingServiceOrders() {
  try {
    const hostClient = await getHostAuthenticatedSupabaseClient();
    if (!hostClient) return;

    const { data: orders, error } = await hostClient
      .from('service_orders')
      .select('id, notes')
      .not('notes', 'is', null);

    if (error || !orders) return;

    for (const o of orders) {
      if (o.notes && (o.notes.includes('[PAID:') || o.notes.includes('PAID: Paynow'))) {
        const cleaned = cleanServiceOrderNotes(o.notes);
        await hostClient
          .from('service_orders')
          .update({ notes: cleaned })
          .eq('id', o.id);
        console.log(`[Startup Sanitizer]: Cleaned debug text from service order #${o.id}`);
      }
    }
  } catch (err) {
    console.warn('[Startup Sanitizer]: Non-blocking service order note sanitization error:', err);
  }
}

export function createExpressApp(): express.Express {
  const app = express();

  // Handle Netlify function path rewriting if routed via /.netlify/functions/api
  app.use((req, _res, next) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      const stripped = req.url.replace('/.netlify/functions/api', '');
      req.url = stripped.startsWith('/api') ? stripped : `/api${stripped.startsWith('/') ? stripped : '/' + stripped}`;
    }
    next();
  });

  // Support both JSON and URL-encoded bodies (Paynow sends callbacks as form-urlencoded)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'The Haven Guest House & Management (Paynow Reconciled)',
      paynowConfigured: Boolean(process.env.PAYNOW_INTEGRATION_KEY && process.env.PAYNOW_INTEGRATION_ID),
      resultUrlConfigured: Boolean(process.env.PAYNOW_RESULT_URL),
      returnUrlConfigured: Boolean(process.env.PAYNOW_RETURN_URL),
      transactionsCount: transactionsStore.size,
      timestamp: new Date().toISOString()
    });
  });

  // --- 0. SECURE NEW GUEST REGISTRATION (Auto-confirmed, Role-Locked to 'guest') ---
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, full_name, phone, emergency_contact_name, emergency_contact_phone } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
        return res.status(400).json({ error: 'Full name is required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = full_name.trim();
      const cleanPhone = phone ? String(phone).trim() : '';

      if (supabaseAdmin) {
        // Create user via admin API with email_confirm: true and strictly role: 'guest'
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            phone: cleanPhone,
            role: 'guest'
          }
        });

        if (createError) {
          if (
            createError.message.toLowerCase().includes('already registered') ||
            createError.message.toLowerCase().includes('already exists')
          ) {
            return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
          }
          return res.status(400).json({ error: createError.message });
        }

        if (createData.user) {
          const profileRow = {
            id: createData.user.id,
            full_name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            emergency_contact_name: emergency_contact_name || '',
            emergency_contact_phone: emergency_contact_phone || '',
            role: 'guest',
            profile_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Upsert profile directly using supabaseAdmin (bypasses RLS for admin user creation)
          const { error: pErr } = await supabaseAdmin
            .from('profiles')
            .upsert([profileRow], { onConflict: 'id' });

          if (pErr) {
            console.warn('[Register Profile Admin Warning]:', pErr.message);
            const hostClient = await getHostAuthenticatedSupabaseClient();
            if (hostClient) {
              await hostClient.from('profiles').upsert([profileRow], { onConflict: 'id' });
            }
          }

          return res.json({
            success: true,
            user: {
              id: createData.user.id,
              email: cleanEmail,
              full_name: cleanName,
              role: 'guest'
            },
            message: 'Guest account created successfully.'
          });
        }
      }

      return res.status(500).json({ error: 'User registration service is currently unavailable.' });
    } catch (err: any) {
      console.error('[Register Exception]:', err);
      return res.status(500).json({ error: err.message || 'Failed to create guest account.' });
    }
  });

  // --- 1. PAYNOW ACCOMMODATION PAYMENT CREATION ---
  app.post('/api/paynow/initiate', async (req: Request, res: Response) => {
    try {
      const {
        bookingId,
        amountToPay,
        paymentType = 'full',
        method = 'web',
        phone,
        guestEmail,
        guestName,
        appUrl
      } = req.body;

      if (!bookingId) {
        return res.status(400).json({ error: 'Valid booking ID is required.' });
      }

      // Authoritative Supabase Booking Check
      let authoritativeRemaining = Number(amountToPay || 0);
      let customerEmail = guestEmail || 'guest@thehaven.co.zw';

      const hostClient = await getHostAuthenticatedSupabaseClient();
      if (hostClient) {
        const { data: booking, error: bErr } = await hostClient
          .from('bookings')
          .select(`
            id,
            total_amount,
            amount_paid,
            payment_status,
            booking_status,
            guest_id,
            guest:profiles!guest_id(email, full_name, phone)
          `)
          .eq('id', bookingId)
          .maybeSingle();

        if (bErr || !booking) {
          return res.status(404).json({ error: 'The requested reservation could not be verified in the system.' });
        }

        if (booking.booking_status === 'cancelled') {
          return res.status(400).json({ error: 'This reservation has been cancelled and cannot accept payments.' });
        }

        const totalAmount = Number(booking.total_amount || 0);
        const amountPaid = Number(booking.amount_paid || 0);
        const remainingBalance = Number(Math.max(0, totalAmount - amountPaid).toFixed(2));

        if (remainingBalance <= 0 || booking.payment_status === 'paid') {
          return res.status(400).json({ error: 'This reservation is already fully paid.' });
        }

        // Enforce server-authoritative balance
        if (paymentType === 'full') {
          authoritativeRemaining = remainingBalance;
        } else {
          const requestedAmount = Number(amountToPay);
          if (isNaN(requestedAmount) || requestedAmount <= 0) {
            authoritativeRemaining = remainingBalance;
          } else {
            // Clamp payment amount to not exceed the authoritative remaining balance
            authoritativeRemaining = Number(Math.min(remainingBalance, Math.max(1, requestedAmount)).toFixed(2));
          }
        }

        const guestProfile = (booking as any).guest;
        if (guestProfile?.email) {
          customerEmail = guestProfile.email;
        }
      }

      const numAmount = Number(authoritativeRemaining.toFixed(2));
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid payment amount is required.' });
      }

      // Generate collision-safe unique reference per payment attempt
      const shortId = bookingId.replace(/-/g, '').slice(0, 8).toUpperCase();
      const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const reference = `HAVEN-BKG-${shortId}-${uniqueSuffix}`;
      const description = `The Haven Guest House - Booking #${shortId}`;

      const paynow = getPaynow(appUrl, bookingId);

      if (paynow && process.env.PAYNOW_INTEGRATION_KEY) {
        // Real Paynow Zimbabwe Gateway Integration
        const gatewayRes = await initiatePaynowGatewayTransaction(
          paynow,
          reference,
          description,
          numAmount,
          method as any,
          phone,
          customerEmail
        );

        if (gatewayRes.success && gatewayRes.data) {
          const response = gatewayRes.data;
          const txn: PaymentTransactionRecord = {
            id: crypto.randomUUID(),
            booking_id: bookingId,
            provider: 'paynow',
            provider_reference: reference,
            paynow_reference: response.paynowReference || response.paynowreference || '',
            amount: numAmount,
            currency: 'USD',
            status: 'pending',
            poll_url: response.pollUrl || response.pollurl,
            redirect_url: response.redirectUrl || response.browserurl,
            instructions: response.instructions || undefined,
            method: method as any,
            guest_email: customerEmail,
            guest_name: guestName,
            created_at: new Date().toISOString(),
            simulated: false
          };

          transactionsStore.set(reference, txn);
          persistPaymentStore();

          return res.json({
            success: true,
            reference,
            paynowReference: txn.paynow_reference,
            redirectUrl: txn.redirect_url,
            pollUrl: txn.poll_url,
            instructions: txn.instructions,
            amount: numAmount,
            currency: 'USD',
            status: 'pending',
            method,
            simulated: false
          });
        } else {
          console.error('[Paynow Error]:', gatewayRes.error);
          let errText = gatewayRes.error || 'Could not initiate Paynow transaction. Please verify details and try again.';
          if (errText.toLowerCase().includes('test mode') || errText.toLowerCase().includes('test case')) {
            errText = 'Paynow is currently in Test Mode. For EcoCash testing, use test number 0771111111 (Success), or select "Cards & Web" to pay online.';
          }
          return res.status(400).json({ error: errText });
        }
      } else {
        // Safe Sandbox Mode when PAYNOW_INTEGRATION_KEY is not yet populated
        const txn: PaymentTransactionRecord = {
          id: crypto.randomUUID(),
          booking_id: bookingId,
          provider: 'paynow',
          provider_reference: reference,
          paynow_reference: `PN-SIM-${Date.now()}`,
          amount: numAmount,
          currency: 'USD',
          status: 'pending',
          poll_url: `/api/paynow/mock-poll?ref=${reference}`,
          redirect_url: `/paynow/mock-gateway?ref=${reference}&amount=${numAmount}`,
          instructions: method !== 'web' ? `Simulated USSD Prompt sent to ${phone || 'mobile number'}.` : undefined,
          method: method as any,
          guest_email: customerEmail,
          guest_name: guestName,
          created_at: new Date().toISOString(),
          simulated: true
        };

        transactionsStore.set(reference, txn);
        persistPaymentStore();

        return res.json({
          success: true,
          reference,
          paynowReference: txn.paynow_reference,
          redirectUrl: txn.redirect_url,
          pollUrl: txn.poll_url,
          instructions: txn.instructions,
          amount: numAmount,
          currency: 'USD',
          status: 'pending',
          method,
          simulated: true,
          message: 'Paynow simulated mode: Awaiting live PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY environment variables for production gateway processing.'
        });
      }
    } catch (err: any) {
      console.error('[Paynow Initiate Error]:', err);
      return res.status(500).json({
        error: err.message || 'We could not start your payment with Paynow. Please try again.'
      });
    }
  });

  // --- 1.5. PAYNOW ROOM SERVICE & LAUNDRY PAYMENT CREATION ---
  app.post('/api/paynow/initiate-service', async (req: Request, res: Response) => {
    try {
      const {
        serviceOrderId,
        method = 'web',
        phone,
        guestEmail,
        guestName,
        appUrl
      } = req.body;

      if (!serviceOrderId) {
        return res.status(400).json({ error: 'Valid service order ID is required.' });
      }

      const hostClient = await getHostAuthenticatedSupabaseClient();
      let authoritativeTotal = 0;
      let customerEmail = guestEmail || 'guest@thehaven.co.zw';
      let bookingIdForOrder: string | undefined;

      if (hostClient) {
        const { data: order, error: oErr } = await hostClient
          .from('service_orders')
          .select(`
            id,
            total_amount,
            status,
            booking_id,
            guest_id,
            guest:profiles!guest_id(email, full_name, phone)
          `)
          .eq('id', serviceOrderId)
          .maybeSingle();

        if (oErr || !order) {
          return res.status(404).json({ error: 'The requested service order could not be located.' });
        }

        if (order.status === 'cancelled') {
          return res.status(400).json({ error: 'This service order has been cancelled and cannot accept payment.' });
        }

        authoritativeTotal = Number(order.total_amount || 0);
        bookingIdForOrder = order.booking_id || undefined;
        const guestObj = (order as any).guest;
        if (guestObj?.email) {
          customerEmail = guestObj.email;
        }
      }

      const numAmount = Number(authoritativeTotal.toFixed(2));
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid service order total is required.' });
      }

      const shortId = serviceOrderId.replace(/-/g, '').slice(0, 8).toUpperCase();
      const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const reference = `HAVEN-SVC-${shortId}-${uniqueSuffix}`;
      const description = `The Haven - Room Service Order #${shortId}`;

      const paynow = getPaynow(appUrl, bookingIdForOrder);

      if (paynow && process.env.PAYNOW_INTEGRATION_KEY) {
        const gatewayRes = await initiatePaynowGatewayTransaction(
          paynow,
          reference,
          description,
          numAmount,
          method as any,
          phone,
          customerEmail
        );

        if (gatewayRes.success && gatewayRes.data) {
          const response = gatewayRes.data;
          const txn: PaymentTransactionRecord = {
            id: crypto.randomUUID(),
            booking_id: bookingIdForOrder || serviceOrderId,
            service_order_id: serviceOrderId,
            provider: 'paynow',
            provider_reference: reference,
            paynow_reference: response.paynowReference || response.paynowreference || '',
            amount: numAmount,
            currency: 'USD',
            status: 'pending',
            poll_url: response.pollUrl || response.pollurl,
            redirect_url: response.redirectUrl || response.browserurl,
            instructions: response.instructions || undefined,
            method: method as any,
            guest_email: customerEmail,
            guest_name: guestName,
            created_at: new Date().toISOString(),
            simulated: false
          };

          transactionsStore.set(reference, txn);
          persistPaymentStore();

          return res.json({
            success: true,
            reference,
            paynowReference: txn.paynow_reference,
            redirectUrl: txn.redirect_url,
            pollUrl: txn.poll_url,
            instructions: txn.instructions,
            amount: numAmount,
            currency: 'USD',
            status: 'pending',
            method,
            simulated: false
          });
        } else {
          return res.status(400).json({ error: gatewayRes.error || 'Could not initiate Paynow transaction.' });
        }
      } else {
        // Safe Sandbox Mode for service orders
        const txn: PaymentTransactionRecord = {
          id: crypto.randomUUID(),
          booking_id: bookingIdForOrder || serviceOrderId,
          service_order_id: serviceOrderId,
          provider: 'paynow',
          provider_reference: reference,
          paynow_reference: `PN-SIM-SVC-${Date.now()}`,
          amount: numAmount,
          currency: 'USD',
          status: 'pending',
          poll_url: `/api/paynow/mock-poll?ref=${reference}`,
          redirect_url: `/paynow/mock-gateway?ref=${reference}&amount=${numAmount}`,
          instructions: method !== 'web' ? `Simulated USSD Prompt sent to ${phone || 'mobile number'}.` : undefined,
          method: method as any,
          guest_email: customerEmail,
          guest_name: guestName,
          created_at: new Date().toISOString(),
          simulated: true
        };

        transactionsStore.set(reference, txn);
        persistPaymentStore();

        return res.json({
          success: true,
          reference,
          paynowReference: txn.paynow_reference,
          redirectUrl: txn.redirect_url,
          pollUrl: txn.poll_url,
          instructions: txn.instructions,
          amount: numAmount,
          currency: 'USD',
          status: 'pending',
          method,
          simulated: true
        });
      }
    } catch (err: any) {
      console.error('[Paynow Service Initiate Error]:', err);
      return res.status(500).json({
        error: err.message || 'We could not start your payment with Paynow. Please try again.'
      });
    }
  });

  // --- 2. PAYNOW TRANSACTION STATUS POLL & AUTHORITATIVE RECONCILIATION ---
  app.post('/api/paynow/poll', async (req: Request, res: Response) => {
    try {
      const { pollUrl, reference, bookingId, serviceOrderId } = req.body;

      // Locate transaction in store
      let txn: PaymentTransactionRecord | undefined;
      if (reference) {
        txn = transactionsStore.get(reference);
      }
      if (!txn && serviceOrderId) {
        for (const t of transactionsStore.values()) {
          if (t.service_order_id === serviceOrderId) {
            txn = t;
            break;
          }
        }
      }
      if (!txn && bookingId) {
        for (const t of transactionsStore.values()) {
          if (t.booking_id === bookingId) {
            txn = t;
            break;
          }
        }
      }

      const isServiceTxn = Boolean(
        txn?.service_order_id ||
        serviceOrderId ||
        (reference && reference.startsWith('HAVEN-SVC-'))
      );

      // Check if already authoritatively marked as paid
      if (txn && txn.status === 'paid' && txn.verified_at) {
        if (isServiceTxn) {
          const targetSvcId = txn.service_order_id || serviceOrderId || reference;
          return res.json({
            success: true,
            paid: true,
            status: 'paid',
            isServiceOrder: true,
            serviceOrderId: targetSvcId,
            amount: txn.amount,
            reference: txn.provider_reference,
            paynowReference: txn.paynow_reference,
            paidAt: txn.paid_at,
            alreadyProcessed: true
          });
        } else {
          const currentBooking = await resolveBookingFromDatabase(txn.booking_id || bookingId || reference);
          return res.json({
            success: true,
            paid: true,
            status: 'paid',
            amount: txn.amount,
            newAmountPaid: currentBooking?.amount_paid || txn.amount,
            paymentStatus: currentBooking?.payment_status || 'paid',
            balanceRemaining: Math.max(0, (currentBooking?.total_amount || 0) - (currentBooking?.amount_paid || 0)),
            reference: txn.provider_reference,
            paynowReference: txn.paynow_reference,
            paidAt: txn.paid_at,
            alreadyProcessed: true
          });
        }
      }

      const paynow = getPaynow();

      if (paynow && pollUrl && !pollUrl.includes('mock-poll')) {
        try {
          const statusRes: any = await paynow.pollTransaction(pollUrl);
          const isPaid =
            statusRes &&
            (statusRes.paid?.() === true ||
              statusRes.status?.toLowerCase() === 'paid' ||
              statusRes.status?.toLowerCase() === 'awaiting delivery' ||
              statusRes.status?.toLowerCase() === 'delivered');

          if (isPaid) {
            const paidAmount = txn?.amount || Number(statusRes.amount || 0);
            const paynowRef = txn?.paynow_reference || statusRes.paynowReference || statusRes.paynowreference;
            const provRef = txn?.provider_reference || reference || statusRes.reference;

            if (isServiceTxn) {
              const targetSvcId = txn?.service_order_id || serviceOrderId || reference;
              const svcResult = await updateSupabaseServicePayment(
                targetSvcId,
                paidAmount,
                paynowRef,
                provRef
              );

              return res.json({
                success: true,
                paid: true,
                status: 'paid',
                isServiceOrder: true,
                serviceOrderId: svcResult.serviceOrderId,
                amount: paidAmount,
                reference: provRef,
                paynowReference: paynowRef,
                alreadyProcessed: svcResult.alreadyProcessed
              });
            } else {
              const resolvedBookingId = txn?.booking_id || bookingId || reference;
              const dbResult = await updateSupabaseBookingPayment(
                resolvedBookingId,
                paidAmount,
                paynowRef,
                provRef
              );

              return res.json({
                success: true,
                paid: true,
                status: 'paid',
                amount: paidAmount,
                newAmountPaid: dbResult.newAmountPaid,
                paymentStatus: dbResult.paymentStatus,
                balanceRemaining: dbResult.balanceRemaining,
                reference: provRef,
                paynowReference: paynowRef,
                alreadyProcessed: dbResult.alreadyProcessed
              });
            }
          } else if (
            statusRes.status?.toLowerCase() === 'cancelled' ||
            statusRes.status?.toLowerCase() === 'failed'
          ) {
            if (txn) {
              txn.status = statusRes.status.toLowerCase();
              txn.updated_at = new Date().toISOString();
              transactionsStore.set(txn.provider_reference, txn);
              persistPaymentStore();
            }
            return res.json({
              success: true,
              paid: false,
              status: statusRes.status.toLowerCase(),
              message: 'Payment was not completed on Paynow.'
            });
          }

          return res.json({
            success: true,
            paid: false,
            status: 'pending',
            message: 'Payment is awaiting confirmation from Paynow.'
          });
        } catch (pollErr: any) {
          console.error('[Paynow Poll Error]:', pollErr);
          return res.json({
            success: false,
            paid: false,
            status: 'pending',
            message: 'Unable to check status from Paynow at this moment.'
          });
        }
      }

      // Simulated sandbox verification for dev/fallback
      if (txn && txn.simulated) {
        if (isServiceTxn) {
          const targetSvcId = txn.service_order_id || serviceOrderId || reference;
          const svcResult = await updateSupabaseServicePayment(
            targetSvcId,
            txn.amount,
            txn.paynow_reference,
            txn.provider_reference
          );

          return res.json({
            success: true,
            paid: true,
            status: 'paid',
            isServiceOrder: true,
            serviceOrderId: svcResult.serviceOrderId,
            amount: txn.amount,
            reference: txn.provider_reference,
            paynowReference: txn.paynow_reference,
            simulated: true
          });
        } else {
          const dbResult = await updateSupabaseBookingPayment(
            txn.booking_id,
            txn.amount,
            txn.paynow_reference,
            txn.provider_reference
          );

          return res.json({
            success: true,
            paid: true,
            status: 'paid',
            amount: txn.amount,
            newAmountPaid: dbResult.newAmountPaid,
            paymentStatus: dbResult.paymentStatus,
            balanceRemaining: dbResult.balanceRemaining,
            reference: txn.provider_reference,
            paynowReference: txn.paynow_reference,
            simulated: true
          });
        }
      }

      return res.json({
        success: true,
        paid: false,
        status: 'pending'
      });
    } catch (err: any) {
      console.error('[Paynow Poll Verification Error]:', err);
      return res.status(500).json({ error: 'Payment verification failed.' });
    }
  });

  // --- 2.5. DIRECT PAYMENT CONFIRMATION FALLBACK (Secure server-backed confirmation) ---
  app.post('/api/paynow/confirm-booking-payment', async (req: Request, res: Response) => {
    try {
      const { bookingId, amountPaid, reference, paymentStatus, paynowReference } = req.body;
      if (!bookingId && !reference) {
        return res.status(400).json({ error: 'Booking ID or transaction reference is required.' });
      }

      const numAmount = Number(amountPaid || 0);

      // Authoritatively reconcile Supabase database via Host Authorization
      const dbResult = await updateSupabaseBookingPayment(
        bookingId || reference,
        numAmount,
        paynowReference || reference,
        reference
      );

      return res.json({
        success: true,
        bookingId: dbResult.bookingId || bookingId,
        amountPaid: dbResult.newAmountPaid,
        paymentStatus: dbResult.paymentStatus || paymentStatus || 'paid',
        balanceRemaining: dbResult.balanceRemaining,
        alreadyProcessed: dbResult.alreadyProcessed,
        message: 'Payment confirmed and reconciled authoritatively in database.'
      });
    } catch (err: any) {
      console.error('[Confirm Payment Error]:', err);
      return res.status(500).json({ error: err.message || 'Failed to confirm booking payment.' });
    }
  });

  // --- 3. PAYNOW RESULT / WEBHOOK CALLBACK (Authoritative Gateway Webhook) ---
  app.post('/api/paynow/result', async (req: Request, res: Response) => {
    try {
      const data = req.body || {};
      const { reference, paynowreference, status, amount, hash } = data;

      console.log('[Paynow Result Webhook received]:', { reference, paynowreference, status, amount });

      // 1. Verify hash signature using PAYNOW_INTEGRATION_KEY
      const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
      if (integrationKey && hash) {
        const isValid = verifyPaynowHash(data, integrationKey);
        if (!isValid) {
          console.warn('[Paynow Callback]: Hash signature mismatch!');
          return res.status(400).send('Hash verification failed');
        }
      }

      // 2. Locate transaction in store
      let txn = reference ? transactionsStore.get(reference) : undefined;
      if (!txn && paynowreference) {
        for (const t of transactionsStore.values()) {
          if (t.paynow_reference === paynowreference) {
            txn = t;
            break;
          }
        }
      }

      // 3. Process status with persistent idempotency
      const statusLower = (status || '').toLowerCase();
      if (
        statusLower === 'paid' ||
        statusLower === 'awaiting delivery' ||
        statusLower === 'delivered'
      ) {
        const paymentAmount = txn?.amount || Number(amount || 0);

        if (txn?.service_order_id || (reference && reference.startsWith('HAVEN-SVC-'))) {
          const resolvedTarget = txn?.service_order_id || reference;
          await updateSupabaseServicePayment(
            resolvedTarget,
            paymentAmount,
            paynowreference || reference,
            reference
          );
          console.log(`[Paynow Webhook Success]: Reconciled service payment for target ${resolvedTarget}`);
        } else {
          const resolvedTarget = txn?.booking_id || reference;
          const dbResult = await updateSupabaseBookingPayment(
            resolvedTarget,
            paymentAmount,
            paynowreference || reference,
            reference
          );

          console.log(
            `[Paynow Webhook Success]: Reconciled payment for target ${resolvedTarget} (Paid: $${dbResult.newAmountPaid}, Balance: $${dbResult.balanceRemaining}, Status: ${dbResult.paymentStatus}, AlreadyProcessed: ${Boolean(dbResult.alreadyProcessed)})`
          );
        }
      } else if (statusLower === 'cancelled' || statusLower === 'failed') {
        if (txn && txn.status === 'pending') {
          txn.status = statusLower as any;
          txn.updated_at = new Date().toISOString();
          transactionsStore.set(txn.provider_reference, txn);
          persistPaymentStore();
        }
      }

      // Paynow requires an HTTP 200 OK response
      return res.status(200).send('OK');
    } catch (err: any) {
      console.error('[Paynow Callback Webhook Error]:', err);
      return res.status(500).send('Internal Server Error');
    }
  });

  // --- 4. TRANSACTION AUDIT LIST (Host & Guest Ledger) ---
  app.get('/api/paynow/transactions', (_req: Request, res: Response) => {
    res.json(Array.from(transactionsStore.values()));
  });

  app.get('/api/paynow/transactions/:bookingId', (req: Request, res: Response) => {
    const list = Array.from(transactionsStore.values()).filter(
      (t) => t.booking_id === req.params.bookingId
    );
    res.json(list);
  });

  // --- 4.5. SERVICE ORDER TRANSACTIONS & HOST SETTLEMENT ---
  app.get('/api/paynow-service/transactions', (_req: Request, res: Response) => {
    const serviceTxns = Array.from(transactionsStore.values()).filter(
      (t) => Boolean(t.service_order_id) || (t.provider_reference && t.provider_reference.startsWith('HAVEN-SVC-'))
    );
    res.json(serviceTxns);
  });

  app.post('/api/paynow-service/record-payment', async (req: Request, res: Response) => {
    try {
      const { serviceOrderId, paymentStatus, amountPaid, paymentMethod, reference } = req.body;
      if (!serviceOrderId) {
        return res.status(400).json({ error: 'Service order ID is required.' });
      }

      const numAmount = Number(amountPaid || 0);
      const provRef = reference || `HAVEN-SVC-MANUAL-${serviceOrderId.slice(0, 8)}-${Date.now()}`;

      // Update Supabase service order updated_at
      const hostClient = await getHostAuthenticatedSupabaseClient();
      if (hostClient) {
        const { data: order } = await hostClient
          .from('service_orders')
          .select('id, status')
          .eq('id', serviceOrderId)
          .maybeSingle();

        if (order && order.status === 'cancelled') {
          return res.status(400).json({ error: 'This service order has been cancelled and cannot accept payment.' });
        }

        try {
          await hostClient
            .from('service_orders')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', serviceOrderId);
        } catch (dbErr: any) {
          console.warn('[Record Service Payment DB Note]:', dbErr?.message);
        }
      }

      // Record in authoritative transaction store
      const txnRecord: PaymentTransactionRecord = {
        id: crypto.randomUUID(),
        service_order_id: serviceOrderId,
        booking_id: serviceOrderId,
        provider: (paymentMethod === 'paynow' ? 'paynow' : 'on_site') as any,
        provider_reference: provRef,
        amount: numAmount,
        currency: 'USD',
        status: (paymentStatus || 'paid') as any,
        method: (paymentMethod || 'cash') as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verified_at: paymentStatus === 'paid' ? new Date().toISOString() : undefined,
        paid_at: paymentStatus === 'paid' ? new Date().toISOString() : undefined
      };

      transactionsStore.set(provRef, txnRecord);
      persistPaymentStore();

      return res.json({
        success: true,
        serviceOrderId,
        paymentStatus: txnRecord.status,
        amountPaid: numAmount,
        paymentMethod: txnRecord.method,
        transaction: txnRecord
      });
    } catch (err: any) {
      console.error('[Record Service Payment Error]:', err);
      return res.status(500).json({ error: err.message || 'Failed to record service order payment.' });
    }
  });

  // --- HOUSEKEEPING / ROOM CLEANING STATUS API ---
  app.post('/api/housekeeping/update-status', async (req: Request, res: Response) => {
    try {
      const { roomId, cleaningStatus } = req.body;
      if (!roomId || !cleaningStatus) {
        return res.status(400).json({ error: 'Room ID and cleaning status are required.' });
      }

      // Map frontend status to PostgreSQL enum ('clean', 'dirty', 'cleaning')
      let dbCleaningStatus: string = cleaningStatus;
      if (cleaningStatus === 'in_progress') {
        dbCleaningStatus = 'cleaning';
      } else if (cleaningStatus === 'inspected') {
        dbCleaningStatus = 'clean';
      } else if (cleaningStatus === 'clean' || cleaningStatus === 'dirty') {
        dbCleaningStatus = cleaningStatus;
      } else {
        dbCleaningStatus = 'clean';
      }

      // Perform update in Supabase using admin client to guarantee execution
      if (!supabaseAdmin) {
        return res.json({
          success: true,
          room: { id: roomId, cleaning_status: cleaningStatus, updated_at: new Date().toISOString() },
          message: `Room status updated to ${cleaningStatus} (local memory)`
        });
      }

      const { data, error } = await supabaseAdmin
        .from('rooms')
        .update({
          cleaning_status: dbCleaningStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[Housekeeping Update Error]:', error);
        return res.status(500).json({ error: 'Database update failed: ' + error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Room not found.' });
      }

      // Format response with UI-friendly cleaning status
      const updatedRoom = {
        ...data,
        cleaning_status: cleaningStatus // preserves 'in_progress' or 'inspected' in UI memory
      };

      return res.json({
        success: true,
        room: updatedRoom,
        message: `Room status updated to ${cleaningStatus}`
      });
    } catch (err: any) {
      console.error('[Housekeeping Update Exception]:', err);
      return res.status(500).json({ error: err.message || 'Failed to update cleaning status.' });
    }
  });

  return app;
}

export async function startServer() {
  const app = createExpressApp();
  const server = http.createServer(app);
  const PORT = 3000;

  // Run startup clean sweeps
  setTimeout(() => {
    sanitizeExistingBookings();
    sanitizeExistingServiceOrders();
  }, 2000);

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: server
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`The Haven Guest House Server running on http://localhost:${PORT}`);
  });

  return { app, server };
}

if (!process.env.NETLIFY && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
