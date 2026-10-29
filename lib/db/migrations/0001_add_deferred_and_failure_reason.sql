-- EcoSched Migration: 0001_add_deferred_and_failure_reason.sql
-- Description: Adds 'Deferred' status to status enum, failure tracking columns, and an optimized index for concurrency locking.

DO $$
BEGIN
  -- Add 'Deferred' to status enum if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Deferred' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status')
  ) THEN
    ALTER TYPE status ADD VALUE 'Deferred';
  END IF;
END $$;

-- Add structured failure reason and diagnostic details columns
ALTER TABLE workloads
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS failure_details TEXT;

-- Create an index to support fast 'SELECT ... FOR UPDATE SKIP LOCKED' concurrency queries
CREATE INDEX IF NOT EXISTS idx_workloads_pending_concurrency 
ON workloads (status, priority, created_at)
WHERE status = 'Pending';
