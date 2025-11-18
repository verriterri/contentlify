-- Add INSERT policy for users table
-- This allows users to create their own record if the trigger didn't fire
-- This is a fallback safety mechanism

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

