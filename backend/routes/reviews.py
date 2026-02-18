from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from database import get_database, COLLECTIONS
from models import ReviewCreate, Review, VendorRatingSummary
from auth import get_current_user
from utils import update_vendor_rating, is_booking_participant
from datetime import datetime

router = APIRouter(prefix="/reviews", tags=["reviews"])

# ============================================================
# CREATE REVIEW
# ============================================================

@router.post("", response_model=Review)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for a completed booking"""
    db = get_database()
    
    # Get booking
    booking = await db[COLLECTIONS['bookings']].find_one({'id': review_data.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check booking is completed
    if booking['status'] != 'completed':
        raise HTTPException(
            status_code=400,
            detail="Can only review completed bookings"
        )
    
    # Check user is the customer
    if booking.get('customer_id') != current_user['id']:
        raise HTTPException(
            status_code=403,
            detail="Can only review your own bookings"
        )
    
    # Check if review already exists
    existing_review = await db[COLLECTIONS['reviews']].find_one({'booking_id': review_data.booking_id})
    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="Review already exists for this booking"
        )
    
    # Create review
    review = Review(
        booking_id=review_data.booking_id,
        vendor_id=booking['vendor_id'],
        customer_id=current_user['id'],
        rating=review_data.rating,
        title=review_data.title,
        content=review_data.content
    )
    
    await db[COLLECTIONS['reviews']].insert_one(review.dict())
    
    # Update vendor rating
    await update_vendor_rating(booking['vendor_id'])
    
    return review

# ============================================================
# GET REVIEWS
# ============================================================

@router.get("/vendor/{vendor_id}", response_model=List[Review])
async def get_vendor_reviews(
    vendor_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all reviews for a vendor (public)"""
    db = get_database()
    
    # Verify vendor exists and is approved
    vendor = await db[COLLECTIONS['vendors']].find_one({
        'id': vendor_id,
        'is_approved': True
    })
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found or not approved")
    
    reviews = await db[COLLECTIONS['reviews']].find(
        {'vendor_id': vendor_id}
    ).skip(skip).limit(limit).sort('created_at', -1).to_list(limit)
    
    return reviews

@router.get("/vendor/{vendor_id}/summary", response_model=VendorRatingSummary)
async def get_vendor_rating_summary(vendor_id: str):
    """Get vendor rating summary (public)"""
    db = get_database()
    
    summary = await db[COLLECTIONS['vendor_rating_summary']].find_one({'vendor_id': vendor_id})
    
    if not summary:
        # Return default summary
        return VendorRatingSummary(
            vendor_id=vendor_id,
            average_rating=0.0,
            total_reviews=0
        )
    
    return summary

# ============================================================
# UPDATE/DELETE REVIEW
# ============================================================

@router.put("/{review_id}", response_model=Review)
async def update_review(
    review_id: str,
    rating: Optional[int] = Query(None, ge=1, le=5),
    title: Optional[str] = Query(None),
    content: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a review (author only)"""
    db = get_database()
    
    # Get review
    review = await db[COLLECTIONS['reviews']].find_one({'id': review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check user is the author
    if review['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Can only update your own reviews")
    
    # Update review
    update_data = {'updated_at': datetime.utcnow()}
    if rating is not None:
        update_data['rating'] = rating
    if title is not None:
        update_data['title'] = title
    if content is not None:
        update_data['content'] = content
    
    await db[COLLECTIONS['reviews']].update_one(
        {'id': review_id},
        {'$set': update_data}
    )
    
    # Update vendor rating
    await update_vendor_rating(review['vendor_id'])
    
    updated_review = await db[COLLECTIONS['reviews']].find_one({'id': review_id})
    return updated_review

@router.delete("/{review_id}")
async def delete_review(
    review_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a review (author or admin)"""
    db = get_database()
    
    # Get review
    review = await db[COLLECTIONS['reviews']].find_one({'id': review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check authorization (author or admin)
    is_author = review['customer_id'] == current_user['id']
    is_admin = current_user['role'] == 'admin'
    
    if not is_author and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    # Delete review
    await db[COLLECTIONS['reviews']].delete_one({'id': review_id})
    
    # Update vendor rating
    await update_vendor_rating(review['vendor_id'])
    
    return {"message": "Review deleted successfully"}
