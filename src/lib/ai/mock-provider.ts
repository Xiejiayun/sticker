import type { GenerateAssetRequest, GenerateGridRequest, GenerateGridResult, ImageProvider } from "./types";

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

  async generateAsset(req: GenerateAssetRequest): Promise<GenerateGridResult> {
    await new Promise((resolve) => setTimeout(resolve, 650));

    let svg = "";
    if (req.kind === "banner") {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="800" viewBox="0 0 1500 800">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFF3C4"/>
            <stop offset="52%" stop-color="#FFE1EA"/>
            <stop offset="100%" stop-color="#C8F5EC"/>
          </linearGradient>
        </defs>
        <rect width="1500" height="800" fill="url(#sky)"/>
        <circle cx="230" cy="140" r="88" fill="#FFD166" opacity="0.7"/>
        <circle cx="1290" cy="170" r="64" fill="#FF8FAB" opacity="0.45"/>
        <ellipse cx="750" cy="760" rx="840" ry="200" fill="#FFFFFF" opacity="0.55"/>
        <g transform="translate(390, 440)">
          <circle r="130" fill="#FFB703" stroke="#1E1B2E" stroke-width="14"/>
          <circle cx="-85" cy="-95" r="38" fill="#FFB703" stroke="#1E1B2E" stroke-width="12"/>
          <circle cx="85" cy="-95" r="38" fill="#FFB703" stroke="#1E1B2E" stroke-width="12"/>
          <ellipse cx="-52" cy="16" rx="18" ry="10" fill="#FF6B6B" opacity="0.6"/>
          <ellipse cx="52" cy="16" rx="18" ry="10" fill="#FF6B6B" opacity="0.6"/>
          <path d="M -38 -14 Q -26 -30 -14 -14 M 14 -14 Q 26 -30 38 -14 M -28 24 Q 0 50 28 24" fill="none" stroke="#1E1B2E" stroke-width="12" stroke-linecap="round"/>
        </g>
        <g transform="translate(750, 395)">
          <circle r="165" fill="#FF8FAB" stroke="#1E1B2E" stroke-width="15"/>
          <circle cx="-106" cy="-118" r="46" fill="#FF8FAB" stroke="#1E1B2E" stroke-width="13"/>
          <circle cx="106" cy="-118" r="46" fill="#FF8FAB" stroke="#1E1B2E" stroke-width="13"/>
          <ellipse cx="-64" cy="20" rx="22" ry="12" fill="#FF6B6B" opacity="0.6"/>
          <ellipse cx="64" cy="20" rx="22" ry="12" fill="#FF6B6B" opacity="0.6"/>
          <path d="M -46 -18 Q -32 -38 -18 -18 M 18 -18 Q 32 -38 46 -18 M -32 28 Q 0 64 32 28" fill="none" stroke="#1E1B2E" stroke-width="13" stroke-linecap="round"/>
        </g>
        <g transform="translate(1110, 440)">
          <circle r="130" fill="#8ECAE6" stroke="#1E1B2E" stroke-width="14"/>
          <circle cx="-85" cy="-95" r="38" fill="#8ECAE6" stroke="#1E1B2E" stroke-width="12"/>
          <circle cx="85" cy="-95" r="38" fill="#8ECAE6" stroke="#1E1B2E" stroke-width="12"/>
          <ellipse cx="-52" cy="16" rx="18" ry="10" fill="#FF6B6B" opacity="0.6"/>
          <ellipse cx="52" cy="16" rx="18" ry="10" fill="#FF6B6B" opacity="0.6"/>
          <path d="M -38 -14 L -18 -14 M 18 -14 L 38 -14 M -24 24 Q 0 42 24 24" fill="none" stroke="#1E1B2E" stroke-width="12" stroke-linecap="round"/>
        </g>
        <path d="M 555 170 L 570 205 L 605 220 L 570 235 L 555 270 L 540 235 L 505 220 L 540 205 Z" fill="#FFFFFF" stroke="#1E1B2E" stroke-width="6"/>
        <path d="M 965 150 L 976 178 L 1004 189 L 976 200 L 965 228 L 954 200 L 926 189 L 954 178 Z" fill="#FFD166" stroke="#1E1B2E" stroke-width="6"/>
      </svg>`;
    } else if (req.kind === "icon") {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <rect width="1024" height="1024" fill="#FFFFFF"/>
        <g transform="translate(512, 540)">
          <circle cx="-210" cy="-240" r="95" fill="#FF8FAB" stroke="#1E1B2E" stroke-width="26"/>
          <circle cx="210" cy="-240" r="95" fill="#FF8FAB" stroke="#1E1B2E" stroke-width="26"/>
          <circle r="310" fill="#FF8FAB" stroke="#1E1B2E" stroke-width="28"/>
          <ellipse cx="-135" cy="36" rx="46" ry="26" fill="#FF6B6B" opacity="0.6"/>
          <ellipse cx="135" cy="36" rx="46" ry="26" fill="#FF6B6B" opacity="0.6"/>
          <circle cx="-105" cy="-42" r="28" fill="#1E1B2E"/>
          <circle cx="105" cy="-42" r="28" fill="#1E1B2E"/>
          <circle cx="-95" cy="-52" r="9" fill="#FFFFFF"/>
          <circle cx="115" cy="-52" r="9" fill="#FFFFFF"/>
          <path d="M -56 58 Q 0 116 56 58" fill="none" stroke="#1E1B2E" stroke-width="26" stroke-linecap="round"/>
        </g>
      </svg>`;
    } else {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <rect width="1024" height="1024" fill="#FFFFFF"/>
        <g transform="translate(512, 520)">
          <ellipse cx="0" cy="245" rx="185" ry="90" fill="#B8F2E6" stroke="#1E1B2E" stroke-width="22"/>
          <circle cx="-170" cy="-190" r="76" fill="#FFB703" stroke="#1E1B2E" stroke-width="22"/>
          <circle cx="170" cy="-190" r="76" fill="#FFB703" stroke="#1E1B2E" stroke-width="22"/>
          <circle cy="-10" r="245" fill="#FFB703" stroke="#1E1B2E" stroke-width="24"/>
          <ellipse cx="-105" cy="24" rx="34" ry="18" fill="#FF6B6B" opacity="0.6"/>
          <ellipse cx="105" cy="24" rx="34" ry="18" fill="#FF6B6B" opacity="0.6"/>
          <path d="M -84 -32 Q -58 -68 -32 -32 M 32 -32 Q 58 -68 84 -32 M -56 44 Q 0 100 56 44" fill="none" stroke="#1E1B2E" stroke-width="22" stroke-linecap="round"/>
          <path d="M 215 -140 L 235 -95 L 280 -75 L 235 -55 L 215 -10 L 195 -55 L 150 -75 L 195 -95 Z" fill="#FF6B6B" stroke="#1E1B2E" stroke-width="12"/>
        </g>
      </svg>`;
    }

    return {
      imageBytes: new TextEncoder().encode(svg),
      mimeType: "image/svg+xml",
      providerJobId: `mock-asset-${req.kind}-${Date.now()}`,
      rawMeta: { provider: "mock", kind: req.kind },
    };
  }
}
