import { useCallback, useEffect, useRef, useState } from "react";
import { playClick, playDeath, playLevelUp, playScore } from "../utils/sound";

interface Props {
  onGameOver: (score: number) => void;
}

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const CW = COLS * CELL;
const CH = ROWS * CELL;
const TICK_START = 600;
const PREVIEW_CELL = 24;

type Board = (string | null)[][];

const PIECES: { shape: number[][]; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: "#4FE0C8" },
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#FFD700",
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "#C8A96E",
  },
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "#5D8A3C",
  },
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "#CC3333",
  },
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "#8B5E3C",
  },
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "#8A8A8A",
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

function randomPiece(): Piece {
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
  size = CELL,
) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 1, py + size - 1);
  ctx.lineTo(px + 1, py + 1);
  ctx.lineTo(px + size - 1, py + 1);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(px + size - 1, py + 1);
  ctx.lineTo(px + size - 1, py + size - 1);
  ctx.lineTo(px + 1, py + size - 1);
  ctx.stroke();
}

export default function TetrisGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    board: emptyBoard(),
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    lines: 0,
    alive: true,
  });
  const timerRef = useRef<number | null>(null);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  const [hud, setHud] = useState({ score: 0, level: 1, lines: 0 });

  const drawPreview = useCallback(() => {
    const cv = previewRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { next } = stateRef.current;
    const pw = cv.width;
    const ph = cv.height;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, pw, ph);
    const cols = next.shape[0].length;
    const rows = next.shape.length;
    const offX = Math.floor((pw / PREVIEW_CELL - cols) / 2) * PREVIEW_CELL;
    const offY = Math.floor((ph / PREVIEW_CELL - rows) / 2) * PREVIEW_CELL;
    next.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        drawMinecraftCell(
          ctx,
          offX + c * PREVIEW_CELL,
          offY + r * PREVIEW_CELL,
          next.color,
          PREVIEW_CELL,
        );
      });
    });
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { board, current, score, lines, alive } = stateRef.current;

    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, CW, CH);

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

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const col = board[r][c];
        if (col) drawMinecraftCell(ctx, c * CELL, r * CELL, col);
      }
    }

    if (alive && current) {
      current.shape.forEach((row, r) => {
        row.forEach((v, c) => {
          if (!v) return;
          drawMinecraftCell(
            ctx,
            (current.x + c) * CELL,
            (current.y + r) * CELL,
            current.color,
          );
        });
      });
    }

    if (!alive) {
      const level = Math.floor(lines / 10) + 1;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#FFD700";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CW / 2, CH / 2 - 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE: ${score}`, CW / 2, CH / 2 + 4);
      ctx.fillStyle = "#4FE0C8";
      ctx.fillText(`LEVEL: ${level}`, CW / 2, CH / 2 + 22);
      ctx.fillStyle = "#C8A96E";
      ctx.fillText(`LINES: ${lines}`, CW / 2, CH / 2 + 40);
      ctx.textAlign = "left";
    }

    drawPreview();
  }, [drawPreview]);

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
    playClick();
    let cleared = 0;
    const newBoard = board.filter((row) => row.some((cell) => !cell));
    cleared = ROWS - newBoard.length;
    while (newBoard.length < ROWS) newBoard.unshift(Array(COLS).fill(null));
    s.board = newBoard;
    s.score += [0, 100, 300, 500, 800][cleared] ?? 0;
    s.lines += cleared;

    const level = Math.floor(s.lines / 10) + 1;
    const prevLevel = Math.floor((s.lines - cleared) / 10) + 1;
    if (cleared > 0) playScore();
    if (level > prevLevel) playLevelUp();
    setHud({ score: s.score, level, lines: s.lines });

    // Update timer speed based on level
    const newInterval = Math.max(100, TICK_START - (level - 1) * 50);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        const st = stateRef.current;
        if (!st.alive) return;
        if (collides(st.board, st.current, 0, 1)) {
          lockAndClear();
        } else {
          st.current.y += 1;
          draw();
        }
      }, newInterval);
    }

    s.current = s.next;
    s.next = randomPiece();

    if (collides(s.board, s.current)) {
      s.alive = false;
      draw();
      playDeath();
      cbRef.current(s.score);
      return;
    }
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
      current: randomPiece(),
      next: randomPiece(),
      score: 0,
      lines: 0,
      alive: true,
    };
    setHud({ score: 0, level: 1, lines: 0 });
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
      if (e.key === "ArrowDown") dropPiece();
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

  const hudStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "3px solid #7A7A7A",
    borderRadius: 6,
    padding: "8px",
    minWidth: 96,
  };

  const labelStyle: React.CSSProperties = {
    color: "#888",
    fontSize: 7,
    fontFamily: "'Press Start 2P', monospace",
    marginBottom: 4,
    display: "block",
  };

  return (
    <div className="flex gap-3 items-start">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-lg"
        style={{ border: "3px solid #7A7A7A" }}
        tabIndex={0}
      />
      <div className="flex flex-col gap-3">
        <div style={hudStyle}>
          <span style={labelStyle}>SCORE</span>
          <span
            data-ocid="tetris.score"
            style={{
              color: "#FFD700",
              fontSize: 13,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            {hud.score}
          </span>
        </div>
        <div style={hudStyle}>
          <span style={labelStyle}>LEVEL</span>
          <span
            data-ocid="tetris.level"
            style={{
              color: "#4FE0C8",
              fontSize: 13,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            {hud.level}
          </span>
        </div>
        <div style={hudStyle}>
          <span style={labelStyle}>LINES</span>
          <span
            data-ocid="tetris.lines"
            style={{
              color: "#C8A96E",
              fontSize: 13,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            {hud.lines}
          </span>
        </div>
        <div style={hudStyle}>
          <span style={labelStyle}>NEXT</span>
          <canvas
            ref={previewRef}
            width={96}
            height={72}
            style={{ display: "block" }}
            data-ocid="tetris.panel"
          />
        </div>
      </div>
    </div>
  );
}
