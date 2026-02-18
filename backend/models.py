from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional, Literal
from datetime import datetime
import uuid
from enum import Enum

# ============================================================
# ENUMS
# ============================================================

class VendorStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"

class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"

class PaymentStatus(str, Enum):
    unpaid = "unpaid"
    paid = "paid"
    refunded = "refunded"

class PayoutStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class UserRole(str, Enum):
    customer = "customer"
    vendor = "vendor"
    admin = "admin"

# ============================================================
# USER MODELS
# ============================================================

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: UserRole = UserRole.customer
    supabase_user_id: Optional[str] = None  # Link to Supabase auth
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    supabase_user_id: str

# ============================================================
# VENDOR MODELS
# ============================================================

class Vendor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_name: str
    description: Optional[str] = None
    contact_email: EmailStr
    contact_phone: str
    location: Optional[str] = None
    business_license: Optional[str] = None
    company_logo: Optional[str] = None
    status: VendorStatus = VendorStatus.pending
    commission_rate: float = 15.0  # Default commission rate
    is_approved: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None  # Admin user_id

class VendorCreate(BaseModel):
    user_id: str
    company_name: str
    description: Optional[str] = None
    contact_email: EmailStr
    contact_phone: str
    location: Optional[str] = None

class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    location: Optional[str] = None
    company_logo: Optional[str] = None

class VendorApproval(BaseModel):
    status: Literal["approved", "rejected", "suspended"]
    approved_by: str
    reason: Optional[str] = None

# ============================================================
# PACKAGE MODELS
# ============================================================

class Package(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    max_altitude: Optional[str] = None
    includes: Optional[List[str]] = None
    terms_conditions: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        return v

class PackageCreate(BaseModel):
    vendor_id: str
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    max_altitude: Optional[str] = None
    includes: Optional[List[str]] = None
    terms_conditions: Optional[str] = None

class PackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    max_altitude: Optional[str] = None
    includes: Optional[List[str]] = None
    terms_conditions: Optional[str] = None
    is_active: Optional[bool] = None

# ============================================================
# TIME SLOT / AVAILABILITY MODELS
# ============================================================

class TimeSlot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    package_id: Optional[str] = None  # Optional: slot for specific package
    slot_date: str  # YYYY-MM-DD format
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    capacity: int
    booked_count: int = 0
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TimeSlotCreate(BaseModel):
    vendor_id: str
    package_id: Optional[str] = None
    slot_date: str
    start_time: str
    end_time: str
    capacity: int

class TimeSlotUpdate(BaseModel):
    capacity: Optional[int] = None
    is_available: Optional[bool] = None

# ============================================================
# BOOKING MODELS
# ============================================================

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: Optional[str] = None  # User ID if logged in
    vendor_id: str
    package_id: str
    time_slot_id: Optional[str] = None
    
    # Customer details
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    
    # Financial details
    total_amount: float
    commission_amount: float  # Platform commission
    vendor_amount: float  # Amount vendor receives
    
    # Status
    status: BookingStatus = BookingStatus.pending
    payment_status: PaymentStatus = PaymentStatus.unpaid
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    # Additional info
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    vendor_notes: Optional[str] = None

class BookingCreate(BaseModel):
    customer_id: Optional[str] = None
    vendor_id: str
    package_id: str
    time_slot_id: Optional[str] = None
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    notes: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[BookingStatus] = None
    payment_status: Optional[PaymentStatus] = None
    vendor_notes: Optional[str] = None
    cancellation_reason: Optional[str] = None

# ============================================================
# COMMISSION & WALLET MODELS
# ============================================================

class CommissionSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    default_rate: float = 15.0
    min_rate: float = 10.0
    max_rate: float = 30.0
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None  # Admin user_id

class VendorWallet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    balance: float = 0.0  # Current available balance
    total_earned: float = 0.0  # Lifetime gross earnings
    total_commission: float = 0.0  # Lifetime commissions paid
    total_paid_out: float = 0.0  # Lifetime payouts to vendor
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================
# PAYOUT MODELS
# ============================================================

class Payout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    amount: float
    status: PayoutStatus = PayoutStatus.pending
    
    # Settlement details
    settled_by: Optional[str] = None  # Admin user_id
    settled_at: Optional[datetime] = None
    settlement_notes: Optional[str] = None
    payout_method: Optional[str] = None  # "bank_transfer", "stripe", etc.
    payout_reference: Optional[str] = None  # Transaction reference
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PayoutCreate(BaseModel):
    vendor_id: str
    amount: float
    payout_method: Optional[str] = None

class PayoutSettle(BaseModel):
    settled_by: str
    settlement_notes: Optional[str] = None
    payout_reference: Optional[str] = None
    status: Literal["completed", "failed"]

# ============================================================
# SETTLEMENT TRANSACTION MODELS
# ============================================================

class SettlementTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    booking_id: str
    
    transaction_type: Literal["booking_earnings", "commission_deducted", "payout"]
    gross_amount: float
    commission_amount: float
    net_amount: float
    
    payout_id: Optional[str] = None
    settled_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================
# REVIEW MODELS
# ============================================================

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    vendor_id: str
    customer_id: str
    
    rating: int  # 1-5
    title: Optional[str] = None
    content: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('rating')
    @classmethod
    def validate_rating(cls, v):
        if not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

class ReviewCreate(BaseModel):
    booking_id: str
    rating: int
    title: Optional[str] = None
    content: Optional[str] = None

class VendorRatingSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    average_rating: float = 0.0
    total_reviews: int = 0
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================
# NOTIFICATION MODELS
# ============================================================

class NotificationType(str, Enum):
    booking_confirmation = "booking_confirmation"
    vendor_approval = "vendor_approval"
    booking_completed = "booking_completed"
    booking_cancelled = "booking_cancelled"
    payout_processed = "payout_processed"
    system_alert = "system_alert"

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    notification_type: NotificationType
    
    title: str
    message: Optional[str] = None
    
    related_booking_id: Optional[str] = None
    related_vendor_id: Optional[str] = None
    
    is_read: bool = False
    read_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationCreate(BaseModel):
    user_id: str
    notification_type: NotificationType
    title: str
    message: Optional[str] = None
    related_booking_id: Optional[str] = None
    related_vendor_id: Optional[str] = None

# ============================================================
# RESPONSE MODELS
# ============================================================

class VendorWithPackages(BaseModel):
    vendor: Vendor
    packages: List[Package]
    rating_summary: Optional[VendorRatingSummary] = None

class BookingWithDetails(BaseModel):
    booking: Booking
    vendor: Vendor
    package: Package
    time_slot: Optional[TimeSlot] = None

class VendorDashboardStats(BaseModel):
    total_bookings: int
    pending_bookings: int
    confirmed_bookings: int
    completed_bookings: int
    total_revenue: float
    wallet_balance: float
    pending_payouts: float
    average_rating: float
    total_reviews: int

class AdminDashboardStats(BaseModel):
    total_vendors: int
    pending_vendors: int
    approved_vendors: int
    total_bookings: int
    total_revenue: float
    total_commission: float
    pending_payouts: float
