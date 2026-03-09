
-- Create a secure function to assign vendor role to the calling user
CREATE OR REPLACE FUNCTION public.assign_vendor_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only insert if user doesn't already have vendor role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'vendor')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
