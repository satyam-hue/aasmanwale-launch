from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from database import get_database, COLLECTIONS
from models import PackageCreate, PackageUpdate, Package
from auth import get_current_user, require_approved_vendor
from datetime import datetime

router = APIRouter(prefix="/packages", tags=["packages"])

# ============================================================
# VENDOR PACKAGE MANAGEMENT
# ============================================================

@router.post("", response_model=Package)
async def create_package(
    package_data: PackageCreate,
    current_vendor: dict = Depends(require_approved_vendor)
):
    """Create a new package (vendor only)"""
    db = get_database()
    
    # Ensure vendor is creating package for themselves
    if package_data.vendor_id != current_vendor['id']:
        raise HTTPException(status_code=403, detail="Can only create packages for your own vendor account")
    
    package = Package(**package_data.dict())
    await db[COLLECTIONS['packages']].insert_one(package.dict())
    
    return package

@router.get("/my-packages", response_model=List[Package])
async def get_my_packages(current_vendor: dict = Depends(require_approved_vendor)):
    """Get all packages for current vendor"""
    db = get_database()
    
    packages = await db[COLLECTIONS['packages']].find(
        {'vendor_id': current_vendor['id']}
    ).to_list(100)
    
    return packages

@router.put("/{package_id}", response_model=Package)
async def update_package(
    package_id: str,
    updates: PackageUpdate,
    current_vendor: dict = Depends(require_approved_vendor)
):
    """Update a package (vendor only, own packages)"""
    db = get_database()
    
    # Check package exists and belongs to vendor
    package = await db[COLLECTIONS['packages']].find_one({'id': package_id})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    if package['vendor_id'] != current_vendor['id']:
        raise HTTPException(status_code=403, detail="Can only update your own packages")
    
    # Update package
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items()}
    update_data['updated_at'] = datetime.utcnow()
    
    await db[COLLECTIONS['packages']].update_one(
        {'id': package_id},
        {'$set': update_data}
    )
    
    updated_package = await db[COLLECTIONS['packages']].find_one({'id': package_id})
    return updated_package

@router.delete("/{package_id}")
async def delete_package(
    package_id: str,
    current_vendor: dict = Depends(require_approved_vendor)
):
    """Delete a package (vendor only, own packages)"""
    db = get_database()
    
    # Check package exists and belongs to vendor
    package = await db[COLLECTIONS['packages']].find_one({'id': package_id})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    if package['vendor_id'] != current_vendor['id']:
        raise HTTPException(status_code=403, detail="Can only delete your own packages")
    
    # Soft delete - set is_active to False
    await db[COLLECTIONS['packages']].update_one(
        {'id': package_id},
        {'$set': {'is_active': False, 'updated_at': datetime.utcnow()}}
    )
    
    return {"message": "Package deleted successfully"}

# ============================================================
# PUBLIC PACKAGE BROWSING
# ============================================================

@router.get("", response_model=List[Package])
async def browse_packages(
    vendor_id: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Browse all active packages from approved vendors (public)"""
    db = get_database()
    
    # Build query
    query = {'is_active': True}
    
    if vendor_id:
        # Verify vendor is approved
        vendor = await db[COLLECTIONS['vendors']].find_one({
            'id': vendor_id,
            'is_approved': True
        })
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found or not approved")
        query['vendor_id'] = vendor_id
    else:
        # Only show packages from approved vendors
        approved_vendors = await db[COLLECTIONS['vendors']].find({'is_approved': True}).to_list(1000)
        approved_vendor_ids = [v['id'] for v in approved_vendors]
        query['vendor_id'] = {'$in': approved_vendor_ids}
    
    if min_price is not None:
        query['price'] = query.get('price', {})
        query['price']['$gte'] = min_price
    
    if max_price is not None:
        query['price'] = query.get('price', {})
        query['price']['$lte'] = max_price
    
    packages = await db[COLLECTIONS['packages']].find(query).skip(skip).limit(limit).to_list(limit)
    return packages

@router.get("/{package_id}", response_model=Package)
async def get_package_details(package_id: str):
    """Get specific package details (public)"""
    db = get_database()
    
    package = await db[COLLECTIONS['packages']].find_one({
        'id': package_id,
        'is_active': True
    })
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Verify vendor is approved
    vendor = await db[COLLECTIONS['vendors']].find_one({
        'id': package['vendor_id'],
        'is_approved': True
    })
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Package vendor not approved")
    
    return package
