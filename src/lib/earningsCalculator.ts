/**
 * Marketplace Earnings & Commission Calculations
 * Handles vendor earnings, commissions, and financial tracking
 */

import { supabase } from "@/integrations/supabase/client";

export interface BookingFinancials {
  booking_id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  vendor_amount: number;
  booking_status: string;
  created_at: string;
}

export interface VendorEarnings {
  total_gross: number;      // Total from all bookings
  total_commission: number; // Total commission deducted
  total_earnings: number;   // Actual vendor earnings (gross - commission)
  completed_bookings: number;
  pending_bookings: number;
  total_bookings: number;
}

export interface AdminFinancials {
  total_commission_collected: number;
  total_bookings_amount: number;
  total_payouts: number;
  pending_payouts: number;
  approved_vendors_count: number;
  pending_vendors_count: number;
}

// ============================================================
// COMMISSION CALCULATIONS
// ============================================================

/**
 * Calculate commission for a given amount
 * @param amount - Booking amount
 * @param commissionRate - Commission percentage (default 15%)
 * @returns Commission amount
 */
export function calculateCommission(amount: number, commissionRate: number = 15): number {
  return Math.round((amount * commissionRate) / 100 * 100) / 100;
}

/**
 * Calculate net vendor amount (gross - commission)
 */
export function calculateNetAmount(amount: number, commissionRate: number = 15): number {
  const commission = calculateCommission(amount, commissionRate);
  return amount - commission;
}

/**
 * Get current commission rate from database
 */
export async function getCommissionRate(): Promise<number> {
  const { data, error } = await supabase
    .from("commission_settings")
    .select("percentage")
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching commission rate:", error);
    return 15; // Default
  }

  return data?.percentage || 15;
}

// ============================================================
// VENDOR EARNINGS
// ============================================================

/**
 * Get vendor's bookings with financial details
 */
export async function getVendorBookingsFinancials(
  vendorId: string
): Promise<BookingFinancials[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      customer_name,
      total_amount,
      commission_amount,
      vendor_amount,
      booking_status,
      created_at
    `
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vendor bookings:", error);
    return [];
  }

  return data || [];
}

/**
 * Calculate vendor's total earnings
 * Only counts COMPLETED bookings
 */
export async function calculateVendorEarnings(
  vendorId: string
): Promise<VendorEarnings> {
  const bookings = await getVendorBookingsFinancials(vendorId);

  const completedBookings = bookings.filter(
    (b) => b.booking_status === "completed"
  );
  const pendingBookings = bookings.filter(
    (b) => b.booking_status === "pending" || b.booking_status === "confirmed"
  );

  const total_gross = bookings.reduce((sum, b) => sum + b.total_amount, 0);
  const completed_gross = completedBookings.reduce((sum, b) => sum + b.total_amount, 0);

  const total_commission = bookings.reduce((sum, b) => sum + b.commission_amount, 0);
  const completed_commission = completedBookings.reduce(
    (sum, b) => sum + b.commission_amount,
    0
  );

  return {
    total_gross,
    total_commission,
    total_earnings: completed_gross - completed_commission, // Only completed bookings count
    completed_bookings: completedBookings.length,
    pending_bookings: pendingBookings.length,
    total_bookings: bookings.length,
  };
}

/**
 * Get vendor's wallet information
 */
export async function getVendorWallet(vendorId: string): Promise<any> {
  const { data, error } = await supabase
    .from("vendor_wallets")
    .select("*")
    .eq("vendor_id", vendorId)
    .single();

  if (error) {
    console.error("Error fetching vendor wallet:", error);
    return null;
  }

  return data;
}

/**
 * Get vendor's settlement transactions
 */
export async function getVendorSettlements(vendor_id: string) {
  const { data, error } = await supabase
    .from("settlement_transactions")
    .select("*")
    .eq("vendor_id", vendor_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching settlements:", error);
    return [];
  }

  return data || [];
}

/**
 * Get vendor's payouts
 */
export async function getVendorPayouts(vendor_id: string) {
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("vendor_id", vendor_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching payouts:", error);
    return [];
  }

  return data || [];
}

// ============================================================
// ADMIN FINANCIALS
// ============================================================

/**
 * Get admin dashboard financials
 */
export async function getAdminFinancials(): Promise<AdminFinancials> {
  try {
    const [bookingsRes, vendorsRes, payoutsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("total_amount, commission_amount")
        .eq("booking_status", "completed"),
      supabase
        .from("vendors")
        .select("is_approved"),
      supabase
        .from("payouts")
        .select("amount, status"),
    ]);

    const bookings = bookingsRes.data || [];
    const vendors = vendorsRes.data || [];
    const payouts = payoutsRes.data || [];

    const total_commission_collected = bookings.reduce(
      (sum, b) => sum + (b.commission_amount || 0),
      0
    );
    const total_bookings_amount = bookings.reduce(
      (sum, b) => sum + (b.total_amount || 0),
      0
    );

    const total_payouts = payouts
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pending_payouts = payouts
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const approved_vendors_count = vendors.filter((v) => v.is_approved).length;
    const pending_vendors_count = vendors.filter((v) => !v.is_approved).length;

    return {
      total_commission_collected,
      total_bookings_amount,
      total_payouts,
      pending_payouts,
      approved_vendors_count,
      pending_vendors_count,
    };
  } catch (error) {
    console.error("Error fetching admin financials:", error);
    return {
      total_commission_collected: 0,
      total_bookings_amount: 0,
      total_payouts: 0,
      pending_payouts: 0,
      approved_vendors_count: 0,
      pending_vendors_count: 0,
    };
  }
}

// ============================================================
// CUSTOMER BOOKINGS
// ============================================================

/**
 * Get customer's bookings with payment info
 */
export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      customer_name,
      total_amount,
      booking_status,
      payment_status,
      created_at,
      confirmed_at,
      completed_at,
      vendors(company_name),
      packages(name)
    `
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer bookings:", error);
    return [];
  }

  return data || [];
}

/**
 * Get customer's reviews
 */
export async function getCustomerReviews(customerId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      title,
      content,
      created_at,
      vendors(company_name)
    `
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer reviews:", error);
    return [];
  }

  return data || [];
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Get booking status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    paid: "bg-green-100 text-green-800",
    unpaid: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * Format date
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default {
  calculateCommission,
  calculateNetAmount,
  getCommissionRate,
  getVendorBookingsFinancials,
  calculateVendorEarnings,
  getVendorWallet,
  getVendorSettlements,
  getVendorPayouts,
  getAdminFinancials,
  getCustomerBookings,
  getCustomerReviews,
  formatCurrency,
  getStatusColor,
  formatDate,
};
