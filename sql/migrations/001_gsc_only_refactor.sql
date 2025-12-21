-- ============================================================================
-- GSC-Only Product Refactoring Migration
-- ============================================================================
-- This migration adds support for one-time GSC report access per payment
--
-- Changes:
-- 1. Add email column to gsc_payments for anonymous purchases
-- 2. Add report_generated tracking to gsc_payments
-- 3. Link gsc_analysis_results to specific payments
-- 4. Add indexes for performance
--
-- Run this BEFORE deploying code changes
-- ============================================================================

-- Add columns to gsc_payments table
ALTER TABLE public.gsc_payments
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS report_generated BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.gsc_payments.email IS 'Buyer email (stored before account creation for anonymous purchases)';
COMMENT ON COLUMN public.gsc_payments.report_generated IS 'Whether this payment has been used to generate a report';
COMMENT ON COLUMN public.gsc_payments.report_generated_at IS 'Timestamp when report was generated for this payment';

-- Link reports to specific payments
ALTER TABLE public.gsc_analysis_results
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.gsc_payments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.gsc_analysis_results.payment_id IS 'Links this report to the specific payment that enabled it';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gsc_payments_user_unused
ON public.gsc_payments(user_id, report_generated)
WHERE report_generated = FALSE AND status = 'completed';

CREATE INDEX IF NOT EXISTS idx_gsc_analysis_results_payment_id
ON public.gsc_analysis_results(payment_id);

CREATE INDEX IF NOT EXISTS idx_gsc_payments_email
ON public.gsc_payments(email)
WHERE email IS NOT NULL;

-- ============================================================================
-- Migration complete
-- ============================================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify all columns and indexes created successfully
-- 3. Deploy code changes (webhook, API updates)
-- ============================================================================
