from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from database import get_database, COLLECTIONS
from models import TimeSlotCreate, TimeSlotUpdate, TimeSlot
from auth import require_approved_vendor
from datetime import datetime

router = APIRouter(prefix="/time-slots", tags=["time_slots"])

# ============================================================
# VENDOR TIME SLOT MANAGEMENT
# ============================================================

@router.post("", response_model=TimeSlot)
async def create_time_slot(
    slot_data: TimeSlotCreate,
    current_vendor: dict = Depends(require_approved_vendor)
):
    """Create a new time slot (vendor only)"""
    db = get_database()
    
    # Ensure vendor is creating slot for themselves
    if slot_data.vendor_id != current_vendor['id']:
        raise HTTPException(status_code=403, detail="Can only create time slots for your own vendor account")
    
    time_slot = TimeSlot(**slot_data.dict())
    await db[COLLECTIONS['time_slots']].insert_one(time_slot.dict())
    
    return time_slot

@router.get("/my-slots", response_model=List[TimeSlot])
async def get_my_time_slots(
    slot_date: Optional[str] = Query(None),
    current_vendor: dict = Depends(require_approved_vendor)
):
    """Get all time slots for current vendor"""
    db = get_database()
    
    query = {'vendor_id': current_vendor['id']}
    if slot_date:
        query['slot_date'] = slot_date
    
    slots = await db[COLLECTIONS['time_slots']].find(query).sort('slot_date', 1).to_list(200)
    return slots

@router.put("/{slot_id}", response_model=TimeSlot)
async def update_time_slot(
    slot_id: str,
    updates: TimeSlotUpdate,
    current_vendor: dict = Depends(require_approved_vendor)
):
    """Update a time slot (vendor only, own slots)"""
    db = get_database()
    
    # Check slot exists and belongs to vendor
    slot = await db[COLLECTIONS['time_slots']].find_one({'id': slot_id})
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    
    if slot['vendor_id'] != current_vendor['id']:
        raise HTTPException(status_code=403, detail="Can only update your own time slots")
    
    # Update slot
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items()}
    update_data['updated_at'] = datetime.utcnow()
    
    await db[COLLECTIONS['time_slots']].update_one(
        {'id': slot_id},
        {'$set': update_data}
    )
    
    updated_slot = await db[COLLECTIONS['time_slots']].find_one({'id': slot_id})
    return updated_slot

@router.delete("/{slot_id}")
async def delete_time_slot(
    slot_id: str,
    current_vendor: dict = Depends(require_approved_vendor)
):
    """Delete a time slot (vendor only, own slots)"""
    db = get_database()
    
    # Check slot exists and belongs to vendor
    slot = await db[COLLECTIONS['time_slots']].find_one({'id': slot_id})
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    
    if slot['vendor_id'] != current_vendor['id']:
        raise HTTPException(status_code=403, detail="Can only delete your own time slots")
    
    # Check if slot has bookings
    if slot['booked_count'] > 0:
        raise HTTPException(status_code=400, detail="Cannot delete slot with existing bookings")
    
    await db[COLLECTIONS['time_slots']].delete_one({'id': slot_id})
    
    return {"message": "Time slot deleted successfully"}

# ============================================================
# PUBLIC TIME SLOT AVAILABILITY
# ============================================================

@router.get("/availability/{package_id}", response_model=List[TimeSlot])
async def get_package_availability(
    package_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get available time slots for a package (public)"""
    db = get_database()
    
    # Get package and vendor
    package = await db[COLLECTIONS['packages']].find_one({'id': package_id, 'is_active': True})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    vendor = await db[COLLECTIONS['vendors']].find_one({
        'id': package['vendor_id'],
        'is_approved': True
    })
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not approved")
    
    # Build query for time slots
    query = {
        'vendor_id': package['vendor_id'],
        'is_available': True
    }
    
    # Filter by date range if provided
    if start_date and end_date:
        query['slot_date'] = {'$gte': start_date, '$lte': end_date}
    elif start_date:
        query['slot_date'] = {'$gte': start_date}
    
    slots = await db[COLLECTIONS['time_slots']].find(query).sort('slot_date', 1).to_list(100)
    
    # Filter slots that have available capacity
    available_slots = [s for s in slots if s['booked_count'] < s['capacity']]
    
    return available_slots
