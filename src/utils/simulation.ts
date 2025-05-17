import { Dot, SimulationState, EliminationEvent } from '../types';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const UPDATE_INTERVAL = 16; // Increased update frequency for smoother animation
const ELIMINATION_DISTANCE = 5;
const GROWTH_FACTOR = 0.5;
const MOMENTUM_FACTOR = 0.85; // Added for smooth movement
const MAX_SPEED = 5;
const MIN_SPEED = 0.5;

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
  
  // Initialize velocities for all dots
  state.dots.forEach(dot => {
    if (!dotVelocities.has(dot.id)) {
      dotVelocities.set(dot.id, { vx: 0, vy: 0 });
    }
  });
  
  const update = () => {
    const now = Date.now();
    const deltaTime = state.lastUpdateTime ? (now - state.lastUpdateTime) / 1000 : 0.016;
    state.lastUpdateTime = now;
    
    updateDots(state.dots, deltaTime);
    
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

const updateDots = (dots: Dot[], deltaTime: number) => {
  const now = Date.now();
  
  dots.forEach(dot => {
    if (dot.power) {
      if (!dot.power.active && 
          now - dot.power.lastUsed > dot.power.cooldown && 
          Math.random() < 0.01) {
        dot.power.active = true;
        dot.power.lastUsed = now;
      }
      
      if (dot.power.active && now - dot.power.lastUsed > dot.power.duration) {
        dot.power.active = false;
      }
    }
    
    let moveSpeed = dot.speed;
    if (dot.power?.active && dot.power.type === 'speed') {
      moveSpeed *= 3;
    }
    
    // Get or initialize velocity
    let velocity = dotVelocities.get(dot.id) || { vx: 0, vy: 0 };
    
    // Calculate target direction (with some randomness)
    const targetAngle = Math.random() * Math.PI * 2;
    const targetVx = Math.cos(targetAngle) * moveSpeed;
    const targetVy = Math.sin(targetAngle) * moveSpeed;
    
    // Smooth velocity transition
    velocity.vx = velocity.vx * MOMENTUM_FACTOR + targetVx * (1 - MOMENTUM_FACTOR);
    velocity.vy = velocity.vy * MOMENTUM_FACTOR + targetVy * (1 - MOMENTUM_FACTOR);
    
    // Clamp velocity
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
    if (speed > MAX_SPEED) {
      velocity.vx = (velocity.vx / speed) * MAX_SPEED;
      velocity.vy = (velocity.vy / speed) * MAX_SPEED;
    } else if (speed < MIN_SPEED) {
      velocity.vx = (velocity.vx / speed) * MIN_SPEED;
      velocity.vy = (velocity.vy / speed) * MIN_SPEED;
    }
    
    // Special power: teleport
    if (dot.power?.active && dot.power.type === 'teleport' && Math.random() < 0.05) {
      dot.x = Math.random() * ARENA_WIDTH;
      dot.y = Math.random() * ARENA_HEIGHT;
      velocity.vx = 0;
      velocity.vy = 0;
    } else {
      // Update position with velocity
      dot.x += velocity.vx * deltaTime * 60;
      dot.y += velocity.vy * deltaTime * 60;
    }
    
    // Bounce off walls
    if (dot.x <= dot.size || dot.x >= ARENA_WIDTH - dot.size) {
      velocity.vx *= -0.8;
      dot.x = Math.max(dot.size, Math.min(ARENA_WIDTH - dot.size, dot.x));
    }
    if (dot.y <= dot.size || dot.y >= ARENA_HEIGHT - dot.size) {
      velocity.vy *= -0.8;
      dot.y = Math.max(dot.size, Math.min(ARENA_HEIGHT - dot.size, dot.y));
    }
    
    // Update velocity in map
    dotVelocities.set(dot.id, velocity);
    
    // Special power: grow
    if (dot.power?.active && dot.power.type === 'grow' && dot.size < 25) {
      dot.size += 0.05;
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
        
        if (dot1.size > dot2.size) {
          eliminator = dot1;
          eliminated = dot2;
        } else {
          eliminator = dot2;
          eliminated = dot1;
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