import React from 'react';

interface ClassMetric {
  className: string;
  iou: number;
  color: string;
}

interface MetricsPanelProps {
  classMetrics: ClassMetric[];
  mAP: number;
  theme?: 'light' | 'dark';
}

export function MetricsPanel({ classMetrics, mAP, theme = 'dark' }: MetricsPanelProps) {
  const avgIoU = classMetrics.reduce((sum, m) => sum + m.iou, 0) / classMetrics.length;

  return (
    <div className={`rounded-lg p-6 border ${
      theme === 'dark'
        ? 'bg-zinc-800 border-zinc-700'
        : 'bg-white border-gray-200'
    }`}>
      <h2 className={`text-lg mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Метрики детекции
      </h2>

      {/* Overall Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`rounded-lg p-4 border ${
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
            Средний IoU
          </div>
          <div className={`text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {(avgIoU * 100).toFixed(2)}%
          </div>
        </div>
        <div className={`rounded-lg p-4 border ${
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
            mAP
          </div>
          <div className={`text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {(mAP * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Per-Class Metrics */}
      <div>
        <h3 className={`text-sm mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
          IoU по классам
        </h3>
        <div className="space-y-3">
          {classMetrics.map((metric, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {metric.className}
                  </span>
                </div>
                <span className={`text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                  {(metric.iou * 100).toFixed(1)}%
                </span>
              </div>
              <div className={`w-full rounded-full h-2 overflow-hidden ${
                theme === 'dark' ? 'bg-zinc-700' : 'bg-gray-200'
              }`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${metric.iou * 100}%`,
                    backgroundColor: metric.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}