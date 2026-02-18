-- Function to atomically increment booked_count on time_slots
CREATE OR REPLACE FUNCTION public.increment_booked_count(slot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.time_slots
  SET booked_count = booked_count + 1,
      is_available = CASE WHEN booked_count + 1 >= capacity THEN false ELSE true END
  WHERE id = slot_id;
END;
$$;