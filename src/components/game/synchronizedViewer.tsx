import React, { useEffect, useState } from "react";
import { SimulationState } from "../../types";
import { supabase } from "../../utils/supabase";
import BattleArena from "./BattleArena";

interface SynchronizedViewerProps {
  battleDate: string;
  width: number;
  height: number;
}

const SynchronizedViewer: React.FC<SynchronizedViewerProps> = ({ battleDate, width, height }) => {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    // Subscribe to battle updates
    const subscription = supabase
      .channel(`battle-${battleDate}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "daily_battles",
          filter: `battle_date=eq.${battleDate}`,
        },
        (payload) => {
          console.log("Received battle update:", payload);

          if (payload.new.live_simulation_state) {
            setSimulationState(payload.new.live_simulation_state);
          }
        }
      )
      .on("presence", { event: "sync" }, () => {
        const presenceState = subscription.presenceState();
        setViewerCount(Object.keys(presenceState).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track presence for viewer count
          await subscription.track({ user_id: Math.random().toString() });

          // Load current battle state
          const { data } = await supabase
            .from("daily_battles")
            .select("live_simulation_state, status")
            .eq("battle_date", battleDate)
            .single();

          if (data?.live_simulation_state) {
            setSimulationState(data.live_simulation_state);
          }
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [battleDate]);

  // Replace the loading check with:
  if (!simulationState || simulationState.dots.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Waiting for battle to begin...</p>
          {viewerCount > 0 && <p className="text-sm text-gray-500 mt-2">{viewerCount} viewers watching</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <BattleArena width={width} height={height} externalSimulationState={simulationState} />

      {/* Live indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span className="text-white text-sm font-medium">LIVE</span>
      </div>

      {/* Viewer count */}
      {viewerCount > 0 && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 px-3 py-1 rounded-full">
          <span className="text-white text-sm">{viewerCount} watching</span>
        </div>
      )}
    </div>
  );
};

export default SynchronizedViewer;
