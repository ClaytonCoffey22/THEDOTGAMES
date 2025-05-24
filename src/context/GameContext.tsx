// Update the registerDotForBattle function signature in GameContextType
interface GameContextType {
  // ... other properties
  registerDotForBattle: (
    dotName: string,
    deviceId: string
  ) => Promise<{ success: boolean; message: string }>;
  // ... other properties
}

// Update the implementation in GameProvider
const registerDotForBattle = async (
  dotName: string,
  deviceId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const result = await registerForTodaysBattle(dotName, deviceId, user?.id);

    if (result.success) {
      const participants = await getTodaysParticipants();
      setTodaysParticipants(participants);
      setTodaysLeaderboard(participants);

      if (result.participant_count !== undefined) {
        setCurrentBattle((prevBattle: any) =>
          prevBattle
            ? {
                ...prevBattle,
                current_participants: result.participant_count,
              }
            : null
        );
      }

      setCanRegisterToday(false);
    }

    return result;
  } catch (error) {
    console.error("Registration failed:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
};