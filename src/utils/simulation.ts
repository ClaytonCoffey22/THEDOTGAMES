import { Dot, EliminationEvent, SimulationState } from "../types";
import { supabase } from "./supabase";

interface BattleConfig {
  intensity: string;
  duration: string;
  powerFrequency: string;
  aggressionMultiplier: number;
  speedMultiplier: number;
  powerChance: number;
  battleDurationMinutes: number;
  arenaShrinksAt: number;
}

const DEFAULT_CONFIG: BattleConfig = {
  intensity: "normal",
  duration: "normal",
  powerFrequency: "normal",
  aggressionMultiplier: 1.0,
  speedMultiplier: 1.0,
  powerChance: 0.5,
  battleDurationMinutes: 2,
  arenaShrinksAt: 0.7,
};

// Load battle configuration from database
async function loadBattleConfig(): Promise<BattleConfig> {
  try {
    const { data, error } = await supabase.rpc("get_battle_settings");

    if (error) {
      console.error("Error loading battle config:", error);
      return DEFAULT_CONFIG;
    }

    return data || DEFAULT_CONFIG;
  } catch (error) {
    console.error("Failed to load battle config:", error);
    return DEFAULT_CONFIG;
  }
}

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;

interface DotVelocity {
  vx: number;
  vy: number;
}

interface DotPersonality {
  aggression: number;
  cowardice: number;
  packHunter: boolean;
  berserker: boolean;
  targetId?: string;
  fleeingFrom?: string;
}

const dotVelocities = new Map<string, DotVelocity>();
const dotPersonalities = new Map<string, DotPersonality>();

enum BattlePhase {
  EARLY = "early",
  MIDDLE = "middle",
  LATE = "late",
  FINAL = "final",
}

function getBattlePhase(elapsedTime: number, totalDuration: number): BattlePhase {
  const progress = elapsedTime / totalDuration;
  if (progress < 0.3) return BattlePhase.EARLY;
  if (progress < 0.7) return BattlePhase.MIDDLE;
  if (progress < 0.9) return BattlePhase.LATE;
  return BattlePhase.FINAL;
}

function getArenaSize(phase: BattlePhase, elapsedTime: number, totalDuration: number, config: BattleConfig) {
  const progress = elapsedTime / totalDuration;
  let shrinkFactor = 1;

  // Use config-defined shrink start point
  if (progress > config.arenaShrinksAt) {
    const shrinkProgress = (progress - config.arenaShrinksAt) / (1 - config.arenaShrinksAt);

    switch (phase) {
      case BattlePhase.LATE:
        shrinkFactor = 1 - shrinkProgress * 0.3; // Shrink to 70%
        break;
      case BattlePhase.FINAL:
        shrinkFactor = 0.5 + (1 - shrinkProgress) * 0.2; // Down to 50%
        break;
    }
  }

  return {
    width: ARENA_WIDTH * shrinkFactor,
    height: ARENA_HEIGHT * shrinkFactor,
    centerX: ARENA_WIDTH / 2,
    centerY: ARENA_HEIGHT / 2,
  };
}

function initializeDotPersonality(_dot: Dot, config: BattleConfig): DotPersonality {
  const random = Math.random;
  const baseAggression = 0.3 + random() * 0.7;

  return {
    aggression: baseAggression * config.aggressionMultiplier,
    cowardice: random() * 0.6,
    packHunter: random() < 0.4,
    berserker: false,
    targetId: undefined,
    fleeingFrom: undefined,
  };
}

function findBestTarget(hunter: Dot, allDots: Dot[], personality: DotPersonality): Dot | null {
  const validTargets = allDots.filter((target) => {
    if (target.id === hunter.id) return false;
    const sizeAdvantage = hunter.size - target.size;
    return sizeAdvantage >= 2;
  });

  if (validTargets.length === 0) return null;

  validTargets.sort((a, b) => {
    const distA = Math.sqrt((a.x - hunter.x) ** 2 + (a.y - hunter.y) ** 2);
    const distB = Math.sqrt((b.x - hunter.x) ** 2 + (b.y - hunter.y) ** 2);

    if (personality.packHunter) {
      const aIsTargeted = Array.from(dotPersonalities.values()).filter((p) => p.targetId === a.id).length;
      const bIsTargeted = Array.from(dotPersonalities.values()).filter((p) => p.targetId === b.id).length;

      if (aIsTargeted !== bIsTargeted) {
        return bIsTargeted - aIsTargeted;
      }
    }

    return distA - distB;
  });

  return validTargets[0];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function shouldFlee(dot: Dot, allDots: Dot[], _personality: DotPersonality): Dot | null {
  const threats = allDots.filter((other) => {
    if (other.id === dot.id) return false;
    const sizeAdvantage = other.size - dot.size;
    const distance = Math.sqrt((other.x - dot.x) ** 2 + (other.y - dot.y) ** 2);

    return sizeAdvantage >= 3 && distance < 100;
  });

  if (threats.length === 0) return null;

  threats.sort((a, b) => {
    const distA = Math.sqrt((a.x - dot.x) ** 2 + (a.y - dot.y) ** 2);
    const distB = Math.sqrt((b.x - dot.x) ** 2 + (b.y - dot.y) ** 2);
    const sizeA = a.size - dot.size;
    const sizeB = b.size - dot.size;

    return distA - sizeA * 10 - (distB - sizeB * 10);
  });

  return threats[0];
}

export const generateSimulation = async (
  initialState: SimulationState,
  onUpdate: (state: SimulationState) => void,
  onComplete: (winner: Dot) => void
) => {
  // Load battle configuration from database
  const config = await loadBattleConfig();
  console.log("Using battle config:", config);

  const state = { ...initialState };
  let lastFrameTime = performance.now();
  let animationFrameId: number;
  const startTime = Date.now();

  // Calculate match duration based on config
  const baseDuration = config.battleDurationMinutes * 60 * 1000; // Convert to milliseconds
  const participantFactor = Math.max(0.5, Math.min(2, state.dots.length / 20));
  const matchDuration = baseDuration * participantFactor;

  console.log(`Battle duration: ${matchDuration / 1000}s for ${state.dots.length} participants`);

  // Initialize personalities and velocities with config
  state.dots.forEach((dot) => {
    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = 2 + Math.random() * 6; // 2-8 base speed
    const speed = baseSpeed * config.speedMultiplier;

    dotVelocities.set(dot.id, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });

    dotPersonalities.set(dot.id, initializeDotPersonality(dot, config));

    // Apply power chance from config
    if (Math.random() < config.powerChance) {
      dot.power = {
        type: ["speed", "shield", "teleport", "grow"][Math.floor(Math.random() * 4)] as "speed" | "shield" | "teleport" | "grow",
        duration: 3000 + Math.random() * 5000,
        active: false,
        cooldown: 8000 + Math.random() * 7000,
        lastUsed: 0,
      };
    }
  });

  const update = (currentTime: number) => {
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    const elapsedTime = Date.now() - startTime;
    state.lastUpdateTime = Date.now();

    const battlePhase = getBattlePhase(elapsedTime, matchDuration);
    const arena = getArenaSize(battlePhase, elapsedTime, matchDuration, config);

    // End battle if time limit reached or only one dot left
    if (elapsedTime >= matchDuration || state.dots.length <= 1) {
      if (!state.winner && state.dots.length > 0) {
        state.winner = state.dots.reduce((largest, current) => (current.size > largest.size ? current : largest));
        state.inProgress = false;
      }
      onUpdate({ ...state });
      if (state.winner) {
        onComplete(state.winner);
      }
      return;
    }

    // Phase-based modifiers enhanced by config
    let phaseAggressionMultiplier = config.aggressionMultiplier;
    let phaseSpeedMultiplier = config.speedMultiplier;

    switch (battlePhase) {
      case BattlePhase.MIDDLE:
        phaseAggressionMultiplier *= 1.3;
        phaseSpeedMultiplier *= 1.1;
        break;
      case BattlePhase.LATE:
        phaseAggressionMultiplier *= 1.6;
        phaseSpeedMultiplier *= 1.3;
        break;
      case BattlePhase.FINAL:
        phaseAggressionMultiplier *= 2.0;
        phaseSpeedMultiplier *= 1.5;
        // All dots become berserkers in final phase
        dotPersonalities.forEach((personality) => {
          personality.berserker = true;
          personality.aggression = Math.min(1, personality.aggression * 1.5);
        });
        break;
    }

    // Enhanced power activation chance based on config
    const basePowerChance = 0.05 * (config.powerChance / 0.5); // Scale based on config

    state.dots.forEach((dot) => {
      const personality = dotPersonalities.get(dot.id);
      const velocity = dotVelocities.get(dot.id);
      if (!personality || !velocity) return;

      // Power activation with config-based frequency
      const powerChance = basePowerChance * phaseAggressionMultiplier;
      if (
        dot.power &&
        !dot.power.active &&
        currentTime - dot.power.lastUsed >= dot.power.cooldown &&
        Math.random() < powerChance * deltaTime
      ) {
        dot.power.active = true;
        dot.power.lastUsed = currentTime;
        setTimeout(() => {
          if (dot.power) {
            dot.power.active = false;
          }
        }, dot.power.duration);
      }

      // Behavior logic (same as before but with config multipliers)
      let targetDot: Dot | null = null;
      let fleeDot: Dot | null = null;

      if (!personality.berserker && Math.random() < personality.cowardice) {
        fleeDot = shouldFlee(dot, state.dots, personality);
        personality.fleeingFrom = fleeDot?.id;
      }

      if (!fleeDot && Math.random() < personality.aggression * phaseAggressionMultiplier) {
        targetDot = findBestTarget(dot, state.dots, personality);
        personality.targetId = targetDot?.id;
      }

      // Apply movement based on behavior
      let targetX = dot.x;
      let targetY = dot.y;
      let behaviorSpeedMultiplier = 1;

      if (fleeDot) {
        const dx = dot.x - fleeDot.x;
        const dy = dot.y - fleeDot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          targetX = dot.x + (dx / distance) * 100;
          targetY = dot.y + (dy / distance) * 100;
          behaviorSpeedMultiplier = 1.5;
        }
      } else if (targetDot) {
        targetX = targetDot.x;
        targetY = targetDot.y;
        behaviorSpeedMultiplier = personality.berserker ? 2.0 : 1.3;
      } else {
        if (battlePhase === BattlePhase.LATE || battlePhase === BattlePhase.FINAL) {
          const centerPull = 0.3;
          targetX = dot.x + (arena.centerX - dot.x) * centerPull + (Math.random() - 0.5) * 100;
          targetY = dot.y + (arena.centerY - dot.y) * centerPull + (Math.random() - 0.5) * 100;
        } else {
          targetX = dot.x + (Math.random() - 0.5) * 150;
          targetY = dot.y + (Math.random() - 0.5) * 150;
        }
      }

      // Apply movement
      const dx = targetX - dot.x;
      const dy = targetY - dot.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const moveForce = (dot.speed * behaviorSpeedMultiplier * phaseSpeedMultiplier) / distance;
        velocity.vx += dx * moveForce * deltaTime * 10;
        velocity.vy += dy * moveForce * deltaTime * 10;
      }

      // Apply power effects
      if (dot.power?.active) {
        switch (dot.power.type) {
          case "speed":
            velocity.vx *= 1.8;
            velocity.vy *= 1.8;
            break;
          case "teleport":
            if (Math.random() < 0.15 * deltaTime) {
              dot.x = arena.centerX - arena.width / 2 + Math.random() * arena.width;
              dot.y = arena.centerY - arena.height / 2 + Math.random() * arena.height;
              velocity.vx = (Math.random() - 0.5) * 8 * config.speedMultiplier;
              velocity.vy = (Math.random() - 0.5) * 8 * config.speedMultiplier;
            }
            break;
          case "grow":
            dot.size += 0.1 * deltaTime;
            break;
        }
      }

      // Apply momentum
      velocity.vx *= 0.92;
      velocity.vy *= 0.92;

      // Update position
      dot.x += velocity.vx * deltaTime * 60;
      dot.y += velocity.vy * deltaTime * 60;

      // Arena boundaries (shrinking arena pushes dots inward)
      const arenaLeft = arena.centerX - arena.width / 2;
      const arenaRight = arena.centerX + arena.width / 2;
      const arenaTop = arena.centerY - arena.height / 2;
      const arenaBottom = arena.centerY + arena.height / 2;

      if (dot.x <= arenaLeft + dot.size || dot.x >= arenaRight - dot.size) {
        velocity.vx *= -0.7;
        dot.x = Math.max(arenaLeft + dot.size, Math.min(arenaRight - dot.size, dot.x));

        if (battlePhase === BattlePhase.LATE || battlePhase === BattlePhase.FINAL) {
          dot.size = Math.max(5, dot.size - 0.5);
        }
      }
      if (dot.y <= arenaTop + dot.size || dot.y >= arenaBottom - dot.size) {
        velocity.vy *= -0.7;
        dot.y = Math.max(arenaTop + dot.size, Math.min(arenaBottom - dot.size, dot.y));

        if (battlePhase === BattlePhase.LATE || battlePhase === BattlePhase.FINAL) {
          dot.size = Math.max(5, dot.size - 0.5);
        }
      }

      // Limit velocity with config multipliers
      const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
      const maxSpeed = 8 * phaseSpeedMultiplier;
      if (speed > maxSpeed) {
        velocity.vx = (velocity.vx / speed) * maxSpeed;
        velocity.vy = (velocity.vy / speed) * maxSpeed;
      }
    });

    // Check for eliminations with config-based parameters
    const eliminationEvents = checkEliminations(state.dots, battlePhase, config);
    if (eliminationEvents.length > 0) {
      state.eliminationLog = [...state.eliminationLog, ...eliminationEvents];
      state.dots = state.dots.filter((dot) => !eliminationEvents.some((event) => event.eliminatedId === dot.id));

      eliminationEvents.forEach((event) => {
        dotVelocities.delete(event.eliminatedId);
        dotPersonalities.delete(event.eliminatedId);
      });
    }

    onUpdate({ ...state });

    if (state.inProgress) {
      animationFrameId = requestAnimationFrame(update);
    }
  };

  animationFrameId = requestAnimationFrame(update);

  return () => {
    cancelAnimationFrame(animationFrameId);
    dotVelocities.clear();
    dotPersonalities.clear();
  };
};

const checkEliminations = (dots: Dot[], phase: BattlePhase, config: BattleConfig): EliminationEvent[] => {
  const eliminationEvents: EliminationEvent[] = [];

  // Base elimination distance modified by config intensity
  const baseDistance = 15;
  const intensityMultiplier = config.aggressionMultiplier;
  const phaseElimDistance = phase === BattlePhase.FINAL ? baseDistance * 1.5 * intensityMultiplier : baseDistance * intensityMultiplier;

  // Growth factor based on config
  const baseGrowth = 1.5;
  const phaseGrowthFactor = phase === BattlePhase.FINAL ? baseGrowth * 1.3 * intensityMultiplier : baseGrowth * intensityMultiplier;

  for (let i = 0; i < dots.length; i++) {
    const dot1 = dots[i];

    for (let j = i + 1; j < dots.length; j++) {
      const dot2 = dots[j];

      const dx = dot2.x - dot1.x;
      const dy = dot2.y - dot1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < Math.max(dot1.size, dot2.size) + phaseElimDistance) {
        let eliminated: Dot;
        let eliminator: Dot;

        // Size difference needed (easier elimination with higher intensity)
        const minSizeDiff = Math.max(1, 2 - intensityMultiplier);

        if (dot1.size > dot2.size && dot1.size - dot2.size >= minSizeDiff) {
          eliminator = dot1;
          eliminated = dot2;
        } else if (dot2.size > dot1.size && dot2.size - dot1.size >= minSizeDiff) {
          eliminator = dot2;
          eliminated = dot1;
        } else {
          continue;
        }

        if (eliminated.power?.active && eliminated.power.type === "shield") {
          continue;
        }

        eliminationEvents.push({
          timestamp: Date.now(),
          eliminatorId: eliminator.id,
          eliminatorName: eliminator.name,
          eliminatedId: eliminated.id,
          eliminatedName: eliminated.name,
        });

        eliminator.size += phaseGrowthFactor;
        eliminator.eliminations += 1;

        // Berserker bonus with config scaling
        const personality = dotPersonalities.get(eliminator.id);
        if (personality?.berserker) {
          eliminator.size += 0.5 * intensityMultiplier;
          personality.aggression = Math.min(1, personality.aggression + 0.1 * intensityMultiplier);
        }
      }
    }
  }

  return eliminationEvents;
};
