import type { Screensaver } from '../types';

export function createSpiro(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // current curve parameters
  let R = 0;       // outer radius
  let r = 0;       // inner radius
  let d = 0;       // pen distance from inner center
  let t = 0;       // angle parameter
  let hue = 0;     // current color
  let prevX = 0;
  let prevY = 0;
  let stepsPerFrame = 8;
  let totalSteps = 0;
  let maxSteps = 0;
  let fadeAlpha = 0;
  let fading = false;

  // how many curves we've drawn (shift palette each time)
  let curveCount = 0;

  function gcd(a: number, b: number): number {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) { const tmp = b; b = a % b; a = tmp; }
    return a;
  }

  function newCurve() {
    const scale = Math.min(width, height) * 0.4;

    // pick interesting integer ratios for R and r
    const rInt = 2 + Math.floor(Math.random() * 12);  // 2–13
    const RInt = rInt + 1 + Math.floor(Math.random() * 8); // always bigger
    const diff = RInt - rInt;

    R = scale * (RInt / RInt);  // normalize so outer = scale
    r = scale * (rInt / RInt);
    d = r * (0.3 + Math.random() * 0.9); // pen offset

    t = 0;
    totalSteps = 0;

    // full pattern repeats after 2π * LCM(R_int, r_int) / R_int revolutions
    // in terms of t steps: we need t to go from 0 to 2π * rInt / gcd(RInt, rInt)
    const g = gcd(RInt, rInt);
    const fullRevolutions = rInt / g;
    maxSteps = Math.ceil(fullRevolutions * 2 * Math.PI / 0.02) + 100;

    // starting position
    const x0 = (R - r) * Math.cos(0) + d * Math.cos(((R - r) / r) * 0);
    const y0 = (R - r) * Math.sin(0) - d * Math.sin(((R - r) / r) * 0);
    prevX = width / 2 + x0;
    prevY = height / 2 + y0;

    // shift hue for each new curve
    hue = (curveCount * 47 + Math.random() * 30) % 360;
    curveCount++;
    fading = false;
    fadeAlpha = 0;
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
    }
    newCurve();
  }

  function loop() {
    if (!ctx) return;

    if (fading) {
      // fade out before starting a new curve
      fadeAlpha += 0.008;
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(fadeAlpha, 0.05)})`;
      ctx.fillRect(0, 0, width, height);
      if (fadeAlpha >= 1) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        newCurve();
      }
      animationFrame = requestAnimationFrame(loop);
      return;
    }

    const cx = width / 2;
    const cy = height / 2;
    const ratio = (R - r) / r;

    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    for (let i = 0; i < stepsPerFrame; i++) {
      t += 0.02;
      totalSteps++;

      const x = cx + (R - r) * Math.cos(t) + d * Math.cos(ratio * t);
      const y = cy + (R - r) * Math.sin(t) - d * Math.sin(ratio * t);

      // slowly shift hue along the curve for a rainbow effect
      const lineHue = (hue + t * 5) % 360;
      ctx.strokeStyle = `hsl(${lineHue}, 80%, 60%)`;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();

      prevX = x;
      prevY = y;

      if (totalSteps >= maxSteps) {
        // pause then fade
        fading = true;
        fadeAlpha = 0;
        break;
      }
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Spiro',
    description: 'Layered geometric curves drawn in real time',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      curveCount = 0;
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
