/**
 * Marketplace Earnings & Commission Calculations
 * Uses actual database schema columns
 */

import { supabase } from "@/integrations/supabase/client";

export interface BookingFinancials {
  booking_id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  vendor_amount: number;
  status: string;
  created_at: string;
}

export interface VendorEarnings {
  total_gross: number;
  total_commission: number;
  total_earnings: number;
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

export function calculateCommission(amount: number, commissionRate: number = 15): number {
  return Math.round((amount * commissionRate) / 100 * 100) / 100;
}

export function calculateNetAmount(amount: number, commissionRate: number = 15): number {
  return amount - calculateCommission(amount, commissionRate);
}

export async function getCommissionRate(): Promise<number> {
  const { data, error } = await supabase
    .from("commission_settings")
    .select("percentage")
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching commission rate:", error);
    return 15;
  }
  return data?.percentage || 15;
}

export async function getVendorBookingsFinancials(vendorId: string): Promise<BookingFinancials[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, total_amount, commission_amount, vendor_amount, status, created_at")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vendor bookings:", error);
    return [];
  }

  return (data || []).map((b) => ({
    booking_id: b.id,
    customer_name: b.customer_name,
    total_amount: b.total_amount,
    commission_amount: b.commission_amount,
    vendor_amount: b.vendor_amount,
    status: b.status,
    created_at: b.created_at,
  }));
}

export async function calculateVendorEarnings(vendorId: string): Promise<VendorEarnings> {
  const bookings = await getVendorBookingsFinancials(vendorId);

  const completedBookings = bookings.filter((b) => b.status === "completed");
  const pendingBookings = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");

  // Only completed bookings count toward earnings
  const completed_gross = completedBookings.reduce((sum, b) => sum + b.total_amount, 0);
  const completed_commission = completedBookings.reduce((sum, b) => sum + b.commission_amount, 0);
  const completed_vendor = completed_gross - completed_commission;

  // Consistency check: vendor_amount fields should match calculated values
  const vendor_amount_sum = completedBookings.reduce((sum, b) => sum + b.vendor_amount, 0);
  if (Math.abs(vendor_amount_sum - completed_vendor) > 0.01) {
    console.warn(
      `[EarningsConsistency] vendor_amount sum (${vendor_amount_sum}) ≠ calculated (${completed_vendor}). Check booking records.`
    );
  }

  return {
    total_gross: completed_gross,
    total_commission: completed_commission,
    total_earnings: completed_vendor,
    completed_bookings: completedBookings.length,
    pending_bookings: pendingBookings.length,
    total_bookings: bookings.length,
  };
}

// Stub functions for tables that don't exist yet — return empty/null safely
export async function getVendorWallet(_vendorId: string): Promise<any> {
  return null;
}

export async function getVendorSettlements(_vendorId: string): Promise<any[]> {
  return [];
}

export async function getVendorPayouts(_vendorId: string): Promise<any[]> {
  return [];
}

export async function getAdminFinancials(): Promise<AdminFinancials> {
  try {
    const [bookingsRes, vendorsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("total_amount, commission_amount, status")
        .eq("status", "completed"),
      supabase.from("vendors").select("is_approved"),
    ]);

    const bookings = bookingsRes.data || [];
    const vendors = vendorsRes.data || [];

    const total_commission_collected = bookings.reduce((sum, b) => sum + (b.commission_amount || 0), 0);
    const total_bookings_amount = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    return {
      total_commission_collected,
      total_bookings_amount,
      total_payouts: 0,
      pending_payouts: 0,
      approved_vendors_count: vendors.filter((v) => v.is_approved).length,
      pending_vendors_count: vendors.filter((v) => !v.is_approved).length,
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

export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, total_amount, status, payment_status, created_at, vendors(company_name), packages(name)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer bookings:", error);
    return [];
  }
  return data || [];
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
}

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

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric",
  });
}
