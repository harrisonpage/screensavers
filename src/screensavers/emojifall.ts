// Author: Harrison Page
// License: MIT
// Created: 25-Feb-2026

import type { Screensaver } from '../types';
import { EMOJIS } from './emoji-data';

interface FallingEmoji {
  emoji: string;
  col: number;       // grid column
  x: number;         // pixel x (center)
  y: number;         // pixel y (bottom of emoji)
  vy: number;        // velocity
  targetY: number;   // where it lands
  landed: boolean;
}

const GRAVITY = 0.4;
const CELL_SIZE = 40;
const SPAWN_INTERVAL = 80; // ms between new emoji spawns
const BG_CYCLE_SPEED = 0.003; // how fast background oscillates (radians per frame)

export function createEmojiFall(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let spawnTimer: number | null = null;
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;

  // offscreen canvas for landed emojis (drawn once, blitted each frame)
  let offscreen: HTMLCanvasElement;
  let offCtx: CanvasRenderingContext2D | null = null;

  // background color cycling
  let bgPhase = 0;

  // grid tracks how many emojis are stacked in each column
  let stacks: number[] = [];
  // currently falling emojis
  let falling: FallingEmoji[] = [];
  // columns that currently have something falling into them
  let busyCols: Set<number> = new Set();

  function randomEmoji(): string {
    return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    offscreen.width = width;
    offscreen.height = height;
    cols = Math.floor(width / CELL_SIZE);
    rows = Math.floor(height / CELL_SIZE);
    reset();
  }

  function reset() {
    stacks = new Array(cols).fill(0);
    falling = [];
    busyCols.clear();
    if (offCtx) {
      offCtx.clearRect(0, 0, width, height);
    }
  }

  function spawnEmoji() {
    // find available columns (not full and not busy)
    const available: number[] = [];
    for (let c = 0; c < cols; c++) {
      if (stacks[c] < rows && !busyCols.has(c)) {
        available.push(c);
      }
    }

    if (available.length === 0) {
      // check if everything is full
      const allFull = stacks.every(s => s >= rows);
      if (allFull && falling.length === 0) {
        reset();
      }
      return;
    }

    const col = available[Math.floor(Math.random() * available.length)];
    const stackHeight = stacks[col];
    const x = col * CELL_SIZE + CELL_SIZE / 2;
    const targetY = height - stackHeight * CELL_SIZE - CELL_SIZE / 2;

    busyCols.add(col);

    falling.push({
      emoji: randomEmoji(),
      col,
      x,
      y: -CELL_SIZE,
      vy: 2 + Math.random() * 2,
      targetY,
      landed: false,
    });
  }

  function loop() {
    if (!ctx || !offCtx) return;

    // cycle background black -> white -> black using a sine wave
    bgPhase += BG_CYCLE_SPEED;
    const bg = Math.round(((Math.sin(bgPhase) + 1) / 2) * 255);
    ctx.fillStyle = `rgb(${bg},${bg},${bg})`;
    ctx.fillRect(0, 0, width, height);

    // update falling emojis
    for (const e of falling) {
      if (e.landed) continue;
      e.vy += GRAVITY;
      e.y += e.vy;

      if (e.y >= e.targetY) {
        e.y = e.targetY;
        e.landed = true;
        stacks[e.col]++;
        busyCols.delete(e.col);
        // draw landed emoji once onto offscreen buffer
        offCtx.font = `${CELL_SIZE - 4}px serif`;
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        offCtx.fillText(e.emoji, e.x, e.y);
      }
    }

    // remove landed from falling array
    for (let i = falling.length - 1; i >= 0; i--) {
      if (falling[i].landed) falling.splice(i, 1);
    }

    // blit landed emojis buffer (single drawImage instead of 1000+ fillText calls)
    ctx.drawImage(offscreen, 0, 0);

    // draw falling emojis
    ctx.font = `${CELL_SIZE - 4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const e of falling) {
      ctx.fillText(e.emoji, e.x, e.y);
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Falling',
    description: 'Emojis fall and stack up',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      offscreen = document.createElement('canvas');
      offCtx = offscreen.getContext('2d');
      resize();
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, width, height);
      loop();
      spawnTimer = window.setInterval(spawnEmoji, SPAWN_INTERVAL);
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      if (spawnTimer !== null) clearInterval(spawnTimer);
      animationFrame = null;
      spawnTimer = null;
      ctx = null;
      offCtx = null;
      falling = [];
      busyCols.clear();
      window.removeEventListener('resize', resize);
    },
  };
}
