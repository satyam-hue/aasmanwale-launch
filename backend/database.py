from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'marketplace_db')

client: Optional[AsyncIOMotorClient] = None
db = None

async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, db
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    print(f"Connected to MongoDB: {db_name}")

async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

def get_database():
    """Get database instance"""
    return db

# Collection names
COLLECTIONS = {
    'users': 'users',
    'vendors': 'vendors',
    'packages': 'packages',
    'time_slots': 'time_slots',
    'bookings': 'bookings',
    'vendor_wallets': 'vendor_wallets',
    'payouts': 'payouts',
    'settlement_transactions': 'settlement_transactions',
    'reviews': 'reviews',
    'vendor_rating_summary': 'vendor_rating_summary',
    'notifications': 'notifications',
    'commission_settings': 'commission_settings',
}

async def create_indexes():
    """Create database indexes for performance"""
    global db
    if db is None:
        return
    
    # Users indexes
    await db[COLLECTIONS['users']].create_index('email', unique=True)
    await db[COLLECTIONS['users']].create_index('supabase_user_id')
    
    # Vendors indexes
    await db[COLLECTIONS['vendors']].create_index('user_id')
    await db[COLLECTIONS['vendors']].create_index('status')
    await db[COLLECTIONS['vendors']].create_index('is_approved')
    
    # Packages indexes
    await db[COLLECTIONS['packages']].create_index('vendor_id')
    await db[COLLECTIONS['packages']].create_index('is_active')
    await db[COLLECTIONS['packages']].create_index([('vendor_id', 1), ('is_active', 1)])
    
    # Time slots indexes
    await db[COLLECTIONS['time_slots']].create_index('vendor_id')
    await db[COLLECTIONS['time_slots']].create_index('slot_date')
    await db[COLLECTIONS['time_slots']].create_index([('vendor_id', 1), ('slot_date', 1)])
    
    # Bookings indexes
    await db[COLLECTIONS['bookings']].create_index('vendor_id')
    await db[COLLECTIONS['bookings']].create_index('customer_id')
    await db[COLLECTIONS['bookings']].create_index('package_id')
    await db[COLLECTIONS['bookings']].create_index('status')
    await db[COLLECTIONS['bookings']].create_index([('vendor_id', 1), ('status', 1)])
    
    # Wallets indexes
    await db[COLLECTIONS['vendor_wallets']].create_index('vendor_id', unique=True)
    
    # Payouts indexes
    await db[COLLECTIONS['payouts']].create_index('vendor_id')
    await db[COLLECTIONS['payouts']].create_index('status')
    await db[COLLECTIONS['payouts']].create_index([('vendor_id', 1), ('status', 1)])
    
    # Settlement transactions indexes
    await db[COLLECTIONS['settlement_transactions']].create_index('vendor_id')
    await db[COLLECTIONS['settlement_transactions']].create_index('booking_id')
    
    # Reviews indexes
    await db[COLLECTIONS['reviews']].create_index('vendor_id')
    await db[COLLECTIONS['reviews']].create_index('customer_id')
    await db[COLLECTIONS['reviews']].create_index('booking_id', unique=True)
    
    # Vendor rating summary indexes
    await db[COLLECTIONS['vendor_rating_summary']].create_index('vendor_id', unique=True)
    
    # Notifications indexes
    await db[COLLECTIONS['notifications']].create_index('user_id')
    await db[COLLECTIONS['notifications']].create_index([('user_id', 1), ('is_read', 1)])
    
    print("Created database indexes")
