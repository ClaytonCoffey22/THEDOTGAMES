// src/utils/battleSync.ts
// This ensures all users see the same battle state at the same time

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Dot, SimulationState } from "../types";
import { supabase } from "./supabase";

interface BattleState {
  id: string;
  status: "registration" | "in_progress" | "completed";
  simulation_data?: SimulationState;
  winner_dot_name?: string;
  battle_duration_seconds?: number;
  completed_at?: string;
  battle_start_time?: string;
}

export class SynchronizedBattleManager {
  private battleId: string | null = null;
  private isSubscribed = false;
  private onStateChange?: (state: BattleState) => void;
  private subscription: RealtimeChannel | null = null;

  constructor(onStateChange?: (state: BattleState) => void) {
    this.onStateChange = onStateChange;
  }

  async initialize(): Promise<BattleState | null> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: battle, error } = await supabase.from("daily_battles").select("*").eq("battle_date", today).single();

      if (error) {
        console.error("Failed to get battle state:", error);
        return null;
      }

      this.battleId = battle.id;
      this.subscribeToChanges();

      return {
        id: battle.id,
        status: battle.status,
        simulation_data: battle.simulation_data as SimulationState,
        winner_dot_name: battle.winner_dot_name,
        battle_duration_seconds: battle.battle_duration_seconds,
        completed_at: battle.completed_at,
        battle_start_time: battle.battle_start_time,
      };
    } catch (error) {
      console.error("Failed to initialize battle manager:", error);
      return null;
    }
  }

  private subscribeToChanges() {
    if (this.isSubscribed || !this.battleId) return;

    this.subscription = supabase
      .channel("battle-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "daily_battles",
          filter: `id=eq.${this.battleId}`,
        },
        (payload) => {
          console.log("Battle state changed:", payload.new);
          if (this.onStateChange) {
            this.onStateChange({
              id: payload.new.id,
              status: payload.new.status,
              simulation_data: payload.new.simulation_data as SimulationState,
              winner_dot_name: payload.new.winner_dot_name,
              battle_duration_seconds: payload.new.battle_duration_seconds,
              completed_at: payload.new.completed_at,
              battle_start_time: payload.new.battle_start_time,
            });
          }
        }
      )
      .subscribe();

    this.isSubscribed = true;
  }

  async startBattle(): Promise<boolean> {
    if (!this.battleId) return false;

    try {
      // Update battle to in_progress and set start time
      const { error } = await supabase
        .from("daily_battles")
        .update({
          status: "in_progress",
          battle_start_time: new Date().toISOString(),
        })
        .eq("id", this.battleId);

      if (error) {
        console.error("Failed to start battle:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to start battle:", error);
      return false;
    }
  }

  async updateSimulationData(simulationData: SimulationState): Promise<boolean> {
    if (!this.battleId) return false;

    try {
      const { error } = await supabase
        .from("daily_battles")
        .update({
          simulation_data: simulationData,
        })
        .eq("id", this.battleId);

      if (error) {
        console.error("Failed to update simulation data:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to update simulation data:", error);
      return false;
    }
  }

  async completeBattle(winner: Dot, simulationData: SimulationState, durationSeconds: number): Promise<boolean> {
    if (!this.battleId) return false;

    try {
      const { error } = await supabase.rpc("complete_battle", {
        p_winner_name: winner.name,
        p_simulation_data: simulationData,
        p_duration_seconds: durationSeconds,
      });

      if (error) {
        console.error("Failed to complete battle:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to complete battle:", error);
      return false;
    }
  }

  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.isSubscribed = false;
  }
}

// Create a single instance that can be shared across components
export const battleManager = new SynchronizedBattleManager();
