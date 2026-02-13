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

    // Verify admin access
    const { data: isAdmin } = await adminClient.rpc("is_admin", {
      _user_id: user.id,
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, vendor_id, payout_id, settlement_notes } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION 1: Calculate and create payout for vendor
    if (action === "create_payout") {
      if (!vendor_id) {
        return new Response(
          JSON.stringify({ error: "Missing vendor_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get vendor wallet balance
      const { data: wallet, error: walletError } = await adminClient
        .from("vendor_wallets")
        .select("balance")
        .eq("vendor_id", vendor_id)
        .single();

      if (walletError || !wallet) {
        return new Response(
          JSON.stringify({ error: "Vendor wallet not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (wallet.balance <= 0) {
        return new Response(
          JSON.stringify({
            error: "Vendor has no balance to pay out",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create payout record
      const { data: payout, error: payoutError } = await adminClient
        .from("payouts")
        .insert({
          vendor_id,
          amount: wallet.balance,
          status: "pending",
          settled_by: user.id,
        })
        .select()
        .single();

      if (payoutError) {
        throw payoutError;
      }

      // Create notification for vendor
      const { data: vendor } = await adminClient
        .from("vendors")
        .select("user_id")
        .eq("id", vendor_id)
        .single();

      if (vendor) {
        await adminClient.from("notifications").insert({
          user_id: vendor.user_id,
          notification_type: "payout_processed",
          title: "Payout Initiated",
          message: `A payout of ₹${wallet.balance} has been initiated. Status: Pending.`,
          related_vendor_id: vendor_id,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          payout,
          message: "Payout created successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION 2: Mark payout as completed (settled)
    else if (action === "settle_payout") {
      if (!payout_id) {
        return new Response(
          JSON.stringify({ error: "Missing payout_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get payout details
      const { data: payout, error: payoutError } = await adminClient
        .from("payouts")
        .select("id, vendor_id, amount, status")
        .eq("id", payout_id)
        .single();

      if (payoutError || !payout) {
        return new Response(JSON.stringify({ error: "Payout not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (payout.status === "completed") {
        return new Response(
          JSON.stringify({ error: "Payout already settled" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();

      // Update payout status
      const { data: updatedPayout, error: updateError } = await adminClient
        .from("payouts")
        .update({
          status: "completed",
          settled_at: now,
          settlement_notes,
        })
        .eq("id", payout_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Record payout transaction
      await adminClient.from("settlement_transactions").insert({
        vendor_id: payout.vendor_id,
        payout_id: payout_id,
        transaction_type: "payout",
        gross_amount: 0,
        commission_amount: 0,
        net_amount: -payout.amount, // Negative because it's a debit
        settled_at: now,
      });

      // Update vendor wallet - deduct the paid amount
      const { data: updatedWallet, error: walletUpdateError } = await adminClient
        .from("vendor_wallets")
        .update({
          balance: 0,
          total_paid_out: (
            await adminClient
              .from("vendor_wallets")
              .select("total_paid_out")
              .eq("vendor_id", payout.vendor_id)
              .single()
          ).data?.total_paid_out || 0 + payout.amount,
        })
        .eq("vendor_id", payout.vendor_id)
        .select()
        .single();

      if (walletUpdateError) {
        console.error("Wallet update error:", walletUpdateError);
      }

      // Create notification for vendor
      const { data: vendor } = await adminClient
        .from("vendors")
        .select("user_id")
        .eq("id", payout.vendor_id)
        .single();

      if (vendor) {
        await adminClient.from("notifications").insert({
          user_id: vendor.user_id,
          notification_type: "payout_processed",
          title: "Payout Completed",
          message: `Your payout of ₹${payout.amount} has been processed successfully.${
            settlement_notes ? ` Note: ${settlement_notes}` : ""
          }`,
          related_vendor_id: payout.vendor_id,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          payout: updatedPayout,
          wallet: updatedWallet,
          message: "Payout settled successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION 3: Get payout report
    else if (action === "get_payout_report") {
      const filters = vendor_id ? { vendor_id } : {};

      const { data: payouts, error: payoutsError } = await adminClient
        .from("payouts")
        .select("id, vendor_id, amount, status, created_at, settled_at")
        .match(filters)
        .order("created_at", { ascending: false });

      if (payoutsError) {
        throw payoutsError;
      }

      // Calculate totals
      const totals = {
        pending_amount: 0,
        completed_amount: 0,
        total_payouts: 0,
      };

      payouts?.forEach((payout) => {
        if (payout.status === "pending") {
          totals.pending_amount += payout.amount;
        } else if (payout.status === "completed") {
          totals.completed_amount += payout.amount;
        }
        totals.total_payouts += 1;
      });

      return new Response(
        JSON.stringify({
          success: true,
          payouts,
          totals,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Settlement error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
