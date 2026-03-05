import type { Screensaver } from '../types';

export function createMandelbrot(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let imageData: ImageData | null = null;

  const SCALE = 3;
  let scaledW = 0;
  let scaledH = 0;

  // zoom state
  let centerX = -0.5;
  let centerY = 0;
  let zoom = 1; // 1 = full view (range ~3.5 units wide)
  let maxIter = 100;
  let colorOffset = 0;
  let fadeAlpha = 1; // for fade transitions
  let phase: 'zooming' | 'fading-out' | 'fading-in' = 'zooming';
  let targetIdx = 0;

  // cached render — avoid full recompute every frame
  let renderCache: OffscreenCanvas | null = null;
  let lastRenderZoom = 0;

  // interesting zoom targets on the Mandelbrot boundary
  const targets = [
    { x: -0.7436439, y: 0.1318259 },   // Seahorse Valley
    { x: -0.1011, y: 0.9563 },          // spiral
    { x: -1.25066, y: 0.02012 },        // near period-3 bulb
    { x: -0.745428, y: 0.113009 },      // another seahorse spot
    { x: -0.16, y: 1.0405 },            // antenna spiral
    { x: -1.7497591, y: 0.0 },          // mini-brot on the real axis
    { x: 0.281717921930775, y: 0.5771052841488505 }, // elephant valley
    { x: -0.0452407411, y: 0.9868162204352258 },     // deep spiral
    { x: -1.476201, y: 0.0 },           // mini-brot near period-3
    { x: -0.56264, y: 0.64265 },        // star-like region
  ];

  // precomputed palette
  const palette: Array<[number, number, number]> = [];

  function buildPalette() {
    palette.length = 0;
    for (let i = 0; i < 256; i++) {
      const t = i / 256;
      // rich blues, purples, golds
      const r = Math.floor(127.5 * (1 + Math.cos(Math.PI * 2 * (t + 0.0))));
      const g = Math.floor(127.5 * (1 + Math.cos(Math.PI * 2 * (t + 0.33))));
      const b = Math.floor(127.5 * (1 + Math.cos(Math.PI * 2 * (t + 0.67))));
      palette.push([r, g, b]);
    }
  }

  function pickNewTarget() {
    let idx = Math.floor(Math.random() * targets.length);
    // avoid repeating the same target
    if (idx === targetIdx && targets.length > 1) {
      idx = (idx + 1) % targets.length;
    }
    targetIdx = idx;
    const t = targets[targetIdx];
    centerX = t.x;
    centerY = t.y;
    zoom = 1;
    maxIter = 100;
    renderCache = null;
    lastRenderZoom = 0;
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    scaledW = Math.floor(width / SCALE);
    scaledH = Math.floor(height / SCALE);
    if (ctx) {
      imageData = ctx.createImageData(scaledW, scaledH);
      ctx.imageSmoothingEnabled = true;
    }
  }

  // check if the rendered frame is too uniform (zoomed past detail)
  function isBoring(): boolean {
    if (!imageData) return false;
    const data = imageData.data;
    const samples = 64;
    const stepX = Math.floor(scaledW / 8);
    const stepY = Math.floor(scaledH / 8);
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    let count = 0;

    for (let sy = 1; sy < 8; sy++) {
      for (let sx = 1; sx < 8; sx++) {
        const px = sx * stepX;
        const py = sy * stepY;
        const off = (py * scaledW + px) * 4;
        const r = data[off], g = data[off + 1], b = data[off + 2];
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (g < minG) minG = g; if (g > maxG) maxG = g;
        if (b < minB) minB = b; if (b > maxB) maxB = b;
        count++;
      }
    }

    const range = (maxR - minR) + (maxG - minG) + (maxB - minB);
    return range < 30; // very little color variation across the frame
  }

  function render() {
    if (!imageData) return;

    const data = imageData.data;
    const aspect = scaledW / scaledH;
    const viewH = 3.5 / zoom;
    const viewW = viewH * aspect;
    const xMin = centerX - viewW / 2;
    const yMin = centerY - viewH / 2;

    for (let py = 0; py < scaledH; py++) {
      for (let px = 0; px < scaledW; px++) {
        const x0 = xMin + (px / scaledW) * viewW;
        const y0 = yMin + (py / scaledH) * viewH;

        // cardioid check: skip iteration for main cardioid
        const q = (x0 - 0.25) * (x0 - 0.25) + y0 * y0;
        const inCardioid = q * (q + (x0 - 0.25)) <= 0.25 * y0 * y0;
        // period-2 bulb check
        const inBulb = (x0 + 1) * (x0 + 1) + y0 * y0 <= 0.0625;

        let x = 0;
        let y = 0;
        let x2 = 0;
        let y2 = 0;
        let iter = 0;

        if (inCardioid || inBulb) {
          iter = maxIter; // known interior — skip straight to black
        }

        while (x2 + y2 <= 4 && iter < maxIter) {
          y = 2 * x * y + y0;
          x = x2 - y2 + x0;
          x2 = x * x;
          y2 = y * y;
          iter++;
        }

        const off = (py * scaledW + px) * 4;

        if (iter === maxIter) {
          // inside the set — black
          data[off] = 0;
          data[off + 1] = 0;
          data[off + 2] = 0;
          data[off + 3] = 255;
        } else {
          // smooth coloring: normalized iteration count
          const log2 = Math.log(2);
          const nu = Math.log(Math.log(x2 + y2) / 2) / log2;
          const smooth = iter + 1 - nu;
          const idx = Math.floor((smooth * 3.5 + colorOffset) % 256 + 256) & 0xff;
          const [r, g, b] = palette[idx];
          data[off] = r;
          data[off + 1] = g;
          data[off + 2] = b;
          data[off + 3] = 255;
        }
      }
    }
  }

  function loop() {
    if (!ctx || !imageData) return;

    if (phase === 'zooming') {
      zoom *= 1.02;
      colorOffset += 0.3;
      // increase iterations as we zoom deeper, capped for performance
      maxIter = Math.min(500, Math.floor(100 + 60 * Math.log2(zoom)));

      // only do a full render when the cached image has been zoomed ~20%
      const needsRender = !renderCache || zoom / lastRenderZoom >= 1.2;

      if (needsRender) {
        render();
        lastRenderZoom = zoom;
        renderCache = new OffscreenCanvas(scaledW, scaledH);
        const rc = renderCache.getContext('2d')!;
        rc.putImageData(imageData!, 0, 0);

        ctx.drawImage(renderCache, 0, 0, width, height);

        // check boring only on full renders
        if (zoom > 1e13 || (zoom > 10 && isBoring())) {
          phase = 'fading-out';
          fadeAlpha = 1;
        }
      } else {
        // cheap: crop and scale the cached render to simulate zoom
        const zoomRatio = zoom / lastRenderZoom;
        const srcW = scaledW / zoomRatio;
        const srcH = scaledH / zoomRatio;
        const srcX = (scaledW - srcW) / 2;
        const srcY = (scaledH - srcH) / 2;
        ctx.drawImage(renderCache!, srcX, srcY, srcW, srcH, 0, 0, width, height);
      }
    } else if (phase === 'fading-out') {
      fadeAlpha -= 0.015;
      ctx.fillStyle = `rgba(0, 0, 0, 0.015)`;
      ctx.fillRect(0, 0, width, height);

      if (fadeAlpha <= 0) {
        pickNewTarget();
        phase = 'fading-in';
        fadeAlpha = 0;
      }
    } else if (phase === 'fading-in') {
      fadeAlpha += 0.02;

      if (!renderCache) {
        render();
        lastRenderZoom = zoom;
        renderCache = new OffscreenCanvas(scaledW, scaledH);
        const rc = renderCache.getContext('2d')!;
        rc.putImageData(imageData!, 0, 0);
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = fadeAlpha;
      ctx.drawImage(renderCache, 0, 0, width, height);
      ctx.globalAlpha = 1;

      if (fadeAlpha >= 1) {
        phase = 'zooming';
      }
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Mandelbrot',
    description: 'Infinite fractal zoom',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      colorOffset = 0;
      fadeAlpha = 1;
      phase = 'zooming';
      buildPalette();
      pickNewTarget();
      resize();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      imageData = null;
      renderCache = null;
      window.removeEventListener('resize', resize);
    },
  };
}
