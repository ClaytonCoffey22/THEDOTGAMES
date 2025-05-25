import { Dot, SimulationState, EliminationEvent } from '../types';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const UPDATE_INTERVAL = 16;
const ELIMINATION_DISTANCE = 10;
const GROWTH_FACTOR = 1.2;
const MOMENTUM_FACTOR = 0.7;
const MAX_SPEED = 10;
const MIN_SPEED = 3;
const POWER_ACTIVATION_CHANCE = 0.02;
const POWER_DURATION_BASE = 3000;
const POWER_COOLDOWN_BASE = 8000;
const TELEPORT_CHANCE = 0.08;

// Match duration based on participant count (in milliseconds)
const getMatchDuration = (participantCount: number): number => {
  if (participantCount <= 4) return 45000;      // 45 seconds
  if (participantCount <= 10) return 75000;     // 1:15
  if (participantCount <= 100) return 105000;   // 1:45
  return 120000;                                // 2:00
};

// Calculate attraction force as time progresses
const getAttractionForce = (elapsedTime: number, totalDuration: number): number => {
  const timeProgress = elapsedTime / totalDuration;
  return Math.min(5, 1 + Math.pow(timeProgress, 2) * 8);
};

interface DotVelocity {
  vx: number;
  vy: number;
}

const dotVelocities = new Map<string, DotVelocity>();

export const generateSimulation = (
  initialState: SimulationState,
  onUpdate: (state: SimulationState) => void,
  onComplete: (winner: Dot) => void
) => {
  let state = { ...initialState };
  let animationFrameId: number;
  const startTime = Date.now();
  const matchDuration = getMatchDuration(state.dots.length);
  
  // Initialize velocities and scale parameters
  state.dots.forEach(dot => {
    dotVelocities.set(dot.id, {
      vx: (Math.random() - 0.5) * MAX_SPEED,
      vy: (Math.random() - 0.5) * MAX_SPEED
    });
  });

  const update = () => {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const deltaTime = state.lastUpdateTime ? (currentTime - state.lastUpdateTime) / 1000 : 0.016;
    state.lastUpdateTime = currentTime;

    // Force end game if time is up
    if (elapsedTime >= matchDuration) {
      const winner = state.dots.reduce((prev, current) => 
        current.size > prev.size ? current : prev
      );

      // Force consume all remaining dots
      const remainingDots = state.dots.filter(dot => dot !== winner);
      remainingDots.forEach(dot => {
        state.eliminationLog.push({
          timestamp: currentTime,
          eliminatorId: winner.id,
          eliminatorName: winner.name,
          eliminatedId: dot.id,
          eliminatedName: dot.name
        });
        winner.eliminations += 1;
        winner.size += GROWTH_FACTOR;
      });

      state.dots = [winner];
      state.winner = winner;
      state.inProgress = false;
      onUpdate({ ...state });
      onComplete(winner);
      return;
    }

    const attractionForce = getAttractionForce(elapsedTime, matchDuration);
    
    // Update dot positions and handle interactions
    state.dots.forEach(dot1 => {
      const velocity = dotVelocities.get(dot1.id);
      if (!velocity) return;

      // Find nearest smaller dot to chase
      let nearestSmaller: { dot: Dot, distance: number } | null = null;
      state.dots.forEach(dot2 => {
        if (dot1 === dot2 || dot1.size <= dot2.size) return;
        
        const dx = dot2.x - dot1.x;
        const dy = dot2.y - dot1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (!nearestSmaller || distance < nearestSmaller.distance) {
          nearestSmaller = { dot: dot2, distance };
        }
      });

      // Apply attraction to smaller dots
      if (nearestSmaller) {
        const dx = nearestSmaller.dot.x - dot1.x;
        const dy = nearestSmaller.dot.y - dot1.y;
        const distance = nearestSmaller.distance;
        
        velocity.vx += (dx / distance) * dot1.speed * attractionForce * deltaTime;
        velocity.vy += (dy / distance) * dot1.speed * attractionForce * deltaTime;
      }

      // Apply power effects
      if (dot1.power?.active) {
        switch (dot1.power.type) {
          case 'speed':
            velocity.vx *= 2;
            velocity.vy *= 2;
            break;
          case 'teleport':
            if (Math.random() < TELEPORT_CHANCE) {
              dot1.x = Math.random() * (ARENA_WIDTH - dot1.size * 2) + dot1.size;
              dot1.y = Math.random() * (ARENA_HEIGHT - dot1.size * 2) + dot1.size;
              velocity.vx = (Math.random() - 0.5) * MAX_SPEED;
              velocity.vy = (Math.random() - 0.5) * MAX_SPEED;
            }
            break;
          case 'grow':
            dot1.size += 0.1;
            break;
        }
      }

      // Update position
      dot1.x += velocity.vx * deltaTime;
      dot1.y += velocity.vy * deltaTime;

      // Bounce off walls
      if (dot1.x <= dot1.size || dot1.x >= ARENA_WIDTH - dot1.size) {
        velocity.vx *= -1;
        dot1.x = Math.max(dot1.size, Math.min(ARENA_WIDTH - dot1.size, dot1.x));
      }
      if (dot1.y <= dot1.size || dot1.y >= ARENA_HEIGHT - dot1.size) {
        velocity.vy *= -1;
        dot1.y = Math.max(dot1.size, Math.min(ARENA_HEIGHT - dot1.size, dot1.y));
      }

      // Normalize velocity
      const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
      if (speed > MAX_SPEED) {
        velocity.vx = (velocity.vx / speed) * MAX_SPEED;
        velocity.vy = (velocity.vy / speed) * MAX_SPEED;
      }
    });

    // Check for eliminations
    const eliminationEvents = checkEliminations(state.dots);
    if (eliminationEvents.length > 0) {
      state.eliminationLog = [...state.eliminationLog, ...eliminationEvents];
      state.dots = state.dots.filter(dot => 
        !eliminationEvents.some(event => event.eliminatedId === dot.id)
      );
    }

    // Check for winner
    if (state.dots.length === 1) {
      state.winner = state.dots[0];
      state.inProgress = false;
      onUpdate({ ...state });
      onComplete(state.winner);
      return;
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
  };
};

const checkEliminations = (dots: Dot[]): EliminationEvent[] => {
  const eliminationEvents: EliminationEvent[] = [];
  
  for (let i = 0; i < dots.length; i++) {
    const dot1 = dots[i];
    
    for (let j = i + 1; j < dots.length; j++) {
      const dot2 = dots[j];
      
      const dx = dot2.x - dot1.x;
      const dy = dot2.y - dot1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < Math.max(dot1.size, dot2.size) + ELIMINATION_DISTANCE) {
        let eliminated: Dot;
        let eliminator: Dot;
        
        if (dot1.size > dot2.size && dot1.size - dot2.size >= 2) {
          eliminator = dot1;
          eliminated = dot2;
        } else if (dot2.size > dot1.size && dot2.size - dot1.size >= 2) {
          eliminator = dot2;
          eliminated = dot1;
        } else {
          continue;
        }
        
        if (eliminated.power?.active && eliminated.power.type === 'shield') {
          continue;
        }
        
        eliminationEvents.push({
          timestamp: Date.now(),
          eliminatorId: eliminator.id,
          eliminatorName: eliminator.name,
          eliminatedId: eliminated.id,
          eliminatedName: eliminated.name
        });
        
        eliminator.size += GROWTH_FACTOR;
        eliminator.eliminations += 1;
      }
    }
  }
  
  return eliminationEvents;
};