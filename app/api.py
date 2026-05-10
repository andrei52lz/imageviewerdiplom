import logging
import os
import shutil
import sys
import time
import traceback
from pathlib import Path
from tkinter import Tk, filedialog
from typing import Any, Callable, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .detection_metrics import calculate_detection_metrics
from .label_io import IMAGE_EXTENSIONS, box_to_dict, list_files, read_kitti_boxes, read_yolo_boxes
from .schemas import CalculateMetricsRequest


logger = logging.getLogger(__name__)
api = FastAPI(title="VisionKit API")
LAST_ERROR: dict[str, Any] | None = None
DirectoryPicker = Callable[[str], Optional[Path]]
DIRECTORY_PICKER: DirectoryPicker | None = None


def set_directory_picker(picker: DirectoryPicker | None) -> None:
    global DIRECTORY_PICKER
    DIRECTORY_PICKER = picker


def resource_path(relative_path: str) -> Path:
    if getattr(sys, "frozen", False):
        base_dir = Path(getattr(sys, "_MEIPASS"))
    else:
        base_dir = Path(__file__).resolve().parent.parent

    return (base_dir / relative_path).resolve()


DIST_DIR = resource_path("dist")
INDEX_HTML = DIST_DIR / "index.html"

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def remember_error(source: str, exc: BaseException) -> None:
    global LAST_ERROR
    LAST_ERROR = {
        "source": source,
        "type": type(exc).__name__,
        "message": str(exc),
        "traceback": traceback.format_exc(),
        "timestamp": time.time(),
    }
    logger.exception("%s failed", source)


def remember_route_error(source: str, status_code: int, detail: Any) -> None:
    global LAST_ERROR
    LAST_ERROR = {
        "source": source,
        "type": "HTTPException",
        "message": str(detail),
        "traceback": "",
        "statusCode": status_code,
        "timestamp": time.time(),
    }


def get_python_debug_payload() -> dict[str, Any]:
    active_venv = os.getenv("VIRTUAL_ENV")
    conda_env = os.getenv("CONDA_PREFIX")
    executable = sys.executable

    return {
        "status": "ok",
        "service": "VisionKit API",
        "backend": {
            "running": True,
            "pid": os.getpid(),
            "cwd": str(Path.cwd()),
            "frozen": bool(getattr(sys, "frozen", False)),
            "logFile": os.getenv("VISIONKIT_LOG_FILE"),
        },
        "python": {
            "found": bool(executable and Path(executable).exists()),
            "executable": executable,
            "version": sys.version.split()[0],
            "prefix": sys.prefix,
            "basePrefix": sys.base_prefix,
            "path": sys.path[:10],
            "whichPython": shutil.which("python"),
            "whichPy": shutil.which("py"),
        },
        "virtualEnvironment": {
            "active": bool(active_venv or conda_env or sys.prefix != sys.base_prefix),
            "virtualEnv": active_venv,
            "condaPrefix": conda_env,
        },
        "subprocess": {
            "mode": "embedded-thread",
            "enabled": False,
            "lastError": None,
        },
        "imports": {
            "fastapi": True,
            "uvicorn": True,
            "pyside6": _can_import("PySide6"),
            "pillow": _can_import("PIL"),
            "tkinter": _can_import("tkinter"),
        },
        "lastError": LAST_ERROR,
    }


def _can_import(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except Exception as exc:
        logger.warning("Import diagnostic failed for %s: %s", module_name, exc)
        return False


@api.middleware("http")
async def log_requests(request: Request, call_next):
    started_at = time.perf_counter()
    logger.info("API request started: %s %s", request.method, request.url)

    try:
        response = await call_next(request)
    except Exception as exc:
        remember_error(f"{request.method} {request.url.path}", exc)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "errorType": type(exc).__name__,
                "message": str(exc),
                "traceback": traceback.format_exc(),
            },
        )

    duration_ms = (time.perf_counter() - started_at) * 1000
    logger.info(
        "API request finished: %s %s status=%s duration_ms=%.1f",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@api.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    remember_route_error(f"{request.method} {request.url.path}", exc.status_code, exc.detail)
    logger.warning(
        "API route error: %s %s status=%s detail=%s",
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "errorType": "HTTPException",
            "path": request.url.path,
        },
    )


@api.get("/ping")
def ping():
    return {"message": "pong from VisionKit API"}


@api.get("/health")
def health():
    debug = get_python_debug_payload()
    return {
        "status": debug["status"],
        "python": debug["python"]["found"],
        "version": debug["python"]["version"],
        "service": debug["service"],
        "pythonExecutable": debug["python"]["executable"],
        "pythonVersion": debug["python"]["version"],
        "frozen": debug["backend"]["frozen"],
        "pid": debug["backend"]["pid"],
        "cwd": debug["backend"]["cwd"],
        "logFile": debug["backend"]["logFile"],
        "lastError": debug["lastError"],
    }


@api.get("/api/health")
def api_health():
    return health()


@api.get("/api/status")
def api_status():
    return get_python_debug_payload()


@api.get("/api/debug/python")
def debug_python():
    return get_python_debug_payload()


@api.get("/")
def frontend_index():
    if not INDEX_HTML.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    return FileResponse(INDEX_HTML)


@api.get("/logo.svg")
def frontend_logo():
    logo_path = DIST_DIR / "logo.svg"
    if not logo_path.exists():
        raise HTTPException(status_code=404, detail="Logo not found")

    return FileResponse(logo_path)


@api.get("/icon.ico")
def frontend_icon():
    icon_path = DIST_DIR / "icon.ico"
    if not icon_path.exists():
        raise HTTPException(status_code=404, detail="Icon not found")

    return FileResponse(icon_path)


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
    if DIRECTORY_PICKER is not None:
        try:
            logger.info("Opening directory picker through desktop bridge: %s", title)
            folder = DIRECTORY_PICKER(title)
        except Exception as exc:
            logger.exception("Desktop directory picker failed")
            raise HTTPException(
                status_code=500,
                detail=f"Desktop directory picker failed: {exc}",
            ) from exc

        if folder is None:
            logger.info("Desktop directory picker cancelled: %s", title)
            return None

        logger.info("Desktop directory selected: %s", folder)
        return folder

    root = None

    try:
        logger.info("Opening directory picker: %s", title)
        root = Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        root.lift()
        root.focus_force()
        root.update()

        folder_path = filedialog.askdirectory(
            parent=root,
            title=title,
            mustexist=True,
        )
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


if (DIST_DIR / "assets").exists():
    api.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="frontend-assets")

if (DIST_DIR / "Image").exists():
    api.mount("/Image", StaticFiles(directory=DIST_DIR / "Image"), name="frontend-images")
