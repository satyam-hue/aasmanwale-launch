/**
 * Role-Based Authentication Management
 * Handles signup, role assignment, and access control
 */

import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "vendor" | "customer";
export type VendorStatus = "pending" | "approved" | "rejected";

// ============================================================
// SIGNUP FUNCTIONS
// ============================================================

/**
 * Sign up as a customer
 * Automatically assigned role = 'customer' with immediate access
 */
export async function signupCustomer(
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("User creation failed");

    const userId = authData.user.id;

    // Assign customer role (trigger in database will create profile)
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "customer",
    });

    if (roleError) throw roleError;

    return { success: true, userId };
  } catch (error: any) {
    console.error("Customer signup error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign up as a vendor
 * Assigned role = 'vendor_pending' until admin approves
 * Requires company details
 */
export async function signupVendor(
  email: string,
  password: string,
  fullName: string,
  companyName: string,
  companyPhone: string,
  location: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("User creation failed");

    const userId = authData.user.id;

    // Assign vendor role (customer by default, then mark as vendor_pending)
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "vendor",
    });

    if (roleError) throw roleError;

    // Create vendor profile (is_approved = false initially)
    const { error: vendorError } = await supabase.from("vendors").insert({
      user_id: userId,
      company_name: companyName,
      contact_email: email,
      contact_phone: companyPhone,
      location,
      is_approved: false, // Requires admin approval
    });

    if (vendorError) throw vendorError;

    return { success: true, userId };
  } catch (error: any) {
    console.error("Vendor signup error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// LOGIN & ROLE MANAGEMENT
// ============================================================

/**
 * Get user's primary role
 * Priority: admin > vendor > customer
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching roles:", error);
    return null;
  }

  if (!data || data.length === 0) return "customer"; // Default role

  // Priority logic
  const roles = data.map((r) => r.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("vendor")) return "vendor";
  return "customer";
}

/**
 * Get vendor approval status
 * Returns: 'approved' | 'pending' | 'rejected' | null (not a vendor)
 */
export async function getVendorStatus(
  userId: string
): Promise<VendorStatus | null> {
  const { data } = await supabase
    .from("vendors")
    .select("is_approved")
    .eq("user_id", userId)
    .single();

  if (!data) return null; // User is not a vendor

  return data.is_approved ? "approved" : "pending";
}

/**
 * Get vendor ID for a user
 */
export async function getVendorId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", userId)
    .single();

  return data?.id || null;
}

// ============================================================
// ROLE-BASED ROUTING
// ============================================================

/**
 * Determine dashboard route based on role and status
 * Returns the appropriate redirect path
 */
export function getDashboardRoute(
  role: UserRole | null,
  vendorApproved: boolean = false
): string {
  if (!role) return "/auth";

  if (role === "admin") return "/admin";
  if (role === "vendor") {
    // Can access dashboard only if approved
    return vendorApproved ? "/vendor/dashboard" : "/vendor/register";
  }
  return "/"; // Customer dashboard (home page with bookings)
}

/**
 * Check if user can access dashboard
 */
export function canAccessDashboard(
  role: UserRole | null,
  vendorApproved: boolean = false
): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  if (role === "vendor") return vendorApproved;
  if (role === "customer") return true;
  return false;
}

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

/**
 * Approve a vendor (admin only)
 */
export async function approveVendor(
  vendorId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update vendor approval status
    const { error: vendorError } = await supabase
      .from("vendors")
      .update({ is_approved: true })
      .eq("id", vendorId);

    if (vendorError) throw vendorError;

    // TODO: Create vendor wallet and notification when those tables exist

    return { success: true };
  } catch (error: any) {
    console.error("Vendor approval error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a vendor (admin only)
 */
export async function rejectVendor(vendorId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("vendors")
      .update({ is_approved: false })
      .eq("id", vendorId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Vendor rejection error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// EXPORT FOR USE IN COMPONENTS
// ============================================================

export default {
  signupCustomer,
  signupVendor,
  getUserRole,
  getVendorStatus,
  getVendorId,
  getDashboardRoute,
  canAccessDashboard,
  approveVendor,
  rejectVendor,
};
