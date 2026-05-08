from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, TypedDict

from .label_io import file_stem, read_kitti_boxes, read_yolo_boxes, resolve_yolo_class_names
from .schemas import Box, CalculateMetricsRequest


class PredictionItem(TypedDict):
    image_stem: str
    box: Box


def calculate_iou(first: Box, second: Box) -> float:
    intersection_x1 = max(first.x1, second.x1)
    intersection_y1 = max(first.y1, second.y1)
    intersection_x2 = min(first.x2, second.x2)
    intersection_y2 = min(first.y2, second.y2)

    intersection_width = max(0.0, intersection_x2 - intersection_x1)
    intersection_height = max(0.0, intersection_y2 - intersection_y1)
    intersection_area = intersection_width * intersection_height

    first_area = max(0.0, first.x2 - first.x1) * max(0.0, first.y2 - first.y1)
    second_area = max(0.0, second.x2 - second.x1) * max(0.0, second.y2 - second.y1)
    union_area = first_area + second_area - intersection_area

    if union_area <= 0:
        return 0.0

    return intersection_area / union_area


def calculate_ap(tp_flags: List[int], fp_flags: List[int], gt_count: int) -> float:
    if gt_count == 0 or not tp_flags:
        return 0.0

    cumulative_tp = 0
    cumulative_fp = 0
    recalls = [0.0]
    precisions = [1.0]

    for tp, fp in zip(tp_flags, fp_flags):
        cumulative_tp += tp
        cumulative_fp += fp

        recalls.append(cumulative_tp / gt_count)
        denominator = cumulative_tp + cumulative_fp
        precisions.append(cumulative_tp / denominator if denominator else 0.0)

    recalls.append(1.0)
    precisions.append(0.0)

    for index in range(len(precisions) - 2, -1, -1):
        precisions[index] = max(precisions[index], precisions[index + 1])

    ap = 0.0
    for index in range(1, len(recalls)):
        if recalls[index] != recalls[index - 1]:
            ap += (recalls[index] - recalls[index - 1]) * precisions[index]

    return ap


def calculate_detection_metrics(request: CalculateMetricsRequest) -> Dict[str, object]:
    images_by_stem = {file_stem(path): Path(path) for path in request.image_paths}
    gt_by_stem = {file_stem(path): Path(path) for path in request.gt_files}
    pred_by_stem = {file_stem(path): Path(path) for path in request.pred_files}

    gt_by_image: Dict[str, List[Box]] = {}
    pred_by_image: Dict[str, List[Box]] = {}

    for stem, image_path in images_by_stem.items():
        gt_by_image[stem] = read_kitti_boxes(gt_by_stem[stem]) if stem in gt_by_stem else []
        if stem in pred_by_stem:
            class_names = resolve_yolo_class_names(pred_by_stem[stem])
            pred_by_image[stem] = read_yolo_boxes(pred_by_stem[stem], image_path, class_names)
        else:
            pred_by_image[stem] = []

    classes = sorted(
        {
            box.label
            for boxes in [*gt_by_image.values(), *pred_by_image.values()]
            for box in boxes
        }
    )

    total_tp = 0
    total_fp = 0
    total_fn = 0
    class_metrics: List[Dict[str, object]] = []
    ap_values: List[float] = []

    for class_name in classes:
        gt_for_class = {
            stem: [box for box in boxes if box.label == class_name]
            for stem, boxes in gt_by_image.items()
        }
        predictions = collect_class_predictions(pred_by_image, class_name)

        matched_gt: Dict[str, Set[int]] = {stem: set() for stem in gt_for_class}
        tp_flags: List[int] = []
        fp_flags: List[int] = []
        matched_ious: List[float] = []

        for prediction in predictions:
            stem = prediction["image_stem"]
            pred_box = prediction["box"]
            gt_boxes = gt_for_class.get(stem, [])
            best_gt_index, best_iou = find_best_unmatched_gt(pred_box, gt_boxes, matched_gt[stem])

            if best_gt_index is not None and best_iou >= request.iou_threshold:
                matched_gt[stem].add(best_gt_index)
                tp_flags.append(1)
                fp_flags.append(0)
                matched_ious.append(best_iou)
            else:
                tp_flags.append(0)
                fp_flags.append(1)

        gt_count = sum(len(boxes) for boxes in gt_for_class.values())
        tp = sum(tp_flags)
        fp = sum(fp_flags)
        fn = gt_count - tp
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        ap = calculate_ap(tp_flags, fp_flags, gt_count)

        total_tp += tp
        total_fp += fp
        total_fn += fn
        if gt_count > 0:
            ap_values.append(ap)

        class_metrics.append(
            {
                "className": class_name,
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "precision": precision,
                "recall": recall,
                "ap": ap,
                "iou": sum(matched_ious) / len(matched_ious) if matched_ious else 0.0,
                "gtCount": gt_count,
                "predCount": len(predictions),
            }
        )

    precision = total_tp / (total_tp + total_fp) if total_tp + total_fp else 0.0
    recall = total_tp / (total_tp + total_fn) if total_tp + total_fn else 0.0

    return {
        "mAP": sum(ap_values) / len(ap_values) if ap_values else 0.0,
        "precision": precision,
        "recall": recall,
        "tp": total_tp,
        "fp": total_fp,
        "fn": total_fn,
        "classMetrics": class_metrics,
    }


def collect_class_predictions(
    pred_by_image: Dict[str, List[Box]],
    class_name: str,
) -> List[PredictionItem]:
    predictions: List[PredictionItem] = []

    for stem, boxes in pred_by_image.items():
        for box in boxes:
            if box.label == class_name:
                predictions.append({"image_stem": stem, "box": box})

    return sorted(predictions, key=lambda item: item["box"].confidence, reverse=True)


def find_best_unmatched_gt(
    prediction: Box,
    gt_boxes: List[Box],
    matched_indexes: Set[int],
) -> Tuple[Optional[int], float]:
    best_iou = 0.0
    best_gt_index: Optional[int] = None

    for gt_index, gt_box in enumerate(gt_boxes):
        if gt_index in matched_indexes:
            continue

        iou = calculate_iou(prediction, gt_box)
        if iou > best_iou:
            best_iou = iou
            best_gt_index = gt_index

    return best_gt_index, best_iou
