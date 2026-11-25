import type { AnimationLoopMode, SpriteAlignMode } from "@/config/animations";

export interface AlphaBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface FrameAlphaMetrics {
  bounds: AlphaBounds | null;
  centroidX: number;
  centroidY: number;
  mass: number;
  width: number;
  height: number;
  /** Low-res silhouette/luma map (side x side) for NCC registration */
  thumbSide: number;
  thumbAlpha: Float32Array;
  thumbLuma: Float32Array;
}

export interface FrameStabilizationTransform {
  dx: number;
  dy: number;
}

export interface ClipStabilizationPlan {
  transforms: FrameStabilizationTransform[];
  unionBounds: AlphaBounds;
  anchorX: number;
  anchorY: number;
}

const THUMB_SIDE = 48;

export function computeFrameAlphaMetrics(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = 40
): FrameAlphaMetrics {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  let mass = 0;

  for (let y = 0; y < height; y++) {
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      const a = rgba[(rowOff + x) * 4 + 3];
      if (a >= alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        const w = a / 255;
        sumX += x * w;
        sumY += y * w;
        mass += w;
      }
    }
  }

  const bounds = maxX >= minX && maxY >= minY ? { minX, minY, maxX, maxY } : null;
  const centroidX = mass > 0 ? sumX / mass : width / 2;
  const centroidY = mass > 0 ? sumY / mass : height / 2;

  const thumbSide = THUMB_SIDE;
  const thumbAlpha = new Float32Array(thumbSide * thumbSide);
  const thumbLuma = new Float32Array(thumbSide * thumbSide);

  for (let ty = 0; ty < thumbSide; ty++) {
    const sy = Math.min(height - 1, Math.floor(((ty + 0.5) * height) / thumbSide));
    for (let tx = 0; tx < thumbSide; tx++) {
      const sx = Math.min(width - 1, Math.floor(((tx + 0.5) * width) / thumbSide));
      const o = (sy * width + sx) * 4;
      const a = rgba[o + 3] / 255;
      const idx = ty * thumbSide + tx;
      thumbAlpha[idx] = a;
      thumbLuma[idx] = a * (0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2]) / 255;
    }
  }

  return {
    bounds,
    centroidX,
    centroidY,
    mass,
    width,
    height,
    thumbSide,
    thumbAlpha,
    thumbLuma,
  };
}

/**
 * Estimates the integer shift (dx, dy) in full-resolution pixels needed to align
 * `cur` onto `ref` using weighted silhouette + luminance correlation on a 48x48 grid.
 */
export function estimateNccShift(
  ref: FrameAlphaMetrics,
  cur: FrameAlphaMetrics,
  maxShiftRatio = 0.16
): FrameStabilizationTransform {
  const side = ref.thumbSide;
  const maxShift = Math.max(2, Math.round(side * maxShiftRatio));

  // Initial guess from centroid alignment in thumb coordinates
  const scaleX = side / Math.max(1, ref.width);
  const scaleY = side / Math.max(1, ref.height);
  const guessTx = Math.round((ref.centroidX - cur.centroidX) * scaleX);
  const guessTy = Math.round((ref.centroidY - cur.centroidY) * scaleY);

  let bestScore = -Infinity;
  let bestTx = 0;
  let bestTy = 0;

  const minTx = Math.max(-maxShift, guessTx - Math.ceil(maxShift * 0.75));
  const maxTx = Math.min(maxShift, guessTx + Math.ceil(maxShift * 0.75));
  const minTy = Math.max(-maxShift, guessTy - Math.ceil(maxShift * 0.75));
  const maxTy = Math.min(maxShift, guessTy + Math.ceil(maxShift * 0.75));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      let overlap = 0;
      let penalty = 0;
      for (let y = 0; y < side; y++) {
        const cy = y - ty;
        const rowRef = y * side;
        if (cy < 0 || cy >= side) {
          for (let x = 0; x < side; x++) {
            penalty += ref.thumbAlpha[rowRef + x] * 0.6;
          }
          continue;
        }
        const rowCur = cy * side;
        for (let x = 0; x < side; x++) {
          const cx = x - tx;
          const ra = ref.thumbAlpha[rowRef + x];
          if (cx < 0 || cx >= side) {
            penalty += ra * 0.6;
            continue;
          }
          const ca = cur.thumbAlpha[rowCur + cx];
          // Give slightly higher weight to the torso/center-bottom core to avoid arm-wave pull
          const coreWeight = y >= side * 0.25 && y <= side * 0.85 ? 1.25 : 0.85;
          const lumaSim = 1 - Math.abs(ref.thumbLuma[rowRef + x] - cur.thumbLuma[rowCur + cx]);
          overlap += ra * ca * (0.65 + 0.35 * lumaSim) * coreWeight;
          penalty += Math.abs(ra - ca) * 0.45 * coreWeight;
        }
      }

      // Mild regularizer toward zero shift to avoid noisy ties
      const reg = (tx * tx + ty * ty) * 0.015;
      const score = overlap - penalty - reg;
      if (score > bestScore) {
        bestScore = score;
        bestTx = tx;
        bestTy = ty;
      }
    }
  }

  return {
    dx: Math.round(bestTx / scaleX),
    dy: Math.round(bestTy / scaleY),
  };
}

/**
 * Computes cross-frame alignment offsets and the joint union bounding box across all active frames.
 * Using the joint union bounding box ensures every frame shares a single global scale factor
 * (zero "size pumping" when limbs or particles extend in some frames).
 */
export function computeClipStabilization(
  metrics: FrameAlphaMetrics[],
  alignMode: SpriteAlignMode,
  enabledMask?: boolean[]
): ClipStabilizationPlan {
  if (metrics.length === 0) {
    return {
      transforms: [],
      unionBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      anchorX: 0.5,
      anchorY: 0.5,
    };
  }

  const activeIndices = metrics
    .map((_, idx) => idx)
    .filter((idx) => (enabledMask ? enabledMask[idx] !== false : true));
  const refIdx = activeIndices.find((idx) => metrics[idx].bounds !== null) ?? 0;
  const ref = metrics[refIdx];
  const refBounds = ref.bounds ?? { minX: 0, minY: 0, maxX: ref.width - 1, maxY: ref.height - 1 };

  const transforms: FrameStabilizationTransform[] = metrics.map((m, idx) => {
    if (alignMode === "none" || !m.bounds || idx === refIdx) {
      return { dx: 0, dy: 0 };
    }

    if (alignMode === "bottom-center") {
      const refCenterX = (refBounds.minX + refBounds.maxX) / 2;
      const curCenterX = (m.bounds.minX + m.bounds.maxX) / 2;
      return {
        dx: Math.round(refCenterX - curCenterX),
        dy: Math.round(refBounds.maxY - m.bounds.maxY),
      };
    }

    if (alignMode === "centroid") {
      return {
        dx: Math.round(ref.centroidX - m.centroidX),
        dy: Math.round(ref.centroidY - m.centroidY),
      };
    }

    // "ncc" — automatic template/silhouette cross-correlation registration
    return estimateNccShift(ref, m);
  });

  // Compute joint union bounds across all active frames after alignment
  let uMinX = Infinity;
  let uMinY = Infinity;
  let uMaxX = -Infinity;
  let uMaxY = -Infinity;

  const indicesForUnion = activeIndices.length > 0 ? activeIndices : metrics.map((_, i) => i);
  for (const idx of indicesForUnion) {
    const b = metrics[idx].bounds;
    if (!b) continue;
    const t = transforms[idx];
    uMinX = Math.min(uMinX, b.minX + t.dx);
    uMinY = Math.min(uMinY, b.minY + t.dy);
    uMaxX = Math.max(uMaxX, b.maxX + t.dx);
    uMaxY = Math.max(uMaxY, b.maxY + t.dy);
  }

  if (!Number.isFinite(uMinX) || uMaxX < uMinX || uMaxY < uMinY) {
    uMinX = 0;
    uMinY = 0;
    uMaxX = Math.max(1, ref.width - 1);
    uMaxY = Math.max(1, ref.height - 1);
  }

  return {
    transforms,
    unionBounds: {
      minX: uMinX,
      minY: uMinY,
      maxX: uMaxX,
      maxY: uMaxY,
    },
    anchorX: (uMinX + uMaxX) / 2,
    anchorY: (uMinY + uMaxY) / 2,
  };
}

/**
 * Computes the single uniform scale and destination offset so the joint union bounding box
 * fits cleanly inside (outW x outH) with consistent padding.
 */
export function computeUniformPlacement(
  unionBounds: AlphaBounds,
  outW: number,
  outH: number,
  paddingPx: number
): { scale: number; offsetX: number; offsetY: number } {
  const bw = Math.max(1, unionBounds.maxX - unionBounds.minX + 1);
  const bh = Math.max(1, unionBounds.maxY - unionBounds.minY + 1);
  const availW = Math.max(1, outW - paddingPx * 2);
  const availH = Math.max(1, outH - paddingPx * 2);
  const scale = Math.min(availW / bw, availH / bh);

  const scaledW = bw * scale;
  const scaledH = bh * scale;
  const offsetX = (outW - scaledW) / 2 - unionBounds.minX * scale;
  const offsetY = (outH - scaledH) / 2 - unionBounds.minY * scale;

  return { scale, offsetX, offsetY };
}

/**
 * Computes per-frame dwell durations in milliseconds with optional natural animation rhythm
 * (gentle settle on frame 0 and 1.6x climax hold on the peak frame) while honoring explicit overrides.
 */
export function computeRhythmFrameDelays(
  frameCount: number,
  fps: number,
  holdClimax = false,
  explicitDelaysMs?: Record<number, number | undefined>
): number[] {
  const safeFps = Math.max(2, Math.min(14, fps));
  const baseMs = Math.max(50, Math.round(1000 / safeFps));
  const peakIdx = frameCount >= 4 ? Math.floor(frameCount * 0.5) : Math.max(0, frameCount - 1);

  return Array.from({ length: frameCount }, (_, idx) => {
    const custom = explicitDelaysMs?.[idx];
    if (typeof custom === "number" && custom >= 40) {
      return Math.round(custom);
    }
    if (!holdClimax || frameCount < 3) {
      return baseMs;
    }
    if (idx === peakIdx) {
      return Math.min(600, Math.round(baseMs * 1.6));
    }
    if (idx === 0) {
      return Math.min(500, Math.round(baseMs * 1.25));
    }
    return baseMs;
  });
}

/**
 * Expands enabled frame indices into the playback sequence according to loopMode.
 * - "loop": [0, 1, 2, 3]
 * - "pingpong": [0, 1, 2, 3, 2, 1] (turns 4 frames into 6 smooth frames, 9 frames into 16!)
 */
export function expandPlaybackSequence(
  frameCount: number,
  loopMode: AnimationLoopMode,
  enabledMask?: boolean[]
): number[] {
  const active: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    if (!enabledMask || enabledMask[i] !== false) {
      active.push(i);
    }
  }
  if (active.length === 0) {
    return frameCount > 0 ? [0] : [];
  }
  if (loopMode === "pingpong" && active.length >= 3) {
    const reversedMiddle = active.slice(1, -1).reverse();
    return [...active, ...reversedMiddle];
  }
  return active;
}

/**
 * Ensures LINE APNG compliance:
 * - Frame count must be 5..20 (auto-expands short 3-4 frame loops via ping-pong or duplication)
 * - Total playback duration <= 4000ms (with 1..4 loops)
 */
export function normalizeLineApngTiming(
  sequence: number[],
  frameDelaysMs: number[]
): {
  sequence: number[];
  delaysMs: number[];
  numPlays: number;
  totalDurationMs: number;
} {
  let seq = [...sequence];
  let delays = seq.map((idx) => Math.max(40, Math.round(frameDelaysMs[idx] ?? 100)));

  // LINE requires 5..20 frames
  if (seq.length < 5 && seq.length >= 2) {
    if (seq.length >= 3) {
      const back = seq.slice(1, -1).reverse();
      seq = [...seq, ...back];
    }
    while (seq.length < 5) {
      seq = [...seq, ...sequence].slice(0, 8);
    }
    delays = seq.map((idx) => Math.max(40, Math.round(frameDelaysMs[idx] ?? 100)));
  }

  if (seq.length > 20) {
    seq = seq.slice(0, 20);
    delays = delays.slice(0, 20);
  }

  let singleLoopMs = delays.reduce((sum, d) => sum + d, 0);
  if (singleLoopMs > 4000) {
    const ratio = 3950 / singleLoopMs;
    delays = delays.map((d) => Math.max(40, Math.floor(d * ratio)));
    singleLoopMs = delays.reduce((sum, d) => sum + d, 0);
  }

  // LINE allows 1..4 loops as long as loops * singleLoopMs <= 4000ms
  const maxLoops = Math.max(1, Math.min(4, Math.floor(4000 / Math.max(1, singleLoopMs))));
  return {
    sequence: seq,
    delaysMs: delays,
    numPlays: maxLoops,
    totalDurationMs: singleLoopMs * maxLoops,
  };
}
