-- User signup trigger - grants 1 free credit to new users
-- According to build plan: "After Signup (1 Free Credit)"
-- New users get 1 free credit to analyze 1 post

-- Update the trigger function to create users with 1 free credit
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

-- Grant 1 credit to existing users who signed up but have 0 credits
-- (only if they haven't used any credits yet)
UPDATE public.users 
SET credits = 1 
WHERE credits = 0 
  AND created_at > NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.content_analyses 
    WHERE user_id = public.users.id 
    AND credits_used > 0
  );

