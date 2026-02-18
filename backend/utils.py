from typing import Optional
from datetime import datetime
from database import get_database, COLLECTIONS
from models import (
    VendorWallet, SettlementTransaction, Notification,
    NotificationType, CommissionSettings
)

# ============================================================
# COMMISSION CALCULATIONS
# ============================================================

async def get_commission_rate(vendor_id: str) -> float:
    """Get commission rate for a vendor (vendor-specific or default)"""
    db = get_database()
    
    # Check if vendor has custom rate
    vendor = await db[COLLECTIONS['vendors']].find_one({'id': vendor_id})
    if vendor and 'commission_rate' in vendor:
        return vendor['commission_rate']
    
    # Get default rate from settings
    settings = await db[COLLECTIONS['commission_settings']].find_one({})
    if settings:
        return settings.get('default_rate', 15.0)
    
    return 15.0  # Fallback default

def calculate_commission(total_amount: float, commission_rate: float) -> dict:
    """Calculate commission breakdown"""
    commission_amount = round((total_amount * commission_rate) / 100, 2)
    vendor_amount = round(total_amount - commission_amount, 2)
    
    return {
        'total_amount': total_amount,
        'commission_amount': commission_amount,
        'vendor_amount': vendor_amount,
        'commission_rate': commission_rate
    }

# ============================================================
# WALLET MANAGEMENT
# ============================================================

async def create_vendor_wallet(vendor_id: str):
    """Create wallet for newly approved vendor"""
    db = get_database()
    
    # Check if wallet already exists
    existing = await db[COLLECTIONS['vendor_wallets']].find_one({'vendor_id': vendor_id})
    if existing:
        return existing
    
    wallet = VendorWallet(vendor_id=vendor_id)
    await db[COLLECTIONS['vendor_wallets']].insert_one(wallet.dict())
    return wallet

async def update_wallet_on_booking(vendor_id: str, booking_id: str, 
                                   total_amount: float, commission_amount: float, 
                                   vendor_amount: float):
    """Update vendor wallet when booking is confirmed"""
    db = get_database()
    
    # Update wallet balance and totals
    await db[COLLECTIONS['vendor_wallets']].update_one(
        {'vendor_id': vendor_id},
        {
            '$inc': {
                'balance': vendor_amount,
                'total_earned': total_amount,
                'total_commission': commission_amount
            },
            '$set': {'updated_at': datetime.utcnow()}
        }
    )
    
    # Record settlement transaction
    transaction = SettlementTransaction(
        vendor_id=vendor_id,
        booking_id=booking_id,
        transaction_type="booking_earnings",
        gross_amount=total_amount,
        commission_amount=commission_amount,
        net_amount=vendor_amount
    )
    await db[COLLECTIONS['settlement_transactions']].insert_one(transaction.dict())

async def get_vendor_wallet(vendor_id: str) -> Optional[dict]:
    """Get vendor wallet details"""
    db = get_database()
    return await db[COLLECTIONS['vendor_wallets']].find_one({'vendor_id': vendor_id})

# ============================================================
# PAYOUT MANAGEMENT
# ============================================================

async def process_payout(payout_id: str, settled_by: str, 
                        settlement_notes: Optional[str] = None,
                        payout_reference: Optional[str] = None,
                        status: str = "completed"):
    """Mark payout as completed and update wallet"""
    db = get_database()
    
    # Get payout details
    payout = await db[COLLECTIONS['payouts']].find_one({'id': payout_id})
    if not payout:
        raise ValueError("Payout not found")
    
    # Update payout status
    await db[COLLECTIONS['payouts']].update_one(
        {'id': payout_id},
        {
            '$set': {
                'status': status,
                'settled_by': settled_by,
                'settled_at': datetime.utcnow(),
                'settlement_notes': settlement_notes,
                'payout_reference': payout_reference,
                'updated_at': datetime.utcnow()
            }
        }
    )
    
    # If completed, update wallet
    if status == "completed":
        await db[COLLECTIONS['vendor_wallets']].update_one(
            {'vendor_id': payout['vendor_id']},
            {
                '$inc': {
                    'balance': -payout['amount'],  # Deduct from balance
                    'total_paid_out': payout['amount']  # Add to paid out total
                },
                '$set': {'updated_at': datetime.utcnow()}
            }
        )
        
        # Create notification
        await create_notification(
            user_id=payout['vendor_id'],
            notification_type=NotificationType.payout_processed,
            title="Payout Completed",
            message=f"Your payout of ₹{payout['amount']} has been processed successfully."
        )

# ============================================================
# REVIEW & RATING MANAGEMENT
# ============================================================

async def update_vendor_rating(vendor_id: str):
    """Recalculate vendor's average rating"""
    db = get_database()
    
    # Get all reviews for vendor
    reviews = await db[COLLECTIONS['reviews']].find({'vendor_id': vendor_id}).to_list(1000)
    
    if not reviews:
        # No reviews, set to 0
        await db[COLLECTIONS['vendor_rating_summary']].update_one(
            {'vendor_id': vendor_id},
            {
                '$set': {
                    'average_rating': 0.0,
                    'total_reviews': 0,
                    'calculated_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
            },
            upsert=True
        )
        return
    
    # Calculate average
    total_rating = sum(r['rating'] for r in reviews)
    average_rating = round(total_rating / len(reviews), 2)
    
    # Update summary
    await db[COLLECTIONS['vendor_rating_summary']].update_one(
        {'vendor_id': vendor_id},
        {
            '$set': {
                'average_rating': average_rating,
                'total_reviews': len(reviews),
                'calculated_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
        },
        upsert=True
    )

# ============================================================
# NOTIFICATION MANAGEMENT
# ============================================================

async def create_notification(user_id: str, notification_type: NotificationType,
                             title: str, message: Optional[str] = None,
                             related_booking_id: Optional[str] = None,
                             related_vendor_id: Optional[str] = None):
    """Create a notification for a user"""
    db = get_database()
    
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_booking_id=related_booking_id,
        related_vendor_id=related_vendor_id
    )
    
    await db[COLLECTIONS['notifications']].insert_one(notification.dict())
    return notification

async def create_booking_notifications(booking: dict, vendor: dict):
    """Create notifications for booking events"""
    # Notify customer
    if booking.get('customer_id'):
        await create_notification(
            user_id=booking['customer_id'],
            notification_type=NotificationType.booking_confirmation,
            title="Booking Confirmed",
            message=f"Your booking with {vendor['company_name']} has been confirmed.",
            related_booking_id=booking['id'],
            related_vendor_id=vendor['id']
        )
    
    # Notify vendor
    await create_notification(
        user_id=vendor['user_id'],
        notification_type=NotificationType.booking_confirmation,
        title="New Booking",
        message=f"New booking from {booking['customer_name']}",
        related_booking_id=booking['id']
    )

# ============================================================
# TIME SLOT MANAGEMENT
# ============================================================

async def check_slot_availability(time_slot_id: str) -> bool:
    """Check if a time slot has available capacity"""
    db = get_database()
    
    slot = await db[COLLECTIONS['time_slots']].find_one({'id': time_slot_id})
    if not slot:
        return False
    
    return slot['is_available'] and slot['booked_count'] < slot['capacity']

async def increment_slot_booking(time_slot_id: str):
    """Increment booked count for a time slot"""
    db = get_database()
    
    result = await db[COLLECTIONS['time_slots']].update_one(
        {'id': time_slot_id},
        {
            '$inc': {'booked_count': 1},
            '$set': {'updated_at': datetime.utcnow()}
        }
    )
    
    # Check if slot is now full
    slot = await db[COLLECTIONS['time_slots']].find_one({'id': time_slot_id})
    if slot and slot['booked_count'] >= slot['capacity']:
        await db[COLLECTIONS['time_slots']].update_one(
            {'id': time_slot_id},
            {'$set': {'is_available': False, 'updated_at': datetime.utcnow()}}
        )

async def decrement_slot_booking(time_slot_id: str):
    """Decrement booked count for a time slot (on cancellation)"""
    db = get_database()
    
    await db[COLLECTIONS['time_slots']].update_one(
        {'id': time_slot_id},
        {
            '$inc': {'booked_count': -1},
            '$set': {'is_available': True, 'updated_at': datetime.utcnow()}
        }
    )

# ============================================================
# AUTHORIZATION HELPERS
# ============================================================

async def get_user_role(user_id: str) -> Optional[str]:
    """Get user's role"""
    db = get_database()
    user = await db[COLLECTIONS['users']].find_one({'id': user_id})
    return user['role'] if user else None

async def is_vendor_owner(user_id: str, vendor_id: str) -> bool:
    """Check if user owns the vendor account"""
    db = get_database()
    vendor = await db[COLLECTIONS['vendors']].find_one({'id': vendor_id})
    return vendor and vendor['user_id'] == user_id

async def is_booking_participant(user_id: str, booking_id: str) -> bool:
    """Check if user is customer or vendor of the booking"""
    db = get_database()
    booking = await db[COLLECTIONS['bookings']].find_one({'id': booking_id})
    if not booking:
        return False
    
    # Check if customer
    if booking.get('customer_id') == user_id:
        return True
    
    # Check if vendor
    vendor = await db[COLLECTIONS['vendors']].find_one({'id': booking['vendor_id']})
    return vendor and vendor['user_id'] == user_id

async def get_vendor_by_user_id(user_id: str) -> Optional[dict]:
    """Get vendor profile by user ID"""
    db = get_database()
    return await db[COLLECTIONS['vendors']].find_one({'user_id': user_id})
