// Update the registerForTodaysBattle function signature
export const registerForTodaysBattle = async (
  dotName: string,
  deviceId: string,
  userId?: string
): Promise<BattleRegistration> => {
  try {
    const { data: canRegister, error: checkError } = await supabase.rpc(
      "can_register_today",
      { 
        p_device_fingerprint: deviceId,
        p_dot_name: dotName 
      }
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
        message: "This device has already registered for today's battle",
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
      return { success: false, message: "Registration failed" };
    }

    if (!registrationSuccess) {
      return {
        success: false,
        message: "Registration failed - possibly full or already registered",
      };
    }

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