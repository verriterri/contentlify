-- Add subscription_tier and subscription_status fields to users table
-- These fields track user subscription tiers (free, starter, pro, agency) and status (active, canceled)

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'agency'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'canceled' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);

