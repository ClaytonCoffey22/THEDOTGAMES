import { Dot, SimulationState, EliminationEvent } from '../types';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const UPDATE_INTERVAL = 16; // 60 FPS for smooth animation
const ELIMINATION_DISTANCE = 8;
const GROWTH_FACTOR = 1.0;
const MOMENTUM_FACTOR = 0.75;
const MAX_SPEED = 8;
const MIN_SPEED = 2;
const POWER_ACTIVATION_CHANCE = 0.02;
const POWER_DURATION_BASE = 3000;
const POWER_COOLDOWN_BASE = 8000;
const TELEPORT_CHANCE = 0.08;

// Duration settings based on participant count
const getDurationForParticipants = (count: number): number => {
  if (count <= 4) return 45000; // 45 seconds for 1-4 participants
  if (count <= 10) return 75000; // 1:15 for 5-10 participants
  if (count <= 100) return 105000; // 1:45 for 11-100 participants
  return 120000; // 2:00 for 101-200 participants
};

// Force larger dots to chase smaller ones as time runs out
const getForceMultiplier = (elapsedTime: number, totalDuration: number): number => {
  const timeRemaining = totalDuration - elapsedTime;
  // Increase force exponentially as time runs out
  return 1 + Math.pow(1 - (timeRemaining / totalDuration), 2) * 4;
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
  let simulationStartTime = Date.now();
  const simulationDuration = getDurationForParticipants(state.dots.length);
  
  // Scale initial dot parameters based on participant count
  const participantCount = state.dots.length;
  const scaleFactor = Math.max(0.5, Math.min(1.5, 200 / participantCount));
  
  // Initialize velocities and scale dot parameters
  state.dots.forEach(dot => {
    if (!dotVelocities.has(dot.id)) {
      dotVelocities.set(dot.id, { 
        vx: (Math.random() - 0.5) * MAX_SPEED * scaleFactor,
        vy: (Math.random() - 0.5) * MAX_SPEED * scaleFactor
      });
    }
    
    dot.size *= scaleFactor;
    dot.speed *= scaleFactor;
    
    if (dot.power) {
      dot.power.duration = POWER_DURATION_BASE * scaleFactor;
      dot.power.cooldown = POWER_COOLDOWN_BASE / scaleFactor;
    }
  });
  
  const update = () => {
    const now = Date.now();
    const deltaTime = state.lastUpdateTime ? (now - state.lastUpdateTime) / 1000 : 0.016;
    state.lastUpdateTime = now;
    
    const elapsedTime = now - simulationStartTime;
    const forceMultiplier = getForceMultiplier(elapsedTime, simulationDuration);
    
    // Update dot movements with increased attraction to smaller dots
    state.dots.forEach(dot1 => {
      const velocity = dotVelocities.get(dot1.id);
      if (!velocity) return;
      
      // Find the nearest smaller dot
      let nearestSmaller: Dot | null = null;
      let minDistance = Infinity;
      
      state.dots.forEach(dot2 => {
        if (dot1 === dot2 || dot1.size <= dot2.size) return;
        
        const dx = dot2.x - dot1.x;
        const dy = dot2.y - dot1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestSmaller = dot2;
        }
      });
      
      // Apply attraction force towards smaller dot
      if (nearestSmaller) {
        const dx = nearestSmaller.x - dot1.x;
        const dy = nearestSmaller.y - dot1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        velocity.vx += (dx / distance) * dot1.speed * forceMultiplier * deltaTime;
        velocity.vy += (dy / distance) * dot1.speed * forceMultiplier * deltaTime;
      }
    });
    
    // Check if simulation time has expired
    if (elapsedTime >= simulationDuration) {
      // Find the largest dot as the winner
      const winner = state.dots.reduce((prev, current) => 
        current.size > prev.size ? current : prev
      );
      
      // Force consume all remaining dots
      const remainingDots = state.dots.filter(dot => dot !== winner);
      remainingDots.forEach(dot => {
        state.eliminationLog.push({
          timestamp: now,
          eliminatorId: winner.id,
          eliminatorName: winner.name,
          eliminatedId: dot.id,
          eliminatedName: dot.name
        });
        winner.eliminations += 1;
      });
      
      state.dots = [winner];
      state.winner = winner;
      state.inProgress = false;
      onUpdate({ ...state });
      onComplete(winner);
      return;
    }
    
    updateDots(state.dots, deltaTime, scaleFactor);
    
    const eliminationEvents = checkEliminations(state.dots);
    if (eliminationEvents.length > 0) {
      state.eliminationLog = [...state.eliminationLog, ...eliminationEvents];
    }
    
    state.dots = state.dots.filter(dot => 
      !eliminationEvents.some(event => event.eliminatedId === dot.id)
    );
    
    if (state.dots.length === 1) {
      const winner = state.dots[0];
      state.winner = winner;
      state.inProgress = false;
      onUpdate({ ...state });
      onComplete(winner);
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

const updateDots = (dots: Dot[], deltaTime: number, scaleFactor: number) => {
  const now = Date.now();
  
  dots.forEach(dot => {
    if (dot.power) {
      if (!dot.power.active && 
          now - dot.power.lastUsed > dot.power.cooldown && 
          Math.random() < POWER_ACTIVATION_CHANCE * scaleFactor) {
        dot.power.active = true;
        dot.power.lastUsed = now;
      }
      
      if (dot.power.active && now - dot.power.lastUsed > dot.power.duration) {
        dot.power.active = false;
      }
    }
    
    let moveSpeed = dot.speed;
    if (dot.power?.active && dot.power.type === 'speed') {
      moveSpeed *= 4;
    }
    
    let velocity = dotVelocities.get(dot.id) || { vx: 0, vy: 0 };
    
    const angleChange = (Math.random() - 0.5) * Math.PI * deltaTime;
    const currentAngle = Math.atan2(velocity.vy, velocity.vx);
    const newAngle = currentAngle + angleChange;
    
    const targetVx = Math.cos(newAngle) * moveSpeed;
    const targetVy = Math.sin(newAngle) * moveSpeed;
    
    velocity.vx = velocity.vx * MOMENTUM_FACTOR + targetVx * (1 - MOMENTUM_FACTOR);
    velocity.vy = velocity.vy * MOMENTUM_FACTOR + targetVy * (1 - MOMENTUM_FACTOR);
    
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
    if (speed > MAX_SPEED * scaleFactor) {
      velocity.vx = (velocity.vx / speed) * MAX_SPEED * scaleFactor;
      velocity.vy = (velocity.vy / speed) * MAX_SPEED * scaleFactor;
    } else if (speed < MIN_SPEED * scaleFactor) {
      velocity.vx = (velocity.vx / speed) * MIN_SPEED * scaleFactor;
      velocity.vy = (velocity.vy / speed) * MIN_SPEED * scaleFactor;
    }
    
    if (dot.power?.active && dot.power.type === 'teleport' && Math.random() < TELEPORT_CHANCE) {
      dot.x = Math.random() * ARENA_WIDTH;
      dot.y = Math.random() * ARENA_HEIGHT;
      velocity.vx = (Math.random() - 0.5) * MAX_SPEED * scaleFactor;
      velocity.vy = (Math.random() - 0.5) * MAX_SPEED * scaleFactor;
    } else {
      dot.x += velocity.vx * deltaTime * 60;
      dot.y += velocity.vy * deltaTime * 60;
    }
    
    if (dot.x <= dot.size || dot.x >= ARENA_WIDTH - dot.size) {
      velocity.vx *= -0.9;
      dot.x = Math.max(dot.size, Math.min(ARENA_WIDTH - dot.size, dot.x));
    }
    if (dot.y <= dot.size || dot.y >= ARENA_HEIGHT - dot.size) {
      velocity.vy *= -0.9;
      dot.y = Math.max(dot.size, Math.min(ARENA_HEIGHT - dot.size, dot.y));
    }
    
    dotVelocities.set(dot.id, velocity);
    
    if (dot.power?.active && dot.power.type === 'grow') {
      const maxSize = 30 * scaleFactor;
      if (dot.size < maxSize) {
        dot.size += 0.1 * scaleFactor;
      }
    }
  });
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
      
      if (distance < Math.max(dot1.size, dot2.size) - ELIMINATION_DISTANCE) {
        let eliminated: Dot;
        let eliminator: Dot;
        
        const sizeDifference = Math.abs(dot1.size - dot2.size);
        const minSizeDifference = 2;
        
        if (dot1.size > dot2.size && sizeDifference >= minSizeDifference) {
          eliminator = dot1;
          eliminated = dot2;
        } else if (dot2.size > dot1.size && sizeDifference >= minSizeDifference) {
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