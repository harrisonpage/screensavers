import type { Screensaver } from '../types';

export function createGradients(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let time = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function hslColor(h: number, s: number, l: number): string {
    return `hsl(${h % 360}, ${s}%, ${l}%)`;
  }

  function loop() {
    if (!ctx) return;
    time += 0.003;

    const h1 = (time * 40) % 360;
    const h2 = (h1 + 120 + Math.sin(time * 0.7) * 60) % 360;
    const h3 = (h1 + 240 + Math.cos(time * 0.5) * 60) % 360;

    // diagonal gradient that shifts over time
    const x0 = width * (0.5 + 0.5 * Math.sin(time * 0.8));
    const y0 = height * (0.5 + 0.5 * Math.cos(time * 0.6));
    const x1 = width * (0.5 + 0.5 * Math.sin(time * 0.8 + Math.PI));
    const y1 = height * (0.5 + 0.5 * Math.cos(time * 0.6 + Math.PI));

    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, hslColor(h1, 70, 50));
    gradient.addColorStop(0.5, hslColor(h2, 80, 45));
    gradient.addColorStop(1, hslColor(h3, 70, 50));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Gradients',
    description: 'Slowly shifting color gradients',

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
      window.removeEventListener('resize', resize);
    },
  };
}
