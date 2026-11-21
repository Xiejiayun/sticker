import type { GridSize } from "@/db/schema";

// Shared integer boundaries cover every pixel exactly once, including 2048 / 3.
export function getGridCellRect(width: number, height: number, gridSize: GridSize, index: number) {
  const dims = gridSize === "4x4" ? 4 : 3;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < dims || height < dims || !Number.isInteger(index) || index < 0 || index >= dims * dims) {
    throw new Error("Invalid sticker grid dimensions or cell index");
  }
  const col = index % dims;
  const row = Math.floor(index / dims);
  const x = Math.floor(col * width / dims);
  const y = Math.floor(row * height / dims);
  return { x, y, width: Math.floor((col + 1) * width / dims) - x, height: Math.floor((row + 1) * height / dims) - y };
}
