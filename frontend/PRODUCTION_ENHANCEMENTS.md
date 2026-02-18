# Production Marketplace Enhancements - Implementation Guide

**Date:** February 13, 2026  
**Status:** Production Ready

---

## Overview

This document describes the production-grade marketplace enhancements added to the Aasmanwale platform. All changes are **backend-only** with **no UI modifications** required.

---

## 1. Database Schema Enhancements

### New Tables Created

#### 1.1 Vendor Wallets (`vendor_wallets`)
Tracks real-time wallet balance for each vendor.

**Fields:**
- `vendor_id` (UUID, FK) - Links to vendor
- `balance` (NUMERIC) - Current available balance
- `total_earned` (NUMERIC) - Lifetime gross earnings
- `total_commission` (NUMERIC) - Lifetime commissions paid
- `total_paid_out` (NUMERIC) - Lifetime payouts to vendors

**Purpose:** Quick access to vendor financial state without aggregating transactions.

---

#### 1.2 Settlement Transactions (`settlement_transactions`)
Detailed audit log of all financial transactions.

**Fields:**
- `vendor_id`, `booking_id` - References
- `transaction_type` - One of: `booking_earnings`, `commission_deducted`, `payout`
- `gross_amount` - Total booking amount
- `commission_amount` - Platform commission deducted
- `net_amount` - Amount vendor receives
- `settled_at` - When payout was processed

**Purpose:** Immutable financial audit trail for compliance and reconciliation.

---

#### 1.3 Payouts (`payouts`)
Tracks settlement/payout requests and their status.

**Fields:**
- `vendor_id` (UUID, FK)
- `amount` (NUMERIC) - Payout amount
- `status` - `pending`, `processing`, `completed`, `failed`
- `settled_by` (UUID) - Admin who processed
- `settled_at` (TIMESTAMPTZ) - When completed
- `settlement_notes` (TEXT) - Optional notes

**Purpose:** Admin-controlled payout workflow with full audit trail.

---

#### 1.4 Reviews (`reviews`)
Customer reviews & ratings (only for completed bookings).

**Fields:**
- `booking_id`, `vendor_id`, `customer_id` - References
- `rating` (INTEGER) - 1-5 stars
- `title` (TEXT) - Review title
- `content` (TEXT) - Review text

**RLS Protection:**
- Anyone can read reviews of approved vendors
- Only customers can create reviews for their completed bookings
- Only review author or admin can delete

---

#### 1.5 Vendor Rating Summary (`vendor_rating_summary`)
Denormalized average rating and review count (auto-updated).

**Fields:**
- `vendor_id` (UUID, FK, UNIQUE)
- `average_rating` (NUMERIC) - 0.00-5.00
- `total_reviews` (INTEGER)
- `calculated_at` (TIMESTAMPTZ)

**Purpose:** Performance - avoid aggregating reviews on every query.

---

#### 1.6 Notifications (`notifications`)
System notifications for all events.

**Fields:**
- `user_id` (UUID, FK) - Recipient
- `notification_type` - ENUM: `booking_confirmation`, `vendor_approval`, `booking_completed`, `booking_cancelled`, `payout_processed`, `system_alert`
- `title`, `message` - Content
- `related_booking_id`, `related_vendor_id` - Context
- `is_read` (BOOLEAN) - Read status

**Current Usage:**
- Booking confirmation/cancellation notifications
- Payout processed notifications
- Review notifications

**Future Integration:** Can connect to Twilio SMS, email, push notifications.

---

### Enhanced Existing Tables

#### 1.7 Bookings Table - New Fields
- `booking_status` (ENUM) - **`pending` → `confirmed` → `completed` → `cancelled`**
- `confirmed_at` (TIMESTAMPTZ) - When vendor confirmed
- `completed_at` (TIMESTAMPTZ) - When experience completed
- `cancelled_at` (TIMESTAMPTZ) - When cancelled
- `cancellation_reason` (TEXT) - Why cancelled
- `vendor_notes` (TEXT) - Vendor internal notes

**Enum Created:**
```sql
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
```

**Status Flow Rules:**
- New bookings start in `pending` state
- Only `pending` → `confirmed` (by vendor/admin)
- Only `confirmed` → `completed` (by vendor/admin)
- `pending` or `confirmed` → `cancelled` (by customer/admin)
- Status transitions are granular and role-based

---

## 2. Business Logic Functions

### 2.1 Commission Calculation
**Function:** `calculate_commission(gross_amount NUMERIC)`

```sql
SELECT (gross_amount * commission_rate / 100)
```

- Automatically reads current commission rate from `commission_settings`
- Default: 15%
- Returns: NUMERIC(10,2)

---

### 2.2 Vendor Balance Tracking
**Function:** `get_vendor_balance(_vendor_id UUID)`

Returns current wallet balance for a vendor.

---

### 2.3 Recording Earnings
**Function:** `record_booking_earnings(_booking_id, _vendor_id, _gross_amount)`

**Called when:** Booking is confirmed to `confirmed` status

**Performs:**
1. Calculates commission using `calculate_commission()`
2. Creates `settlement_transaction` record
3. Updates/creates `vendor_wallet` entry
4. Nets amount = gross - commission

---

### 2.4 Rating Summary Updates
**Function:** `update_vendor_rating_summary(_vendor_id)`

**Called:** Automatically when review is created/updated/deleted

**Performs:**
1. Aggregates all reviews for vendor
2. Calculates average rating
3. Counts total reviews
4. Updates `vendor_rating_summary` table

---

### 2.5 Notification Creation
**Function:** `create_notification(_user_id, _type, _title, _message, _booking_id, _vendor_id)`

Used internally by triggers to create notifications.

---

## 3. Automation Triggers

### 3.1 Vendor Wallet Creation
**Trigger:** `vendor_approved_create_wallet`

**When:** Vendor `is_approved` changes from false to true

**Action:** Creates wallet record with balance 0

---

### 3.2 Rating Summary Auto-Update
**Trigger:** `review_update_vendor_rating`

**When:** Review is inserted, updated, or deleted

**Action:** Calls `update_vendor_rating_summary()` automatically

---

### 3.3 Auto-Timestamps
Triggers to update `updated_at` on all new tables (standard pattern).

---

## 4. Row-Level Security (RLS) Policies

### 4.1 Vendor Wallets
```
✓ Vendor can view own wallet
✓ Admin can view/manage all wallets
✗ Customers cannot access
```

### 4.2 Settlement Transactions
```
✓ Vendor can view own transactions
✓ Admin can view all
✓ System can insert (via function)
```

### 4.3 Payouts
```
✓ Vendor can view own payouts
✓ Admin can create (initiate payout)
✓ Admin can mark as completed
```

### 4.4 Reviews
```
✓ Anyone can read reviews of approved vendors
✓ Customer can create review for own completed booking
✓ Customer can update own review
✓ Admin can delete reviews
```

### 4.5 Notifications
```
✓ User can read own notifications
✓ User can mark own as read
✓ System can insert
```

---

## 5. Edge Functions (Serverless APIs)

### 5.1 Update Booking Status
**Endpoint:** `POST /functions/v1/update-booking-status`

**Purpose:** Handle booking status transitions with business logic validation

**Authorization:**
- Customer: can cancel `pending` bookings
- Vendor: can confirm `pending` → `confirmed`, complete `confirmed` → `completed`
- Admin: can perform any transition

**Request Payload:**
```json
{
  "booking_id": "uuid",
  "new_status": "confirmed|completed|cancelled",
  "cancellation_reason": "string (optional)",
  "vendor_notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "booking": { ... },
  "notifications_count": 2
}
```

**Side Effects:**
1. Updates booking status & timestamps
2. Creates 1-2 notifications (customer + vendor)
3. If `confirmed`: Records earnings in wallet/transactions
4. If `cancelled`: Records cancellation reason

---

### 5.2 Process Settlement (Admin Only)
**Endpoint:** `POST /functions/v1/process-settlement`

**Purpose:** Admin interface for vendor payouts

**Authorization:** Admin only

**Actions:**

#### Create Payout
```json
{
  "action": "create_payout",
  "vendor_id": "uuid"
}
```
- Reads vendor wallet balance
- Creates payout record with status `pending`
- Notifies vendor

#### Settle Payout
```json
{
  "action": "settle_payout",
  "payout_id": "uuid",
  "settlement_notes": "Transferred to bank account"
}
```
- Marks payout as `completed`
- Records payout transaction
- Resets vendor wallet balance to 0
- Notifies vendor

#### Get Payout Report
```json
{
  "action": "get_payout_report",
  "vendor_id": "uuid (optional)"
}
```
- Returns all payouts with totals
- Optional filter by vendor

---

### 5.3 Manage Reviews
**Endpoint:** `POST /functions/v1/manage-reviews`

**Actions:**

#### Create Review
```json
{
  "action": "create_review",
  "booking_id": "uuid",
  "rating": 4,
  "title": "Great experience!",
  "content": "Amazing paragliding adventure..."
}
```
- Only after booking `completed`
- One review per booking
- Triggers rating summary update
- Notifies vendor

#### Get Vendor Reviews
```json
{
  "action": "get_vendor_reviews",
  "vendor_id": "uuid"
}
```
- Returns all reviews + rating summary

#### Delete Review
```json
{
  "action": "delete_review",
  "review_id": "uuid"
}
```
- Author or admin only
- Triggers rating update

---

## 6. Modified Edge Functions

### 6.1 Create Booking
**File:** `/supabase/functions/create-booking/index.ts`

**Changes:**
- Now populates `booking_status` field (in addition to `status` for backwards compatibility)
- Sets `confirmed_at` if admin manual booking
- Calls `record_booking_earnings()` if manual admin booking

**Flow:**
1. Validate package, vendor, time slot
2. Calculate commission
3. Create booking with `booking_status = 'pending'`
4. Increment time slot booked_count
5. If admin booking: record earnings immediately

---

## 7. Complete Workflow Examples

### 7.1 Customer Books Experience
```
1. Customer creates booking → status = "pending"
2. Booking created in DB with booking_status = 'pending'
3. No earnings recorded yet (pending vendor confirmation)
```

### 7.2 Vendor Confirms Booking
```
POST /functions/v1/update-booking-status
{
  "booking_id": "xxx",
  "new_status": "confirmed"
}

Results:
1. booking_status = 'confirmed'
2. confirmed_at = now
3. record_booking_earnings() called:
   - settlement_transaction created
   - vendor_wallet.balance += net_amount
   - vendor_wallet.total_earned += gross
4. Notifications sent to customer + vendor
```

### 7.3 Vendor Completes Experience
```
POST /functions/v1/update-booking-status
{
  "booking_id": "xxx",
  "new_status": "completed",
  "vendor_notes": "Perfect weather, smooth flight"
}

Results:
1. booking_status = 'completed'
2. completed_at = now
3. vendor_notes recorded
4. Notification: "Experience Complete - Please leave a review!"
```

### 7.4 Customer Reviews Experience
```
POST /functions/v1/manage-reviews
{
  "action": "create_review",
  "booking_id": "xxx",
  "rating": 5,
  "title": "Amazing!",
  "content": "Best experience ever"
}

Results:
1. Review created (RLS checked: booking is completed + customer is author)
2. update_vendor_rating_summary() triggered
3. vendor_rating_summary updated (e.g., avg = 4.8, total = 52)
4. Notification sent to vendor
```

### 7.5 Admin Processes Vendor Payout
```
POST /functions/v1/process-settlement
{
  "action": "create_payout",
  "vendor_id": "yyy"
}

Results:
1. Payout record created with amount = vendor_wallet.balance
2. Vendor notified: "Payout initiated - ₹X pending"

Then after transfer completes:

POST /functions/v1/process-settlement
{
  "action": "settle_payout",
  "payout_id": "zzz",
  "settlement_notes": "Stripe transfer completed"
}

Results:
1. Payout marked as 'completed'
2. settlement_transaction recorded (payout)
3. vendor_wallet.balance = 0
4. vendor_wallet.total_paid_out += amount
5. Vendor notified: "Payout ₹X completed!"
```

---

## 8. Security & Compliance

### 8.1 RLS Enforcement
- **All new tables have RLS enabled**
- Vendors isolated to own data
- Customers isolated to own bookings
- Admin has full access
- No data leakage between users

### 8.2 Financial Accuracy
- Commission locked at booking confirmation (from the commission_settings at that moment)
- All transactions immutable (append-only in settlement_transactions)
- Wallet balance = sum of settlement transactions
- Payout transaction recorded before balance reset

### 8.3 Authorization Levels
```
Admin:
  - Manage all bookings (all statuses)
  - Create/approve payouts
  - Manage vendor roles
  - View all data

Vendor (Owner):
  - View own bookings
  - Confirm pending bookings
  - Complete confirmed bookings
  - View own wallet & transactions
  - Receive payments
  - Cannot manage other vendors' data

Customer:
  - Create bookings
  - Cancel pending bookings
  - Leave reviews for completed bookings
  - View own bookings & notifications
```

---

## 9. API Integration Checklist

For frontend/client integration:

- [ ] Import `update-booking-status` function for status changes
- [ ] Import `process-settlement` for admin payout management
- [ ] Import `manage-reviews` for review creation
- [ ] Handle `notifications` table polling or subscriptions
- [ ] Display vendor `average_rating` from `vendor_rating_summary`
- [ ] Show wallet balance from `vendor_wallets` in vendor dashboard
- [ ] Query `settlement_transactions` for vendor financial reports

---

## 10. Migration & Deployment

### Step 1: Apply Database Migration
```bash
# Run migration file
# File: supabase/migrations/20260213_marketplace_enhancements.sql
```

### Step 2: Deploy Edge Functions
```bash
# Create function directories if not exists
supabase functions deploy update-booking-status
supabase functions deploy process-settlement
supabase functions deploy manage-reviews
```

### Step 3: Verify RLS Policies
- Test vendor wallet access isolation
- Verify settlement transaction visibility
- Confirm review creation restrictions

### Step 4: Update Frontend Code
- Update booking creation to use `booking_status` field
- Add UI bindings for status transitions (already built, now has backend)
- Connect notification system

---

## 11. Monitoring & Operations

### Key Metrics to Track
```
- Pending bookings count
- Average booking confirmation time (pending → confirmed)
- Vendor wallet average balance
- Monthly commission collected
- Payout processing time
- Average vendor rating
- Review response rate
```

### Database Indexes
All created for performance:
```sql
CREATE INDEX idx_settlement_vendor ON public.settlement_transactions(vendor_id)
CREATE INDEX idx_settlement_booking ON public.settlement_transactions(booking_id)
CREATE INDEX idx_payouts_vendor ON public.payouts(vendor_id)
CREATE INDEX idx_payouts_status ON public.payouts(status)
CREATE INDEX idx_reviews_vendor ON public.reviews(vendor_id)
CREATE INDEX idx_reviews_customer ON public.reviews(customer_id)
CREATE INDEX idx_notifications_user ON public.notifications(user_id)
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read)
CREATE INDEX idx_notifications_type ON public.notifications(notification_type)
```

---

## 12. Testing Scenarios

### Test 1: Complete Booking Flow
```
1. Create booking (pending)
2. Vendor confirms (confirmed, earnings recorded)
3. Vendor completes (completed)
4. Customer reviews (review created, rating updated)
5. Verify wallet & transactions
```

### Test 2: Admin Payout
```
1. Create payout from pending bookings
2. Verify wallet balance deducted
3. Verify settlement transaction recorded
4. Check payout status history
```

### Test 3: Authorization Tests
```
- Vendor A cannot access Vendor B's bookings
- Customer A cannot see Customer B's wallets
- Non-admin cannot create payouts
- Booking can only be reviewed if COMPLETED
```

---

## 13. Future Enhancements

Potential additions (out of scope for now):
- Refund handling in cancelled bookings
- Vendoring commission overrides per vendor
- Batch payout processing
- Email/SMS notification sending
- Payment method management
- Tax artifact generation
- Chargeback/dispute handling

---

## Summary

This production implementation provides:

✅ **Vendor Wallet System** - Real-time balance tracking  
✅ **Settlement Tracking** - Immutable transaction audit trail  
✅ **Booking Lifecycle** - Enforced status transitions with authorization  
✅ **Reviews & Ratings** - Customer feedback with automated calculations  
✅ **Notifications** - Event-driven system for stakeholders  
✅ **Security** - Strict RLS policies for data isolation  
✅ **Compliance** - Financial accuracy & audit trails  

**Status:** Ready for deployment to production.
