import test from "node:test";
import assert from "node:assert/strict";
import { getGridCellRect } from "../src/lib/slicer/grid.ts";

for (const grid of ["3x3", "4x4"]) {
  test(`${grid} partitions all 2048 pixels exactly once, with shared boundaries`, () => {
    const dims = grid === "4x4" ? 4 : 3;
    const cells = Array.from({ length: dims * dims }, (_, i) => getGridCellRect(2048, 2048, grid, i));
    assert.equal(cells.reduce((area, c) => area + c.width * c.height, 0), 2048 * 2048);
    for (let row = 0; row < dims; row++) for (let col = 0; col < dims; col++) {
      const cell = cells[row * dims + col];
      assert.equal(cell.x + cell.width, col === dims - 1 ? 2048 : cells[row * dims + col + 1].x);
      assert.equal(cell.y + cell.height, row === dims - 1 ? 2048 : cells[(row + 1) * dims + col].y);
    }
    assert.equal(cells[0].x, 0); assert.equal(cells[0].y, 0);
  });
}
test("invalid image dimensions and cell indexes fail explicitly", () => {
  for (const args of [[0, 2048, "3x3", 0], [2048, 2048, "3x3", 9], [2048, 2048, "4x4", -1], [2048, 2048, "3x3", 0.5]]) assert.throws(() => getGridCellRect(...args), /Invalid/);
});
