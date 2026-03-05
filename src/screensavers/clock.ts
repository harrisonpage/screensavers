import type { Screensaver } from '../types';

export function createClock(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function pad(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }

  function loop() {
    if (!ctx) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    const now = new Date();
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    const timeStr = `${hours}:${minutes}:${seconds}`;

    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dateStr = `${days[now.getDay()]}  ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    // time
    const fontSize = Math.min(width * 0.15, height * 0.25);
    ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // glow
    ctx.shadowColor = '#33ff33';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#33ff33';
    ctx.fillText(timeStr, width / 2, height / 2 - fontSize * 0.15);

    // date (smaller, dimmer)
    const dateFontSize = fontSize * 0.25;
    ctx.font = `${dateFontSize}px "Courier New", Courier, monospace`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(51, 255, 51, 0.6)';
    ctx.fillText(dateStr, width / 2, height / 2 + fontSize * 0.5);

    ctx.shadowBlur = 0;

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Clock',
    description: 'Retro digital clock',

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
