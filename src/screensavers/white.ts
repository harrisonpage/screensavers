import type { Screensaver } from '../types';

export function createWhiteScreen(): Screensaver {
  let ctx: CanvasRenderingContext2D | null = null;
  let canvas: HTMLCanvasElement;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  return {
    name: 'White',
    description: 'Pure white display',
    boring: true,

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      ctx = null;
      window.removeEventListener('resize', resize);
    },
  };
}
