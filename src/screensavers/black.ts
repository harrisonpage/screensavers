import type { Screensaver } from '../types';

export function createBlackScreen(): Screensaver {
  let ctx: CanvasRenderingContext2D | null = null;
  let canvas: HTMLCanvasElement;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  return {
    name: 'Black',
    description: 'Pure black display',
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
