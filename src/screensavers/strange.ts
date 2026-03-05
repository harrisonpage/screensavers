import type { Screensaver } from '../types';

interface AttractorDef {
  name: string;
  params: number[];
  fn: (x: number, y: number, p: number[]) => [number, number];
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
}

export function createStrange(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // density buffer for accumulation rendering
  let density: Float32Array | null = null;
  let bufW = 0;
  let bufH = 0;

  let x = 0.1;
  let y = 0.1;
  let iteration = 0;
  let maxIterations = 400000;
  let currentAttractor = 0;
  let hue = 0;
  let phase: 'drawing' | 'fading-out' | 'fading-in' = 'drawing';
  let fadeAlpha = 1;

  // collection of strange attractors
  const attractors: AttractorDef[] = [
    {
      name: 'Clifford',
      params: [-1.4, 1.6, 1.0, 0.7],
      fn: (x, y, p) => [
        Math.sin(p[0] * y) + p[2] * Math.cos(p[0] * x),
        Math.sin(p[1] * x) + p[3] * Math.cos(p[1] * y),
      ],
      bounds: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
    },
    {
      name: 'De Jong',
      params: [-2.24, 0.43, -0.65, -2.43],
      fn: (x, y, p) => [
        Math.sin(p[0] * y) - Math.cos(p[1] * x),
        Math.sin(p[2] * x) - Math.cos(p[3] * y),
      ],
      bounds: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
    },
    {
      name: 'Clifford 2',
      params: [1.7, 1.7, 0.6, 1.2],
      fn: (x, y, p) => [
        Math.sin(p[0] * y) + p[2] * Math.cos(p[0] * x),
        Math.sin(p[1] * x) + p[3] * Math.cos(p[1] * y),
      ],
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
    },
    {
      name: 'Bedhead',
      params: [-0.81, -0.92],
      fn: (x, y, p) => [
        Math.sin(x * y / p[1]) + Math.cos(p[0] * x),
        x + Math.sin(y / p[1]),
      ],
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
    },
    {
      name: 'Fractal Dream',
      params: [-1.9, -1.9, 0.8, 1.0],
      fn: (x, y, p) => [
        Math.sin(p[1] * y) + p[2] * Math.sin(p[1] * x),
        Math.sin(p[0] * x) + p[3] * Math.sin(p[0] * y),
      ],
      bounds: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
    },
    {
      name: 'De Jong 2',
      params: [1.4, -2.3, 2.4, -2.1],
      fn: (x, y, p) => [
        Math.sin(p[0] * y) - Math.cos(p[1] * x),
        Math.sin(p[2] * x) - Math.cos(p[3] * y),
      ],
      bounds: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
    },
    {
      name: 'Svensson',
      params: [1.5, -1.8, 1.6, 0.9],
      fn: (x, y, p) => [
        p[3] * Math.sin(p[0] * x) - Math.sin(p[1] * y),
        p[2] * Math.cos(p[0] * x) + Math.cos(p[1] * y),
      ],
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
    },
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    bufW = Math.floor(width / 2);
    bufH = Math.floor(height / 2);
    density = new Float32Array(bufW * bufH);
    resetAttractor();
  }

  function resetAttractor() {
    if (density) density.fill(0);
    x = 0.1;
    y = 0.1;
    iteration = 0;
  }

  function nextAttractor() {
    currentAttractor = (currentAttractor + 1) % attractors.length;
    hue = (hue + 50 + Math.random() * 80) % 360;
    resetAttractor();
  }

  function renderDensity() {
    if (!ctx || !density) return;

    const imageData = ctx.createImageData(bufW, bufH);
    const data = imageData.data;

    // find max density for normalization
    let maxD = 0;
    for (let i = 0; i < density.length; i++) {
      if (density[i] > maxD) maxD = density[i];
    }

    if (maxD === 0) return;

    const logMax = Math.log(maxD + 1);

    for (let i = 0; i < density.length; i++) {
      const d = density[i];
      if (d === 0) {
        data[i * 4 + 3] = 255; // black background
        continue;
      }
      // log-scale density for better contrast
      const t = Math.log(d + 1) / logMax;
      const brightness = Math.pow(t, 0.5);

      // color based on hue with density-driven saturation
      const h = hue / 360;
      const s = 0.7 + 0.3 * (1 - brightness);
      const l = brightness * 0.85;

      // HSL to RGB
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x2 = c * (1 - Math.abs(((h * 6) % 2) - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;
      const sector = Math.floor(h * 6);
      if (sector === 0) { r = c; g = x2; }
      else if (sector === 1) { r = x2; g = c; }
      else if (sector === 2) { g = c; b = x2; }
      else if (sector === 3) { g = x2; b = c; }
      else if (sector === 4) { r = x2; b = c; }
      else { r = c; b = x2; }

      data[i * 4] = Math.floor((r + m) * 255);
      data[i * 4 + 1] = Math.floor((g + m) * 255);
      data[i * 4 + 2] = Math.floor((b + m) * 255);
      data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0, 0, 0, bufW, bufH);
    // scale up to canvas
    ctx.drawImage(canvas, 0, 0, bufW, bufH, 0, 0, width, height);
  }

  function loop() {
    if (!ctx || !density) return;

    if (phase === 'drawing') {
      const att = attractors[currentAttractor];
      const { xMin, xMax, yMin, yMax } = att.bounds;
      const scaleX = bufW / (xMax - xMin);
      const scaleY = bufH / (yMax - yMin);

      // iterate many points per frame
      const batchSize = 20000;
      for (let i = 0; i < batchSize; i++) {
        const [nx, ny] = att.fn(x, y, att.params);
        x = nx;
        y = ny;

        // skip initial transient
        if (iteration > 100) {
          const px = Math.floor((x - xMin) * scaleX);
          const py = Math.floor((y - yMin) * scaleY);
          if (px >= 0 && px < bufW && py >= 0 && py < bufH) {
            density[py * bufW + px]++;
          }
        }
        iteration++;
      }

      renderDensity();

      if (iteration > maxIterations) {
        phase = 'fading-out';
        fadeAlpha = 1;
      }
    } else if (phase === 'fading-out') {
      fadeAlpha -= 0.015;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
      ctx.fillRect(0, 0, width, height);

      if (fadeAlpha <= 0) {
        nextAttractor();
        phase = 'fading-in';
        fadeAlpha = 0;
      }
    } else if (phase === 'fading-in') {
      fadeAlpha += 0.02;
      phase = 'drawing';
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Strange',
    description: 'Strange attractor gallery',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      currentAttractor = Math.floor(Math.random() * attractors.length);
      hue = Math.random() * 360;
      phase = 'drawing';
      resize();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      density = null;
      window.removeEventListener('resize', resize);
    },
  };
}
