from pathlib import Path
from typing import Dict, List, Optional

from PIL import Image

from .schemas import Box


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
DEFAULT_YOLO_CLASSES = {
    0: "Car",
    1: "Van",
    2: "Truck",
    3: "Pedestrian",
    4: "Person_sitting",
    5: "Cyclist",
    6: "Tram",
    7: "Misc",
}


def file_stem(path: str) -> str:
    return Path(path).stem


def box_to_dict(box: Box) -> Dict[str, object]:
    return box.dict()


def list_files(folder: Path, extensions: set[str]) -> List[str]:
    return sorted(
        str(path)
        for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() in extensions
    )


def read_kitti_boxes(file_path: Path) -> List[Box]:
    if not file_path.exists() or not file_path.is_file():
        return []

    boxes: List[Box] = []

    for line in file_path.read_text(encoding="utf-8").splitlines():
        parts = line.strip().split()
        if len(parts) < 8:
            continue

        try:
            boxes.append(
                Box(
                    label=parts[0],
                    x1=float(parts[4]),
                    y1=float(parts[5]),
                    x2=float(parts[6]),
                    y2=float(parts[7]),
                )
            )
        except ValueError:
            continue

    return boxes


def read_yolo_boxes(
    label_path: Path,
    image_path: Path,
    class_names: Optional[Dict[int, str]] = None,
) -> List[Box]:
    if not label_path.exists() or not label_path.is_file():
        return []

    if not image_path.exists() or not image_path.is_file():
        return []

    names = class_names or resolve_yolo_class_names(label_path)

    with Image.open(image_path) as image:
        image_width, image_height = image.size

    boxes: List[Box] = []

    for line in label_path.read_text(encoding="utf-8").splitlines():
        parts = line.strip().split()
        if len(parts) < 5:
            continue

        try:
            class_id = int(parts[0])
            x_center = float(parts[1]) * image_width
            y_center = float(parts[2]) * image_height
            width = float(parts[3]) * image_width
            height = float(parts[4]) * image_height
            confidence = float(parts[5]) if len(parts) > 5 else 1.0
        except ValueError:
            continue

        boxes.append(
            Box(
                label=names.get(class_id, f"class_{class_id}"),
                confidence=confidence,
                x1=x_center - width / 2,
                y1=y_center - height / 2,
                x2=x_center + width / 2,
                y2=y_center + height / 2,
            )
        )

    return boxes


def resolve_yolo_class_names(label_path: Path) -> Dict[int, str]:
    for folder in [label_path.parent, label_path.parent.parent]:
        if not folder.exists():
            continue

        for file_name in ("data.yaml", "data.yml", "dataset.yaml", "dataset.yml"):
            parsed = parse_yolo_yaml_names(folder / file_name)
            if parsed:
                return parsed

        parsed_classes = parse_classes_txt(folder / "classes.txt")
        if parsed_classes:
            return parsed_classes

    return DEFAULT_YOLO_CLASSES


def parse_classes_txt(path: Path) -> Dict[int, str]:
    if not path.exists() or not path.is_file():
        return {}

    names = [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    return {index: name for index, name in enumerate(names)}


def parse_yolo_yaml_names(path: Path) -> Dict[int, str]:
    if not path.exists() or not path.is_file():
        return {}

    lines = path.read_text(encoding="utf-8").splitlines()

    for index, line in enumerate(lines):
        stripped = line.strip()
        if not stripped.startswith("names:"):
            continue

        value = stripped.split(":", 1)[1].strip()
        if value.startswith("[") and value.endswith("]"):
            names = [clean_yaml_scalar(item) for item in value[1:-1].split(",")]
            return {idx: name for idx, name in enumerate(names) if name}

        if value.startswith("{") and value.endswith("}"):
            result: Dict[int, str] = {}
            for item in value[1:-1].split(","):
                if ":" not in item:
                    continue
                key, name = item.split(":", 1)
                try:
                    result[int(clean_yaml_scalar(key))] = clean_yaml_scalar(name)
                except ValueError:
                    continue
            return result

        result: Dict[int, str] = {}
        next_index = 0
        for nested_line in lines[index + 1 :]:
            if not nested_line.startswith((" ", "\t", "-")):
                break

            nested = nested_line.strip()
            if not nested:
                continue

            if nested.startswith("-"):
                name = clean_yaml_scalar(nested[1:])
                if name:
                    result[next_index] = name
                    next_index += 1
                continue

            if ":" in nested:
                key, name = nested.split(":", 1)
                try:
                    result[int(clean_yaml_scalar(key))] = clean_yaml_scalar(name)
                except ValueError:
                    continue

        return result

    return {}


def clean_yaml_scalar(value: str) -> str:
    return value.strip().strip("'\"")
