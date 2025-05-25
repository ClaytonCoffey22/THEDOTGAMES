// src/types/index.ts - Complete type definitions

// Core game types
export interface DotPower {
  type: "speed" | "shield" | "teleport" | "grow";
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

// Database table types
export interface DatabaseDot {
  id: string;
  name: string;
  total_wins: number | null;
  total_eliminations: number | null;
  total_matches: number | null;
  first_appeared: string | null;
  last_active: string | null;
}

export interface DailyBattle {
  id: string;
  battle_date: string;
  status: "registration" | "in_progress" | "completed";
  max_participants: number | null;
  current_participants: number | null;
  winner_dot_name: string | null;
  winner_user_id: string | null;
  battle_duration_seconds: number | null;
  simulation_data: unknown | null;
  created_at: string | null;
  completed_at: string | null;
  registration_deadline: string | null;
  minimum_participants: number | null;
  battle_start_time: string | null;
}

export interface DailyParticipant {
  id: string;
  battle_id: string | null;
  dot_name: string;
  user_id: string | null;
  device_fingerprint: string;
  eliminations: number | null;
  final_size: number | null;
  had_power: string | null;
  survived_until: string | null;
  placement: number | null;
  created_at: string | null;
}

export interface DeviceSubmission {
  id: string;
  device_fingerprint: string;
  submission_date: string | null;
  dot_name: string;
  created_at: string | null;
}

export interface GameSchedule {
  id: string;
  battle_time: string;
  registration_cutoff_minutes: number;
  minimum_participants: number;
  maximum_participants: number;
  created_at: string | null;
}

export interface BattleSummary {
  id: string;
  battle_date: string;
  total_participants: number;
  winner_account_name: string | null;
  winner_was_guest: boolean;
  guest_participants: number;
  registered_participants: number;
  created_at: string | null;
}

export interface DatabaseMatch {
  id: string;
  date: string | null;
  winner_name: string | null;
  total_dots: number | null;
  duration_seconds: number | null;
  simulation_data: unknown | null;
  created_at: string | null;
}

export interface MatchParticipant {
  id: string;
  match_id: string | null;
  dot_name: string;
  eliminations: number | null;
  survived_until: string | null;
  final_size: number | null;
  had_power: string | null;
  placement: number | null;
}

export interface User {
  id: string;
  email: string;
  google_id: string | null;
  account_name: string;
  total_wins: number | null;
  total_eliminations: number | null;
  total_matches: number | null;
  win_streak: number | null;
  best_win_streak: number | null;
  first_win_date: string | null;
  last_active: string | null;
  created_at: string | null;
}

// View types - for database views
export interface LeaderboardEntry {
  name: string;
  total_wins: number;
  total_eliminations: number;
  total_matches: number;
  win_percentage: number;
  first_appeared: string | null;
  last_active: string | null;
}

export interface RegisteredLeaderboardEntry {
  name: string;
  wins: number;
  eliminations: number;
  battles: number;
  win_rate: number;
}

export interface TodaysParticipant {
  id: string | null;
  dot_name: string | null;
  user_id: string | null;
  eliminations: number | null;
  placement: number | null;
  display_name: string | null;
  is_registered: boolean | null;
  created_at: string | null;
}

export interface TodaysLeaderboard {
  id: string | null;
  dot_name: string | null;
  user_id: string | null;
  eliminations: number | null;
  placement: number | null;
  display_name: string | null;
  is_registered: boolean | null;
}

// API response types
export interface BattleRegistration {
  success: boolean;
  message: string;
  battle_id?: string;
  participant_count?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Battle synchronization types
export interface BattleState {
  id: string;
  status: "registration" | "in_progress" | "completed";
  simulation_data?: SimulationState;
  winner_dot_name?: string;
  battle_duration_seconds?: number;
  completed_at?: string;
  battle_start_time?: string;
  current_participants?: number;
  max_participants?: number;
}

export interface BattleUpdate {
  type: "status_change" | "participant_joined" | "simulation_update" | "battle_complete";
  battleId: string;
  data: unknown;
  timestamp: number;
}

// Scheduler types
export interface ScheduledBattle {
  id: string;
  battle_time: string;
  registration_cutoff_minutes: number;
  minimum_participants: number;
  maximum_participants: number;
}

export interface BattleSchedulerConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  autoStart: boolean;
  minParticipants: number;
  maxParticipants: number;
}

// Context types
export interface GameContextType {
  // Authentication state
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Daily battle state
  currentBattle: DailyBattle | null;
  todaysParticipants: TodaysParticipant[];
  canRegisterToday: boolean;
  registrationStatus: "registration" | "in_progress" | "completed";

  // Simulation state
  simulationState: SimulationState;
  isSimulationRunning: boolean;

  // Actions
  registerDotForBattle: (dotName: string, deviceId: string) => Promise<BattleRegistration>;
  startTodaysBattle: () => Promise<void>;

  // Leaderboards
  todaysLeaderboard: TodaysLeaderboard[];
  allTimeLeaderboard: RegisteredLeaderboardEntry[];

  // Timing
  nextBattleTime: Date | null;
  timeUntilBattle: string | null;

  // Battle synchronization
  battleState: BattleState | null;
  isSynchronized: boolean;
}

// Utility types
export type BattleStatus = "registration" | "in_progress" | "completed";
export type PowerType = "speed" | "shield" | "teleport" | "grow";

// Form input types
export interface DotRegistrationForm {
  name: string;
  email?: string;
}

export interface DotRegistrationValidation {
  isValid: boolean;
  errors: {
    name?: string;
    email?: string;
    general?: string;
  };
}

// Component prop types
export interface BattleArenaProps {
  width: number;
  height: number;
  simulationState: SimulationState;
}

export interface KillFeedProps {
  eliminationLog: EliminationEvent[];
  maxEntries?: number;
}

export interface LeaderboardProps {
  entries: RegisteredLeaderboardEntry[];
  sortBy?: "wins" | "eliminations" | "win_rate";
  showShareButton?: boolean;
}

// Database function parameter types
export interface CanRegisterTodayParams {
  p_device_fingerprint: string;
  p_dot_name: string;
}

export interface RegisterForBattleParams {
  p_dot_name: string;
  p_user_id?: string | null;
  p_device_fingerprint: string;
}

export interface CompleteBattleParams {
  p_winner_name: string;
  p_simulation_data: SimulationState;
  p_duration_seconds: number;
}

// Real-time subscription types
export interface RealtimeSubscriptionConfig {
  table: string;
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  filter?: string;
}

export interface RealtimePayload<T extends object = Record<string, unknown>> {
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T;
  schema: string;
  table: string;
}

// Badge generation types
export interface WinnerBadgeData {
  winnerName: string;
  eliminations: number;
  matchDate: string;
  totalParticipants: number;
  matchId: string;
}

export interface BadgeGenerationOptions {
  width?: number;
  height?: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
}

// Error types
export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface RegistrationError {
  type: "DEVICE_ALREADY_REGISTERED" | "NAME_TAKEN" | "BATTLE_FULL" | "REGISTRATION_CLOSED" | "VALIDATION_ERROR" | "DATABASE_ERROR";
  message: string;
  field?: string;
}

// Storage types for local persistence
export interface StoredGameData {
  simulationState?: SimulationState;
  leaderboard?: RegisteredLeaderboardEntry[];
  submissions?: Record<string, number>;
  lastUpdated?: number;
}

// Device fingerprinting types
export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timeZone: string;
  deviceMemory?: string;
  hardwareConcurrency?: string;
  canvasFingerprint?: string;
}

// Animation and simulation types
export interface DotVelocity {
  vx: number;
  vy: number;
}

export interface SimulationConfig {
  arenaWidth: number;
  arenaHeight: number;
  updateInterval: number;
  eliminationDistance: number;
  growthFactor: number;
  momentumFactor: number;
  maxSpeed: number;
  minSpeed: number;
  powerActivationChance: number;
  matchDuration: number;
}

export interface TournamentBracket {
  matches: BracketMatch[];
  currentRound: number;
  roundStartTime: number;
  isComplete: boolean;
}

export interface BracketMatch {
  dot1: Dot;
  dot2: Dot | null;
  winner?: Dot;
  completed: boolean;
}

// Export a default config for easy imports
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  arenaWidth: 800,
  arenaHeight: 600,
  updateInterval: 1000 / 60, // 60 FPS
  eliminationDistance: 10,
  growthFactor: 1.2,
  momentumFactor: 0.95,
  maxSpeed: 5,
  minSpeed: 2,
  powerActivationChance: 0.05,
  matchDuration: 180000, // 3 minutes
};
