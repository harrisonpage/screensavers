import type { Screensaver } from '../types';

interface Firefly {
  x: number;
  y: number;
  phase: number;
  speed: number;
  brightness: number;
  radius: number;
  // movement
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
  dartTimer: number;
}

export function createFireflies(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let fireflies: Firefly[] = [];
  const count = 60;

  function newDart(): [number, number, number] {
    // ~40% chance to hover in place, 60% short flutter
    if (Math.random() < 0.4) {
      return [0, 0, 15 + Math.random() * 40];
    }
    const angle = Math.random() * Math.PI * 2;
    const mag = 0.3 + Math.random() * 0.8;
    return [Math.cos(angle) * mag, Math.sin(angle) * mag, 8 + Math.random() * 25];
  }

  function spawn() {
    fireflies = [];
    for (let i = 0; i < count; i++) {
      const [tvx, tvy, timer] = newDart();
      fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.015,
        brightness: 0,
        radius: 2 + Math.random() * 3,
        vx: 0,
        vy: 0,
        targetVx: tvx,
        targetVy: tvy,
        dartTimer: timer,
      });
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function loop() {
    if (!ctx) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, width, height);

    for (const f of fireflies) {
      f.phase += f.speed;
      f.brightness = Math.max(0, Math.sin(f.phase));

      // fluttery bug movement — short darts with hovering pauses
      f.dartTimer--;
      if (f.dartTimer <= 0) {
        const [tvx, tvy, timer] = newDart();
        f.targetVx = tvx;
        f.targetVy = tvy;
        f.dartTimer = timer;
      }
      f.vx += (f.targetVx - f.vx) * 0.15;
      f.vy += (f.targetVy - f.vy) * 0.15;
      // tiny random jitter — like wing flutter
      f.x += f.vx + (Math.random() - 0.5) * 0.4;
      f.y += f.vy + (Math.random() - 0.5) * 0.4;

      // wrap
      if (f.x < -10) f.x = width + 10;
      if (f.x > width + 10) f.x = -10;
      if (f.y < -10) f.y = height + 10;
      if (f.y > height + 10) f.y = -10;

      if (f.brightness > 0.05) {
        const alpha = f.brightness * 0.8;
        const glowRadius = f.radius * (2 + f.brightness * 3);

        // glow
        const gradient = ctx.createRadialGradient(
          f.x, f.y, 0,
          f.x, f.y, glowRadius,
        );
        gradient.addColorStop(0, `rgba(180, 255, 50, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(120, 200, 30, ${alpha * 0.4})`);
        gradient.addColorStop(1, 'rgba(80, 150, 20, 0)');

        ctx.beginPath();
        ctx.arc(f.x, f.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // bright center
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 255, 120, ${alpha})`;
        ctx.fill();
      }
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Fireflies',
    description: 'Glowing fireflies in the dark',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      ctx!.fillStyle = 'black';
      ctx!.fillRect(0, 0, width, height);
      spawn();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      fireflies = [];
      window.removeEventListener('resize', resize);
    },
  };
}
