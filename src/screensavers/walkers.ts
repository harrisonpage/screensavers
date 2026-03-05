import type { Screensaver } from '../types';

interface Walker {
  x: number;
  y: number;
  hue: number;
}

export function createWalkers(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let walkers: Walker[] = [];
  const count = 12;
  const stepSize = 3;

  function spawnWalkers() {
    walkers = [];
    for (let i = 0; i < count; i++) {
      walkers.push({
        x: width / 2,
        y: height / 2,
        hue: (i / count) * 360,
      });
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    ctx!.fillStyle = '#000';
    ctx!.fillRect(0, 0, width, height);
    spawnWalkers();
  }

  function loop() {
    if (!ctx) return;

    // very slow fade so trails persist
    ctx.fillStyle = 'rgba(0, 0, 0, 0.005)';
    ctx.fillRect(0, 0, width, height);

    for (const w of walkers) {
      const prevX = w.x;
      const prevY = w.y;

      w.x += (Math.random() - 0.5) * stepSize * 2;
      w.y += (Math.random() - 0.5) * stepSize * 2;

      // wrap around
      if (w.x < 0) w.x += width;
      if (w.x >= width) w.x -= width;
      if (w.y < 0) w.y += height;
      if (w.y >= height) w.y -= height;

      // only draw line if we didn't wrap
      const dx = Math.abs(w.x - prevX);
      const dy = Math.abs(w.y - prevY);
      if (dx < width / 2 && dy < height / 2) {
        ctx.strokeStyle = `hsla(${w.hue}, 70%, 55%, 0.6)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(w.x, w.y);
        ctx.stroke();
      }

      // dot at current position
      ctx.fillStyle = `hsl(${w.hue}, 80%, 65%)`;
      ctx.fillRect(w.x - 1, w.y - 1, 2, 2);

      w.hue = (w.hue + 0.05) % 360;
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Walkers',
    description: 'Random walkers leaving colorful trails',

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
      walkers = [];
      window.removeEventListener('resize', resize);
    },
  };
}
