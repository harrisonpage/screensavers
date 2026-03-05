import type { Screensaver } from '../types';

const MIN_ID = 1;
const MAX_ID = 9800;
const CYCLE_MS = 10_000;

function randomId(): number {
  return Math.floor(Math.random() * (MAX_ID - MIN_ID + 1)) + MIN_ID;
}

export function createBoneQuest(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let imgEl: HTMLImageElement | null = null;
  let stopped = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function loadComic() {
    const id = randomId();
    const img = document.createElement('img');
    img.style.position = 'fixed';
    img.style.top = '50%';
    img.style.left = '50%';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.imageRendering = 'pixelated';
    img.style.zIndex = '1001';
    img.style.cursor = 'none';

    img.onload = () => {
      if (stopped) return;
      // Scale image to fit viewport with margin, preserving aspect ratio
      const margin = 0.05;
      const vw = window.innerWidth * (1 - 2 * margin);
      const vh = window.innerHeight * (1 - 2 * margin);
      const scale = Math.min(vw / img.naturalWidth, vh / img.naturalHeight);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      img.style.width = w + 'px';
      img.style.height = h + 'px';
      // Remove old image, show new one
      if (imgEl && imgEl.parentNode) {
        imgEl.parentNode.removeChild(imgEl);
      }
      imgEl = img;
      document.body.appendChild(img);
      scheduleNext();
    };

    img.onerror = () => {
      if (stopped) return;
      // Bad ID, try another
      loadComic();
    };

    img.src = `https://bonequest.com/${id}.gif`;
  }

  function scheduleNext() {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      loadComic();
    }, CYCLE_MS);
  }

  return {
    name: 'BoneQuest',
    description: 'Random comics from bonequest.com',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
      loadComic();
    },

    shutdown() {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (imgEl && imgEl.parentNode) {
        imgEl.parentNode.removeChild(imgEl);
      }
      imgEl = null;
      ctx = null;
      window.removeEventListener('resize', resize);
    },
  };
}
