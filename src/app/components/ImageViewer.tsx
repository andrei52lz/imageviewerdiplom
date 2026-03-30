import React, { useRef, useEffect } from "react";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  type: "ground-truth" | "prediction";
}

interface ImageViewerProps {
  imageUrl: string;
  boundingBoxes: BoundingBox[];
  theme?: "light" | "dark";
}

export function ImageViewer({
  imageUrl,
  boundingBoxes,
  theme = "dark",
}: ImageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const drawBoundingBoxes = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayWidth = image.clientWidth;
    const displayHeight = image.clientHeight;

    const naturalWidth = image.naturalWidth || displayWidth;
    const naturalHeight = image.naturalHeight || displayHeight;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;

    boundingBoxes.forEach((box) => {
      const x = box.x * scaleX;
      const y = box.y * scaleY;
      const width = box.width * scaleX;
      const height = box.height * scaleY;

      ctx.strokeStyle = box.color;
      ctx.lineWidth = 3;

      if (box.type === "prediction") {
        ctx.setLineDash([10, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.strokeRect(x, y, width, height);

      ctx.font = "14px Inter, system-ui, sans-serif";
      const textWidth = ctx.measureText(box.label).width;
      ctx.fillStyle = box.color;

      const labelX = x;
      const labelY = Math.max(y - 24, 0);

      ctx.fillRect(labelX, labelY, textWidth + 12, 24);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(box.label, labelX + 6, labelY + 17);
    });
  };

  useEffect(() => {
    drawBoundingBoxes();
  }, [boundingBoxes, imageUrl]);

  useEffect(() => {
    const handleResize = () => {
      drawBoundingBoxes();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [boundingBoxes, imageUrl]);

  const handleImageLoad = () => {
    drawBoundingBoxes();
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden border w-full ${
        theme === "dark"
          ? "bg-zinc-900 border-zinc-700"
          : "bg-gray-100 border-gray-300"
      }`}
    >
      <div className="relative w-full">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="KITTI Dataset View"
          className="w-full h-auto block"
          onLoad={handleImageLoad}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
      </div>
    </div>
  );
}