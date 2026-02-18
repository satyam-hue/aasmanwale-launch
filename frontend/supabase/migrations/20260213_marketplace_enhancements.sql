-- ============================================================
-- MARKETPLACE PRODUCTION ENHANCEMENTS MIGRATION
-- Date: 2026-02-13
-- Features: Vendor Wallets, Booking Lifecycle, Reviews, Notifications, Enhanced RLS
-- ============================================================

-- 1. ============ ENUMS ============

-- Create booking status enum (replaces text check constraint)
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('booking_confirmation', 'vendor_approval', 'booking_completed', 'booking_cancelled', 'payout_processed', 'system_alert');

-- 2. ============ VENDOR WALLET SYSTEM ============

-- Vendor Wallets - Current balance tracking
CREATE TABLE public.vendor_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_commission NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_paid_out NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;

-- Settlement Transactions - Fine-grained earnings tracking per booking
CREATE TABLE public.settlement_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('booking_earnings', 'commission_deducted', 'payout')),
  
  -- Amount fields
  gross_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(10,2) NOT NULL,
  
  -- Payout tracking
  payout_id UUID,
  settled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settlement_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_settlement_vendor ON public.settlement_transactions(vendor_id);
CREATE INDEX idx_settlement_booking ON public.settlement_transactions(booking_id);

-- Payouts/Settlements - Track admin payout actions
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  settled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settled_at TIMESTAMPTZ,
  settlement_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payouts_vendor ON public.payouts(vendor_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);

-- 3. ============ REVIEWS & RATINGS ============

-- Reviews - Customer ratings after completed bookings
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reviews_vendor ON public.reviews(vendor_id);
CREATE INDEX idx_reviews_customer ON public.reviews(customer_id);

-- Vendor Ratings Summary - Denormalized for performance
CREATE TABLE public.vendor_rating_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL UNIQUE,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_rating_summary ENABLE ROW LEVEL SECURITY;

-- 4. ============ NOTIFICATIONS SYSTEM ============

-- Notifications - Audit log & event tracking
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type public.notification_type NOT NULL,
  
  title TEXT NOT NULL,
  message TEXT,
  
  related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON public.notifications(notification_type);

-- 5. ============ UPDATE EXISTING BOOKINGS TABLE ============

-- Add new columns to bookings for enhanced tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_status public.booking_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS vendor_notes TEXT;

-- Create a constraint to ensure status progression
ALTER TABLE public.bookings 
ADD CONSTRAINT booking_status_valid CHECK (
  booking_status IN ('pending', 'confirmed', 'completed', 'cancelled')
);

-- 6. ============ HELPER FUNCTIONS ============

-- Function: Calculate commission based on gross amount
CREATE OR REPLACE FUNCTION public.calculate_commission(gross_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (gross_amount * COALESCE(
    (SELECT percentage FROM public.commission_settings LIMIT 1),
    15.00
  ) / 100)::NUMERIC(10,2)
$$;

-- Function: Get vendor's current wallet balance
CREATE OR REPLACE FUNCTION public.get_vendor_balance(_vendor_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(balance, 0.00)
  FROM public.vendor_wallets
  WHERE vendor_id = _vendor_id
$$;

-- Function: Record earnings transaction (CALLED ON BOOKING CONFIRMATION)
CREATE OR REPLACE FUNCTION public.record_booking_earnings(_booking_id UUID, _vendor_id UUID, _gross_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission NUMERIC;
  v_net_amount NUMERIC;
BEGIN
  -- Calculate commission
  v_commission := public.calculate_commission(_gross_amount);
  v_net_amount := _gross_amount - v_commission;
  
  -- Record settlement transaction
  INSERT INTO public.settlement_transactions (
    vendor_id, booking_id, transaction_type,
    gross_amount, commission_amount, net_amount
  ) VALUES (
    _vendor_id, _booking_id, 'booking_earnings',
    _gross_amount, v_commission, v_net_amount
  );
  
  -- Update or create vendor wallet
  INSERT INTO public.vendor_wallets (vendor_id, balance, total_earned, total_commission)
  VALUES (_vendor_id, v_net_amount, _gross_amount, v_commission)
  ON CONFLICT (vendor_id) DO UPDATE SET
    balance = vendor_wallets.balance + EXCLUDED.balance,
    total_earned = vendor_wallets.total_earned + _gross_amount,
    total_commission = vendor_wallets.total_commission + v_commission,
    updated_at = now();
END;
$$;

-- Function: Calculate and update vendor rating summary
CREATE OR REPLACE FUNCTION public.update_vendor_rating_summary(_vendor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_average NUMERIC(3,2);
  v_total INTEGER;
BEGIN
  SELECT 
    COALESCE(AVG(rating), 0.00)::NUMERIC(3,2),
    COALESCE(COUNT(*), 0)
  INTO v_average, v_total
  FROM public.reviews
  WHERE vendor_id = _vendor_id;
  
  INSERT INTO public.vendor_rating_summary (vendor_id, average_rating, total_reviews)
  VALUES (_vendor_id, v_average, v_total)
  ON CONFLICT (vendor_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    updated_at = now();
END;
$$;

-- Function: Create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type public.notification_type,
  _title TEXT,
  _message TEXT DEFAULT NULL,
  _booking_id UUID DEFAULT NULL,
  _vendor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, notification_type, title, message,
    related_booking_id, related_vendor_id
  ) VALUES (
    _user_id, _type, _title, _message, _booking_id, _vendor_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- 7. ============ TRIGGERS ============

-- Trigger: Create vendor wallet when vendor is approved
CREATE OR REPLACE FUNCTION public.create_vendor_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved AND NOT OLD.is_approved THEN
    INSERT INTO public.vendor_wallets (vendor_id)
    VALUES (NEW.id)
    ON CONFLICT (vendor_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vendor_approved_create_wallet
  AFTER UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.create_vendor_wallet();

-- Trigger: Update rating summary when review is created/updated
CREATE OR REPLACE FUNCTION public.update_rating_on_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_vendor_rating_summary(OLD.vendor_id);
  END IF;
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_vendor_rating_summary(NEW.vendor_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER review_update_vendor_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rating_on_review_change();

-- Trigger: Update timestamps for new tables
CREATE TRIGGER vendor_wallets_updated_at BEFORE UPDATE ON public.vendor_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER settlement_transactions_updated_at BEFORE UPDATE ON public.settlement_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER vendor_rating_summary_updated_at BEFORE UPDATE ON public.vendor_rating_summary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. ============ ROW LEVEL SECURITY POLICIES ============

-- Vendor Wallets - Vendor can view own, admin can view all
CREATE POLICY "Vendor can view own wallet" ON public.vendor_wallets FOR SELECT USING (
  public.is_vendor_owner(vendor_id, auth.uid()) OR public.is_admin(auth.uid())
);
CREATE POLICY "Admin can manage wallets" ON public.vendor_wallets FOR UPDATE USING (public.is_admin(auth.uid()));

-- Settlement Transactions - Vendor can view own, admin can view all
CREATE POLICY "Vendor can view own settlement" ON public.settlement_transactions FOR SELECT USING (
  public.is_vendor_owner(vendor_id, auth.uid()) OR public.is_admin(auth.uid())
);
CREATE POLICY "System records settlement" ON public.settlement_transactions FOR INSERT WITH CHECK (true);

-- Payouts - Vendor can view own, admin manages
CREATE POLICY "Vendor can view own payouts" ON public.payouts FOR SELECT USING (
  public.is_vendor_owner(vendor_id, auth.uid()) OR public.is_admin(auth.uid())
);
CREATE POLICY "Admin can manage payouts" ON public.payouts FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin can update payouts" ON public.payouts FOR UPDATE USING (public.is_admin(auth.uid()));

-- Reviews - Anyone can read, customers can create on own bookings after completion, admin can manage
CREATE POLICY "Anyone can read reviews of approved vendors" ON public.reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.is_approved = true)
  OR auth.uid() = customer_id
  OR public.is_vendor_owner(vendor_id, auth.uid())
  OR public.is_admin(auth.uid())
);
CREATE POLICY "Customer can review own completed bookings" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = customer_id 
  AND EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id 
    AND b.customer_id = auth.uid()
    AND b.booking_status = 'completed'
  )
);
CREATE POLICY "Customer can update own reviews" ON public.reviews FOR UPDATE USING (
  auth.uid() = customer_id
);
CREATE POLICY "Admin can manage reviews" ON public.reviews FOR DELETE USING (public.is_admin(auth.uid()));

-- Vendor Rating Summary - Public read for approved vendors
CREATE POLICY "Public can view approved vendor ratings" ON public.vendor_rating_summary FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.is_approved = true)
  OR auth.uid() IS NOT NULL
);

-- Notifications - Users can read own, system creates
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "System creates notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 9. ============ UPDATE EXISTING BOOKING RLS ============

-- Update booking RLS to support new fields and status management
DROP POLICY IF EXISTS "Booking participants can update" ON public.bookings;
CREATE POLICY "Booking participants can update" ON public.bookings FOR UPDATE USING (
  auth.uid() = customer_id 
  OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
  OR public.is_admin(auth.uid())
);

-- 10. ============ SEED DATA ============

-- Initialize vendor wallets for existing approved vendors
INSERT INTO public.vendor_wallets (vendor_id)
SELECT id FROM public.vendors WHERE is_approved = true
ON CONFLICT (vendor_id) DO NOTHING;

-- Initialize rating summaries for all vendors
INSERT INTO public.vendor_rating_summary (vendor_id, average_rating, total_reviews)
SELECT id, 0.00, 0 FROM public.vendors
ON CONFLICT (vendor_id) DO NOTHING;
