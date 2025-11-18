-- IMMEDIATE FIX: Grant 1 free credit to new signups
-- Run this in Supabase SQL Editor

-- Step 1: Update the trigger function to grant 1 credit to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, email_verified, credits)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    1  -- 1 free credit for new signups to analyze 1 post
  )
  ON CONFLICT (id) DO UPDATE
  SET email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
      email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Grant 1 credit to your current account (replace with your email)
-- Option A: Grant to your email
UPDATE public.users 
SET credits = 1 
WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your actual email
  AND credits = 0;

-- Option B: Grant to all users with 0 credits who signed up recently
-- (uncomment the lines below if you want to grant to all eligible users)
-- UPDATE public.users 
-- SET credits = 1 
-- WHERE credits = 0 
--   AND created_at > NOW() - INTERVAL '30 days'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.content_analyses 
--     WHERE user_id = public.users.id 
--     AND credits_used > 0
--   );

-- Step 3: Verify your credits (check your current balance)
SELECT id, email, credits, created_at 
FROM public.users 
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your actual email

