/*
  # Update registration rules for daily battles
  
  1. Changes
    - Add registration window constraints
    - Update registration check function
    - Add next day registration after midnight
  
  2. Security
    - Maintain existing RLS policies
*/

-- Update the can_register_today function to check registration window
CREATE OR REPLACE FUNCTION public.can_register_today(
  p_device_fingerprint text,
  p_dot_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_battle_status text;
  v_existing_submission boolean;
  v_registration_deadline timestamptz;
  v_current_time timestamptz := CURRENT_TIMESTAMP;
BEGIN
  -- Get battle status and registration deadline
  SELECT 
    status,
    registration_deadline 
  INTO 
    v_battle_status,
    v_registration_deadline
  FROM daily_battles
  WHERE battle_date = v_today;

  -- Check if registration is open and within time window
  IF v_battle_status != 'registration' OR v_current_time > v_registration_deadline THEN
    RETURN false;
  END IF;

  -- Check if device has already submitted for today's battle
  SELECT EXISTS (
    SELECT 1
    FROM device_submissions
    WHERE device_fingerprint = p_device_fingerprint
    AND submission_date = v_today
  ) INTO v_existing_submission;

  IF v_existing_submission THEN
    RETURN false;
  END IF;

  -- All checks passed
  RETURN true;
END;
$$;

-- Function to initialize next day's battle at midnight
CREATE OR REPLACE FUNCTION public.initialize_next_battle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule game_schedule%ROWTYPE;
  v_next_date date;
  v_battle_time timestamptz;
  v_registration_deadline timestamptz;
BEGIN
  -- Get schedule configuration
  SELECT * INTO v_schedule FROM game_schedule LIMIT 1;
  
  -- Calculate next battle date (tomorrow)
  v_next_date := CURRENT_DATE + 1;
  
  -- Set battle time and registration deadline
  v_battle_time := v_next_date + v_schedule.battle_time;
  v_registration_deadline := v_battle_time - (v_schedule.registration_cutoff_minutes || ' minutes')::interval;
  
  -- Create next day's battle if it doesn't exist
  INSERT INTO daily_battles (
    battle_date,
    status,
    max_participants,
    minimum_participants,
    battle_start_time,
    registration_deadline,
    current_participants
  ) VALUES (
    v_next_date,
    'registration',
    v_schedule.maximum_participants,
    v_schedule.minimum_participants,
    v_battle_time,
    v_registration_deadline,
    0
  )
  ON CONFLICT (battle_date) DO NOTHING;

  -- Clear device submissions from previous day
  DELETE FROM device_submissions
  WHERE submission_date < CURRENT_DATE;
END;
$$;

-- Create a trigger to initialize next day's battle at midnight
CREATE OR REPLACE FUNCTION public.trigger_midnight_rollover()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Initialize next battle if we're completing today's battle
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM initialize_next_battle();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS midnight_rollover_trigger ON daily_battles;

-- Create the trigger
CREATE TRIGGER midnight_rollover_trigger
  AFTER UPDATE ON daily_battles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_midnight_rollover();