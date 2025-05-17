import React from 'react';
import { useGame } from '../../context/GameContext';
import { formatDistanceToNow } from 'date-fns';

const KillFeed: React.FC = () => {
  const { simulationState } = useGame();
  const { eliminationLog } = simulationState;
  
  // Get the last 10 eliminations, in reverse chronological order
  const recentEliminations = [...eliminationLog]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
  
  if (recentEliminations.length === 0) {
    return (
      <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">Elimination Feed</h3>
        <p className="text-gray-400 text-sm italic">No eliminations yet...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-2">Elimination Feed</h3>
      <div className="space-y-2">
        {recentEliminations.map((event, index) => {
          const timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });
          
          return (
            <div 
              key={`${event.timestamp}-${index}`} 
              className="text-sm py-1 border-b border-gray-700 last:border-b-0"
            >
              <span className="font-semibold text-cyan-400">{event.eliminatorName}</span>
              <span className="text-gray-300"> eliminated </span>
              <span className="font-semibold text-pink-400">{event.eliminatedName}</span>
              <div className="text-xs text-gray-500 mt-1">{timeAgo}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KillFeed;