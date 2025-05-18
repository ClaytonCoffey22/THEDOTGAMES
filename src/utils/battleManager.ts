// src/utils/battleManager.ts
// This module handles the daily battle lifecycle with ephemeral dots

import { supabase } from "./supabase";
import { generateWinnerBadge, uploadBadgeToStorage } from "./badgeGenerator";

// Types for the daily battle system
export interface DailyBattle {
  id: string;
  battle_date: string;
  status: "registration" | "in_progress" | "completed";
  max_participants: number;
  current_participants: number;
  winner_dot_name?: string;
  winner_user_id?: string;
  simulation_data?: any;
}

export interface TodaysParticipant {
  id: string;
  dot_name: string;
  user_id?: string;
  eliminations: number;
  placement?: number;
  display_name: string;
  is_registered: boolean;
}

export interface BattleRegistration {
  success: boolean;
  message: string;
  battle_id?: string;
  participant_count?: number;
}

/**
 * Initialize or get today's battle
 * This ensures we always have a battle ready for registration
 */
export const initializeTodaysBattle = async (): Promise<DailyBattle | null> => {
  try {
    // Call the database function to start today's battle
    const { data, error } = await supabase.rpc("start_daily_battle");

    if (error) {
      console.error("Error initializing daily battle:", error);
      return null;
    }

    // Fetch the complete battle information
    const { data: battleData, error: fetchError } = await supabase
      .from("daily_battles")
      .select("*")
      .eq("id", data)
      .single();

    if (fetchError) {
      console.error("Error fetching battle data:", fetchError);
      return null;
    }

    return battleData;
  } catch (error) {
    console.error("Failed to initialize today's battle:", error);
    return null;
  }
};

/**
 * Register a new participant for today's battle
 * This handles both guest and registered user registrations
 */
export const registerForTodaysBattle = async (
  dotName: string,
  deviceFingerprint: string,
  userId?: string
): Promise<BattleRegistration> => {
  try {
    // First check if registration is possible
    const { data: canRegister, error: checkError } = await supabase.rpc(
      "can_register_today",
      { p_device_fingerprint: deviceFingerprint }
    );

    if (checkError) {
      console.error("Error checking registration eligibility:", checkError);
      return {
        success: false,
        message: "Unable to verify registration eligibility",
      };
    }

    if (!canRegister) {
      return {
        success: false,
        message:
          "You have already registered for today's battle or the battle is full",
      };
    }

    // Attempt to register
    const { data: registrationSuccess, error: registerError } =
      await supabase.rpc("register_for_battle", {
        p_dot_name: dotName,
        p_user_id: userId || null,
        p_device_fingerprint: deviceFingerprint,
      });

    if (registerError) {
      console.error("Error registering for battle:", registerError);
      return { success: false, message: "Registration failed" };
    }

    if (!registrationSuccess) {
      return {
        success: false,
        message: "Registration failed - possibly full or already registered",
      };
    }

    // Fetch updated battle info to get participant count
    const { data: battleInfo } = await supabase
      .from("daily_battles")
      .select("id, current_participants")
      .eq("battle_date", new Date().toISOString().split("T")[0])
      .single();

    return {
      success: true,
      message: "Successfully registered for today's battle!",
      battle_id: battleInfo?.id,
      participant_count: battleInfo?.current_participants,
    };
  } catch (error) {
    console.error("Failed to register for battle:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
};

/**
 * Get today's battle participants for the arena display
 * This returns the temporary dots created for today's battle
 */
export const getTodaysParticipants = async (): Promise<TodaysParticipant[]> => {
  try {
    const { data, error } = await supabase
      .from("todays_leaderboard")
      .select("*")
      .order("placement", { ascending: true, nullsLast: true });

    if (error) {
      console.error("Error fetching today's participants:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch today's participants:", error);
    return [];
  }
};

/**
 * Complete today's battle and process all results
 * This transfers achievements to user accounts and cleans up temporary data
 */
export const completeTodaysBattle = async (
  winnerdotName: string,
  simulationData: any,
  durationSeconds: number
): Promise<boolean> => {
  try {
    // Get today's battle ID
    const { data: battle, error: battleError } = await supabase
      .from("daily_battles")
      .select("id")
      .eq("battle_date", new Date().toISOString().split("T")[0])
      .eq("status", "in_progress")
      .single();

    if (battleError || !battle) {
      console.error("Error finding today's battle:", battleError);
      return false;
    }

    // Complete the battle using our database function
    const { error: completeError } = await supabase.rpc("complete_battle", {
      p_battle_id: battle.id,
      p_winner_dot_name: winnerdotName,
      p_duration_seconds: durationSeconds,
      p_simulation_data: simulationData,
    });

    if (completeError) {
      console.error("Error completing battle:", completeError);
      return false;
    }

    // Optional: Generate and upload winner badge
    try {
      const participants = await getTodaysParticipants();
      const winner = participants.find((p) => p.dot_name === winnerdotName);

      if (winner) {
        const badgeBlob = await generateWinnerBadge({
          winnerName: winner.display_name,
          eliminations: winner.eliminations,
          matchDate: new Date().toISOString(),
          totalParticipants: participants.length,
          matchId: battle.id,
        });

        if (badgeBlob) {
          await uploadBadgeToStorage(badgeBlob, battle.id);
        }
      }
    } catch (badgeError) {
      console.warn("Failed to generate winner badge:", badgeError);
      // Don't fail the entire operation if badge generation fails
    }

    return true;
  } catch (error) {
    console.error("Failed to complete battle:", error);
    return false;
  }
};

/**
 * Get the all-time leaderboard for registered users only
 * This shows persistent achievements across all battles
 */
export const getRegisteredLeaderboard = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("registered_leaderboard")
      .select("*")
      .limit(50); // Top 50 registered players

    if (error) {
      console.error("Error fetching registered leaderboard:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch registered leaderboard:", error);
    return [];
  }
};

/**
 * Get battle history for the archive page
 * Returns summaries of past battles without detailed participant data
 */
export const getBattleHistory = async (limit: number = 30): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("battle_summaries")
      .select("*")
      .order("battle_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching battle history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch battle history:", error);
    return [];
  }
};

/**
 * Update battle status (in_progress when simulation starts)
 */
export const updateBattleStatus = async (
  status: "registration" | "in_progress" | "completed"
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("daily_battles")
      .update({ status })
      .eq("battle_date", new Date().toISOString().split("T")[0]);

    if (error) {
      console.error("Error updating battle status:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to update battle status:", error);
    return false;
  }
};

/**
 * Clean up old battle data (call this in a daily cron job)
 */
export const performDailyCleanup = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc("cleanup_old_battles");

    if (error) {
      console.error("Error performing daily cleanup:", error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error("Failed to perform daily cleanup:", error);
    return 0;
  }
};

/**
 * Device fingerprinting function
 * Creates a consistent identifier for rate limiting
 */
export const generateDeviceFingerprint = (): string => {
  // This creates a more sophisticated fingerprint than the basic version
  // while still being privacy-friendly
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Create a simple canvas fingerprint
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("The Dot Games fingerprint", 2, 2);
  }

  const canvasData = canvas.toDataURL();

  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvasData.slice(-50), // Last 50 chars of canvas data
    memory: (navigator as any).deviceMemory || "unknown",
    cores: navigator.hardwareConcurrency || "unknown",
  };

  // Create a hash of the fingerprint data
  return btoa(JSON.stringify(fingerprint))
    .replace(/[+/]/g, "")
    .substring(0, 32);
};
