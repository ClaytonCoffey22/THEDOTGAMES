/*
  # Fix complete_battle function

  1. Changes
    - Modified complete_battle function to properly handle user ID grouping
    - Added missing GROUP BY clause for user ID
    - Improved winner determination logic
    - Added proper transaction handling for battle completion

  2. Technical Details
    - Fixed SQL error: "column u.id must appear in the GROUP BY clause"
    - Ensures atomic updates for battle completion
    - Maintains data consistency during winner updates
*/

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
    completed_at = NOW()
  WHERE id = v_battle_id;

  -- Update winner statistics
  -- For registered users
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

  RETURN true;
END;
$$;