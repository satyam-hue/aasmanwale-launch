# Marketplace API Documentation

## Overview
FastAPI + MongoDB backend for multi-vendor paragliding booking marketplace.

**Base URL**: `/api`
**API Docs**: `/docs` (Swagger UI)

---

## Authentication

Most endpoints require authentication via Supabase JWT token:
```
Authorization: Bearer <supabase_jwt_token>
```

For development, you can use user_id as token.

---

## API Endpoints

### 🏢 Vendor Management

#### Register as Vendor
```
POST /api/vendors/register
Authorization: Required (customer role)
Body: {
  "user_id": "string",
  "company_name": "string",
  "description": "string",
  "contact_email": "email",
  "contact_phone": "string",
  "location": "string"
}
```

#### Get Vendor Profile
```
GET /api/vendors/profile
Authorization: Required (vendor role)
```

#### Update Vendor Profile
```
PUT /api/vendors/profile
Authorization: Required (vendor role)
Body: {
  "company_name": "string",
  "description": "string",
  "contact_email": "email",
  "contact_phone": "string",
  "location": "string",
  "company_logo": "string"
}
```

#### Get Vendor Dashboard
```
GET /api/vendors/dashboard
Authorization: Required (approved vendor)
Response: {
  "total_bookings": int,
  "pending_bookings": int,
  "confirmed_bookings": int,
  "completed_bookings": int,
  "total_revenue": float,
  "wallet_balance": float,
  "pending_payouts": float,
  "average_rating": float,
  "total_reviews": int
}
```

#### Browse Vendors (Public)
```
GET /api/vendors?location=string&skip=0&limit=20
Authorization: None
```

#### Get Vendor Details (Public)
```
GET /api/vendors/{vendor_id}
Authorization: None
```

---

### 📦 Package Management

#### Create Package
```
POST /api/packages
Authorization: Required (approved vendor)
Body: {
  "vendor_id": "string",
  "name": "string",
  "description": "string",
  "price": float,
  "duration_minutes": int,
  "max_altitude": "string",
  "includes": ["string"],
  "terms_conditions": "string"
}
```

#### Get My Packages
```
GET /api/packages/my-packages
Authorization: Required (approved vendor)
```

#### Update Package
```
PUT /api/packages/{package_id}
Authorization: Required (approved vendor, own package)
Body: {
  "name": "string",
  "description": "string",
  "price": float,
  "duration_minutes": int,
  "max_altitude": "string",
  "includes": ["string"],
  "is_active": boolean
}
```

#### Delete Package
```
DELETE /api/packages/{package_id}
Authorization: Required (approved vendor, own package)
```

#### Browse Packages (Public)
```
GET /api/packages?vendor_id=string&min_price=float&max_price=float&skip=0&limit=20
Authorization: None
```

#### Get Package Details (Public)
```
GET /api/packages/{package_id}
Authorization: None
```

---

### ⏰ Time Slot Management

#### Create Time Slot
```
POST /api/time-slots
Authorization: Required (approved vendor)
Body: {
  "vendor_id": "string",
  "package_id": "string",
  "slot_date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "capacity": int
}
```

#### Get My Time Slots
```
GET /api/time-slots/my-slots?slot_date=YYYY-MM-DD
Authorization: Required (approved vendor)
```

#### Update Time Slot
```
PUT /api/time-slots/{slot_id}
Authorization: Required (approved vendor, own slot)
Body: {
  "capacity": int,
  "is_available": boolean
}
```

#### Delete Time Slot
```
DELETE /api/time-slots/{slot_id}
Authorization: Required (approved vendor, own slot)
```

#### Get Package Availability (Public)
```
GET /api/time-slots/availability/{package_id}?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
Authorization: None
```

---

### 📅 Booking Management

#### Create Booking
```
POST /api/bookings
Authorization: Optional (guest or authenticated)
Body: {
  "customer_id": "string",  // optional
  "vendor_id": "string",
  "package_id": "string",
  "time_slot_id": "string",  // optional
  "customer_name": "string",
  "customer_email": "email",
  "customer_phone": "string",
  "notes": "string"
}
Response includes:
- total_amount: Calculated from package price
- commission_amount: Platform commission (15% default)
- vendor_amount: Amount vendor receives
```

#### Update Booking Status
```
PUT /api/bookings/{booking_id}/status
Authorization: Required (customer/vendor/admin)
Body: {
  "status": "pending|confirmed|completed|cancelled",
  "payment_status": "unpaid|paid|refunded",
  "vendor_notes": "string",
  "cancellation_reason": "string"
}

Status Transition Rules:
- Customer: Can cancel pending bookings only
- Vendor: Can confirm pending, complete confirmed
- Admin: Can do anything

On Confirmed:
- Earnings recorded in vendor wallet
- Notifications sent to customer and vendor
```

#### Get My Bookings
```
GET /api/bookings/my-bookings?status=pending
Authorization: Required
Returns:
- For customers: their bookings
- For vendors: bookings for their packages
```

#### Get Booking Details
```
GET /api/bookings/{booking_id}
Authorization: Required (participant or admin)
```

---

### 👨‍💼 Admin Management

#### Get Pending Vendors
```
GET /api/admin/vendors/pending
Authorization: Required (admin)
```

#### Approve/Reject Vendor
```
PUT /api/admin/vendors/{vendor_id}/approve
Authorization: Required (admin)
Body: {
  "status": "approved|rejected|suspended",
  "approved_by": "string",
  "reason": "string"
}
On Approval:
- Vendor status updated
- Wallet created for vendor
- Notification sent to vendor
```

#### Suspend Vendor
```
PUT /api/admin/vendors/{vendor_id}/suspend
Authorization: Required (admin)
```

#### Get Commission Settings
```
GET /api/admin/commission-settings
Authorization: Required (admin)
```

#### Update Commission Settings
```
PUT /api/admin/commission-settings?default_rate=15.0
Authorization: Required (admin)
```

#### Set Vendor Commission Rate
```
PUT /api/admin/vendors/{vendor_id}/commission-rate?commission_rate=12.0
Authorization: Required (admin)
```

#### Get All Payouts
```
GET /api/admin/payouts?status=pending&vendor_id=string
Authorization: Required (admin)
```

#### Create Payout
```
POST /api/admin/payouts
Authorization: Required (admin)
Body: {
  "vendor_id": "string",
  "amount": float,
  "payout_method": "string"
}
Validates:
- Vendor wallet balance >= payout amount
```

#### Settle Payout
```
PUT /api/admin/payouts/{payout_id}/settle
Authorization: Required (admin)
Body: {
  "settled_by": "string",
  "settlement_notes": "string",
  "payout_reference": "string",
  "status": "completed|failed"
}
On Complete:
- Vendor wallet balance reduced
- Vendor notified
```

#### Get Admin Dashboard
```
GET /api/admin/dashboard
Authorization: Required (admin)
Response: {
  "total_vendors": int,
  "pending_vendors": int,
  "approved_vendors": int,
  "total_bookings": int,
  "total_revenue": float,
  "total_commission": float,
  "pending_payouts": float
}
```

#### Get All Bookings
```
GET /api/admin/bookings?status=string&vendor_id=string&skip=0&limit=50
Authorization: Required (admin)
```

---

### ⭐ Review & Rating System

#### Create Review
```
POST /api/reviews
Authorization: Required (customer)
Body: {
  "booking_id": "string",
  "rating": 1-5,
  "title": "string",
  "content": "string"
}
Rules:
- Can only review completed bookings
- One review per booking
- Must be the customer of the booking
Auto-updates vendor rating
```

#### Get Vendor Reviews (Public)
```
GET /api/reviews/vendor/{vendor_id}?skip=0&limit=20
Authorization: None
```

#### Get Vendor Rating Summary (Public)
```
GET /api/reviews/vendor/{vendor_id}/summary
Authorization: None
Response: {
  "vendor_id": "string",
  "average_rating": float,
  "total_reviews": int,
  "calculated_at": "datetime"
}
```

#### Update Review
```
PUT /api/reviews/{review_id}?rating=5&title=string&content=string
Authorization: Required (author)
Auto-updates vendor rating
```

#### Delete Review
```
DELETE /api/reviews/{review_id}
Authorization: Required (author or admin)
Auto-updates vendor rating
```

---

## Business Logic

### Commission Calculation
- Default: 15% platform commission
- Configurable by admin (global or per-vendor)
- Calculated at booking creation
- Locked permanently once booking confirmed

Formula:
```
total_amount = package.price
commission_amount = total_amount * commission_rate / 100
vendor_amount = total_amount - commission_amount
```

### Vendor Wallet
Auto-created when vendor approved.

Fields:
- `balance`: Current available for payout
- `total_earned`: Lifetime gross earnings
- `total_commission`: Lifetime platform commission
- `total_paid_out`: Lifetime payouts

Updates:
- **On Booking Confirmed**: balance += vendor_amount
- **On Payout Settled**: balance -= payout_amount

### Booking Status Flow
```
pending (initial)
  ↓ vendor confirms
confirmed (earnings recorded)
  ↓ vendor completes
completed (customer can review)
  
OR any status → cancelled
```

### Authorization Matrix
| Endpoint | Customer | Vendor | Admin |
|----------|----------|--------|-------|
| Create Booking | ✅ | ✅ | ✅ |
| Confirm Booking | ❌ | ✅ (own) | ✅ |
| Complete Booking | ❌ | ✅ (own) | ✅ |
| Cancel Pending | ✅ (own) | ✅ (own) | ✅ |
| Create Package | ❌ | ✅ | ❌ |
| Approve Vendor | ❌ | ❌ | ✅ |
| Create Payout | ❌ | ❌ | ✅ |
| Review Booking | ✅ (own completed) | ❌ | ❌ |

---

## Database Collections

1. **users** - User accounts linked to Supabase
2. **vendors** - Vendor profiles and approval status
3. **packages** - Service packages offered by vendors
4. **time_slots** - Availability slots for bookings
5. **bookings** - Customer bookings with commission tracking
6. **vendor_wallets** - Vendor earnings and balance
7. **payouts** - Payout requests and settlements
8. **settlement_transactions** - Immutable earnings log
9. **reviews** - Customer reviews
10. **vendor_rating_summary** - Cached rating calculations
11. **notifications** - User notifications
12. **commission_settings** - Platform commission configuration

---

## Error Responses

Standard error format:
```json
{
  "detail": "Error message"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Development Notes

### Running the API
```bash
sudo supervisorctl restart backend
```

### View Logs
```bash
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log
```

### API Documentation
Visit `/docs` for interactive Swagger UI

### Testing
Use the testing agent to test backend APIs before connecting frontend.
