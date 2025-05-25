import { supabase } from "./supabase";
import type { BattleRegistration } from "../types";
import { clearDeviceFingerprint } from "./deviceFingerprint";

export async function initializeTodaysBattle() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if a battle already exists for today
    const { data: existingBattle, error: fetchError } = await supabase
      .from('daily_battles')
      .select('*')
      .eq('battle_date', today)
      .maybeSingle();

    if (fetchError) {
      console.error('Failed to fetch battle:', fetchError);
      return null;
    }

    if (existingBattle) {
      return existingBattle;
    }

    // Create a new battle for today
    const { data: newBattle, error } = await supabase
      .from('daily_battles')
      .insert([
        {
          battle_date: today,
          status: 'registration',
          current_participants: 0,
          max_participants: 100
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create battle:', error);
      return null;
    }

    return newBattle;
  } catch (error) {
    console.error('Failed to initialize battle:', error);
    return null;
  }
}

export const registerForTodaysBattle = async (
  dotName: string,
  deviceId: string,
  userId?: string
): Promise<BattleRegistration> => {
  try {
    console.log('Attempting registration with:', { dotName, deviceId, userId });

    const { data: canRegister, error: checkError } = await supabase.rpc(
      "can_register_today",
      { 
        p_device_fingerprint: deviceId,
        p_dot_name: dotName 
      }
    );

    if (checkError) {
      console.error("Error checking registration eligibility:", checkError);
      // Clear device fingerprint on error to allow retry
      clearDeviceFingerprint();
      return {
        success: false,
        message: "Registration system is temporarily unavailable. Please try again in a few minutes.",
      };
    }

    console.log('Registration eligibility check result:', canRegister);

    if (!canRegister) {
      return {
        success: false,
        message: "This device has already registered for today's battle. Please try again tomorrow!",
      };
    }

    const { data: registrationSuccess, error: registerError } = await supabase.rpc(
      "register_for_battle",
      {
        p_dot_name: dotName,
        p_user_id: userId || null,
        p_device_fingerprint: deviceId,
      }
    );

    if (registerError) {
      console.error("Error registering for battle:", registerError);
      return { 
        success: false, 
        message: "Unable to complete registration. Please try again or contact support if the problem persists." 
      };
    }

    if (!registrationSuccess) {
      return {
        success: false,
        message: "Registration failed. The battle might be full or registration is closed.",
      };
    }

    const { data: battleInfo } = await supabase
      .from("daily_battles")
      .select("id, current_participants")
      .eq("battle_date", new Date().toISOString().split("T")[0])
      .single();

    console.log('Registration completed successfully:', battleInfo);

    return {
      success: true,
      message: "Successfully registered for today's battle!",
      battle_id: battleInfo?.id,
      participant_count: battleInfo?.current_participants,
    };
  } catch (error) {
    console.error("Failed to register for battle:", error);
    return { 
      success: false, 
      message: "An unexpected error occurred. Please try again later or contact support." 
    };
  }
};

export const getTodaysParticipants = async () => {
  try {
    const { data, error } = await supabase
      .from('todays_participants')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch participants:', error);
    return [];
  }
};

export const completeTodaysBattle = async (
  winnerName: string,
  simulationData: any,
  durationSeconds: number
) => {
  try {
    const { data, error } = await supabase.rpc('complete_battle', {
      p_winner_name: winnerName,
      p_simulation_data: simulationData,
      p_duration_seconds: durationSeconds
    });

    if (error) {
      console.error('Error completing battle:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to complete battle:', error);
    return false;
  }
};

export const updateBattleStatus = async (status: 'registration' | 'in_progress' | 'completed') => {
  try {
    const { error } = await supabase
      .from('daily_battles')
      .update({ status })
      .eq('battle_date', new Date().toISOString().split('T')[0]);

    if (error) {
      console.error('Error updating battle status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update battle status:', error);
    return false;
  }
};

export const getRegisteredLeaderboard = async () => {
  try {
    const { data, error } = await supabase
      .from('registered_leaderboard')
      .select('*')
      .order('wins', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
};