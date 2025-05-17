export interface DotPower {
  type: 'speed' | 'shield' | 'teleport' | 'grow';
  duration: number;
  active: boolean;
  cooldown: number;
  lastUsed: number;
}

export interface Dot {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  eliminations: number;
  power: DotPower | null;
}

export interface EliminationEvent {
  timestamp: number;
  eliminatorId: string;
  eliminatorName: string;
  eliminatedId: string;
  eliminatedName: string;
}

export interface SimulationState {
  dots: Dot[];
  eliminationLog: EliminationEvent[];
  winner: Dot | null;
  inProgress: boolean;
  lastUpdateTime: number | null;
  simulationDate: string | null;
}

export interface GameContextType {
  simulationState: SimulationState;
  nextSimulationTime: Date | null;
  timeUntilNextSimulation: string | null;
  createNewDot: (name: string) => Promise<boolean>;
  startSimulation: () => Promise<void>;
  resetSimulation: () => void;
  isRegistrationOpen: boolean;
  leaderboard: Array<{ name: string, wins: number, eliminations: number }>;
  canSubmit: boolean;
}