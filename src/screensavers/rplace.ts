import type { Screensaver } from '../types';

const IMAGES = [
  { src: '/assets/rplace/rzUhL4w.png', width: 2000, height: 2000 },
  { src: '/assets/rplace/2yz7Go2.png', width: 1000, height: 1000 },
];

const PAN_DURATION = 20000; // ms for one pan segment
const PAUSE_DURATION = 2000; // ms to pause at endpoints
const ZOOM_LEVEL = 4; // how much to zoom in (4x = show 1/4 of image dimension)

export function createRPlace(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let img: HTMLImageElement | null = null;
  let width = 0;
  let height = 0;

  // pan state — these are source coordinates (in image pixels)
  let xStart = 0;
  let yStart = 0;
  let xEnd = 0;
  let yEnd = 0;
  let panStartTime = 0;
  let pausing = false;
  let pauseStartTime = 0;
  let imageInfo = IMAGES[0];

  // The size of the source rectangle we sample from the image.
  // This is the viewport size divided by zoom, giving us a zoomed-in crop.
  function srcWidth() {
    return width / ZOOM_LEVEL;
  }
  function srcHeight() {
    return height / ZOOM_LEVEL;
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    width = canvas.width;
    height = canvas.height;
  }

  function pickNewPan() {
    const sw = srcWidth();
    const sh = srcHeight();
    const maxX = imageInfo.width - sw;
    const maxY = imageInfo.height - sh;

    if (maxX <= 0 || maxY <= 0) {
      xStart = 0;
      yStart = 0;
      xEnd = 0;
      yEnd = 0;
      return;
    }

    // end point of previous pan becomes start of next (or random for first)
    xStart = xEnd || Math.random() * maxX;
    yStart = yEnd || Math.random() * maxY;

    // pick a random end point anywhere on the image (long, sweeping pans)
    xEnd = Math.random() * maxX;
    yEnd = Math.random() * maxY;

    panStartTime = performance.now();
    pausing = false;
  }

  function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function draw(now: number) {
    if (!ctx || !img || !img.complete || !img.naturalWidth) {
      animationFrame = requestAnimationFrame(draw);
      return;
    }

    const sw = srcWidth();
    const sh = srcHeight();

    if (pausing) {
      if (now - pauseStartTime >= PAUSE_DURATION) {
        pickNewPan();
      } else {
        ctx.drawImage(img, xEnd, yEnd, sw, sh, 0, 0, width, height);
        animationFrame = requestAnimationFrame(draw);
        return;
      }
    }

    const elapsed = now - panStartTime;
    let t = Math.min(elapsed / PAN_DURATION, 1);
    t = easeInOut(t);

    const x = xStart + (xEnd - xStart) * t;
    const y = yStart + (yEnd - yStart) * t;

    ctx.drawImage(img, x, y, sw, sh, 0, 0, width, height);

    if (elapsed >= PAN_DURATION) {
      pausing = true;
      pauseStartTime = now;
    }

    animationFrame = requestAnimationFrame(draw);
  }

  return {
    name: 'R-Place',
    description: 'Panning across the r/place canvas',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();

      // pick a random image
      imageInfo = IMAGES[Math.floor(Math.random() * IMAGES.length)];

      img = new Image();
      img.onload = () => {
        const sw = srcWidth();
        const sh = srcHeight();
        const maxX = Math.max(0, imageInfo.width - sw);
        const maxY = Math.max(0, imageInfo.height - sh);
        xEnd = Math.random() * maxX;
        yEnd = Math.random() * maxY;
        pickNewPan();
      };
      img.src = imageInfo.src;

      // use nearest-neighbor for crisp pixel art at zoom
      ctx!.imageSmoothingEnabled = false;

      animationFrame = requestAnimationFrame(draw);
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      img = null;
      window.removeEventListener('resize', resize);
    },
  };
}
