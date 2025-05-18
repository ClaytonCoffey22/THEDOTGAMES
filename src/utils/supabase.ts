import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Environment variables - you'll need to add these to your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Validate that environment variables are present
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Types for our database - these help TypeScript understand our data structure
export interface DatabaseDot {
  id: string;
  name: string;
  total_wins: number;
  total_eliminations: number;
  total_matches: number;
  first_appeared: string;
  last_active: string;
}

export interface DatabaseMatch {
  id: string;
  date: string;
  winner_name: string | null;
  total_dots: number;
  duration_seconds: number | null;
  simulation_data: any; // We use 'any' here because the structure can vary
  created_at: string;
}

export interface DeviceSubmission {
  id: string;
  device_fingerprint: string;
  submission_date: string;
  dot_name: string;
  created_at: string;
}

// Type for leaderboard entries - this makes our code more predictable
interface LeaderboardEntry {
  name: string;
  wins: number; // Changed from total_wins
  eliminations: number; // Changed from total_eliminations
}

/**
 * Fetch the current leaderboard from Supabase
 * The return type annotation helps TypeScript and other developers understand what to expect
 */
export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("name, total_wins, total_eliminations")
      .order("total_wins", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }

    // We transform the data to match our expected format
    // This is good practice to ensure type safety
    return (data || []).map((item: any) => ({
      name: item.name,
      wins: item.total_wins,
      eliminations: item.total_eliminations,
    }));
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
};

/**
 * Check if a device can submit a new dot today
 * Boolean return type makes the function's purpose crystal clear
 */
export const canDeviceSubmitToday = async (
  deviceFingerprint: string
): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    const { data, error } = await supabase
      .from("device_submissions")
      .select("id")
      .eq("device_fingerprint", deviceFingerprint)
      .eq("submission_date", today)
      .single();

    // PGRST116 is Supabase's error code for "no rows returned"
    // This is a normal case, not an actual error
    if (error && error.code !== "PGRST116") {
      console.error("Error checking device submission:", error);
      return false;
    }

    // If we found a record, they already submitted today
    return !data;
  } catch (error) {
    console.error("Failed to check device submission:", error);
    return false;
  }
};
