import type { Screensaver } from '../types';

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function createBoids(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let boids: Boid[] = [];

  const COUNT = 200;
  const MAX_SPEED = 3.5;
  const MIN_SPEED = 1.5;
  const VISUAL_RANGE = 75;
  const SEPARATION_DIST = 25;

  // rule weights
  const COHESION = 0.005;
  const ALIGNMENT = 0.05;
  const SEPARATION = 0.05;

  // edge margin and turn force
  const MARGIN = 100;
  const TURN_FACTOR = 0.3;

  // trail fade
  const TRAIL_ALPHA = 0.12;

  // color palette — each boid gets a hue
  let hues: number[] = [];

  function spawn() {
    boids = [];
    hues = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      boids.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
      // cluster hues around a few base colors for a natural look
      const baseHue = [200, 260, 170, 300][i % 4]; // blues, purples, teals, magentas
      hues.push(baseHue + (Math.random() - 0.5) * 30);
    }
  }

  function clampSpeed(b: Boid) {
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (speed > MAX_SPEED) {
      b.vx = (b.vx / speed) * MAX_SPEED;
      b.vy = (b.vy / speed) * MAX_SPEED;
    } else if (speed < MIN_SPEED) {
      b.vx = (b.vx / speed) * MIN_SPEED;
      b.vy = (b.vy / speed) * MIN_SPEED;
    }
  }

  function update() {
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];

      // accumulators for the three rules
      let cohX = 0, cohY = 0, cohCount = 0;
      let aliVx = 0, aliVy = 0, aliCount = 0;
      let sepX = 0, sepY = 0;

      for (let j = 0; j < boids.length; j++) {
        if (i === j) continue;
        const other = boids[j];
        const dx = other.x - b.x;
        const dy = other.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < VISUAL_RANGE) {
          // cohesion — steer toward center of nearby boids
          cohX += other.x;
          cohY += other.y;
          cohCount++;

          // alignment — match velocity of nearby boids
          aliVx += other.vx;
          aliVy += other.vy;
          aliCount++;

          // separation — steer away from very close boids
          if (dist < SEPARATION_DIST) {
            sepX += b.x - other.x;
            sepY += b.y - other.y;
          }
        }
      }

      if (cohCount > 0) {
        cohX /= cohCount;
        cohY /= cohCount;
        b.vx += (cohX - b.x) * COHESION;
        b.vy += (cohY - b.y) * COHESION;
      }

      if (aliCount > 0) {
        aliVx /= aliCount;
        aliVy /= aliCount;
        b.vx += (aliVx - b.vx) * ALIGNMENT;
        b.vy += (aliVy - b.vy) * ALIGNMENT;
      }

      b.vx += sepX * SEPARATION;
      b.vy += sepY * SEPARATION;

      // soft boundary — steer away from edges
      if (b.x < MARGIN) b.vx += TURN_FACTOR;
      if (b.x > width - MARGIN) b.vx -= TURN_FACTOR;
      if (b.y < MARGIN) b.vy += TURN_FACTOR;
      if (b.y > height - MARGIN) b.vy -= TURN_FACTOR;

      clampSpeed(b);

      b.x += b.vx;
      b.y += b.vy;
    }
  }

  function draw() {
    if (!ctx) return;

    // semi-transparent overlay for trails
    ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      const angle = Math.atan2(b.vy, b.vx);
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      const brightness = 50 + (speed / MAX_SPEED) * 30;
      const saturation = 70 + (speed / MAX_SPEED) * 20;

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);

      // draw a small triangle pointing in the direction of travel
      const size = 6;
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.6, -size * 0.4);
      ctx.lineTo(-size * 0.6, size * 0.4);
      ctx.closePath();

      ctx.fillStyle = `hsl(${hues[i]}, ${saturation}%, ${brightness}%)`;
      ctx.fill();

      ctx.restore();
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function loop() {
    if (!ctx) return;
    update();
    draw();
    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Boids',
    description: 'Flocking simulation with emergent behavior',

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
      boids = [];
      hues = [];
      window.removeEventListener('resize', resize);
    },
  };
}
