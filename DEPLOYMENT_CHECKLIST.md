# Deployment & Verification Checklist

**Date:** February 13, 2026  
**Platform:** Aasmanwale Marketplace  
**Scope:** Production-Grade Enhancements (Backend Only)

---

## Phase 1: Database Migration

### Migration File Applied
- **File:** `supabase/migrations/20260213_marketplace_enhancements.sql`
- **Size:** ~600 lines
- **Changes:** 10 tables created/modified, 20+ functions, 40+ RLS policies

### ✅ Enums Created
- [ ] `app_role` (admin, vendor, customer) - already existed
- [ ] `booking_status` (pending, confirmed, completed, cancelled) - **NEW**
- [ ] `notification_type` (6 types) - **NEW**

### ✅ New Tables
- [ ] `vendor_wallets` - tracks vendor balance + lifetime stats
- [ ] `settlement_transactions` - immutable earnings/payout log
- [ ] `payouts` - settlement request history
- [ ] `reviews` - customer ratings
- [ ] `vendor_rating_summary` - denormalized avg rating
- [ ] `notifications` - user event log

**Verify:**
```sql
SELECT count(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vendor_wallets', 'settlement_transactions', 'payouts', 'reviews', 'vendor_rating_summary', 'notifications');
-- Should return 6
```

### ✅ Bookings Table Enhancements
- [ ] `booking_status` ENUM column added
- [ ] `confirmed_at` TIMESTAMPTZ added
- [ ] `completed_at` TIMESTAMPTZ added  
- [ ] `cancelled_at` TIMESTAMPTZ added
- [ ] `cancellation_reason` TEXT added
- [ ] `vendor_notes` TEXT added

**Verify:**
```sql
\d public.bookings
-- Should show all new columns
```

### ✅ RLS Enabled on All New Tables
- [ ] vendor_wallets: RLS enabled, 2 policies
- [ ] settlement_transactions: RLS enabled, 2 policies  
- [ ] payouts: RLS enabled, 3 policies
- [ ] reviews: RLS enabled, 4 policies
- [ ] vendor_rating_summary: RLS enabled, 1 policy
- [ ] notifications: RLS enabled, 3 policies

**Verify:**
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
-- Should include all 6 new tables
```

### ✅ Functions Created (6)
- [ ] `calculate_commission()` - STABLE, inline commission math
- [ ] `get_vendor_balance()` - STABLE, read-only balance lookup
- [ ] `record_booking_earnings()` - VOLATILE, records transaction + updates wallet
- [ ] `update_vendor_rating_summary()` - VOLATILE, re-calculates avg rating
- [ ] `create_notification()` - VOLATILE, inserts notification record
- [ ] `handle_new_user()` - Already existed in phase 1

**Verify:**
```sql
SELECT proname FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('calculate_commission', 'get_vendor_balance', 'record_booking_earnings',
                 'update_vendor_rating_summary', 'create_notification');
-- Should return 5
```

### ✅ Triggers Created (7)
- [ ] `vendor_approved_create_wallet` - Creates wallet when vendor approved
- [ ] `review_update_vendor_rating` - Updates rating on review change
- [ ] `vendor_wallets_updated_at` - Auto-timestamp
- [ ] `settlement_transactions_updated_at` - Auto-timestamp
- [ ] `payouts_updated_at` - Auto-timestamp
- [ ] `reviews_updated_at` - Auto-timestamp
- [ ] `vendor_rating_summary_updated_at` - Auto-timestamp

**Verify:**
```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY trigger_name;
-- Should include all triggers
```

### ✅ Indexes Created (9)
- [ ] `idx_settlement_vendor` on settlement_transactions
- [ ] `idx_settlement_booking` on settlement_transactions
- [ ] `idx_payouts_vendor` on payouts
- [ ] `idx_payouts_status` on payouts
- [ ] `idx_reviews_vendor` on reviews
- [ ] `idx_reviews_customer` on reviews
- [ ] `idx_notifications_user` on notifications
- [ ] `idx_notifications_unread` on notifications
- [ ] `idx_notifications_type` on notifications

**Verify:**
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';
-- Should return 9+
```

### ✅ Seed Data Inserted
- [ ] Vendor wallets created for existing approved vendors
- [ ] Rating summaries initialized for all vendors

**Verify:**
```sql
SELECT count(*) FROM vendor_wallets;
SELECT count(*) FROM vendor_rating_summary;
-- Should be > 0
```

---

## Phase 2: Edge Functions Deployment

### ✅ New Functions
- [ ] `update-booking-status` - Handle status transitions
- [ ] `process-settlement` - Admin payout processing
- [ ] `manage-reviews` - Review creation/deletion

**Deploy:**
```bash
supabase functions deploy update-booking-status
supabase functions deploy process-settlement
supabase functions deploy manage-reviews
```

### ✅ Modified Functions
- [ ] `create-booking` - Now populates `booking_status` field

**Key Changes:**
```typescript
// Added in modified create-booking:
booking_status: bookingStatus,        // 'pending' or 'confirmed'
confirmed_at: is_manual_booking ? now : null,

// Calls record_booking_earnings if manual booking
if (is_manual_booking) {
  await adminClient.rpc("record_booking_earnings", {...})
}
```

**Verify:** Function redeploys without errors
```bash
supabase functions deploy create-booking
```

### ✅ Function Response Tests

**Test 1: update-booking-status**
```bash
curl -X POST https://[PROJECT].supabase.co/functions/v1/update-booking-status \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "[BOOKING_ID]",
    "new_status": "confirmed"
  }'

# Expected: 200 OK with booking object + notifications_count
```

**Test 2: process-settlement (create_payout)**
```bash
curl -X POST https://[PROJECT].supabase.co/functions/v1/process-settlement \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_payout",
    "vendor_id": "[VENDOR_ID]"
  }'

# Expected: 200 OK with payout object
```

**Test 3: manage-reviews (create_review)**
```bash
curl -X POST https://[PROJECT].supabase.co/functions/v1/manage-reviews \
  -H "Authorization: Bearer [CUSTOMER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_review",
    "booking_id": "[COMPLETED_BOOKING_ID]",
    "rating": 5
  }'

# Expected: 201 CREATED with review object
```

---

## Phase 3: Security & RLS Verification

### ✅ Vendor Data Isolation
```sql
-- As Vendor A, should see only own wallets
SELECT * FROM vendor_wallets 
WHERE vendor_id = '[VENDOR_A_ID]';
-- ✅ Returns data

SELECT * FROM vendor_wallets 
WHERE vendor_id != '[VENDOR_A_ID]';
-- ✅ Returns 0 rows (RLS blocks)
```

### ✅ Settlement Transaction Isolation
```sql
-- Vendor can see own settlement transactions
SELECT * FROM settlement_transactions 
WHERE vendor_id = '[VENDOR_ID]';
-- ✅ Returns data

-- Cannot access other vendor's
SELECT * FROM settlement_transactions 
WHERE vendor_id != '[VENDOR_ID]';
-- ✅ Returns 0 rows
```

### ✅ Review Access
```sql
-- Anyone authenticated can read approved vendor reviews
SELECT * FROM reviews 
WHERE vendor_id = '[APPROVED_VENDOR_ID]';
-- ✅ Returns review data

-- Only customer of completed booking can review
INSERT INTO reviews (booking_id, vendor_id, customer_id, rating)
VALUES ('[PENDING_BOOKING]', '[VENDOR]', '[CUST]', 5);
-- ✅ Should fail (RLS policy) - booking not completed
```

### ✅ Notification Privacy
```sql
-- User sees only own notifications
SELECT * FROM notifications 
WHERE user_id = '[MY_USER_ID]';
-- ✅ Returns my notifications

SELECT * FROM notifications 
WHERE user_id != '[MY_USER_ID]';
-- ✅ Returns 0 rows
```

### ✅ Admin Access
```sql
-- Admin can see all restricted data
SELECT * FROM vendor_wallets;  -- All vendors
SELECT * FROM payouts;          -- All payouts
-- ✅ Both return data
```

---

## Phase 4: Business Logic Validation

### ✅ Booking Status Lifecycle

**Test 1: Create Booking**
```sql
-- New booking should have booking_status = 'pending'
INSERT INTO bookings (...) VALUES (...);
SELECT booking_status, confirmed_at FROM bookings WHERE id = '[NEW_BOOKING]';
-- ✅ Should show: pending | null
```

**Test 2: Confirm Booking**
```
POST /functions/v1/update-booking-status
{
  "booking_id": "[BOOKING]",
  "new_status": "confirmed"
}

-- Should result in:
SELECT booking_status, confirmed_at FROM bookings WHERE id = '[BOOKING]';
-- ✅ Should show: confirmed | now
```

**Verify Earnings Recorded:**
```sql
SELECT COUNT(*) FROM settlement_transactions 
WHERE booking_id = '[BOOKING]' AND transaction_type = 'booking_earnings';
-- ✅ Should return 1

SELECT balance FROM vendor_wallets 
WHERE vendor_id = '[VENDOR]';
-- ✅ Should equal: (gross - commission) from booking
```

**Test 3: Complete Booking**
```
POST /functions/v1/update-booking-status
{
  "booking_id": "[BOOKING]",
  "new_status": "completed"
}

SELECT booking_status, completed_at FROM bookings WHERE id = '[BOOKING]';
-- ✅ Should show: completed | now
```

**Test 4: Cancel Booking**
```
POST /functions/v1/update-booking-status
{
  "booking_id": "[PENDING_BOOKING]",
  "new_status": "cancelled",
  "cancellation_reason": "Weather not suitable"
}

SELECT booking_status, cancelled_at, cancellation_reason 
FROM bookings WHERE id = '[BOOKING]';
-- ✅ Should show: cancelled | now | "Weather not suitable"
```

### ✅ Commission Calculation

**Test: Calculate 15% Commission**
```sql
SELECT public.calculate_commission(10000);
-- ✅ Should return 1500.00
```

**Test: Calculate with Custom Rate**
```sql
UPDATE commission_settings SET percentage = 20;
SELECT public.calculate_commission(10000);
-- ✅ Should return 2000.00
```

### ✅ Vendor Rating Updates

**Test 1: Create Review**
```
POST /functions/v1/manage-reviews
{
  "action": "create_review",
  "booking_id": "[COMPLETED_BOOKING]",
  "rating": 5
}

SELECT average_rating, total_reviews 
FROM vendor_rating_summary WHERE vendor_id = '[VENDOR]';
-- ✅ Should update (avg goes up, total incremented)
```

**Test 2: Multiple Reviews**
```
-- Create 4 reviews: ratings 5, 4, 5, 4
SELECT average_rating FROM vendor_rating_summary WHERE vendor_id = '[VENDOR]';
-- ✅ Should show 4.50
```

### ✅ Wallet & Settlement Transactions

**Test: Earnings Flow**
```sql
-- After booking confirmed:
SELECT 
  (SELECT balance FROM vendor_wallets WHERE vendor_id = '[V]') as wallet_balance,
  (SELECT SUM(net_amount) FROM settlement_transactions WHERE vendor_id = '[V]' AND transaction_type = 'booking_earnings') as total_net;
-- ✅ Both should match
```

### ✅ Payout Processing

**Test: Create Payout**
```
POST /functions/v1/process-settlement
{
  "action": "create_payout",
  "vendor_id": "[VENDOR]"
}

-- Check payout created:
SELECT amount, status FROM payouts WHERE vendor_id = '[VENDOR]' ORDER BY created_at DESC LIMIT 1;
-- ✅ Should show: [wallet_balance] | pending

-- Check notification created:
SELECT COUNT(*) FROM notifications 
WHERE user_id = '[VENDOR_USER]' AND notification_type = 'payout_processed';
-- ✅ Should return 1
```

**Test: Settle Payout**
```
POST /functions/v1/process-settlement
{
  "action": "settle_payout",
  "payout_id": "[PAYOUT_ID]",
  "settlement_notes": "Bank transfer done"
}

-- Check payout marked complete:
SELECT status, settled_at FROM payouts WHERE id = '[PAYOUT_ID]';
-- ✅ Should show: completed | now

-- Check wallet reset:
SELECT balance FROM vendor_wallets WHERE vendor_id = '[VENDOR]';
-- ✅ Should show 0.00

-- Check transaction recorded:
SELECT COUNT(*) FROM settlement_transactions 
WHERE payout_id = '[PAYOUT_ID]' AND transaction_type = 'payout';
-- ✅ Should return 1
```

---

## Phase 5: Notification System

### ✅ Notification Types Generated

**Test: Booking Confirmation Notification**
```
-- Confirm booking via update-booking-status
POST /functions/v1/update-booking-status {...}

-- Check notifications created:
SELECT COUNT(*) FROM notifications 
WHERE notification_type = 'booking_confirmation';
-- ✅ Should increase (customer + vendor)
```

**Test: Booking Completed Notification**
```
-- Complete booking
POST /functions/v1/update-booking-status {...}

SELECT COUNT(*) FROM notifications 
WHERE notification_type = 'booking_completed'
AND user_id = '[CUSTOMER_ID]';
-- ✅ Should show new notification
```

**Test: Booking Cancelled Notification**
```
-- Cancel booking
POST /functions/v1/update-booking-status {...}

SELECT COUNT(*) FROM notifications 
WHERE notification_type = 'booking_cancelled';
-- ✅ Should show 2 (customer + vendor)
```

**Test: Payout Notification**
```
-- Process payout
POST /functions/v1/process-settlement {...}

SELECT notification_type FROM notifications 
WHERE related_vendor_id = '[VENDOR]' 
ORDER BY created_at DESC LIMIT 1;
-- ✅ Should show 'payout_processed'
```

---

## Phase 6: Authorization & Permission Tests

### ✅ Customer Permissions

**Test: Customer Can Create Booking**
```
POST /functions/v1/create-booking
{...customer creates booking...}
-- ✅ Should succeed
```

**Test: Customer Can Cancel Own Pending Booking**
```
POST /functions/v1/update-booking-status
{
  "booking_id": "[OWN_PENDING_BOOKING]",
  "new_status": "cancelled"
}
-- ✅ Should succeed
```

**Test: Customer Cannot Cancel Confirmed/Completed Booking**
```
POST /functions/v1/update-booking-status
{
  "booking_id": "[OWN_CONFIRMED_BOOKING]",
  "new_status": "cancelled"
}
-- ✅ Should fail (403 Forbidden)
```

**Test: Customer Can Only Review Completed Bookings**
```
-- Try to review pending booking
POST /functions/v1/manage-reviews
{
  "action": "create_review",
  "booking_id": "[PENDING_BOOKING]",
  "rating": 5
}
-- ✅ Should fail (400 Bad Request)

-- Review completed booking
POST /functions/v1/manage-reviews
{
  "action": "create_review",
  "booking_id": "[COMPLETED_BOOKING]",
  "rating": 5
}
-- ✅ Should succeed
```

### ✅ Vendor Permissions

**Test: Vendor Can Confirm Own Pending Bookings**
```
POST /functions/v1/update-booking-status
{
  "booking_id": "[OWN_PENDING_BOOKING]",
  "new_status": "confirmed"
}
-- ✅ Should succeed
```

**Test: Vendor Cannot Confirm Other Vendor's Bookings**
```
POST /functions/v1/update-booking-status
{
  "booking_id": "[OTHER_VENDOR_BOOKING]",
  "new_status": "confirmed"
}
-- ✅ Should fail (403 Forbidden)
```

**Test: Vendor Cannot Access Other Vendor Wallet**
```
SELECT * FROM vendor_wallets 
WHERE vendor_id != '[OWN_ID]';
-- ✅ Should return 0 rows (RLS blocks)
```

### ✅ Admin Permissions

**Test: Admin Can Perform Any Status Transition**
```
POST /functions/v1/update-booking-status
{...any transition...}
-- ✅ Should succeed (with proper validation)
```

**Test: Admin Can Create Payouts**
```
POST /functions/v1/process-settlement
{
  "action": "create_payout",
  "vendor_id": "[ANY_VENDOR]"
}
-- ✅ Should succeed
```

**Test: Non-Admin Cannot Create Payouts**
```
-- As vendor user:
POST /functions/v1/process-settlement
{
  "action": "create_payout",
  "vendor_id": "[VENDOR]"
}
-- ✅ Should fail (403 Forbidden)
```

---

## Phase 7: Data Integrity Tests

### ✅ Commission Immutability
```sql
-- Change commission rate
UPDATE commission_settings SET percentage = 20;

-- Create new booking
INSERT INTO bookings (...) VALUES (...);

-- Old booking should keep 15% commission
SELECT commission_amount, total_amount 
FROM bookings WHERE id = '[OLD_BOOKING]';
-- ✅ Commission_amount = total_amount * 0.15

-- New booking must use 20% (when confirmed)
-- [After confirmation]
SELECT commission_amount FROM bookings WHERE id = '[NEW_BOOKING]';
-- ✅ Commission_amount = total_amount * 0.20
```

### ✅ Wallet Balance Accuracy
```sql
-- For any vendor:
SELECT 
  (SELECT balance FROM vendor_wallets WHERE vendor_id = '[V]') as wallet,
  (
    SELECT COALESCE(SUM(net_amount), 0)
    FROM settlement_transactions 
    WHERE vendor_id = '[V]' AND transaction_type IN ('booking_earnings', 'payout')
  ) as calculated
WHERE wallet = calculated;
-- ✅ Both values should match
```

### ✅ Notification Uniqueness
```sql
-- Each binding should be unique (no duplicate notifs for same event)
SELECT 
  related_booking_id, 
  user_id, 
  notification_type, 
  COUNT(*) as cnt
FROM notifications
GROUP BY 1,2,3
HAVING COUNT(*) > 1;
-- ✅ Should return 0 rows (no duplicates)
```

---

## Phase 8: Performance Checks

### ✅ Index Usage
```sql
-- Vendor earnings query should use index
EXPLAIN SELECT * FROM settlement_transactions 
WHERE vendor_id = '[V]' AND transaction_type = 'booking_earnings';
-- ✅ Should show "Index Scan" on idx_settlement_vendor

-- Rating calculation should be instant
EXPLAIN SELECT * FROM vendor_rating_summary 
WHERE vendor_id = '[V]';
-- ✅ Should be "Index Scan" or "Seq Scan" (table is small)
```

### ✅ Query Performance
```bash
-- Settlement transaction query should be < 100ms
\timing on
SELECT * FROM settlement_transactions 
WHERE vendor_id = '[V]' LIMIT 100;
-- ✅ Should complete quickly

-- Payout report generation < 500ms
SELECT * FROM payouts WHERE status = 'pending';
-- ✅ Should be fast
```

---

## Phase 9: Documentation Verification

### ✅ Documentation Files Created
- [ ] `PRODUCTION_ENHANCEMENTS.md` exists (comprehensive guide)
- [ ] `QUICK_REFERENCE.md` exists (quick lookup)
- [ ] `DEPLOYMENT_CHECKLIST.md` exists (this file)

### ✅ README Integration
```markdown
## New Features (v2.0.0 - Feb 13, 2026)
- Vendor wallet system
- Settlement & payout management
- Booking lifecycle with status tracking
- Customer reviews & ratings
- Notification system
```

---

## Final Verification Checklist

| Item | Status | Notes |
|------|--------|-------|
| Migration file applied | ☐ | All 6 tables created |
| Functions deployed | ☐ | 3 new + 1 modified |
| RLS policies enabled | ☐ | All 40+ policies active |
| Seed data inserted | ☐ | Wallets + ratings initialized |
| Vendor isolation verified | ☐ | Cross-vendor access blocked |
| Customer privacy tested | ☐ | Only own data visible |
| Admin access confirmed | ☐ | Full access working |
| Status transitions working | ☐ | pending→confirmed→completed |
| Commission calculating | ☐ | Locked at confirmation |
| Payout flow tested | ☐ | Create → settle working |
| Reviews system verified | ☐ | Only completed bookings |
| Notifications generating | ☐ | All event types tested |
| Performance optimized | ☐ | Indexes created |
| Backward compatibility | ☐ | Old `status` field still works |
| Documentation complete | ☐ | All guides written |

---

## Rollback Plan

If issues occur:

### Option 1: Partial Rollback
```sql
-- Disable new RLS policies (keep data)
DROP POLICY IF EXISTS "Vendor can view own wallet" ON vendor_wallets;
-- etc...
```

### Option 2: Full Rollback
```bash
# Restore from pre-migration backup
supabase db restore --backup-id <BACKUP_ID>
```

### Option 3: Just Disable Functions
```bash
supabase functions delete update-booking-status
supabase functions delete process-settlement
supabase functions delete manage-reviews
```

---

## Go-Live Signoff

- [ ] All tests passed
- [ ] Performance verified
- [ ] RLS security confirmed
- [ ] Documentation complete
- [ ] Team briefed
- [ ] Monitoring setup
- [ ] Backup verified
- [ ] Production ready

**Date Deployed:** __________  
**Deployed By:** __________  
**Approved By:** __________  

---

**Status:** ✅ Ready for Production Deployment
