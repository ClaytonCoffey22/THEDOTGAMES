/*
  # Update battle completion logic

  1. New Functions
    - `complete_battle`: Updated to handle winner statistics and leaderboard updates
    - `update_dot_statistics`: New function to update dot statistics after a battle

  2. Changes
    - Add winner eliminations tracking
    - Update leaderboard statistics automatically
    - Track battle completion time

  3. Security
    - Functions are security definer to ensure proper access control
*/

-- Function to update dot statistics after a battle
CREATE OR REPLACE FUNCTION public.update_dot_statistics(
  p_dot_name text,
  p_eliminations integer,
  p_is_winner boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create dot record if it doesn't exist
  INSERT INTO dots (name, total_wins, total_eliminations, total_matches)
  VALUES (p_dot_name, 0, 0, 0)
  ON CONFLICT (name) DO NOTHING;

  -- Update dot statistics
  UPDATE dots
  SET 
    total_wins = CASE WHEN p_is_winner THEN total_wins + 1 ELSE total_wins END,
    total_eliminations = total_eliminations + p_eliminations,
    total_matches = total_matches + 1,
    last_active = CURRENT_TIMESTAMP
  WHERE name = p_dot_name;
END;
$$;

-- Function to complete a battle and update statistics
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
  v_winner_eliminations integer;
  v_participant RECORD;
BEGIN
  -- Get current battle ID
  SELECT id INTO v_battle_id
  FROM daily_battles
  WHERE battle_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get winner's user ID and eliminations
  SELECT user_id, eliminations INTO v_winner_user_id, v_winner_eliminations
  FROM daily_participants
  WHERE battle_id = v_battle_id AND dot_name = p_winner_name;

  -- Update battle record
  UPDATE daily_battles
  SET 
    status = 'completed',
    winner_dot_name = p_winner_name,
    winner_user_id = v_winner_user_id,
    battle_duration_seconds = p_duration_seconds,
    simulation_data = p_simulation_data,
    completed_at = CURRENT_TIMESTAMP
  WHERE id = v_battle_id;

  -- Update statistics for all participants
  FOR v_participant IN
    SELECT 
      dot_name,
      eliminations,
      dot_name = p_winner_name as is_winner
    FROM daily_participants
    WHERE battle_id = v_battle_id
  LOOP
    PERFORM update_dot_statistics(
      v_participant.dot_name,
      v_participant.eliminations,
      v_participant.is_winner
    );
  END LOOP;

  -- Create battle summary
  INSERT INTO battle_summaries (
    battle_date,
    total_participants,
    winner_account_name,
    winner_was_guest,
    guest_participants,
    registered_participants
  )
  SELECT
    db.battle_date,
    COUNT(dp.id),
    u.account_name,
    CASE WHEN u.id IS NULL THEN true ELSE false END,
    COUNT(dp.id) FILTER (WHERE dp.user_id IS NULL),
    COUNT(dp.id) FILTER (WHERE dp.user_id IS NOT NULL)
  FROM daily_battles db
  LEFT JOIN daily_participants dp ON dp.battle_id = db.id
  LEFT JOIN users u ON u.id = v_winner_user_id
  WHERE db.id = v_battle_id
  GROUP BY db.battle_date, u.account_name;

  RETURN true;
END;
$$;