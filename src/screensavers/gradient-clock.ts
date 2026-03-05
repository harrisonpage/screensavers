// Gradient Clock - adapted from gradientclock2 by tpatel12
// https://github.com/tidbyt/community/tree/main/apps/gradientclock2
import type { Screensaver } from '../types';

export function createGradientClock(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let frameNum = 0;
  let lastFrameTime = 0;

  const GRID_ROWS = 16;
  const GRID_COLS = 32;
  const FRAME_INTERVAL = 60; // ms per frame, matching original
  const PERIOD = 125;
  const NUM_FRAMES = 250;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function getCellColor(row: number, col: number, frame: number): [number, number, number, number] {
    const f = (frame * 2) % (PERIOD * 4);

    let alpha: number;
    if (f < PERIOD) {
      alpha = f - row - col;
    } else if (f < PERIOD * 2) {
      alpha = 200 - (f + row - col);
    } else if (f < PERIOD * 3) {
      alpha = -2 * PERIOD + f - (GRID_ROWS - row) - (GRID_COLS - col);
    } else {
      alpha = 2 * PERIOD + 200 - (f + (GRID_ROWS - row) - (GRID_ROWS - col));
    }

    const offset = (row + col) % 2 === 0 ? 1 : 4;
    const r = Math.max(0, Math.min(15, 15 - row - offset));
    const g = Math.max(0, Math.min(15, row - offset));
    const b = Math.max(0, Math.min(15, col - offset));
    const a = Math.max(0, Math.min(15, alpha));

    // Scale from 0-15 to 0-255
    return [r * 17, g * 17, b * 17, a * 17];
  }

  function formatTime(date: Date): string {
    let hours = date.getHours() % 12;
    if (hours === 0) hours = 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  function loop(timestamp: number) {
    if (!ctx) return;

    // Advance frame at the original rate
    if (timestamp - lastFrameTime >= FRAME_INTERVAL) {
      lastFrameTime = timestamp;
      frameNum = (frameNum + 1) % NUM_FRAMES;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw grid scaled to fill the screen
    const cellW = width / GRID_COLS;
    const cellH = height / GRID_ROWS;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const [r, g, b, a] = getCellColor(row, col, frameNum);
        ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        ctx.fillRect(col * cellW, row * cellH, Math.ceil(cellW) + 1, Math.ceil(cellH) + 1);
      }
    }

    // Draw clock text
    const now = new Date();
    const timeStr = formatTime(now);

    const fontSize = Math.min(width * 0.18, height * 0.3);
    ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // White text with glow
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = fontSize * 0.15;
    ctx.fillStyle = '#fff';
    ctx.fillText(timeStr, width / 2, height / 2);
    ctx.shadowBlur = 0;

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Chrona',
    description: 'Animated gradient waves with clock overlay (tpatel12)',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      lastFrameTime = performance.now();
      animationFrame = requestAnimationFrame(loop);
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      window.removeEventListener('resize', resize);
    },
  };
}
