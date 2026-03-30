import React from 'react';

interface LegendItem {
  label: string;
  color: string;
}

interface LegendPanelProps {
  items: LegendItem[];
  theme?: 'light' | 'dark';
}

export function LegendPanel({ items, theme = 'dark' }: LegendPanelProps) {
  return (
    <div className={`rounded-lg p-4 border ${
      theme === 'dark'
        ? 'bg-zinc-800 border-zinc-700'
        : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-sm mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Легенда классов
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-0.5"
                  style={{ backgroundColor: item.color }}
                />
                <span className={`text-xs ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}`}>
                  GT
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-0.5 border-t-2"
                  style={{ 
                    borderColor: item.color,
                    borderStyle: 'dashed',
                  }}
                />
                <span className={`text-xs ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}`}>
                  Pred
                </span>
              </div>
            </div>
            <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}