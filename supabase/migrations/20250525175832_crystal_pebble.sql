/*
  # Update complete_battle function
  
  1. Changes
    - Drop existing complete_battle function
    - Recreate with proper return type and updated logic
    - Add proper winner determination with GROUP BY
    - Add automatic next battle initialization
  
  2. Security
    - Maintain SECURITY DEFINER setting
    - Ensure proper access control
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS complete_battle();

-- Recreate the function with updated logic
CREATE OR REPLACE FUNCTION complete_battle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_battle_id UUID;
    winning_dot_name TEXT;
    winning_user_id UUID;
BEGIN
    -- Get the current battle ID
    SELECT id INTO current_battle_id
    FROM daily_battles
    WHERE battle_date = CURRENT_DATE
    AND status = 'in_progress'
    LIMIT 1;

    -- If no battle is in progress, exit
    IF current_battle_id IS NULL THEN
        RETURN;
    END IF;

    -- Determine the winner using proper GROUP BY
    WITH ranked_participants AS (
        SELECT 
            dp.dot_name,
            dp.user_id,
            COUNT(dp.id) as participant_count,
            MAX(dp.survived_until) as last_survived,
            MAX(dp.placement) as best_placement,
            SUM(dp.eliminations) as total_eliminations
        FROM daily_participants dp
        WHERE dp.battle_id = current_battle_id
        GROUP BY dp.dot_name, dp.user_id
        ORDER BY 
            best_placement ASC NULLS LAST,
            total_eliminations DESC,
            last_survived DESC NULLS LAST
        LIMIT 1
    )
    SELECT 
        dot_name,
        user_id
    INTO
        winning_dot_name,
        winning_user_id
    FROM ranked_participants;

    -- Update the battle status
    UPDATE daily_battles
    SET 
        status = 'completed',
        completed_at = NOW(),
        winner_dot_name = winning_dot_name,
        winner_user_id = winning_user_id
    WHERE id = current_battle_id;

    -- Update winner statistics in dots table
    UPDATE dots
    SET 
        total_wins = total_wins + 1,
        last_active = NOW()
    WHERE name = winning_dot_name;

    -- Update winner statistics in users table if applicable
    IF winning_user_id IS NOT NULL THEN
        UPDATE users
        SET 
            total_wins = total_wins + 1,
            win_streak = win_streak + 1,
            best_win_streak = GREATEST(win_streak + 1, best_win_streak),
            first_win_date = COALESCE(first_win_date, CURRENT_DATE),
            last_active = CURRENT_DATE
        WHERE id = winning_user_id;
    END IF;

    -- Initialize next battle
    INSERT INTO daily_battles (
        battle_date,
        status,
        registration_deadline,
        battle_start_time
    )
    SELECT
        CURRENT_DATE + 1,
        'registration',
        (CURRENT_DATE + 1 + (battle_time + (registration_cutoff_minutes || ' minutes')::interval))::timestamp,
        (CURRENT_DATE + 1 + battle_time)::timestamp
    FROM game_schedule
    WHERE NOT EXISTS (
        SELECT 1 
        FROM daily_battles 
        WHERE battle_date = CURRENT_DATE + 1
    );
END;
$$;