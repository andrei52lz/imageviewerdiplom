import React, { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "./ui/button";
import { VisionKitIcon } from "./VisionKitIcon";
import type { Theme } from "../types";

interface WelcomeScreenProps {
  onStart: () => void;
  theme: Theme;
}

const BACKGROUND_IMAGES = [
  "/Image/1.jpg",
  "/Image/2.jpg",
  "/Image/3.jpg",
  "/Image/4.jpg",
  "/Image/5.jpg",
  "/Image/6.jpg",
  "/Image/7.jpg",
  "/Image/8.jpg",
];

const DISPLAY_MS = 9000;
const FADE_MS = 2500;

export function WelcomeScreen({ onStart, theme }: WelcomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageOpacity, setImageOpacity] = useState(1);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setImageOpacity(0);

      window.setTimeout(() => {
        const nextIndex = (currentIndexRef.current + 1) % BACKGROUND_IMAGES.length;
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
        setImageOpacity(1);
      }, FADE_MS);
    }, DISPLAY_MS);

    return () => window.clearInterval(timer);
  }, []);

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
      <div
        className={
          theme === "dark"
            ? "absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/60"
            : "absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/45"
        }
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/35 p-8 text-center shadow-xl backdrop-blur-sm">
          <div className="mb-6 flex justify-center">
            <VisionKitIcon size={64} className="text-white drop-shadow-md" />
          </div>

          <h1
            className="mb-3 text-4xl font-bold text-white"
            style={{ textShadow: "0 3px 14px rgba(0,0,0,0.5)" }}
          >
            VisionKit
          </h1>
          <p
            className="mb-1 text-base text-white/85"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          >
            Визуализация и оценка детекции объектов
          </p>
          <p
            className="mb-7 text-sm text-white/60"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          >
            KITTI Ground Truth, YOLO Predictions, mAP@0.5
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
