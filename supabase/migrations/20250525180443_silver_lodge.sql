/*
  # Update battle registration and initialization logic

  1. Changes
    - Clear any pending participants when battle completes
    - Reset registration state for new battle
    - Update registration window checks
    - Add function to clear pending participants

  2. Security
    - Maintain existing RLS policies
    - Functions are security definer for proper access control
*/

-- Function to clear pending participants
CREATE OR REPLACE FUNCTION public.clear_pending_participants()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear participants from completed battles
  DELETE FROM daily_participants dp
  USING daily_battles db
  WHERE dp.battle_id = db.id
  AND db.status = 'completed';

  -- Clear device submissions from completed battles
  DELETE FROM device_submissions ds
  USING daily_battles db
  WHERE ds.submission_date = db.battle_date
  AND db.status = 'completed';
END;
$$;

-- Update the complete_battle function to clear participants
CREATE OR REPLACE FUNCTION public.complete_battle(
  p_winner_name text,
  p_simulation_data jsonb,
  p_duration_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_battle_id uuid;
  v_winner_user_id uuid;
BEGIN
  -- Get today's battle ID
  SELECT id INTO v_battle_id
  FROM daily_battles
  WHERE battle_date = CURRENT_DATE;

  IF v_battle_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get winner's user ID if they are registered
  SELECT u.id INTO v_winner_user_id
  FROM daily_participants dp
  LEFT JOIN users u ON dp.user_id = u.id
  WHERE dp.battle_id = v_battle_id 
  AND dp.dot_name = p_winner_name
  GROUP BY u.id
  LIMIT 1;

  -- Update battle as completed
  UPDATE daily_battles
  SET 
    status = 'completed',
    winner_dot_name = p_winner_name,
    winner_user_id = v_winner_user_id,
    battle_duration_seconds = p_duration_seconds,
    simulation_data = p_simulation_data,
    completed_at = NOW(),
    current_participants = 0
  WHERE id = v_battle_id;

  -- Update winner statistics
  IF v_winner_user_id IS NOT NULL THEN
    UPDATE users
    SET 
      total_wins = total_wins + 1,
      win_streak = win_streak + 1,
      best_win_streak = GREATEST(win_streak + 1, best_win_streak),
      first_win_date = COALESCE(first_win_date, CURRENT_DATE)
    WHERE id = v_winner_user_id;
  END IF;

  -- Update dot statistics
  UPDATE dots
  SET 
    total_wins = total_wins + 1,
    last_active = NOW()
  WHERE name = p_winner_name;

  -- Clear pending participants and device submissions
  PERFORM clear_pending_participants();

  -- Initialize next battle immediately
  PERFORM initialize_next_battle();

  RETURN true;
END;
$$;

-- Update the initialize_next_battle function
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
  
  -- Calculate next battle date
  v_next_date := CURRENT_DATE;
  
  -- Set battle time and registration deadline for today
  v_battle_time := v_next_date + v_schedule.battle_time;
  v_registration_deadline := v_battle_time - (v_schedule.registration_cutoff_minutes || ' minutes')::interval;
  
  -- Create or update today's battle
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
  ON CONFLICT (battle_date) 
  DO UPDATE SET
    status = 'registration',
    current_participants = 0,
    battle_start_time = v_battle_time,
    registration_deadline = v_registration_deadline;

  -- Clear any existing device submissions for today
  DELETE FROM device_submissions
  WHERE submission_date = CURRENT_DATE;
END;
$$;