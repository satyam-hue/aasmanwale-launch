/**
 * Dashboard Routing Helper
 * Ensures users are routed to the correct dashboard based on role
 * Handles timing issues and explicit validation
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface DashboardRoutingProps {
  user: any;
  role: string | null;
  vendorId: string | null;
  vendorApproved: boolean;
  authLoading: boolean;
}

/**
 * Hook to handle dashboard routing after login
 * Ensures proper role-based navigation with minimal delays
 */
export function useDashboardRouting({
  user,
  role,
  vendorId,
  vendorApproved,
  authLoading,
}: DashboardRoutingProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to fully load
    if (authLoading || !user || !role) {
      return;
    }

    // Explicit routing based on role
    if (role === "admin") {
      navigate("/admin", { replace: true });
    } else if (role === "vendor") {
      // Vendor: check approval status
      if (vendorId) {
        if (vendorApproved) {
          navigate("/vendor/dashboard", { replace: true });
        } else {
          // Vendor exists but not approved yet
          navigate("/vendor/register", { replace: true });
        }
      } else {
        // No vendor profile yet - go to registration
        navigate("/vendor/register", { replace: true });
      }
    } else {
      // Default: customer dashboard (home)
      navigate("/", { replace: true });
    }
  }, [user, role, vendorId, vendorApproved, authLoading, navigate]);
}

/**
 * Get destination route based on user role
 * Useful for determining where to send users in various scenarios
 */
export function getDashboardDestination(
  role: string | null,
  vendorId: string | null,
  vendorApproved: boolean
): string {
  if (role === "admin") {
    return "/admin";
  } else if (role === "vendor") {
    if (vendorId && vendorApproved) {
      return "/vendor/dashboard";
    } else {
      return "/vendor/register";
    }
  }
  // Default: customer
  return "/";
}
