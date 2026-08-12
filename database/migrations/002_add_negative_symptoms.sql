-- VaaniDoc
-- Add explicit negative symptom storage for AI clinical intake.

ALTER TABLE public.temporary_intakes
ADD COLUMN IF NOT EXISTS negative_symptoms JSONB;