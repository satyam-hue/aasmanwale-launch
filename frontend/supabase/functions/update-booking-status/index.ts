import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { booking_id, new_status, cancellation_reason, vendor_notes } =
      await req.json();

    if (!booking_id || !new_status) {
      return new Response(
        JSON.stringify({
          error: "Missing booking_id or new_status",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate status value
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(new_status)) {
      return new Response(
        JSON.stringify({ error: "Invalid booking status" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select(
        "id, customer_id, vendor_id, booking_status, total_amount, customer_email, customer_phone"
      )
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: Customer can cancel pending, Vendor can confirm/complete own bookings, Admin can do anything
    const isCustomer = user.id === booking.customer_id;
    const isVendor = (await adminClient.rpc("is_vendor_owner", {
      _vendor_id: booking.vendor_id,
      _user_id: user.id,
    })).data;
    const isAdmin = (await adminClient.rpc("is_admin", { _user_id: user.id }))
      .data;

    // Status transition validation with authorization
    let authorized = false;

    if (new_status === "cancelled") {
      // Customers can cancel pending, admins can always cancel
      authorized = (isCustomer && booking.booking_status === "pending") || isAdmin;
    } else if (new_status === "confirmed") {
      // Vendor or admin can confirm pending bookings
      authorized = (isVendor || isAdmin) && booking.booking_status === "pending";
    } else if (new_status === "completed") {
      // Vendor or admin can complete confirmed bookings
      authorized =
        (isVendor || isAdmin) && booking.booking_status === "confirmed";
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({
          error:
            "Not authorized to perform this status transition",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build update payload
    const updatePayload: any = {
      booking_status: new_status,
    };

    const now = new Date().toISOString();

    if (new_status === "confirmed" && booking.booking_status === "pending") {
      updatePayload.confirmed_at = now;
      // Record earnings when booking is confirmed
      try {
        await adminClient.rpc("record_booking_earnings", {
          _booking_id: booking_id,
          _vendor_id: booking.vendor_id,
          _gross_amount: booking.total_amount,
        });
      } catch (e) {
        console.error("Error recording earnings:", e);
      }
    } else if (new_status === "completed" && booking.booking_status === "confirmed") {
      updatePayload.completed_at = now;
    } else if (new_status === "cancelled") {
      updatePayload.cancelled_at = now;
      if (cancellation_reason) {
        updatePayload.cancellation_reason = cancellation_reason;
      }
    }

    if (vendor_notes && (isVendor || isAdmin)) {
      updatePayload.vendor_notes = vendor_notes;
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await adminClient
      .from("bookings")
      .update(updatePayload)
      .eq("id", booking_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create notifications based on status change
    const notifications: any[] = [];

    if (new_status === "confirmed") {
      // Notify customer
      notifications.push({
        user_id: booking.customer_id,
        notification_type: "booking_confirmation",
        title: "Booking Confirmed",
        message: `Your booking has been confirmed by the vendor.`,
        related_booking_id: booking_id,
      });
      // Notify vendor
      const { data: vendorUser } = await adminClient
        .from("vendors")
        .select("user_id")
        .eq("id", booking.vendor_id)
        .single();

      if (vendorUser) {
        notifications.push({
          user_id: vendorUser.user_id,
          notification_type: "booking_confirmation",
          title: "Booking Confirmed",
          message: `You have confirmed a new booking.`,
          related_booking_id: booking_id,
        });
      }
    } else if (new_status === "completed") {
      // Notify customer that experience is complete
      notifications.push({
        user_id: booking.customer_id,
        notification_type: "booking_completed",
        title: "Experience Complete",
        message: `Your paragliding experience has been marked as complete. Please leave a review!`,
        related_booking_id: booking_id,
      });
    } else if (new_status === "cancelled") {
      // Notify both customer and vendor
      notifications.push({
        user_id: booking.customer_id,
        notification_type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `Your booking has been cancelled.${
          cancellation_reason ? ` Reason: ${cancellation_reason}` : ""
        }`,
        related_booking_id: booking_id,
      });

      const { data: vendorUser } = await adminClient
        .from("vendors")
        .select("user_id")
        .eq("id", booking.vendor_id)
        .single();

      if (vendorUser) {
        notifications.push({
          user_id: vendorUser.user_id,
          notification_type: "booking_cancelled",
          title: "Booking Cancelled",
          message: "A booking was cancelled.",
          related_booking_id: booking_id,
        });
      }
    }

    // Insert all notifications
    for (const notif of notifications) {
      await adminClient.from("notifications").insert(notif);
    }

    // TODO: Send SMS notifications via Twilio
    // This can be integrated with existing send-contact-sms function

    return new Response(
      JSON.stringify({
        success: true,
        booking: updatedBooking,
        notifications_count: notifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Booking status update error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
