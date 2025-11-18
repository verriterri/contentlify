-- Add INSERT policy for credit_purchases table
-- This allows users to create their own purchase records during checkout

CREATE POLICY "Users can insert own credit purchases"
  ON public.credit_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

