// src/utils/battleScheduler.ts
// This handles automatic battle starting at scheduled times

import type { DailyParticipant, Dot } from "../types";
import { SynchronizedBattleManager } from "./BattleSync";
import { supabase } from "./supabase";

interface ScheduledBattle {
  id: string;
  battle_time: string; // Time in HH:MM format
  registration_cutoff_minutes: number;
  minimum_participants: number;
  maximum_participants: number;
}

export class BattleScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private battleManager: SynchronizedBattleManager;
  private isRunning = false;

  constructor() {
    this.battleManager = new SynchronizedBattleManager();
  }

  async start() {
    if (this.isRunning) return;

    console.log("Starting battle scheduler...");
    this.isRunning = true;

    // Initialize battle manager
    await this.battleManager.initialize();

    // Check every minute for scheduled battles
    this.intervalId = setInterval(() => {
      this.checkForScheduledBattles();
    }, 60000); // Check every minute

    // Initial check
    this.checkForScheduledBattles();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.battleManager.cleanup();
    this.isRunning = false;
    console.log("Battle scheduler stopped");
  }

  private async checkForScheduledBattles() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
      const today = now.toISOString().split("T")[0];

      console.log(`Checking for battles at ${currentTime}...`);

      // Get scheduled battles for current time
      const { data: scheduledBattles, error: scheduleError } = await supabase
        .from("game_schedule")
        .select("*")
        .eq("battle_time", currentTime);

      if (scheduleError) {
        console.error("Error fetching battle schedule:", scheduleError);
        return;
      }

      if (!scheduledBattles || scheduledBattles.length === 0) {
        return; // No battles scheduled for this time
      }

      // Check if there's already a battle for today
      const { data: existingBattle, error: battleError } = await supabase
        .from("daily_battles")
        .select("*")
        .eq("battle_date", today)
        .single();

      if (battleError && battleError.code !== "PGRST116") {
        console.error("Error checking existing battle:", battleError);
        return;
      }

      // If battle exists and is not in registration, don't auto-start
      if (existingBattle && existingBattle.status !== "registration") {
        console.log("Battle already in progress or completed for today");
        return;
      }

      // Get participants for today
      const { data: participants, error: participantsError } = await supabase
        .from("daily_participants")
        .select("count(*)")
        .eq("battle_id", existingBattle?.id);

      if (participantsError) {
        console.error("Error counting participants:", participantsError);
        return;
      }

      const participantCount = participants?.[0]?.count || 0;
      const schedule = scheduledBattles[0];

      console.log(`Found ${participantCount} participants for scheduled battle`);

      // Check if we have enough participants
      if (participantCount < schedule.minimum_participants) {
        console.log(`Not enough participants (${participantCount}/${schedule.minimum_participants}). Battle postponed.`);
        return;
      }

      // Start the battle automatically
      console.log("Auto-starting scheduled battle...");
      await this.startScheduledBattle(existingBattle?.id || null, schedule);
    } catch (error) {
      console.error("Error in battle scheduler:", error);
    }
  }

  private async startScheduledBattle(battleId: string | null, schedule: ScheduledBattle) {
    try {
      let currentBattleId = battleId;

      // Create battle if it doesn't exist
      if (!currentBattleId) {
        const { data: newBattle, error: createError } = await supabase
          .from("daily_battles")
          .insert([
            {
              battle_date: new Date().toISOString().split("T")[0],
              status: "registration",
              max_participants: schedule.maximum_participants,
              minimum_participants: schedule.minimum_participants,
              current_participants: 0,
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error("Failed to create battle:", createError);
          return;
        }

        currentBattleId = newBattle.id;
      }

      // Get all participants
      const { data: participants, error: participantsError } = await supabase
        .from("daily_participants")
        .select("*")
        .eq("battle_id", currentBattleId);

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
        return;
      }

      if (!participants || participants.length < schedule.minimum_participants) {
        console.log("Not enough participants to start battle");
        return;
      }

      // Start the battle
      const started = await this.battleManager.startBattle();
      if (started) {
        console.log(`Automatically started battle with ${participants.length} participants`);

        // Trigger the simulation (this would normally be done by the frontend)
        // For server-side automation, you might want to implement the simulation here
        await this.runServerSideSimulation(participants);
      }
    } catch (error) {
      console.error("Error starting scheduled battle:", error);
    }
  }

  private async runServerSideSimulation(participants: DailyParticipant[]) {
    // This is a simplified server-side simulation
    // In a real implementation, you might want to run the full simulation logic
    try {
      console.log("Running server-side simulation...");

      // Simulate a battle duration
      const battleDuration = 30000 + Math.random() * 60000; // 30-90 seconds

      setTimeout(async () => {
        // Pick a random winner
        const winner = participants[Math.floor(Math.random() * participants.length)];
        const eliminations = Math.floor(Math.random() * participants.length);

        console.log(`Simulation complete. Winner: ${winner.dot_name}`);

        // Create mock simulation data with proper Dot type
        const winnerDot: Dot = {
          id: winner.id,
          name: winner.dot_name,
          eliminations,
          x: Math.random() * 800,
          y: Math.random() * 600,
          size: 20,
          color: "#FF0000",
          speed: 1,
          power: null,
        };

        const simulationData = {
          dots: participants.map((p) => ({
            id: p.id,
            name: p.dot_name,
            x: Math.random() * 800,
            y: Math.random() * 600,
            size: 10 + Math.random() * 10,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            speed: 1,
            eliminations: p.dot_name === winner.dot_name ? eliminations : Math.floor(Math.random() * 3),
            power: null,
          })),
          winner: winnerDot,
          eliminationLog: [],
          inProgress: false,
          lastUpdateTime: Date.now(),
          simulationDate: new Date().toISOString(),
        };

        // Complete the battle
        await this.battleManager.completeBattle(winnerDot, simulationData, Math.floor(battleDuration / 1000));
      }, battleDuration);
    } catch (error) {
      console.error("Error in server-side simulation:", error);
    }
  }
}

// Export a singleton instance
export const battleScheduler = new BattleScheduler();

// Auto-start the scheduler when this module is imported
// You might want to only do this in production or when a specific flag is set
if (typeof window !== "undefined") {
  // Only run in browser environment
  battleScheduler.start();

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    battleScheduler.stop();
  });
}
