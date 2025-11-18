-- Add free_trial_used field to users table
-- This tracks if a user has used their free trial (1 post free)

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS free_trial_used BOOLEAN NOT NULL DEFAULT FALSE;

-- Add has_made_first_purchase field to track first purchase bonus eligibility
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS has_made_first_purchase BOOLEAN NOT NULL DEFAULT FALSE;

