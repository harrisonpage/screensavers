import type { Screensaver } from '../types';

// An IFS is a set of affine transforms with probabilities
interface IFSTransform {
  a: number; b: number; c: number; d: number; e: number; f: number;
  p: number; // probability weight
  color: number; // color index 0..1 for blending
}

interface IFSPreset {
  name: string;
  description: string;
  transforms: IFSTransform[];
  xMin: number; xMax: number; yMin: number; yMax: number;
  palette: number;
}

// Warm glowing palette (orange/red/gold)
function warmPalette(t: number): [number, number, number] {
  const r = Math.floor(255 * Math.min(1, t * 3));
  const g = Math.floor(255 * Math.max(0, Math.min(1, t * 2 - 0.3)));
  const b = Math.floor(255 * Math.max(0, Math.min(1, t * 1.2 - 0.6)));
  return [r, g, b];
}

// Cool ocean palette (blue/teal/cyan)
function coolPalette(t: number): [number, number, number] {
  const r = Math.floor(255 * Math.max(0, Math.min(1, t * 0.8 - 0.2)));
  const g = Math.floor(255 * Math.max(0, Math.min(1, t * 1.5 - 0.1)));
  const b = Math.floor(255 * Math.min(1, t * 2 + 0.3));
  return [r, g, b];
}

// Fire palette (deep red to bright yellow)
function firePalette(t: number): [number, number, number] {
  const r = Math.floor(255 * Math.min(1, t * 2.5));
  const g = Math.floor(255 * Math.max(0, Math.min(1, t * 2.5 - 0.7)));
  const b = Math.floor(255 * Math.max(0, Math.min(1, t * 3 - 2)));
  return [r, g, b];
}

// Aurora palette (green/purple/pink)
function auroraPalette(t: number): [number, number, number] {
  const r = Math.floor(127.5 * (1 + Math.cos(Math.PI * 2 * (t * 0.8 + 0.1))));
  const g = Math.floor(127.5 * (1 + Math.cos(Math.PI * 2 * (t * 0.6 + 0.5))));
  const b = Math.floor(127.5 * (1 + Math.cos(Math.PI * 2 * (t * 0.9 + 0.8))));
  return [r, g, b];
}

// Coral/reef palette (warm oranges, reds with blue-green accents)
function coralPalette(t: number): [number, number, number] {
  if (t < 0.3) {
    const s = t / 0.3;
    return [
      Math.floor(20 + 60 * s),
      Math.floor(40 + 80 * s),
      Math.floor(80 + 40 * s),
    ];
  } else if (t < 0.6) {
    const s = (t - 0.3) / 0.3;
    return [
      Math.floor(80 + 140 * s),
      Math.floor(120 - 20 * s),
      Math.floor(120 - 80 * s),
    ];
  } else {
    const s = (t - 0.6) / 0.4;
    return [
      Math.floor(220 + 35 * s),
      Math.floor(100 + 120 * s),
      Math.floor(40 + 60 * s),
    ];
  }
}

const palettes = [coralPalette, warmPalette, coolPalette, firePalette, auroraPalette];

// --- Preset definitions ---

const FERN: IFSPreset = {
  name: 'Fern',
  description: 'Barnsley fern fractal',
  transforms: [
    { a: 0, b: 0, c: 0, d: 0.16, e: 0, f: 0, p: 0.01, color: 0.2 },
    { a: 0.85, b: 0.04, c: -0.04, d: 0.85, e: 0, f: 1.6, p: 0.85, color: 0.6 },
    { a: 0.2, b: -0.26, c: 0.23, d: 0.22, e: 0, f: 1.6, p: 0.07, color: 0.3 },
    { a: -0.15, b: 0.28, c: 0.26, d: 0.24, e: 0, f: 0.44, p: 0.07, color: 0.8 },
  ],
  xMin: -2.5, xMax: 2.5, yMin: -0.5, yMax: 10.5,
  palette: 0,
};

const SIERPINSKI: IFSPreset = {
  name: 'Sierpinski',
  description: 'Sierpinski triangle',
  transforms: [
    { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0, p: 0.333, color: 0.2 },
    { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.5, f: 0, p: 0.333, color: 0.5 },
    { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.25, f: 0.433, p: 0.334, color: 0.8 },
  ],
  xMin: -0.1, xMax: 1.1, yMin: -0.1, yMax: 0.6,
  palette: 2,
};

const MAPLE: IFSPreset = {
  name: 'Maple',
  description: 'Maple leaf fractal',
  transforms: [
    { a: 0.14, b: 0.01, c: 0, d: 0.51, e: -0.08, f: -1.31, p: 0.1, color: 0.1 },
    { a: 0.43, b: 0.52, c: -0.45, d: 0.50, e: 1.49, f: -0.75, p: 0.35, color: 0.4 },
    { a: 0.45, b: -0.49, c: 0.47, d: 0.47, e: -1.62, f: -0.74, p: 0.35, color: 0.6 },
    { a: 0.49, b: 0, c: 0, d: 0.51, e: 0.02, f: 1.62, p: 0.2, color: 0.9 },
  ],
  xMin: -4.5, xMax: 4.5, yMin: -4, yMax: 5,
  palette: 3,
};

const DRAGON: IFSPreset = {
  name: 'Dragon',
  description: 'Dragon curve fractal',
  transforms: [
    { a: 0.5, b: -0.5, c: 0.5, d: 0.5, e: 0, f: 0, p: 0.5, color: 0.3 },
    { a: -0.5, b: -0.5, c: 0.5, d: -0.5, e: 1, f: 0, p: 0.5, color: 0.7 },
  ],
  xMin: -0.3, xMax: 1.3, yMin: -0.5, yMax: 0.8,
  palette: 4,
};

const KOCH: IFSPreset = {
  name: 'Koch',
  description: 'Koch snowflake fractal',
  transforms: [
    { a: 0.333, b: 0, c: 0, d: 0.333, e: 0, f: 0, p: 0.2, color: 0.1 },
    { a: 0.333, b: 0, c: 0, d: 0.333, e: 0.667, f: 0, p: 0.2, color: 0.3 },
    { a: 0.333, b: 0, c: 0, d: 0.333, e: 0.333, f: 0.577, p: 0.2, color: 0.5 },
    { a: 0.167, b: -0.289, c: 0.289, d: 0.167, e: 0.333, f: 0, p: 0.2, color: 0.7 },
    { a: 0.167, b: 0.289, c: -0.289, d: 0.167, e: 0.5, f: 0.289, p: 0.2, color: 0.9 },
  ],
  xMin: -0.1, xMax: 1.1, yMin: -0.2, yMax: 0.8,
  palette: 2,
};

const PENTAFLAKE: IFSPreset = {
  name: 'Pentaflake',
  description: 'Pentagonal fractal',
  transforms: [
    { a: 0.382, b: 0, c: 0, d: 0.382, e: 0, f: 0, p: 0.2, color: 0.1 },
    { a: 0.382, b: 0, c: 0, d: 0.382, e: 0.618, f: 0, p: 0.2, color: 0.3 },
    { a: 0.382, b: 0, c: 0, d: 0.382, e: 0.809, f: 0.588, p: 0.2, color: 0.5 },
    { a: 0.382, b: 0, c: 0, d: 0.382, e: 0.309, f: 0.951, p: 0.2, color: 0.7 },
    { a: 0.382, b: 0, c: 0, d: 0.382, e: -0.191, f: 0.588, p: 0.2, color: 0.9 },
  ],
  xMin: -0.5, xMax: 1.5, yMin: -0.3, yMax: 1.5,
  palette: 1,
};

const CRYSTAL: IFSPreset = {
  name: 'Crystal',
  description: 'Symmetric crystal fractal',
  transforms: [
    { a: 0.255, b: 0, c: 0, d: 0.255, e: 0.3726, f: 0.6714, p: 0.25, color: 0.1 },
    { a: 0.255, b: 0, c: 0, d: 0.255, e: 0.1146, f: 0.2232, p: 0.25, color: 0.35 },
    { a: 0.255, b: 0, c: 0, d: 0.255, e: 0.6306, f: 0.2232, p: 0.25, color: 0.6 },
    { a: 0.370, b: -0.642, c: 0.642, d: 0.370, e: 0.6356, f: -0.0061, p: 0.125, color: 0.8 },
    { a: 0.370, b: 0.642, c: -0.642, d: 0.370, e: -0.0061, f: 0.6356, p: 0.125, color: 0.95 },
  ],
  xMin: -0.2, xMax: 1.2, yMin: -0.2, yMax: 1.2,
  palette: 4,
};

// --- Shared IFS rendering engine ---

function createIfsScreensaver(preset: IFSPreset): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // Density histogram
  let histogram: Float32Array;
  let colorR: Float32Array;
  let colorG: Float32Array;
  let colorB: Float32Array;
  let histW = 0;
  let histH = 0;

  // IFS state
  let cumProbs: number[] = [];
  let viewXMin = 0;
  let viewXMax = 1;
  let viewYMin = 0;
  let viewYMax = 1;

  // Chaos game state
  let px = 0;
  let py = 0;
  let pointColor = 0.5;
  let totalPoints = 0;
  const POINTS_PER_FRAME = 50000;
  const SETTLE_POINTS = 20;
  const MAX_POINTS = 8_000_000;

  // Palette cycling with fade transitions
  let currentPalette = preset.palette;
  let phase: 'building' | 'holding' | 'fading-out' | 'fading-in' = 'building';
  let fadeAlpha = 1;
  let holdFrames = 0;
  const HOLD_TIME = 1200; // ~20s at 60fps before palette swap

  // We store density only (not color) so we can re-render with a new palette
  let densityHist: Float32Array;
  // Per-pixel color index (weighted average of transform color values)
  let colorHist: Float32Array;
  let countHist: Float32Array;

  let renderedImage: ImageData | null = null;
  let cachedCanvas: OffscreenCanvas | null = null;

  function initHistograms() {
    const size = histW * histH;
    densityHist = new Float32Array(size);
    colorHist = new Float32Array(size);
    countHist = new Float32Array(size);
  }

  function setupView() {
    // Build cumulative probability table
    cumProbs = [];
    let sum = 0;
    for (const t of preset.transforms) {
      sum += t.p;
      cumProbs.push(sum);
    }
    for (let i = 0; i < cumProbs.length; i++) {
      cumProbs[i] /= sum;
    }

    // Adjust view bounds for screen aspect ratio
    const aspect = histW / histH;
    const presetW = preset.xMax - preset.xMin;
    const presetH = preset.yMax - preset.yMin;
    const presetAspect = presetW / presetH;

    if (aspect > presetAspect) {
      const newW = presetH * aspect;
      const cx = (preset.xMin + preset.xMax) / 2;
      viewXMin = cx - newW / 2;
      viewXMax = cx + newW / 2;
      viewYMin = preset.yMin;
      viewYMax = preset.yMax;
    } else {
      const newH = presetW / aspect;
      const cy = (preset.yMin + preset.yMax) / 2;
      viewXMin = preset.xMin;
      viewXMax = preset.xMax;
      viewYMin = cy - newH / 2;
      viewYMax = cy + newH / 2;
    }

    // Add margin
    const mx = (viewXMax - viewXMin) * 0.05;
    const my = (viewYMax - viewYMin) * 0.05;
    viewXMin -= mx;
    viewXMax += mx;
    viewYMin -= my;
    viewYMax += my;
  }

  function resetIteration() {
    px = 0;
    py = 0;
    pointColor = 0.5;
    totalPoints = 0;
    densityHist.fill(0);
    colorHist.fill(0);
    countHist.fill(0);
    cachedCanvas = null;
  }

  function pickTransform(): number {
    const r = Math.random();
    for (let i = 0; i < cumProbs.length; i++) {
      if (r <= cumProbs[i]) return i;
    }
    return cumProbs.length - 1;
  }

  function iteratePoints(count: number) {
    const xScale = histW / (viewXMax - viewXMin);
    const yScale = histH / (viewYMax - viewYMin);

    for (let i = 0; i < count; i++) {
      const ti = pickTransform();
      const t = preset.transforms[ti];

      const nx = t.a * px + t.b * py + t.e;
      const ny = t.c * px + t.d * py + t.f;
      px = nx;
      py = ny;

      pointColor = (pointColor + t.color) * 0.5;

      totalPoints++;
      if (totalPoints < SETTLE_POINTS) continue;

      const hx = Math.floor((px - viewXMin) * xScale);
      const hy = Math.floor((viewYMax - py) * yScale);

      if (hx >= 0 && hx < histW && hy >= 0 && hy < histH) {
        const idx = hy * histW + hx;
        densityHist[idx]++;
        colorHist[idx] += pointColor;
        countHist[idx]++;
      }
    }
  }

  function renderHistogram() {
    if (!ctx) return;

    renderedImage = ctx.createImageData(histW, histH);
    const data = renderedImage.data;
    const getPalette = palettes[currentPalette];

    let maxVal = 0;
    for (let i = 0; i < densityHist.length; i++) {
      if (densityHist[i] > maxVal) maxVal = densityHist[i];
    }

    if (maxVal === 0) return;

    const logMax = Math.log(maxVal + 1);

    for (let i = 0; i < densityHist.length; i++) {
      const count = densityHist[i];
      if (count === 0) {
        data[i * 4] = 0;
        data[i * 4 + 1] = 0;
        data[i * 4 + 2] = 0;
        data[i * 4 + 3] = 255;
        continue;
      }

      // Log-density scaling
      const alpha = Math.log(count + 1) / logMax;
      const gamma = 1.0 / 2.2;
      const a = Math.pow(alpha, gamma);

      // Average color index at this pixel, then look up palette
      const avgColor = colorHist[i] / countHist[i];
      const [r, g, b] = getPalette(avgColor);

      data[i * 4] = Math.min(255, Math.floor(r * a));
      data[i * 4 + 1] = Math.min(255, Math.floor(g * a));
      data[i * 4 + 2] = Math.min(255, Math.floor(b * a));
      data[i * 4 + 3] = 255;
    }

    // Cache the rendered image to an OffscreenCanvas for reuse
    cachedCanvas = new OffscreenCanvas(histW, histH);
    const cc = cachedCanvas.getContext('2d')!;
    cc.putImageData(renderedImage, 0, 0);
  }

  function drawToCanvas(alpha?: number) {
    if (!ctx || !cachedCanvas) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    if (alpha !== undefined) {
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    }
    ctx.drawImage(cachedCanvas, 0, 0, width, height);
    if (alpha !== undefined) {
      ctx.globalAlpha = 1;
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    const scale = 2;
    histW = Math.floor(width / scale);
    histH = Math.floor(height / scale);

    initHistograms();
    setupView();
    resetIteration();
    phase = 'building';
  }

  function loop() {
    if (!ctx) return;

    if (phase === 'building') {
      // Accumulate points and render progressively
      iteratePoints(POINTS_PER_FRAME);
      renderHistogram();
      drawToCanvas();

      if (totalPoints >= MAX_POINTS) {
        phase = 'holding';
        holdFrames = 0;
      }
    } else if (phase === 'holding') {
      // Fractal is fully built; just hold the image
      holdFrames++;
      if (holdFrames >= HOLD_TIME) {
        phase = 'fading-out';
        fadeAlpha = 1;
      }
    } else if (phase === 'fading-out') {
      fadeAlpha -= 0.015;
      drawToCanvas(Math.max(0, fadeAlpha));

      if (fadeAlpha <= 0) {
        // Pick a different palette
        let newPalette: number;
        do {
          newPalette = Math.floor(Math.random() * palettes.length);
        } while (newPalette === currentPalette && palettes.length > 1);
        currentPalette = newPalette;

        // Re-render the same density data with the new palette
        renderHistogram();

        phase = 'fading-in';
        fadeAlpha = 0;
      }
    } else if (phase === 'fading-in') {
      fadeAlpha += 0.01;
      drawToCanvas(Math.min(1, fadeAlpha));

      if (fadeAlpha >= 1) {
        phase = 'holding';
        holdFrames = 0;
      }
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: preset.name,
    description: preset.description,

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      renderedImage = null;
      window.removeEventListener('resize', resize);
    },
  };
}

// --- Exported factory functions ---

export function createFern(): Screensaver { return createIfsScreensaver(FERN); }
export function createSierpinski(): Screensaver { return createIfsScreensaver(SIERPINSKI); }
export function createMaple(): Screensaver { return createIfsScreensaver(MAPLE); }
export function createDragon(): Screensaver { return createIfsScreensaver(DRAGON); }
export function createKoch(): Screensaver { return createIfsScreensaver(KOCH); }
export function createPentaflake(): Screensaver { return createIfsScreensaver(PENTAFLAKE); }
export function createCrystal(): Screensaver { return createIfsScreensaver(CRYSTAL); }
