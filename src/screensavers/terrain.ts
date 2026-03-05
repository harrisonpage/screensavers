import type { Screensaver } from '../types';

export function createTerrain(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let lastTime = 0;

  // Flight state
  let offsetZ = 0;
  const flySpeed = 0.3; // units per second

  // Terrain grid parameters
  const pointsPerLine = 120;
  const numLines = 60;
  const lineSpacing = 1.0 / numLines;

  // Colors from the Alien movie aesthetic
  const lineColor = { r: 66, g: 161, b: 235 };

  // Simplex-like noise (2D value noise with smooth interpolation)
  // We use multiple octaves for interesting terrain
  const PERM_SIZE = 512;
  const perm: number[] = [];
  const gradValues: number[] = [];

  function initNoise() {
    // Generate a permutation table and gradient values
    for (let i = 0; i < PERM_SIZE; i++) {
      perm[i] = i;
      gradValues[i] = Math.random() * 2 - 1;
    }
    // Shuffle
    for (let i = PERM_SIZE - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    // Duplicate for overflow
    for (let i = 0; i < PERM_SIZE; i++) {
      perm[i + PERM_SIZE] = perm[i];
      gradValues[i + PERM_SIZE] = gradValues[i];
    }
  }

  function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  function noise2D(x: number, y: number): number {
    const xi = Math.floor(x) & (PERM_SIZE - 1);
    const yi = Math.floor(y) & (PERM_SIZE - 1);
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    const x1 = lerp(gradValues[aa], gradValues[ba], u);
    const x2 = lerp(gradValues[ab], gradValues[bb], u);

    return lerp(x1, x2, v);
  }

  function fbm(x: number, y: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxVal = 0;

    // 5 octaves of noise
    for (let i = 0; i < 5; i++) {
      value += noise2D(x * frequency, y * frequency) * amplitude;
      maxVal += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }

    return value / maxVal;
  }

  function getHeight(x: number, z: number): number {
    // Base terrain from fractal noise
    const h = fbm(x * 2.5, z * 2.5);

    // Add some ridge-like features
    const ridge = 1.0 - Math.abs(noise2D(x * 1.2, z * 1.2));
    const ridgeDetail = ridge * ridge * 0.4;

    return (h * 0.6 + ridgeDetail) * 0.8;
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function loop(timestamp: number) {
    if (!ctx) return;

    if (lastTime === 0) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    // Advance the flight
    offsetZ += flySpeed * dt;

    // Clear to black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Perspective parameters
    const horizonY = height * 0.12;    // horizon line position (near top)
    const groundBase = height * 1.15;  // bottom of the screen (below viewport)
    const fovSpread = 2.2;             // field of view lateral spread

    // Draw terrain lines from back (far) to front (near)
    // Far lines are at the top (near horizon), near lines at bottom
    for (let lineIdx = numLines - 1; lineIdx >= 0; lineIdx--) {
      const zNorm = lineIdx / numLines; // 0 = nearest, 1 = farthest
      const worldZ = offsetZ + zNorm * 4.0; // world-space Z coordinate

      // Perspective: far lines are closer to horizon
      const perspT = zNorm;
      const screenY = horizonY + (groundBase - horizonY) * (1 - perspT);

      // Height scale diminishes with distance (perspective)
      const heightScale = (1 - perspT * 0.7) * height * 0.45;

      // Lateral spread increases for nearer lines
      const lateralScale = (1 - perspT * 0.6) * fovSpread;

      // Alpha fades for distant lines
      const alpha = Math.min(1.0, (1 - perspT) * 1.5);
      if (alpha <= 0) continue;

      // Build the polyline for this terrain row
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i <= pointsPerLine; i++) {
        const xNorm = i / pointsPerLine; // 0 to 1
        const worldX = (xNorm - 0.5) * lateralScale;

        const h = getHeight(worldX + 0.5, worldZ);
        const screenX = width * xNorm;
        const screenYOffset = screenY - h * heightScale;

        points.push({ x: screenX, y: screenYOffset });
      }

      // First, draw a filled black polygon below the line to mask lines behind
      // This is the key technique from the AlienLander / Alien movie
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      // Close down to the bottom of the screen
      ctx.lineTo(width, groundBase + 100);
      ctx.lineTo(0, groundBase + 100);
      ctx.closePath();
      ctx.fillStyle = '#000';
      ctx.fill();

      // Now draw the terrain line on top
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = `rgba(${lineColor.r}, ${lineColor.g}, ${lineColor.b}, ${alpha})`;
      ctx.lineWidth = Math.max(0.5, (1 - perspT) * 1.5);
      ctx.stroke();
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Terrain',
    description: 'Alien-inspired wireframe terrain flyover',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      lastTime = 0;
      offsetZ = 0;
      initNoise();
      resize();
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
