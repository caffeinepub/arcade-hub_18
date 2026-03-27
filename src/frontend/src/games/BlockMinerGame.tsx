import { useCallback, useEffect, useRef, useState } from "react";
import { playDeath, playMine } from "../utils/sound";

interface Props {
  onGameOver: (score: number) => void;
}

type BlockType = "dirt" | "stone" | "coal" | "iron" | "gold" | "diamond";

interface Block {
  type: BlockType;
}

const BLOCK_SIZE = 40;
const COLS = 10;
const MAX_ROWS = 14;
const CANVAS_WIDTH = COLS * BLOCK_SIZE;
const CANVAS_HEIGHT = MAX_ROWS * BLOCK_SIZE;

const BLOCK_DEFS: Record<
  BlockType,
  { color: string; points: number; label: string }
> = {
  dirt: { color: "#8B6914", points: 1, label: "Dirt" },
  stone: { color: "#7a7a7a", points: 3, label: "Stone" },
  coal: { color: "#3a3a3a", points: 8, label: "Coal Ore" },
  iron: { color: "#c8956c", points: 15, label: "Iron Ore" },
  gold: { color: "#FFD700", points: 30, label: "Gold Ore" },
  diamond: { color: "#4FC3F7", points: 50, label: "Diamond Ore" },
};

const SPAWN_WEIGHTS: [BlockType, number][] = [
  ["dirt", 35],
  ["stone", 30],
  ["coal", 18],
  ["iron", 10],
  ["gold", 5],
  ["diamond", 2],
];

function randomBlock(): BlockType {
  const total = SPAWN_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of SPAWN_WEIGHTS) {
    r -= w;
    if (r <= 0) return type;
  }
  return "dirt";
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  block: Block,
) {
  const x = col * BLOCK_SIZE;
  const y = row * BLOCK_SIZE;
  const def = BLOCK_DEFS[block.type];

  ctx.fillStyle = def.color;
  ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

  // Border
  ctx.strokeStyle = "#00000066";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

  // Inner highlight (top-left)
  ctx.strokeStyle = "#ffffff22";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + BLOCK_SIZE - 2);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x + BLOCK_SIZE - 2, y + 2);
  ctx.stroke();

  // Coal ore spots
  if (block.type === "coal") {
    ctx.fillStyle = "#ffffff";
    const spots = [
      [x + 10, y + 12],
      [x + 24, y + 18],
      [x + 16, y + 28],
    ];
    for (const [sx, sy] of spots) {
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Iron ore spots
  if (block.type === "iron") {
    ctx.fillStyle = "#b0b0b0";
    const spots = [
      [x + 12, y + 14],
      [x + 26, y + 20],
      [x + 18, y + 28],
    ];
    for (const [sx, sy] of spots) {
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Gold ore spots
  if (block.type === "gold") {
    ctx.fillStyle = "#fffde7";
    const spots = [
      [x + 10, y + 14],
      [x + 28, y + 18],
      [x + 20, y + 28],
    ];
    for (const [sx, sy] of spots) {
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Diamond ore spots (small cyan squares)
  if (block.type === "diamond") {
    ctx.fillStyle = "#e0f7fa";
    const spots = [
      [x + 8, y + 12],
      [x + 24, y + 10],
      [x + 14, y + 26],
    ];
    for (const [sx, sy] of spots) {
      ctx.fillRect(sx - 4, sy - 4, 8, 8);
      ctx.strokeStyle = "#00bcd488";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 4, sy - 4, 8, 8);
    }
  }
}

export default function BlockMinerGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Block[][]>(Array.from({ length: COLS }, () => []));
  const scoreRef = useRef(0);
  const gameStateRef = useRef<"idle" | "running" | "over">("idle");
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIntervalRef = useRef(1200);

  const [, forceRender] = useState(0);
  const scoreDisplayRef = useRef(0);
  const maxColRef = useRef(0);

  const stopTimers = useCallback(() => {
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (speedTimerRef.current) clearInterval(speedTimerRef.current);
    spawnIntervalRef.current = null;
    speedTimerRef.current = null;
  }, []);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#1a0e05";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid lines
    ctx.strokeStyle = "#2a1a0a";
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK_SIZE, 0);
      ctx.lineTo(c * BLOCK_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let r = 0; r <= MAX_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK_SIZE);
      ctx.lineTo(CANVAS_WIDTH, r * BLOCK_SIZE);
      ctx.stroke();
    }

    // Blocks (bottom-aligned)
    const columns = columnsRef.current;
    for (let col = 0; col < COLS; col++) {
      const colBlocks = columns[col];
      for (let i = 0; i < colBlocks.length; i++) {
        const row = MAX_ROWS - colBlocks.length + i;
        drawBlock(ctx, col, row, colBlocks[i]);
      }
    }

    // Danger zone line at 70%
    const dangerRow = Math.floor(MAX_ROWS * 0.3); // top 30% = 70% filled
    ctx.strokeStyle = "#ff000033";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, dangerRow * BLOCK_SIZE);
    ctx.lineTo(CANVAS_WIDTH, dangerRow * BLOCK_SIZE);
    ctx.stroke();
    ctx.setLineDash([]);

    // Overlays
    if (gameStateRef.current === "idle") {
      ctx.fillStyle = "rgba(10, 6, 2, 0.78)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#F5C518";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("⛏ BLOCK MINER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

      ctx.fillStyle = "#8B6914";
      ctx.font = "14px monospace";
      ctx.fillText("CLICK TO START", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 4);

      ctx.fillStyle = "#7a7a7a";
      ctx.font = "11px monospace";
      ctx.fillText(
        "Mine blocks before columns overflow!",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 28,
      );
    }

    if (gameStateRef.current === "over") {
      ctx.fillStyle = "rgba(10, 6, 2, 0.82)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#E53935";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "COLUMN OVERFLOW!",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 40,
      );

      ctx.fillStyle = "#F5C518";
      ctx.font = "bold 18px monospace";
      ctx.fillText(
        `SCORE: ${scoreRef.current}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
      );

      ctx.fillStyle = "#7a7a7a";
      ctx.font = "13px monospace";
      ctx.fillText(
        "Click to play again",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 32,
      );
    }
  }, []);

  const spawnBlock = useCallback(() => {
    const columns = columnsRef.current;
    const col = Math.floor(Math.random() * COLS);
    columns[col].push({ type: randomBlock() });

    const max = Math.max(...columns.map((c) => c.length));
    maxColRef.current = max;

    if (max > MAX_ROWS) {
      gameStateRef.current = "over";
      stopTimers();
      drawGame();
      playDeath();
      onGameOver(scoreRef.current);
      forceRender((n) => n + 1);
      return;
    }
    drawGame();
    forceRender((n) => n + 1);
  }, [drawGame, onGameOver, stopTimers]);

  const startSpawnLoop = useCallback(
    (interval: number) => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = setInterval(spawnBlock, interval);
    },
    [spawnBlock],
  );

  const startGame = useCallback(() => {
    columnsRef.current = Array.from({ length: COLS }, () => []);
    scoreRef.current = 0;
    scoreDisplayRef.current = 0;
    maxColRef.current = 0;
    currentIntervalRef.current = 1200;
    gameStateRef.current = "running";

    stopTimers();
    startSpawnLoop(1200);

    // Speed ramp every 30s
    speedTimerRef.current = setInterval(() => {
      currentIntervalRef.current = Math.max(
        400,
        currentIntervalRef.current - 100,
      );
      startSpawnLoop(currentIntervalRef.current);
    }, 30000);

    drawGame();
    forceRender((n) => n + 1);
  }, [drawGame, startSpawnLoop, stopTimers]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (gameStateRef.current === "idle" || gameStateRef.current === "over") {
        startGame();
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const col = Math.floor(x / BLOCK_SIZE);
      const rowClicked = Math.floor(y / BLOCK_SIZE);
      if (col < 0 || col >= COLS) return;

      const columns = columnsRef.current;
      const colBlocks = columns[col];
      if (colBlocks.length === 0) return;

      // Map canvas row to block index
      const startRow = MAX_ROWS - colBlocks.length;
      const blockIdx = rowClicked - startRow;
      if (blockIdx < 0 || blockIdx >= colBlocks.length) return;

      const removed = colBlocks.splice(blockIdx, 1)[0];
      playMine();
      scoreRef.current += BLOCK_DEFS[removed.type].points;
      scoreDisplayRef.current = scoreRef.current;

      drawGame();
      forceRender((n) => n + 1);
    },
    [drawGame, startGame],
  );

  useEffect(() => {
    drawGame();
    return () => stopTimers();
  }, [drawGame, stopTimers]);

  const maxCol = maxColRef.current;
  const dangerPct = Math.min(100, Math.round((maxCol / MAX_ROWS) * 100));
  const isDanger = dangerPct >= 70;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* HUD */}
      <div className="flex items-center justify-between w-full max-w-[400px] px-1">
        <div className="flex items-center gap-2">
          <span
            style={{ fontFamily: "monospace", fontSize: 12, color: "#8B6914" }}
          >
            ⛏
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              color: "#FFD700",
              fontWeight: "bold",
            }}
          >
            SCORE: {scoreDisplayRef.current}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: isDanger ? "#E53935" : "#7a7a7a",
            }}
          >
            {isDanger ? "⚠ DANGER" : "HEIGHT"}
          </span>
          <div
            style={{
              width: 80,
              height: 10,
              background: "#2a1a0a",
              borderRadius: 3,
              border: "1px solid #3a2a1a",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${dangerPct}%`,
                height: "100%",
                background: isDanger ? "#E53935" : "#4CAF50",
                transition: "width 0.3s, background 0.3s",
                borderRadius: 2,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: isDanger ? "#E53935" : "#7a7a7a",
            }}
          >
            {dangerPct}%
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-[400px]">
        {(
          Object.entries(BLOCK_DEFS) as [
            BlockType,
            (typeof BLOCK_DEFS)[BlockType],
          ][]
        ).map(([type, def]) => (
          <div key={type} className="flex items-center gap-1">
            <div
              style={{
                width: 10,
                height: 10,
                background: def.color,
                border: "1px solid #00000044",
                flexShrink: 0,
              }}
            />
            <span
              style={{ fontFamily: "monospace", fontSize: 9, color: "#7a7a7a" }}
            >
              {def.points}pt
            </span>
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            handleClick(e as unknown as React.MouseEvent<HTMLCanvasElement>);
        }}
        tabIndex={0}
        data-ocid="block_miner.canvas_target"
        style={{
          cursor: "crosshair",
          border: "2px solid #3a2a1a",
          borderRadius: 4,
          display: "block",
          maxWidth: "100%",
        }}
      />
    </div>
  );
}
