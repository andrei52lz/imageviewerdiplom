import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Play } from 'lucide-react';
import { VisionKitIcon } from './VisionKitIcon';

interface WelcomeScreenProps {
  onStart: () => void;
  theme: 'light' | 'dark';
}

interface DetectionBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  visible: boolean;
}

export function WelcomeScreen({ onStart, theme }: WelcomeScreenProps) {
  const [detections, setDetections] = useState<DetectionBox[]>([
    { id: 1, x: 15, y: 35, width: 18, height: 15, label: 'Морская звезда', color: '#3B82F6', visible: false },
    { id: 2, x: 45, y: 55, width: 12, height: 12, label: 'Ракушка', color: '#10B981', visible: false },
    { id: 3, x: 70, y: 25, width: 15, height: 18, label: 'Коралл', color: '#F59E0B', visible: false },
    { id: 4, x: 25, y: 65, width: 14, height: 11, label: 'Морской ёж', color: '#8B5CF6', visible: false },
    { id: 5, x: 80, y: 60, width: 16, height: 13, label: 'Песчаный доллар', color: '#EF4444', visible: false },
    { id: 6, x: 55, y: 40, width: 13, height: 14, label: 'Камень', color: '#06B6D4', visible: false },
  ]);

  useEffect(() => {
    // Animate detection boxes appearing one by one
    const timers: NodeJS.Timeout[] = [];
    
    detections.forEach((detection, index) => {
      const timer = setTimeout(() => {
        setDetections(prev => 
          prev.map(d => d.id === detection.id ? { ...d, visible: true } : d)
        );
      }, 1000 + index * 1500);
      timers.push(timer);
    });

    // Loop animation - hide all, then show them again with slight position variations
    const loopTimer = setInterval(() => {
      setDetections(prev => prev.map(d => ({ ...d, visible: false })));
      setTimeout(() => {
        detections.forEach((detection, index) => {
          setTimeout(() => {
            setDetections(prev => 
              prev.map(d => d.id === detection.id ? { ...d, visible: true } : d)
            );
          }, index * 1500);
        });
      }, 800);
    }, 12000);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      clearInterval(loopTimer);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Endless Vertical Scrolling Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute w-full bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1587488355642-c40d8606c760?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMHNhbmQlMjBvY2VhbiUyMGFlcmlhbCUyMHRvcCUyMHZpZXd8ZW58MXx8fHwxNzczNDk1NjY1fDA&ixlib=rb-4.1.0&q=80&w=1080)',
            height: '200%',
            top: '0',
            animation: 'scrollBeachVertical 40s linear infinite',
          }}
        />
        <div 
          className={`absolute inset-0 ${
            theme === 'dark' 
              ? 'bg-gradient-to-b from-zinc-950/70 via-zinc-950/50 to-zinc-950/80' 
              : 'bg-gradient-to-b from-gray-50/70 via-gray-50/50 to-gray-50/80'
          }`}
        />
      </div>

      {/* Animated Detection Boxes */}
      <div className="absolute inset-0 pointer-events-none">
        {detections.map((detection) => (
          <div
            key={detection.id}
            className={`absolute border-2 transition-all duration-700 ${
              detection.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{
              left: `${detection.x}%`,
              top: `${detection.y}%`,
              width: `${detection.width}%`,
              height: `${detection.height}%`,
              borderColor: detection.color,
              boxShadow: detection.visible ? `0 0 20px ${detection.color}40` : 'none',
            }}
          >
            <div
              className={`absolute -top-7 left-0 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
              style={{
                backgroundColor: detection.color,
                boxShadow: `0 2px 8px ${detection.color}60`,
              }}
            >
              {detection.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-2xl">
          {/* Icon and Title */}
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <VisionKitIcon 
                size={80} 
                className={theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}
              />
            </div>
            <h1 
              className={`text-5xl md:text-6xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
              style={{
                textShadow: theme === 'dark' 
                  ? '0 4px 20px rgba(0,0,0,0.5)' 
                  : '0 4px 20px rgba(255,255,255,0.8)',
              }}
            >
              VisionKit
            </h1>
            <p 
              className={`text-xl md:text-2xl mb-2 ${
                theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'
              }`}
              style={{
                textShadow: theme === 'dark' 
                  ? '0 2px 10px rgba(0,0,0,0.5)' 
                  : '0 2px 10px rgba(255,255,255,0.8)',
              }}
            >
              Визуализация и оценка детекции объектов
            </p>
            <p 
              className={`text-base md:text-lg ${
                theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
              }`}
              style={{
                textShadow: theme === 'dark' 
                  ? '0 2px 10px rgba(0,0,0,0.5)' 
                  : '0 2px 10px rgba(255,255,255,0.8)',
              }}
            >
              Инструмент для анализа результатов нейронных сетей
            </p>
          </div>

          {/* Features */}
          <div className={`mb-10 p-6 rounded-xl backdrop-blur-md ${
            theme === 'dark' 
              ? 'bg-zinc-900/40 border border-zinc-700/50' 
              : 'bg-white/40 border border-gray-300/50'
          }`}>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className={`font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Загрузка данных
                </div>
                <div className={theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}>
                  Изображения, аннотации, предсказания
                </div>
              </div>
              <div>
                <div className={`font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Визуализация
                </div>
                <div className={theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}>
                  Bounding boxes, классы, навигация
                </div>
              </div>
              <div>
                <div className={`font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Метрики
                </div>
                <div className={theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}>
                  IoU, mAP, оценка качества
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <Button
            onClick={onStart}
            size="lg"
            className="text-lg px-8 py-6 shadow-2xl hover:scale-105 transition-transform"
          >
            <Play className="w-5 h-5 mr-2" />
            Начать работу
          </Button>

          {/* Hint */}
          <p 
            className={`mt-6 text-sm ${
              theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'
            }`}
            style={{
              textShadow: theme === 'dark' 
                ? '0 2px 8px rgba(0,0,0,0.5)' 
                : '0 2px 8px rgba(255,255,255,0.8)',
            }}
          >
            Демонстрация детекции объектов на примере морских объектов
          </p>
        </div>
      </div>

      {/* CSS Animation for background scroll */}
      <style>{`
        @keyframes scrollBeachVertical {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }
      `}</style>
    </div>
  );
}