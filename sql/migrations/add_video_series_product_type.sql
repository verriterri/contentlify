-- Migration: Add video_series to product_type constraint
-- Date: 2025-01-13
-- Description: Adds 'video_series' as a valid product_type option in the generated_products table

-- Drop the existing constraint
ALTER TABLE public.generated_products
DROP CONSTRAINT IF EXISTS generated_products_product_type_check;

-- Add the new constraint with video_series included
ALTER TABLE public.generated_products
ADD CONSTRAINT generated_products_product_type_check 
CHECK (product_type IN ('checklist', 'workbook', 'ebook', 'newsletter', 'template', 'video_series'));

