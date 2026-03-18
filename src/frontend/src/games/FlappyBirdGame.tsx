import { useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const CW = 360;
const CH = 500;
const GRAVITY = 0.35;
const FLAP_VY = -7.5;
const PIPE_W = 55;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.2;
const PIPE_INTERVAL = 1700;
const BIRD_X = 80;
const BIRD_R = 14;
const GROUND_H = 40;
const GRASS_H = 8;

interface Pipe {
  x: number;
  topH: number;
  passed: boolean;
}

interface GameState {
  birdY: number;
  birdVY: number;
  pipes: Pipe[];
  score: number;
  alive: boolean;
  started: boolean;
  lastPipeTime: number;
  cloudOffset: number;
}

function initState(): GameState {
  return {
    birdY: CH / 2,
    birdVY: 0,
    pipes: [],
    score: 0,
    alive: true,
    started: false,
    lastPipeTime: 0,
    cloudOffset: 0,
  };
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(x, y, 40, 14);
  ctx.fillRect(x - 10, y + 6, 20, 10);
  ctx.fillRect(x + 30, y + 6, 20, 10);
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
) {
  // main pipe body
  ctx.fillStyle = "#6B6B6B";
  ctx.fillRect(x, 0, PIPE_W, top);
  ctx.fillRect(x, bottom, PIPE_W, CH - bottom);
  // cap top
  ctx.fillStyle = "#555555";
  ctx.fillRect(x - 4, top - 18, PIPE_W + 8, 18);
  // cap bottom
  ctx.fillRect(x - 4, bottom, PIPE_W + 8, 18);
  // block highlight lines on pipes
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, 0);
  ctx.lineTo(x + 2, top);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 2, bottom);
  ctx.lineTo(x + 2, CH);
  ctx.stroke();
}

export default function FlappyBirdGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  const draw = useCallback((state: GameState) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    // Minecraft day sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, "#87CEEB");
    grad.addColorStop(1, "#5BA3D0");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    // Blocky clouds
    drawCloud(ctx, ((60 + state.cloudOffset) % (CW + 70)) - 10, 60);
    drawCloud(ctx, ((200 + state.cloudOffset * 0.6) % (CW + 70)) - 10, 30);
    drawCloud(ctx, ((310 + state.cloudOffset * 0.8) % (CW + 70)) - 10, 80);

    // Pipes
    for (const pipe of state.pipes) {
      drawPipe(ctx, pipe.x, pipe.topH, pipe.topH + PIPE_GAP);
    }

    // Ground — grass top layer + dirt body
    const groundY = CH - GROUND_H;
    ctx.fillStyle = "#5D8A3C";
    ctx.fillRect(0, groundY, CW, GRASS_H);
    ctx.fillStyle = "#8B5E3C";
    ctx.fillRect(0, groundY + GRASS_H, CW, GROUND_H - GRASS_H);
    // dirt lines
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let lx = 0; lx < CW; lx += 20) {
      ctx.beginPath();
      ctx.moveTo(lx, groundY + GRASS_H);
      ctx.lineTo(lx, groundY + GROUND_H);
      ctx.stroke();
    }

    // Bird — blocky Minecraft chicken
    const { birdY } = state;
    const bx = BIRD_X - BIRD_R;
    const by = birdY - BIRD_R;
    const bs = BIRD_R * 2;
    // body
    ctx.fillStyle = "#F6C90E";
    ctx.fillRect(bx, by, bs, bs);
    // block highlight
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by + bs);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + bs, by);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(bx + bs, by);
    ctx.lineTo(bx + bs, by + bs);
    ctx.lineTo(bx, by + bs);
    ctx.stroke();
    // beak (right side)
    ctx.fillStyle = "#F5A623";
    ctx.fillRect(bx + bs, birdY - 3, 6, 5);
    // eye
    ctx.fillStyle = "#000";
    ctx.fillRect(bx + bs - 5, by + 4, 3, 3);

    // Score
    ctx.font = "bold 28px 'Press Start 2P', monospace";
    ctx.fillStyle = "#1A1A1A";
    ctx.textAlign = "center";
    ctx.fillText(String(state.score), CW / 2, 50);

    if (!state.started) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#FFD700";
      ctx.font = "11px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TAP / SPACE", CW / 2, CH / 2 - 15);
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText("TO START FLYING", CW / 2, CH / 2 + 10);
    }

    if (!state.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#FFD700";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CW / 2, CH / 2 - 14);
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE: ${state.score}`, CW / 2, CH / 2 + 10);
    }
    ctx.textAlign = "left";
  }, []);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) return;
    s.started = true;
    s.birdVY = FLAP_VY;
  }, []);

  const loop = useCallback(
    (ts: number) => {
      const s = stateRef.current;
      if (!s.alive) return;
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;

      if (!s.started) {
        draw(s);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      s.birdVY += GRAVITY;
      s.birdY += s.birdVY;
      s.cloudOffset += 0.4;

      if (ts - s.lastPipeTime > PIPE_INTERVAL || s.pipes.length === 0) {
        const topH = 60 + Math.random() * (CH - GROUND_H - PIPE_GAP - 120);
        s.pipes.push({ x: CW + 10, topH, passed: false });
        s.lastPipeTime = ts;
      }

      const speed = PIPE_SPEED * (dt / 16);
      for (const p of s.pipes) {
        p.x -= speed;
      }
      s.pipes = s.pipes.filter((p) => p.x > -PIPE_W - 10);

      for (const p of s.pipes) {
        if (!p.passed && p.x + PIPE_W < BIRD_X) {
          p.passed = true;
          s.score += 1;
        }
      }

      if (s.birdY + BIRD_R >= CH - GROUND_H || s.birdY - BIRD_R <= 0) {
        s.alive = false;
        draw(s);
        cbRef.current(s.score);
        return;
      }

      for (const p of s.pipes) {
        if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
          if (
            s.birdY - BIRD_R < p.topH ||
            s.birdY + BIRD_R > p.topH + PIPE_GAP
          ) {
            s.alive = false;
            draw(s);
            cbRef.current(s.score);
            return;
          }
        }
      }

      draw(s);
      rafRef.current = requestAnimationFrame(loop);
    },
    [draw],
  );

  useEffect(() => {
    stateRef.current = initState();
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame((ts) => {
      lastTimeRef.current = ts;
      rafRef.current = requestAnimationFrame(loop);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [loop, flap]);

  return (
    <canvas
      ref={canvasRef}
      width={CW}
      height={CH}
      onClick={flap}
      onKeyDown={(e) => {
        if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          flap();
        }
      }}
      className="rounded-lg cursor-pointer"
      style={{
        border: "3px solid #5D8A3C",
        boxShadow: "none",
      }}
      tabIndex={0}
    />
  );
}
