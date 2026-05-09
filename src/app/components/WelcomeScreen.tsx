import React, { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "./ui/button";
import { VisionKitIcon } from "./VisionKitIcon";
import type { Theme } from "../types";

interface WelcomeScreenProps {
  onStart: () => void;
  theme: Theme;
}

interface Box {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const BACKGROUND_IMAGES = Array.from(
  { length: 8 },
  (_, index) => `${import.meta.env.BASE_URL}Image/${index + 1}.jpg`
);

const DETECTION_SETS: Box[][] = [
  [
    { id: 1, x: 8, y: 28, w: 22, h: 18, color: "#3B82F6" },
    { id: 2, x: 42, y: 55, w: 14, h: 11, color: "#10B981" },
    { id: 3, x: 68, y: 20, w: 19, h: 22, color: "#F59E0B" },
    { id: 4, x: 27, y: 64, w: 16, h: 13, color: "#8B5CF6" },
    { id: 5, x: 78, y: 58, w: 15, h: 17, color: "#EF4444" },
  ],
  [
    { id: 1, x: 5, y: 60, w: 28, h: 14, color: "#06B6D4" },
    { id: 2, x: 38, y: 45, w: 12, h: 20, color: "#3B82F6" },
    { id: 3, x: 62, y: 65, w: 25, h: 12, color: "#EC4899" },
    { id: 4, x: 80, y: 28, w: 14, h: 18, color: "#10B981" },
  ],
  [
    { id: 1, x: 14, y: 15, w: 18, h: 14, color: "#F59E0B" },
    { id: 2, x: 55, y: 18, w: 22, h: 17, color: "#3B82F6" },
    { id: 3, x: 78, y: 48, w: 16, h: 24, color: "#8B5CF6" },
    { id: 4, x: 30, y: 68, w: 20, h: 13, color: "#EF4444" },
    { id: 5, x: 9, y: 54, w: 13, h: 18, color: "#06B6D4" },
    { id: 6, x: 48, y: 60, w: 17, h: 12, color: "#10B981" },
  ],
  [
    { id: 1, x: 8, y: 28, w: 30, h: 24, color: "#3B82F6" },
    { id: 2, x: 56, y: 38, w: 28, h: 26, color: "#EF4444" },
    { id: 3, x: 33, y: 64, w: 22, h: 16, color: "#10B981" },
  ],
  [
    { id: 1, x: 5, y: 14, w: 16, h: 13, color: "#EC4899" },
    { id: 2, x: 22, y: 30, w: 18, h: 16, color: "#8B5CF6" },
    { id: 3, x: 44, y: 44, w: 20, h: 18, color: "#3B82F6" },
    { id: 4, x: 67, y: 59, w: 17, h: 20, color: "#F59E0B" },
    { id: 5, x: 82, y: 20, w: 14, h: 14, color: "#06B6D4" },
  ],
  [
    { id: 1, x: 29, y: 24, w: 18, h: 15, color: "#10B981" },
    { id: 2, x: 49, y: 28, w: 22, h: 22, color: "#3B82F6" },
    { id: 3, x: 34, y: 55, w: 17, h: 19, color: "#F59E0B" },
    { id: 4, x: 57, y: 57, w: 14, h: 13, color: "#EF4444" },
  ],
  [
    { id: 1, x: 4, y: 10, w: 20, h: 17, color: "#8B5CF6" },
    { id: 2, x: 74, y: 11, w: 18, h: 21, color: "#06B6D4" },
    { id: 3, x: 6, y: 68, w: 22, h: 15, color: "#3B82F6" },
    { id: 4, x: 72, y: 64, w: 20, h: 17, color: "#EC4899" },
    { id: 5, x: 40, y: 38, w: 18, h: 20, color: "#F59E0B" },
  ],
  [
    { id: 1, x: 12, y: 35, w: 24, h: 20, color: "#EF4444" },
    { id: 2, x: 45, y: 22, w: 19, h: 16, color: "#10B981" },
    { id: 3, x: 66, y: 50, w: 21, h: 18, color: "#3B82F6" },
    { id: 4, x: 18, y: 62, w: 16, h: 14, color: "#8B5CF6" },
    { id: 5, x: 75, y: 15, w: 18, h: 22, color: "#06B6D4" },
    { id: 6, x: 52, y: 58, w: 14, h: 16, color: "#F59E0B" },
  ],
];

const DISPLAY_MS = 9000;
const FADE_MS = 3500;

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageOpacity, setImageOpacity] = useState(1);
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const cancelledRef = useRef(false);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    cancelledRef.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        if (!cancelledRef.current) {
          callback();
        }
      }, delay);
      timers.push(timer);
    };

    const showBoxes = (index: number) => {
      DETECTION_SETS[index].forEach((box, boxIndex) => {
        schedule(() => {
          setVisibleIds((previous) => new Set([...previous, box.id]));
        }, 700 + boxIndex * 520);
      });
    };

    const hideBoxes = (index: number) => {
      shuffled(DETECTION_SETS[index]).forEach((box, boxIndex) => {
        schedule(() => {
          setVisibleIds((previous) => {
            const next = new Set(previous);
            next.delete(box.id);
            return next;
          });
        }, boxIndex * 400);
      });
    };

    const beginCycle = () => {
      const index = currentIndexRef.current;
      setImageOpacity(1);
      showBoxes(index);

      schedule(() => {
        setImageOpacity(0);
        hideBoxes(index);

        schedule(() => {
          const nextIndex = (currentIndexRef.current + 1) % BACKGROUND_IMAGES.length;
          currentIndexRef.current = nextIndex;
          setCurrentIndex(nextIndex);
          setVisibleIds(new Set());
          schedule(beginCycle, 80);
        }, FADE_MS + 80);
      }, DISPLAY_MS);
    };

    showBoxes(0);
    schedule(() => {
      setImageOpacity(0);
      hideBoxes(0);

      schedule(() => {
        currentIndexRef.current = 1;
        setCurrentIndex(1);
        setVisibleIds(new Set());
        schedule(beginCycle, 80);
      }, FADE_MS + 80);
    }, DISPLAY_MS);

    return () => {
      cancelledRef.current = true;
      timers.forEach(window.clearTimeout);
    };
  }, []);

  const boxes = DETECTION_SETS[currentIndex] ?? [];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${BACKGROUND_IMAGES[currentIndex]})`,
          opacity: imageOpacity,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      />

      <div className="absolute inset-0 pointer-events-none">
        {boxes.map((box) => {
          const visible = visibleIds.has(box.id);
          return (
            <div
              key={box.id}
              className="absolute border-2"
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                height: `${box.h}%`,
                borderColor: box.color,
                opacity: visible ? 1 : 0,
                transform: visible ? "scale(1)" : "scale(0.94)",
                transition: "opacity 650ms ease-in-out, transform 650ms ease-in-out",
                boxShadow: visible ? `0 0 14px ${box.color}45` : "none",
              }}
            />
          );
        })}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/50 pointer-events-none" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/30 p-8 text-center shadow-xl backdrop-blur-sm">
          <div className="mb-6 flex justify-center">
            <VisionKitIcon size={60} className="text-white drop-shadow-md" />
          </div>
          <h1
            className="mb-3 text-4xl font-bold text-white"
            style={{ textShadow: "0 3px 14px rgba(0,0,0,0.5)" }}
          >
            VisionKit
          </h1>
          <p
            className="mb-1 text-base text-white/80"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          >
            Визуализация и оценка детекции объектов
          </p>
          <p
            className="mb-7 text-sm text-white/55"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          >
            Инструмент для анализа результатов нейронных сетей
          </p>

          <Button
            onClick={onStart}
            size="lg"
            className="w-full border-0 bg-blue-600 px-7 py-5 text-base text-white shadow-xl transition-transform hover:scale-105 hover:bg-blue-700"
          >
            <Play className="mr-2 h-4 w-4" />
            Начать работу
          </Button>
        </div>
      </div>
    </div>
  );
}
