-- ContentMaxer Database Schema (Credits Model)
-- Run this SQL in your Supabase SQL Editor
-- WARNING: This will DROP ALL existing objects and start fresh!
--
-- This schema includes all migrations:
-- - email_verified field
-- - free_trial_used and has_made_first_purchase fields
-- - stripe_customer_id field
-- - INSERT policy for users table
-- - create_user_if_missing function
-- - handle_email_confirmed function and trigger
-- - anonymous_usage table for abuse prevention

-- ============================================================================
-- STEP 1: DROP ALL EXISTING OBJECTS
-- ============================================================================

-- Drop all triggers first (before dropping tables)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;

-- Drop all functions (CASCADE will handle dependencies)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_email_confirmed() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_if_missing(UUID, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop all tables (CASCADE will automatically drop policies, triggers, and dependent objects)
-- Order matters: drop dependent tables first
DROP TABLE IF EXISTS public.social_posts CASCADE;
DROP TABLE IF EXISTS public.generated_products CASCADE;
DROP TABLE IF EXISTS public.content_analyses CASCADE;
DROP TABLE IF EXISTS public.analysis_jobs CASCADE;
DROP TABLE IF EXISTS public.blog_scans CASCADE;
DROP TABLE IF EXISTS public.credit_purchases CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.anonymous_usage CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- STEP 2: ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 3: CREATE TABLES
-- ============================================================================

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  credits INTEGER NOT NULL DEFAULT 0,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  free_trial_used BOOLEAN NOT NULL DEFAULT FALSE,
  has_made_first_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Credit purchases table
CREATE TABLE public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- number of credits purchased
  price DECIMAL(10,2) NOT NULL, -- amount paid in USD
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Content analyses table
CREATE TABLE public.content_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT, -- stored content (truncated to 50000 chars)
  word_count INTEGER,
  page_count INTEGER, -- calculated as ceil(word_count / 500)
  credits_used INTEGER NOT NULL DEFAULT 1, -- credits used for this analysis
  affiliate_opportunities JSONB DEFAULT '[]'::jsonb,
  product_ideas JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE -- soft delete
);

-- 4. Generated products table (stores outlines, not full content)
CREATE TABLE public.generated_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.content_analyses(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('checklist', 'workbook', 'ebook', 'newsletter', 'template')),
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- stores outline structure as JSON
  template_used TEXT,
  file_url TEXT, -- URL to generated PDF if exported
  credits_used INTEGER NOT NULL DEFAULT 1, -- credits used for outline generation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Social posts table (for generated social media posts)
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.generated_products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'facebook', 'instagram')),
  content TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1, -- credits used for generation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Blog scans table (for free blog scanning)
CREATE TABLE public.blog_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- null if anonymous user
  blog_url TEXT NOT NULL,
  total_posts INTEGER NOT NULL,
  scanned_posts INTEGER NOT NULL,
  scan_data JSONB NOT NULL, -- stores all post metadata and summary
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE -- anonymous scans expire after 7 days
);

-- 7. Analysis jobs table (for bulk analysis tracking)
CREATE TABLE public.analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES public.blog_scans(id) ON DELETE SET NULL,
  total_posts INTEGER NOT NULL,
  completed_posts INTEGER DEFAULT 0,
  failed_posts INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. User settings table
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  affiliate_ids JSONB DEFAULT '{}'::jsonb, -- {amazon: '', shareASale: '', impact: ''}
  preferences JSONB DEFAULT '{}'::jsonb, -- {defaultTemplate: '', emailNotifications: true, timezone: 'UTC'}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Anonymous usage tracking table (for abuse prevention)
CREATE TABLE public.anonymous_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_key TEXT NOT NULL UNIQUE, -- SHA256 hash of (IP + fingerprint) - primary tracking
  ip_hash TEXT NOT NULL, -- SHA256 hash of IP address - secondary check
  fingerprint_hash TEXT, -- SHA256 hash of browser fingerprint - secondary check
  analysis_count INTEGER NOT NULL DEFAULT 0,
  blocked_attempts INTEGER DEFAULT 0, -- Track abuse attempts
  last_analysis_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_credits ON public.users(credits);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Credit purchases indexes
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON public.credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_created_at ON public.credit_purchases(created_at DESC);

-- Content analyses indexes
CREATE INDEX IF NOT EXISTS idx_content_analyses_user_id ON public.content_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_content_analyses_status ON public.content_analyses(status);
CREATE INDEX IF NOT EXISTS idx_content_analyses_created_at ON public.content_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_analyses_url_user ON public.content_analyses(user_id, url, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_analyses_deleted_at ON public.content_analyses(deleted_at) WHERE deleted_at IS NULL;

-- Generated products indexes
CREATE INDEX IF NOT EXISTS idx_generated_products_user_id ON public.generated_products(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_products_analysis_id ON public.generated_products(analysis_id);
CREATE INDEX IF NOT EXISTS idx_generated_products_created_at ON public.generated_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_products_product_type ON public.generated_products(product_type);

-- Social posts indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_product_id ON public.social_posts(product_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_posts(platform);

-- Blog scans indexes
CREATE INDEX IF NOT EXISTS idx_blog_scans_user_id ON public.blog_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_scans_blog_url ON public.blog_scans(blog_url);
CREATE INDEX IF NOT EXISTS idx_blog_scans_expires_at ON public.blog_scans(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_scans_created_at ON public.blog_scans(created_at DESC);

-- Analysis jobs indexes
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON public.analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON public.analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON public.analysis_jobs(created_at DESC);

-- Anonymous usage indexes
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_usage_key ON public.anonymous_usage(usage_key);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_ip_hash ON public.anonymous_usage(ip_hash);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_fingerprint_hash ON public.anonymous_usage(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_last_analysis ON public.anonymous_usage(last_analysis_at);

-- ============================================================================
-- STEP 5: CREATE FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile on signup
-- Grants 1 free credit to new users (can analyze 1 post)
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

-- Function to update verification status when email is confirmed
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if email_confirmed_at changed from NULL to NOT NULL
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.users
    SET email_verified = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely create a user record if it doesn't exist
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

-- ============================================================================
-- STEP 6: CREATE TRIGGERS
-- ============================================================================

-- Trigger to auto-update updated_at on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-update updated_at on credit_purchases table
CREATE TRIGGER update_credit_purchases_updated_at
  BEFORE UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-update updated_at on generated_products table
CREATE TRIGGER update_generated_products_updated_at
  BEFORE UPDATE ON public.generated_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-update updated_at on user_settings table
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-update updated_at on analysis_jobs table
CREATE TRIGGER update_analysis_jobs_updated_at
  BEFORE UPDATE ON public.analysis_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-update updated_at on anonymous_usage table
CREATE TRIGGER update_anonymous_usage_updated_at
  BEFORE UPDATE ON public.anonymous_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create user profile when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update verification status when email is confirmed
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_confirmed();

-- ============================================================================
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_usage ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Credit purchases policies
CREATE POLICY "Users can view own credit purchases"
  ON public.credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit purchases"
  ON public.credit_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: Credit purchases are also inserted via webhook (which uses service role key, bypassing RLS)

-- Content analyses policies
CREATE POLICY "Users can insert own analyses"
  ON public.content_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own analyses"
  ON public.content_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON public.content_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.content_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Generated products policies
CREATE POLICY "Users can insert own products"
  ON public.generated_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own products"
  ON public.generated_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON public.generated_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON public.generated_products FOR DELETE
  USING (auth.uid() = user_id);

-- Social posts policies
CREATE POLICY "Users can insert posts for own products"
  ON public.social_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.generated_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view posts for own products"
  ON public.social_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update posts for own products"
  ON public.social_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete posts for own products"
  ON public.social_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

-- Blog scans policies
-- Allow viewing scans if user owns them OR if they're anonymous (for temporary access)
CREATE POLICY "Users can view own scans or anonymous scans"
  ON public.blog_scans FOR SELECT
  USING (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can insert own scans or anonymous scans"
  ON public.blog_scans FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can update own scans"
  ON public.blog_scans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
  ON public.blog_scans FOR DELETE
  USING (auth.uid() = user_id);

-- Analysis jobs policies
CREATE POLICY "Users can view own analysis jobs"
  ON public.analysis_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis jobs"
  ON public.analysis_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis jobs"
  ON public.analysis_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis jobs"
  ON public.analysis_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Anonymous usage policies
-- Policy: Allow server-side API access (anon key used in API routes)
-- This prevents direct client access while allowing server-side operations
CREATE POLICY "Server-side API access" ON public.anonymous_usage
  FOR ALL
  USING (true); -- Allow all operations via server-side API routes
  -- Note: This table should only be accessed via server-side API routes, not directly from client

-- ============================================================================
-- STEP 8: COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles with credit balance';
COMMENT ON TABLE public.credit_purchases IS 'Credit purchase transactions';
COMMENT ON TABLE public.content_analyses IS 'Blog post analyses with affiliate opportunities and product ideas';
COMMENT ON TABLE public.generated_products IS 'Generated product outlines (not full content)';
COMMENT ON TABLE public.social_posts IS 'Generated social media posts for products';
COMMENT ON TABLE public.user_settings IS 'User preferences and affiliate IDs';

COMMENT ON COLUMN public.users.credits IS 'Current credit balance (never expires)';
COMMENT ON COLUMN public.content_analyses.page_count IS 'Calculated as ceil(word_count / 500) - for reference only';
COMMENT ON COLUMN public.content_analyses.credits_used IS 'Credits deducted for this analysis (1 credit for up to 5,000 words, +1 credit per additional 5,000 words)';
COMMENT ON COLUMN public.generated_products.content IS 'Stores outline structure as JSON, not full product content';
COMMENT ON COLUMN public.generated_products.credits_used IS 'Credits deducted for outline generation (1 credit per outline)';

-- ============================================================================
-- DONE! Schema is ready.
-- ============================================================================

-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify all tables, indexes, and policies are created
-- 3. Test with a new user signup
-- 4. Test credit purchase flow
-- 5. Test analysis and outline generation
