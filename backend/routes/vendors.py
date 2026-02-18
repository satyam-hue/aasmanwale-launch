from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from database import get_database, COLLECTIONS
from models import (
    VendorCreate, VendorUpdate, VendorApproval,
    Vendor, VendorStatus, Package, VendorDashboardStats
)
from auth import get_current_user, require_role, get_current_vendor, require_approved_vendor
from models import UserRole
from utils import (
    create_vendor_wallet, get_vendor_wallet,
    create_notification, get_vendor_by_user_id
)
from models import NotificationType
from datetime import datetime

router = APIRouter(prefix="/vendors", tags=["vendors"])

# ============================================================
# VENDOR REGISTRATION & PROFILE
# ============================================================

@router.post("/register", response_model=Vendor)
async def register_vendor(
    vendor_data: VendorCreate,
    current_user: dict = Depends(get_current_user)
):
    """Register as a new vendor"""
    db = get_database()
    
    # Check if user already has a vendor profile
    existing = await db[COLLECTIONS['vendors']].find_one({'user_id': current_user['id']})
    if existing:
        raise HTTPException(status_code=400, detail="Vendor profile already exists")
    
    # Create vendor profile
    vendor = Vendor(
        user_id=current_user['id'],
        company_name=vendor_data.company_name,
        description=vendor_data.description,
        contact_email=vendor_data.contact_email,
        contact_phone=vendor_data.contact_phone,
        location=vendor_data.location,
        status=VendorStatus.pending,
        is_approved=False
    )
    
    await db[COLLECTIONS['vendors']].insert_one(vendor.dict())
    
    # Update user role to vendor (pending approval)
    await db[COLLECTIONS['users']].update_one(
        {'id': current_user['id']},
        {'$set': {'role': UserRole.vendor.value}}
    )
    
    # TODO: Notify admin about new vendor registration
    
    return vendor

@router.get("/profile", response_model=Vendor)
async def get_vendor_profile(current_vendor: dict = Depends(get_current_vendor)):
    """Get current vendor's profile"""
    return current_vendor

@router.put("/profile", response_model=Vendor)
async def update_vendor_profile(
    updates: VendorUpdate,
    current_vendor: dict = Depends(get_current_vendor)
):
    """Update vendor profile"""
    db = get_database()
    
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items()}
    update_data['updated_at'] = datetime.utcnow()
    
    await db[COLLECTIONS['vendors']].update_one(
        {'id': current_vendor['id']},
        {'$set': update_data}
    )
    
    updated_vendor = await db[COLLECTIONS['vendors']].find_one({'id': current_vendor['id']})
    return updated_vendor

@router.get("/dashboard", response_model=VendorDashboardStats)
async def get_vendor_dashboard(current_vendor: dict = Depends(require_approved_vendor)):
    """Get vendor dashboard statistics"""
    db = get_database()
    vendor_id = current_vendor['id']
    
    # Get bookings stats
    all_bookings = await db[COLLECTIONS['bookings']].find({'vendor_id': vendor_id}).to_list(1000)
    
    total_bookings = len(all_bookings)
    pending_bookings = len([b for b in all_bookings if b['status'] == 'pending'])
    confirmed_bookings = len([b for b in all_bookings if b['status'] == 'confirmed'])
    completed_bookings = len([b for b in all_bookings if b['status'] == 'completed'])
    
    # Calculate total revenue (from completed bookings)
    total_revenue = sum(b['vendor_amount'] for b in all_bookings if b['status'] == 'completed')
    
    # Get wallet info
    wallet = await get_vendor_wallet(vendor_id)
    wallet_balance = wallet['balance'] if wallet else 0.0
    
    # Get pending payouts
    pending_payouts = await db[COLLECTIONS['payouts']].find(
        {'vendor_id': vendor_id, 'status': 'pending'}
    ).to_list(100)
    pending_payout_amount = sum(p['amount'] for p in pending_payouts)
    
    # Get rating
    rating_summary = await db[COLLECTIONS['vendor_rating_summary']].find_one({'vendor_id': vendor_id})
    average_rating = rating_summary['average_rating'] if rating_summary else 0.0
    total_reviews = rating_summary['total_reviews'] if rating_summary else 0
    
    return VendorDashboardStats(
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        confirmed_bookings=confirmed_bookings,
        completed_bookings=completed_bookings,
        total_revenue=total_revenue,
        wallet_balance=wallet_balance,
        pending_payouts=pending_payout_amount,
        average_rating=average_rating,
        total_reviews=total_reviews
    )

# ============================================================
# PUBLIC VENDOR BROWSING
# ============================================================

@router.get("", response_model=List[Vendor])
async def browse_vendors(
    location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Browse all approved vendors (public)"""
    db = get_database()
    
    query = {'is_approved': True, 'status': VendorStatus.approved.value}
    if location:
        query['location'] = {'$regex': location, '$options': 'i'}
    
    vendors = await db[COLLECTIONS['vendors']].find(query).skip(skip).limit(limit).to_list(limit)
    return vendors

@router.get("/{vendor_id}", response_model=Vendor)
async def get_vendor_details(vendor_id: str):
    """Get specific vendor details (public)"""
    db = get_database()
    
    vendor = await db[COLLECTIONS['vendors']].find_one({
        'id': vendor_id,
        'is_approved': True,
        'status': VendorStatus.approved.value
    })
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return vendor
