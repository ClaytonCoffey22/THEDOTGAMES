/*
  # Add registration check function
  
  1. New Functions
    - `can_register_today`: Checks if a device can register for today's battle
      - Parameters:
        - p_device_fingerprint: text - The device's unique identifier
        - p_dot_name: text - The name of the dot being registered
      - Returns: boolean - Whether registration is allowed
  
  2. Logic
    - Checks if device has already registered today
    - Validates dot name availability
    - Ensures battle registration is open
*/

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
BEGIN
  -- Check if battle is in registration phase
  SELECT status INTO v_battle_status
  FROM daily_battles
  WHERE battle_date = v_today;

  IF v_battle_status != 'registration' THEN
    RETURN false;
  END IF;

  -- Check if device has already submitted today
  SELECT EXISTS (
    SELECT 1
    FROM device_submissions
    WHERE device_fingerprint = p_device_fingerprint
    AND submission_date = v_today
  ) INTO v_existing_submission;

  -- Return false if device has already submitted
  IF v_existing_submission THEN
    RETURN false;
  END IF;

  -- All checks passed
  RETURN true;
END;
$$;