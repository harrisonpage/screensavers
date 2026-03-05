import type { Screensaver } from '../types';

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

export function createMatrixRain(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let drops: number[] = [];
  let fontSize = 0;
  let colCount = 0;
  let frameCount = 0;

  function randomChar(): string {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function initDrops() {
    fontSize = 16;
    colCount = Math.ceil(width / fontSize);
    drops = [];
    for (let i = 0; i < colCount; i++) {
      // start at random heights so it doesn't all begin at once
      drops[i] = Math.random() * -100;
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initDrops();
  }

  function loop() {
    if (!ctx) return;
    frameCount++;

    // skip every other frame for a more deliberate pace
    if (frameCount % 2 === 0) {
      animationFrame = requestAnimationFrame(loop);
      return;
    }

    // fade the screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // only draw if on screen
      if (y >= 0 && y < height + fontSize) {
        // bright head character
        ctx.fillStyle = '#aaffaa';
        ctx.fillText(randomChar(), x, y);

        // dimmer character just behind the head for density
        if (y - fontSize >= 0) {
          ctx.fillStyle = '#00cc00';
          ctx.fillText(randomChar(), x, y - fontSize);
        }
      }

      drops[i]++;

      // reset with random chance once past bottom
      if (y > height && Math.random() > 0.975) {
        drops[i] = 0;
      }
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Matrix Rain',
    description: 'Digital rain from The Matrix',
    disabled: true,

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      ctx!.fillStyle = 'black';
      ctx!.fillRect(0, 0, width, height);
      frameCount = 0;
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      drops = [];
      window.removeEventListener('resize', resize);
    },
  };
}
