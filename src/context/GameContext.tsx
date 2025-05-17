import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDotData, saveDotData, canSubmitDot, recordSubmission } from '../utils/storage';
import { generateSimulation } from '../utils/simulation';
import { Dot, SimulationState, GameContextType } from '../types';

const DEFAULT_STATE: SimulationState = {
  dots: [],
  eliminationLog: [],
  winner: null,
  inProgress: false,
  lastUpdateTime: null,
  simulationDate: null
};

const GameContext = createContext<GameContextType>({
  simulationState: DEFAULT_STATE,
  nextSimulationTime: null,
  timeUntilNextSimulation: null,
  createNewDot: () => Promise.resolve(false),
  startSimulation: () => Promise.resolve(),
  resetSimulation: () => {},
  isRegistrationOpen: true,
  leaderboard: [],
  canSubmit: true
});

export const useGame = () => useContext(GameContext);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulationState, setSimulationState] = useState<SimulationState>(DEFAULT_STATE);
  const [nextSimulationTime, setNextSimulationTime] = useState<Date | null>(null);
  const [timeUntilNextSimulation, setTimeUntilNextSimulation] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ name: string, wins: number, eliminations: number }>>([]);
  const [canSubmit, setCanSubmit] = useState(true);
  
  useEffect(() => {
    setCanSubmit(canSubmitDot());
  }, []);
  
  useEffect(() => {
    const calculateNextSimulation = () => {
      const now = new Date();
      const simulationHour = 23;
      
      const todaySimulation = new Date(now);
      todaySimulation.setHours(simulationHour, 0, 0, 0);
      
      const nextSim = now > todaySimulation 
        ? new Date(todaySimulation.getTime() + 24 * 60 * 60 * 1000) 
        : todaySimulation;
      
      setNextSimulationTime(nextSim);
    };
    
    calculateNextSimulation();
    const interval = setInterval(calculateNextSimulation, 60000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (!nextSimulationTime) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = nextSimulationTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeUntilNextSimulation("Starting now!");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilNextSimulation(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextSimulationTime]);
  
  useEffect(() => {
    const loadData = async () => {
      const data = await getDotData();
      if (data) {
        setSimulationState(data.simulationState || DEFAULT_STATE);
        setLeaderboard(data.leaderboard || []);
      }
    };
    
    loadData();
  }, []);
  
  useEffect(() => {
    if (!nextSimulationTime) return;
    
    const checkAndStartSimulation = async () => {
      const now = new Date();
      if (Math.abs(now.getTime() - nextSimulationTime.getTime()) < 60000 && !simulationState.inProgress) {
        await startSimulation();
      }
    };
    
    const interval = setInterval(checkAndStartSimulation, 10000);
    return () => clearInterval(interval);
  }, [nextSimulationTime, simulationState.inProgress]);
  
  const isRegistrationOpen = !simulationState.inProgress;
  
  const createNewDot = async (name: string): Promise<boolean> => {
    if (!isRegistrationOpen || !canSubmitDot()) return false;
    
    const nameExists = simulationState.dots.some(dot => dot.name === name);
    if (nameExists) return false;
    
    const newDots = [...simulationState.dots];
    
    if (newDots.length < 50) {
      newDots.push({
        id: Date.now().toString(),
        name,
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: 10,
        color: `hsl(${Math.random() * 360}, 80%, 60%)`,
        speed: 1 + Math.random() * 1.5,
        eliminations: 0,
        power: Math.random() > 0.7 ? {
          type: ['speed', 'shield', 'teleport', 'grow'][Math.floor(Math.random() * 4)],
          duration: 5000 + Math.random() * 10000,
          active: false,
          cooldown: 15000 + Math.random() * 15000,
          lastUsed: 0
        } : null
      });
      
      const newState = { ...simulationState, dots: newDots };
      setSimulationState(newState);
      recordSubmission();
      setCanSubmit(false);
      await saveDotData({ simulationState: newState, leaderboard });
      return true;
    }
    
    return false;
  };
  
  const startSimulation = async () => {
    if (simulationState.inProgress || simulationState.dots.length < 2) return;
    
    const newState: SimulationState = {
      ...simulationState,
      inProgress: true,
      eliminationLog: [],
      winner: null,
      simulationDate: new Date().toISOString(),
      lastUpdateTime: Date.now()
    };
    
    setSimulationState(newState);
    await saveDotData({ simulationState: newState, leaderboard });
    
    generateSimulation(
      newState,
      (state: SimulationState) => {
        setSimulationState(state);
        saveDotData({ simulationState: state, leaderboard });
      },
      (winner: Dot) => {
        const newLeaderboard = [...leaderboard];
        const existingEntry = newLeaderboard.find(entry => entry.name === winner.name);
        
        if (existingEntry) {
          existingEntry.wins += 1;
          existingEntry.eliminations += winner.eliminations;
        } else {
          newLeaderboard.push({
            name: winner.name,
            wins: 1,
            eliminations: winner.eliminations
          });
        }
        
        newLeaderboard.sort((a, b) => b.wins - a.wins);
        
        setLeaderboard(newLeaderboard);
        saveDotData({ 
          simulationState: { 
            ...simulationState, 
            inProgress: false,
            winner: winner 
          }, 
          leaderboard: newLeaderboard 
        });
      }
    );
  };
  
  const resetSimulation = () => {
    let newDots = [...simulationState.dots];
    
    if (newDots.length === 0) {
      for (let i = 0; i < 20; i++) {
        newDots.push({
          id: `bot-${i}`,
          name: `Dot_Bot${i}`,
          x: Math.random() * 800,
          y: Math.random() * 600,
          size: 10,
          color: `hsl(${Math.random() * 360}, 80%, 60%)`,
          speed: 1 + Math.random() * 1.5,
          eliminations: 0,
          power: Math.random() > 0.7 ? {
            type: ['speed', 'shield', 'teleport', 'grow'][Math.floor(Math.random() * 4)],
            duration: 5000 + Math.random() * 10000,
            active: false,
            cooldown: 15000 + Math.random() * 15000,
            lastUsed: 0
          } : null
        });
      }
    }
    
    const newState = {
      ...DEFAULT_STATE,
      dots: newDots
    };
    
    setSimulationState(newState);
    saveDotData({ simulationState: newState, leaderboard });
  };
  
  return (
    <GameContext.Provider value={{
      simulationState,
      nextSimulationTime,
      timeUntilNextSimulation,
      createNewDot,
      startSimulation,
      resetSimulation,
      isRegistrationOpen,
      leaderboard,
      canSubmit
    }}>
      {children}
    </GameContext.Provider>
  );
};