import type { Screensaver } from '../types';

export function createCoral(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let imageData: ImageData;

  let width = 0;
  let height = 0;
  let board: Uint8Array;      // 1 = sticky, 0 = empty
  let walkerX: Uint16Array;
  let walkerY: Uint16Array;
  let nwalkers = 0;

  const DENSITY = 25;         // % of pixels that become walkers
  const SEEDS = 20;

  let colorIndex = 0;
  let colorSloth = 0;
  let ncolors = 0;
  let palette: [number, number, number][] = [];

  function buildPalette() {
    ncolors = 200;
    palette = [];
    const offset = Math.random() * 360;
    for (let i = 0; i < ncolors; i++) {
      const hue = (offset + (i * 360) / ncolors) % 360;
      palette.push(hslToRgb(hue, 90, 60));
    }
  }

  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)      { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else              { r = c; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }

  function setDot(x: number, y: number) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      board[y * width + x] = 1;
    }
  }

  function setPixel(x: number, y: number, r: number, g: number, b: number) {
    const i = (y * width + x) * 4;
    imageData.data[i] = r;
    imageData.data[i + 1] = g;
    imageData.data[i + 2] = b;
    imageData.data[i + 3] = 255;
  }

  function initCoral() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    board = new Uint8Array(width * height);
    imageData = ctx!.createImageData(width, height);

    // Fill imageData alpha to 255 (black background)
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      data[i] = 255;
    }

    buildPalette();
    colorIndex = Math.floor(Math.random() * ncolors);

    // Place seeds
    for (let i = 0; i < SEEDS; i++) {
      const x = 1 + Math.floor(Math.random() * (width - 2));
      const y = 1 + Math.floor(Math.random() * (height - 2));
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          setDot(x + dx, y + dy);
        }
      }
      const [r, g, b] = palette[colorIndex];
      setPixel(x, y, r, g, b);
    }

    // Create walkers
    const totalWalkers = Math.floor((width * height * DENSITY) / 100);
    walkerX = new Uint16Array(totalWalkers);
    walkerY = new Uint16Array(totalWalkers);
    nwalkers = totalWalkers;
    for (let i = 0; i < totalWalkers; i++) {
      walkerX[i] = 1 + Math.floor(Math.random() * (width - 2));
      walkerY[i] = 1 + Math.floor(Math.random() * (height - 2));
    }

    colorSloth = nwalkers > 0 ? Math.floor((nwalkers * 2) / ncolors) : 1;
  }

  // Process all walkers in one pass, just like the original C code.
  // Each walker either sticks (if on a sticky cell) or takes one random step.
  function stepCoral(): boolean {
    let r: number, g: number, b: number;
    [r, g, b] = palette[colorIndex];

    for (let i = 0; i < nwalkers; i++) {
      const x = walkerX[i];
      const y = walkerY[i];

      if (board[y * width + x]) {
        // Stick: draw pixel and expand sticky zone
        setPixel(x, y, r, g, b);

        // Mark 8 neighbors as sticky
        const x0 = x - 1, x1 = x + 1;
        const y0 = y - 1, y1 = y + 1;
        if (y0 >= 0) {
          if (x0 >= 0) board[y0 * width + x0] = 1;
          board[y0 * width + x] = 1;
          if (x1 < width) board[y0 * width + x1] = 1;
        }
        if (x0 >= 0) board[y * width + x0] = 1;
        if (x1 < width) board[y * width + x1] = 1;
        if (y1 < height) {
          if (x0 >= 0) board[y1 * width + x0] = 1;
          board[y1 * width + x] = 1;
          if (x1 < width) board[y1 * width + x1] = 1;
        }

        // Remove walker by swapping with last
        nwalkers--;
        walkerX[i] = walkerX[nwalkers];
        walkerY[i] = walkerY[nwalkers];
        i--; // re-check this index since we swapped in a new walker

        // Color advance
        if (colorSloth > 0 && nwalkers % colorSloth === 0) {
          colorIndex = (colorIndex + 1) % ncolors;
          [r, g, b] = palette[colorIndex];
        }
      } else {
        // Random walk: move one step in a cardinal direction
        const dir = (Math.random() * 4) | 0;
        switch (dir) {
          case 0: if (x > 1) walkerX[i] = x - 1; break;
          case 1: if (x < width - 2) walkerX[i] = x + 1; break;
          case 2: if (y > 1) walkerY[i] = y - 1; break;
          default: if (y < height - 2) walkerY[i] = y + 1; break;
        }
      }
    }

    return nwalkers === 0;
  }

  let done = false;
  let resetTimer: number | null = null;

  function loop() {
    if (!ctx) return;
    if (done) return;

    if (stepCoral()) {
      done = true;
      resetTimer = window.setTimeout(() => {
        if (!ctx) return;
        done = false;
        initCoral();
        animationFrame = requestAnimationFrame(loop);
      }, 5000);
    }

    ctx.putImageData(imageData, 0, 0);
    if (!done) {
      animationFrame = requestAnimationFrame(loop);
    }
  }

  function resize() {
    if (!ctx) return;
    done = false;
    if (resetTimer !== null) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    initCoral();
  }

  return {
    name: 'Coral',
    description: 'Coral growth by Frederick Roeber (1997)',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      initCoral();
      animationFrame = requestAnimationFrame(loop);
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      if (resetTimer !== null) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
      ctx = null;
      window.removeEventListener('resize', resize);
    },
  };
}
