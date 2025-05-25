import type { BattleRegistration, DailyBattle, DailyParticipant } from "../types";
import { supabase } from "./supabase";

export async function initializeTodaysBattle(): Promise<DailyBattle | null> {
  try {
    const today = new Date().toISOString().split("T")[0];

    console.log("Initializing battle for date:", today);

    // Check if a battle already exists for today
    const { data: existingBattle, error: fetchError } = await supabase
      .from("daily_battles")
      .select("*")
      .eq("battle_date", today)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to fetch battle:", fetchError);
      return null;
    }

    if (existingBattle) {
      console.log("Found existing battle:", existingBattle);
      return existingBattle;
    }

    // Get current battle settings to store with the battle
    const { data: battleSettings } = await supabase.rpc("get_battle_settings");

    // Create a new battle for today with current settings
    const { data: newBattle, error } = await supabase
      .from("daily_battles")
      .insert([
        {
          battle_date: today,
          status: "registration",
          current_participants: 0,
          max_participants: 100,
          minimum_participants: 2,
          battle_settings: battleSettings, // Store settings snapshot
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Failed to create battle:", error);
      return null;
    }

    console.log("Created new battle with settings:", newBattle);
    return newBattle;
  } catch (error) {
    console.error("Failed to initialize battle:", error);
    return null;
  }
}

export const registerForTodaysBattle = async (dotName: string, deviceId: string, userId?: string): Promise<BattleRegistration> => {
  try {
    console.log("Attempting registration with:", { dotName, deviceId, userId });

    // Clean the dot name - ensure it starts with "Dot_"
    const cleanDotName = dotName.startsWith("Dot_") ? dotName : `Dot_${dotName}`;

    // Validate dot name format
    if (!/^Dot_[a-zA-Z0-9_]{1,20}$/.test(cleanDotName)) {
      return {
        success: false,
        message: "Dot name must contain only letters, numbers, and underscores, and be 20 characters or less.",
      };
    }

    // First, ensure today's battle exists
    const battle = await initializeTodaysBattle();
    if (!battle) {
      return {
        success: false,
        message: "Unable to initialize today's battle. Please try again later.",
      };
    }

    // Check if battle is in registration status
    if (battle.status !== "registration") {
      return {
        success: false,
        message:
          battle.status === "in_progress"
            ? "Registration is closed - battle is currently in progress!"
            : "Registration is closed - today's battle has ended.",
      };
    }

    // Check if battle is full
    const currentParticipants = battle.current_participants || 0;
    const maxParticipants = battle.max_participants || 100;

    if (currentParticipants >= maxParticipants) {
      return {
        success: false,
        message: "Today's battle is full! Please try again tomorrow.",
      };
    }

    console.log("Checking registration eligibility...");

    // Check if registration is allowed using our database function
    const { data: canRegister, error: checkError } = await supabase.rpc("can_register_today", {
      p_device_fingerprint: deviceId,
      p_dot_name: cleanDotName,
    });

    if (checkError) {
      console.error("Error checking registration eligibility:", checkError);

      if (checkError.code === "42883") {
        return {
          success: false,
          message: "Registration system is being set up. Please try again in a few minutes.",
        };
      }

      return {
        success: false,
        message: "Registration system is temporarily unavailable. Please try again in a few minutes.",
      };
    }

    console.log("Registration eligibility check result:", canRegister);

    if (!canRegister) {
      return {
        success: false,
        message: "Unable to register. This device may have already registered today, or this dot name is already taken.",
      };
    }

    console.log("Attempting to register...");

    // Attempt registration using our database function
    const { data: registrationSuccess, error: registerError } = await supabase.rpc("register_for_battle", {
      p_dot_name: cleanDotName,
      p_device_fingerprint: deviceId,
      p_user_id: userId || null,
    });

    if (registerError) {
      console.error("Error registering for battle:", registerError);

      if (registerError.code === "23505") {
        return {
          success: false,
          message: "This dot name is already taken for today's battle.",
        };
      }

      return {
        success: false,
        message: "Unable to complete registration. Please try again or contact support if the problem persists.",
      };
    }

    if (!registrationSuccess) {
      return {
        success: false,
        message: "Registration failed. The battle might be full or registration is closed.",
      };
    }

    // Get updated battle info
    const { data: battleInfo } = await supabase
      .from("daily_battles")
      .select("id, current_participants")
      .eq("battle_date", new Date().toISOString().split("T")[0])
      .single();

    console.log("Registration completed successfully:", battleInfo);

    return {
      success: true,
      message: `Successfully registered ${cleanDotName} for today's battle!`,
      battle_id: battleInfo?.id,
      participant_count: battleInfo?.current_participants,
    };
  } catch (error) {
    console.error("Failed to register for battle:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    };
  }
};

export const getTodaysParticipants = async (): Promise<DailyParticipant[]> => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_participants")
      .select(
        `
        *,
        daily_battles!inner(battle_date)
      `
      )
      .eq("daily_battles.battle_date", today)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching participants:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch participants:", error);
    return [];
  }
};

export const completeTodaysBattle = async (winnerName: string, simulationData: unknown, durationSeconds: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("complete_battle", {
      p_winner_name: winnerName,
      p_simulation_data: simulationData,
      p_duration_seconds: durationSeconds,
    });

    if (error) {
      console.error("Error completing battle:", error);
      return false;
    }

    return data || true;
  } catch (error) {
    console.error("Failed to complete battle:", error);
    return false;
  }
};

export const updateBattleStatus = async (status: "registration" | "in_progress" | "completed"): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("daily_battles").update({ status }).eq("battle_date", today);

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

export const getRegisteredLeaderboard = async () => {
  try {
    const { data, error } = await supabase.from("registered_leaderboard").select("*").order("wins", { ascending: false }).limit(100);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
};

// Helper function to get battle schedule
export const getBattleSchedule = async () => {
  try {
    const { data, error } = await supabase.from("game_schedule").select("*").order("battle_time", { ascending: true });

    if (error) {
      console.error("Error fetching battle schedule:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch battle schedule:", error);
    return [];
  }
};

// New function to get current battle settings
export const getCurrentBattleSettings = async () => {
  try {
    const { data, error } = await supabase.rpc("get_battle_settings");

    if (error) {
      console.error("Error fetching battle settings:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch battle settings:", error);
    return null;
  }
};

// Debug function to check what's in the database
export const debugDatabaseState = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];

    console.log("=== DEBUG: Database State ===");

    // Check battles
    const { data: battles } = await supabase.from("daily_battles").select("*").eq("battle_date", today);
    console.log("Today's battles:", battles);

    // Check participants
    const { data: participants } = await supabase.from("daily_participants").select("*");
    console.log("All participants:", participants);

    // Check battle settings
    const settings = await getCurrentBattleSettings();
    console.log("Current battle settings:", settings);

    console.log("=== END DEBUG ===");
  } catch (error) {
    console.error("Debug failed:", error);
  }
};
