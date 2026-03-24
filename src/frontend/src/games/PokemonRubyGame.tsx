import { useCallback, useEffect, useRef, useState } from "react";

interface Move {
  name: string;
  power: number;
  type: string;
}

interface Pokemon {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
  exp: number;
  moves: Move[];
  color: string;
}

type Phase = "overworld" | "battle" | "gameover";
type BattleAction = "menu" | "fight" | "item";

const TILE_SIZE = 32;
const COLS = 20;
const ROWS = 15;
const W = COLS * TILE_SIZE; // 640
const H = ROWS * TILE_SIZE; // 480

// Tile types
const T_GRASS = 0;
const T_TALL_GRASS = 1;
const T_PATH = 2;
const T_TREE = 3;
const T_WATER = 4;

// Hand-crafted map
const MAP: number[][] = [
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
  [3, 0, 1, 1, 0, 0, 0, 4, 4, 4, 0, 0, 0, 1, 1, 0, 0, 0, 0, 3],
  [3, 0, 1, 1, 0, 0, 0, 4, 4, 4, 0, 0, 0, 1, 1, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
  [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3],
  [3, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 3],
  [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3],
  [3, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 3],
  [3, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
];

function createPlayerPokemon(): Pokemon {
  return {
    name: "TORCHIC",
    hp: 35,
    maxHp: 35,
    attack: 10,
    defense: 7,
    level: 5,
    exp: 0,
    color: "#ff8c00",
    moves: [
      { name: "SCRATCH", power: 40, type: "Normal" },
      { name: "EMBER", power: 40, type: "Fire" },
    ],
  };
}

const WILD_POOL: Omit<Pokemon, "hp" | "level" | "exp">[] = [
  {
    name: "TORCHIC",
    maxHp: 35,
    attack: 10,
    defense: 7,
    color: "#ff8c00",
    moves: [
      { name: "SCRATCH", power: 40, type: "Normal" },
      { name: "GROWL", power: 0, type: "Normal" },
    ],
  },
  {
    name: "MUDKIP",
    maxHp: 40,
    attack: 9,
    defense: 9,
    color: "#5ab4e8",
    moves: [
      { name: "TACKLE", power: 35, type: "Normal" },
      { name: "WATER GUN", power: 40, type: "Water" },
    ],
  },
  {
    name: "TREECKO",
    maxHp: 30,
    attack: 11,
    defense: 6,
    color: "#48d84c",
    moves: [
      { name: "POUND", power: 40, type: "Normal" },
      { name: "ABSORB", power: 20, type: "Grass" },
    ],
  },
  {
    name: "ZIGZAGOON",
    maxHp: 33,
    attack: 8,
    defense: 8,
    color: "#a0784c",
    moves: [
      { name: "TACKLE", power: 35, type: "Normal" },
      { name: "GROWL", power: 0, type: "Normal" },
    ],
  },
  {
    name: "WURMPLE",
    maxHp: 28,
    attack: 7,
    defense: 6,
    color: "#e85050",
    moves: [
      { name: "TACKLE", power: 35, type: "Normal" },
      { name: "STRING SHOT", power: 0, type: "Bug" },
    ],
  },
  {
    name: "RALTS",
    maxHp: 25,
    attack: 10,
    defense: 5,
    color: "#f0f0f0",
    moves: [
      { name: "GROWL", power: 0, type: "Normal" },
      { name: "CONFUSION", power: 50, type: "Psychic" },
    ],
  },
];

function createWildPokemon(): Pokemon {
  const template = WILD_POOL[Math.floor(Math.random() * WILD_POOL.length)];
  const level = 2 + Math.floor(Math.random() * 7);
  const hpScale = 1 + (level - 1) * 0.1;
  const maxHp = Math.round(template.maxHp * hpScale);
  return { ...template, hp: maxHp, maxHp, level, exp: 0 };
}

// ─── Drawing helpers ───────────────────────────────────────────────────────────

function drawTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  type: number,
  tick: number,
) {
  const x = tx * TILE_SIZE;
  const y = ty * TILE_SIZE;
  const s = TILE_SIZE;

  switch (type) {
    case T_GRASS:
      ctx.fillStyle = "#3a8c3f";
      ctx.fillRect(x, y, s, s);
      break;
    case T_TALL_GRASS: {
      ctx.fillStyle = "#256e29";
      ctx.fillRect(x, y, s, s);
      // shimmer blades
      const phase = (tick * 0.05 + tx * 0.7 + ty * 1.3) % (Math.PI * 2);
      ctx.strokeStyle = `rgba(80,200,80,${0.3 + 0.2 * Math.sin(phase)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const bx = x + 4 + i * 7;
        ctx.beginPath();
        ctx.moveTo(bx, y + s);
        ctx.lineTo(bx + Math.sin(phase + i) * 3, y + 4);
        ctx.stroke();
      }
      break;
    }
    case T_PATH:
      ctx.fillStyle = "#c8a46e";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#b8945e";
      ctx.fillRect(x + 1, y + 1, s - 2, 2);
      break;
    case T_TREE:
      ctx.fillStyle = "#1e4a1e";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#2a6b2a";
      ctx.fillRect(x + 2, y + 2, s - 4, s - 8);
      ctx.fillStyle = "#5c3d11";
      ctx.fillRect(x + 10, y + s - 8, 12, 8);
      break;
    case T_WATER:
      ctx.fillStyle = "#1a6ba8";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = `rgba(100,200,255,${0.3 + 0.15 * Math.sin(tick * 0.04 + tx + ty)})`;
      ctx.fillRect(x + 2, y + 8, s - 4, 4);
      ctx.fillRect(x + 4, y + 18, s - 8, 4);
      break;
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  step: number,
) {
  const x = px;
  const y = py;
  const legBob = Math.floor(step / 6) % 2 === 0 ? 0 : 2;

  // Shoes
  ctx.fillStyle = "#222";
  ctx.fillRect(x + 7, y + 26 + legBob, 6, 4);
  ctx.fillRect(x + 17, y + 26 - legBob, 6, 4);

  // Pants
  ctx.fillStyle = "#2244aa";
  ctx.fillRect(x + 8, y + 20, 14, 8);

  // Shirt
  ctx.fillStyle = "#cc2200";
  ctx.fillRect(x + 7, y + 12, 16, 10);

  // Skin - face
  ctx.fillStyle = "#f5c88a";
  ctx.fillRect(x + 9, y + 5, 12, 10);

  // Eyes
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 11, y + 8, 2, 2);
  ctx.fillRect(x + 17, y + 8, 2, 2);

  // Cap
  ctx.fillStyle = "#cc2200";
  ctx.fillRect(x + 7, y + 2, 16, 6);
  ctx.fillRect(x + 5, y + 5, 20, 3);

  // Cap brim shadow
  ctx.fillStyle = "#991100";
  ctx.fillRect(x + 5, y + 7, 20, 2);

  // Hair
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 9, y + 8, 2, 4);
  ctx.fillRect(x + 19, y + 8, 2, 4);
}

function drawTorchic(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  back: boolean,
) {
  const s = size;
  // Body
  ctx.fillStyle = "#ff8c00";
  ctx.beginPath();
  ctx.ellipse(x + s * 0.5, y + s * 0.55, s * 0.35, s * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!back) {
    // Head
    ctx.fillStyle = "#ff9f2a";
    ctx.beginPath();
    ctx.arc(x + s * 0.5, y + s * 0.28, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.fillStyle = "#f5c842";
    ctx.beginPath();
    ctx.moveTo(x + s * 0.5, y + s * 0.32);
    ctx.lineTo(x + s * 0.38, y + s * 0.38);
    ctx.lineTo(x + s * 0.62, y + s * 0.38);
    ctx.closePath();
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(x + s * 0.38, y + s * 0.23, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + s * 0.62, y + s * 0.23, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Back view - just a round orange blob
    ctx.fillStyle = "#cc6600";
    ctx.beginPath();
    ctx.arc(x + s * 0.5, y + s * 0.35, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legs
  ctx.fillStyle = "#f5c842";
  ctx.fillRect(x + s * 0.35, y + s * 0.82, s * 0.12, s * 0.12);
  ctx.fillRect(x + s * 0.53, y + s * 0.82, s * 0.12, s * 0.12);
}

function drawMudkip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const s = size;
  ctx.fillStyle = "#5ab4e8";
  ctx.beginPath();
  ctx.ellipse(x + s * 0.5, y + s * 0.5, s * 0.35, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.arc(x + s * 0.5, y + s * 0.3, s * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Orange cheek fins
  ctx.fillStyle = "#ff8c44";
  ctx.beginPath();
  ctx.ellipse(
    x + s * 0.22,
    y + s * 0.28,
    s * 0.1,
    s * 0.18,
    -0.3,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    x + s * 0.78,
    y + s * 0.28,
    s * 0.1,
    s * 0.18,
    0.3,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + s * 0.38, y + s * 0.25, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.62, y + s * 0.25, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  // Tail
  ctx.fillStyle = "#5ab4e8";
  ctx.beginPath();
  ctx.moveTo(x + s * 0.82, y + s * 0.5);
  ctx.lineTo(x + s, y + s * 0.35);
  ctx.lineTo(x + s, y + s * 0.65);
  ctx.closePath();
  ctx.fill();
}

function drawTreecko(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const s = size;
  // Tail
  ctx.fillStyle = "#306030";
  ctx.beginPath();
  ctx.moveTo(x + s * 0.7, y + s * 0.7);
  ctx.lineTo(x + s, y + s * 0.9);
  ctx.lineTo(x + s * 0.8, y + s * 0.55);
  ctx.closePath();
  ctx.fill();
  // Body
  ctx.fillStyle = "#48d84c";
  ctx.fillRect(x + s * 0.3, y + s * 0.35, s * 0.4, s * 0.45);
  // Red belly
  ctx.fillStyle = "#e84040";
  ctx.fillRect(x + s * 0.35, y + s * 0.45, s * 0.3, s * 0.3);
  // Head
  ctx.fillStyle = "#48d84c";
  ctx.beginPath();
  ctx.arc(x + s * 0.5, y + s * 0.25, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.arc(x + s * 0.38, y + s * 0.22, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.62, y + s * 0.22, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + s * 0.38, y + s * 0.22, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.62, y + s * 0.22, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  // Limbs
  ctx.fillStyle = "#48d84c";
  ctx.fillRect(x + s * 0.15, y + s * 0.4, s * 0.15, s * 0.08);
  ctx.fillRect(x + s * 0.7, y + s * 0.4, s * 0.15, s * 0.08);
}

function drawZigzagoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const s = size;
  // Body - brown
  ctx.fillStyle = "#a0784c";
  ctx.beginPath();
  ctx.ellipse(x + s * 0.5, y + s * 0.55, s * 0.4, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  // White belly
  ctx.fillStyle = "#e8e0d0";
  ctx.beginPath();
  ctx.ellipse(x + s * 0.5, y + s * 0.6, s * 0.3, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = "#c09060";
  ctx.beginPath();
  ctx.arc(x + s * 0.25, y + s * 0.38, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Stripes
  ctx.fillStyle = "#704028";
  ctx.fillRect(x + s * 0.35, y + s * 0.45, s * 0.1, s * 0.25);
  ctx.fillRect(x + s * 0.55, y + s * 0.45, s * 0.1, s * 0.25);
  // Eyes
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + s * 0.2, y + s * 0.33, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  // Tail zigzag
  ctx.strokeStyle = "#a0784c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.88, y + s * 0.5);
  ctx.lineTo(x + s * 0.95, y + s * 0.4);
  ctx.lineTo(x + s, y + s * 0.5);
  ctx.stroke();
}

function drawWurmple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const s = size;
  const segments = 4;
  for (let i = 0; i < segments; i++) {
    const sx = x + s * 0.1 + i * (s * 0.22);
    ctx.fillStyle = i % 2 === 0 ? "#e85050" : "#e86868";
    ctx.beginPath();
    ctx.arc(sx, y + s * 0.55, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // yellow spikes on top
    if (i < 3) {
      ctx.fillStyle = "#f5d020";
      ctx.beginPath();
      ctx.moveTo(sx, y + s * 0.42);
      ctx.lineTo(sx - s * 0.05, y + s * 0.55);
      ctx.lineTo(sx + s * 0.05, y + s * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Head
  ctx.fillStyle = "#e85050";
  ctx.beginPath();
  ctx.arc(x + s * 0.18, y + s * 0.42, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + s * 0.13, y + s * 0.38, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.23, y + s * 0.38, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
}

function drawRalts(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const s = size;
  // Body white
  ctx.fillStyle = "#e8e8f0";
  ctx.fillRect(x + s * 0.35, y + s * 0.38, s * 0.3, s * 0.48);
  // Green helmet
  ctx.fillStyle = "#60c060";
  ctx.beginPath();
  ctx.arc(x + s * 0.5, y + s * 0.25, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + s * 0.28, y + s * 0.25, s * 0.44, s * 0.14);
  // Face
  ctx.fillStyle = "#f0ddd0";
  ctx.beginPath();
  ctx.arc(x + s * 0.5, y + s * 0.32, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  // Red eyes (hidden mostly by helmet)
  ctx.fillStyle = "#e84040";
  ctx.fillRect(x + s * 0.4, y + s * 0.28, s * 0.06, s * 0.05);
  ctx.fillRect(x + s * 0.54, y + s * 0.28, s * 0.06, s * 0.05);
  // Arm stubs
  ctx.fillStyle = "#e8e8f0";
  ctx.fillRect(x + s * 0.2, y + s * 0.44, s * 0.15, s * 0.08);
  ctx.fillRect(x + s * 0.65, y + s * 0.44, s * 0.15, s * 0.08);
  // Skirt
  ctx.fillStyle = "#d0d0e0";
  ctx.beginPath();
  ctx.moveTo(x + s * 0.28, y + s * 0.7);
  ctx.lineTo(x + s * 0.18, y + s * 0.92);
  ctx.lineTo(x + s * 0.82, y + s * 0.92);
  ctx.lineTo(x + s * 0.72, y + s * 0.7);
  ctx.closePath();
  ctx.fill();
}

function drawPokemon(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  back = false,
) {
  switch (name) {
    case "TORCHIC":
      drawTorchic(ctx, x, y, size, back);
      break;
    case "MUDKIP":
      drawMudkip(ctx, x, y, size);
      break;
    case "TREECKO":
      drawTreecko(ctx, x, y, size);
      break;
    case "ZIGZAGOON":
      drawZigzagoon(ctx, x, y, size);
      break;
    case "WURMPLE":
      drawWurmple(ctx, x, y, size);
      break;
    case "RALTS":
      drawRalts(ctx, x, y, size);
      break;
    default: {
      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function hpColor(pct: number): string {
  if (pct > 0.5) return "#48c840";
  if (pct > 0.25) return "#f8d030";
  return "#f82828";
}

function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  label: string,
) {
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, w, h);
  const filled = Math.max(0, Math.min(1, pct));
  ctx.fillStyle = hpColor(filled);
  ctx.fillRect(x + 1, y + 1, (w - 2) * filled, h - 2);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px monospace";
  ctx.fillText(label, x + w + 4, y + h - 1);
}

export default function PokemonRubyGame({
  onGameOver,
}: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    phase: "overworld" as Phase,
    playerX: 10,
    playerY: 7,
    // pixel position for smooth animation
    pixelX: 10 * TILE_SIZE,
    pixelY: 7 * TILE_SIZE,
    moving: false,
    targetX: 10 * TILE_SIZE,
    targetY: 7 * TILE_SIZE,
    stepCount: 0,
    battlesWon: 0,
    tick: 0,
    walkStep: 0,
    // battle state
    player: createPlayerPokemon(),
    enemy: null as Pokemon | null,
    battleAction: "menu" as BattleAction,
    battleText: [] as string[],
    textTimer: 0,
    battlePhase: "player" as "player" | "enemy" | "end",
    potions: 3,
    animatingHP: false,
    hpAnimTimer: 0,
    enemyHpAnim: 0,
    playerHpAnim: 0,
  });

  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const pushText = useCallback((text: string) => {
    const s = stateRef.current;
    s.battleText = [text];
    s.textTimer = 90;
  }, []);

  const startBattle = useCallback(() => {
    const s = stateRef.current;
    const wild = createWildPokemon();
    s.enemy = wild;
    s.phase = "battle";
    s.battleAction = "menu";
    s.battleText = [`Wild ${wild.name} appeared!`];
    s.textTimer = 90;
    s.battlePhase = "player";
    s.enemyHpAnim = wild.hp;
    s.playerHpAnim = s.player.hp;
  }, []);

  const doEnemyAttack = useCallback(() => {
    const s = stateRef.current;
    if (!s.enemy) return;
    const move =
      s.enemy.moves[Math.floor(Math.random() * s.enemy.moves.length)];
    if (move.power === 0) {
      pushText(`Wild ${s.enemy.name} used ${move.name}!`);
      s.battlePhase = "player";
      s.battleAction = "menu";
      return;
    }
    const variance = 0.85 + Math.random() * 0.3;
    const dmg = Math.max(
      1,
      Math.round(
        ((s.enemy.attack * move.power) / s.player.defense / 10) * variance,
      ),
    );
    s.player.hp = Math.max(0, s.player.hp - dmg);
    s.playerHpAnim = s.player.hp;
    pushText(`Wild ${s.enemy.name} used ${move.name}! (-${dmg} HP)`);
    if (s.player.hp === 0) {
      s.battlePhase = "end";
      setTimeout(() => {
        pushText(`${s.player.name} fainted!`);
        setTimeout(() => {
          onGameOver(s.battlesWon);
        }, 1500);
      }, 800);
    } else {
      s.battlePhase = "player";
      s.battleAction = "menu";
    }
  }, [pushText, onGameOver]);

  const handleBattleClick = useCallback(
    (bx: number, by: number) => {
      const s = stateRef.current;
      if (s.phase !== "battle") return;
      if (s.battlePhase !== "player") return;
      if (s.textTimer > 0) return;

      if (s.battleAction === "menu") {
        // FIGHT button: x=30,y=380 w=120 h=40
        if (bx >= 30 && bx <= 150 && by >= 380 && by <= 420) {
          s.battleAction = "fight";
          return;
        }
        // ITEM button: x=160,y=380 w=120 h=40
        if (bx >= 160 && bx <= 280 && by >= 380 && by <= 420) {
          s.battleAction = "item";
          return;
        }
        // RUN button: x=290,y=380 w=120 h=40
        if (bx >= 290 && bx <= 410 && by >= 380 && by <= 420) {
          const canRun =
            s.player.level >= (s.enemy?.level ?? 0) || Math.random() < 0.5;
          if (canRun) {
            pushText("Got away safely!");
            setTimeout(() => {
              s.phase = "overworld";
              s.enemy = null;
              s.battleAction = "menu";
            }, 1000);
          } else {
            pushText("Can't escape!");
            s.battlePhase = "enemy";
            setTimeout(() => doEnemyAttack(), 800);
          }
          return;
        }
      }

      if (s.battleAction === "fight") {
        // Move 1: x=30,y=340 w=180 h=35
        // Move 2: x=220,y=340 w=180 h=35
        let moveIdx = -1;
        if (bx >= 30 && bx <= 210 && by >= 340 && by <= 375) moveIdx = 0;
        if (bx >= 220 && bx <= 400 && by >= 340 && by <= 375) moveIdx = 1;
        if (moveIdx === -1) {
          s.battleAction = "menu";
          return;
        }

        const move = s.player.moves[moveIdx];
        if (!s.enemy) return;

        if (move.power === 0) {
          pushText(`${s.player.name} used ${move.name}!`);
          s.battlePhase = "enemy";
          setTimeout(() => doEnemyAttack(), 900);
          return;
        }

        const variance = 0.85 + Math.random() * 0.3;
        const dmg = Math.max(
          1,
          Math.round(
            ((s.player.attack * move.power) / s.enemy.defense / 10) * variance,
          ),
        );
        s.enemy.hp = Math.max(0, s.enemy.hp - dmg);
        s.enemyHpAnim = s.enemy.hp;
        pushText(`${s.player.name} used ${move.name}! (-${dmg} HP)`);
        s.battleAction = "menu";

        if (s.enemy.hp === 0) {
          s.battlePhase = "end";
          s.battlesWon++;
          const expGain = s.enemy.level * 3;
          s.player.exp += expGain;
          let extraText = `Wild ${s.enemy.name} fainted! +${expGain} EXP`;
          // Level up every 10 exp
          const newLevel = Math.floor(s.player.exp / 10) + 5;
          if (newLevel > s.player.level) {
            s.player.level = newLevel;
            s.player.maxHp = Math.round(35 * (1 + (newLevel - 5) * 0.15));
            s.player.hp = s.player.maxHp;
            s.player.attack = Math.round(10 * (1 + (newLevel - 5) * 0.1));
            s.player.defense = Math.round(7 * (1 + (newLevel - 5) * 0.1));
            extraText += ` | Lv.${newLevel}!`;
          }
          setTimeout(() => {
            pushText(extraText);
            setTimeout(() => {
              s.phase = "overworld";
              s.enemy = null;
              s.battleAction = "menu";
              s.battlePhase = "player";
            }, 1500);
          }, 600);
          return;
        }

        s.battlePhase = "enemy";
        setTimeout(() => doEnemyAttack(), 900);
      }

      if (s.battleAction === "item") {
        if (s.potions <= 0) {
          pushText("No potions left!");
          s.battleAction = "menu";
          return;
        }
        s.potions--;
        s.player.hp = s.player.maxHp;
        s.playerHpAnim = s.player.hp;
        pushText(`Used Potion! HP restored! (${s.potions} left)`);
        s.battleAction = "menu";
        s.battlePhase = "enemy";
        setTimeout(() => doEnemyAttack(), 900);
      }
    },
    [pushText, doEnemyAttack],
  );

  // Key handling
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Canvas click
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const bx = (e.clientX - rect.left) * scaleX;
      const by = (e.clientY - rect.top) * scaleY;
      handleBattleClick(bx, by);
    };
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, [handleBattleClick]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const s = stateRef.current;
      s.tick++;

      // ── OVERWORLD UPDATE ──
      if (s.phase === "overworld" && !s.moving) {
        const keys = keysRef.current;
        let dx = 0;
        let dy = 0;
        if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx = -1;
        else if (keys.has("ArrowRight") || keys.has("d") || keys.has("D"))
          dx = 1;
        else if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy = -1;
        else if (keys.has("ArrowDown") || keys.has("s") || keys.has("S"))
          dy = 1;

        if (dx !== 0 || dy !== 0) {
          const nx = s.playerX + dx;
          const ny = s.playerY + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
            const tile = MAP[ny][nx];
            if (tile !== T_TREE && tile !== T_WATER) {
              s.moving = true;
              s.targetX = nx * TILE_SIZE;
              s.targetY = ny * TILE_SIZE;
              s.playerX = nx;
              s.playerY = ny;
              s.stepCount++;
              s.walkStep++;
              // encounter check
              if (tile === T_TALL_GRASS && Math.random() < 0.3) {
                // delay battle start
                setTimeout(() => startBattle(), 400);
              }
            }
          }
        }
      }

      // smooth movement
      if (s.moving) {
        const speed = 6;
        const dx = s.targetX - s.pixelX;
        const dy = s.targetY - s.pixelY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= speed) {
          s.pixelX = s.targetX;
          s.pixelY = s.targetY;
          s.moving = false;
        } else {
          s.pixelX += (dx / dist) * speed;
          s.pixelY += (dy / dist) * speed;
        }
      }

      // battle text timer
      if (s.textTimer > 0) s.textTimer--;

      // ── DRAW ──
      ctx.clearRect(0, 0, W, H);

      if (s.phase === "overworld") {
        // Draw tiles
        for (let ty = 0; ty < ROWS; ty++) {
          for (let tx = 0; tx < COLS; tx++) {
            drawTile(ctx, tx, ty, MAP[ty][tx], s.tick);
          }
        }
        // Grid subtle lines
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 0.5;
        for (let tx = 0; tx <= COLS; tx++) {
          ctx.beginPath();
          ctx.moveTo(tx * TILE_SIZE, 0);
          ctx.lineTo(tx * TILE_SIZE, H);
          ctx.stroke();
        }
        for (let ty = 0; ty <= ROWS; ty++) {
          ctx.beginPath();
          ctx.moveTo(0, ty * TILE_SIZE);
          ctx.lineTo(W, ty * TILE_SIZE);
          ctx.stroke();
        }

        // Player
        drawPlayer(ctx, s.pixelX + 1, s.pixelY + 1, s.walkStep);

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, 24);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(
          `Steps: ${s.stepCount}   Battles Won: ${s.battlesWon}   Potions: ${s.potions}   ${s.player.name} Lv.${s.player.level}`,
          8,
          16,
        );
      }

      if (s.phase === "battle" && s.enemy) {
        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
        sky.addColorStop(0, "#b0c8f8");
        sky.addColorStop(1, "#8ab0e8");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H * 0.55);

        // Ground
        const gnd = ctx.createLinearGradient(0, H * 0.55, 0, H);
        gnd.addColorStop(0, "#88c050");
        gnd.addColorStop(1, "#5a8028");
        ctx.fillStyle = gnd;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);

        // Ground line
        ctx.strokeStyle = "#405020";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, H * 0.55);
        ctx.lineTo(W, H * 0.55);
        ctx.stroke();

        // Enemy platform
        ctx.fillStyle = "#a8d860";
        ctx.beginPath();
        ctx.ellipse(180, H * 0.45, 80, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Player platform
        ctx.fillStyle = "#70b030";
        ctx.beginPath();
        ctx.ellipse(460, H * 0.65, 90, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Enemy Pokemon (top-left area, front view)
        const ebounce = Math.sin(s.tick * 0.05) * 3;
        drawPokemon(ctx, s.enemy.name, 100, 120 + ebounce, 120);

        // Player Pokemon (bottom-right, back view, larger)
        drawPokemon(ctx, s.player.name, 360, 240, 150, true);

        // ── Enemy info box (top-right) ──
        ctx.fillStyle = "#f8f8e8";
        ctx.strokeStyle = "#404040";
        ctx.lineWidth = 2;
        const eBoxX = 310;
        const eBoxY = 30;
        ctx.fillRect(eBoxX, eBoxY, 310, 80);
        ctx.strokeRect(eBoxX, eBoxY, 310, 80);
        ctx.fillStyle = "#202020";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`${s.enemy.name}`, eBoxX + 10, eBoxY + 20);
        ctx.font = "12px monospace";
        ctx.fillText(`Lv.${s.enemy.level}`, eBoxX + 240, eBoxY + 20);
        ctx.font = "10px monospace";
        ctx.fillText("HP", eBoxX + 10, eBoxY + 42);
        drawHpBar(
          ctx,
          eBoxX + 30,
          eBoxY + 33,
          200,
          12,
          s.enemy.hp / s.enemy.maxHp,
          `${s.enemy.hp}/${s.enemy.maxHp}`,
        );

        // ── Player info box (bottom-right) ──
        ctx.fillStyle = "#f8f8e8";
        ctx.strokeStyle = "#404040";
        ctx.lineWidth = 2;
        const pBoxX = 310;
        const pBoxY = 280;
        ctx.fillRect(pBoxX, pBoxY, 310, 100);
        ctx.strokeRect(pBoxX, pBoxY, 310, 100);
        ctx.fillStyle = "#202020";
        ctx.font = "bold 14px monospace";
        ctx.fillText(s.player.name, pBoxX + 10, pBoxY + 20);
        ctx.font = "12px monospace";
        ctx.fillText(`Lv.${s.player.level}`, pBoxX + 240, pBoxY + 20);
        ctx.font = "10px monospace";
        ctx.fillText("HP", pBoxX + 10, pBoxY + 42);
        drawHpBar(
          ctx,
          pBoxX + 30,
          pBoxY + 33,
          200,
          12,
          s.player.hp / s.player.maxHp,
          `${s.player.hp}/${s.player.maxHp}`,
        );
        // EXP bar
        ctx.fillText("EXP", pBoxX + 10, pBoxY + 62);
        const expPct = (s.player.exp % 10) / 10;
        ctx.fillStyle = "#222";
        ctx.fillRect(pBoxX + 40, pBoxY + 53, 200, 8);
        ctx.fillStyle = "#58b8f8";
        ctx.fillRect(pBoxX + 41, pBoxY + 54, 198 * expPct, 6);
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        ctx.strokeRect(pBoxX + 40, pBoxY + 53, 200, 8);
        ctx.fillStyle = "#202020";
        ctx.font = "10px monospace";
        ctx.fillText(`Potions: ${s.potions}`, pBoxX + 10, pBoxY + 82);

        // ── Action menu (bottom-left) ──
        ctx.fillStyle = "#f8f8f0";
        ctx.strokeStyle = "#303030";
        ctx.lineWidth = 2;
        ctx.fillRect(10, 370, 430, 100);
        ctx.strokeRect(10, 370, 430, 100);

        if (s.battleAction === "menu") {
          // Text area
          ctx.fillStyle = "#202020";
          ctx.font = "13px monospace";
          const displayText = s.battleText[0] ?? "What will you do?";
          ctx.fillText(displayText, 20, 400);

          // Buttons
          const btns = ["FIGHT", "ITEM", "RUN"];
          btns.forEach((label, i) => {
            const bx = 30 + i * 130;
            const by = 415;
            ctx.fillStyle =
              i === 0 ? "#e83030" : i === 1 ? "#4888f0" : "#808080";
            ctx.fillRect(bx, by, 120, 40);
            ctx.strokeStyle = "#202020";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, by, 120, 40);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 13px monospace";
            ctx.fillText(label, bx + 35, by + 26);
          });
        } else if (s.battleAction === "fight") {
          ctx.fillStyle = "#202020";
          ctx.font = "bold 13px monospace";
          ctx.fillText("Choose a move:", 20, 395);
          s.player.moves.forEach((move, i) => {
            const mx = 30 + i * 190;
            const my = 405;
            const colors: Record<string, string> = {
              Fire: "#e86030",
              Water: "#4888f0",
              Grass: "#48c040",
              Psychic: "#e050b0",
              Bug: "#90c030",
              Normal: "#a0a0a0",
            };
            ctx.fillStyle = colors[move.type] ?? "#a0a0a0";
            ctx.fillRect(mx, my, 180, 35);
            ctx.strokeStyle = "#202020";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(mx, my, 180, 35);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 11px monospace";
            ctx.fillText(move.name, mx + 10, my + 15);
            ctx.font = "9px monospace";
            ctx.fillText(`PWR:${move.power} ${move.type}`, mx + 10, my + 28);
          });
          // Back hint
          ctx.fillStyle = "#606060";
          ctx.font = "10px monospace";
          ctx.fillText("[click elsewhere to go back]", 20, 465);
        } else if (s.battleAction === "item") {
          ctx.fillStyle = "#202020";
          ctx.font = "13px monospace";
          ctx.fillText(
            `Use Potion (${s.potions} left) — restores full HP`,
            20,
            400,
          );
        }

        // Text overlay when battle text showing
        if (s.textTimer > 0 && s.battleAction !== "fight") {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(10, 370, 430, 50);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 13px monospace";
          ctx.fillText(s.battleText[0] ?? "", 20, 400);
        }
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [startBattle]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: "block",
          imageRendering: "pixelated",
          maxWidth: "100%",
          border: "3px solid #cc220066",
          boxShadow: "0 0 24px #cc220044",
          cursor: stateRef.current.phase === "battle" ? "pointer" : "default",
        }}
      />
      <p className="font-mono text-xs text-muted-foreground text-center">
        WASD / Arrow Keys to move · Walk in tall grass for encounters · Click
        actions in battle
      </p>
    </div>
  );
}
