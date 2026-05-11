# VisionKit

VisionKit - desktop/web приложение для просмотра изображений KITTI, отображения bounding boxes Ground Truth и Predictions, а также расчета метрик качества детекции объектов.

Текущая версия: `1.1.4`.

## Возможности

- загрузка папки с изображениями;
- постраничный просмотр кадров;
- отображение Ground Truth bbox в формате KITTI;
- отображение Prediction bbox в формате YOLO;
- конвертация YOLO bbox из normalized координат в pixel bbox;
- сопоставление изображений, GT и predictions по имени файла;
- расчет TP, FP, FN, Precision, Recall, IoU, AP и mAP@0.5;
- настройка цветов классов;
- светлая и темная темы;
- запуск как web-приложение в dev-режиме;
- автономный запуск как Windows EXE.

## Стек

- Frontend: React, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui style components
- Backend: FastAPI
- Desktop shell: PySide6, QWebEngineView
- Packaging: PyInstaller
- Image processing: Pillow

## Структура проекта

```text
app/
  api.py                 FastAPI API, диагностика, выбор папок, выдача файлов
  detection_metrics.py   расчет IoU, AP, mAP, TP/FP/FN
  label_io.py            чтение KITTI/YOLO labels и сопоставление class names
  main.py                desktop shell, запуск backend, окно PySide6
  schemas.py             Pydantic-схемы backend API

src/
  app/
    App.tsx              главное состояние приложения и интеграция с API
    types.ts             TypeScript-типы bbox, метрик и API
    components/          UI-компоненты приложения

public/
  logo.svg               web favicon/logo
  icon.ico               иконка Windows/EXE

dist/
  assets/                production frontend после npm run build
  VisionKit/             собранное Windows-приложение после PyInstaller

build/
  VisionKit/             временные файлы PyInstaller
```

## Поддерживаемые форматы

### Изображения

Поддерживаются файлы:

```text
.png, .jpg, .jpeg, .bmp, .webp
```

### Ground Truth: KITTI

Формат строки:

```text
class truncated occluded alpha x1 y1 x2 y2 ...
```

VisionKit использует:

- `class`;
- `x1`;
- `y1`;
- `x2`;
- `y2`.

### Predictions: YOLO

Формат строки:

```text
class_id x_center y_center width height confidence
```

`confidence` может отсутствовать. В этом случае используется `1.0`.

Class names берутся из файлов `data.yaml`, `data.yml`, `dataset.yaml`, `dataset.yml` или `classes.txt` в папке predictions или в родительской папке. Если mapping не найден, используются стандартные классы KITTI.

## Правила сопоставления файлов

Изображения, GT и predictions сопоставляются по stem имени файла:

```text
000123.png
000123.txt
```

## Метрики

VisionKit считает метрики при IoU threshold `0.5`:

- prediction сортируются по confidence;
- matching выполняется только внутри одного изображения;
- matching выполняется только внутри одного класса;
- один GT может быть matched только один раз;
- prediction считается TP, если `IoU >= 0.5`;
- unmatched prediction считается FP;
- unmatched GT считается FN;
- AP считается по precision-recall curve;
- mAP@0.5 считается как среднее AP по классам, у которых есть GT.

## Установка для разработки

Требования:

- Windows 10/11;
- Python 3.11;
- Node.js 18+;
- npm;

Установка зависимостей:

```powershell
npm install
pip install -r requirements.txt
```

## Запуск в dev-режиме

### 1. Backend

```powershell
python -m uvicorn app.api:api --host 127.0.0.1 --port 8000
```

Проверка backend:

```powershell
curl http://127.0.0.1:8000/api/health
```

### 2. Frontend

```powershell
npm run dev -- --host 127.0.0.1
```

Открыть:

```text
http://127.0.0.1:5173
```

### 3. Desktop shell в dev-режиме

```powershell
$env:VISIONKIT_DEV="1"
python app/main.py
```

В этом режиме окно PySide6 открывает Vite dev server.

## Production-сборка frontend

```powershell
npm run build
```

После сборки frontend будет находиться в папке:

```text
dist/
```

## Проверка desktop production без Vite

```powershell
Remove-Item Env:\VISIONKIT_DEV -ErrorAction SilentlyContinue
python app/main.py
```

В production-режиме приложение:

- само запускает FastAPI backend на `127.0.0.1:8000`;
- открывает frontend через `http://127.0.0.1:8000/`;
- не требует `npm run dev`;
- не требует ручного запуска `uvicorn`.

## Сборка Windows EXE

Сначала собрать frontend:

```powershell
npm run build
```

Затем собрать EXE:

```powershell
pyinstaller --noconfirm --windowed --name VisionKit --icon public/icon.ico --add-data "dist;dist" --add-data "public/icon.ico;public" app/main.py
```

Готовое приложение:

```text
dist\VisionKit\VisionKit.exe
```

## Установка и эксплуатация

### Установка готовой версии

1. Скопировать папку `dist\VisionKit` на целевой компьютер.
2. Запускать файл:

```text
VisionKit.exe
```

3. Не удалять папку `_internal` рядом с EXE. В ней находятся зависимости приложения.

### Порядок работы пользователя

1. Запустить `VisionKit.exe`.
2. Нажать `Загрузить изображения`.
3. Выбрать папку с изображениями.
4. Нажать `Загрузить Ground Truth`.
5. Выбрать папку с KITTI `.txt` labels.
6. Нажать `Загрузить предсказания`.
7. Выбрать папку с YOLO `.txt` predictions.
8. Нажать `Рассчитать метрики`.
9. Использовать стрелки интерфейса или клавиши `Left/Right` для навигации по кадрам.

### Диагностика

Лог desktop/backend:

```powershell
Get-Content "$env:LOCALAPPDATA\VisionKit\logs\visionkit.log" -Tail 120
```

Health-check:

```powershell
curl http://127.0.0.1:8000/api/health
```

Python debug:

```powershell
curl http://127.0.0.1:8000/api/debug/python
```

## Частые проблемы

### Порт 8000 занят

VisionKit использует `127.0.0.1:8000`. Если порт занят другим процессом, приложение покажет ошибку запуска backend.

Проверка:

```powershell
netstat -ano | Select-String ":8000"
```

### EXE не обновился после сборки

Перед `npm run build` и PyInstaller закройте запущенный `VisionKit.exe`, иначе Windows может заблокировать файл.

### Не отображаются изображения

Проверьте:

- путь к файлам не удален;
- расширение входит в список поддерживаемых;
- backend отвечает на `/api/health`;
- в логе нет ошибки `/image-file`.

## Git release

```powershell
git status
git add .
git commit -m "Release VisionKit 1.1.4"
git tag -a v1.1.4 -m "VisionKit 1.1.4"
git push origin main
git push origin v1.1.4
```
