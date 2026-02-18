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

    const body = await req.json();
    const { action, booking_id, rating, title, content } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION 1: Create review
    if (action === "create_review") {
      if (!booking_id || !rating) {
        return new Response(
          JSON.stringify({ error: "Missing booking_id or rating" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate rating
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return new Response(
          JSON.stringify({
            error: "Rating must be an integer between 1 and 5",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get booking details
      const { data: booking, error: bookingError } = await adminClient
        .from("bookings")
        .select("id, customer_id, vendor_id, booking_status")
        .eq("id", booking_id)
        .single();

      if (bookingError || !booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check authorization - only the customer can review
      if (user.id !== booking.customer_id) {
        return new Response(
          JSON.stringify({
            error: "Only the customer can review this booking",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if booking is completed
      if (booking.booking_status !== "completed") {
        return new Response(
          JSON.stringify({
            error: "Can only review completed bookings",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if review already exists for this booking
      const { data: existingReview } = await adminClient
        .from("reviews")
        .select("id")
        .eq("booking_id", booking_id)
        .single();

      if (existingReview) {
        return new Response(
          JSON.stringify({
            error: "Review already exists for this booking",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create review
      const { data: review, error: reviewError } = await adminClient
        .from("reviews")
        .insert({
          booking_id,
          vendor_id: booking.vendor_id,
          customer_id: user.id,
          rating,
          title: title || "Experience Review",
          content: content || "",
        })
        .select()
        .single();

      if (reviewError) {
        throw reviewError;
      }

      // Get updated vendor rating
      const { data: ratingData } = await adminClient
        .from("vendor_rating_summary")
        .select("average_rating, total_reviews")
        .eq("vendor_id", booking.vendor_id)
        .single();

      // Create notification for vendor
      const { data: vendor } = await adminClient
        .from("vendors")
        .select("user_id")
        .eq("id", booking.vendor_id)
        .single();

      if (vendor) {
        await adminClient.from("notifications").insert({
          user_id: vendor.user_id,
          notification_type: "system_alert",
          title: "New Review",
          message: `You received a new ${rating}-star review from a customer.`,
          related_vendor_id: booking.vendor_id,
          related_booking_id: booking_id,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          review,
          vendor_rating: ratingData,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION 2: Get vendor reviews
    else if (action === "get_vendor_reviews") {
      const { vendor_id } = body;

      if (!vendor_id) {
        return new Response(
          JSON.stringify({ error: "Missing vendor_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get reviews
      const { data: reviews, error: reviewsError } = await adminClient
        .from("reviews")
        .select(
          "id, rating, title, content, created_at, customer_id, profiles(full_name)"
        )
        .eq("vendor_id", vendor_id)
        .order("created_at", { ascending: false });

      if (reviewsError) {
        throw reviewsError;
      }

      // Get rating summary
      const { data: summary, error: summaryError } = await adminClient
        .from("vendor_rating_summary")
        .select("average_rating, total_reviews")
        .eq("vendor_id", vendor_id)
        .single();

      if (summaryError) {
        // If no summary exists, return zeros
        return new Response(
          JSON.stringify({
            success: true,
            reviews: reviews || [],
            summary: {
              average_rating: 0,
              total_reviews: 0,
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          reviews: reviews || [],
          summary,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION 3: Delete review (admin or review owner)
    else if (action === "delete_review") {
      const { review_id } = body;

      if (!review_id) {
        return new Response(
          JSON.stringify({ error: "Missing review_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get review
      const { data: review, error: reviewError } = await adminClient
        .from("reviews")
        .select("id, customer_id")
        .eq("id", review_id)
        .single();

      if (reviewError || !review) {
        return new Response(JSON.stringify({ error: "Review not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check authorization
      const isAdmin = (await adminClient.rpc("is_admin", {
        _user_id: user.id,
      })).data;

      if (user.id !== review.customer_id && !isAdmin) {
        return new Response(
          JSON.stringify({
            error: "Not authorized to delete this review",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Delete review
      const { error: deleteError } = await adminClient
        .from("reviews")
        .delete()
        .eq("id", review_id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Review deleted successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Review error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
