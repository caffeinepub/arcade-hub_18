import { useCallback, useRef, useState } from "react";

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

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const newGrid: Grid = grid.map((r) => [...r]);
  let cleared = 0;

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
    for (let c = 0; c < GRID_COLS; c++) newGrid[r][c] = null;
  }
  for (const c of fullCols) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (newGrid[r][c] !== null) {
        cleared++;
        newGrid[r][c] = null;
      }
    }
  }

  return { grid: newGrid, cleared };
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

// Stable grid cell keys — fixed 8×8, positions never reorder
const GRID_CELL_KEYS: string[][] = Array.from({ length: GRID_ROWS }, (_, r) =>
  Array.from({ length: GRID_COLS }, (_, c) => `cell-r${r}-c${c}`),
);

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
  const [clearAnim, setClearAnim] = useState<Set<string>>(new Set());
  const gameOverFired = useRef(false);

  const selectedPiece = selected !== null ? tray[selected] : null;

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

  const handleCellClick = (row: number, col: number) => {
    if (over || selected === null || !selectedPiece) return;
    if (!canPlace(grid, selectedPiece, row, col)) return;

    const newGrid = placePiece(grid, selectedPiece, row, col);
    const { grid: clearedGrid, cleared } = clearLines(newGrid);

    if (cleared > 0) {
      const animSet = new Set<string>();
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (newGrid[r][c] !== null && clearedGrid[r][c] === null) {
            animSet.add(`${r},${c}`);
          }
        }
      }
      setClearAnim(animSet);
      setTimeout(() => setClearAnim(new Set()), 300);
    }

    const newScore = score + cleared * 10;
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

  const cellBorder = (row: number, col: number): string => {
    const key = `${row},${col}`;
    if (clearAnim.has(key)) return "#FFD700";
    if (preview.has(key)) return selectedPiece?.color ?? "#fff";
    if (grid[row][col]) return "#222";
    return "#2a2a2a";
  };

  const cellBg = (row: number, col: number): string => {
    const key = `${row},${col}`;
    if (clearAnim.has(key)) return "#FFD70088";
    if (preview.has(key)) return `${selectedPiece?.color ?? "#fff"}88`;
    if (grid[row][col]) return grid[row][col] as string;
    return "#1a1a1a";
  };

  return (
    <div
      style={{ background: "#0E1520", userSelect: "none" }}
      className="flex flex-col items-center gap-4 p-4 rounded-xl"
    >
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

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
          gap: 2,
          background: "#111",
          padding: 4,
          borderRadius: 8,
          border: "2px solid #333",
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
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                background: cellBg(row, col),
                border: `2px solid ${cellBorder(row, col)}`,
                borderRadius: 3,
                padding: 0,
                transition: clearAnim.has(`${row},${col}`)
                  ? "none"
                  : "background 0.1s",
                boxShadow:
                  grid[row][col] && !clearAnim.has(`${row},${col}`)
                    ? `inset 2px 2px 0 ${grid[row][col]}cc, inset -1px -1px 0 #0008`
                    : undefined,
              }}
            />
          )),
        )}
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
                if (!over && piece) setSelected(idx === selected ? null : idx);
              }}
              data-ocid={`block-blast.item.${idx + 1}`}
              style={{
                padding: 8,
                borderRadius: 8,
                border: `2px solid ${selected === idx ? (piece?.color ?? "#5D8A2C") : "#333"}`,
                background: selected === idx ? "#ffffff11" : "#111",
                cursor: piece ? "pointer" : "default",
                opacity: piece ? 1 : 0.2,
                minWidth: 60,
                minHeight: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.15s, background 0.15s",
                boxShadow:
                  selected === idx
                    ? `0 0 12px ${piece?.color ?? "#5D8A2C"}66`
                    : undefined,
              }}
            >
              {piece && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${piece.shape[0].length}, 16px)`,
                    gap: 1,
                    pointerEvents: "none",
                  }}
                >
                  {piece.shape.flatMap((shapeRow, ri) =>
                    shapeRow.map((cell, ci) => (
                      <div
                        key={`p${piece.id}-r${ri}-c${ci}`}
                        style={{
                          width: 16,
                          height: 16,
                          background: cell ? piece.color : "transparent",
                          border: cell ? `1px solid ${piece.color}88` : "none",
                          borderRadius: 2,
                          boxShadow: cell
                            ? `inset 1px 1px 0 ${piece.color}cc`
                            : undefined,
                        }}
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
  );
}
