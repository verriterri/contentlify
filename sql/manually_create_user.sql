-- Manual script to create a user record
-- Replace USER_ID_HERE and EMAIL_HERE with actual values
-- Run this in Supabase SQL Editor if the trigger didn't fire

-- First, check if user exists in auth.users
-- SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'EMAIL_HERE';

-- Then create the user record in public.users
INSERT INTO public.users (id, email, email_verified, credits, free_trial_used, has_made_first_purchase)
VALUES (
  'USER_ID_HERE'::UUID,  -- Replace with actual user ID from auth.users
  'EMAIL_HERE',          -- Replace with actual email
  false,                 -- Set to true if email is confirmed
  1,                     -- Grant 1 free credit
  false,                 -- Free trial not used yet
  false                  -- Hasn't made first purchase yet
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified;

-- Verify the user was created
-- SELECT * FROM public.users WHERE id = 'USER_ID_HERE'::UUID;

