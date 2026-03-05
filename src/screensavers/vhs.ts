import type { Screensaver } from '../types';

const IMAGE_PATHS = [
  'assets/vhs/287304980037_.jpg',
  'assets/vhs/432630250007_7.jpg',
  'assets/vhs/L1002353-2.jpg',
  'assets/vhs/L1010371.jpg',
];

export function createVhs(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  let images: HTMLImageElement[] = [];
  let currentImage = 0;
  let imageTimer = 0;
  const IMAGE_DURATION = 600; // frames (~10s at 60fps)

  // tracking band state
  let trackingY = -100;
  let trackingSpeed = 0;
  let trackingHeight = 0;
  let trackingActive = false;
  let trackingCooldown = 0;

  // glitch burst state
  let glitchTimer = 0;
  let glitchDuration = 0;
  let glitching = false;

  // timestamp blink
  let frame = 0;

  // vertical jitter
  let jitterOffset = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function drawImage() {
    if (!ctx || images.length === 0) return;
    const img = images[currentImage];
    if (!img || !img.complete) return;

    // cover-fit the image
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;
    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (imgAspect > canvasAspect) {
      drawH = height;
      drawW = height * imgAspect;
      drawX = (width - drawW) / 2;
      drawY = 0;
    } else {
      drawW = width;
      drawH = width / imgAspect;
      drawX = 0;
      drawY = (height - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY + jitterOffset, drawW, drawH);
  }

  function drawScanlines() {
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  function drawTrackingBand() {
    if (!ctx || !trackingActive) return;

    // the band: a region of horizontal displacement and brightness shift
    for (let y = 0; y < trackingHeight; y++) {
      const bandY = Math.floor(trackingY + y);
      if (bandY < 0 || bandY >= height) continue;

      const intensity = Math.sin((y / trackingHeight) * Math.PI);
      const shift = intensity * (30 + Math.random() * 20);

      // shift a horizontal strip
      ctx.drawImage(canvas, 0, bandY, width, 1, shift, bandY, width, 1);

      // brighten the band
      ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.15})`;
      ctx.fillRect(0, bandY, width, 1);
    }
  }

  function drawGlitchBurst() {
    if (!ctx || !glitching) return;

    // randomly displace horizontal strips
    const numStrips = 5 + Math.floor(Math.random() * 10);
    for (let i = 0; i < numStrips; i++) {
      const y = Math.floor(Math.random() * height);
      const stripH = 2 + Math.floor(Math.random() * 20);
      const shift = (Math.random() - 0.5) * 80;
      ctx.drawImage(canvas, 0, y, width, stripH, shift, y, width, stripH);
    }

    // color bleed — red/blue channel offset feel
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 0, 0, ${0.03 + Math.random() * 0.04})`;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = `rgba(0, 0, 255, ${0.03 + Math.random() * 0.04})`;
    ctx.fillRect(2, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawTimestamp() {
    if (!ctx) return;

    // blinking 12:00 — the universal VHS sign
    const blink = Math.floor(frame / 30) % 2 === 0;
    if (!blink) return;

    const fontSize = Math.max(20, Math.floor(height * 0.035));
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;

    const text = '12:00 AM';
    const x = width - fontSize * 6;
    const y = height - fontSize * 1.5;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  function drawPlayIndicator() {
    if (!ctx) return;

    const fontSize = Math.max(18, Math.floor(height * 0.03));
    const x = fontSize * 1.2;
    const y = fontSize * 2;

    // play triangle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - fontSize * 0.4);
    ctx.lineTo(x, y + fontSize * 0.4);
    ctx.lineTo(x + fontSize * 0.5, y);
    ctx.closePath();
    ctx.fill();

    // "SP" text
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.fillText('PLAY', x + fontSize * 0.7, y + fontSize * 0.3);

    // tape speed indicator
    ctx.font = `bold ${Math.floor(fontSize * 0.7)}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('SP', x, y + fontSize * 1.2);
    ctx.shadowBlur = 0;
  }

  function drawNoise() {
    if (!ctx) return;
    // sparse random white dots for tape noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const count = Math.floor(width * height * 0.0001);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function drawVignette() {
    if (!ctx) return;
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, height * 0.3,
      width / 2, height / 2, height * 0.9,
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function loop() {
    if (!ctx) return;
    frame++;
    imageTimer++;

    // cycle images
    if (imageTimer >= IMAGE_DURATION && images.length > 1) {
      imageTimer = 0;
      currentImage = (currentImage + 1) % images.length;
    }

    // subtle vertical jitter
    jitterOffset = (Math.random() - 0.5) * 2;

    // trigger tracking band occasionally
    if (!trackingActive) {
      trackingCooldown--;
      if (trackingCooldown <= 0) {
        trackingActive = true;
        trackingY = -60;
        trackingHeight = 30 + Math.random() * 60;
        trackingSpeed = 1.5 + Math.random() * 3;
        trackingCooldown = 200 + Math.floor(Math.random() * 400);
      }
    } else {
      trackingY += trackingSpeed;
      if (trackingY > height + trackingHeight) {
        trackingActive = false;
      }
    }

    // trigger glitch bursts rarely
    if (!glitching) {
      glitchTimer--;
      if (glitchTimer <= 0) {
        glitching = true;
        glitchDuration = 3 + Math.floor(Math.random() * 8);
        glitchTimer = 300 + Math.floor(Math.random() * 600);
      }
    } else {
      glitchDuration--;
      if (glitchDuration <= 0) {
        glitching = false;
      }
    }

    // clear
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // draw the frozen frame
    drawImage();

    // slight desaturation / blue tint overlay
    ctx.fillStyle = 'rgba(0, 0, 30, 0.15)';
    ctx.fillRect(0, 0, width, height);

    // VHS effects
    drawScanlines();
    drawTrackingBand();
    drawGlitchBurst();
    drawNoise();
    drawVignette();

    // OSD overlays
    drawPlayIndicator();
    drawTimestamp();

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'VHS',
    description: 'Paused VHS tape with tracking artifacts',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      frame = 0;
      imageTimer = 0;
      currentImage = 0;
      trackingCooldown = 60;
      glitchTimer = 120;
      glitching = false;
      trackingActive = false;

      resize();
      ctx!.fillStyle = 'black';
      ctx!.fillRect(0, 0, width, height);

      // load images
      images = [];
      for (const path of IMAGE_PATHS) {
        const img = new Image();
        img.src = path;
        images.push(img);
      }

      // shuffle order
      for (let i = images.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [images[i], images[j]] = [images[j], images[i]];
      }

      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      images = [];
      window.removeEventListener('resize', resize);
    },
  };
}
