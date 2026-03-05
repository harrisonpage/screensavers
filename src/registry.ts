import type { ScreensaverFactory, Screensaver } from './types';

let activeScreensaver: Screensaver | null = null;
let canvasElement: HTMLCanvasElement | null = null;

export function launchScreensaver(factory: ScreensaverFactory): void {
  shutdownScreensaver();

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '1000';
  canvas.style.cursor = 'none';
  document.body.appendChild(canvas);

  canvasElement = canvas;
  const screensaver = factory();
  activeScreensaver = screensaver;
  screensaver.init(canvas);
}

export function shutdownScreensaver(): void {
  if (activeScreensaver) {
    activeScreensaver.shutdown();
    activeScreensaver = null;
  }
  if (canvasElement) {
    canvasElement.remove();
    canvasElement = null;
  }
}

export function isActive(): boolean {
  return activeScreensaver !== null;
}
