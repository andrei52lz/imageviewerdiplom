import React from 'react';
import type { MetricsResult, Theme } from "../types";

interface MetricsPanelProps {
  metrics: MetricsResult;
  classColors: Record<string, string>;
  theme?: Theme;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function MetricsPanel({ metrics, classColors, theme = 'dark' }: MetricsPanelProps) {
  const metricCards = [
    { label: 'mAP@0.5', value: formatPercent(metrics.mAP) },
    { label: 'Precision', value: formatPercent(metrics.precision) },
    { label: 'Recall', value: formatPercent(metrics.recall) },
    { label: 'TP / FP / FN', value: `${metrics.tp} / ${metrics.fp} / ${metrics.fn}` },
  ];

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
        {metricCards.map((card) => (
          <div key={card.label} className={`rounded-lg p-4 border ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              {card.label}
            </div>
            <div className={`text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Per-Class Metrics */}
      <div>
        <h3 className={`text-sm mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
          Метрики по классам
        </h3>
        <div className="space-y-3">
          {metrics.classMetrics.map((metric) => {
            const color = classColors[metric.className] || '#FFFFFF';

            return (
            <div
              key={metric.className}
              className={`rounded-lg border p-3 ${
                theme === 'dark'
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {metric.className}
                  </span>
                </div>
                <span className={`text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                  IoU {formatPercent(metric.iou)}
                </span>
              </div>
              <div className={`grid grid-cols-2 gap-x-4 gap-y-2 text-sm ${
                theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'
              }`}>
                <div>AP: {formatPercent(metric.ap)}</div>
                <div>Precision: {formatPercent(metric.precision)}</div>
                <div>Recall: {formatPercent(metric.recall)}</div>
                <div>TP/FP/FN: {metric.tp}/{metric.fp}/{metric.fn}</div>
                <div>GT: {metric.gtCount}</div>
                <div>Predictions: {metric.predCount}</div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
