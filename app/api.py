import logging
import os
import sys
from pathlib import Path
from tkinter import Tk, filedialog
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .detection_metrics import calculate_detection_metrics
from .label_io import IMAGE_EXTENSIONS, box_to_dict, list_files, read_kitti_boxes, read_yolo_boxes
from .schemas import CalculateMetricsRequest


logger = logging.getLogger(__name__)
api = FastAPI(title="VisionKit API")

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@api.get("/ping")
def ping():
    return {"message": "pong from VisionKit API"}


@api.get("/health")
def health():
    return {
        "status": "ok",
        "service": "VisionKit API",
        "pythonExecutable": sys.executable,
        "pythonVersion": sys.version.split()[0],
        "frozen": bool(getattr(sys, "frozen", False)),
        "pid": os.getpid(),
        "cwd": str(Path.cwd()),
        "logFile": os.getenv("VISIONKIT_LOG_FILE"),
    }


@api.get("/select-image-folder")
async def select_image_folder():
    folder = ask_directory("Выберите папку с изображениями")
    if folder is None:
        return empty_folder_response()

    files = list_files(folder, IMAGE_EXTENSIONS)
    return {"count": len(files), "files": files, "folder": str(folder)}


@api.get("/image-file")
def image_file(path: str):
    file_path = Path(path)

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image file not found")

    if file_path.suffix.lower() not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    return FileResponse(file_path)


@api.get("/select-gt-folder")
async def select_gt_folder():
    folder = ask_directory("Выберите папку с Ground Truth")
    if folder is None:
        return empty_folder_response()

    files = list_files(folder, {".txt"})
    return {"count": len(files), "files": files, "folder": str(folder)}


@api.get("/read-kitti-label")
def read_kitti_label(path: str):
    file_path = Path(path)

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="KITTI label file not found")

    boxes = read_kitti_boxes(file_path)
    return {
        "count": len(boxes),
        "boxes": [box_to_dict(box) for box in boxes],
        "file": str(file_path),
    }


@api.get("/select-pred-folder")
async def select_pred_folder():
    folder = ask_directory("Выберите папку с Predictions")
    if folder is None:
        return empty_folder_response()

    files = list_files(folder, {".txt"})
    return {"count": len(files), "files": files, "folder": str(folder)}


@api.get("/read-yolo-label")
def read_yolo_label(label_path: str, image_path: str):
    label_file = Path(label_path)
    image_file = Path(image_path)

    if not label_file.exists() or not label_file.is_file():
        raise HTTPException(status_code=404, detail="YOLO label file not found")

    if not image_file.exists() or not image_file.is_file():
        raise HTTPException(status_code=404, detail="Image file not found")

    boxes = read_yolo_boxes(label_file, image_file)
    return {
        "count": len(boxes),
        "boxes": [box_to_dict(box) for box in boxes],
    }


@api.post("/calculate-metrics")
def calculate_metrics(request: CalculateMetricsRequest):
    if not 0 <= request.iou_threshold <= 1:
        raise HTTPException(status_code=400, detail="iou_threshold must be between 0 and 1")

    return calculate_detection_metrics(request)


def ask_directory(title: str) -> Optional[Path]:
    root = None

    try:
        logger.info("Opening directory picker: %s", title)
        root = Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        root.update()

        folder_path = filedialog.askdirectory(parent=root, title=title)
    except Exception as exc:
        logger.exception("Directory picker failed")
        raise HTTPException(
            status_code=500,
            detail=f"Directory picker failed: {exc}",
        ) from exc
    finally:
        if root is not None:
            root.destroy()

    if not folder_path:
        logger.info("Directory picker cancelled: %s", title)
        return None

    logger.info("Directory selected: %s", folder_path)
    return Path(folder_path)


def empty_folder_response():
    return {"count": 0, "files": [], "folder": None}
