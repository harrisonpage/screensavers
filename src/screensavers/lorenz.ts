import type { Screensaver } from '../types';

export function createLorenz(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // Lorenz system parameters
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  const dt = 0.005;

  // multiple trails for visual richness
  const numTrails = 5;
  let trails: Array<{
    x: number; y: number; z: number;
    hue: number;
    points: Array<{ sx: number; sy: number }>;
  }> = [];

  // rotation for 3D projection
  let rotAngle = 0;
  let fadeCounter = 0;
  const maxFade = 8000; // frames before reset

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
    }
  }

  function initTrails() {
    trails = [];
    for (let i = 0; i < numTrails; i++) {
      trails.push({
        x: 1 + (Math.random() - 0.5) * 0.1,
        y: 1 + (Math.random() - 0.5) * 0.1,
        z: 1 + (Math.random() - 0.5) * 0.1,
        hue: (i * 360 / numTrails + Math.random() * 30) % 360,
        points: [],
      });
    }
    fadeCounter = 0;
  }

  function project(x: number, y: number, z: number): { sx: number; sy: number } {
    // rotate around Y axis
    const cosR = Math.cos(rotAngle);
    const sinR = Math.sin(rotAngle);
    const rx = x * cosR - z * sinR;
    const rz = x * sinR + z * cosR;

    // simple perspective projection
    const scale = Math.min(width, height) / 80;
    const sx = width / 2 + rx * scale;
    const sy = height / 2 - (y - rho) * scale * 0.7;
    return { sx, sy };
  }

  function step(trail: typeof trails[0]) {
    const { x, y, z } = trail;
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    trail.x += dx * dt;
    trail.y += dy * dt;
    trail.z += dz * dt;

    const p = project(trail.x, trail.y, trail.z);
    trail.points.push(p);

    // keep trail length manageable
    if (trail.points.length > 2000) {
      trail.points.shift();
    }
  }

  function loop() {
    if (!ctx) return;

    // slow fade for trails effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, width, height);

    rotAngle += 0.0008;

    // reproject all points with current rotation
    for (const trail of trails) {
      // step the simulation multiple times per frame for speed
      for (let s = 0; s < 8; s++) {
        step(trail);
      }

      // draw recent segment
      const pts = trail.points;
      if (pts.length < 2) continue;

      // redraw trail with fading opacity along length
      const drawCount = Math.min(pts.length, 500);
      const startIdx = pts.length - drawCount;

      ctx.lineWidth = 1.2;
      for (let i = startIdx + 1; i < pts.length; i++) {
        const alpha = ((i - startIdx) / drawCount) * 0.8;
        ctx.strokeStyle = `hsla(${trail.hue}, 85%, 60%, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].sx, pts[i - 1].sy);
        ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.stroke();
      }

      // bright dot at current position
      const last = pts[pts.length - 1];
      ctx.fillStyle = `hsl(${trail.hue}, 90%, 75%)`;
      ctx.beginPath();
      ctx.arc(last.sx, last.sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    fadeCounter++;
    if (fadeCounter > maxFade) {
      // fade out and restart with new initial conditions
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      for (let i = 0; i < 60; i++) {
        ctx.fillRect(0, 0, width, height);
      }
      initTrails();
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Lorenz',
    description: 'Lorenz attractor butterfly',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      initTrails();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      trails = [];
      window.removeEventListener('resize', resize);
    },
  };
}
