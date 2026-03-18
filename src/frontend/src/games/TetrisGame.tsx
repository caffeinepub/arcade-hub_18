import { useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const CW = COLS * CELL;
const CH = ROWS * CELL;
const TICK_START = 600;

type Board = (string | null)[][];

const PIECES: { shape: number[][]; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: "#4FE0C8" }, // I – diamond blue
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#FFD700", // O – gold
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "#C8A96E", // T – wood plank
  },
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "#5D8A3C", // S – grass green
  },
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "#CC3333", // Z – TNT red
  },
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "#8B5E3C", // L – dirt brown
  },
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "#8A8A8A", // J – stone
  },
];

function rotateShape(s: number[][]): number[][] {
  const R = s.length;
  const C = s[0].length;
  const res: number[][] = Array.from({ length: C }, () => Array(R).fill(0));
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) res[c][R - 1 - r] = s[r][c];
  return res;
}

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

function newPiece(): Piece {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    shape: p.shape.map((r) => [...r]),
    color: p.color,
    x: Math.floor((COLS - p.shape[0].length) / 2),
    y: 0,
  };
}

function collides(
  board: Board,
  piece: Piece,
  ox = 0,
  oy = 0,
  shape?: number[][],
): boolean {
  const s = shape ?? piece.shape;
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue;
      const nx = piece.x + c + ox;
      const ny = piece.y + r + oy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function drawMinecraftCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  // top+left lighter
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 1, py + CELL - 1);
  ctx.lineTo(px + 1, py + 1);
  ctx.lineTo(px + CELL - 1, py + 1);
  ctx.stroke();
  // right+bottom darker
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(px + CELL - 1, py + 1);
  ctx.lineTo(px + CELL - 1, py + CELL - 1);
  ctx.lineTo(px + 1, py + CELL - 1);
  ctx.stroke();
}

export default function TetrisGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    board: emptyBoard(),
    current: newPiece(),
    score: 0,
    lines: 0,
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
    const { board, current, score, lines, alive } = stateRef.current;

    // Dark stone background
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, CW, CH);

    // Grid
    ctx.strokeStyle = "rgba(80,80,80,0.15)";
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, CH);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(CW, r * CELL);
      ctx.stroke();
    }

    // Board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const col = board[r][c];
        if (col) {
          drawMinecraftCell(ctx, c * CELL, r * CELL, col);
        }
      }
    }

    // Current piece
    if (alive && current) {
      current.shape.forEach((row, r) => {
        row.forEach((v, c) => {
          if (!v) return;
          const px = (current.x + c) * CELL;
          const py = (current.y + r) * CELL;
          drawMinecraftCell(ctx, px, py, current.color);
        });
      });
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, CW, 32);
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`${score}`, 6, 14);
    ctx.fillStyle = "#C8A96E";
    ctx.fillText(`L:${lines}`, 6, 26);

    if (!alive) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#FFD700";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CW / 2, CH / 2 - 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE: ${score}`, CW / 2, CH / 2 + 10);
      ctx.textAlign = "left";
    }
  }, []);

  const lockAndClear = useCallback(() => {
    const s = stateRef.current;
    const { board, current } = s;
    current.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        const ny = current.y + r;
        if (ny < 0) return;
        board[ny][current.x + c] = current.color;
      });
    });
    let cleared = 0;
    const newBoard = board.filter((row) => row.some((cell) => !cell));
    cleared = ROWS - newBoard.length;
    while (newBoard.length < ROWS) newBoard.unshift(Array(COLS).fill(null));
    s.board = newBoard;
    s.score += [0, 100, 300, 500, 800][cleared] ?? 0;
    s.lines += cleared;
    const next = newPiece();
    if (collides(s.board, next)) {
      s.alive = false;
      draw();
      cbRef.current(s.score);
      return;
    }
    s.current = next;
    draw();
  }, [draw]);

  const dropPiece = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) return;
    if (collides(s.board, s.current, 0, 1)) {
      lockAndClear();
    } else {
      s.current.y += 1;
      draw();
    }
  }, [draw, lockAndClear]);

  useEffect(() => {
    stateRef.current = {
      board: emptyBoard(),
      current: newPiece(),
      score: 0,
      lines: 0,
      alive: true,
    };
    draw();
    timerRef.current = window.setInterval(dropPiece, TICK_START);

    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s.alive) return;
      if (e.key === "ArrowLeft" && !collides(s.board, s.current, -1)) {
        s.current.x -= 1;
        draw();
      }
      if (e.key === "ArrowRight" && !collides(s.board, s.current, 1)) {
        s.current.x += 1;
        draw();
      }
      if (e.key === "ArrowDown") {
        dropPiece();
      }
      if (e.key === "ArrowUp") {
        const rot = rotateShape(s.current.shape);
        if (!collides(s.board, s.current, 0, 0, rot)) {
          s.current.shape = rot;
          draw();
        }
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [draw, dropPiece]);

  return (
    <canvas
      ref={canvasRef}
      width={CW}
      height={CH}
      className="rounded-lg"
      style={{
        border: "3px solid #7A7A7A",
        boxShadow: "none",
      }}
      tabIndex={0}
    />
  );
}
