// Author: Harrison Page
// License: MIT
// Created: 25-Feb-2026

import type { Screensaver } from '../types';
import { EMOJIS } from './emoji-data';

const FLASH_DURATION = 100; // ms per emoji
const ROTATE_DURATION = 300; // ms for the 20th emoji rotation
const BATCH_SIZE = 20;

export function createBlitz(): Screensaver {
  let canvas: HTMLCanvasElement;
  let timer: number | null = null;
  let animationFrame: number | null = null;
  let stopped = false;

  // DOM element for crisp native emoji rendering
  let emojiEl: HTMLDivElement | null = null;

  // shuffled emoji stack
  let stack: string[] = [];
  let batchIndex = 0;
  let rotateClockwise = true;

  function shuffle(): void {
    stack = [...EMOJIS];
    for (let i = stack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stack[i], stack[j]] = [stack[j], stack[i]];
    }
  }

  function showEmoji(emoji: string, rotation: number = 0) {
    if (!emojiEl) return;
    const size = Math.min(Math.min(window.innerWidth, window.innerHeight) * 0.85, 320);
    emojiEl.textContent = emoji;
    emojiEl.style.fontSize = `${size}px`;
    emojiEl.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  }

  function nextEmoji() {
    if (stopped) return;

    if (stack.length === 0) {
      shuffle();
    }

    const emoji = stack.pop()!;
    batchIndex++;

    if (batchIndex >= BATCH_SIZE) {
      batchIndex = 0;
      const direction = rotateClockwise ? 1 : -1;
      rotateClockwise = !rotateClockwise;
      const startTime = performance.now();

      function animateRotation(now: number) {
        if (stopped) return;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / ROTATE_DURATION, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const angle = direction * eased * 360;
        showEmoji(emoji, angle);
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animateRotation);
        } else {
          animationFrame = null;
          timer = window.setTimeout(nextEmoji, FLASH_DURATION);
        }
      }

      animationFrame = requestAnimationFrame(animateRotation);
    } else {
      showEmoji(emoji);
      timer = window.setTimeout(nextEmoji, FLASH_DURATION);
    }
  }

  return {
    name: 'Blitz',
    description: 'Rapid-fire emoji flash',

    init(c: HTMLCanvasElement) {
      canvas = c;
      // black out the canvas background
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // create DOM overlay for crisp emoji
      emojiEl = document.createElement('div');
      emojiEl.style.position = 'fixed';
      emojiEl.style.top = '50%';
      emojiEl.style.left = '50%';
      emojiEl.style.transform = 'translate(-50%, -50%)';
      emojiEl.style.zIndex = '1001';
      emojiEl.style.lineHeight = '1';
      emojiEl.style.cursor = 'none';
      emojiEl.style.pointerEvents = 'none';
      document.body.appendChild(emojiEl);

      stopped = false;
      batchIndex = 0;
      shuffle();
      nextEmoji();
      window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (ctx) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      });
    },

    shutdown() {
      stopped = true;
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      if (timer !== null) clearTimeout(timer);
      animationFrame = null;
      timer = null;
      if (emojiEl && emojiEl.parentNode) {
        emojiEl.parentNode.removeChild(emojiEl);
      }
      emojiEl = null;
    },
  };
}
