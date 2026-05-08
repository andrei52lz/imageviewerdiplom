# VisionKit

VisionKit is a desktop/web application for viewing KITTI images, drawing Ground Truth and Prediction bounding boxes, and calculating object detection metrics.

## Features

- Load an image folder and browse frames.
- Load Ground Truth labels in KITTI `.txt` format.
- Load Prediction labels in YOLO `.txt` format.
- Convert YOLO normalized boxes to pixel bounding boxes using image size.
- Display GT boxes and Prediction boxes on the same image.
- Calculate `mAP@0.5`, Precision, Recall, TP, FP, FN, AP and mean IoU by class.
- Run as a Vite web app or as a PySide6 desktop shell.

## Tech Stack

- Frontend: React, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui components
- Backend: FastAPI
- Desktop: PySide6, QWebEngineView
- Packaging: PyInstaller

## Project Structure

```text
app/
  api.py                 FastAPI routes
  detection_metrics.py   IoU, AP, mAP, TP/FP/FN calculation
  label_io.py            KITTI and YOLO label readers
  main.py                PySide6 desktop shell
src/
  app/
    App.tsx              Main UI state and integration
    types.ts             Shared frontend types
    components/          UI components
public/
  logo.svg               Web logo/favicon
  icon.ico               Windows/desktop icon
```

## Supported Data Formats

Ground Truth uses KITTI labels:

```text
class truncated occluded alpha x1 y1 x2 y2 ...
```

Predictions use YOLO labels:

```text
class_id x_center y_center width height confidence
```

`confidence` is optional. If it is missing, VisionKit uses `1.0`.

Class names are resolved from `data.yaml`, `data.yml`, `dataset.yaml`, `dataset.yml`, or `classes.txt` in the prediction folder or its parent folder. If no mapping is found, KITTI default classes are used.

Image, GT and Prediction files are matched by filename stem, for example:

```text
000123.png
000123.txt
```

## Development Run

Install dependencies:

```powershell
npm install
pip install -r requirements.txt
```

Start the backend:

```powershell
python -m uvicorn app.api:api --host 127.0.0.1 --port 8000
```

Start the frontend:

```powershell
npm run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

Run the desktop shell in dev mode:

```powershell
$env:VISIONKIT_DEV="1"
python app/main.py
```

## User Workflow

1. Click `Загрузить изображения` and select the image folder.
2. Click `Загрузить Ground Truth` and select the KITTI label folder.
3. Click `Загрузить предсказания` and select the YOLO prediction folder.
4. Click `Рассчитать метрики`.

## Production Frontend Build

```powershell
npm run build
```

## Production Desktop Check

Production desktop mode loads `dist/index.html` and does not require the Vite dev server.

```powershell
Remove-Item Env:\VISIONKIT_DEV -ErrorAction SilentlyContinue
python app/main.py
```

## Build Windows EXE

Build the frontend first:

```powershell
npm run build
```

Then build the desktop executable:

```powershell
pyinstaller --noconfirm --windowed --name VisionKit --icon public/icon.ico --add-data "dist;dist" --add-data "public/icon.ico;public" app/main.py
```

The executable will be created in:

```text
dist/VisionKit/VisionKit.exe
```

## Metrics

VisionKit calculates metrics at IoU threshold `0.5`:

- predictions are sorted by confidence;
- matching is performed inside one image only;
- GT and Prediction must have the same class name;
- one GT can be matched only once;
- Prediction is TP if `IoU >= threshold`;
- unmatched Predictions are FP;
- unmatched GT boxes are FN;
- AP is calculated from the precision-recall curve;
- `mAP@0.5` is the mean AP across classes with at least one GT object.

## Git Release Commands

```powershell
git status
git add .
git commit -m "Refactor project and prepare release build"
git push
```
