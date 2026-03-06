import type { Screensaver } from '../types';

const TOASTER_SPRITE = '/assets/toast/toaster.gif';
const TOAST_SPRITE = '/assets/toast/toast.gif';

// sprite sheet: 256x64, 4 frames of 64x64
const FRAME_SIZE = 64;
const FRAME_COUNT = 4;
const FLAP_SPEED = 0.15; // seconds per frame

interface FlyingObject {
  x: number;
  y: number;
  speed: number;       // pixels per frame
  scale: number;       // size multiplier
  isToast: boolean;
  frame: number;       // current animation frame (toasters only)
  flapTimer: number;   // time accumulator for flapping
}

export function createToasters(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  let toasterImg: HTMLImageElement;
  let toastImg: HTMLImageElement;
  let imagesLoaded = 0;

  let objects: FlyingObject[] = [];
  let lastTime = 0;

  const TOASTER_COUNT = 15;
  const TOAST_COUNT = 8;

  function spawnObject(isToast: boolean): FlyingObject {
    // spawn off-screen: top or right edge
    // they fly diagonally from upper-right to lower-left
    const diagonal = Math.sqrt(width * width + height * height);
    const speed = 1.5 + Math.random() * 2.5;
    const scale = 1.2 + Math.random() * 0.8;

    // randomly start from top edge or right edge
    let x: number, y: number;
    if (Math.random() < 0.5) {
      // spawn above top edge, random x
      x = Math.random() * (width + 200);
      y = -FRAME_SIZE * scale - Math.random() * 300;
    } else {
      // spawn off right edge, random y
      x = width + Math.random() * 300;
      y = -FRAME_SIZE * scale + Math.random() * height * 0.5;
    }

    return {
      x,
      y,
      speed,
      scale,
      isToast,
      frame: Math.floor(Math.random() * FRAME_COUNT),
      flapTimer: Math.random() * FLAP_SPEED, // stagger flap timing
    };
  }

  function spawn() {
    objects = [];
    for (let i = 0; i < TOASTER_COUNT; i++) {
      objects.push(spawnObject(false));
    }
    for (let i = 0; i < TOAST_COUNT; i++) {
      objects.push(spawnObject(true));
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function loop(time: number) {
    if (!ctx) return;

    const dt = lastTime ? (time - lastTime) / 16.667 : 1; // normalize to ~60fps
    lastTime = time;

    // clear to black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    if (imagesLoaded < 2) {
      animationFrame = requestAnimationFrame(loop);
      return;
    }

    for (const obj of objects) {
      // move diagonally: left and down
      obj.x -= obj.speed * dt;
      obj.y += obj.speed * dt;

      // animate toaster wing flap
      if (!obj.isToast) {
        obj.flapTimer += dt / 60;
        if (obj.flapTimer >= FLAP_SPEED) {
          obj.flapTimer -= FLAP_SPEED;
          obj.frame = (obj.frame + 1) % FRAME_COUNT;
        }
      }

      // draw
      const drawSize = FRAME_SIZE * obj.scale;

      if (obj.isToast) {
        ctx.drawImage(toastImg, obj.x, obj.y, drawSize, drawSize);
      } else {
        // draw current frame from sprite sheet
        ctx.drawImage(
          toasterImg,
          obj.frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, // source
          obj.x, obj.y, drawSize, drawSize, // destination
        );
      }

      // respawn when off-screen (past left edge or below bottom)
      if (obj.x < -drawSize - 50 || obj.y > height + drawSize + 50) {
        const fresh = spawnObject(obj.isToast);
        obj.x = fresh.x;
        obj.y = fresh.y;
        obj.speed = fresh.speed;
        obj.scale = fresh.scale;
      }
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Toasters',
    description: 'Flying toasters and toast',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      // pixelated rendering for the retro sprites
      ctx!.imageSmoothingEnabled = false;
      imagesLoaded = 0;
      lastTime = 0;

      resize();
      ctx!.fillStyle = 'black';
      ctx!.fillRect(0, 0, width, height);

      toasterImg = new Image();
      toasterImg.onload = () => { imagesLoaded++; };
      toasterImg.src = TOASTER_SPRITE;

      toastImg = new Image();
      toastImg.onload = () => { imagesLoaded++; };
      toastImg.src = TOAST_SPRITE;

      spawn();
      animationFrame = requestAnimationFrame(loop);
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      objects = [];
      window.removeEventListener('resize', resize);
    },
  };
}
