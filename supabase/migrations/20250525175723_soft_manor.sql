/*
  # Fix complete_battle function GROUP BY clause

  1. Changes
    - Update the complete_battle function to properly handle GROUP BY clause
    - Include u.id in the GROUP BY or use appropriate aggregation
    - Ensure all non-aggregated columns are properly grouped

  Note: This migration fixes the SQL error "column u.id must appear in the GROUP BY clause"
*/

CREATE OR REPLACE FUNCTION complete_battle()
RETURNS TABLE (
  battle_id uuid,
  winner_dot_name text,
  winner_user_id uuid,
  battle_duration_seconds integer
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH battle_results AS (
    SELECT 
      b.id as battle_id,
      dp.dot_name,
      dp.user_id,
      u.id as user_id,
      b.created_at,
      EXTRACT(EPOCH FROM (NOW() - b.created_at))::integer as duration_seconds,
      ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY dp.placement ASC) as rank
    FROM daily_battles b
    JOIN daily_participants dp ON dp.battle_id = b.id
    LEFT JOIN users u ON dp.user_id = u.id
    WHERE b.status = 'in_progress'
    AND b.battle_date = CURRENT_DATE
  )
  SELECT 
    br.battle_id,
    br.dot_name as winner_dot_name,
    br.user_id as winner_user_id,
    br.duration_seconds
  FROM battle_results br
  WHERE br.rank = 1
  GROUP BY 
    br.battle_id,
    br.dot_name,
    br.user_id,
    br.duration_seconds;
END;
$$;