import type { Screensaver } from '../types';

export function createPlasma(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let imageData: ImageData | null = null;
  let time = 0;

  // downscale for performance
  const SCALE = 4;
  let scaledW = 0;
  let scaledH = 0;

  // precomputed palette (256 entries)
  const palette: Array<[number, number, number]> = [];

  function buildPalette() {
    palette.length = 0;
    for (let i = 0; i < 256; i++) {
      const t = i / 256;
      const r = Math.floor(128 + 127 * Math.sin(Math.PI * 2 * t));
      const g = Math.floor(128 + 127 * Math.sin(Math.PI * 2 * t + 2.094));
      const b = Math.floor(128 + 127 * Math.sin(Math.PI * 2 * t + 4.188));
      palette.push([r, g, b]);
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    scaledW = Math.floor(width / SCALE);
    scaledH = Math.floor(height / SCALE);
    if (ctx) {
      imageData = ctx.createImageData(scaledW, scaledH);
      ctx.imageSmoothingEnabled = true;
    }
  }

  function loop() {
    if (!ctx || !imageData) return;

    time += 0.03;
    const data = imageData.data;

    for (let y = 0; y < scaledH; y++) {
      for (let x = 0; x < scaledW; x++) {
        const fx = x / scaledW;
        const fy = y / scaledH;

        // layered sine functions for plasma effect
        let v = 0;
        v += Math.sin(fx * 10 + time);
        v += Math.sin((fy * 10 + time) * 0.7);
        v += Math.sin((fx * 10 + fy * 10 + time) * 0.5);
        v += Math.sin(Math.sqrt(fx * fx * 100 + fy * fy * 100 + 1) + time * 0.8);
        v += Math.sin(Math.sqrt((fx - 0.5) * (fx - 0.5) * 64 + (fy - 0.5) * (fy - 0.5) * 64) - time * 1.2);

        // map to palette
        const idx = Math.floor(((v / 5 + 1) / 2) * 255 + time * 30) & 0xff;
        const [r, g, b] = palette[idx];

        const off = (y * scaledW + x) * 4;
        data[off] = r;
        data[off + 1] = g;
        data[off + 2] = b;
        data[off + 3] = 255;
      }
    }

    // draw scaled-down image then stretch
    const offscreen = new OffscreenCanvas(scaledW, scaledH);
    const offCtx = offscreen.getContext('2d')!;
    offCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(offscreen, 0, 0, width, height);

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Plasma',
    description: 'Old-school demoscene plasma effect',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = Math.random() * 100;
      buildPalette();
      resize();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      imageData = null;
      window.removeEventListener('resize', resize);
    },
  };
}
