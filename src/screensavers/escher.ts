// Author: Harrison Page
// License: MIT
// Created: 25-Feb-2026

import type { Screensaver } from '../types';

export function createEscher(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let time = 0;

  // Isometric cube dimensions
  const CUBE_SIZE = 60;
  // Height of a single isometric rhombus face
  const H = CUBE_SIZE * Math.sin(Math.PI / 6); // 30
  const W = CUBE_SIZE * Math.cos(Math.PI / 6); // ~52

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  // Draw a single isometric cube face (rhombus)
  function drawRhombus(
    cx: number, cy: number,
    face: 'top' | 'left' | 'right',
    color: string,
    size: number
  ) {
    if (!ctx) return;
    const h = size * Math.sin(Math.PI / 6);
    const w = size * Math.cos(Math.PI / 6);

    ctx.fillStyle = color;
    ctx.beginPath();

    switch (face) {
      case 'top':
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + w, cy - h);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx - w, cy - h);
        break;
      case 'left':
        ctx.moveTo(cx - w, cy - h);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - w, cy + h);
        break;
      case 'right':
        ctx.moveTo(cx + w, cy - h);
        ctx.lineTo(cx + w, cy + h);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx, cy);
        break;
    }

    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw a full isometric cube at center position
  function drawCube(cx: number, cy: number, size: number, hue: number, lightness: number, phase: number) {
    // The phase controls the "flip" - cubes appear to invert between convex and concave
    const flip = Math.sin(phase);
    const l1 = lightness + flip * 10;
    const l2 = lightness - 15 + flip * 5;
    const l3 = lightness - 30 + flip * 5;

    const topColor = `hsl(${hue}, 15%, ${Math.max(20, Math.min(90, l1))}%)`;
    const leftColor = `hsl(${hue}, 15%, ${Math.max(20, Math.min(90, l2))}%)`;
    const rightColor = `hsl(${hue}, 15%, ${Math.max(20, Math.min(90, l3))}%)`;

    drawRhombus(cx, cy, 'top', topColor, size);
    drawRhombus(cx, cy, 'left', leftColor, size);
    drawRhombus(cx, cy, 'right', rightColor, size);
  }

  function loop() {
    if (!ctx) return;

    time += 0.004;

    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    const size = CUBE_SIZE;
    const h = size * Math.sin(Math.PI / 6);
    const w = size * Math.cos(Math.PI / 6);

    // Grid spacing
    const colStep = w * 2;
    const rowStep = size + h;

    // How many columns and rows to cover the screen (with padding)
    const cols = Math.ceil(width / colStep) + 3;
    const rows = Math.ceil(height / rowStep) + 3;

    // Center the grid
    const totalW = cols * colStep;
    const totalH = rows * rowStep;
    const offsetX = (width - totalW) / 2 + colStep;
    const offsetY = (height - totalH) / 2 + rowStep;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const isOddRow = row % 2 !== 0;
        const cx = offsetX + col * colStep + (isOddRow ? w : 0);
        const cy = offsetY + row * rowStep;

        // Create a wave of color/phase across the grid
        const dist = Math.sqrt(
          (cx - width / 2) ** 2 + (cy - height / 2) ** 2
        );
        const wave = dist * 0.005 - time * 2;

        // Hue shifts in waves radiating from center
        const hue = (200 + Math.sin(wave) * 40 + time * 15) % 360;

        // Lightness oscillates to create the tumbling block illusion
        const lightness = 65 + Math.sin(wave * 1.3 + time) * 15;

        // Phase creates the convex/concave flip animation
        const phase = wave * 0.7 + time * 0.5;

        // Subtle size pulsing
        const sizeVar = size + Math.sin(wave * 0.8 + time * 0.3) * 3;

        drawCube(cx, cy, sizeVar, hue, lightness, phase);
      }
    }

    // Vignette overlay
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Escher',
    description: 'Impossible isometric cubes inspired by M.C. Escher',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = Math.random() * 100;
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
