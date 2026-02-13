/**
 * Production Marketplace Types & Interfaces
 * Generated: February 13, 2026
 * 
 * Use these types when integrating the new marketplace features
 * to maintain type safety across frontend & backend
 */

// ============================================================
// BOOKING STATUS
// ============================================================

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface BookingWithStatus {
  id: string;
  customer_id: string | null;
  vendor_id: string;
  package_id: string;
  time_slot_id: string | null;
  
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  
  total_amount: number;
  commission_amount: number;
  vendor_amount: number;
  
  // New fields
  booking_status: BookingStatus;
  confirmed_at: string | null;  // ISO timestamp
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  vendor_notes: string | null;
  
  // Legacy field (kept for backwards compatibility)
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// VENDOR WALLET
// ============================================================

export interface VendorWallet {
  id: string;
  vendor_id: string;
  balance: number;              // Current available balance
  total_earned: number;         // Lifetime gross earnings
  total_commission: number;     // Lifetime commissions paid
  total_paid_out: number;       // Lifetime payouts to vendors
  created_at: string;
  updated_at: string;
}

// ============================================================
// SETTLEMENT TRANSACTIONS
// ============================================================

export type TransactionType = 'booking_earnings' | 'commission_deducted' | 'payout';

export interface SettlementTransaction {
  id: string;
  vendor_id: string;
  booking_id: string | null;
  
  transaction_type: TransactionType;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  
  payout_id: string | null;
  settled_at: string | null;    // ISO timestamp
  
  created_at: string;
  updated_at: string;
}

// ============================================================
// PAYOUTS
// ============================================================

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payout {
  id: string;
  vendor_id: string;
  amount: number;
  status: PayoutStatus;
  
  settled_by: string | null;    // User ID of admin
  settled_at: string | null;    // ISO timestamp
  settlement_notes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface PayoutReport {
  payouts: Payout[];
  totals: {
    pending_amount: number;
    completed_amount: number;
    total_payouts: number;
  };
}

// ============================================================
// REVIEWS & RATINGS
// ============================================================

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface Review {
  id: string;
  booking_id: string;
  vendor_id: string;
  customer_id: string;
  
  rating: Rating;
  title: string | null;
  content: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface VendorRatingSummary {
  id: string;
  vendor_id: string;
  average_rating: number;    // 0.00 - 5.00
  total_reviews: number;
  
  calculated_at: string;
  updated_at: string;
}

export interface VendorReviewsResponse {
  reviews: Review[];
  summary: VendorRatingSummary;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export type NotificationType = 
  | 'booking_confirmation' 
  | 'vendor_approval' 
  | 'booking_completed' 
  | 'booking_cancelled' 
  | 'payout_processed' 
  | 'system_alert';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  
  title: string;
  message: string | null;
  
  related_booking_id: string | null;
  related_vendor_id: string | null;
  
  is_read: boolean;
  read_at: string | null;     // ISO timestamp
  
  created_at: string;
}

export interface NotificationFilter {
  unread_only?: boolean;
  notification_types?: NotificationType[];
  limit?: number;
  offset?: number;
}

// ============================================================
// EDGE FUNCTION PAYLOADS & RESPONSES
// ============================================================

// ---- Update Booking Status ----

export interface UpdateBookingStatusRequest {
  booking_id: string;
  new_status: BookingStatus;
  cancellation_reason?: string;
  vendor_notes?: string;
}

export interface UpdateBookingStatusResponse {
  success: boolean;
  booking: BookingWithStatus;
  notifications_count: number;
}

// ---- Process Settlement ----

export interface CreatePayoutRequest {
  action: 'create_payout';
  vendor_id: string;
}

export interface SettlePayoutRequest {
  action: 'settle_payout';
  payout_id: string;
  settlement_notes?: string;
}

export interface GetPayoutReportRequest {
  action: 'get_payout_report';
  vendor_id?: string;  // Optional filter
}

export type ProcessSettlementRequest = 
  | CreatePayoutRequest 
  | SettlePayoutRequest 
  | GetPayoutReportRequest;

export interface PayoutResponse {
  success: boolean;
  payout?: Payout;
  message?: string;
}

export interface SettlePayoutResponse {
  success: boolean;
  payout: Payout;
  wallet: VendorWallet;
  message: string;
}

export interface PayoutReportResponse {
  success: boolean;
  payouts: Payout[];
  totals: {
    pending_amount: number;
    completed_amount: number;
    total_payouts: number;
  };
}

export type ProcessSettlementResponse = 
  | PayoutResponse 
  | SettlePayoutResponse 
  | PayoutReportResponse;

// ---- Manage Reviews ----

export interface CreateReviewRequest {
  action: 'create_review';
  booking_id: string;
  rating: Rating;
  title?: string;
  content?: string;
}

export interface GetVendorReviewsRequest {
  action: 'get_vendor_reviews';
  vendor_id: string;
}

export interface DeleteReviewRequest {
  action: 'delete_review';
  review_id: string;
}

export type ManageReviewsRequest = 
  | CreateReviewRequest 
  | GetVendorReviewsRequest 
  | DeleteReviewRequest;

export interface CreateReviewResponse {
  success: boolean;
  review: Review;
  vendor_rating: VendorRatingSummary;
}

export interface DeleteReviewResponse {
  success: boolean;
  message: string;
}

export type ManageReviewsResponse = 
  | CreateReviewResponse 
  | VendorReviewsResponse 
  | DeleteReviewResponse;

// ============================================================
// API ERROR RESPONSES
// ============================================================

export interface ApiError {
  success: false;
  error: string;
  status?: number;
}

// ============================================================
// HELPER TYPES FOR UI/LOGIC
// ============================================================

export interface BookingStatusFlow {
  current: BookingStatus;
  allowed_transitions: BookingStatus[];
  can_review: boolean;  // true if status === 'completed'
}

export interface VendorFinancialsSummary {
  wallet_balance: number;
  total_earned: number;
  total_commission: number;
  total_paid_out: number;
  pending_payouts: number;
  average_rating: number;
  total_reviews: number;
}

export interface BookingWithReviewStatus extends BookingWithStatus {
  can_review: boolean;
  has_review: boolean;
  review?: Review;
}

// ============================================================
// CONSTANTS
// ============================================================

export const BOOKING_STATUS_FLOW: Record<BookingStatus, BookingStatus[]> = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': [],
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  'booking_confirmation': 'Booking Confirmed',
  'vendor_approval': 'Vendor Approved',
  'booking_completed': 'Experience Complete',
  'booking_cancelled': 'Booking Cancelled',
  'payout_processed': 'Payout Processed',
  'system_alert': 'System Alert',
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  'pending': 'Pending',
  'processing': 'Processing',
  'completed': 'Completed',
  'failed': 'Failed',
};

// ============================================================
// UTILITY FUNCTIONS (USE IN FRONTEND)
// ============================================================

/**
 * Check if a booking can be transitioned to a new status
 */
export function canTransitionBooking(
  currentStatus: BookingStatus,
  targetStatus: BookingStatus,
  userRole: 'customer' | 'vendor' | 'admin'
): boolean {
  const allowedTransitions = BOOKING_STATUS_FLOW[currentStatus];
  if (!allowedTransitions.includes(targetStatus)) {
    return false;
  }

  // Role-based permissions
  if (userRole === 'customer') {
    // Customers can only cancel pending bookings
    return targetStatus === 'cancelled' && currentStatus === 'pending';
  }

  if (userRole === 'vendor') {
    // Vendors can confirm pending and complete confirmed
    return (
      (currentStatus === 'pending' && targetStatus === 'confirmed') ||
      (currentStatus === 'confirmed' && targetStatus === 'completed')
    );
  }

  // Admin can do anything
  return userRole === 'admin';
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  });
  return formatter.format(amount);
}

/**
 * Format rating with stars
 */
export function formatRating(rating: number): string {
  const stars = Math.round(rating);
  return `${'⭐'.repeat(stars)} (${rating.toFixed(1)})`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: BookingStatus | PayoutStatus): string {
  const colors: Record<string, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    completed: 'green',
    cancelled: 'red',
    processing: 'yellow',
    failed: 'red',
  };
  return colors[status] || 'gray';
}

/**
 * Calculate net amount after commission
 */
export function calculateNetAmount(grossAmount: number, commissionRate: number = 15): number {
  const commission = (grossAmount * commissionRate) / 100;
  return grossAmount - commission;
}

// ============================================================
// DATABASE QUERY TYPES (FOR RLS TESTING)
// ============================================================

export interface RLSTestCase {
  table: string;
  userRole: 'customer' | 'vendor' | 'admin';
  query: string;
  expectedRows: number;
  description: string;
}

export const RLS_TEST_CASES: RLSTestCase[] = [
  {
    table: 'vendor_wallets',
    userRole: 'vendor',
    query: 'SELECT * FROM vendor_wallets WHERE vendor_id != own_id',
    expectedRows: 0,
    description: 'Vendor cannot access other vendor wallets',
  },
  {
    table: 'reviews',
    userRole: 'customer',
    query: 'SELECT * FROM reviews WHERE vendor_id = approved_vendor',
    expectedRows: 999,  // Any number > 0
    description: 'Anyone can read reviews of approved vendors',
  },
  {
    table: 'notifications',
    userRole: 'customer',
    query: 'SELECT * FROM notifications WHERE user_id != own_id',
    expectedRows: 0,
    description: 'Customer cannot access other notifications',
  },
];

export default {
  // Export all types
  BookingStatus,
  BookingWithStatus,
  VendorWallet,
  SettlementTransaction,
  Payout,
  Review,
  VendorRatingSummary,
  Notification,
  
  // Export functions
  canTransitionBooking,
  formatCurrency,
  formatRating,
  getStatusColor,
  calculateNetAmount,
  
  // Export constants
  BOOKING_STATUS_FLOW,
  NOTIFICATION_TYPE_LABELS,
  PAYOUT_STATUS_LABELS,
};
