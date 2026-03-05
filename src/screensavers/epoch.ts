// Author: Harrison Page
// License: MIT
// Created: 25-Feb-2026

import type { Screensaver } from '../types';

export function createEpoch(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // floating position and velocity
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;

  const RING_COUNT = 10; // 10 digits of epoch time
  const DIGIT_LABELS = ['1B', '100M', '10M', '1M', '100K', '10K', '1K', '100', '10', '1'];

  // colors for rings — inner (slow) to outer (fast)
  const RING_COLORS = [
    '#ff3333', // 1B — barely moves
    '#ff6633',
    '#ff9933',
    '#ffcc33',
    '#ffff33',
    '#ccff33',
    '#66ff66',
    '#33ffcc',
    '#33ccff',
    '#3399ff', // 1s — spins fast
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function init(c: HTMLCanvasElement) {
    canvas = c;
    ctx = canvas.getContext('2d');
    resize();

    // start near center with a random drift
    x = width / 2;
    y = height / 2;
    const speed = 0.7;
    const angle = Math.random() * Math.PI * 2;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;

    loop();
    window.addEventListener('resize', resize);
  }

  function loop() {
    if (!ctx) return;

    const now = Date.now();
    const epochSec = Math.floor(now / 1000);
    const fracSec = (now % 1000) / 1000; // fractional second for smooth animation

    // extract digits
    const epochStr = epochSec.toString().padStart(RING_COUNT, '0');
    const digits: number[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      digits.push(parseInt(epochStr[i], 10));
    }

    // compute max radius based on screen size
    const maxRadius = Math.min(width, height) * 0.3;
    const ringWidth = maxRadius / (RING_COUNT + 2);

    // update floating position
    x += vx;
    y += vy;

    // bounce off edges with padding
    const pad = maxRadius + ringWidth;
    if (x - pad < 0) { x = pad; vx = Math.abs(vx); }
    if (x + pad > width) { x = width - pad; vx = -Math.abs(vx); }
    if (y - pad < 0) { y = pad; vy = Math.abs(vy); }
    if (y + pad > height) { y = height - pad; vy = -Math.abs(vy); }

    // clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // draw rings from outer (fast, index 9) to inner (slow, index 0)
    for (let i = RING_COUNT - 1; i >= 0; i--) {
      const radius = ringWidth * (i + 2);
      const digit = digits[i];

      // ones place animates smoothly; all others snap
      let progress: number;
      if (i === RING_COUNT - 1) {
        progress = (digit + fracSec) / 10;
      } else {
        progress = digit / 10;
      }

      const angle = progress * Math.PI * 2 - Math.PI / 2; // start from top

      const color = RING_COLORS[i];

      // draw ring background (dark arc for full circle)
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = ringWidth * 0.7;
      ctx.stroke();

      // draw filled arc from top to current position
      ctx.beginPath();
      ctx.arc(x, y, radius, -Math.PI / 2, angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = ringWidth * 0.7;
      ctx.lineCap = 'round';
      ctx.stroke();

      // draw glow
      ctx.beginPath();
      ctx.arc(x, y, radius, -Math.PI / 2, angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = ringWidth * 0.3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // draw digit label at the leading edge of the arc
      const labelX = x + Math.cos(angle) * radius;
      const labelY = y + Math.sin(angle) * radius;
      const labelSize = Math.max(10, ringWidth * 0.45);
      ctx.font = `bold ${labelSize}px "Courier New", Courier, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillText(String(digit), labelX, labelY);
      ctx.shadowBlur = 0;
    }

    // draw epoch number in the center
    const centerFontSize = Math.max(12, ringWidth * 1.2);
    ctx.font = `bold ${centerFontSize}px "Courier New", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.fillText(epochStr, x, y);
    ctx.shadowBlur = 0;

    // draw "UNIX EPOCH" label below
    const labelFontSize = Math.max(8, ringWidth * 0.5);
    ctx.font = `${labelFontSize}px "Courier New", Courier, monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('UNIX EPOCH', x, y + centerFontSize * 0.8);

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Epoch',
    description: 'Radial dials of UNIX epoch time',

    init(c: HTMLCanvasElement) {
      init(c);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      window.removeEventListener('resize', resize);
    },
  };
}
