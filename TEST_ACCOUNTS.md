# The Haven Guest House — Test & Demonstration Accounts Guide

This document provides a reference for testing and evaluating **The Haven Guest House** across all three role-based operational personas: **Guest**, **Host (Administrator)**, and **Housekeeping (Cleaning Staff)**.

---

## 1. Demo Accounts Summary

| Account / Persona | Role Identifier | Verified Email | Account Purpose |
| :--- | :--- | :--- | :--- |
| **Resident Guest Demo** | `guest` | `tawanda.moyo@gmail.com` | Active stay booking, in-room dining, laundry orders, guest folio, room tab |
| **Upcoming Guest Demo** | `guest` | `ruvimbo.c@outlook.com` | Pre-arrival reservation, Paynow accommodation settlement, availability test |
| **Host / Owner Demo** | `host` | `pangwanabervely@gmail.com` | Front desk operations, arrival check-in, checkout balance gate, financial audit |
| **Housekeeping Demo** | `cleaning_staff` | `chipo.housekeeping@example.com` / `housekeeping@thehaven.co.zw` | Dedicated mobile cleaning portal, room sanitation turnaround, inspection alerts |

> **Password Security Notice**: Test account passwords configured in private Supabase authentication instances are set separately and are not stored in the public repository. For local development, new guest accounts can also be freely registered via the **Sign In / Register** modal, and staff can log in using their provisioned administrative credentials.

---

## 2. Security Warning

> **CRITICAL SECURITY GUIDELINE**
>
> NEVER commit production credentials, secret keys, or live API tokens into this or any other repository file.
>
> This repository strictly excludes:
> - Supabase `service_role` secrets
> - Supabase administrative database passwords
> - Paynow `PAYNOW_INTEGRATION_KEY` and merchant secrets
> - Google Gemini API keys
> - Production user passwords or private personal identification data

---

## 3. Role-Specific Test Accounts

---

### Guest Test Account

- **Role**: `guest`
- **Primary Persona**: Tawanda Moyo (`tawanda.moyo@gmail.com`) / Ruvimbo Chiweshe (`ruvimbo.c@outlook.com`)
- **Password**: Set separately / not stored in the repository

#### Tested Capabilities:
- **Authentication**: Guest self-registration, login, profile data update, and session restoration.
- **Suite Showcase & Availability**: Browse rooms, filter by capacity and suite tier, and verify real-time calendar availability.
- **Reservation Creation**: Make new multi-night bookings with guest count and special requests.
- **Accommodation Payments**: Initiate and simulate Paynow mobile money / card settlement for room charges.
- **Checked-In Sanctuary Hub**:
  - Access in-room Wi-Fi credentials, air conditioning, and smart TV instructions.
  - Direct real-time chat with the host/concierge.
  - Browse curated Harare dining and attractions recommendations.
- **In-Room Dining & Laundry**:
  - Place room service orders (Breakfast, Meals, Snacks, Beverages, Laundry).
  - Select **Pay Now** (via Paynow) or **Add to Room Tab** (charged to folio).
- **Housekeeping Service Requests**: Request room sanitization directly from the stay dashboard (available once checked in).
- **Consolidated Financial Folio**: Real-time review of accommodation charges, service orders, payments recorded, and balance due.
- **Stay Checkout**: Complete departure checkout once all balances are settled to $0.00.
- **Guest Feedback**: Submit post-stay ratings and reviews.

---

### Host / Front Desk Test Account

- **Role**: `host`
- **Primary Persona**: Bervely Pangwana (`pangwanabervely@gmail.com`)
- **Password**: Set separately / not stored in the repository

#### Tested Capabilities:
- **Host Operations Dashboard**: Review property metrics, daily revenue, active occupancy, cleaning queue, and pending orders.
- **Reservation Lifecycle Management**:
  - Search, filter, and inspect guest reservations.
  - Execute **Check-In** on or after scheduled arrival dates.
  - Execute **Check-Out** with mandatory zero-balance folio enforcement.
- **Financial Audit & Folio Reconciliations**:
  - View itemized accommodation fees vs. service order charges.
  - Record direct payments and view Paynow gateway transaction references.
  - Audit unpaid room tabs and pending balances.
- **Room Inventory & Rate Control**:
  - Update suite pricing and amenity descriptions.
  - Toggle operational room statuses (`available`, `occupied`, `maintenance`, `cleaning`).
- **Housekeeping Inspection**:
  - Review cleaned rooms submitted by housekeeping.
  - Advance status to `inspected` or mark ready for check-in.
- **Service Order Fulfillment**:
  - Track in-room dining and laundry requests in real-time.
  - Advance order status: `pending` &rarr; `in_progress` &rarr; `completed` &rarr; `cancelled`.
- **Guest Messaging**: Read and respond to guest inquiries from the host communication hub.
- **Recharts Analytics**: View visual breakdowns of monthly revenue, occupancy rates, and service category distributions.

---

### Housekeeping Test Account

- **Role**: `cleaning_staff`
- **Primary Persona**: Chipo Sithole (`chipo.housekeeping@example.com` / `housekeeping@thehaven.co.zw`)
- **Password**: Set separately / not stored in the repository *(Development helper: `Staff123!`)*

#### Tested Capabilities:
- **Dedicated Staff Portal**: Accessible directly via the **Housekeeping Staff Access** navigation link.
- **Turnaround Queue Management**:
  - View all suites flagged as `dirty` (following guest checkouts or guest-initiated cleaning requests).
  - Update cleaning status to `in_progress` when turnover begins.
  - Mark rooms `clean` upon completion of sanitization protocol.
- **Urgent Turnover Alerts**: Filter priority suites requiring immediate turnaround for same-day arrivals.
- **Role Isolation & Data Privacy**:
  - Housekeeping staff have **zero access** to guest payment data, folio accounting, room rates, or financial reports.
  - Housekeeping personnel receive only room-turnaround and cleaning task notifications.

---

## 4. Role & Feature Access Matrix

| Feature / Operational Capability | Guest (`guest`) | Host (`host`) | Housekeeping (`cleaning_staff`) |
| :--- | :---: | :---: | :---: |
| **User Sign In & Profile Management** | ✓ | ✓ | ✓ |
| **Browse Suites & Calendar Availability** | ✓ | ✓ | — |
| **Create Suite Reservation** | ✓ | ✓ | — |
| **Pay Accommodation via Paynow** | ✓ | ✓ *(Record)* | — |
| **Order In-Room Dining (Checked-In Only)** | ✓ | ✓ *(Fulfill)* | — |
| **Order Laundry Services (Checked-In Only)**| ✓ | ✓ *(Fulfill)* | — |
| **Charge Orders to Room Tab** | ✓ | ✓ | — |
| **Perform Guest Check-In** | — | ✓ | — |
| **Perform Guest Check-Out (Balance Gated)** | — | ✓ | — |
| **Request Room Cleaning** | ✓ *(Checked-In)*| ✓ | — |
| **Update Room Turnover (`dirty` &rarr; `clean`)** | — | ✓ | ✓ |
| **Execute Host Room Quality Inspection** | — | ✓ | — |
| **View Financial Reports & Folio Audits** | — | ✓ | — |
| **View Personal Guest Folio** | ✓ | ✓ | — |
| **Guest Direct Messaging** | ✓ | ✓ | — |
| **Turnover & Cleaning Task Notifications** | — | ✓ | ✓ |
| **Financial & Payment Notifications** | ✓ | ✓ | — |

---

## 5. Recommended End-to-End Test Workflow

Follow this 3-phase test plan to evaluate the entire guest lifecycle and operational workflow:

```
    PHASE 1: GUEST BOOKING & STAY
    ┌───────────────────────────┐
    │ 1. Sign in as Guest       │
    │ 2. Select Suite & Dates   │
    │ 3. Pay via Paynow         │
    │ 4. Order Food & Laundry   │
    │ 5. Request Room Cleaning  │
    └─────────────┬─────────────┘
                  │
                  ▼
    PHASE 2: HOUSEKEEPING TURNOVER
    ┌───────────────────────────┐
    │ 6. Sign in as Cleaning    │
    │ 7. Claim Dirty Suite Task │
    │ 8. Mark Room 'clean'      │
    └─────────────┬─────────────┘
                  │
                  ▼
    PHASE 3: HOST AUDIT & CHECKOUT
    ┌───────────────────────────┐
    │ 9. Sign in as Host        │
    │ 10. Inspect Cleaned Suite │
    │ 11. Settle Room Tab Folio │
    │ 12. Complete Check-Out    │
    └───────────────────────────┘
```

### Phase 1 — Guest (Reservation & In-Stay Experience)
1. Navigate to the landing page and sign in as **Guest** (`tawanda.moyo@gmail.com`).
2. Browse the **Suites Catalog**, select the **Executive Suite**, and open room details.
3. Select an upcoming arrival and departure date range in the **Booking Calendar**.
4. Confirm the reservation and proceed to the **Paynow Accommodation Payment** modal.
5. Settle or verify the booking status is `confirmed`.
6. Once the reservation is checked in (see Phase 3), navigate to the **Active Stay Welcome Hub**.
7. Open **Room Service**, add a *Full English Breakfast* and an *Executive Shirt Pressing* laundry order.
8. Choose **Add to Room Tab** to bill to the stay folio.
9. Place an additional beverage order and select **Pay Now** to test direct Paynow settlement.
10. Click **Request Room Cleaning** from the stay dashboard and confirm the housekeeping request.
11. View the **Guest Folio** tab to verify that accommodation fees, paid services, and room tab charges are correctly aggregated into the outstanding balance.

### Phase 2 — Housekeeping (Turnover & Sanitation)
1. Sign out and click **Housekeeping Staff Access** (or navigate to `/` and sign in as `chipo.housekeeping@example.com`).
2. Verify that the dashboard displays active turnaround tasks without exposing any room prices or guest payment amounts.
3. Locate the suite that requested cleaning in Phase 1 (status: `dirty`).
4. Click **Start Cleaning** to transition the suite to `in_progress`.
5. Click **Mark Clean** to conclude sanitation protocol and transition status to `clean`.
6. Verify the housekeeping notification dispatch.

### Phase 3 — Host (Operations, Inspection & Checkout)
1. Sign out and sign in as **Host** (`pangwanabervely@gmail.com`).
2. In **Housekeeping & Readiness**, locate the cleaned suite and click **Inspect & Mark Ready** to advance status to `inspected`.
3. In **Room Service Management**, view the active dining and laundry orders and advance them to `completed`.
4. In **Bookings Management**, inspect the guest's folio:
   - Verify that all completed room-tab service items appear in the folio balance.
   - Attempt to execute **Check-Out** while the Room Tab is unpaid &rarr; *Verify checkout is blocked by the balance gate*.
5. Record or verify payment for the outstanding Room Tab via Paynow or front-desk settlement until balance equals `$0.00`.
6. Execute **Check-Out** &rarr; *Verify checkout completes successfully and the room is automatically queued as `dirty` for the next turnaround*.

---

## 6. Business-Rule & Edge-Case Test Scenarios

The Haven Guest House enforces strict operational integrity constraints. Use these scenarios to verify automated protections:

### Test 1 — Service Order Prior to Check-In
- **Condition**: Sign in as a guest with a `confirmed` (but not yet checked-in) reservation.
- **Action**: Navigate to **Room Service** and attempt to add menu items or open the cart.
- **Expected Outcome**: Ordering is blocked; a notice clearly informs the guest that room dining and laundry services unlock upon physical check-in.

### Test 2 — Cleaning Request Prior to Check-In
- **Condition**: A guest with an upcoming or unchecked-in reservation attempts to request housekeeping.
- **Action**: Click the cleaning request button.
- **Expected Outcome**: The request is rejected with an informative notice; cleaning requests are strictly tied to checked-in stays.

### Test 3 — Early Arrival Check-In Guard
- **Condition**: Sign in as Host and locate a confirmed reservation whose `check_in_date` is scheduled for tomorrow or a future date.
- **Action**: Click **Check-In Guest**.
- **Expected Outcome**: Check-in is blocked; the system informs the host that check-in cannot precede the scheduled arrival date.

### Test 4 — Outstanding Balance Checkout Gate
- **Condition**: A checked-in guest has an unpaid accommodation balance or active room-tab service orders ($ balance > $0.00).
- **Action**: Host attempts to execute **Check-Out**.
- **Expected Outcome**: Check-out is blocked; an alert specifies the exact remaining balance that must be settled before key return and departure.

### Test 5 — Failed Paynow Payment Isolation
- **Condition**: Guest initiates a room-service order with **Pay Now** mode, but the Paynow transaction fails or is cancelled.
- **Action**: Inspect the order in the guest dashboard and host room service queue.
- **Expected Outcome**: The order remains flagged as `failed`/`unpaid` and is **never** automatically converted into a room-tab obligation without the guest's explicit choice.

### Test 6 — Cancelled Order Balance Exclusion
- **Condition**: A room service order is cancelled by the guest or host.
- **Action**: Inspect the guest's financial folio and departure checkout balance.
- **Expected Outcome**: The cancelled order's monetary value is completely excluded from the folio balance and does not block checkout.

---

## 7. Relationship with README

For full architectural blueprints, entity-relationship diagrams, deployment instructions, technology stack details, and Paynow webhook documentation, see **[README.md](./README.md)**.
