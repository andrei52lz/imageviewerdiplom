export type Theme = "light" | "dark";

export type BoundingBoxType = "ground-truth" | "prediction";

export interface UiBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  type: BoundingBoxType;
}

export interface ApiBox {
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence?: number;
}

export interface LabelResponse {
  count: number;
  boxes: ApiBox[];
  file?: string;
}

export interface FolderSelectionResponse {
  count: number;
  files: string[];
  folder: string | null;
}

export interface ClassMetric {
  className: string;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  ap: number;
  iou: number;
  gtCount: number;
  predCount: number;
}

export interface MetricsResult {
  mAP: number;
  precision: number;
  recall: number;
  tp: number;
  fp: number;
  fn: number;
  classMetrics: ClassMetric[];
}

export interface ApiHealth {
  status: "ok";
  service: string;
  pythonExecutable: string;
  pythonVersion: string;
  frozen: boolean;
  pid: number;
  cwd: string;
  logFile: string | null;
}
