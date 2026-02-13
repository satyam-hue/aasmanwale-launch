/**
 * Package Query Utilities
 * Handles role-based package visibility with proper filtering
 */

import { supabase } from "@/integrations/supabase/client";

interface PackageRow {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  max_altitude: string | null;
  includes: string[] | null;
  is_active: boolean;
  vendor_id: string;
  vendors: { company_name: string; location: string | null; is_approved: boolean } | null;
}

/**
 * Fetch packages for customers
 * - Only show packages from approved vendors
 * - Only show packages that are active
 * - Only show packages with future time slots available
 */
export async function fetchCustomerPackages(): Promise<PackageRow[]> {
  try {
    // Step 1: Get all approved vendors
    const { data: approvedVendors, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .eq("is_approved", true);

    if (vendorError || !approvedVendors || approvedVendors.length === 0) {
      return [];
    }

    const approvedVendorIds = approvedVendors.map((v) => v.id);

    // Step 2: Get all active packages from approved vendors
    const { data: packages, error: pkgError } = await supabase
      .from("packages")
      .select("*, vendors(company_name, location, is_approved)")
      .eq("is_active", true)
      .in("vendor_id", approvedVendorIds)
      .order("price");

    if (pkgError || !packages) {
      console.error("Error fetching packages:", pkgError);
      return [];
    }

    // Step 3: Filter packages that have future time slots with available capacity
    const today = new Date().toISOString().split("T")[0];

    const { data: futureSlots, error: slotError } = await supabase
      .from("time_slots")
      .select("vendor_id")
      .gte("slot_date", today)
      .eq("is_available", true)
      .gt("capacity", "booked_count"); // Has available capacity

    if (slotError) {
      console.error("Error fetching time slots:", slotError);
      return [];
    }

    const vendorsWithFutureSlots = new Set(futureSlots?.map((s) => s.vendor_id) || []);

    // Step 4: Filter packages to only those with future slots
    const bookablePackages = (packages as PackageRow[]).filter(
      (pkg) => vendorsWithFutureSlots.has(pkg.vendor_id)
    );

    return bookablePackages;
  } catch (error) {
    console.error("Error in fetchCustomerPackages:", error);
    return [];
  }
}

/**
 * Fetch packages for vendors
 * - Vendors see only their own packages
 * - Can see drafts (is_active = false)
 */
export async function fetchVendorPackages(vendorId: string): Promise<PackageRow[]> {
  try {
    const { data: packages, error } = await supabase
      .from("packages")
      .select("*, vendors(company_name, location, is_approved)")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vendor packages:", error);
      return [];
    }

    return packages as PackageRow[];
  } catch (error) {
    console.error("Error in fetchVendorPackages:", error);
    return [];
  }
}

/**
 * Fetch packages for admins
 * - Admins see all packages
 * - Can see which vendors are approved/unapproved
 */
export async function fetchAdminPackages(): Promise<PackageRow[]> {
  try {
    const { data: packages, error } = await supabase
      .from("packages")
      .select("*, vendors(company_name, location, is_approved)")
      .order("price");

    if (error) {
      console.error("Error fetching admin packages:", error);
      return [];
    }

    return packages as PackageRow[];
  } catch (error) {
    console.error("Error in fetchAdminPackages:", error);
    return [];
  }
}

/**
 * Check if a package is bookable (has future slots with capacity)
 */
export async function hasBookableSlots(vendorId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: slots, error } = await supabase
      .from("time_slots")
      .select("id")
      .eq("vendor_id", vendorId)
      .gte("slot_date", today)
      .eq("is_available", true)
      .gt("capacity", "booked_count")
      .limit(1);

    if (error) return false;
    return slots && slots.length > 0;
  } catch (error) {
    console.error("Error checking bookable slots:", error);
    return false;
  }
}
