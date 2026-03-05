import type { Screensaver } from '../types';

const enum Dir {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

export function createAnt(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let grid: Uint8Array;
  let antX = 0;
  let antY = 0;
  let antDir: Dir = Dir.Up;
  const cellSize = 4;
  const stepsPerFrame = 50;

  // palette for multi-state ant (RL rule with 2 states is classic)
  const colors = ['#000000', '#00cc66'];

  function reset() {
    grid = new Uint8Array(cols * rows);
    antX = Math.floor(cols / 2);
    antY = Math.floor(rows / 2);
    antDir = Dir.Up;
    ctx!.fillStyle = '#000';
    ctx!.fillRect(0, 0, width, height);
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.floor(width / cellSize);
    rows = Math.floor(height / cellSize);
    reset();
  }

  function step() {
    const idx = antY * cols + antX;
    const state = grid[idx];

    if (state === 0) {
      // on white: turn right
      antDir = ((antDir + 1) % 4) as Dir;
    } else {
      // on black: turn left
      antDir = ((antDir + 3) % 4) as Dir;
    }

    // flip cell
    grid[idx] = state === 0 ? 1 : 0;

    // draw cell
    ctx!.fillStyle = colors[grid[idx]];
    ctx!.fillRect(antX * cellSize, antY * cellSize, cellSize, cellSize);

    // move forward with wrapping
    switch (antDir) {
      case Dir.Up: antY = (antY - 1 + rows) % rows; break;
      case Dir.Right: antX = (antX + 1) % cols; break;
      case Dir.Down: antY = (antY + 1) % rows; break;
      case Dir.Left: antX = (antX - 1 + cols) % cols; break;
    }
  }

  function loop() {
    if (!ctx) return;
    for (let i = 0; i < stepsPerFrame; i++) {
      step();
    }
    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Ant',
    description: "Langton's Ant",

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
      window.removeEventListener('resize', resize);
    },
  };
}
