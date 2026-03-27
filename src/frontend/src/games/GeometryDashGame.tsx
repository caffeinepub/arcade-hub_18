import { useCallback, useEffect, useRef } from "react";
import { playDeath, playJump, playScore } from "../utils/sound";

interface Props {
  onGameOver: (score: number) => void;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;
const GROUND_Y = 240;
const BLOCK_SIZE = 32;
const PLAYER_X = 80;
const JUMP_VY = -14;
const GRAVITY = 0.72;
const COYOTE_FRAMES = 4;

type Obstacle =
  | { kind: "spike"; x: number; width: number; height: number }
  | { kind: "doubleSpike"; x: number; width: number; height: number }
  | { kind: "pillar"; x: number; width: number; height: number }
  | { kind: "platform"; x: number; width: number; height: number };

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  bright: number;
}

interface GameState {
  phase: "idle" | "running" | "over";
  playerY: number;
  playerVY: number;
  onGround: boolean;
  coyoteFrames: number;
  score: number;
  speed: number;
  frame: number;
  obstacles: Obstacle[];
  nextObstacleIn: number;
  deathFrame: number;
  playerAngle: number;
  trail: TrailPoint[];
  particles: Particle[];
  shakeFrames: number;
}

const STARS: Star[] = Array.from({ length: 60 }, () => ({
  x: Math.random() * CANVAS_WIDTH,
  y: Math.random() * (GROUND_Y * 0.75),
  r: 0.5 + Math.random() * 1.5,
  bright: Math.random(),
}));

function makeState(): GameState {
  return {
    phase: "idle",
    playerY: GROUND_Y - BLOCK_SIZE,
    playerVY: 0,
    onGround: true,
    coyoteFrames: 0,
    score: 0,
    speed: 3.5,
    frame: 0,
    obstacles: [],
    nextObstacleIn: 80,
    deathFrame: 0,
    playerAngle: 0,
    trail: [],
    particles: [],
    shakeFrames: 0,
  };
}

function spawnParticles(state: GameState) {
  const cx = PLAYER_X + BLOCK_SIZE / 2;
  const cy = state.playerY + BLOCK_SIZE / 2;
  const colors = [
    "#5D8A2C",
    "#7C5230",
    "#6a9e32",
    "#8B6340",
    "#3a6e1a",
    "#4a3015",
  ];
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 40 + Math.random() * 20,
      maxLife: 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 5,
    });
  }
}

function drawBlockFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.fillStyle = "#7C5230";
  ctx.fillRect(x, y, size, size);
  const grassH = Math.round(size * 0.28);
  ctx.fillStyle = "#5D8A2C";
  ctx.fillRect(x, y, size, grassH);
  ctx.fillStyle = "#6a9e32";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 4 + i * 9, y + 1, 5, 3);
  }
  ctx.strokeStyle = "#1a0e00";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, size - 1.5, size - 1.5);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + size - 2);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x + size - 2, y + 2);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 6, y + grassH + 4, 7, 7);
  ctx.fillRect(x + size - 13, y + grassH + 4, 7, 7);
  ctx.fillStyle = "#222";
  ctx.fillRect(x + 8, y + grassH + 6, 3, 3);
  ctx.fillRect(x + size - 11, y + grassH + 6, 3, 3);
}

function drawRotatedPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  frame: number,
  onGround: boolean,
) {
  const cx = x + BLOCK_SIZE / 2;
  const cy = y + BLOCK_SIZE / 2;

  // Pulsing halo
  const pulse = 0.4 + 0.3 * Math.sin(frame * 0.1);
  const grd = ctx.createRadialGradient(
    cx,
    cy,
    BLOCK_SIZE * 0.4,
    cx,
    cy,
    BLOCK_SIZE * 1.1,
  );
  grd.addColorStop(0, `rgba(93,138,44,${pulse * 0.5})`);
  grd.addColorStop(1, "rgba(93,138,44,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, BLOCK_SIZE * 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Player shadow on ground
  if (onGround) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 2, BLOCK_SIZE * 0.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  drawBlockFace(ctx, -BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE);
  ctx.restore();
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: TrailPoint[],
  angle: number,
) {
  for (const pt of trail) {
    ctx.save();
    ctx.globalAlpha = pt.alpha * 0.45;
    ctx.translate(pt.x + BLOCK_SIZE / 2, pt.y + BLOCK_SIZE / 2);
    ctx.rotate(angle);
    ctx.fillStyle = "#5D8A2C";
    ctx.fillRect(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }
}

function drawSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#ff4444";
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w / 2, baseY - h);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  ctx.fillStyle = "#888";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(x + w / 2, baseY - h);
  ctx.lineTo(x + w / 2 - 4, baseY - h + 10);
  ctx.lineTo(x + w / 2, baseY - h + 6);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w / 2, baseY - h);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  ctx.strokeStyle = "#cc3333";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawDoubleSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
) {
  drawSpike(ctx, x, baseY, w, h);
  drawSpike(ctx, x + w + 2, baseY, w, h);
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
) {
  const platY = baseY - h;
  ctx.fillStyle = "#555";
  ctx.fillRect(x, platY, w, 14);
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, platY + 0.5, w - 1, 13);
  ctx.fillStyle = "#5D8A2C";
  ctx.fillRect(x, platY, w, 4);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + 2, platY + 1, w - 4, 2);
}

function drawPillar(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
) {
  const blockH = 20;
  const numBlocks = Math.ceil(h / blockH);
  for (let i = 0; i < numBlocks; i++) {
    const by = baseY - (i + 1) * blockH;
    ctx.fillStyle = i % 2 === 0 ? "#666" : "#595959";
    ctx.fillRect(x, by, w, blockH);
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, by + 0.5, w - 1, blockH - 1);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.moveTo(x + 4, by + blockH / 2);
    ctx.lineTo(x + w - 4, by + blockH / 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(x, baseY - h, w, 3);
}

function drawGround(ctx: CanvasRenderingContext2D, offset: number) {
  const blockW = 40;
  const numBlocks = Math.ceil(CANVAS_WIDTH / blockW) + 2;
  const startBlock = Math.floor(offset / blockW);
  for (let i = startBlock; i < startBlock + numBlocks; i++) {
    const bx = i * blockW - (offset % blockW);
    ctx.fillStyle = i % 2 === 0 ? "#555" : "#4a4a4a";
    ctx.fillRect(bx, GROUND_Y + 5, blockW, CANVAS_HEIGHT - GROUND_Y - 5);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      bx + 0.5,
      GROUND_Y + 5.5,
      blockW - 1,
      CANVAS_HEIGHT - GROUND_Y - 6,
    );
  }
  // Neon green top line
  ctx.fillStyle = "#5D8A2C";
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 5);
  ctx.fillStyle = "#6fb034";
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);
  // Grass tufts
  for (let i = startBlock; i < startBlock + numBlocks; i++) {
    const bx = i * blockW - (offset % blockW);
    ctx.fillStyle = "#4a7020";
    ctx.fillRect(bx + 2, GROUND_Y, 8, 3);
    ctx.fillRect(bx + 20, GROUND_Y, 8, 3);
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  offset: number,
  frame: number,
) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#1a1a2e");
  sky.addColorStop(0.55, "#2d1b4e");
  sky.addColorStop(1, "#4a2040");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

  // Stars (static)
  for (const star of STARS) {
    const twinkle = 0.5 + 0.5 * Math.sin(frame * 0.03 + star.bright * 10);
    ctx.save();
    ctx.globalAlpha = twinkle * 0.9;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Far mountains (20% speed)
  const mOffset = offset * 0.2;
  ctx.fillStyle = "#2a1a3e";
  const peaks = [0, 80, 160, 240, 320, 400, 480, 560, 640, 720];
  for (const px of peaks) {
    const bx = (px - (mOffset % 720)) % 720;
    const bx2 = bx < 0 ? bx + 720 : bx;
    ctx.beginPath();
    ctx.moveTo(bx2, GROUND_Y);
    ctx.lineTo(bx2 + 30, GROUND_Y - 80);
    ctx.lineTo(bx2 + 60, GROUND_Y - 40);
    ctx.lineTo(bx2 + 80, GROUND_Y - 100);
    ctx.lineTo(bx2 + 110, GROUND_Y - 50);
    ctx.lineTo(bx2 + 130, GROUND_Y);
    ctx.fill();
  }

  // Mid layer city silhouette (50% speed)
  const cOffset = offset * 0.5;
  ctx.fillStyle = "#1e1e2e";
  const buildings = [
    { w: 30, h: 60, gap: 10 },
    { w: 20, h: 90, gap: 5 },
    { w: 40, h: 50, gap: 15 },
    { w: 25, h: 75, gap: 8 },
    { w: 35, h: 55, gap: 12 },
    { w: 18, h: 85, gap: 6 },
    { w: 28, h: 65, gap: 10 },
    { w: 22, h: 70, gap: 7 },
  ];
  let bx = 0;
  const totalWidth = buildings.reduce((a, b) => a + b.w + b.gap, 0);
  const cityOff = cOffset % totalWidth;
  // Draw two passes for seamless scroll
  for (let pass = 0; pass < 3; pass++) {
    let cx = -cityOff + pass * totalWidth;
    for (const b of buildings) {
      if (cx + b.w > 0 && cx < CANVAS_WIDTH) {
        ctx.fillRect(cx, GROUND_Y - b.h, b.w, b.h);
        // Windows
        ctx.fillStyle = "rgba(255,220,100,0.15)";
        for (let wy = GROUND_Y - b.h + 6; wy < GROUND_Y - 10; wy += 14) {
          for (let wx = cx + 4; wx < cx + b.w - 4; wx += 10) {
            if (Math.random() < 0.6) ctx.fillRect(wx, wy, 5, 7);
          }
        }
        ctx.fillStyle = "#1e1e2e";
      }
      cx += b.w + b.gap;
    }
  }
  void bx;
  void totalWidth;
}

function drawScore(ctx: CanvasRenderingContext2D, score: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  (
    ctx as CanvasRenderingContext2D & {
      roundRect?: (...args: unknown[]) => void;
    }
  ).roundRect?.(8, 8, 110, 26, 4);
  ctx.fill();
  ctx.strokeStyle = "#5D8A2C";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = "#5D8A2C";
  ctx.fillText(`SCORE: ${score}`, 14, 26);
  ctx.restore();
}

export default function GeometryDashGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeState());
  const rafRef = useRef<number>(0);
  const groundOffsetRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    const offset = groundOffsetRef.current;

    ctx.save();

    // Screen shake
    if (s.shakeFrames > 0) {
      const sx = (Math.random() - 0.5) * s.shakeFrames * 0.6;
      const sy = (Math.random() - 0.5) * s.shakeFrames * 0.6;
      ctx.translate(sx, sy);
    }

    drawBackground(ctx, offset, s.frame);
    drawGround(ctx, offset);

    for (const obs of s.obstacles) {
      if (obs.kind === "spike") {
        drawSpike(ctx, obs.x, GROUND_Y, obs.width, obs.height);
      } else if (obs.kind === "doubleSpike") {
        drawDoubleSpike(ctx, obs.x, GROUND_Y, obs.width, obs.height);
      } else if (obs.kind === "platform") {
        drawPlatform(ctx, obs.x, GROUND_Y, obs.width, obs.height);
      } else {
        drawPillar(ctx, obs.x, GROUND_Y, obs.width, obs.height);
      }
    }

    // Trail
    drawTrail(ctx, s.trail, s.playerAngle);

    // Particles
    drawParticles(ctx, s.particles);

    // Player
    drawRotatedPlayer(
      ctx,
      PLAYER_X,
      s.playerY,
      s.playerAngle,
      s.frame,
      s.onGround,
    );

    drawScore(ctx, s.score);

    ctx.restore();

    if (s.phase === "idle") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.textAlign = "center";
      ctx.fillText(
        "PRESS SPACE TO START",
        CANVAS_WIDTH / 2 + 1,
        CANVAS_HEIGHT / 2 - 9,
      );
      ctx.fillStyle = "#5D8A2C";
      ctx.fillText(
        "PRESS SPACE TO START",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 10,
      );
      ctx.font = "12px 'Courier New', monospace";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(
        "or click the canvas",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 16,
      );
      ctx.textAlign = "left";
    }

    if (s.phase === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.textAlign = "center";
      ctx.font = "bold 22px 'Courier New', monospace";
      ctx.fillStyle = "#E53935";
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 24);
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(
        `SCORE: ${s.score}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 4,
      );
      ctx.font = "11px 'Courier New', monospace";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(
        "Press Space or click to restart",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 28,
      );
      ctx.textAlign = "left";
    }
  }, []);

  const spawnObstacle = useCallback((state: GameState) => {
    const rand = Math.random();
    if (rand < 0.2) {
      // double spike
      const w = 24 + Math.random() * 10;
      const h = 30 + Math.random() * 20;
      state.obstacles.push({
        kind: "doubleSpike",
        x: CANVAS_WIDTH + 20,
        width: w,
        height: h,
      });
    } else if (rand < 0.35) {
      // platform
      state.obstacles.push({
        kind: "platform",
        x: CANVAS_WIDTH + 20,
        width: 40,
        height: 50,
      });
    } else if (rand < 0.65) {
      const w = 28 + Math.random() * 16;
      const h = 32 + Math.random() * 28;
      state.obstacles.push({
        kind: "spike",
        x: CANVAS_WIDTH + 20,
        width: w,
        height: h,
      });
    } else {
      const w = 32 + Math.random() * 16;
      const h = 48 + Math.random() * 64;
      state.obstacles.push({
        kind: "pillar",
        x: CANVAS_WIDTH + 20,
        width: w,
        height: h,
      });
    }
  }, []);

  const checkCollision = useCallback((state: GameState): boolean => {
    const px = PLAYER_X;
    const py = state.playerY;
    const pw = BLOCK_SIZE - 4;
    const ph = BLOCK_SIZE - 4;
    const margin = 5;

    for (const obs of state.obstacles) {
      if (obs.kind === "spike") {
        const ox = obs.x + margin;
        const oy = GROUND_Y - obs.height;
        const ow = obs.width - margin * 2;
        const oh = obs.height;
        if (
          px + margin < ox + ow &&
          px + pw - margin > ox &&
          py + margin < oy + oh &&
          py + ph - margin > oy
        )
          return true;
      } else if (obs.kind === "doubleSpike") {
        // Two spikes side by side
        for (let si = 0; si < 2; si++) {
          const sx = obs.x + si * (obs.width + 2) + margin;
          const oy = GROUND_Y - obs.height;
          const sw = obs.width - margin * 2;
          const oh = obs.height;
          if (
            px + margin < sx + sw &&
            px + pw - margin > sx &&
            py + margin < oy + oh &&
            py + ph - margin > oy
          )
            return true;
        }
      } else if (obs.kind === "platform") {
        const ox = obs.x;
        const oy = GROUND_Y - obs.height;
        const ow = obs.width;
        // Only collide with top of platform
        if (
          px + margin < ox + ow &&
          px + pw - margin > ox &&
          py + ph > oy &&
          py + ph < oy + 20 &&
          state.playerVY >= 0
        ) {
          // Stand on platform
          state.playerY = oy - BLOCK_SIZE;
          state.playerVY = 0;
          state.onGround = true;
        }
      } else {
        const ox = obs.x;
        const oy = GROUND_Y - obs.height;
        const ow = obs.width;
        const oh = obs.height;
        if (
          px + margin < ox + ow &&
          px + pw - margin > ox &&
          py + margin < oy + oh &&
          py + ph - margin > oy
        )
          return true;
      }
    }
    return false;
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "running") {
      if (s.phase === "over") {
        s.deathFrame++;
        // Keep updating particles even on death
        for (const p of s.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2;
          p.life--;
        }
        s.particles = s.particles.filter((p) => p.life > 0);
        if (s.shakeFrames > 0) s.shakeFrames--;
        draw();
      } else {
        draw();
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    s.frame++;
    s.score = Math.floor(s.frame / 10);
    if (s.score > 0 && s.score % 10 === 0 && s.frame % 10 === 0) playScore();
    s.speed = 3.5 + s.frame * 0.0015;

    s.playerVY += GRAVITY;
    s.playerY += s.playerVY;

    const wasOnGround = s.onGround;
    if (s.playerY >= GROUND_Y - BLOCK_SIZE) {
      s.playerY = GROUND_Y - BLOCK_SIZE;
      s.playerVY = 0;
      s.onGround = true;
      s.coyoteFrames = COYOTE_FRAMES;
    } else {
      s.onGround = false;
      if (wasOnGround) s.coyoteFrames = COYOTE_FRAMES;
      else if (s.coyoteFrames > 0) s.coyoteFrames--;
    }

    // Cube rotation
    if (s.onGround) {
      s.playerAngle += s.speed * 0.05;
    } else {
      s.playerAngle += 0.1;
    }

    // Trail
    s.trail.unshift({ x: PLAYER_X, y: s.playerY, alpha: 1 });
    if (s.trail.length > 6) s.trail.pop();
    for (let i = 0; i < s.trail.length; i++) {
      s.trail[i].alpha = 1 - i / s.trail.length;
    }

    // Particles update
    for (const p of s.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life--;
    }
    s.particles = s.particles.filter((p) => p.life > 0);

    if (s.shakeFrames > 0) s.shakeFrames--;

    groundOffsetRef.current += s.speed;

    for (const obs of s.obstacles) {
      obs.x -= s.speed;
    }
    s.obstacles = s.obstacles.filter((o) => {
      const w = o.kind === "doubleSpike" ? o.width * 2 + 4 : o.width;
      return o.x + w > -40;
    });

    s.nextObstacleIn--;
    if (s.nextObstacleIn <= 0) {
      spawnObstacle(s);
      s.nextObstacleIn = Math.max(
        55,
        Math.floor(120 - s.frame * 0.05) + Math.random() * 40,
      );
    }

    if (checkCollision(s)) {
      s.phase = "over";
      s.deathFrame = 0;
      s.shakeFrames = 15;
      spawnParticles(s);
      playDeath();
      onGameOver(s.score);
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, spawnObstacle, checkCollision, onGameOver]);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "idle" || s.phase === "over") {
      stateRef.current = makeState();
      stateRef.current.phase = "running";
      groundOffsetRef.current = 0;
      return;
    }
    if (s.onGround || s.coyoteFrames > 0) {
      s.playerVY = JUMP_VY;
      s.onGround = false;
      s.coyoteFrames = 0;
    }
  }, []);

  useEffect(() => {
    draw();
    rafRef.current = requestAnimationFrame(tick);

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKey);
    };
  }, [draw, tick, jump]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        jump();
      }
    },
    [jump],
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={jump}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="Geometry Dash game. Press Space or click to jump."
        data-ocid="geometry_dash.canvas_target"
        style={{
          cursor: "pointer",
          border: "2px solid #5D8A2C",
          borderRadius: 4,
          display: "block",
          maxWidth: "100%",
        }}
      />
    </div>
  );
}
