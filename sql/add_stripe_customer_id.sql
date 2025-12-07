-- Add stripe_customer_id column to users table
-- This stores the Stripe customer ID for payment processing

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;




