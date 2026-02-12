import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client to get user
    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      package_id,
      vendor_id,
      time_slot_id,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      // For admin manual booking
      is_manual_booking,
    } = body;

    if (!package_id || !vendor_id || !customer_name || !customer_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If manual booking, verify caller is admin
    if (is_manual_booking) {
      if (!user) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: user.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch package price
    const { data: pkg, error: pkgError } = await adminClient
      .from("packages")
      .select("price, vendor_id, is_active")
      .eq("id", package_id)
      .single();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pkg.is_active) {
      return new Response(JSON.stringify({ error: "Package is no longer available" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pkg.vendor_id !== vendor_id) {
      return new Response(JSON.stringify({ error: "Package does not belong to this vendor" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify vendor is approved
    const { data: vendor } = await adminClient
      .from("vendors")
      .select("is_approved")
      .eq("id", vendor_id)
      .single();

    if (!vendor?.is_approved) {
      return new Response(JSON.stringify({ error: "Vendor is not approved" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If time slot provided, validate availability
    if (time_slot_id) {
      const { data: slot } = await adminClient
        .from("time_slots")
        .select("*")
        .eq("id", time_slot_id)
        .single();

      if (!slot) {
        return new Response(JSON.stringify({ error: "Time slot not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!slot.is_available || slot.booked_count >= slot.capacity) {
        return new Response(JSON.stringify({ error: "Time slot is fully booked" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get commission rate
    const { data: commissionData } = await adminClient
      .from("commission_settings")
      .select("percentage")
      .limit(1)
      .single();

    const commissionRate = commissionData?.percentage || 15;
    const totalAmount = Number(pkg.price);
    const commissionAmount = Math.round((totalAmount * commissionRate) / 100 * 100) / 100;
    const vendorAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;

    // Create booking
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .insert({
        package_id,
        vendor_id,
        time_slot_id: time_slot_id || null,
        customer_id: user?.id || null,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        notes: notes || null,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        vendor_amount: vendorAmount,
        status: is_manual_booking ? "confirmed" : "pending",
        payment_status: is_manual_booking ? "paid" : "unpaid",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      return new Response(JSON.stringify({ error: "Failed to create booking" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment time slot booked_count
    if (time_slot_id) {
      await adminClient.rpc("increment_booked_count" as any, { slot_id: time_slot_id });
    }

    return new Response(JSON.stringify({ booking }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});