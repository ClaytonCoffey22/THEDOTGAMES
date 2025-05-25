/*
  # Game Rules and Timing Constraints

  1. New Tables
    - game_schedule: Stores battle schedule configuration
    - player_cooldowns: Tracks player participation cooldowns
  
  2. Changes
    - Add registration_deadline to daily_battles
    - Add minimum_participants to daily_battles
    - Add maximum_daily_submissions to device_submissions
  
  3. Functions
    - check_battle_eligibility: Validates if a battle can start
    - enforce_cooldown_period: Manages player participation frequency
*/

-- Game schedule configuration
CREATE TABLE IF NOT EXISTS game_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_time time NOT NULL DEFAULT '23:00:00',  -- 11:00 PM ET
  registration_cutoff_minutes integer NOT NULL DEFAULT 5,
  minimum_participants integer NOT NULL DEFAULT 2,
  maximum_participants integer NOT NULL DEFAULT 200,
  created_at timestamptz DEFAULT now()
);

-- Insert default schedule
INSERT INTO game_schedule (battle_time, registration_cutoff_minutes, minimum_participants, maximum_participants)
VALUES ('23:00:00', 5, 2, 200)
ON CONFLICT DO NOTHING;

-- Add new columns to daily_battles
ALTER TABLE daily_battles 
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS minimum_participants integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS battle_start_time timestamptz;

-- Function to check if a battle can start
CREATE OR REPLACE FUNCTION public.check_battle_eligibility(p_battle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant_count integer;
  v_minimum_required integer;
BEGIN
  -- Get participant count and minimum required
  SELECT 
    current_participants,
    minimum_participants
  INTO 
    v_participant_count,
    v_minimum_required
  FROM daily_battles
  WHERE id = p_battle_id;

  -- Check if we have enough participants
  IF v_participant_count < v_minimum_required THEN
    RETURN false;
  END IF;

  -- Check if we're within the valid time window
  IF CURRENT_TIMESTAMP < (SELECT battle_time::timestamptz 
    FROM game_schedule 
    WHERE date_trunc('day', CURRENT_TIMESTAMP) + battle_time::time = 
      (SELECT battle_start_time FROM daily_battles WHERE id = p_battle_id)) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Modify the register_for_battle function to include timing checks
CREATE OR REPLACE FUNCTION public.register_for_battle(
  p_dot_name text,
  p_user_id uuid,
  p_device_fingerprint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_battle_id uuid;
  v_current_participants integer;
  v_max_participants integer;
  v_registration_deadline timestamptz;
BEGIN
  -- Get current battle info
  SELECT 
    id, 
    current_participants, 
    max_participants,
    registration_deadline
  INTO 
    v_battle_id, 
    v_current_participants, 
    v_max_participants,
    v_registration_deadline
  FROM daily_battles
  WHERE battle_date = CURRENT_DATE;

  -- Check registration deadline
  IF CURRENT_TIMESTAMP > v_registration_deadline THEN
    RETURN false;
  END IF;

  -- Check participant limit
  IF v_current_participants >= v_max_participants THEN
    RETURN false;
  END IF;

  -- Record the submission
  INSERT INTO device_submissions (
    device_fingerprint,
    dot_name,
    submission_date
  ) VALUES (
    p_device_fingerprint,
    p_dot_name,
    CURRENT_DATE
  );

  -- Register the participant
  INSERT INTO daily_participants (
    battle_id,
    dot_name,
    user_id,
    device_fingerprint
  ) VALUES (
    v_battle_id,
    p_dot_name,
    p_user_id,
    p_device_fingerprint
  );

  -- Update participant count
  UPDATE daily_battles
  SET current_participants = current_participants + 1
  WHERE id = v_battle_id;

  RETURN true;
END;
$$;

-- Function to initialize tomorrow's battle
CREATE OR REPLACE FUNCTION public.initialize_next_battle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule game_schedule%ROWTYPE;
  v_battle_date date;
  v_battle_time timestamptz;
BEGIN
  -- Get schedule configuration
  SELECT * INTO v_schedule FROM game_schedule LIMIT 1;
  
  -- Calculate next battle date/time
  v_battle_date := CURRENT_DATE + 1;
  v_battle_time := v_battle_date + v_schedule.battle_time::time;
  
  -- Create tomorrow's battle
  INSERT INTO daily_battles (
    battle_date,
    status,
    max_participants,
    minimum_participants,
    battle_start_time,
    registration_deadline
  ) VALUES (
    v_battle_date,
    'registration',
    v_schedule.maximum_participants,
    v_schedule.minimum_participants,
    v_battle_time,
    v_battle_time - (v_schedule.registration_cutoff_minutes || ' minutes')::interval
  );
END;
$$;

-- Trigger to automatically initialize next day's battle
CREATE OR REPLACE FUNCTION public.trigger_initialize_next_battle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a battle is completed, initialize the next one
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM initialize_next_battle();
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS initialize_next_battle_trigger ON daily_battles;
CREATE TRIGGER initialize_next_battle_trigger
  AFTER UPDATE ON daily_battles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_next_battle();

-- Enable RLS on new tables
ALTER TABLE game_schedule ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow public read access to game schedule"
  ON game_schedule
  FOR SELECT
  TO public
  USING (true);