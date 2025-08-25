import React, { useRef, useEffect } from 'react';

interface GameLogProps {
  log: string[];
}

export const GameLog: React.FC<GameLogProps> = ({ log }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [log]);

  return (
    <div className="bg-black bg-opacity-40 p-4 rounded-lg border border-gray-700 h-64 lg:h-[calc(100vh-8rem)]">
      <h3 className="text-xl font-bold mb-2 border-b border-gray-600 pb-2 text-yellow-300">Журнал Игры</h3>
      <div ref={logContainerRef} className="h-[calc(100%-2.5rem)] overflow-y-auto pr-2">
        <ul>
          {log.map((entry, index) => (
            <li
              key={index}
              className="text-xs text-gray-300 mb-2 leading-relaxed animate-fade-in"
              style={{ animation: 'fadeIn 0.5s ease-out' }}
            >
              {entry}
            </li>
          ))}
        </ul>
      </div>
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation-name: fadeIn;
            animation-duration: 0.3s;
            animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};