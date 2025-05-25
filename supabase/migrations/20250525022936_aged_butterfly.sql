/*
  # Fix daily battles schema and add views

  1. Changes
    - Fix daily_battles status check constraint
    - Create todays_participants view
    - Add missing indexes

  2. Security
    - Enable RLS on daily_battles table
    - Add policies for public read access
*/

-- Fix the status check constraint for daily_battles
ALTER TABLE daily_battles DROP CONSTRAINT IF EXISTS daily_battles_status_check;
ALTER TABLE daily_battles ADD CONSTRAINT daily_battles_status_check 
  CHECK (status IN ('registration', 'in_progress', 'completed'));

-- Update any existing 'open' status to 'registration'
UPDATE daily_battles SET status = 'registration' WHERE status = 'open';

-- Create todays_participants view
CREATE OR REPLACE VIEW todays_participants AS
SELECT 
  dp.id,
  dp.dot_name,
  dp.user_id,
  dp.eliminations,
  dp.placement,
  u.account_name as display_name,
  CASE WHEN u.id IS NOT NULL THEN true ELSE false END as is_registered,
  dp.created_at
FROM daily_battles db
JOIN daily_participants dp ON dp.battle_id = db.id
LEFT JOIN users u ON u.id = dp.user_id
WHERE db.battle_date = CURRENT_DATE
ORDER BY dp.created_at ASC;

-- Enable RLS on daily_battles
ALTER TABLE daily_battles ENABLE ROW LEVEL SECURITY;

-- Add policies for daily_battles
CREATE POLICY "Allow public read access to daily battles"
  ON daily_battles
  FOR SELECT
  TO public
  USING (true);

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_daily_participants_created_at 
  ON daily_participants (created_at);

CREATE INDEX IF NOT EXISTS idx_daily_battles_status 
  ON daily_battles (status);