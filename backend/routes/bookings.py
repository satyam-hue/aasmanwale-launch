from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from database import get_database, COLLECTIONS
from models import (
    BookingCreate, BookingUpdate, Booking, BookingStatus,
    PaymentStatus
)
from auth import get_current_user, optional_auth
from utils import (
    get_commission_rate, calculate_commission,
    update_wallet_on_booking, create_booking_notifications,
    check_slot_availability, increment_slot_booking, decrement_slot_booking,
    is_booking_participant, get_user_role
)
from datetime import datetime

router = APIRouter(prefix="/bookings", tags=["bookings"])

# ============================================================
# CREATE BOOKING
# ============================================================

@router.post("", response_model=Booking)
async def create_booking(
    booking_data: BookingCreate,
    current_user: Optional[dict] = Depends(optional_auth)
):
    """Create a new booking (authenticated or guest)"""
    db = get_database()
    
    # Verify package exists and is active
    package = await db[COLLECTIONS['packages']].find_one({
        'id': booking_data.package_id,
        'is_active': True
    })
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Verify vendor is approved
    vendor = await db[COLLECTIONS['vendors']].find_one({
        'id': booking_data.vendor_id,
        'is_approved': True
    })
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not approved")
    
    # Check time slot availability if provided
    if booking_data.time_slot_id:
        available = await check_slot_availability(booking_data.time_slot_id)
        if not available:
            raise HTTPException(status_code=400, detail="Time slot not available")
    
    # Calculate commission
    commission_rate = await get_commission_rate(vendor['id'])
    financial_breakdown = calculate_commission(package['price'], commission_rate)
    
    # Create booking
    booking = Booking(
        customer_id=current_user['id'] if current_user else None,
        vendor_id=booking_data.vendor_id,
        package_id=booking_data.package_id,
        time_slot_id=booking_data.time_slot_id,
        customer_name=booking_data.customer_name,
        customer_email=booking_data.customer_email,
        customer_phone=booking_data.customer_phone,
        total_amount=financial_breakdown['total_amount'],
        commission_amount=financial_breakdown['commission_amount'],
        vendor_amount=financial_breakdown['vendor_amount'],
        notes=booking_data.notes,
        status=BookingStatus.pending
    )
    
    await db[COLLECTIONS['bookings']].insert_one(booking.dict())
    
    # Increment time slot booking count if applicable
    if booking_data.time_slot_id:
        await increment_slot_booking(booking_data.time_slot_id)
    
    return booking

# ============================================================
# UPDATE BOOKING STATUS
# ============================================================

@router.put("/{booking_id}/status", response_model=Booking)
async def update_booking_status(
    booking_id: str,
    updates: BookingUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update booking status (customer, vendor, or admin)"""
    db = get_database()
    
    # Get booking
    booking = await db[COLLECTIONS['bookings']].find_one({'id': booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get user role
    user_role = await get_user_role(current_user['id'])
    
    # Authorization checks
    is_participant = await is_booking_participant(current_user['id'], booking_id)
    is_admin = user_role == 'admin'
    
    if not is_participant and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")
    
    # Get vendor
    vendor = await db[COLLECTIONS['vendors']].find_one({'id': booking['vendor_id']})
    is_vendor = vendor and vendor['user_id'] == current_user['id']
    is_customer = booking.get('customer_id') == current_user['id']
    
    # Status transition rules
    if updates.status:
        current_status = booking['status']
        new_status = updates.status
        
        # Customer can only cancel pending bookings
        if is_customer and not is_admin:
            if new_status != BookingStatus.cancelled or current_status != BookingStatus.pending:
                raise HTTPException(
                    status_code=403,
                    detail="Customers can only cancel pending bookings"
                )
        
        # Vendor can confirm pending and complete confirmed
        if is_vendor and not is_admin:
            valid_transitions = (
                (current_status == BookingStatus.pending and new_status == BookingStatus.confirmed) or
                (current_status == BookingStatus.confirmed and new_status == BookingStatus.completed)
            )
            if not valid_transitions:
                raise HTTPException(
                    status_code=403,
                    detail="Invalid status transition for vendor"
                )
        
        # Handle status-specific logic
        update_data = {k: v for k, v in updates.dict(exclude_unset=True).items()}
        update_data['updated_at'] = datetime.utcnow()
        
        if new_status == BookingStatus.confirmed:
            update_data['confirmed_at'] = datetime.utcnow()
            # Record earnings in wallet
            await update_wallet_on_booking(
                vendor_id=booking['vendor_id'],
                booking_id=booking['id'],
                total_amount=booking['total_amount'],
                commission_amount=booking['commission_amount'],
                vendor_amount=booking['vendor_amount']
            )
            # Send notifications
            await create_booking_notifications(booking, vendor)
        
        elif new_status == BookingStatus.completed:
            update_data['completed_at'] = datetime.utcnow()
        
        elif new_status == BookingStatus.cancelled:
            update_data['cancelled_at'] = datetime.utcnow()
            # Decrement time slot if applicable
            if booking.get('time_slot_id'):
                await decrement_slot_booking(booking['time_slot_id'])
        
        await db[COLLECTIONS['bookings']].update_one(
            {'id': booking_id},
            {'$set': update_data}
        )
    
    updated_booking = await db[COLLECTIONS['bookings']].find_one({'id': booking_id})
    return updated_booking

# ============================================================
# GET BOOKINGS
# ============================================================

@router.get("/my-bookings", response_model=List[Booking])
async def get_my_bookings(
    status: Optional[BookingStatus] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get bookings for current user (customer or vendor)"""
    db = get_database()
    
    user_role = await get_user_role(current_user['id'])
    
    if user_role == 'vendor':
        # Get vendor bookings
        vendor = await db[COLLECTIONS['vendors']].find_one({'user_id': current_user['id']})
        if not vendor:
            return []
        
        query = {'vendor_id': vendor['id']}
    else:
        # Get customer bookings
        query = {'customer_id': current_user['id']}
    
    if status:
        query['status'] = status.value
    
    bookings = await db[COLLECTIONS['bookings']].find(query).sort('created_at', -1).to_list(100)
    return bookings

@router.get("/{booking_id}", response_model=Booking)
async def get_booking_details(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific booking details"""
    db = get_database()
    
    booking = await db[COLLECTIONS['bookings']].find_one({'id': booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    user_role = await get_user_role(current_user['id'])
    is_participant = await is_booking_participant(current_user['id'], booking_id)
    
    if not is_participant and user_role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    
    return booking
