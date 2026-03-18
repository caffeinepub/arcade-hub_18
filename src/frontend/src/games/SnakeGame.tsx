import { useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const CELL = 20;
const COLS = 20;
const ROWS = 20;
const W = COLS * CELL;
const H = ROWS * CELL;
const TICK = 140;

type Pt = { x: number; y: number };

function rndFood(snake: Pt[]): Pt {
  let p: Pt;
  do {
    p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  pad = 1,
) {
  const bx = x + pad;
  const by = y + pad;
  const bs = size - pad * 2;
  ctx.fillStyle = color;
  ctx.fillRect(bx, by, bs, bs);
  // light top-left
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx, by + bs);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + bs, by);
  ctx.stroke();
  // dark bottom-right
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.moveTo(bx + bs, by);
  ctx.lineTo(bx + bs, by + bs);
  ctx.lineTo(bx, by + bs);
  ctx.stroke();
}

export default function SnakeGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ] as Pt[],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 15, y: 8 } as Pt,
    score: 0,
    alive: true,
  });
  const timerRef = useRef<number | null>(null);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Dark cave background
    ctx.fillStyle = "#1A1209";
    ctx.fillRect(0, 0, W, H);

    // Subtle dirt-tone grid
    ctx.strokeStyle = "#2A1E0D";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }

    // Food — diamond block (cyan)
    drawBlock(ctx, g.food.x * CELL, g.food.y * CELL, CELL, "#4FE0C8", 3);
    // small cross on diamond
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(
      g.food.x * CELL + CELL / 2 - 1,
      g.food.y * CELL + 4,
      2,
      CELL - 8,
    );
    ctx.fillRect(
      g.food.x * CELL + 4,
      g.food.y * CELL + CELL / 2 - 1,
      CELL - 8,
      2,
    );

    // Snake — grass green blocks
    g.snake.forEach((seg, i) => {
      const color = i === 0 ? "#6FAA46" : "#5D8A3C";
      drawBlock(ctx, seg.x * CELL, seg.y * CELL, CELL, color, 1);
    });

    // Score overlay
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, 30);
    ctx.fillStyle = "#FFD700";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(`SCORE: ${g.score}`, 8, 20);

    if (!g.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFD700";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 10);
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE: ${g.score}`, W / 2, H / 2 + 15);
      ctx.textAlign = "left";
    }
  }, []);

  const step = useCallback(() => {
    const g = gameRef.current;
    if (!g.alive) return;
    g.dir = g.nextDir;
    const head = g.snake[0];
    const nh = { x: head.x + g.dir.x, y: head.y + g.dir.y };
    if (
      nh.x < 0 ||
      nh.x >= COLS ||
      nh.y < 0 ||
      nh.y >= ROWS ||
      g.snake.some((s) => s.x === nh.x && s.y === nh.y)
    ) {
      g.alive = false;
      draw();
      cbRef.current(g.score);
      return;
    }
    g.snake.unshift(nh);
    if (nh.x === g.food.x && nh.y === g.food.y) {
      g.score += 10;
      g.food = rndFood(g.snake);
    } else {
      g.snake.pop();
    }
    draw();
  }, [draw]);

  useEffect(() => {
    gameRef.current = {
      snake: [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: rndFood([]),
      score: 0,
      alive: true,
    };
    draw();
    timerRef.current = window.setInterval(step, TICK);

    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      const d = g.dir;
      if (e.key === "ArrowUp" && d.y !== 1) g.nextDir = { x: 0, y: -1 };
      if (e.key === "ArrowDown" && d.y !== -1) g.nextDir = { x: 0, y: 1 };
      if (e.key === "ArrowLeft" && d.x !== 1) g.nextDir = { x: -1, y: 0 };
      if (e.key === "ArrowRight" && d.x !== -1) g.nextDir = { x: 1, y: 0 };
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [draw, step]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="rounded-lg"
      style={{
        border: "3px solid #5D8A3C",
        boxShadow: "none",
      }}
      tabIndex={0}
    />
  );
}
