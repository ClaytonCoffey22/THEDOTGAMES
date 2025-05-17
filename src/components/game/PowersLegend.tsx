import React from 'react';

const PowersLegend: React.FC = () => {
  const powers = [
    { type: 'speed', name: 'Speed Boost', description: 'Temporarily increases movement speed', icon: '⚡' },
    { type: 'shield', name: 'Shield', description: 'Prevents being consumed by larger dots', icon: '🛡️' },
    { type: 'teleport', name: 'Teleport', description: 'Randomly teleports to a new location', icon: '✨' },
    { type: 'grow', name: 'Growth', description: 'Gradually increases in size without consuming dots', icon: '⬆️' }
  ];
  
  return (
    <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-3">Special Powers</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {powers.map(power => (
          <div 
            key={power.type} 
            className="flex items-start p-2 border border-gray-700 rounded bg-gray-800"
          >
            <div className="text-xl mr-2">{power.icon}</div>
            <div>
              <h4 className="font-medium text-cyan-400">{power.name}</h4>
              <p className="text-xs text-gray-300">{power.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PowersLegend;