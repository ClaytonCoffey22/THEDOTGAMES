import React, { useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';

interface BattleArenaProps {
  width: number;
  height: number;
}

const BattleArena: React.FC<BattleArenaProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { simulationState } = useGame();
  const { dots, inProgress } = simulationState;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set actual canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Clear the canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.2)';
    ctx.lineWidth = 1;
    
    // Draw vertical grid lines
    for (let x = 0; x <= width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw dots
    dots.forEach(dot => {
      // Shadow glow effect
      ctx.shadowColor = dot.color;
      ctx.shadowBlur = 15;
      
      // Draw dot
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fillStyle = dot.color;
      ctx.fill();
      
      // Reset shadow for text
      ctx.shadowBlur = 0;
      
      // Draw power indicator if dot has active power
      if (dot.power?.active) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size + 5, 0, Math.PI * 2);
        ctx.stroke();
        
        // Power type icon or indicator
        const powerSymbol = {
          'speed': '⚡',
          'shield': '🛡️',
          'teleport': '✨',
          'grow': '⬆️'
        }[dot.power.type];
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerSymbol, dot.x, dot.y - dot.size - 10);
      }
      
      // Draw dot name
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(dot.name, dot.x, dot.y + dot.size + 10);
    });
    
  }, [dots, width, height, inProgress]);
  
  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-700">
      <canvas
        ref={canvasRef}
        className="block w-full h-full bg-gray-900"
        width={width}
        height={height}
      />
      {!inProgress && simulationState.winner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="text-center p-4">
            <div className="text-2xl md:text-4xl font-bold text-cyan-400 mb-2">
              WINNER!
            </div>
            <div className="text-xl md:text-3xl font-bold text-white mb-2">
              {simulationState.winner.name}
            </div>
            <div className="text-gray-300">
              with {simulationState.winner.eliminations} eliminations
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleArena;