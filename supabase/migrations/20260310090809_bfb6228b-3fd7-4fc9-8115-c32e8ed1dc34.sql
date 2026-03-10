
-- Update handle_new_user to check signup metadata for vendor registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Default role: customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');

  -- If signing up as vendor, also assign vendor role and create vendor profile
  IF NEW.raw_user_meta_data->>'signup_role' = 'vendor' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'vendor')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.vendors (user_id, company_name, contact_email, contact_phone, location, is_approved)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'company_phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'location', ''),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;
