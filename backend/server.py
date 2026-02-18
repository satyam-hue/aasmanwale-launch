from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

# Import database functions
from database import connect_to_mongo, close_mongo_connection, create_indexes

# Import route modules
from routes import vendors, packages, time_slots, bookings, admin, reviews

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(
    title="Paragliding Marketplace API",
    description="Multi-vendor paragliding booking marketplace",
    version="1.0.0"
)

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(vendors.router)
api_router.include_router(packages.router)
api_router.include_router(time_slots.router)
api_router.include_router(bookings.router)
api_router.include_router(admin.router)
api_router.include_router(reviews.router)

# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Marketplace API is running"}

# Root endpoint
@api_router.get("/")
async def root():
    return {
        "message": "Welcome to Paragliding Marketplace API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database connection and indexes on startup"""
    logger.info("Starting up Marketplace API...")
    await connect_to_mongo()
    await create_indexes()
    logger.info("Database connected and indexes created")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    logger.info("Shutting down Marketplace API...")
    await close_mongo_connection()
    logger.info("Database connection closed")
