-- ContentMaxer Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'agency')),
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Content analyses table
CREATE TABLE IF NOT EXISTS public.content_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  content TEXT,
  affiliate_opportunities JSONB DEFAULT '[]'::jsonb,
  product_ideas JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Generated products table
CREATE TABLE IF NOT EXISTS public.generated_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.content_analyses(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('checklist', 'workbook', 'ebook', 'newsletter')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  template_used TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Social posts table
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.generated_products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'twitter', 'instagram', 'pinterest')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_analyses_user_id ON public.content_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_content_analyses_status ON public.content_analyses(status);
CREATE INDEX IF NOT EXISTS idx_content_analyses_created_at ON public.content_analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_products_user_id ON public.generated_products(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_products_analysis_id ON public.generated_products(analysis_id);
CREATE INDEX IF NOT EXISTS idx_generated_products_created_at ON public.generated_products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_product_id ON public.social_posts(product_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Content analyses policies
-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
  ON public.content_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own analyses
CREATE POLICY "Users can view own analyses"
  ON public.content_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "Users can update own analyses"
  ON public.content_analyses FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
  ON public.content_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Generated products policies
-- Users can insert their own products
CREATE POLICY "Users can insert own products"
  ON public.generated_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own products
CREATE POLICY "Users can view own products"
  ON public.generated_products FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own products
CREATE POLICY "Users can update own products"
  ON public.generated_products FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own products
CREATE POLICY "Users can delete own products"
  ON public.generated_products FOR DELETE
  USING (auth.uid() = user_id);

-- Social posts policies
-- Users can insert posts for their own products
CREATE POLICY "Users can insert posts for own products"
  ON public.social_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.generated_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

-- Users can view posts for their own products
CREATE POLICY "Users can view posts for own products"
  ON public.social_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

-- Users can update posts for their own products
CREATE POLICY "Users can update posts for own products"
  ON public.social_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

-- Users can delete posts for their own products
CREATE POLICY "Users can delete posts for own products"
  ON public.social_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

