import { useCallback, useEffect, useRef, useState } from "react";
import { playClick, playExplosion, playHit } from "../utils/sound";

interface Props {
  onGameOver: (score: number) => void;
}

const GRID_COLS = 8;
const GRID_ROWS = 8;
const CELL_SIZE = 48;
const TRAY_SLOTS = [0, 1, 2] as const;

type Grid = (string | null)[][];

interface Piece {
  id: number;
  shape: number[][];
  color: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 0-1, starts at 1
  startX: number;
  startY: number;
}

interface ScorePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  createdAt: number;
}

const MC_COLORS = [
  "#5D8A2C",
  "#7C5230",
  "#666666",
  "#4FC3F7",
  "#FFD700",
  "#A0522D",
  "#E74C3C",
  "#1ABC9C",
];

const PIECE_SHAPES: number[][][] = [
  [[1]],
  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [
    [1, 0],
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
];

let pieceCounter = 0;
let particleCounter = 0;
let popupCounter = 0;

function randomPiece(): Piece {
  const shape = PIECE_SHAPES[Math.floor(Math.random() * PIECE_SHAPES.length)];
  const color = MC_COLORS[Math.floor(Math.random() * MC_COLORS.length)];
  return { id: ++pieceCounter, shape, color };
}

function canPlace(grid: Grid, piece: Piece, row: number, col: number): boolean {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS)
          return false;
        if (grid[nr][nc] !== null) return false;
      }
    }
  }
  return true;
}

function placePiece(grid: Grid, piece: Piece, row: number, col: number): Grid {
  const newGrid: Grid = grid.map((r) => [...r]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        newGrid[row + r][col + c] = piece.color;
      }
    }
  }
  return newGrid;
}

function clearLines(grid: Grid): {
  grid: Grid;
  cleared: number;
  clearedCells: Array<{ r: number; c: number; color: string }>;
} {
  const newGrid: Grid = grid.map((r) => [...r]);
  let cleared = 0;
  const clearedCells: Array<{ r: number; c: number; color: string }> = [];

  const fullRows: number[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    if (newGrid[r].every((c) => c !== null)) fullRows.push(r);
  }

  const fullCols: number[] = [];
  for (let c = 0; c < GRID_COLS; c++) {
    if (newGrid.every((row) => row[c] !== null)) fullCols.push(c);
  }

  for (const r of fullRows) {
    cleared += GRID_COLS;
    for (let c = 0; c < GRID_COLS; c++) {
      clearedCells.push({ r, c, color: newGrid[r][c] as string });
      newGrid[r][c] = null;
    }
  }
  for (const c of fullCols) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (newGrid[r][c] !== null) {
        cleared++;
        clearedCells.push({ r, c, color: newGrid[r][c] as string });
        newGrid[r][c] = null;
      }
    }
  }

  return { grid: newGrid, cleared, clearedCells };
}

function hasAnyMove(grid: Grid, pieces: (Piece | null)[]): boolean {
  for (const piece of pieces) {
    if (!piece) continue;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (canPlace(grid, piece, r, c)) return true;
      }
    }
  }
  return false;
}

function emptyGrid(): Grid {
  return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
}

// Stable grid cell keys
const GRID_CELL_KEYS: string[][] = Array.from({ length: GRID_ROWS }, (_, r) =>
  Array.from({ length: GRID_COLS }, (_, c) => `cell-r${r}-c${c}`),
);

// Lighten/darken a hex color
function adjustColor(hex: string, amount: number): string {
  const num = Number.parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

// 3D bevel gradient for a block color
function blockGradient(color: string): string {
  const highlight = adjustColor(color, 80);
  const shadow = adjustColor(color, -100);
  return `linear-gradient(135deg, ${highlight} 0%, ${color} 40%, ${shadow} 100%)`;
}

const GRID_TEXTURE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${CELL_SIZE + 2}' height='${CELL_SIZE + 2}'%3E%3Ccircle cx='${Math.floor((CELL_SIZE + 2) / 2)}' cy='${Math.floor((CELL_SIZE + 2) / 2)}' r='1' fill='%23ffffff08'/%3E%3C/svg%3E")`;

export default function BlockBlastGame({ onGameOver }: Props) {
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [tray, setTray] = useState<(Piece | null)[]>(() => [
    randomPiece(),
    randomPiece(),
    randomPiece(),
  ]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const [over, setOver] = useState(false);

  // Flash animation: set of keys that are white-flashing
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set());
  // Pop animation: set of keys that are "popping" on placement
  const [popCells, setPopCells] = useState<Set<string>>(new Set());

  // Particles rendered as state
  const [particles, setParticles] = useState<Particle[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);

  // Shake state
  const [shaking, setShaking] = useState(false);

  const gameOverFired = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const selectedPiece = selected !== null ? tray[selected] : null;

  // Particle animation loop
  useEffect(() => {
    const tick = (time: number) => {
      const dt = Math.min(time - lastTimeRef.current, 50) / 1000;
      lastTimeRef.current = time;

      if (particlesRef.current.length > 0) {
        particlesRef.current = particlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vy: p.vy + 300 * dt, // gravity
            life: p.life - dt * 2.0, // ~500ms lifetime
          }))
          .filter((p) => p.life > 0);
        setParticles([...particlesRef.current]);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const previewCells = useCallback((): Set<string> => {
    const cells = new Set<string>();
    if (selectedPiece && hover) {
      const { row, col } = hover;
      if (canPlace(grid, selectedPiece, row, col)) {
        for (let r = 0; r < selectedPiece.shape.length; r++) {
          for (let c = 0; c < selectedPiece.shape[r].length; c++) {
            if (selectedPiece.shape[r][c]) {
              cells.add(`${row + r},${col + c}`);
            }
          }
        }
      }
    }
    return cells;
  }, [selectedPiece, hover, grid]);

  const preview = previewCells();

  const spawnParticles = (
    clearedCells: Array<{ r: number; c: number; color: string }>,
  ) => {
    const rect = gridRef.current?.getBoundingClientRect();
    const containerRect =
      gridRef.current?.parentElement?.getBoundingClientRect();
    if (!rect || !containerRect) return;

    const GRID_PADDING = 4;
    const GRID_GAP = 2;

    const newParticles: Particle[] = [];
    for (const { r, c, color } of clearedCells) {
      const cellX =
        rect.left -
        containerRect.left +
        GRID_PADDING +
        c * (CELL_SIZE + GRID_GAP) +
        CELL_SIZE / 2;
      const cellY =
        rect.top -
        containerRect.top +
        GRID_PADDING +
        r * (CELL_SIZE + GRID_GAP) +
        CELL_SIZE / 2;

      const count = 4;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
        const speed = 80 + Math.random() * 160;
        newParticles.push({
          id: ++particleCounter,
          x: cellX,
          y: cellY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 50,
          color,
          size: 4 + Math.random() * 5,
          life: 1,
          startX: cellX,
          startY: cellY,
        });
      }
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
    setParticles([...particlesRef.current]);
  };

  const handleCellClick = (row: number, col: number) => {
    if (over || selected === null || !selectedPiece) return;
    if (!canPlace(grid, selectedPiece, row, col)) return;

    playClick();
    const newGrid = placePiece(grid, selectedPiece, row, col);

    // Pop animation for placed cells
    const placedKeys = new Set<string>();
    for (let r = 0; r < selectedPiece.shape.length; r++) {
      for (let c = 0; c < selectedPiece.shape[r].length; c++) {
        if (selectedPiece.shape[r][c]) {
          placedKeys.add(`${row + r},${col + c}`);
        }
      }
    }
    setPopCells(placedKeys);
    setTimeout(() => setPopCells(new Set()), 160);

    const { grid: clearedGrid, cleared, clearedCells } = clearLines(newGrid);

    if (cleared > 0) {
      // Flash cleared cells white
      const flashSet = new Set<string>(
        clearedCells.map(({ r, c }) => `${r},${c}`),
      );
      setFlashCells(flashSet);

      playExplosion();
      // Shake
      playHit();
      setShaking(true);
      setTimeout(() => setShaking(false), 220);

      // After flash, spawn particles
      setTimeout(() => {
        setFlashCells(new Set());
        spawnParticles(clearedCells);
      }, 60);
    }

    const newScore = score + cleared * 10;

    // Score popup
    if (cleared > 0) {
      const popup: ScorePopup = {
        id: ++popupCounter,
        value: cleared * 10,
        x: 50,
        y: 50,
        createdAt: Date.now(),
      };
      setScorePopups((prev) => [...prev, popup]);
      setTimeout(
        () => setScorePopups((prev) => prev.filter((p) => p.id !== popup.id)),
        900,
      );
    }

    const newTray = [...tray];
    newTray[selected] = null;

    const allEmpty = newTray.every((p) => p === null);
    const finalTray = allEmpty
      ? [randomPiece(), randomPiece(), randomPiece()]
      : newTray;

    setGrid(clearedGrid);
    setTray(finalTray);
    setScore(newScore);
    setSelected(null);
    setHover(null);

    if (!hasAnyMove(clearedGrid, finalTray)) {
      setOver(true);
      if (!gameOverFired.current) {
        gameOverFired.current = true;
        setTimeout(() => onGameOver(newScore), 400);
      }
    }
  };

  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    const key = `${row},${col}`;
    const isFlash = flashCells.has(key);
    const isPop = popCells.has(key);
    const isPrev = preview.has(key);
    const color = grid[row][col];

    if (isFlash) {
      return {
        width: CELL_SIZE,
        height: CELL_SIZE,
        background: "#ffffff",
        border: "2px solid #ffffff",
        borderRadius: 4,
        padding: 0,
        boxShadow: "0 0 16px #ffffff, inset 0 0 8px #ffffff",
        transform: "scale(1.08)",
        transition: "none",
        zIndex: 2,
        position: "relative",
      };
    }

    if (isPrev && selectedPiece) {
      const c = selectedPiece.color;
      return {
        width: CELL_SIZE,
        height: CELL_SIZE,
        background: blockGradient(c),
        border: `2px solid ${adjustColor(c, 60)}`,
        borderRadius: 4,
        padding: 0,
        opacity: 0.75,
        boxShadow: `inset 2px 2px 0 ${adjustColor(c, 80)}, inset -2px -2px 0 ${adjustColor(c, -80)}, 0 2px 8px ${c}66`,
        transition: "none",
        position: "relative",
      };
    }

    if (color) {
      return {
        width: CELL_SIZE,
        height: CELL_SIZE,
        background: blockGradient(color),
        border: `2px solid ${adjustColor(color, 40)}`,
        borderRadius: 4,
        padding: 0,
        boxShadow: `inset 2px 2px 0 ${adjustColor(color, 80)}, inset -2px -2px 0 ${adjustColor(color, -80)}, 0 2px 6px #0005`,
        transform: isPop ? "scale(1.15)" : "scale(1.0)",
        transition: isPop
          ? "transform 0.08s ease-out"
          : "transform 0.08s ease-in, background 0.1s",
        position: "relative",
        zIndex: isPop ? 2 : 1,
      };
    }

    // Empty cell
    return {
      width: CELL_SIZE,
      height: CELL_SIZE,
      background: "#141c28",
      backgroundImage: GRID_TEXTURE,
      backgroundSize: `${CELL_SIZE + 2}px ${CELL_SIZE + 2}px`,
      border: "2px solid #1e2a3a",
      borderRadius: 4,
      padding: 0,
      transition: "background 0.1s",
      position: "relative",
    };
  };

  // Tray cell bevel
  const trayBlockStyle = (color: string): React.CSSProperties => ({
    width: 20,
    height: 20,
    background: blockGradient(color),
    border: `1px solid ${adjustColor(color, 40)}`,
    borderRadius: 3,
    boxShadow: `inset 2px 2px 0 ${adjustColor(color, 80)}, inset -1px -1px 0 ${adjustColor(color, -80)}`,
  });

  const shakeStyle: React.CSSProperties = shaking
    ? { animation: "blockblast-shake 0.22s ease" }
    : {};

  return (
    <>
      <style>{`
        @keyframes blockblast-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-4px, 2px); }
          30%  { transform: translate(4px, -2px); }
          45%  { transform: translate(-3px, 3px); }
          60%  { transform: translate(3px, -1px); }
          75%  { transform: translate(-2px, 1px); }
          90%  { transform: translate(2px, -1px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
      <div
        style={{
          background: "#0E1520",
          userSelect: "none",
          position: "relative",
          ...shakeStyle,
        }}
        className="flex flex-col items-center gap-4 p-4 rounded-xl"
      >
        {/* Score */}
        <div className="flex items-center gap-3">
          <span className="font-arcade text-[9px] text-muted-foreground tracking-widest">
            SCORE
          </span>
          <span
            className="font-arcade text-xl"
            style={{ color: "#4FC3F7", textShadow: "0 0 10px #4FC3F788" }}
            data-ocid="block-blast.score"
          >
            {score}
          </span>
        </div>

        {/* Grid container (relative for particles + popups) */}
        <div style={{ position: "relative" }}>
          <div
            ref={gridRef}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
              gap: 2,
              background: "linear-gradient(135deg, #0d1520 0%, #111c2e 100%)",
              padding: 4,
              borderRadius: 10,
              border: "2px solid #1e3050",
              boxShadow: "0 8px 32px #00000088, inset 0 1px 0 #ffffff0a",
              cursor: selected !== null ? "crosshair" : "default",
            }}
            data-ocid="block-blast.canvas_target"
          >
            {GRID_CELL_KEYS.map((rowKeys, row) =>
              rowKeys.map((cellKey, col) => (
                <button
                  type="button"
                  key={cellKey}
                  onClick={() => handleCellClick(row, col)}
                  onMouseEnter={() => setHover({ row, col })}
                  onMouseLeave={() => setHover(null)}
                  style={getCellStyle(row, col)}
                />
              )),
            )}
          </div>

          {/* Particles overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {particles.map((p) => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  background: p.color,
                  opacity: Math.max(0, p.life),
                  transform: `translate(-50%, -50%) scale(${p.life})`,
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                  pointerEvents: "none",
                }}
              />
            ))}

            {/* Score popups */}
            {scorePopups.map((popup) => {
              const elapsed = (Date.now() - popup.createdAt) / 900;
              const opacity = Math.max(0, 1 - elapsed);
              const translateY = -60 * elapsed;
              return (
                <div
                  key={popup.id}
                  style={{
                    position: "absolute",
                    left: `${popup.x}%`,
                    top: `${popup.y}%`,
                    transform: `translate(-50%, calc(-50% + ${translateY}px))`,
                    opacity,
                    color: "#FFD700",
                    fontSize: 22,
                    fontWeight: 900,
                    fontFamily: "monospace",
                    textShadow: "0 0 12px #FFD700, 0 2px 4px #000",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                  }}
                >
                  +{popup.value}
                </div>
              );
            })}
          </div>
        </div>

        {/* Piece Tray */}
        <div className="flex gap-4 items-end mt-2">
          {TRAY_SLOTS.map((idx) => {
            const piece = tray[idx];
            return (
              <button
                type="button"
                key={`tray-slot-${idx}`}
                onClick={() => {
                  if (!over && piece)
                    setSelected(idx === selected ? null : idx);
                }}
                data-ocid={`block-blast.item.${idx + 1}`}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: `2px solid ${
                    selected === idx ? (piece?.color ?? "#5D8A2C") : "#1e3050"
                  }`,
                  background:
                    selected === idx
                      ? "linear-gradient(135deg, #ffffff18, #ffffff08)"
                      : "linear-gradient(135deg, #0d1520, #111c2e)",
                  cursor: piece ? "pointer" : "default",
                  opacity: piece ? 1 : 0.2,
                  minWidth: 68,
                  minHeight: 68,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition:
                    "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                  boxShadow:
                    selected === idx
                      ? `0 0 18px ${piece?.color ?? "#5D8A2C"}66, inset 0 1px 0 #ffffff18`
                      : "0 2px 8px #00000066, inset 0 1px 0 #ffffff08",
                }}
              >
                {piece && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${piece.shape[0].length}, 20px)`,
                      gap: 2,
                      pointerEvents: "none",
                    }}
                  >
                    {piece.shape.flatMap((shapeRow, ri) =>
                      shapeRow.map((cell, ci) => (
                        <div
                          key={`p${piece.id}-r${ri}-c${ci}`}
                          style={
                            cell
                              ? trayBlockStyle(piece.color)
                              : { width: 20, height: 20 }
                          }
                        />
                      )),
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {over && (
          <div
            className="font-arcade text-[10px] tracking-widest"
            style={{ color: "#E74C3C", textShadow: "0 0 10px #E74C3C88" }}
            data-ocid="block-blast.error_state"
          >
            GAME OVER — NO MORE MOVES!
          </div>
        )}

        {!over && (
          <p className="font-arcade text-[8px] text-muted-foreground tracking-widest">
            {selected !== null
              ? "CLICK GRID TO PLACE · ESC TO DESELECT"
              : "SELECT A PIECE FROM THE TRAY"}
          </p>
        )}
      </div>
    </>
  );
}
