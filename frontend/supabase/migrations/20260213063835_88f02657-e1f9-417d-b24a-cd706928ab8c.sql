-- Attach the handle_new_user trigger to auth.users (creates profile + default customer role)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Seed commission_settings if empty so admin can configure it
INSERT INTO public.commission_settings (percentage)
SELECT 15
WHERE NOT EXISTS (SELECT 1 FROM public.commission_settings);
