import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { BattleRegistration, DailyBattle, RegisteredLeaderboardEntry, SimulationState, TodaysParticipant } from "../types";
import {
  getRegisteredLeaderboard,
  getTodaysParticipants,
  initializeTodaysBattle,
  registerForTodaysBattle,
  updateBattleStatus,
} from "../utils/battleManager";
import { SynchronizedBattleManager } from "../utils/BattleSync";
import { supabase } from "../utils/supabase";
import { SynchronizedBattleEngine } from "../utils/synchronizedSimulation";

interface GameContextType {
  // Authentication state
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Daily battle state
  currentBattle: DailyBattle | null;
  todaysParticipants: TodaysParticipant[];
  canRegisterToday: boolean;
  registrationStatus: "registration" | "in_progress" | "completed";

  // Simulation state
  simulationState: SimulationState;
  isSimulationRunning: boolean;

  // Actions
  registerDotForBattle: (dotName: string, deviceId: string) => Promise<BattleRegistration>;
  startTodaysBattle: () => Promise<void>;

  // Leaderboards
  todaysLeaderboard: TodaysParticipant[];
  allTimeLeaderboard: RegisteredLeaderboardEntry[];

  // Timing
  nextBattleTime: Date | null;
  timeUntilBattle: string | null;
}

const DEFAULT_SIMULATION_STATE: SimulationState = {
  dots: [],
  eliminationLog: [],
  winner: null,
  inProgress: false,
  lastUpdateTime: null,
  simulationDate: null,
};

const GameContext = createContext<GameContextType>({} as GameContextType);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);

  // Daily battle state
  const [currentBattle, setCurrentBattle] = useState<DailyBattle | null>(null);
  const [todaysParticipants, setTodaysParticipants] = useState<TodaysParticipant[]>([]);
  const [canRegisterToday, setCanRegisterToday] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<"registration" | "in_progress" | "completed">("registration");

  // Simulation state
  const [simulationState, setSimulationState] = useState<SimulationState>(DEFAULT_SIMULATION_STATE);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  // Leaderboard state
  const [todaysLeaderboard, setTodaysLeaderboard] = useState<TodaysParticipant[]>([]);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<RegisteredLeaderboardEntry[]>([]);

  // Timing state
  const [nextBattleTime, setNextBattleTime] = useState<Date | null>(null);
  const [timeUntilBattle, setTimeUntilBattle] = useState<string | null>(null);

  // Battle synchronization
  const [battleManager] = useState(
    () =>
      new SynchronizedBattleManager((state) => {
        console.log("Battle state synchronized:", state);

        // Update local state based on synchronized battle state
        if (state.status === "in_progress" && !isSimulationRunning && state.simulation_data) {
          // Start watching the synchronized simulation
          setSimulationState(state.simulation_data);
          setIsSimulationRunning(true);
          setRegistrationStatus("in_progress");
        } else if (state.status === "completed") {
          setIsSimulationRunning(false);
          setRegistrationStatus("completed");
          if (state.simulation_data) {
            setSimulationState({
              ...state.simulation_data,
              inProgress: false,
            });
          }
          // Refresh participants and leaderboard
          refreshData();
        }

        setRegistrationStatus(state.status);
      })
  );

  // Initialize authentication state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize battle manager
  useEffect(() => {
    const initBattleManager = async () => {
      const battleState = await battleManager.initialize();
      if (battleState) {
        setRegistrationStatus(battleState.status);
        if (battleState.simulation_data) {
          setSimulationState(battleState.simulation_data);
        }
        if (battleState.status === "in_progress") {
          setIsSimulationRunning(true);
        }
      }
    };

    initBattleManager();

    return () => {
      battleManager.cleanup();
    };
  }, [battleManager]);

  // Calculate next battle time (11 PM ET)
  useEffect(() => {
    const calculateNextBattleTime = () => {
      const now = new Date();
      const battleTime = new Date();

      // Set to 11 PM ET (23:00)
      battleTime.setHours(23, 0, 0, 0);

      // If it's already past 11 PM today, set for tomorrow
      if (now > battleTime) {
        battleTime.setDate(battleTime.getDate() + 1);
      }

      setNextBattleTime(battleTime);
    };

    calculateNextBattleTime();
    const interval = setInterval(calculateNextBattleTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!nextBattleTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = nextBattleTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilBattle("Starting soon!");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilBattle(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextBattleTime]);

  // Initialize today's battle and load participants
  const refreshData = async () => {
    try {
      const battle = await initializeTodaysBattle();
      setCurrentBattle(battle);

      const participants = await getTodaysParticipants();
      // Convert DailyParticipant[] to TodaysParticipant[] format
      const todaysParticipantsFormatted: TodaysParticipant[] = participants.map((p) => ({
        id: p.id,
        dot_name: p.dot_name,
        user_id: p.user_id,
        eliminations: p.eliminations,
        placement: p.placement,
        display_name: p.dot_name, // Use dot_name as display_name for now
        is_registered: p.user_id !== null,
        created_at: p.created_at,
      }));

      setTodaysParticipants(todaysParticipantsFormatted);
      setTodaysLeaderboard(todaysParticipantsFormatted);

      if (battle) {
        const currentParticipants = battle.current_participants ?? 0;
        const maxParticipants = battle.max_participants ?? 100;

        if (battle.status === "completed") {
          setRegistrationStatus("completed");
          setCanRegisterToday(false);
        } else if (currentParticipants >= maxParticipants) {
          setRegistrationStatus(battle.status);
          setCanRegisterToday(false);
        } else {
          setRegistrationStatus(battle.status);
          setCanRegisterToday(battle.status === "registration");
        }
      }

      const allTime = await getRegisteredLeaderboard();
      setAllTimeLeaderboard(allTime);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  };

  useEffect(() => {
    refreshData();
    // Refresh data every 30 seconds to stay in sync
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Authentication functions
  const signInWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error("Sign in error:", error);
        alert("Failed to sign in with Google");
      }
    } catch (error) {
      console.error("Sign in failed:", error);
      alert("An error occurred during sign in");
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  // Register a new dot for today's battle
  const registerDotForBattle = async (dotName: string, deviceId: string): Promise<BattleRegistration> => {
    try {
      const result = await registerForTodaysBattle(dotName, deviceId, user?.id);

      if (result.success) {
        // Refresh data to get updated participant list
        await refreshData();
      }

      return result;
    } catch (error) {
      console.error("Registration failed:", error);
      return { success: false, message: "An unexpected error occurred" };
    }
  };

  // Start today's battle simulation - synchronized across all users
  const startTodaysBattle = async (): Promise<void> => {
    console.log("Admin starting battle...");

    if (!currentBattle || todaysParticipants.length < 2) {
      console.log("Cannot start battle: insufficient participants");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      // Update battle status
      await updateBattleStatus("in_progress");

      // Get the raw DailyParticipant data for the battle engine
      const participants = await getTodaysParticipants();

      // Start synchronized battle
      const battleEngine = new SynchronizedBattleEngine(today);
      await battleEngine.startSynchronizedBattle(participants);

      setRegistrationStatus("in_progress");
    } catch (error) {
      console.error("Failed to start battle:", error);
    }
  };

  const contextValue: GameContextType = {
    user,
    signInWithGoogle,
    signOut,
    currentBattle,
    todaysParticipants,
    canRegisterToday,
    registrationStatus,
    simulationState,
    isSimulationRunning,
    registerDotForBattle,
    startTodaysBattle,
    todaysLeaderboard,
    allTimeLeaderboard,
    nextBattleTime,
    timeUntilBattle,
  };

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
};
