from typing import List

from pydantic import BaseModel, Field


class Box(BaseModel):
    label: str
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float = 1.0


class CalculateMetricsRequest(BaseModel):
    image_paths: List[str] = Field(default_factory=list)
    gt_files: List[str] = Field(default_factory=list)
    pred_files: List[str] = Field(default_factory=list)
    iou_threshold: float = 0.5
