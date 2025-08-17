-- Migration: Add visitor movements tracking table
-- This migration adds support for tracking visitor entry/exit movements

-- Create visitor_movements table for tracking entry/exit history
CREATE TABLE IF NOT EXISTS visitor_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  action VARCHAR(10) NOT NULL CHECK (action IN ('entry', 'exit')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  gate_location VARCHAR(100) DEFAULT 'Main Gate',
  scanned_by VARCHAR(100) DEFAULT 'Admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visitor_movements_visitor_id ON visitor_movements(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_movements_timestamp ON visitor_movements(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_movements_action ON visitor_movements(action);

-- Update existing 'active' status to 'entered' for backward compatibility
UPDATE visitors 
SET status = 'entered' 
WHERE status = 'active';

-- Update any other invalid status values to 'registered'
UPDATE visitors 
SET status = 'registered' 
WHERE status NOT IN ('registered', 'entered', 'exited');

-- Update visitors table to support new status values
ALTER TABLE visitors 
DROP CONSTRAINT IF EXISTS visitors_status_check;

ALTER TABLE visitors 
ADD CONSTRAINT visitors_status_check 
CHECK (status IN ('registered', 'entered', 'exited'));

-- Add comment to explain the table purpose
COMMENT ON TABLE visitor_movements IS 'Tracks all visitor entry and exit movements with timestamps and location details';
COMMENT ON COLUMN visitor_movements.action IS 'Type of movement: entry or exit';
COMMENT ON COLUMN visitor_movements.gate_location IS 'Location where the scan occurred';
COMMENT ON COLUMN visitor_movements.scanned_by IS 'Person or system that performed the scan';