# Architecture & Data Flow Diagrams

## 1. Booking Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BOOKING LIFECYCLE MANAGEMENT                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   [PENDING] ◄─────── Customer Creates Booking                       │
│       │                                                               │
│       │ Vendor Confirms                                              │
│       ├──────────────► [CONFIRMED]                                   │
│       │                   │                                           │
│       │                   │ Earnings Recorded ─► settlement_trans    │
│       │                   │ Wallet Updated ──────► vendor_wallets    │
│       │                   │ confirmed_at ────────► timestamp         │
│       │                   │                                           │
│       │                   │ Vendor Completes                          │
│       │                   ├──────────────► [COMPLETED]               │
│       │                   │                   │                       │
│       │                   │                   │ Customer Can Review   │
│       │                   │                   ├──────────► reviews    │
│       │                   │                   │ Rating Updated ──────► 
│       │                   │                   │            vendor_rating_summary
│       │                   │                   │ Notification ────────► notifications
│       │                   │                   │ (booking_completed)    
│       │                   │                                           │
│       │ Customer/Admin Cancels                                        │
│       ├─────────────► [CANCELLED]                                     │
│       │ (pending only)      │                                         │
│       │                    │ Notification sent                        │
│       │                    │ (booking_cancelled)                      │
│       │                    └──────────► notifications                 │
│       │                    │                                           │
│       │ Admin Cancels                                                 │
│       ├──────────────► [CANCELLED]                                    │
│       │ (any status)       │                                          │
│       │                    │ Refund Handling (optional)               │
│       │                    └──────────► transactions                  │
│       │                                                               │
│       │                                                               │
│       └───── ✗ End State (No More Changes)                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Vendor Earnings & Settlement Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              VENDOR WALLET & SETTLEMENT PIPELINE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   BOOKING CONFIRMED                                              │
│   ├─ total_amount: ₹10,000                                       │
│   ├─ commission_rate: 15%                                        │
│   └─ calculated at THIS MOMENT (locked permanently)              │
│        │                                                          │
│        ├──► record_booking_earnings() [SQL Function]            │
│        │    │                                                    │
│        │    ├─→ Calculate Commission = ₹10,000 × 15% = ₹1,500  │
│        │    ├─→ Calculate Net = ₹10,000 - ₹1,500 = ₹8,500      │
│        │    │                                                    │
│        │    └─→ Create settlement_transaction                   │
│        │        ├─ vendor_id                                     │
│        │        ├─ booking_id                                    │
│        │        ├─ transaction_type: booking_earnings            │
│        │        ├─ gross: ₹10,000                                │
│        │        ├─ commission: ₹1,500                            │
│        │        ├─ net: ₹8,500                                   │
│        │        └─ created_at: now                               │
│        │                                                          │
│        └─→ Update vendor_wallets                                 │
│             ├─ balance += ₹8,500                                 │
│             ├─ total_earned += ₹10,000                           │
│             ├─ total_commission += ₹1,500                        │
│             └─ updated_at: now                                   │
│                                                                  │
│   ═════════════════════════════════════════════════════════════ │
│                                                                  │
│   PERIOD: Multiple Bookings Accumulate                           │
│   ├─ Booking 1: +₹8,500 to wallet                                │
│   ├─ Booking 2: +₹9,200 to wallet                                │
│   ├─ Booking 3: +₹7,800 to wallet                                │
│   └─ Wallet Balance: ₹25,500                                     │
│                                                                  │
│   ═════════════════════════════════════════════════════════════ │
│                                                                  │
│   ADMIN INITIATES PAYOUT                                         │
│   POST /functions/v1/process-settlement                          │
│   { action: "create_payout", vendor_id: "xxx" }                  │
│   │                                                              │
│   ├──► Read vendor_wallets.balance = ₹25,500                     │
│   │                                                              │
│   └──► Create payouts record                                    │
│        ├─ vendor_id: xxx                                         │
│        ├─ amount: ₹25,500                                        │
│        ├─ status: pending                                        │
│        ├─ settled_by: admin_user_id                              │
│        └─ created_at: now                                        │
│            │                                                     │
│            └──► Notify Vendor                                   │
│                 "Payout ₹25,500 initiated!"                      │
│                                                                  │
│   ═════════════════════════════════════════════════════════════ │
│                                                                  │
│   ADMIN SETTLES PAYOUT (After Bank Transfer)                     │
│   POST /functions/v1/process-settlement                          │
│   { action: "settle_payout", payout_id: "yyy" }                  │
│   │                                                              │
│   ├──► Update payouts.status: pending → completed              │
│   ├──► Set payouts.settled_at: now                              │
│   │                                                              │
│   ├──► Create settlement_transaction                            │
│   │    ├─ vendor_id                                              │
│   │    ├─ payout_id: yyy                                         │
│   │    ├─ transaction_type: payout                              │
│   │    ├─ net_amount: -₹25,500 (debit)                           │
│   │    └─ settled_at: now                                        │
│   │                                                              │
│   └──► Reset vendor_wallets                                     │
│        ├─ balance: 0 (paid out)                                  │
│        ├─ total_paid_out += ₹25,500                              │
│        └─ updated_at: now                                        │
│            │                                                     │
│            └──► Notify Vendor                                   │
│                 "Payout ₹25,500 completed!"                      │
│                 Transaction immutable ✓                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Review & Rating System

```
┌──────────────────────────────────────────────────────────┐
│        CUSTOMER REVIEW & VENDOR RATING SYSTEM            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  BOOKING COMPLETED                                        │
│  ├─ booking_status: completed                             │
│  ├─ completed_at: [timestamp]                             │
│  └─ Customer now has permission to review                │
│                                                           │
│     POST /functions/v1/manage-reviews                     │
│     {                                                     │
│       action: "create_review",                            │
│       booking_id: "xxx",                                  │
│       rating: 5,                                          │
│       title: "Amazing experience!",                       │
│       content: "Best paragliding adventure ever"          │
│     }                                                     │
│                                                           │
│     ├──► Validate: Booking is COMPLETED ✓                │
│     ├──► Validate: Customer is review author ✓            │
│     ├──► Validate: Only 1 review per booking ✓            │
│     │                                                     │
│     └──► CREATE review record                            │
│          ├─ booking_id                                    │
│          ├─ vendor_id                                     │
│          ├─ customer_id                                   │
│          ├─ rating: 5                                     │
│          ├─ title: "Amazing experience!"                  │
│          ├─ content: "Best paragliding..."                │
│          └─ created_at: now                               │
│              │                                            │
│              ├──► TRIGGER: update_rating_on_review       │
│              │    │                                       │
│              │    └──► Call update_vendor_rating_summary │
│              │         (recalculate average)               │
│              │                                            │
│              └──► QUERY FOR AVERAGING:                   │
│                   ├─ SELECT AVG(rating) FROM reviews    │
│                   │  WHERE vendor_id = 'xxx'             │
│                   │  RESULT: (5+4+5+4) / 4 = 4.5         │
│                   │                                      │
│                   └─ UPDATE vendor_rating_summary        │
│                      ├─ vendor_id: xxx                   │
│                      ├─ average_rating: 4.50             │
│                      ├─ total_reviews: 4                 │
│                      └─ updated_at: now                   │
│                          │                                │
│                          └──► PUBLIC VISIBILITY          │
│                               ⭐⭐⭐⭐ (4.5, 4 reviews)   │
│                               Customers see rating        │
│                               before booking              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Notification Event System

```
┌─────────────────────────────────────────────────────────┐
│         NOTIFICATION TRIGGERING & DISPATCH              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  EVENT: Booking Status Changes                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ UPDATE bookings SET booking_status = 'confirmed'   │ │
│  └────────────────────────────────────────────────────┘ │
│              │                                          │
│              └──► Edge Function Logic:                 │
│                   (update-booking-status)              │
│                                                        │
│                   IF new_status = 'confirmed'         │
│                   ├─ Create notification for CUSTOMER │
│                   │  {                                 │
│                   │    user_id: customer_id,          │
│                   │    type: booking_confirmation,     │
│                   │    title: "Booking Confirmed",     │
│                   │    message: "Vendor confirmed...", │
│                   │    booking_id: xxx,                │
│                   │    created_at: now                 │
│                   │  }                                 │
│                   │                                    │
│                   ├─ Create notification for VENDOR    │
│                   │  {                                 │
│                   │    user_id: vendor_user_id,       │
│                   │    type: booking_confirmation,     │
│                   │    title: "Booking Confirmed",     │
│                   │    message: "You confirmed a...",  │
│                   │    booking_id: xxx,                │
│                   │    created_at: now                 │
│                   │  }                                 │
│                   │                                    │
│                   └─ TODO: Send SMS via Twilio        │
│                      (when environment ready)          │
│                                                        │
│  ═════════════════════════════════════════════════════ │
│                                                        │
│  After Creation - USER SEES:                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ SELECT * FROM notifications                        │ │
│  │ WHERE user_id = [MY_ID]                            │ │
│  │ ORDER BY created_at DESC                           │ │
│  │                                                    │ │
│  │ Results:                                           │ │
│  │ ├─ 🔔 Booking Confirmed                           │ │
│  │ │  "Your booking has been confirmed by vendor"   │ │
│  │ │  [✗ Unread] 2 minutes ago                       │ │
│  │ │                                                  │ │
│  │ ├─ 🔔 Payout Processed                            │ │
│  │ │  "Your payout of ₹25,500 was completed"        │ │
│  │ │  [✓ Read] 1 hour ago                            │ │
│  │ │                                                  │ │
│  │ └─ ...                                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. RLS Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│     ROW LEVEL SECURITY - DATA ISOLATION ENFORCED         │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────┐                                  │
│  │   VENDOR_A          │                                  │
│  │   (user_id: xxx)    │                                  │
│  │                     │                                  │
│  │  Query:             │                                  │
│  │  SELECT * FROM      │                                  │
│  │    vendor_wallets   │                                  │
│  │                     │                                  │
│  │  RLS Policy:        │                                  │
│  │  ├─ public.is_     │                                  │
│  │  │  vendor_owner   │                                  │
│  │  │  (vendor_id,    │                                  │
│  │  │   auth.uid())   │                                  │
│  │  │                  │                                  │
│  │  │  OR admin?       │                                  │
│  │  │                  │                                  │
│  │  ├─ YES ──►         │                                  │
│  │  │ Return wallet    │                                  │
│  │  │ data             │                                  │
│  │  │                  │                                  │
│  │  └─ NO ──►          │                                  │
│  │    Return 0 rows    │                                  │
│  │    (secretly)       │                                  │
│  └─────────────────────┘                                  │
│                                                            │
│  At Database Level (NOT in code):                         │
│  ✓ Vendor A cannot access Vendor B's data                │
│  ✓ Customer cannot see wallet balances                   │
│  ✓ Admin sees everything                                  │
│  ✓ No code bypass possible                                │
│  ✓ Enforced at SQL execution                              │
│                                                            │
│  ┌────────────────────────────────────┐                   │
│  │ COMPARISON: WITH vs WITHOUT RLS    │                   │
│  ├────────────────────────────────────┤                   │
│  │ WITHOUT RLS (❌):                   │                   │
│  │  Backend Code                       │                   │
│  │  if (vendorId !== currentUser.id)  │                   │
│  │    return error                     │                   │
│  │  DATA LEAKAGE if code breaks! ⚠️   │                   │
│  │                                    │                   │
│  │ WITH RLS (✓):                      │                   │
│  │  Database Layer                    │                   │
│  │  SELECT * FROM wallets WHERE       │                   │
│  │  vendor_id = xxx;                  │                   │
│  │  (RLS auto-adds filter)            │                   │
│  │  UNHACKABLE - enforced at DB! ✓   │                   │
│  └────────────────────────────────────┘                   │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Complete Data Models

```
┌────────────────────────────────────────────────────────────────┐
│                     DATABASE SCHEMA                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  auth.users (Supabase built-in)                                │
│  └─ id, email, created_at, ...                                │
│     │                                                          │
│     ├──────► profiles (user details)                           │
│     │        ├─ user_id (FK) ◄─ REFERENCES auth.users         │
│     │        ├─ full_name                                      │
│     │        ├─ phone                                          │
│     │        └─ avatar_url                                     │
│     │                                                          │
│     ├──────► user_roles (role management)                      │
│     │        ├─ user_id (FK)                                   │
│     │        └─ role: 'admin' | 'vendor' | 'customer'         │
│     │                                                          │
│     └──────► vendors (vendor profile)                          │
│              ├─ user_id (FK) UNIQUE                            │
│              ├─ company_name                                   │
│              ├─ is_approved                                    │
│              ├─ stripe_account_id                              │
│              │                                                  │
│              ├──────► packages (services offered)              │
│              │        ├─ vendor_id (FK)                        │
│              │        ├─ name, price, duration_minutes         │
│              │        │                                         │
│              │        ├──────► bookings (customer orders)      │
│              │        │        ├─ package_id (FK)              │
│              │        │        ├─ customer_id (FK) ◄─ auth.   │
│              │        │        │                users          │
│              │        │        ├─ booking_status: ENUM         │
│              │        │        ├─ total_amount                 │
│              │        │        ├─ commission_amount            │
│              │        │        ├─ confirmed_at, completed_at   │
│              │        │        │                               │
│              │        │        ├──────► reviews                │
│              │        │        │        ├─ booking_id FK       │
│              │        │        │        ├─ rating (1-5)        │
│              │        │        │        └─ content             │
│              │        │        │                               │
│              │        │        └──────► notifications          │
│              │        │                 ├─ user_id (FK)       │
│              │        │                 ├─ relative_booking_id │
│              │        │                 └─ is_read             │
│              │        │                                         │
│              │        └──────► time_slots (availability)       │
│              │                 ├─ slot_date                    │
│              │                 ├─ start_time, end_time         │
│              │                 └─ booked_count / capacity      │
│              │                                                  │
│              ├──────► vendor_wallets ★ NEW                    │
│              │        ├─ vendor_id (FK) UNIQUE                 │
│              │        ├─ balance                               │
│              │        ├─ total_earned                          │
│              │        ├─ total_commission                      │
│              │        └─ total_paid_out                        │
│              │                                                  │
│              ├──────► settlement_transactions ★ NEW            │
│              │        ├─ vendor_id (FK)                        │
│              │        ├─ booking_id (FK)                       │
│              │        ├─ transaction_type                      │
│              │        ├─ gross_amount                          │
│              │        ├─ commission_amount                     │
│              │        ├─ net_amount                            │
│              │        └─ payout_id (FK)                        │
│              │                                                  │
│              ├──────► payouts ★ NEW                            │
│              │        ├─ vendor_id (FK)                        │
│              │        ├─ amount                                │
│              │        ├─ status: ENUM                          │
│              │        ├─ settled_by (FK → auth.users)         │
│              │        └─ settled_at                            │
│              │                                                  │
│              └──────► vendor_rating_summary ★ NEW             │
│                       ├─ vendor_id (FK) UNIQUE                 │
│                       ├─ average_rating                        │
│                       └─ total_reviews                         │
│                                                                 │
│  commission_settings (global config)                           │
│  └─ percentage (15.00 default)                                │
│                                                                 │
│  ★ NEW = Created in marketplace enhancements                   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Edge Function Invocation Flow

```
┌────────────────────────────────────────────────────────────────┐
│            EDGE FUNCTION CALL FLOW (SERVERLESS)                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLIENT (Frontend)                                              │
│  └─ Makes HTTP Request                                         │
│     │                                                           │
│     ├─ POST /functions/v1/update-booking-status               │
│     │  Headers:                                                 │
│     │  ├─ Authorization: Bearer [JWT_TOKEN]                    │
│     │  └─ Content-Type: application/json                       │
│     │                                                           │
│     │  Body:                                                    │
│     │  {                                                        │
│     │    "booking_id": "xxx",                                   │
│     │    "new_status": "confirmed",                             │
│     │    "vendor_notes": "..."                                  │
│     │  }                                                        │
│     │                                                           │
│     └──► Supabase Edge Function                               │
│          (Deno Runtime)                                         │
│          │                                                      │
│          ├─► Extract JWT from header                           │
│          │   (automatic)                                        │
│          │                                                      │
│          ├─► Get authenticated user                            │
│          │   const user = await userClient.auth.getUser()     │
│          │                                                      │
│          ├─► Check authorization                              │
│          │   if (isCustomer) require pending booking          │
│          │   if (isVendor) require confirmed booking          │
│          │   if (isAdmin) allow any                             │
│          │                                                      │
│          ├─► Fetch booking from database                       │
│          │   (uses anon or service client)                     │
│          │                                                      │
│          ├─► Validate business logic                           │
│          │   ├─ Status flow valid?                             │
│          │   ├─ Time slot available?                           │
│          │   ├─ Vendor approved?                               │
│          │   └─ etc.                                           │
│          │                                                      │
│          ├─► Call Supabase RPC                                 │
│          │   if (confirmed) {                                  │
│          │     adminClient.rpc(                               │
│          │       'record_booking_earnings',                    │
│          │       { ... }                                       │
│          │     )                                                │
│          │   }                                                  │
│          │                                                      │
│          ├─► Update booking in database                        │
│          │   adminClient                                       │
│          │     .from('bookings')                               │
│          │     .update({ booking_status: 'confirmed' })        │
│          │                                                      │
│          ├─► Create notifications                              │
│          │   for each recipient {                              │
│          │     adminClient                                     │
│          │       .from('notifications')                        │
│          │       .insert({ ... })                              │
│          │   }                                                  │
│          │                                                      │
│          └─► Return Response to Client                         │
│              {                                                  │
│                "success": true,                                 │
│                "booking": { ... },                              │
│                "notifications_count": 2                         │
│              }                                                  │
│                                                                 │
│  CLIENT receives response in ~500ms                            │
│  └─ Display success message                                    │
│  └─ Refresh booking status                                     │
│  └─ Show notifications                                         │
│                                                                 │
│  DATABASE records all changes:                                 │
│  ├─ booking status updated                                     │
│  ├─ settlement transaction created (if confirmed)              │
│  ├─ wallet balance updated (if confirmed)                      │
│  ├─ notifications inserted                                     │
│  └─ All with timestamps & immutable audit trail               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 8. Permission Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│  ROLE-BASED ACTION AUTHORIZATION MATRIX                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                          CUSTOMER  VENDOR  ADMIN                      │
│  ────────────────────────────────────────────────────────────────    │
│  View own bookings         ✓        -       ✓                        │
│  View own wallet           -        ✓       ✓                        │
│  Create booking            ✓        -       ✓                        │
│  Confirm booking           -        ✓       ✓                        │
│  Complete booking          -        ✓       ✓                        │
│  Cancel own pending        ✓        -       ✓                        │
│  Create review             ✓        -       ✓ *                      │
│  View reviews              ✓        ✓       ✓                        │
│  Manage commissions        -        -       ✓                        │
│  Create payout             -        -       ✓                        │
│  Settle payout             -        -       ✓                        │
│  View settlements          -        ✓       ✓                        │
│  Manage vendor approvals   -        -       ✓                        │
│  Delete reviews            ✓ *      -       ✓                        │
│  ────────────────────────────────────────────────────────────────    │
│  * = Own data only                                                   │
│  ✓ = Allowed                                                         │
│  - = Not allowed                                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Error Handling Flow

```
┌──────────────────────────────────────────────────┐
│      API ERROR RESPONSE HANDLING                 │
├──────────────────────────────────────────────────┤
│                                                   │
│  API Request                                     │
│  └─────────────────────────────────────┐         │
│                                        │         │
│  ┌────────────────────────────────────┴──────┐   │
│  │ Validation Error (400)                     │   │
│  │ ├─ Missing required field                  │   │
│  │ ├─ Invalid data type                       │   │
│  │ ├─ Out of range value                      │   │
│  │ └─ Return: { error: "..."}                 │   │
│  └──────────────────────────────────────────┘   │
│                  │                              │
│  ┌──────────────┴──────────────┐                │
│  │                             │                │
│  ▼                             ▼                │
│ ┌──────────────┐     ┌──────────────────────┐  │
│ │ Auth Error   │     │ Authorization Error  │  │
│ │ (401)        │     │ (403)                │  │
│ ├──────────────┤     ├──────────────────────┤  │
│ │- No token    │     │- Vendor A cannot    │  │
│ │- Invalid JWT │     │  access Vendor B     │  │
│ │- Expired     │     │- Non-admin can't     │  │
│ │              │     │  create payout       │  │
│ │Return: {     │     │                      │  │
│ │error: "..."} │     │Return: {error:"..."}│  │
│ └──────────────┘     └──────────────────────┘  │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ Business Logic Error (400)               │   │
│  │ ├─ Booking status transition invalid     │   │
│  │ ├─ Cannot review non-completed booking  │   │
│  │ ├─ Time slot fully booked               │   │
│  │ ├─ Vendor not approved                  │   │
│  │ └─ Return: { error: "..." }             │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ Not Found Error (404)                    │   │
│  │ ├─ Booking not found                    │   │
│  │ ├─ Vendor not found                     │   │
│  │ ├─ Payout not found                     │   │
│  │ └─ Return: { error: "Not found" }       │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ Server Error (500)                       │   │
│  │ ├─ Database connection error             │   │
│  │ ├─ RPC function failure                  │   │
│  │ ├─ Unexpected exception                  │   │
│  │ └─ Return: { error: "Unknown error" }   │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  All errors logged with:                        │
│  ├─ Timestamp                                   │
│  ├─ User ID (if available)                      │
│  ├─ Function name                               │
│  ├─ Error message                               │
│  └─ Stack trace (dev only)                      │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

**Complete System Architecture Ready for Production** ✅
