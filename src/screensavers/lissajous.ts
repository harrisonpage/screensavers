import type { Screensaver } from '../types';

export function createLissajous(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let time = 0;
  let freqA = 3;
  let freqB = 2;
  let phaseShift = 0;
  let hue = 0;
  let curveAge = 0;
  const maxAge = 2000;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    ctx!.fillStyle = '#000';
    ctx!.fillRect(0, 0, width, height);
  }

  function newCurve() {
    freqA = 1 + Math.floor(Math.random() * 7);
    freqB = 1 + Math.floor(Math.random() * 7);
    if (freqA === freqB) freqB++;
    phaseShift = 0;
    hue = (hue + 60 + Math.random() * 120) % 360;
    curveAge = 0;
  }

  function loop() {
    if (!ctx) return;

    // fade background slowly
    ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const rx = Math.min(width, height) * 0.38;
    const ry = rx;

    ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const x = cx + rx * Math.sin(freqA * t + phaseShift);
      const y = cy + ry * Math.sin(freqB * t);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    phaseShift += 0.008;
    time += 1;
    curveAge++;

    if (curveAge > maxAge) {
      // fade to black and start new curve
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      for (let i = 0; i < 60; i++) {
        ctx.fillRect(0, 0, width, height);
      }
      newCurve();
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Lissajous',
    description: 'Evolving Lissajous curves',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      newCurve();
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
