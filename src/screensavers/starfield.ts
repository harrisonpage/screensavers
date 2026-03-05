import type { Screensaver } from '../types';

interface Star {
  x: number;
  y: number;
  z: number;
  speed: number;
  baseRadius: number;
}

export function createStarfield(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let stars: Star[] = [];
  let width = 0;
  let height = 0;
  const starCount = 300;

  function generateStars() {
    stars = [];
    for (let i = 0; i < starCount; i++) {
      const layer = Math.random();
      const speed = layer < 0.3 ? 2 : layer < 0.7 ? 4 : 7;
      const baseRadius = layer < 0.3 ? 0.5 : layer < 0.7 ? 1 : 1.5;
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        speed,
        baseRadius,
      });
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generateStars();
  }

  function loop() {
    if (!ctx) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    for (const star of stars) {
      star.z -= star.speed;
      if (star.z <= 0) {
        star.z = width;
        star.x = Math.random() * width - width / 2;
        star.y = Math.random() * height - height / 2;
      }

      const sx = (star.x / star.z) * width + width / 2;
      const sy = (star.y / star.z) * height + height / 2;
      const radius = star.baseRadius * (1 - star.z / width) * 3;

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Starfield',
    description: 'Classic flying stars',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      generateStars();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      stars = [];
      window.removeEventListener('resize', resize);
    },
  };
}
