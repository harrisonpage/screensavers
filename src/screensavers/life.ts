import type { Screensaver } from '../types';

export function createLife(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let grid: Uint8Array;
  let next: Uint8Array;
  const cellSize = 6;
  let stableCount = 0;
  let lastHash = 0;

  function seed() {
    for (let i = 0; i < grid.length; i++) {
      grid[i] = Math.random() < 0.3 ? 1 : 0;
    }
    stableCount = 0;
    lastHash = 0;
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.floor(width / cellSize);
    rows = Math.floor(height / cellSize);
    grid = new Uint8Array(cols * rows);
    next = new Uint8Array(cols * rows);
    seed();
  }

  function step() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + cols) % cols;
            const ny = (y + dy + rows) % rows;
            neighbors += grid[ny * cols + nx];
          }
        }
        const idx = y * cols + x;
        const alive = grid[idx];
        next[idx] = alive
          ? (neighbors === 2 || neighbors === 3 ? 1 : 0)
          : (neighbors === 3 ? 1 : 0);
      }
    }
    // swap
    const tmp = grid;
    grid = next;
    next = tmp;
  }

  function hashGrid(): number {
    let h = 0;
    for (let i = 0; i < grid.length; i += 7) {
      h = (h * 31 + grid[i]) | 0;
    }
    return h;
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#0f0';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y * cols + x]) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }
  }

  let lastTime = 0;
  const interval = 80; // ms between steps

  function loop(time: number) {
    if (!ctx) return;
    if (time - lastTime >= interval) {
      lastTime = time;
      step();

      const h = hashGrid();
      if (h === lastHash) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastHash = h;

      if (stableCount > 30) {
        seed();
      }

      draw();
    }
    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Life',
    description: "Conway's Game of Life",

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      draw();
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
