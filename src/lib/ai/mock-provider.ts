import type { GenerateGridRequest, GenerateGridResult, ImageProvider } from "./types";

const PALETTE = [
  "#FF8FAB",
  "#FFB703",
  "#8ECAE6",
  "#2EC4B6",
  "#B8F2E6",
  "#FFD166",
  "#C77DFF",
  "#FF9F1C",
  "#A0C4FF",
  "#FDFFB6",
  "#CAFFBF",
  "#FFC6FF",
  "#FFADAD",
  "#9BF6FF",
  "#BDB2FF",
  "#FFD6A5",
];

const FACES = [
  "M -28 -10 Q -20 -22 -12 -10 M 12 -10 Q 20 -22 28 -10 M -22 14 Q 0 34 22 14",
  "M -26 -14 L -14 -14 M 14 -14 L 26 -14 M -18 18 Q 0 28 18 18",
  "M -26 -12 Q -18 -20 -10 -12 M 10 -12 Q 18 -20 26 -12 M -14 16 Q 0 36 14 16",
  "M -24 -12 L -12 -6 M 24 -12 L 12 -6 M -16 18 Q 0 8 16 18",
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Local zero-cost mock provider that generates a crisp pure-white-background
 * 3x3 or 4x4 sticker sheet (SVG) so the full generation -> slicing -> cutout
 * -> white border -> ZIP export pipeline can be tested without API keys.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async generateGrid(req: GenerateGridRequest): Promise<GenerateGridResult> {
    // Simulate a brief realistic async delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const dims = req.gridSize === "4x4" ? 4 : 3;
    const size = 1536;
    const cell = size / dims;
    const radius = cell * 0.28;

    const cells: string[] = [];
    for (let i = 0; i < dims * dims; i++) {
      const row = Math.floor(i / dims);
      const col = i % dims;
      const cx = col * cell + cell / 2;
      const cy = row * cell + cell / 2 - 14;
      const color = PALETTE[i % PALETTE.length];
      const facePath = FACES[i % FACES.length];
      const caption = req.slotsPreview?.[i]?.caption ?? `#${i + 1}`;

      cells.push(`
        <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)})">
          <circle r="${radius.toFixed(1)}" fill="${color}" stroke="#1E1B2E" stroke-width="10" />
          <circle cx="${(-radius * 0.65).toFixed(1)}" cy="${(-radius * 0.72).toFixed(1)}" r="${(radius * 0.28).toFixed(1)}" fill="${color}" stroke="#1E1B2E" stroke-width="9" />
          <circle cx="${(radius * 0.65).toFixed(1)}" cy="${(-radius * 0.72).toFixed(1)}" r="${(radius * 0.28).toFixed(1)}" fill="${color}" stroke="#1E1B2E" stroke-width="9" />
          <ellipse cx="${(-radius * 0.38).toFixed(1)}" cy="10" rx="14" ry="8" fill="#FF6B6B" opacity="0.55" />
          <ellipse cx="${(radius * 0.38).toFixed(1)}" cy="10" rx="14" ry="8" fill="#FF6B6B" opacity="0.55" />
          <path d="${facePath}" fill="none" stroke="#1E1B2E" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
          ${
            caption
              ? `<text x="0" y="${(radius + 44).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="900" fill="#1E1B2E" stroke="#FFFFFF" stroke-width="8" paint-order="stroke">${escapeXml(caption)}</text>`
              : ""
          }
        </g>
      `);
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="#FFFFFF" />
      ${cells.join("\n")}
    </svg>`;

    return {
      imageBytes: new TextEncoder().encode(svg),
      mimeType: "image/svg+xml",
      providerJobId: `mock-${Date.now()}`,
      rawMeta: { provider: "mock", gridSize: req.gridSize },
    };
  }
}
