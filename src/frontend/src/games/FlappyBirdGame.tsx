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
  };
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

    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, "#050d1a");
    grad.addColorStop(1, "#0a1a2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137.5 + 10) % CW;
      const sy = (i * 89.3 + 20) % (CH * 0.6);
      ctx.fillRect(sx, sy, 1, 1);
    }

    ctx.fillStyle = "#1a2a10";
    ctx.fillRect(0, CH - 40, CW, 40);
    ctx.strokeStyle = "#38F26D";
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = "#38F26D";
    ctx.beginPath();
    ctx.moveTo(0, CH - 40);
    ctx.lineTo(CW, CH - 40);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (const pipe of state.pipes) {
      ctx.fillStyle = pipe.passed
        ? "rgba(56,242,109,0.7)"
        : "rgba(33,212,255,0.8)";
      ctx.shadowBlur = 8;
      ctx.shadowColor = pipe.passed ? "#38F26D" : "#21D4FF";
      ctx.fillRect(pipe.x, 0, PIPE_W, pipe.topH);
      ctx.fillRect(pipe.x - 4, pipe.topH - 18, PIPE_W + 8, 18);
      const botY = pipe.topH + PIPE_GAP;
      ctx.fillRect(pipe.x, botY, PIPE_W, CH - 40 - botY);
      ctx.fillRect(pipe.x - 4, botY, PIPE_W + 8, 18);
      ctx.shadowBlur = 0;
    }

    const { birdY } = state;
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#F59E0B";
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.arc(BIRD_X, birdY, BIRD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(BIRD_X + 5, birdY - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(BIRD_X + 7, birdY - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.ellipse(BIRD_X - 5, birdY + 3, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 28px 'Press Start 2P', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";
    ctx.fillText(String(state.score), CW / 2, 50);

    if (!state.started) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#F59E0B";
      ctx.font = "11px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TAP / SPACE", CW / 2, CH / 2 - 15);
      ctx.fillStyle = "#21D4FF";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText("TO START FLYING", CW / 2, CH / 2 + 10);
    }

    if (!state.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#C83CFF";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CW / 2, CH / 2 - 14);
      ctx.fillStyle = "#F6D33B";
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

      if (ts - s.lastPipeTime > PIPE_INTERVAL || s.pipes.length === 0) {
        const topH = 60 + Math.random() * (CH - 40 - PIPE_GAP - 120);
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

      if (s.birdY + BIRD_R >= CH - 40 || s.birdY - BIRD_R <= 0) {
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
        border: "1px solid rgba(245,158,11,0.5)",
        boxShadow: "0 0 20px rgba(245,158,11,0.3)",
      }}
      tabIndex={0}
    />
  );
}
