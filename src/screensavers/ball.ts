import type { Screensaver } from '../types';

const COLORS = [
  '#ff3366', '#ff6633', '#ffcc00', '#33cc66',
  '#3399ff', '#9933ff', '#ff33cc', '#00cccc',
];

export function createBouncingBall(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  let x = 0;
  let y = 0;
  let vx = 4;
  let vy = 0;
  const gravity = 0.3;
  const bounceDamping = 0.85;
  const radius = 15;
  let color = COLORS[0];
  let colorIndex = 0;

  // trail
  const trail: Array<{ x: number; y: number; age: number }> = [];
  const maxTrail = 40;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function loop() {
    if (!ctx) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, width, height);

    // physics
    vy += gravity;
    x += vx;
    y += vy;

    let bounced = false;

    // floor
    if (y + radius >= height) {
      y = height - radius;
      vy = -vy * bounceDamping;
      bounced = true;
    }

    // ceiling
    if (y - radius <= 0) {
      y = radius;
      vy = -vy * bounceDamping;
      bounced = true;
    }

    // walls
    if (x + radius >= width || x - radius <= 0) {
      if (x + radius >= width) x = width - radius;
      if (x - radius <= 0) x = radius;
      vx = -vx;
      bounced = true;
    }

    if (bounced) {
      colorIndex = (colorIndex + 1) % COLORS.length;
      color = COLORS[colorIndex];

      // re-energize if too slow
      if (Math.abs(vy) < 2) {
        vy = -(8 + Math.random() * 4);
      }
    }

    // trail
    trail.push({ x, y, age: 0 });
    if (trail.length > maxTrail) trail.shift();

    // draw trail
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      t.age++;
      const alpha = (1 - i / trail.length) * 0.4;
      const r = radius * (0.3 + (i / trail.length) * 0.7);
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', '');

      // hex to rgba for trail
      const hex = color;
      const rr = parseInt(hex.slice(1, 3), 16);
      const gg = parseInt(hex.slice(3, 5), 16);
      const bb = parseInt(hex.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${alpha})`;
      ctx.fill();
    }

    // draw ball
    const gradient = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, radius);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Bounce',
    description: 'Ball with gravity and trails',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      x = width / 2;
      y = height / 3;
      vx = 3 + Math.random() * 2;
      vy = 0;
      trail.length = 0;
      ctx!.fillStyle = 'black';
      ctx!.fillRect(0, 0, width, height);
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      trail.length = 0;
      window.removeEventListener('resize', resize);
    },
  };
}
