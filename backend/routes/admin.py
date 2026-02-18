from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from database import get_database, COLLECTIONS
from models import (
    VendorApproval, Vendor, VendorStatus,
    Payout, PayoutCreate, PayoutSettle, PayoutStatus,
    CommissionSettings, AdminDashboardStats
)
from auth import get_current_user, require_role
from models import UserRole, NotificationType
from utils import create_vendor_wallet, create_notification, process_payout
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])

# ============================================================
# VENDOR MANAGEMENT
# ============================================================

@router.get("/vendors/pending", response_model=List[Vendor])
async def get_pending_vendors(
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Get all pending vendor applications"""
    db = get_database()
    
    vendors = await db[COLLECTIONS['vendors']].find({
        'status': VendorStatus.pending.value
    }).to_list(100)
    
    return vendors

@router.put("/vendors/{vendor_id}/approve", response_model=Vendor)
async def approve_vendor(
    vendor_id: str,
    approval: VendorApproval,
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Approve or reject a vendor"""
    db = get_database()
    
    vendor = await db[COLLECTIONS['vendors']].find_one({'id': vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update vendor status
    update_data = {
        'status': approval.status,
        'approved_by': current_user['id'],
        'approved_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    
    if approval.status == 'approved':
        update_data['is_approved'] = True
    elif approval.status in ['rejected', 'suspended']:
        update_data['is_approved'] = False
    
    await db[COLLECTIONS['vendors']].update_one(
        {'id': vendor_id},
        {'$set': update_data}
    )
    
    # Create wallet if approved
    if approval.status == 'approved':
        await create_vendor_wallet(vendor_id)
        
        # Notify vendor
        await create_notification(
            user_id=vendor['user_id'],
            notification_type=NotificationType.vendor_approval,
            title="Vendor Application Approved",
            message=f"Congratulations! Your vendor application has been approved. You can now start listing packages.",
            related_vendor_id=vendor_id
        )
    
    updated_vendor = await db[COLLECTIONS['vendors']].find_one({'id': vendor_id})
    return updated_vendor

@router.put("/vendors/{vendor_id}/suspend")
async def suspend_vendor(
    vendor_id: str,
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Suspend a vendor"""
    db = get_database()
    
    vendor = await db[COLLECTIONS['vendors']].find_one({'id': vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    await db[COLLECTIONS['vendors']].update_one(
        {'id': vendor_id},
        {
            '$set': {
                'status': VendorStatus.suspended.value,
                'is_approved': False,
                'updated_at': datetime.utcnow()
            }
        }
    )
    
    return {"message": "Vendor suspended successfully"}

# ============================================================
# COMMISSION MANAGEMENT
# ============================================================

@router.get("/commission-settings", response_model=CommissionSettings)
async def get_commission_settings(
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Get commission settings"""
    db = get_database()
    
    settings = await db[COLLECTIONS['commission_settings']].find_one({})
    if not settings:
        # Create default settings
        settings = CommissionSettings()
        await db[COLLECTIONS['commission_settings']].insert_one(settings.dict())
    
    return settings

@router.put("/commission-settings", response_model=CommissionSettings)
async def update_commission_settings(
    default_rate: float = Query(..., ge=0, le=100),
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Update default commission rate"""
    db = get_database()
    
    settings = await db[COLLECTIONS['commission_settings']].find_one({})
    
    if settings:
        await db[COLLECTIONS['commission_settings']].update_one(
            {'id': settings['id']},
            {
                '$set': {
                    'default_rate': default_rate,
                    'updated_at': datetime.utcnow(),
                    'updated_by': current_user['id']
                }
            }
        )
    else:
        settings = CommissionSettings(
            default_rate=default_rate,
            updated_by=current_user['id']
        )
        await db[COLLECTIONS['commission_settings']].insert_one(settings.dict())
    
    updated_settings = await db[COLLECTIONS['commission_settings']].find_one({})
    return updated_settings

@router.put("/vendors/{vendor_id}/commission-rate")
async def set_vendor_commission_rate(
    vendor_id: str,
    commission_rate: float = Query(..., ge=0, le=100),
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Set custom commission rate for a specific vendor"""
    db = get_database()
    
    vendor = await db[COLLECTIONS['vendors']].find_one({'id': vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    await db[COLLECTIONS['vendors']].update_one(
        {'id': vendor_id},
        {'$set': {'commission_rate': commission_rate, 'updated_at': datetime.utcnow()}}
    )
    
    return {"message": f"Commission rate set to {commission_rate}% for vendor"}

# ============================================================
# PAYOUT MANAGEMENT
# ============================================================

@router.get("/payouts", response_model=List[Payout])
async def get_all_payouts(
    status: Optional[PayoutStatus] = Query(None),
    vendor_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Get all payouts (filterable)"""
    db = get_database()
    
    query = {}
    if status:
        query['status'] = status.value
    if vendor_id:
        query['vendor_id'] = vendor_id
    
    payouts = await db[COLLECTIONS['payouts']].find(query).sort('created_at', -1).to_list(200)
    return payouts

@router.post("/payouts", response_model=Payout)
async def create_payout(
    payout_data: PayoutCreate,
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Create a payout for a vendor"""
    db = get_database()
    
    # Verify vendor exists
    vendor = await db[COLLECTIONS['vendors']].find_one({'id': payout_data.vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Get vendor wallet
    wallet = await db[COLLECTIONS['vendor_wallets']].find_one({'vendor_id': payout_data.vendor_id})
    if not wallet:
        raise HTTPException(status_code=404, detail="Vendor wallet not found")
    
    # Check if amount exceeds balance
    if payout_data.amount > wallet['balance']:
        raise HTTPException(
            status_code=400,
            detail=f"Payout amount ({payout_data.amount}) exceeds wallet balance ({wallet['balance']})"
        )
    
    # Create payout
    payout = Payout(
        vendor_id=payout_data.vendor_id,
        amount=payout_data.amount,
        payout_method=payout_data.payout_method,
        status=PayoutStatus.pending
    )
    
    await db[COLLECTIONS['payouts']].insert_one(payout.dict())
    
    # Notify vendor
    await create_notification(
        user_id=vendor['user_id'],
        notification_type=NotificationType.payout_processed,
        title="Payout Initiated",
        message=f"A payout of ₹{payout_data.amount} has been initiated and is being processed."
    )
    
    return payout

@router.put("/payouts/{payout_id}/settle", response_model=Payout)
async def settle_payout(
    payout_id: str,
    settlement: PayoutSettle,
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Mark payout as completed or failed"""
    await process_payout(
        payout_id=payout_id,
        settled_by=current_user['id'],
        settlement_notes=settlement.settlement_notes,
        payout_reference=settlement.payout_reference,
        status=settlement.status
    )
    
    db = get_database()
    updated_payout = await db[COLLECTIONS['payouts']].find_one({'id': payout_id})
    return updated_payout

# ============================================================
# ANALYTICS & REPORTING
# ============================================================

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Get admin dashboard statistics"""
    db = get_database()
    
    # Vendor stats
    all_vendors = await db[COLLECTIONS['vendors']].find({}).to_list(1000)
    total_vendors = len(all_vendors)
    pending_vendors = len([v for v in all_vendors if v['status'] == VendorStatus.pending.value])
    approved_vendors = len([v for v in all_vendors if v['is_approved']])
    
    # Booking stats
    all_bookings = await db[COLLECTIONS['bookings']].find({}).to_list(5000)
    total_bookings = len(all_bookings)
    total_revenue = sum(b['total_amount'] for b in all_bookings if b['status'] == 'completed')
    total_commission = sum(b['commission_amount'] for b in all_bookings if b['status'] == 'completed')
    
    # Payout stats
    pending_payouts = await db[COLLECTIONS['payouts']].find({'status': PayoutStatus.pending.value}).to_list(100)
    pending_payout_amount = sum(p['amount'] for p in pending_payouts)
    
    return AdminDashboardStats(
        total_vendors=total_vendors,
        pending_vendors=pending_vendors,
        approved_vendors=approved_vendors,
        total_bookings=total_bookings,
        total_revenue=total_revenue,
        total_commission=total_commission,
        pending_payouts=pending_payout_amount
    )

@router.get("/bookings")
async def get_all_bookings(
    status: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_role([UserRole.admin]))
):
    """Get all bookings with filters (admin only)"""
    db = get_database()
    
    query = {}
    if status:
        query['status'] = status
    if vendor_id:
        query['vendor_id'] = vendor_id
    
    bookings = await db[COLLECTIONS['bookings']].find(query).skip(skip).limit(limit).sort('created_at', -1).to_list(limit)
    return bookings
