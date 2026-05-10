import React, { useState, useEffect } from "react";
import { ImageViewer } from "./components/ImageViewer";
import { MetricsPanel } from "./components/MetricsPanel";
import { LegendPanel } from "./components/LegendPanel";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { VisionKitIcon } from "./components/VisionKitIcon";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import type {
  ApiHealth,
  ApiBox,
  FolderSelectionResponse,
  LabelResponse,
  MetricsResult,
  PythonDebugStatus,
  Theme,
  UiBoundingBox,
} from "./types";
import {
  FolderOpen,
  Target,
  Brain,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

const API_BASE_URL = "http://127.0.0.1:8000";
type ConnectionStatus = "checking" | "connected" | "disconnected";
const REQUEST_TIMEOUT_MS = 10000;

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

function getPathStem(path: string) {
  return path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? "";
}

function mapApiBoxToUiBox(
  box: ApiBox,
  type: UiBoundingBox["type"],
  classColors: Record<string, string>
): UiBoundingBox {
  return {
    x: box.x1,
    y: box.y1,
    width: box.x2 - box.x1,
    height: box.y2 - box.y1,
    label: `${box.label} (${type === "ground-truth" ? "GT" : "Pred"})`,
    color: classColors[box.label] || "#FFFFFF",
    type,
  };
}

class ApiRequestError extends Error {
  status?: number;
  category: string;
  url?: string;
  responseBody?: string;

  constructor(
    message: string,
    category: string,
    status?: number,
    url?: string,
    responseBody?: string
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.category = category;
    this.status = status;
    this.url = url;
    this.responseBody = responseBody;
  }
}

async function readResponseBody(response: Response): Promise<string> {
  return response.text();
}

function parseJsonResponse<T>(body: string, url: string): T {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ApiRequestError(
      "invalid API response: backend returned non-JSON response",
      "invalid_api_response",
      undefined,
      url,
      body.slice(0, 1000)
    );
  }
}

function readErrorMessage(status: number, body: string): string {
  try {
    const data = JSON.parse(body) as { detail?: string; message?: string };
    if (data.detail) {
      return data.detail;
    }
    if (data.message) {
      return data.message;
    }
  } catch {
    if (body.trim()) {
      return body.slice(0, 500);
    }
  }

  return `internal server error: HTTP ${status}`;
}

function classifyFetchError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "timeout: Python API did not respond in time";
  }

  if (error instanceof TypeError) {
    if (!navigator.onLine) {
      return "network offline: browser reports no network connection";
    }

    return "backend not running or connection refused/CORS blocked";
  }

  return getErrorMessage(error);
}

async function probeBackendReachability(baseUrl: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);

  try {
    await fetch(`${baseUrl}/ping`, {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return "cors_error: backend port is reachable, but browser blocked the API response";
  } catch (error) {
    console.error("[VisionKit API] reachability probe failed", error);
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      return "timeout: backend did not answer on 127.0.0.1:8000";
    }

    return "backend not running or connection refused on 127.0.0.1:8000";
  } finally {
    window.clearTimeout(timeout);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Неизвестная ошибка";
}

async function requestJson<T>(url: string, options?: RequestInit, retries = 8): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const startedAt = performance.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      console.info("[VisionKit API] request", {
        url,
        method: options?.method ?? "GET",
        attempt: attempt + 1,
      });

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      const body = await readResponseBody(response);
      const durationMs = Math.round(performance.now() - startedAt);

      console.info("[VisionKit API] response", {
        url,
        status: response.status,
        durationMs,
        body: body.slice(0, 1500),
      });

      if (!response.ok) {
        throw new ApiRequestError(
          readErrorMessage(response.status, body),
          response.status >= 500 ? "internal_server_error" : "http_error",
          response.status,
          url,
          body.slice(0, 1500)
        );
      }

      return parseJsonResponse<T>(body, url);
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      console.error("[VisionKit API] request failed", {
        url,
        method: options?.method ?? "GET",
        attempt: attempt + 1,
        durationMs,
        error,
      });
      console.error(error);
      if (error instanceof Error) {
        console.error(error.message);
        console.error(error.stack);
      }

      if (error instanceof ApiRequestError) {
        throw error;
      }

      lastError = error;
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw new ApiRequestError(
    classifyFetchError(lastError),
    "network_error",
    undefined,
    url
  );
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [groundTruthLoaded, setGroundTruthLoaded] = useState(false);
  const [predictionsLoaded, setPredictionsLoaded] = useState(false);
  const [metricsCalculated, setMetricsCalculated] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [groundTruthFiles, setGroundTruthFiles] = useState<string[]>([]);
  const [boundingBoxes, setBoundingBoxes] = useState<UiBoundingBox[]>([]);
  const [predictionFiles, setPredictionFiles] = useState<string[]>([]);
  const [metricsResult, setMetricsResult] = useState<MetricsResult | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("checking");
  const [connectionMessage, setConnectionMessage] =
    useState("Проверка Python API...");
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [pythonDebugStatus, setPythonDebugStatus] =
    useState<PythonDebugStatus | null>(null);

  const [theme, setTheme] = useState<Theme>("dark");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [classColors, setClassColors] = useState<Record<string, string>>(
    DEFAULT_CLASS_COLORS
  );

  const resetLoadedData = () => {
    setImagesLoaded(false);
    setGroundTruthLoaded(false);
    setPredictionsLoaded(false);
    setMetricsCalculated(false);
    setMetricsResult(null);
    setImagePaths([]);
    setGroundTruthFiles([]);
    setPredictionFiles([]);
    setBoundingBoxes([]);
    setCurrentImageIndex(0);
  };

  const checkBackendConnection = async () => {
    setConnectionStatus((status) => {
      if (status !== "connected") {
        setConnectionMessage("Проверка Python API...");
        return "checking";
      }
      return status;
    });

    try {
      const health = await requestJson<ApiHealth>(`${API_BASE_URL}/api/health`, undefined, 2);
      const debug = await requestJson<PythonDebugStatus>(
        `${API_BASE_URL}/api/debug/python`,
        undefined,
        1
      );
      setApiHealth(health);
      setPythonDebugStatus(debug);
      setConnectionStatus("connected");
      setConnectionMessage(
        `Python ${health.pythonVersion} подключен, PID ${health.pid}`
      );
    } catch (error) {
      console.error("[VisionKit API] health-check failed", error);
      if (error instanceof Error) {
        console.error(error.message);
        console.error(error.stack);
      }
      const diagnosis = await probeBackendReachability(API_BASE_URL);
      setApiHealth(null);
      setPythonDebugStatus(null);
      setConnectionStatus("disconnected");
      setConnectionMessage(`Python API недоступен: ${diagnosis}`);
    }
  };

  useEffect(() => {
    void checkBackendConnection();
    const timer = window.setInterval(() => {
      void checkBackendConnection();
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadBoxesForCurrentImage = async () => {
      if (imagePaths.length === 0) {
        setBoundingBoxes([]);
        return;
      }

      const currentImagePath = imagePaths[currentImageIndex];
      const imageStem = getPathStem(currentImagePath);
      const allBoxes: UiBoundingBox[] = [];

      if (groundTruthLoaded) {
        const matchedGtPath = groundTruthFiles.find(
          (filePath) => getPathStem(filePath) === imageStem
        );

        if (matchedGtPath) {
          const data = await requestJson<LabelResponse>(
            `${API_BASE_URL}/read-kitti-label?path=${encodeURIComponent(matchedGtPath)}`
          );
          allBoxes.push(
            ...data.boxes.map((box) => mapApiBoxToUiBox(box, "ground-truth", classColors))
          );
        }
      }

      if (predictionsLoaded) {
        const matchedPredPath = predictionFiles.find(
          (filePath) => getPathStem(filePath) === imageStem
        );

        if (matchedPredPath) {
          const data = await requestJson<LabelResponse>(
            `${API_BASE_URL}/read-yolo-label?label_path=${encodeURIComponent(
              matchedPredPath
            )}&image_path=${encodeURIComponent(currentImagePath)}`
          );
          allBoxes.push(
            ...data.boxes.map((box) => mapApiBoxToUiBox(box, "prediction", classColors))
          );
        }
      }

      setBoundingBoxes(allBoxes);
    };

    loadBoxesForCurrentImage().catch(() => {
      setBoundingBoxes([]);
      toast.error("Ошибка загрузки bbox для текущего изображения");
    });
  }, [
    currentImageIndex,
    imagePaths,
    groundTruthFiles,
    predictionFiles,
    groundTruthLoaded,
    predictionsLoaded,
    classColors,
  ]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!imagesLoaded) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentImageIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentImageIndex((prev) => Math.min(prev + 1, imagePaths.length - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imagesLoaded, currentImageIndex, imagePaths]);

  const legendItems = Object.entries(classColors).map(
    ([label, color]) => ({
      label,
      color,
    })
  );

  const handleLoadImages = async () => {
    if (imagesLoaded) {
      resetLoadedData();
      toast.info("Изображения выгружены");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/select-image-folder");

      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }

      const data = (await res.json()) as FolderSelectionResponse;

      if (!data.count || data.count === 0) {
        toast.info("Папка не выбрана или не содержит изображений");
        return;
      }

      setImagePaths(data.files);
      setGroundTruthFiles([]);
      setPredictionFiles([]);
      setBoundingBoxes([]);
      setCurrentImageIndex(0);

      setImagesLoaded(true);
      setGroundTruthLoaded(false);
      setPredictionsLoaded(false);
      setMetricsCalculated(false);
      setMetricsResult(null);

      toast.success("Изображения загружены успешно", {
        description: `Найдено изображений: ${data.count}`,
      });
    } catch (error) {
      console.error("select-image-folder error:", error);
      toast.error("Ошибка выбора папки изображений", {
        description: "Проверь, что backend запущен на http://127.0.0.1:8000",
      });
    }
  };

  const handleLoadGroundTruth = async () => {
    if (!imagesLoaded) {
      toast.error("Сначала загрузите изображения");
      return;
    }

    if (connectionStatus !== "connected") {
      toast.warning("Ground Truth требует Python API", {
        description: "Проверьте статус подключения Python API",
      });
      return;
    }

    if (groundTruthLoaded) {
      setGroundTruthLoaded(false);
      setMetricsCalculated(false);
      setMetricsResult(null);
      setGroundTruthFiles([]);
      setBoundingBoxes([]);
      toast.info("Ground truth выгружен");
      return;
    }

    try {
      const data = await requestJson<FolderSelectionResponse>(
        `${API_BASE_URL}/select-gt-folder`
      );

      if (!data.count || data.count === 0) {
        toast.info("Папка не выбрана или не содержит txt-файлов");
        return;
      }

      setGroundTruthFiles(data.files);
      setGroundTruthLoaded(true);
      setMetricsCalculated(false);
      setMetricsResult(null);

      toast.success("Ground truth загружен", {
        description: `Файлов аннотаций: ${data.count}`,
      });
    } catch (error) {
      toast.error("Ошибка загрузки Ground Truth", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleLoadPredictions = async () => {
    if (!imagesLoaded) {
      toast.error("Сначала загрузите изображения");
      return;
    }

    if (connectionStatus !== "connected") {
      toast.warning("Predictions требуют Python API", {
        description: "Проверьте статус подключения Python API",
      });
      return;
    }

    if (predictionsLoaded) {
      setPredictionsLoaded(false);
      setMetricsCalculated(false);
      setMetricsResult(null);
      setPredictionFiles([]);
      setBoundingBoxes([]);
      toast.info("Предсказания выгружены");
      return;
    }

    try {
      const data = await requestJson<FolderSelectionResponse>(
        `${API_BASE_URL}/select-pred-folder`
      );

      if (!data.count || data.count === 0) {
        toast.info("Папка не выбрана или не содержит txt-файлов");
        return;
      }

      setPredictionFiles(data.files);
      setPredictionsLoaded(true);
      setMetricsCalculated(false);
      setMetricsResult(null);

      toast.success("Предсказания загружены", {
        description: `Файлов предсказаний: ${data.count}`,
      });
    } catch (error) {
      toast.error("Ошибка загрузки Predictions", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleCalculateMetrics = async () => {
    if (connectionStatus !== "connected") {
      toast.warning("Расчет метрик требует Python API", {
        description: "Проверьте статус Python API и лог backend",
      });
      return;
    }

    if (!groundTruthLoaded || !predictionsLoaded) {
      toast.error("Сначала загрузите ground truth и предсказания");
      return;
    }

    if (metricsCalculated) {
      setMetricsCalculated(false);
      setMetricsResult(null);
      toast.info("Метрики сброшены");
      return;
    }

    setMetricsLoading(true);

    try {
      const data = await requestJson<MetricsResult>(`${API_BASE_URL}/calculate-metrics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_paths: imagePaths,
          gt_files: groundTruthFiles,
          pred_files: predictionFiles,
          iou_threshold: 0.5,
        }),
      });

      setMetricsResult(data);
      setMetricsCalculated(true);
      toast.success("Метрики рассчитаны", {
        description: "mAP@0.5, Precision, Recall и IoU вычислены для всех классов",
      });
    } catch (error) {
      setMetricsCalculated(false);
      setMetricsResult(null);
      toast.error("Ошибка расчета метрик", {
        description: getErrorMessage(error),
      });
    } finally {
      setMetricsLoading(false);
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

          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={connectionStatus === "connected" ? "secondary" : "outline"}
              className={
                connectionStatus === "connected"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : connectionStatus === "checking"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }
              title={apiHealth?.logFile ? `Лог: ${apiHealth.logFile}` : connectionMessage}
            >
              <Server className="w-3 h-3" />
              {connectionStatus === "connected"
                ? "Python подключен"
                : connectionStatus === "checking"
                  ? "Проверка Python"
                  : "Python API offline"}
            </Badge>
            <span
              className={`max-w-[360px] text-right text-xs ${
                theme === "dark" ? "text-zinc-500" : "text-gray-500"
              }`}
            >
              {connectionMessage}
              {pythonDebugStatus?.lastError
                ? ` Последняя ошибка: ${pythonDebugStatus.lastError.type}`
                : ""}
            </span>
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
                      ? `${API_BASE_URL}/image-file?path=${encodeURIComponent(
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
                    {imagesLoaded ? "Выгрузить изображения" : "Выбрать папку изображений"}
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
                    disabled={
                      !groundTruthLoaded ||
                      !predictionsLoaded ||
                      metricsLoading
                    }
                  >
                    <BarChart3 className="w-4 h-4" />
                    {metricsLoading ? "Расчет метрик..." : "Рассчитать метрики"}
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
            {metricsCalculated && metricsResult ? (
              <MetricsPanel
                metrics={metricsResult}
                classColors={classColors}
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
