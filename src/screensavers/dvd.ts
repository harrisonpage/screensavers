import type { Screensaver } from '../types';

const DVD_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 187.09 82.68'><path fill='%23ffffff' d='M128.81,10.16H147S169,9,168.45,20.32c-.87,17.47-27.65,16.22-27.65,16.22L146,13.83h-18.2L120.2,46.7h18.06s18,.8,32.88-6.35c15.8-7.62,15.94-21,15.94-21a15.3,15.3,0,0,0-7.76-13.4C170,.42,157.87,0,157.87,0H118.09L94.53,30.62,84.65,0H16.08L13.54,10.16h18.2S53.75,9,53.19,20.32c-.87,17.47-27.65,16.22-27.65,16.22l5.22-22.71H12.56L4.94,46.7H23s18,.8,32.87-6.35c15.8-7.62,15.94-21,15.94-21a35,35,0,0,0-.7-5.5c-.43-1.41-1-3.67-1-3.67H71L87.76,57.28l41.05-47.12ZM88.32,57.28C39.54,57.28,0,63,0,70s39.54,12.7,88.32,12.7S176.64,77,176.64,70,137.1,57.28,88.32,57.28ZM45.54,76.92H41.82L34.06,63.73h5.21l4.46,8,4.48-8h5.22Zm20.93,0h-4.8V63.73h4.8Zm17,0h-6.8V63.73h6.8c5.15,0,9.38,2.89,9.38,6.59S88.58,76.92,83.46,76.92Zm29.16-10.28h-5.7v2.2h5.41v2.9h-5.41V74h5.7v2.9h-10.5V63.73h10.5Zm19.29,10.72c-5.93,0-10.21-3-10.21-7.28,0-4,4.89-6.78,10.21-6.78s10.21,2.79,10.21,6.78C142.12,74.35,137.83,77.36,131.91,77.36Z'/><path fill='%23ffffff' d='M131.91,66.62c2.86,0,5.21,1.66,5.21,3.48,0,2.27-2.35,3.93-5.21,3.93s-5.22-1.66-5.22-3.93c0-1.82,2.35-3.48,5.22-3.48Z'/><path fill='%23ffffff' d='M82.58,66.64H81.45V74h1.08c2.87,0,5.32-1.12,5.32-3.69C87.85,68,85.67,66.64,82.58,66.64Z'/></svg>`;

const COLORS = [
  '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff',
  '#ffffff', '#ff8000', '#8000ff', '#00ff80',
];

export function createBouncingDvd(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  const img = new Image();

  let x = 100;
  let y = 100;
  let vx = 4;
  let vy = 4;
  const scale = 2;
  const baseWidth = 100;
  const baseHeight = 44;
  const logoWidth = baseWidth * scale;
  const logoHeight = baseHeight * scale;
  let tint = '#ffffff';
  let colorIndex = 0;

  // Offscreen canvas for tinting the DVD logo
  let offscreen: HTMLCanvasElement;
  let offCtx: CanvasRenderingContext2D | null = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function nextColor(): string {
    const result = COLORS[colorIndex];
    colorIndex = (colorIndex + 1) % COLORS.length;
    return result;
  }

  function loop() {
    if (!ctx || !offCtx || !img.complete) return;

    const { width, height } = canvas;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Draw tinted logo via offscreen canvas
    offCtx.clearRect(0, 0, logoWidth, logoHeight);
    offCtx.drawImage(img, 0, 0, logoWidth, logoHeight);
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = tint;
    offCtx.fillRect(0, 0, logoWidth, logoHeight);
    offCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(offscreen, x, y);

    x += vx;
    y += vy;

    let bounced = false;
    if (x <= 0 || x + logoWidth >= width) {
      vx *= -1;
      bounced = true;
    }
    if (y <= 0 || y + logoHeight >= height) {
      vy *= -1;
      bounced = true;
    }
    if (bounced) {
      tint = nextColor();
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'DVD',
    description: 'Classic bouncing DVD logo',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');

      offscreen = document.createElement('canvas');
      offscreen.width = logoWidth;
      offscreen.height = logoHeight;
      offCtx = offscreen.getContext('2d');

      resize();
      window.addEventListener('resize', resize);

      img.onload = () => {
        loop();
      };
      img.src = DVD_SVG;
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      offCtx = null;
      window.removeEventListener('resize', resize);
    },
  };
}
