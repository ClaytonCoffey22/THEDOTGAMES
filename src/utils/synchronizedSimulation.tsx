import { DailyParticipant, Dot, SimulationState } from "../types";
import { generateSimulation } from "./simulation";
import { supabase } from "./supabase";

export class SynchronizedBattleEngine {
  private battleDate: string;
  private frameNumber: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(battleDate: string) {
    this.battleDate = battleDate;
  }

  async startSynchronizedBattle(participants: DailyParticipant[]) {
    console.log("Starting synchronized battle for", participants.length, "participants");

    // Create initial simulation state
    const simulationDots: Dot[] = participants.map((participant, index) => ({
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
              type: ["speed", "shield", "teleport", "grow"][Math.floor(Math.random() * 4)] as "speed" | "shield" | "teleport" | "grow",
              duration: 5000 + Math.random() * 10000,
              active: false,
              cooldown: 15000 + Math.random() * 15000,
              lastUsed: 0,
            }
          : null,
    }));

    const initialState: SimulationState = {
      dots: simulationDots,
      eliminationLog: [],
      winner: null,
      inProgress: true,
      lastUpdateTime: Date.now(),
      simulationDate: new Date().toISOString(),
    };

    // Start the simulation and sync to database
    this.isRunning = true;

    await generateSimulation(
      initialState,
      async (state: SimulationState) => {
        if (this.isRunning && this.frameNumber % 30 === 0) {
          // Sync every 30 frames (0.5 seconds)
          await this.syncBattleState(state);
        }
        this.frameNumber++;
      },
      async (winner: Dot) => {
        console.log("Synchronized battle completed, winner:", winner.name);
        await this.completeBattle(winner, initialState);
        this.stop();
      }
    );
  }

  private async syncBattleState(state: SimulationState) {
    try {
      await supabase.rpc("update_live_battle_state", {
        p_battle_date: this.battleDate,
        p_simulation_state: state,
        p_frame_number: this.frameNumber,
      });
    } catch (error) {
      console.error("Failed to sync battle state:", error);
    }
  }

  private async completeBattle(winner: Dot, finalState: SimulationState) {
    try {
      const { error } = await supabase.rpc("complete_battle", {
        p_winner_name: winner.name,
        p_simulation_data: finalState,
        p_duration_seconds: Math.floor((Date.now() - new Date(finalState.simulationDate!).getTime()) / 1000),
      });

      if (error) {
        console.error("Failed to complete battle:", error);
      }
    } catch (error) {
      console.error("Failed to complete battle:", error);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}
