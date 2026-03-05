import type { Screensaver } from '../types';

export function createPong(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // paddle dimensions (relative to height)
  const PADDLE_WIDTH_RATIO = 0.012;
  const PADDLE_HEIGHT_RATIO = 0.12;
  const PADDLE_MARGIN_RATIO = 0.03;
  const BALL_SIZE_RATIO = 0.012;
  const WINNING_SCORE = 11;
  const AI_SPEED_RATIO = 0.018;
  const BALL_SPEED_RATIO = 0.015;

  let paddleW = 0;
  let paddleH = 0;
  let paddleMargin = 0;
  let ballSize = 0;
  let aiSpeed = 0;
  let ballSpeed = 0;

  // state
  let leftY = 0;
  let rightY = 0;
  let ballX = 0;
  let ballY = 0;
  let ballVX = 0;
  let ballVY = 0;
  let scoreLeft = 0;
  let scoreRight = 0;

  // pause after scoring
  let pauseFrames = 0;
  // AI aim offsets — makes paddles hit off-center for angled returns
  let leftAimOffset = 0;
  let rightAimOffset = 0;

  function computeSizes() {
    const base = Math.min(width, height);
    paddleW = Math.max(6, base * PADDLE_WIDTH_RATIO);
    paddleH = Math.max(40, base * PADDLE_HEIGHT_RATIO);
    paddleMargin = Math.max(15, base * PADDLE_MARGIN_RATIO);
    ballSize = Math.max(6, base * BALL_SIZE_RATIO);
    aiSpeed = Math.max(2, base * AI_SPEED_RATIO);
    ballSpeed = Math.max(3, base * BALL_SPEED_RATIO);
  }

  function resetBall(direction: number) {
    ballX = width / 2;
    ballY = height / 2;
    // guarantee a noticeable angle: ±15° to ±45°
    const sign = Math.random() < 0.5 ? 1 : -1;
    const angle = sign * (0.25 + Math.random() * 0.5) * Math.PI * 0.5;
    ballVX = Math.cos(angle) * ballSpeed * direction;
    ballVY = Math.sin(angle) * ballSpeed;
    pauseFrames = 20;
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    computeSizes();
    leftY = height / 2;
    rightY = height / 2;
    resetBall(Math.random() < 0.5 ? 1 : -1);
  }

  function moveAI(paddleY: number, targetY: number): number {
    // add slight imperfection
    const diff = targetY - paddleY;
    const speed = aiSpeed * (0.7 + Math.random() * 0.3);
    if (Math.abs(diff) < speed) return targetY;
    return paddleY + Math.sign(diff) * speed;
  }

  function loop() {
    if (!ctx) return;

    // black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // center line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // scores
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `${Math.max(32, height * 0.08)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(String(scoreLeft), width / 2 - width * 0.1, height * 0.12);
    ctx.fillText(String(scoreRight), width / 2 + width * 0.1, height * 0.12);

    if (pauseFrames > 0) {
      pauseFrames--;
      // still draw paddles and ball in place
      drawPaddles();
      drawBall();
      animationFrame = requestAnimationFrame(loop);
      return;
    }

    // AI movement — aim offset makes paddles hit off-center for varied angles
    const leftTarget = ballVX < 0 ? ballY + leftAimOffset : height / 2;
    leftY = moveAI(leftY, leftTarget);

    const rightTarget = ballVX > 0 ? ballY + rightAimOffset : height / 2;
    rightY = moveAI(rightY, rightTarget);

    // clamp paddles
    leftY = Math.max(paddleH / 2, Math.min(height - paddleH / 2, leftY));
    rightY = Math.max(paddleH / 2, Math.min(height - paddleH / 2, rightY));

    // move ball — keep previous position for sweep collision
    const prevBallX = ballX;
    ballX += ballVX;
    ballY += ballVY;

    // top/bottom bounce
    if (ballY - ballSize < 0) {
      ballY = ballSize;
      ballVY = Math.abs(ballVY);
    }
    if (ballY + ballSize > height) {
      ballY = height - ballSize;
      ballVY = -Math.abs(ballVY);
    }

    // left paddle collision — sweep test: did ball edge cross paddle line?
    const leftPaddleX = paddleMargin + paddleW;
    const prevLeftEdge = prevBallX - ballSize;
    const currLeftEdge = ballX - ballSize;
    if (
      ballVX < 0 &&
      prevLeftEdge >= leftPaddleX &&
      currLeftEdge < leftPaddleX &&
      ballY > leftY - paddleH / 2 &&
      ballY < leftY + paddleH / 2
    ) {
      ballX = leftPaddleX + ballSize;
      const hitPos = (ballY - leftY) / (paddleH / 2); // -1 to 1
      const angle = hitPos * Math.PI * 0.35;
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.05;
      ballVX = Math.cos(angle) * speed;
      ballVY = Math.sin(angle) * speed;
      // randomize right paddle's aim for next return
      rightAimOffset = (Math.random() - 0.5) * paddleH * 0.7;
    }

    // right paddle collision — sweep test
    const rightPaddleX = width - paddleMargin - paddleW;
    const prevRightEdge = prevBallX + ballSize;
    const currRightEdge = ballX + ballSize;
    if (
      ballVX > 0 &&
      prevRightEdge <= rightPaddleX &&
      currRightEdge > rightPaddleX &&
      ballY > rightY - paddleH / 2 &&
      ballY < rightY + paddleH / 2
    ) {
      ballX = rightPaddleX - ballSize;
      const hitPos = (ballY - rightY) / (paddleH / 2);
      const angle = hitPos * Math.PI * 0.35;
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.05;
      ballVX = -Math.cos(angle) * speed;
      ballVY = Math.sin(angle) * speed;
      // randomize left paddle's aim for next return
      leftAimOffset = (Math.random() - 0.5) * paddleH * 0.7;
    }

    // scoring
    if (ballX < 0) {
      scoreRight++;
      if (scoreRight >= WINNING_SCORE) {
        scoreLeft = 0;
        scoreRight = 0;
      }
      resetBall(-1);
    }
    if (ballX > width) {
      scoreLeft++;
      if (scoreLeft >= WINNING_SCORE) {
        scoreLeft = 0;
        scoreRight = 0;
      }
      resetBall(1);
    }

    drawPaddles();
    drawBall();

    animationFrame = requestAnimationFrame(loop);
  }

  function drawPaddles() {
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    // left paddle
    ctx.fillRect(
      paddleMargin,
      leftY - paddleH / 2,
      paddleW,
      paddleH
    );
    // right paddle
    ctx.fillRect(
      width - paddleMargin - paddleW,
      rightY - paddleH / 2,
      paddleW,
      paddleH
    );
  }

  function drawBall() {
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballSize, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    name: 'Pong',
    description: 'Two AI paddles playing pong forever',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      scoreLeft = 0;
      scoreRight = 0;
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
