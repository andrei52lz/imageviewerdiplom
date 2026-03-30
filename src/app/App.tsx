import React, { useState, useEffect } from "react";
import { ImageViewer } from "./components/ImageViewer";
import { MetricsPanel } from "./components/MetricsPanel";
import { LegendPanel } from "./components/LegendPanel";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { VisionKitIcon } from "./components/VisionKitIcon";
import { Button } from "./components/ui/button";
import {
  FolderOpen,
  Target,
  Brain,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

type UiBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  type: "ground-truth" | "prediction";
};

// Default class colors
const DEFAULT_CLASS_COLORS: Record<string, string> = {
  Car: "#3B82F6",
  Van: "#8B5CF6",
  Truck: "#EF4444",
  Pedestrian: "#10B981",
  Person_sitting: "#F59E0B",
  Cyclist: "#06B6D4",
  Tram: "#EC4899",
  Misc: "#6366F1",
  DontCare: "#6B7280",
};

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [groundTruthLoaded, setGroundTruthLoaded] = useState(false);
  const [predictionsLoaded, setPredictionsLoaded] = useState(false);
  const [metricsCalculated, setMetricsCalculated] = useState(false);

  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [groundTruthFiles, setGroundTruthFiles] = useState<string[]>([]);
  const [boundingBoxes, setBoundingBoxes] = useState<UiBoundingBox[]>([]);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [classColors, setClassColors] = useState<Record<string, string>>(
    DEFAULT_CLASS_COLORS
  );

  useEffect(() => {
    const loadBoxesForCurrentImage = async () => {
      if (
        !groundTruthLoaded ||
        imagePaths.length === 0 ||
        groundTruthFiles.length === 0
      ) {
        setBoundingBoxes([]);
        return;
      }

      const currentImagePath = imagePaths[currentImageIndex];
      const imageName = currentImagePath
        .split(/[/\\]/)
        .pop()
        ?.replace(/\.[^.]+$/, "");

      const matchedLabelPath = groundTruthFiles.find((filePath) => {
        const fileName = filePath
          .split(/[/\\]/)
          .pop()
          ?.replace(/\.[^.]+$/, "");
        return fileName === imageName;
      });

      if (!matchedLabelPath) {
        setBoundingBoxes([]);
        return;
      }

      try {
        const res = await fetch(
          `http://127.0.0.1:8000/read-kitti-label?path=${encodeURIComponent(
            matchedLabelPath
          )}`
        );

        if (!res.ok) {
          setBoundingBoxes([]);
          return;
        }

        const data = await res.json();

        const mappedBoxes: UiBoundingBox[] = (data.boxes || []).map(
          (box: any) => ({
            x: box.x1,
            y: box.y1,
            width: box.x2 - box.x1,
            height: box.y2 - box.y1,
            label: `${box.label} (GT)`,
            color: classColors[box.label] || "#FFFFFF",
            type: "ground-truth",
          })
        );

        setBoundingBoxes(mappedBoxes);
      } catch (error) {
        console.error(error);
        setBoundingBoxes([]);
      }
    };

    loadBoxesForCurrentImage();
  }, [
    currentImageIndex,
    imagePaths,
    groundTruthFiles,
    groundTruthLoaded,
    classColors,
  ]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!imagesLoaded) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imagesLoaded, currentImageIndex, imagePaths]);

  // Mock metrics
  const classMetrics = [
    { className: "Car", iou: 0.87, color: classColors.Car },
    {
      className: "Pedestrian",
      iou: 0.82,
      color: classColors.Pedestrian,
    },
    {
      className: "Cyclist",
      iou: 0.79,
      color: classColors.Cyclist,
    },
    { className: "Van", iou: 0.65, color: classColors.Van },
    { className: "Truck", iou: 0.71, color: classColors.Truck },
  ];

  const legendItems = Object.entries(classColors).map(
    ([label, color]) => ({
      label,
      color,
    })
  );

  const handleLoadImages = async () => {
    if (imagesLoaded) {
      setImagesLoaded(false);
      setGroundTruthLoaded(false);
      setPredictionsLoaded(false);
      setMetricsCalculated(false);

      setImagePaths([]);
      setGroundTruthFiles([]);
      setBoundingBoxes([]);
      setCurrentImageIndex(0);

      toast.info("Изображения выгружены");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/select-image-folder");
      const data = await res.json();

      if (!data.count || data.count === 0) {
        toast.info("Папка не выбрана или не содержит изображений");
        return;
      }

      setImagePaths(data.files);
      setGroundTruthFiles([]);
      setBoundingBoxes([]);
      setCurrentImageIndex(0);

      setImagesLoaded(true);
      setGroundTruthLoaded(false);
      setPredictionsLoaded(false);
      setMetricsCalculated(false);

      toast.success("Изображения загружены успешно", {
        description: `Найдено изображений: ${data.count}`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Ошибка подключения к Python");
    }
  };

  const handleLoadGroundTruth = async () => {
    if (!imagesLoaded) {
      toast.error("Сначала загрузите изображения");
      return;
    }

    if (groundTruthLoaded) {
      setGroundTruthLoaded(false);
      setMetricsCalculated(false);
      setGroundTruthFiles([]);
      setBoundingBoxes([]);
      toast.info("Ground truth выгружен");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/select-gt-folder");
      const data = await res.json();

      if (!data.count || data.count === 0) {
        toast.info("Папка не выбрана или не содержит txt-файлов");
        return;
      }

      setGroundTruthFiles(data.files);
      setGroundTruthLoaded(true);

      toast.success("Ground truth загружен", {
        description: `Файлов аннотаций: ${data.count}`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Ошибка загрузки Ground Truth");
    }
  };

  const handleLoadPredictions = () => {
    if (!imagesLoaded) {
      toast.error("Сначала загрузите изображения");
      return;
    }

    if (predictionsLoaded) {
      setPredictionsLoaded(false);
      setMetricsCalculated(false);
      toast.info("Предсказания выгружены");
    } else {
      setPredictionsLoaded(true);
      toast.success("Предсказания загружены", {
        description: "Предсказания сети загружены успешно",
      });
    }
  };

  const handleCalculateMetrics = () => {
    if (!groundTruthLoaded || !predictionsLoaded) {
      toast.error("Сначала загрузите ground truth и предсказания");
      return;
    }

    if (metricsCalculated) {
      setMetricsCalculated(false);
      toast.info("Метрики сброшены");
    } else {
      setMetricsCalculated(true);
      toast.success("Метрики рассчитаны", {
        description: "IoU и mAP вычислены для всех классов",
      });
    }
  };

  const handlePrevious = () => {
    if (!imagesLoaded || imagePaths.length === 0) {
      toast.error("Сначала загрузите изображения");
      return;
    }

    setCurrentImageIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (!imagesLoaded || imagePaths.length === 0) {
      toast.error("Сначала загрузите изображения");
      return;
    }

    setCurrentImageIndex((prev) =>
      Math.min(prev + 1, imagePaths.length - 1)
    );
  };

  // Show welcome screen if not dismissed
  if (showWelcome) {
    return (
      <WelcomeScreen
        onStart={() => setShowWelcome(false)}
        theme={theme}
      />
    );
  }

  return (
    <div
      className={`min-h-screen p-6 ${
        theme === "dark"
          ? "bg-zinc-950 text-white"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      <Toaster theme={theme} />

      {/* Settings Sidebar */}
      <SettingsSidebar
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        classColors={classColors}
        onClassColorsChange={setClassColors}
        onExitToWelcome={() => {
          setShowWelcome(true);
          setSettingsOpen(false);
        }}
      />

      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <VisionKitIcon
              size={48}
              className={
                theme === "dark"
                  ? "text-blue-500"
                  : "text-blue-600"
              }
            />
            <div>
              <h1
                className={`text-2xl mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                VisionKit
              </h1>
              <p
                className={`text-sm ${theme === "dark" ? "text-zinc-400" : "text-gray-600"}`}
              >
                Инструмент визуализации и оценки детекции
                объектов
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="h-10 w-10"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr,380px] gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Image Display */}
            <div
              className={`rounded-lg p-6 border ${
                theme === "dark"
                  ? "bg-zinc-900 border-zinc-800"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-base ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  Отображение изображения
                </h2>
                <div
                  className={`text-sm ${theme === "dark" ? "text-zinc-400" : "text-gray-600"}`}
                >
                  Кадр {imagePaths.length > 0 ? currentImageIndex + 1 : 0} / {imagePaths.length}
                </div>
              </div>

              {imagesLoaded ? (
                <ImageViewer
                  imageUrl={
                    imagePaths[currentImageIndex]
                      ? `http://127.0.0.1:8000/image-file?path=${encodeURIComponent(
                          imagePaths[currentImageIndex]
                        )}`
                      : ""
                  }
                  boundingBoxes={boundingBoxes}
                  theme={theme}
                />
              ) : (
                <div
                  className={`rounded-lg border aspect-video flex items-center justify-center ${
                    theme === "dark"
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-gray-100 border-gray-300"
                  }`}
                >
                  <div className="text-center">
                    <FolderOpen
                      className={`w-12 h-12 mx-auto mb-3 ${
                        theme === "dark"
                          ? "text-zinc-600"
                          : "text-gray-400"
                      }`}
                    />
                    <p
                      className={
                        theme === "dark"
                          ? "text-zinc-500"
                          : "text-gray-500"
                      }
                    >
                      Изображения не загружены
                    </p>
                    <p
                      className={`text-sm mt-1 ${
                        theme === "dark"
                          ? "text-zinc-600"
                          : "text-gray-400"
                      }`}
                    >
                      Нажмите "Загрузить изображения" для начала
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div
              className={`rounded-lg p-4 border ${
                theme === "dark"
                  ? "bg-zinc-900 border-zinc-800"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleLoadImages}
                    variant={imagesLoaded ? "secondary" : "default"}
                    className="flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Загрузить изображения
                  </Button>

                  <Button
                    onClick={handleLoadGroundTruth}
                    variant={groundTruthLoaded ? "secondary" : "default"}
                    className="flex items-center gap-2"
                    disabled={!imagesLoaded}
                  >
                    <Target className="w-4 h-4" />
                    Загрузить Ground Truth
                  </Button>

                  <Button
                    onClick={handleLoadPredictions}
                    variant={predictionsLoaded ? "secondary" : "default"}
                    className="flex items-center gap-2"
                    disabled={!imagesLoaded}
                  >
                    <Brain className="w-4 h-4" />
                    Загрузить предсказания
                  </Button>

                  <Button
                    onClick={handleCalculateMetrics}
                    variant={metricsCalculated ? "secondary" : "default"}
                    className="flex items-center gap-2"
                    disabled={!groundTruthLoaded || !predictionsLoaded}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Рассчитать метрики
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    size="icon"
                    disabled={imagePaths.length === 0 || currentImageIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <Button
                    onClick={handleNext}
                    variant="outline"
                    size="icon"
                    disabled={
                      imagePaths.length === 0 ||
                      currentImageIndex >= imagePaths.length - 1
                    }
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Legend */}
            {(groundTruthLoaded || predictionsLoaded) && (
              <LegendPanel items={legendItems} theme={theme} />
            )}
          </div>

          {/* Right Column - Metrics */}
          <div>
            {metricsCalculated ? (
              <MetricsPanel
                classMetrics={classMetrics}
                mAP={0.768}
                theme={theme}
              />
            ) : (
              <div
                className={`rounded-lg p-6 border ${
                  theme === "dark"
                    ? "bg-zinc-800 border-zinc-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <h2
                  className={`text-lg mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  Метрики детекции
                </h2>
                <div
                  className={`rounded-lg border p-8 text-center ${
                    theme === "dark"
                      ? "bg-zinc-900 border-zinc-700"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <BarChart3
                    className={`w-12 h-12 mx-auto mb-3 ${
                      theme === "dark"
                        ? "text-zinc-600"
                        : "text-gray-400"
                    }`}
                  />
                  <p
                    className={
                      theme === "dark"
                        ? "text-zinc-500"
                        : "text-gray-500"
                    }
                  >
                    Метрики недоступны
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      theme === "dark"
                        ? "text-zinc-600"
                        : "text-gray-400"
                    }`}
                  >
                    Загрузите данные и рассчитайте метрики
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}