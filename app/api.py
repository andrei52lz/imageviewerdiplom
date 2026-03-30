from pathlib import Path
from tkinter import Tk, filedialog

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

api = FastAPI()

api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}


@api.get("/ping")
def ping():
    return {"message": "pong from python"}


@api.get("/select-image-folder")
def select_image_folder():
    root = Tk()
    root.withdraw()
    root.attributes("-topmost", True)

    folder_path = filedialog.askdirectory(title="Выберите папку с изображениями")

    root.destroy()

    if not folder_path:
        return {
            "count": 0,
            "files": [],
            "folder": None,
        }

    folder = Path(folder_path)

    files = sorted(
        [
            str(p)
            for p in folder.iterdir()
            if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        ]
    )

    return {
        "count": len(files),
        "files": files,
        "folder": str(folder),
    }


@api.get("/image-file")
def image_file(path: str):
    file_path = Path(path)

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    if file_path.suffix.lower() not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    return FileResponse(file_path)


@api.get("/select-gt-folder")
def select_gt_folder():
    root = Tk()
    root.withdraw()
    root.attributes("-topmost", True)

    folder_path = filedialog.askdirectory(title="Выберите папку с Ground Truth")

    root.destroy()

    if not folder_path:
      return {
          "count": 0,
          "files": [],
          "folder": None,
      }

    folder = Path(folder_path)

    txt_files = sorted(
        [
            str(p)
            for p in folder.iterdir()
            if p.is_file() and p.suffix.lower() == ".txt"
        ]
    )

    return {
        "count": len(txt_files),
        "files": txt_files,
        "folder": str(folder),
    }


@api.get("/read-kitti-label")
def read_kitti_label(path: str):
    file_path = Path(path)

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Label file not found")

    lines = file_path.read_text(encoding="utf-8").splitlines()
    boxes = []

    for line in lines:
        parts = line.strip().split()
        if len(parts) < 8:
            continue

        class_name = parts[0]

        try:
            x1 = float(parts[4])
            y1 = float(parts[5])
            x2 = float(parts[6])
            y2 = float(parts[7])
        except ValueError:
            continue

        boxes.append(
            {
                "label": class_name,
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
            }
        )

    return {
        "count": len(boxes),
        "boxes": boxes,
        "file": str(file_path),
    }