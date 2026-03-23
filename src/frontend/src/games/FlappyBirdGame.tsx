import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const CW = 380;
const CH = 520;
const GRAVITY = 0.38;
const FLAP_VY = -7.8;
const PIPE_W = 58;
const PIPE_GAP = 145;
const BASE_PIPE_SPEED = 2.4;
const PIPE_INTERVAL = 1600;
const BIRD_X = 80;
const BIRD_R = 15;
const GROUND_H = 48;
const GRASS_H = 10;
const BEST_KEY = "flappy_best";

interface Pipe {
  x: number;
  topH: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface GameState {
  birdY: number;
  birdVY: number;
  birdAngle: number;
  pipes: Pipe[];
  particles: Particle[];
  score: number;
  alive: boolean;
  started: boolean;
  lastPipeTime: number;
  cloudOffset: number;
  bgOffset: number;
  shake: number;
  medalPulse: number;
  wingPhase: number;
}

function initState(): GameState {
  return {
    birdY: CH / 2 - 30,
    birdVY: 0,
    birdAngle: 0,
    pipes: [],
    particles: [],
    score: 0,
    alive: true,
    started: false,
    lastPipeTime: 0,
    cloudOffset: 0,
    bgOffset: 0,
    shake: 0,
    medalPulse: 0,
    wingPhase: 0,
  };
}

function drawBlockyCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  const s = scale;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(x, y, 44 * s, 16 * s);
  ctx.fillRect(x - 10 * s, y + 7 * s, 22 * s, 12 * s);
  ctx.fillRect(x + 32 * s, y + 7 * s, 22 * s, 12 * s);
  ctx.fillRect(x + 10 * s, y - 7 * s, 24 * s, 10 * s);
  ctx.fillStyle = "rgba(180,210,240,0.5)";
  ctx.fillRect(x, y + 16 * s, 44 * s, 4 * s);
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
) {
  const stoneGray = "#7a7a7a";
  const stoneDark = "#555";
  const stoneMid = "#666";
  const stoneLight = "#8a8a8a";

  for (let y = 0; y < top; y += 18) {
    const h = Math.min(18, top - y);
    ctx.fillStyle = Math.floor(y / 18) % 2 === 0 ? stoneGray : stoneMid;
    ctx.fillRect(x, y, PIPE_W, h);
  }
  for (let y = bottom; y < CH - GROUND_H; y += 18) {
    const h = Math.min(18, CH - GROUND_H - y);
    ctx.fillStyle =
      Math.floor((y - bottom) / 18) % 2 === 0 ? stoneGray : stoneMid;
    ctx.fillRect(x, y, PIPE_W, h);
  }

  ctx.fillStyle = stoneDark;
  ctx.fillRect(x - 5, top - 20, PIPE_W + 10, 20);
  ctx.fillRect(x - 5, bottom, PIPE_W + 10, 20);

  ctx.fillStyle = stoneLight;
  ctx.fillRect(x - 5, top - 20, PIPE_W + 10, 3);
  ctx.fillRect(x - 5, bottom, PIPE_W + 10, 3);

  ctx.fillStyle = "#3a7d1e";
  ctx.fillRect(x - 5, top - 20, PIPE_W + 10, 5);
  ctx.fillStyle = "#5aad2e";
  ctx.fillRect(x - 3, top - 20, 8, 3);
  ctx.fillRect(x + 18, top - 20, 10, 3);
  ctx.fillRect(x + 38, top - 20, 10, 3);

  ctx.fillStyle = "#3a7d1e";
  ctx.fillRect(x - 5, bottom, PIPE_W + 10, 5);
  ctx.fillStyle = "#5aad2e";
  ctx.fillRect(x - 3, bottom, 8, 3);
  ctx.fillRect(x + 18, bottom, 10, 3);
  ctx.fillRect(x + 38, bottom, 10, 3);

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + PIPE_W - 4, 0, 4, top);
  ctx.fillRect(x + PIPE_W - 4, bottom, 4, CH);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + 2, 0, 4, top);
  ctx.fillRect(x + 2, bottom, 4, CH);
}

// Pixel-art Flappy Bird: chunky blocky bird made entirely from fillRect calls.
// Each "pixel" is P×P screen pixels. Colors: yellow body, white belly,
// orange beak, red cheek, dark eye with white highlight.
function drawOriginalBird(
  ctx: CanvasRenderingContext2D,
  wingPhase: number,
  _birdVY: number,
) {
  const P = 3; // pixel size in screen pixels
  // Center offset so the bird is centered at canvas origin (0,0)
  const ox = -13;
  const oy = -12;

  // Wing flap: shift the wing row by -2..+2 pixels (in grid rows)
  const wShift = Math.round(Math.sin(wingPhase) * 2);

  // Color palette
  const BK = "#1a1a1a"; // black outline
  const YB = "#f7d038"; // yellow body
  const YL = "#ffe566"; // light yellow highlight
  const WB = "#f0edd0"; // white/cream belly
  const EW = "#ffffff"; // eye white
  const EB = "#1a1a1a"; // eye black pupil
  const EH = "#ffffff"; // eye highlight
  const OR = "#f0941f"; // orange beak upper
  const OD = "#c07010"; // orange beak lower / dark
  const RC = "#e03030"; // red cheek
  const WG = "#e8a020"; // wing orange-yellow
  const WD = "#c07010"; // wing dark edge

  // Helper: fill one pixel at grid position (col, row)
  function p(col: number, row: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(col * P + ox, row * P + oy, P, P);
  }

  // --- Wing (animated, drawn first so it appears behind body) ---
  // Wing sits at cols 0-2, rows 2-4, animated vertically
  p(0, 2 + wShift, WG);
  p(1, 2 + wShift, WG);
  p(2, 2 + wShift, WG);
  p(-1, 3 + wShift, WG);
  p(0, 3 + wShift, WG);
  p(1, 3 + wShift, WG);
  p(2, 3 + wShift, WG);
  p(0, 4 + wShift, WD);
  p(1, 4 + wShift, WD);
  p(2, 4 + wShift, WD);

  // --- Body outline (black border pixels) ---
  // Row 0 – top cap
  p(2, 0, BK);
  p(3, 0, BK);
  p(4, 0, BK);
  p(5, 0, BK);
  // Row 1 – upper body
  p(1, 1, BK);
  p(6, 1, BK);
  // Row 2
  p(0, 2, BK);
  p(7, 2, BK);
  // Row 3
  p(0, 3, BK);
  p(7, 3, BK);
  // Row 4
  p(0, 4, BK);
  p(7, 4, BK);
  // Row 5
  p(0, 5, BK);
  p(7, 5, BK);
  // Row 6
  p(1, 6, BK);
  p(6, 6, BK);
  // Row 7 – bottom cap
  p(2, 7, BK);
  p(3, 7, BK);
  p(4, 7, BK);
  p(5, 7, BK);

  // --- Body fill (yellow) ---
  // Row 1
  p(2, 1, YL);
  p(3, 1, YL);
  p(4, 1, YL);
  p(5, 1, YL);
  // Row 2
  p(1, 2, YL);
  p(2, 2, YL);
  p(3, 2, YL);
  p(4, 2, YB);
  p(5, 2, YB);
  p(6, 2, YB);
  // Row 3
  p(1, 3, YB);
  p(2, 3, YB);
  p(3, 3, YB);
  p(4, 3, YB);
  p(5, 3, YB);
  p(6, 3, YB);
  // Row 4
  p(1, 4, YB);
  p(2, 4, YB);
  p(3, 4, YB);
  p(4, 4, YB);
  p(5, 4, YB);
  p(6, 4, YB);
  // Row 5
  p(1, 5, YB);
  p(2, 5, YB);
  p(3, 5, YB);
  p(4, 5, YB);
  p(5, 5, YB);
  p(6, 5, YB);
  // Row 6
  p(2, 6, YB);
  p(3, 6, YB);
  p(4, 6, YB);
  p(5, 6, YB);

  // --- White belly patch (right-center area) ---
  p(4, 3, WB);
  p(5, 3, WB);
  p(4, 4, WB);
  p(5, 4, WB);
  p(6, 4, WB);
  p(4, 5, WB);
  p(5, 5, WB);

  // --- Eye (white sclera + black pupil + highlight) ---
  // Eye white: cols 2-4, rows 1-3
  p(2, 1, EW);
  p(3, 1, EW);
  p(4, 1, EW);
  p(2, 2, EW);
  p(3, 2, EW);
  p(4, 2, EW);
  p(2, 3, EW);
  p(3, 3, EW);
  // Eye black pupil
  p(3, 2, EB);
  p(4, 2, EB);
  p(3, 3, EB);
  p(4, 3, EB);
  // Eye highlight (top-left of sclera)
  p(2, 1, EH);

  // --- Red cheek ---
  p(5, 4, RC);
  p(6, 4, RC);

  // --- Beak (upper + lower, sticking right) ---
  // Upper beak at row 3, cols 8-9
  p(8, 3, OR);
  p(9, 3, OR);
  // Lower beak at row 4, col 8
  p(8, 4, OD);
  // Connect beak to body
  p(7, 3, OR);
  p(7, 4, OD);
}

function spawnDeathParticles(state: GameState, birdY: number) {
  const colors = ["#F6C90E", "#F5A623", "#e8e8e8", "#ff4444", "#ffffff"];
  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    state.particles.push({
      x: BIRD_X,
      y: birdY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      color: colors[i % colors.length],
    });
  }
}

function getMedal(score: number): { label: string; color: string } | null {
  if (score >= 40) return { label: "DIAMOND", color: "#a8d8f0" };
  if (score >= 25) return { label: "GOLD", color: "#FFD700" };
  if (score >= 15) return { label: "SILVER", color: "#C0C0C0" };
  if (score >= 5) return { label: "BRONZE", color: "#CD7F32" };
  return null;
}

export default function FlappyBirdGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;
  const [bestScore, setBestScore] = useState(() => {
    return Number.parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  });
  const bestRef = useRef(bestScore);

  const draw = useCallback((state: GameState, best: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const shakeX =
      state.shake > 0 ? (Math.random() - 0.5) * state.shake * 6 : 0;
    const shakeY =
      state.shake > 0 ? (Math.random() - 0.5) * state.shake * 6 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, "#5BAEE0");
    grad.addColorStop(0.6, "#87CEEB");
    grad.addColorStop(1, "#B0E0F0");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    // Distant parallax mountain hills
    ctx.fillStyle = "rgba(130,185,210,0.35)";
    const hills = [0, 60, 120, 200, 270, 340];
    for (const hx of hills) {
      const ox = ((hx + state.bgOffset * 0.3) % (CW + 80)) - 40;
      ctx.fillRect(ox, CH - GROUND_H - 70, 80, 70);
      ctx.fillRect(ox - 20, CH - GROUND_H - 50, 40, 50);
      ctx.fillRect(ox + 40, CH - GROUND_H - 55, 40, 55);
    }

    // Clouds
    drawBlockyCloud(ctx, ((80 + state.cloudOffset) % (CW + 80)) - 60, 55, 1);
    drawBlockyCloud(
      ctx,
      ((220 + state.cloudOffset * 0.65) % (CW + 80)) - 60,
      28,
      0.8,
    );
    drawBlockyCloud(
      ctx,
      ((330 + state.cloudOffset * 0.85) % (CW + 80)) - 60,
      80,
      0.9,
    );
    drawBlockyCloud(
      ctx,
      ((500 + state.cloudOffset * 0.5) % (CW + 80)) - 60,
      42,
      0.7,
    );

    // Pipes
    for (const pipe of state.pipes) {
      drawPipe(ctx, pipe.x, pipe.topH, pipe.topH + PIPE_GAP);
    }

    // Ground
    const groundY = CH - GROUND_H;
    ctx.fillStyle = "#4a7c2f";
    ctx.fillRect(0, groundY, CW, GRASS_H);
    ctx.fillStyle = "#5aad2e";
    for (let gx = 0; gx < CW; gx += 16) {
      ctx.fillRect(gx, groundY, 8, 3);
      ctx.fillRect(gx + 4, groundY, 8, GRASS_H);
    }
    const dirtGrad = ctx.createLinearGradient(0, groundY + GRASS_H, 0, CH);
    dirtGrad.addColorStop(0, "#8B5E3C");
    dirtGrad.addColorStop(1, "#6b4528");
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, groundY + GRASS_H, CW, GROUND_H - GRASS_H);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    for (let lx = 0; lx <= CW; lx += 20) {
      ctx.beginPath();
      ctx.moveTo(lx, groundY + GRASS_H);
      ctx.lineTo(lx, CH);
      ctx.stroke();
    }
    for (let ly = groundY + GRASS_H; ly <= CH; ly += 12) {
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(CW, ly);
      ctx.stroke();
    }

    // Bird
    if (state.alive || state.particles.length > 0) {
      ctx.save();
      ctx.translate(BIRD_X, state.birdY);
      ctx.rotate(state.birdAngle);
      drawOriginalBird(ctx, state.wingPhase, state.birdVY);
      ctx.restore();
    }

    // Particles
    for (const p of state.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      const sz = 5 * p.life;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // Score HUD
    ctx.font = "bold 26px 'Press Start 2P', monospace";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.textAlign = "center";
    ctx.fillText(String(state.score), CW / 2 + 2, 52);
    ctx.fillStyle = "#FFD700";
    ctx.fillText(String(state.score), CW / 2, 50);

    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.textAlign = "right";
    ctx.fillText(`BEST: ${best}`, CW - 10, 20);
    ctx.textAlign = "left";

    if (!state.started) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, CW, CH);

      ctx.fillStyle = "#5D8A3C";
      ctx.fillRect(CW / 2 - 100, CH / 2 - 55, 200, 100);
      ctx.fillStyle = "#3d5c28";
      ctx.fillRect(CW / 2 - 100, CH / 2 + 35, 200, 10);
      ctx.fillStyle = "#6aaa44";
      ctx.fillRect(CW / 2 - 98, CH / 2 - 53, 196, 8);

      ctx.fillStyle = "#FFD700";
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("FLAPPY BIRD", CW / 2, CH / 2 - 22);
      ctx.fillStyle = "#fff";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillText("TAP or SPACE", CW / 2, CH / 2 + 4);
      ctx.fillStyle = "rgba(255,255,200,0.7)";
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.fillText("to start flying!", CW / 2, CH / 2 + 22);
      ctx.textAlign = "left";
    }

    if (!state.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, CW, CH);

      ctx.fillStyle = "#8B5E3C";
      ctx.fillRect(CW / 2 - 130, CH / 2 - 100, 260, 190);
      ctx.fillStyle = "#6b4528";
      ctx.fillRect(CW / 2 - 130, CH / 2 + 80, 260, 10);
      ctx.fillStyle = "#a87050";
      ctx.fillRect(CW / 2 - 128, CH / 2 - 98, 256, 8);

      ctx.fillStyle = "#FFD700";
      ctx.font = "16px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CW / 2, CH / 2 - 60);

      ctx.fillStyle = "#fff";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE: ${state.score}`, CW / 2, CH / 2 - 30);

      const isNew = state.score > 0 && state.score >= best;
      if (isNew) {
        const pulse = 0.85 + 0.15 * Math.sin(state.medalPulse * 0.1);
        ctx.save();
        ctx.translate(CW / 2, CH / 2 - 5);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = "#FFD700";
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("NEW BEST!", 0, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillText(`BEST: ${best}`, CW / 2, CH / 2 - 5);
      }

      const medal = getMedal(state.score);
      if (medal) {
        ctx.fillStyle = medal.color;
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillText(`${medal.label} MEDAL`, CW / 2, CH / 2 + 20);
      }

      ctx.fillStyle = "#5aad2e";
      ctx.fillRect(CW / 2 - 70, CH / 2 + 38, 140, 28);
      ctx.fillStyle = "#3d7a20";
      ctx.fillRect(CW / 2 - 70, CH / 2 + 58, 140, 8);
      ctx.fillStyle = "#fff";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillText("TAP TO RETRY", CW / 2, CH / 2 + 56);

      ctx.textAlign = "left";
    }

    ctx.restore();
  }, []);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) {
      stateRef.current = initState();
      lastTimeRef.current = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame((ts) => {
        lastTimeRef.current = ts;
        rafRef.current = requestAnimationFrame(loop);
      });
      return;
    }
    s.started = true;
    s.birdVY = FLAP_VY;
  }, []);

  const loop = useCallback(
    (ts: number) => {
      const s = stateRef.current;
      if (!s.alive) {
        s.particles = s.particles
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            life: p.life - 0.03,
          }))
          .filter((p) => p.life > 0);
        s.medalPulse += 1;
        draw(s, bestRef.current);
        if (s.particles.length > 0)
          rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(ts - lastTimeRef.current, 50);
      lastTimeRef.current = ts;

      if (!s.started) {
        // Idle hover bob
        s.wingPhase += 0.08;
        draw(s, bestRef.current);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      s.birdVY += GRAVITY;
      s.birdY += s.birdVY;

      // Wing phase advances faster when flapping up
      s.wingPhase += s.birdVY < 0 ? 0.35 : 0.12;

      // Bird angle based on velocity
      const targetAngle = Math.min(Math.max(s.birdVY * 0.07, -0.5), 1.2);
      s.birdAngle += (targetAngle - s.birdAngle) * 0.2;

      s.cloudOffset += 0.5;
      s.bgOffset += 0.3;
      if (s.shake > 0) s.shake -= 0.15;

      const speedMult = 1 + Math.floor(s.score / 10) * 0.08;
      const pipeSpeed = BASE_PIPE_SPEED * speedMult * (dt / 16);
      const pipeInterval = Math.max(
        1100,
        PIPE_INTERVAL - Math.floor(s.score / 5) * 40,
      );

      if (ts - s.lastPipeTime > pipeInterval || s.pipes.length === 0) {
        const minTop = 60;
        const maxTop = CH - GROUND_H - PIPE_GAP - 60;
        const topH = minTop + Math.random() * (maxTop - minTop);
        s.pipes.push({ x: CW + 10, topH, passed: false });
        s.lastPipeTime = ts;
      }

      for (const p of s.pipes) p.x -= pipeSpeed;
      s.pipes = s.pipes.filter((p) => p.x > -PIPE_W - 20);

      for (const p of s.pipes) {
        if (!p.passed && p.x + PIPE_W < BIRD_X) {
          p.passed = true;
          s.score += 1;
        }
      }

      const hitGround = s.birdY + BIRD_R >= CH - GROUND_H;
      const hitCeil = s.birdY - BIRD_R <= 0;
      let hitPipe = false;
      for (const p of s.pipes) {
        if (BIRD_X + BIRD_R - 3 > p.x && BIRD_X - BIRD_R + 3 < p.x + PIPE_W) {
          if (
            s.birdY - BIRD_R + 3 < p.topH ||
            s.birdY + BIRD_R - 3 > p.topH + PIPE_GAP
          ) {
            hitPipe = true;
            break;
          }
        }
      }

      if (hitGround || hitCeil || hitPipe) {
        s.alive = false;
        s.shake = 1;
        spawnDeathParticles(s, s.birdY);
        const finalScore = s.score;
        if (finalScore > bestRef.current) {
          bestRef.current = finalScore;
          setBestScore(finalScore);
          localStorage.setItem(BEST_KEY, String(finalScore));
        }
        draw(s, bestRef.current);
        cbRef.current(finalScore);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      draw(s, bestRef.current);
      rafRef.current = requestAnimationFrame(loop);
    },
    [draw],
  );

  const loopRef = useRef(loop);
  loopRef.current = loop;

  const flapRef = useRef(flap);
  flapRef.current = flap;

  useEffect(() => {
    stateRef.current = initState();
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame((ts) => {
      lastTimeRef.current = ts;
      rafRef.current = requestAnimationFrame(loopRef.current);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        flapRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CW}
      height={CH}
      onClick={() => flapRef.current()}
      onKeyDown={(e) => {
        if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          flapRef.current();
        }
      }}
      className="rounded-lg cursor-pointer"
      style={{
        border: "3px solid #4a7c2f",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
      tabIndex={0}
    />
  );
}
