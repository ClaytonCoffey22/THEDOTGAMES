import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import {
  initializeTodaysBattle,
  registerForTodaysBattle,
  getTodaysParticipants,
  completeTodaysBattle,
  updateBattleStatus,
  getRegisteredLeaderboard,
} from "../utils/battleManager";
import { supabase } from "../utils/supabase";
import { generateSimulation } from "../utils/simulation";
import { Dot, SimulationState } from "../types";

interface GameContextType {
  // Authentication state
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Daily battle state
  currentBattle: any | null;
  todaysParticipants: any[];
  canRegisterToday: boolean;
  registrationStatus: "open" | "full" | "closed";

  // Simulation state
  simulationState: SimulationState;
  isSimulationRunning: boolean;

  // Actions
  registerDotForBattle: (
    dotName: string,
    deviceId: string
  ) => Promise<{ success: boolean; message: string }>;
  startTodaysBattle: () => Promise<void>;

  // Leaderboards
  todaysLeaderboard: any[];
  allTimeLeaderboard: any[];

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

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);

  // Daily battle state
  const [currentBattle, setCurrentBattle] = useState<any | null>(null);
  const [todaysParticipants, setTodaysParticipants] = useState<any[]>([]);
  const [canRegisterToday, setCanRegisterToday] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<
    "open" | "full" | "closed"
  >("open");

  // Simulation state
  const [simulationState, setSimulationState] = useState<SimulationState>(
    DEFAULT_SIMULATION_STATE
  );
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  // Leaderboard state
  const [todaysLeaderboard, setTodaysLeaderboard] = useState<any[]>([]);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<any[]>([]);

  // Timing state
  const [nextBattleTime, setNextBattleTime] = useState<Date | null>(null);
  const [timeUntilBattle, setTimeUntilBattle] = useState<string | null>(null);

  // Initialize authentication state
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setUser(session?.user ?? null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Calculate next battle time
  useEffect(() => {
    const calculateNextBattleTime = () => {
      const now = new Date();
      const battleTime = new Date();
      battleTime.setHours(23, 0, 0, 0);

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
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextBattleTime]);

  // Initialize today's battle and load participants
  useEffect(() => {
    const initializeToday = async () => {
      try {
        const battle = await initializeTodaysBattle();
        setCurrentBattle(battle);

        const participants = await getTodaysParticipants();
        setTodaysParticipants(participants);
        setTodaysLeaderboard(participants);

        if (battle) {
          if (battle.status === "completed") {
            setRegistrationStatus("closed");
            setCanRegisterToday(false);
          } else if (battle.current_participants >= battle.max_participants) {
            setRegistrationStatus("full");
            setCanRegisterToday(false);
          } else {
            setRegistrationStatus("open");
            setCanRegisterToday(true);
          }
        }

        const allTime = await getRegisteredLeaderboard();
        setAllTimeLeaderboard(allTime);
      } catch (error) {
        console.error("Failed to initialize today's state:", error);
      }
    };

    initializeToday();
    const interval = setInterval(initializeToday, 30000);
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

  // Start today's battle simulation
  const startTodaysBattle = async (): Promise<void> => {
    if (!currentBattle || todaysParticipants.length < 2) {
      return;
    }

    try {
      await updateBattleStatus("in_progress");
      setIsSimulationRunning(true);

      const simulationDots: Dot[] = todaysParticipants.map(
        (participant, index) => ({
          id: participant.id,
          name: participant.dot_name,
          x: Math.random() * 750 + 25,
          y: Math.random() * 550 + 25,
          size: 8 + Math.random() * 4,
          color: `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
          speed: 1 + Math.random() * 2,
          eliminations: 0,
          power:
            Math.random() > 0.7
              ? {
                  type: ["speed", "shield", "teleport", "grow"][
                    Math.floor(Math.random() * 4)
                  ] as "speed" | "shield" | "teleport" | "grow",
                  duration: 5000 + Math.random() * 10000,
                  active: false,
                  cooldown: 15000 + Math.random() * 15000,
                  lastUsed: 0,
                }
              : null,
        })
      );

      const initialState: SimulationState = {
        dots: simulationDots,
        eliminationLog: [],
        winner: null,
        inProgress: true,
        lastUpdateTime: Date.now(),
        simulationDate: new Date().toISOString(),
      };

      setSimulationState(initialState);

      const startTime = Date.now();

      generateSimulation(
        initialState,
        (state: SimulationState) => {
          setSimulationState(state);
        },
        async (winner: Dot) => {
          const endTime = Date.now();
          const durationSeconds = Math.floor((endTime - startTime) / 1000);

          await completeTodaysBattle(winner.name, initialState, durationSeconds);

          setIsSimulationRunning(false);
          setRegistrationStatus("closed");

          const finalParticipants = await getTodaysParticipants();
          setTodaysParticipants(finalParticipants);
          setTodaysLeaderboard(finalParticipants);

          const allTime = await getRegisteredLeaderboard();
          setAllTimeLeaderboard(allTime);
        }
      );
    } catch (error) {
      console.error("Failed to start battle:", error);
      setIsSimulationRunning(false);
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

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};