# Quick Reference: Marketplace Production Features

## What's New?

### 📊 Vendor Wallet System
Track vendor earnings, commissions, and payouts automatically.

```
Booking Confirmed
    ↓
Commission Calculated (15% by default)
    ↓
Vendor Wallet Updated
    ↓
Settlement Transaction Recorded
```

---

### 💰 How Payouts Work

**State Flow:**
```
Pending Bookings (no earnings yet)
        ↓
Booking Confirmed (earnings added to wallet)
    ↓
    ...customer completes...
        ↓
Admin Creates Payout (from accumulated balance)
        ↓
Admin Settles Payout (marks complete, sends money)
```

**Amount Calculation:**
- Gross = Package Price
- Commission = Gross × 15% (or configured rate)
- Vendor Receives = Gross - Commission

---

### ⭐ Reviews & Ratings

**Who Can Review:** Customer (only after booking is COMPLETED)

**What Can Be Reviewed:** Any booking that reached COMPLETED status

**Rating Scale:** 1-5 stars

**Automatic Calculation:** Average rating updated instantly per vendor

---

### 🔔 Notifications

Sent automatically for:
- ✅ Booking confirmation
- ❌ Booking cancellation  
- ✓ Experience completed
- 💳 Payout processed
- ⭐ New review posted

**Access:** User sees own notifications only (RLS protected)

---

## API Endpoints

### 1️⃣ Update Booking Status
```
POST /functions/v1/update-booking-status
```

**Changing Status:**
- `pending` → `confirmed`: Book confirmed by vendor, earnings recorded
- `confirmed` → `completed`: Experience done, customer can now review
- Any → `cancelled`: Booking cancelled

**Who Can?**
- Customer: cancel their own pending bookings
- Vendor: confirm/complete own bookings
- Admin: do anything

**Example:**
```typescript
// Vendor confirms booking
const response = await fetch(
  'https://your-supabase-url/functions/v1/update-booking-status',
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      booking_id: 'xxx-xxx',
      new_status: 'confirmed',
      vendor_notes: 'Weather perfect, see you Saturday!'
    })
  }
);
```

---

### 2️⃣ Process Settlement (Admin Only)
```
POST /functions/v1/process-settlement
```

**Actions:**

**a) Create Payout**
```json
{
  "action": "create_payout",
  "vendor_id": "yyy-yyy"
}
```
- Vendor wallet balance → new payout record
- Vendor notified

**b) Settle Payout** (after payment transfer)
```json
{
  "action": "settle_payout",
  "payout_id": "zzz-zzz",
  "settlement_notes": "Stripe transfer completed"
}
```
- Payout marked complete
- Vendor wallet reset to 0
- Vendor notified

**c) Get Payout Report**
```json
{
  "action": "get_payout_report"
}
```
- Returns all payouts with status & amounts
- Optional: filter by vendor_id

---

### 3️⃣ Manage Reviews
```
POST /functions/v1/manage-reviews
```

**a) Create Review** (after booking COMPLETED)
```json
{
  "action": "create_review",
  "booking_id": "xxx-xxx",
  "rating": 5,
  "title": "Amazing experience!",
  "content": "Best paragliding adventure ever..."
}
```

**b) Get Vendor Reviews**
```json
{
  "action": "get_vendor_reviews",
  "vendor_id": "yyy-yyy"
}
```
- Returns all reviews
- Includes vendor average rating & review count

**c) Delete Review** (author or admin)
```json
{
  "action": "delete_review",
  "review_id": "zzz-zzz"
}
```

---

## Database Tables Summary

| Table | Purpose | Who Accesses |
|-------|---------|--------------|
| `vendor_wallets` | Current balance | Vendor, Admin |
| `settlement_transactions` | Earnings log | Vendor, Admin |
| `payouts` | Payout history | Vendor, Admin |
| `reviews` | Customer ratings | Everyone (approved vendors only) |
| `vendor_rating_summary` | Avg rating | Everyone |
| `notifications` | User alerts | User (own only) |

---

## Booking Status Lifecycle

```
┌─────────────────────────────────────────────────────┐
│                    BOOKING LIFECYCLE                 │
├─────────────────────────────────────────────────────┤
│                                                       │
│  [PENDING] ←─── New Booking Created                 │
│      ↓                                                │
│      ├─→ Time: Vendor Confirms  ─→ [CONFIRMED]      │
│      │   Action: Earnings Recorded to Wallet         │
│      │                                                 │
│      └─→ Time: Customer Cancels ─→ [CANCELLED]      │
│                                                       │
│  [CONFIRMED]                                          │
│      ↓                                                │
│      ├─→ Time: Vendor Completes ─→ [COMPLETED]      │
│      │   Action: Customer Can Now Review             │
│      │                                                 │
│      └─→ Time: Got Cancelled    ─→ [CANCELLED]      │
│                                                       │
│  [COMPLETED]                                          │
│      └─→ Open: Customer Reviews ⭐⭐⭐⭐⭐             │
│          → Triggers Rating Calculation               │
│                                                       │
│  [CANCELLED]                                          │
│      └─→ End State (no earnings recorded in pending) │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## How to Query Data

### Vendor's Wallet Balance
```sql
SELECT balance FROM vendor_wallets 
WHERE vendor_id = 'xxx-xxx';
```

### Vendor's Earnings
```sql
SELECT 
  SUM(gross_amount) as total_earned,
  SUM(commission_amount) as total_commission,
  SUM(net_amount) as net_received
FROM settlement_transactions 
WHERE vendor_id = 'xxx-xxx' 
AND transaction_type = 'booking_earnings';
```

### Payout History
```sql
SELECT * FROM payouts 
WHERE vendor_id = 'xxx-xxx' 
ORDER BY created_at DESC;
```

### Vendor Rating
```sql
SELECT average_rating, total_reviews 
FROM vendor_rating_summary 
WHERE vendor_id = 'xxx-xxx';
```

### Recent Bookings with Status
```sql
SELECT id, customer_name, booking_status, total_amount, confirmed_at 
FROM bookings 
WHERE vendor_id = 'xxx-xxx' 
ORDER BY created_at DESC;
```

---

## Key Business Rules

### ✅ Allowed
- Status progression: pending → confirmed → completed
- Vendor can only confirm own bookings
- Vendor can only complete confirmed bookings
- Customer can cancel pending bookings
- Customer can review completed bookings (once only)
- Admin can do any operation
- Anyone can view reviews of approved vendors

### ❌ Not Allowed
- Skip booking status (pending → completed directly)
- Review before booking is completed
- Review same booking twice
- Vendor access another vendor's data
- Customer access other customer's wallets
- Unapproved vendor's data access

---

## Commission It's calculated at booking confirmation, locked in permanently

**Formula:** `Commission = Gross Amount × Commission Rate ÷ 100`

**Default Rate:** 15%

**Can Be Changed:** Admin in `commission_settings` table (affects new bookings only)

**Example:**
- Package price: ₹10,000
- Commission rate: 15%
- Commission: ₹1,500
- Vendor receives: ₹8,500
- Platform receives: ₹1,500

---

## Notification Types

```
A. booking_confirmation
   - Event: Booking status changed to "confirmed"
   - Recipient: Customer + Vendor
   
B. booking_completed
   - Event: Booking status changed to "completed"
   - Recipient: Customer
   
C. booking_cancelled
   - Event: Booking status changed to "cancelled"
   - Recipient: Customer + Vendor
   
D. payout_processed
   - Event: Payout created or settled
   - Recipient: Vendor
   
E. vendor_approval
   - Event: Vendor approved by admin
   - Recipient: Vendor
   
F. system_alert
   - Event: Generic system messages
   - Recipient: Varies
```

---

## Common Admin Tasks

### 1. Approve Vendor & Create Wallet
```sql
UPDATE vendors SET is_approved = true 
WHERE id = 'xxx-xxx';
-- Wallet auto-created by trigger
```

### 2. View Vendor's Current Balance
```sql
SELECT vendor_id, balance, total_earned 
FROM vendor_wallets 
WHERE vendor_id = 'xxx-xxx';
```

### 3. Initiate Payout for Vendor
```
POST /functions/v1/process-settlement
{
  "action": "create_payout",
  "vendor_id": "xxx-xxx"
}
```

### 4. Mark Payout as Completed
```
POST /functions/v1/process-settlement
{
  "action": "settle_payout",
  "payout_id": "yyy-yyy",
  "settlement_notes": "Transferred to registered bank account"
}
```

### 5. Get All Pending Payouts
```sql
SELECT id, vendor_id, amount, created_at 
FROM payouts 
WHERE status = 'pending' 
ORDER BY created_at;
```

---

## Debugging Tips

**Q: Review creation fails with "Only after COMPLETED"**  
A: Booking must be in COMPLETED status. Check booking_status field in bookings table.

**Q: Vendor says balance is not updated**  
A: Balance updates only when booking moves to CONFIRMED. Check that booking_status = 'confirmed' and settlement_transaction was recorded.

**Q: Cannot access another vendor's data**  
A: RLS policies block cross-vendor access. This is intentional. Switch to that vendor's account or use admin credentials.

**Q: Commission different than expected**  
A: Commission is calculated at confirmation time from commission_settings. If rate changed after booking, old bookings keep old rate.

---

## Testing Against RLS

### Test Vendor Isolation
```sql
-- Vendor A user token
SELECT * FROM vendor_wallets 
WHERE vendor_id != 'vendor-a-id'; 
-- Should return 0 rows (RLS blocks)

SELECT * FROM vendor_wallets 
WHERE vendor_id = 'vendor-a-id'; 
-- Should succeed (own data)
```

### Test Customer Isolation
```sql
-- Customer A user token
SELECT * FROM bookings 
WHERE customer_id != 'customer-a-id'; 
-- Should return only if they're the vendor
```

### Test Admin Access
```sql
-- Admin user token
SELECT * FROM vendor_wallets; 
-- Should return all wallets
```

---

## Performance Considerations

**Indexes Added:**
- `settlement_transactions(vendor_id)` - Fast vendor earnings reports
- `payouts(vendor_id, status)` - Fast payout status queries
- `reviews(vendor_id)` - Fast rating calculations
- `notifications(user_id, is_read)` - Fast notification feeds

**Denormalization:**
- `vendor_rating_summary` - Pre-calculated to avoid COUNT/AVG on each query

---

## Compliance & Auditing

✅ **All transactions immutable**: settlement_transactions table append-only  
✅ **Role-based access**: RLS policies enforce who sees what  
✅ **Audit trail**: Every payout recorded with timestamp + admin ID  
✅ **Commission locked**: Never changes after booking confirmation  
✅ **Financial accuracy**: Wallet = SUM(transactions)  

---

## Files Modified/Created

### Migration
- `supabase/migrations/20260213_marketplace_enhancements.sql` - **NEW**

### Edge Functions
- `supabase/functions/update-booking-status/index.ts` - **NEW**
- `supabase/functions/process-settlement/index.ts` - **NEW**
- `supabase/functions/manage-reviews/index.ts` - **NEW**
- `supabase/functions/create-booking/index.ts` - **UPDATED**

### Documentation
- `PRODUCTION_ENHANCEMENTS.md` - **NEW** (detailed guide)
- `QUICK_REFERENCE.md` - **NEW** (this file)

---

**Status:** ✅ Production Ready  
**Deployment:** Apply migration → Deploy functions → Test  
**Safety:** All changes backward compatible, RLS prevents data leakage
