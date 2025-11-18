-- Create a function to safely create a user record if it doesn't exist
-- This function has SECURITY DEFINER so it can bypass RLS policies
-- This is a fallback for when the trigger doesn't fire

CREATE OR REPLACE FUNCTION public.create_user_if_missing(
  p_user_id UUID,
  p_email TEXT,
  p_email_verified BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  stripe_customer_id TEXT,
  has_made_first_purchase BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert user if they don't exist, otherwise do nothing
  INSERT INTO public.users (id, email, email_verified, credits)
  VALUES (
    p_user_id,
    p_email,
    p_email_verified,
    1  -- Grant 1 free credit as per signup policy
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Always return the user record (whether we just created it or it already existed)
  -- Use fully qualified names to avoid ambiguity with RETURN TABLE columns
  RETURN QUERY
  SELECT 
    public.users.id,
    public.users.email,
    public.users.stripe_customer_id,
    COALESCE(public.users.has_made_first_purchase, false) as has_made_first_purchase
  FROM public.users
  WHERE public.users.id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_if_missing(UUID, TEXT, BOOLEAN) TO authenticated;

