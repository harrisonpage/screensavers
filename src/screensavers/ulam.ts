import type { Screensaver } from '../types';

export function createUlam(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // pre-computed prime sieve
  let isPrime: Uint8Array | null = null;
  const sieveSize = 500000;

  // drawing state
  let currentN = 1;
  let cellSize = 3;
  let totalCells = 0;
  let hue = 200;
  let phase: 'drawing' | 'holding' | 'fading' = 'drawing';
  let holdFrames = 0;
  let fadeAlpha = 1;

  function buildSieve() {
    isPrime = new Uint8Array(sieveSize);
    isPrime.fill(1);
    isPrime[0] = 0;
    isPrime[1] = 0;
    for (let i = 2; i * i < sieveSize; i++) {
      if (isPrime[i]) {
        for (let j = i * i; j < sieveSize; j += i) {
          isPrime[j] = 0;
        }
      }
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function resetSpiral() {
    currentN = 1;
    cellSize = 2 + Math.floor(Math.random() * 3); // 2-4px cells
    const maxDim = Math.max(width, height);
    totalCells = Math.min(sieveSize - 1, Math.floor((maxDim / cellSize) * (maxDim / cellSize)));
    hue = (hue + 60 + Math.random() * 120) % 360;
    phase = 'drawing';
    holdFrames = 0;
    fadeAlpha = 1;

    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
    }
  }

  // Ulam spiral coordinate mapping: given n (1-indexed), return (x, y) offset from center
  function spiralCoord(n: number): { x: number; y: number } {
    if (n === 1) return { x: 0, y: 0 };

    const k = Math.ceil((Math.sqrt(n) - 1) / 2);
    let t = 2 * k + 1;
    let m = t * t;

    t -= 1;

    if (n >= m - t) {
      return { x: k - (m - n), y: -k };
    }
    m -= t;

    if (n >= m - t) {
      return { x: -k, y: -k + (m - n) };
    }
    m -= t;

    if (n >= m - t) {
      return { x: -k + (m - n), y: k };
    }

    return { x: k, y: k - (m - t - n) };
  }

  function loop() {
    if (!ctx || !isPrime) return;

    if (phase === 'drawing') {
      const cx = Math.floor(width / 2);
      const cy = Math.floor(height / 2);

      // draw a batch of cells per frame
      const batchSize = Math.min(2000, totalCells - currentN);

      for (let i = 0; i < batchSize; i++) {
        if (currentN >= totalCells || currentN >= sieveSize) {
          phase = 'holding';
          break;
        }

        if (isPrime[currentN]) {
          const { x, y } = spiralCoord(currentN);
          const px = cx + x * cellSize;
          const py = cy + y * cellSize;

          // color based on distance from center for visual depth
          const dist = Math.sqrt(x * x + y * y);
          const maxDist = Math.sqrt(totalCells) / 2;
          const t = dist / maxDist;

          const lightness = 40 + 30 * (1 - t);
          const saturation = 70 + 20 * t;
          const localHue = (hue + t * 60) % 360;

          ctx.fillStyle = `hsl(${localHue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(px, py, cellSize, cellSize);
        }

        currentN++;
      }
    } else if (phase === 'holding') {
      holdFrames++;
      if (holdFrames > 300) { // hold for ~5 seconds
        phase = 'fading';
        fadeAlpha = 1;
      }
    } else if (phase === 'fading') {
      fadeAlpha -= 0.015;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
      ctx.fillRect(0, 0, width, height);

      if (fadeAlpha <= 0) {
        resetSpiral();
      }
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Ulam',
    description: 'Ulam prime spiral',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      buildSieve();
      resize();
      resetSpiral();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      isPrime = null;
      window.removeEventListener('resize', resize);
    },
  };
}
