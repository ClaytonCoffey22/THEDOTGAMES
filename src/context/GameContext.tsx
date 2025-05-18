import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import {
  initializeTodaysBattle,
  registerForTodaysBattle,
  getTodaysParticipants,
  completeTodaysBattle,
  updateBattleStatus,
  generateDeviceFingerprint,
  getRegisteredLeaderboard,
} from "../utils/battleManager";
import { supabase } from "../utils/supabase";
import { generateSimulation } from "../utils/simulation";
import { Dot, SimulationState } from "../types";

// Enhanced context types for the daily battle system
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

  // Simulation state (still used for live visualization)
  simulationState: SimulationState;
  isSimulationRunning: boolean;

  // Actions
  registerDotForBattle: (
    dotName: string
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

  // Simulation state (for live battle visualization)
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

  // Device fingerprint for rate limiting
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");

  // Initialize authentication state and device fingerprint
  useEffect(() => {
    // Generate device fingerprint once on load
    setDeviceFingerprint(generateDeviceFingerprint());

    // Check current auth session
    // We properly type the destructured session here
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setUser(session?.user ?? null);
      });

    // Listen for auth changes
    // We properly type the callback parameters
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Calculate next battle time (always 11 PM ET)
  useEffect(() => {
    const calculateNextBattleTime = () => {
      const now = new Date();
      const battleTime = new Date();

      // Set to 11 PM ET (23:00)
      battleTime.setHours(23, 0, 0, 0);

      // If it's past 11 PM today, set for tomorrow
      if (now > battleTime) {
        battleTime.setDate(battleTime.getDate() + 1);
      }

      setNextBattleTime(battleTime);
    };

    calculateNextBattleTime();

    // Update every minute
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
        // Initialize today's battle
        const battle = await initializeTodaysBattle();
        setCurrentBattle(battle);

        // Load today's participants
        const participants = await getTodaysParticipants();
        setTodaysParticipants(participants);
        setTodaysLeaderboard(participants);

        // Update registration status
        if (battle) {
          if (battle.status === "completed") {
            setRegistrationStatus("closed");
            setCanRegisterToday(false);
          } else if (battle.current_participants >= battle.max_participants) {
            setRegistrationStatus("full");
            setCanRegisterToday(false);
          } else {
            setRegistrationStatus("open");
            // For now, we'll let the backend handle device checking
            // Since device fingerprint checking is complex to implement client-side
            setCanRegisterToday(true);
          }
        }

        // Load all-time leaderboard
        const allTime = await getRegisteredLeaderboard();
        setAllTimeLeaderboard(allTime);
      } catch (error) {
        console.error("Failed to initialize today's state:", error);
      }
    };

    initializeToday();

    // Refresh every 30 seconds to keep data current
    const interval = setInterval(initializeToday, 30000);
    return () => clearInterval(interval);
  }, [deviceFingerprint]);

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
    dotName: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await registerForTodaysBattle(
        dotName,
        deviceFingerprint,
        user?.id
      );

      if (result.success) {
        // Refresh today's participants to show the new dot
        const participants = await getTodaysParticipants();
        setTodaysParticipants(participants);
        setTodaysLeaderboard(participants);

        // Update current battle info
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

        // Update registration availability
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
      // Update battle status to in-progress
      await updateBattleStatus("in_progress");
      setIsSimulationRunning(true);

      // Convert participants to simulation dots
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

      // Set up initial simulation state
      const initialState: SimulationState = {
        dots: simulationDots,
        eliminationLog: [],
        winner: null,
        inProgress: true,
        lastUpdateTime: Date.now(),
        simulationDate: new Date().toISOString(),
      };

      setSimulationState(initialState);

      // Start the simulation
      const startTime = Date.now();

      generateSimulation(
        initialState,
        // On update callback
        (state: SimulationState) => {
          setSimulationState(state);
        },
        // On complete callback
        async (winner: Dot) => {
          const endTime = Date.now();
          const durationSeconds = Math.floor((endTime - startTime) / 1000);

          // Complete the battle in the database
          await completeTodaysBattle(
            winner.name,
            initialState,
            durationSeconds
          );

          // Update local state
          setIsSimulationRunning(false);
          setRegistrationStatus("closed");

          // Refresh participants to show final results
          const finalParticipants = await getTodaysParticipants();
          setTodaysParticipants(finalParticipants);
          setTodaysLeaderboard(finalParticipants);

          // Refresh leaderboards
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
    // Authentication
    user,
    signInWithGoogle,
    signOut,

    // Daily battle state
    currentBattle,
    todaysParticipants,
    canRegisterToday,
    registrationStatus,

    // Simulation state
    simulationState,
    isSimulationRunning,

    // Actions
    registerDotForBattle,
    startTodaysBattle,

    // Leaderboards
    todaysLeaderboard,
    allTimeLeaderboard,

    // Timing
    nextBattleTime,
    timeUntilBattle,
  };

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};
