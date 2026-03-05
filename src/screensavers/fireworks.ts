import type { Screensaver } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  opacity: number;
}

const COLORS = [
  '#ff0000', '#ff6600', '#ffcc00', '#33cc33',
  '#0099ff', '#6633ff', '#ff33cc', '#ff3366',
  '#00cccc', '#ffff00', '#ff9900', '#cc33ff',
];

const BURST_INTERVAL = 3000;
const PARTICLES_PER_BURST = 80;

export function createFireworks(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let particles: Particle[] = [];
  let lastBurst = 0;

  function burst(time: number) {
    const originX = Math.random() * width * 0.6 + width * 0.2;
    const originY = Math.random() * height * 0.3 + height * 0.1;

    for (let i = 0; i < PARTICLES_PER_BURST; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        opacity: 1,
      });
    }
    lastBurst = time;
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function loop() {
    if (!ctx) return;

    const now = performance.now();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, width, height);

    if (now - lastBurst > BURST_INTERVAL) {
      burst(now);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.vy += 0.08; // gravity
      p.vx *= 0.99; // air resistance
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.003;

      if (p.opacity <= 0 || p.y > height + 20) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Boom',
    description: 'Periodic fireworks bursts',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      ctx!.fillStyle = 'black';
      ctx!.fillRect(0, 0, width, height);
      lastBurst = 0;
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      particles = [];
      window.removeEventListener('resize', resize);
    },
  };
}
