import { Dot, SimulationState, EliminationEvent } from '../types';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const UPDATE_INTERVAL = 16;
const ELIMINATION_DISTANCE = 10;
const GROWTH_FACTOR = 1.2;
const MOMENTUM_FACTOR = 0.7;
const MAX_SPEED = 10;
const MIN_SPEED = 3;
const POWER_ACTIVATION_CHANCE = 0.05; // Increased chance for more frequent power-ups
const POWER_DURATION_BASE = 4000; // 4 seconds base duration
const POWER_COOLDOWN_BASE = 6000; // 6 seconds cooldown
const MATCH_TIME_PER_ROUND = 3000; // 3 seconds per round average
const TELEPORT_CHANCE = 0.08;

// Match duration based on participant count (in milliseconds)
const getMatchDuration = (participantCount: number): number => {
  // Calculate number of rounds needed for tournament
  const rounds = Math.ceil(Math.log2(participantCount));
  // Each round takes MATCH_TIME_PER_ROUND milliseconds
  return rounds * MATCH_TIME_PER_ROUND;
};

// Calculate attraction force as time progresses
const getAttractionForce = (elapsedTime: number, totalDuration: number): number => {
  const timeProgress = elapsedTime / totalDuration;
  // Increased attraction force for faster matches
  return Math.min(8, 1 + Math.pow(timeProgress, 2) * 10);
};

interface DotVelocity {
  vx: number;
  vy: number;
}

const dotVelocities = new Map<string, DotVelocity>();

// Tournament bracket management
interface BracketMatch {
  dot1: Dot;
  dot2: Dot;
  winner?: Dot;
  completed: boolean;
}

class TournamentManager {
  private matches: BracketMatch[] = [];
  private currentRound: number = 0;
  private roundStartTime: number = 0;

  constructor(dots: Dot[]) {
    this.initializeBracket(dots);
  }

  private initializeBracket(dots: Dot[]) {
    // Shuffle dots for random matchups
    const shuffledDots = [...dots].sort(() => Math.random() - 0.5);
    
    // Create initial matches
    for (let i = 0; i < shuffledDots.length; i += 2) {
      if (i + 1 < shuffledDots.length) {
        this.matches.push({
          dot1: shuffledDots[i],
          dot2: shuffledDots[i + 1],
          completed: false
        });
      } else {
        // Bye round if odd number of dots
        this.matches.push({
          dot1: shuffledDots[i],
          dot2: null as any,
          winner: shuffledDots[i],
          completed: true
        });
      }
    }
  }

  public updateMatches(state: SimulationState): void {
    const currentTime = Date.now();
    
    // Start new round if needed
    if (this.roundStartTime === 0) {
      this.roundStartTime = currentTime;
    }

    // Check if current round should end
    if (currentTime - this.roundStartTime >= MATCH_TIME_PER_ROUND) {
      this.completeRound(state);
      this.roundStartTime = currentTime;
    }
  }

  private completeRound(state: SimulationState): void {
    const incompleteMatches = this.matches.filter(m => !m.completed);
    const nextRoundMatches: BracketMatch[] = [];

    // Complete all matches in current round
    for (const match of incompleteMatches) {
      if (!match.winner) {
        // Determine winner based on size and random chance
        const randomFactor = Math.random() * 0.2; // 20% random influence
        const dot1Score = match.dot1.size * (1 + randomFactor);
        const dot2Score = match.dot2.size * (1 + randomFactor);
        
        match.winner = dot1Score > dot2Score ? match.dot1 : match.dot2;
        match.completed = true;

        // Record elimination
        state.eliminationLog.push({
          timestamp: Date.now(),
          eliminatorId: match.winner.id,
          eliminatorName: match.winner.name,
          eliminatedId: (match.winner === match.dot1 ? match.dot2 : match.dot1).id,
          eliminatedName: (match.winner === match.dot1 ? match.dot2 : match.dot1).name
        });

        match.winner.eliminations++;
        match.winner.size *= GROWTH_FACTOR;
      }
    }

    // Create next round matches
    for (let i = 0; i < this.matches.length; i += 2) {
      if (i + 1 < this.matches.length) {
        nextRoundMatches.push({
          dot1: this.matches[i].winner!,
          dot2: this.matches[i + 1].winner!,
          completed: false
        });
      } else if (this.matches[i].winner) {
        // Single winner advances
        nextRoundMatches.push({
          dot1: this.matches[i].winner,
          dot2: null as any,
          winner: this.matches[i].winner,
          completed: true
        });
      }
    }

    this.matches = nextRoundMatches;
    this.currentRound++;

    // Check if tournament is complete
    if (this.matches.length === 1 && this.matches[0].completed) {
      state.winner = this.matches[0].winner!;
      state.inProgress = false;
    }
  }
}

export const generateSimulation = (
  initialState: SimulationState,
  onUpdate: (state: SimulationState) => void,
  onComplete: (winner: Dot) => void
) => {
  let state = { ...initialState };
  let animationFrameId: number;
  const startTime = Date.now();
  const matchDuration = getMatchDuration(state.dots.length);
  const tournament = new TournamentManager(state.dots);
  
  // Initialize velocities and scale parameters
  state.dots.forEach(dot => {
    dotVelocities.set(dot.id, {
      vx: (Math.random() - 0.5) * MAX_SPEED,
      vy: (Math.random() - 0.5) * MAX_SPEED
    });

    // Randomly assign powers to 30% of dots
    if (Math.random() < 0.3) {
      dot.power = {
        type: ["speed", "shield", "teleport", "grow"][Math.floor(Math.random() * 4)] as "speed" | "shield" | "teleport" | "grow",
        duration: POWER_DURATION_BASE + Math.random() * 2000,
        active: false,
        cooldown: POWER_COOLDOWN_BASE + Math.random() * 4000,
        lastUsed: 0
      };
    }
  });

  const update = () => {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const deltaTime = state.lastUpdateTime ? (currentTime - state.lastUpdateTime) / 1000 : 0.016;
    state.lastUpdateTime = currentTime;

    // Update tournament state
    tournament.updateMatches(state);

    // Force end game if time is up
    if (elapsedTime >= matchDuration || state.dots.length <= 1) {
      if (!state.winner && state.dots.length > 0) {
        state.winner = state.dots[0];
        state.inProgress = false;
      }
      onUpdate({ ...state });
      if (state.winner) {
        onComplete(state.winner);
      }
      return;
    }

    const attractionForce = getAttractionForce(elapsedTime, matchDuration);
    
    // Update dot positions and handle interactions
    state.dots.forEach(dot1 => {
      // Random chance to activate power-ups
      if (dot1.power && !dot1.power.active && 
          currentTime - dot1.power.lastUsed >= dot1.power.cooldown &&
          Math.random() < POWER_ACTIVATION_CHANCE) {
        dot1.power.active = true;
        dot1.power.lastUsed = currentTime;
        setTimeout(() => {
          if (dot1.power) {
            dot1.power.active = false;
          }
        }, dot1.power.duration);
      }

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