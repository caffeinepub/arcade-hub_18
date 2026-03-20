import { useEffect, useRef, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COAL: 4,
  IRON: 5,
  DIAMOND: 6,
  WOOD: 7,
  LEAVES: 8,
  BEDROCK: 9,
} as const;

const BLOCK_COLORS: Record<number, string> = {
  [BLOCK.GRASS]: "#5D8A2C",
  [BLOCK.DIRT]: "#8B5E3C",
  [BLOCK.STONE]: "#888888",
  [BLOCK.COAL]: "#3a3a3a",
  [BLOCK.IRON]: "#a07060",
  [BLOCK.DIAMOND]: "#4ae0d0",
  [BLOCK.WOOD]: "#6B4226",
  [BLOCK.LEAVES]: "#3a7a20",
  [BLOCK.BEDROCK]: "#333340",
};

const BLOCK_NAMES: Record<number, string> = {
  [BLOCK.GRASS]: "Grass",
  [BLOCK.DIRT]: "Dirt",
  [BLOCK.STONE]: "Stone",
  [BLOCK.COAL]: "Coal",
  [BLOCK.IRON]: "Iron",
  [BLOCK.DIAMOND]: "Diamond",
  [BLOCK.WOOD]: "Wood",
  [BLOCK.LEAVES]: "Leaves",
  [BLOCK.BEDROCK]: "Bedrock",
};

const BLOCK_HARDNESS: Record<number, number> = {
  [BLOCK.GRASS]: 20,
  [BLOCK.DIRT]: 15,
  [BLOCK.STONE]: 35,
  [BLOCK.COAL]: 40,
  [BLOCK.IRON]: 45,
  [BLOCK.DIAMOND]: 60,
  [BLOCK.WOOD]: 25,
  [BLOCK.LEAVES]: 8,
  [BLOCK.BEDROCK]: 9999,
};

const TILE = 32;
const WORLD_W = 200;
const WORLD_H = 64;
const CANVAS_W = 800;
const CANVAS_H = 500;
const GRAVITY = 0.5;
const JUMP_FORCE = -11;
const PLAYER_SPEED = 3.5;
const DAY_DURATION = 36000;

type BiomeType = "PLAINS" | "FOREST" | "HILLS";

interface Creeper {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  exploding: boolean;
  explodeTimer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateWorld(seed: number): Uint8Array {
  const rand = seededRand(seed);
  const world = new Uint8Array(WORLD_W * WORLD_H);

  // --- Biome zones ---
  const biomes: BiomeType[] = [];
  const biomeTypes: BiomeType[] = ["PLAINS", "FOREST", "HILLS"];
  let bx = 0;
  while (bx < WORLD_W) {
    const zoneWidth = Math.floor(rand() * 21) + 30; // 30-50
    const biomeChoice = biomeTypes[Math.floor(rand() * 3)];
    for (let i = 0; i < zoneWidth && bx + i < WORLD_W; i++) {
      biomes[bx + i] = biomeChoice;
    }
    bx += zoneWidth;
  }
  // Fill any remaining
  for (let i = bx; i < WORLD_W; i++) biomes[i] = "PLAINS";

  // --- Hill heightmap using multi-octave sine noise ---
  const heights: number[] = [];
  for (let x = 0; x < WORLD_W; x++) {
    let h =
      30 +
      Math.sin(x * 0.03) * 8 +
      Math.sin(x * 0.07 + 1.5) * 4 +
      Math.sin(x * 0.15 + 3) * 2 +
      rand() * 1.5 -
      0.75;
    h = Math.max(14, Math.min(46, h));
    heights.push(Math.floor(h));
  }

  // --- Fill blocks with biome-aware dirt depth ---
  for (let x = 0; x < WORLD_W; x++) {
    const surfaceY = heights[x];
    const biome = biomes[x];
    const dirtDepth = biome === "HILLS" ? 2 : biome === "FOREST" ? 5 : 3;

    for (let y = 0; y < WORLD_H; y++) {
      const idx = y * WORLD_W + x;
      if (y >= WORLD_H - 2) {
        world[idx] = BLOCK.BEDROCK;
      } else if (y === surfaceY) {
        world[idx] = BLOCK.GRASS;
      } else if (y > surfaceY && y <= surfaceY + dirtDepth) {
        world[idx] = BLOCK.DIRT;
      } else if (y > surfaceY + dirtDepth) {
        const r = rand();
        const depth = y - surfaceY;
        if (depth > 20 && r < 0.015) {
          world[idx] = BLOCK.DIAMOND;
        } else if (depth > 10 && r < 0.04) {
          world[idx] = BLOCK.IRON;
        } else if (r < 0.07) {
          world[idx] = BLOCK.COAL;
        } else {
          world[idx] = BLOCK.STONE;
        }
      }
    }
  }

  // --- Cave worms ---
  const numWorms = Math.floor(rand() * 5) + 12; // 12-16
  for (let w = 0; w < numWorms; w++) {
    const startX = Math.floor(rand() * (WORLD_W - 20)) + 10;
    const surfY = heights[startX];
    const startY = Math.floor(rand() * (WORLD_H - 8 - (surfY + 8))) + surfY + 8;
    const steps = Math.floor(rand() * 41) + 60; // 60-100
    let wx = startX;
    let wy = startY;
    let angle = rand() * Math.PI * 2;

    for (let step = 0; step < steps; step++) {
      angle += (rand() - 0.5) * 0.4;
      wx += Math.cos(angle) * 1.2;
      wy += Math.sin(angle) * 0.8;

      const radius = Math.floor(rand() * 2) + 2; // 2-3
      const iwx = Math.round(wx);
      const iwy = Math.round(wy);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const cx = iwx + dx;
          const cy = iwy + dy;
          if (cx < 0 || cx >= WORLD_W || cy < 0 || cy >= WORLD_H) continue;
          // Never carve bedrock (bottom 2 rows) or too close to surface
          if (cy >= WORLD_H - 2) continue;
          if (cy < heights[Math.min(Math.max(cx, 0), WORLD_W - 1)] - 2)
            continue;
          if (world[cy * WORLD_W + cx] !== BLOCK.BEDROCK) {
            world[cy * WORLD_W + cx] = BLOCK.AIR;
          }
        }
      }
    }
  }

  // --- Forest tree placement ---
  const lastTreeAt: number[] = new Array(WORLD_W).fill(-99);
  for (let x = 3; x < WORLD_W - 3; x++) {
    const biome = biomes[x];
    const treeChance =
      biome === "FOREST" ? 0.25 : biome === "HILLS" ? 0.06 : 0.03;

    if (rand() >= treeChance) continue;

    // Ensure trees are spaced at least 3 blocks apart
    const tooClose = lastTreeAt[x] >= x - 3;
    if (tooClose) continue;
    // Also check neighbors
    let neighborHasTree = false;
    for (let nx = x - 3; nx <= x + 3; nx++) {
      if (nx !== x && nx >= 0 && nx < WORLD_W && lastTreeAt[nx] === nx) {
        neighborHasTree = true;
        break;
      }
    }
    if (neighborHasTree) continue;

    const base = heights[x];
    // Make sure surface is solid
    if (world[base * WORLD_W + x] !== BLOCK.GRASS) continue;

    if (biome === "FOREST") {
      // Tall forest tree: trunk 6-8, canopy radius 3
      const trunkH = Math.floor(rand() * 3) + 6;
      for (let ty = base - trunkH; ty < base; ty++) {
        if (ty >= 0) world[ty * WORLD_W + x] = BLOCK.WOOD;
      }
      const canopyBase = base - trunkH;
      // 3 canopy layers: wide at bottom, narrow at top
      for (let ly = canopyBase - 2; ly <= canopyBase + 1; ly++) {
        const layerR = ly <= canopyBase - 1 ? 3 : 2;
        for (let lx = x - layerR; lx <= x + layerR; lx++) {
          if (lx >= 0 && lx < WORLD_W && ly >= 0) {
            const li = ly * WORLD_W + lx;
            if (world[li] === BLOCK.AIR) world[li] = BLOCK.LEAVES;
          }
        }
      }
      // Top cap
      for (let lx = x - 1; lx <= x + 1; lx++) {
        const ly = canopyBase - 3;
        if (lx >= 0 && lx < WORLD_W && ly >= 0) {
          const li = ly * WORLD_W + lx;
          if (world[li] === BLOCK.AIR) world[li] = BLOCK.LEAVES;
        }
      }
    } else {
      // Plains/hills tree: trunk 4-5, small canopy
      const trunkH = Math.floor(rand() * 2) + 4;
      for (let ty = base - trunkH; ty < base; ty++) {
        if (ty >= 0) world[ty * WORLD_W + x] = BLOCK.WOOD;
      }
      const canopyBase = base - trunkH;
      for (let ly = canopyBase - 1; ly <= canopyBase; ly++) {
        for (let lx = x - 2; lx <= x + 2; lx++) {
          if (lx >= 0 && lx < WORLD_W && ly >= 0) {
            const li = ly * WORLD_W + lx;
            if (world[li] === BLOCK.AIR) world[li] = BLOCK.LEAVES;
          }
        }
      }
      // Top single
      if (canopyBase - 2 >= 0) {
        const li = (canopyBase - 2) * WORLD_W + x;
        if (world[li] === BLOCK.AIR) world[li] = BLOCK.LEAVES;
      }
    }
    lastTreeAt[x] = x;
  }

  return world;
}

function getBlock(world: Uint8Array, tx: number, ty: number): number {
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return BLOCK.AIR;
  return world[ty * WORLD_W + tx];
}

function setBlock(world: Uint8Array, tx: number, ty: number, val: number) {
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return;
  world[ty * WORLD_W + tx] = val;
}

function isSolid(b: number): boolean {
  return b !== BLOCK.AIR && b !== BLOCK.LEAVES;
}

function moveEntity(
  world: Uint8Array,
  ex: number,
  ey: number,
  evx: number,
  evy: number,
  ew: number,
  eh: number,
): { x: number; y: number; vx: number; vy: number; onGround: boolean } {
  let x = ex;
  let y = ey;
  let vx = evx;
  let vy = evy;
  let onGround = false;

  x += vx;
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + ew - 1) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + eh - 1) / TILE);
  for (let ty = top; ty <= bottom; ty++) {
    if (vx > 0 && isSolid(getBlock(world, right, ty))) {
      x = right * TILE - ew;
      vx = 0;
    } else if (vx < 0 && isSolid(getBlock(world, left, ty))) {
      x = (left + 1) * TILE;
      vx = 0;
    }
  }

  y += vy;
  const left2 = Math.floor(x / TILE);
  const right2 = Math.floor((x + ew - 1) / TILE);
  const top2 = Math.floor(y / TILE);
  const bottom2 = Math.floor((y + eh - 1) / TILE);
  for (let tx = left2; tx <= right2; tx++) {
    if (vy > 0 && isSolid(getBlock(world, tx, bottom2))) {
      y = bottom2 * TILE - eh;
      vy = 0;
      onGround = true;
    } else if (vy < 0 && isSolid(getBlock(world, tx, top2))) {
      y = (top2 + 1) * TILE;
      vy = 0;
    }
  }

  x = Math.max(0, Math.min(x, (WORLD_W - 1) * TILE));
  return { x, y, vx, vy, onGround };
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  type: number,
) {
  const base = BLOCK_COLORS[type] || "#888";
  ctx.fillStyle = base;
  ctx.fillRect(bx, by, TILE, TILE);

  if (type === BLOCK.GRASS) {
    ctx.fillStyle = "#4a7520";
    ctx.fillRect(bx, by, TILE, 6);
    ctx.fillStyle = "#6aaa30";
    ctx.fillRect(bx + 4, by - 2, 3, 4);
    ctx.fillRect(bx + 10, by - 3, 2, 5);
    ctx.fillRect(bx + 18, by - 2, 3, 4);
    ctx.fillRect(bx + 25, by - 3, 2, 5);
  } else if (type === BLOCK.COAL) {
    ctx.fillStyle = "#111";
    ctx.fillRect(bx + 8, by + 8, 6, 6);
    ctx.fillRect(bx + 18, by + 16, 5, 5);
  } else if (type === BLOCK.IRON) {
    ctx.fillStyle = "#c0885a";
    ctx.fillRect(bx + 6, by + 6, 8, 8);
    ctx.fillRect(bx + 18, by + 14, 6, 6);
  } else if (type === BLOCK.DIAMOND) {
    ctx.fillStyle = "#00f0e0";
    ctx.fillRect(bx + 4, by + 8, 8, 8);
    ctx.fillRect(bx + 18, by + 12, 7, 7);
    ctx.fillStyle = "#ffffff88";
    ctx.fillRect(bx + 6, by + 10, 2, 2);
  } else if (type === BLOCK.WOOD) {
    ctx.fillStyle = "#4a2a10";
    ctx.fillRect(bx + 6, by + 6, TILE - 12, TILE - 12);
    ctx.fillStyle = "#7a4a20";
    ctx.fillRect(bx + 10, by + 10, TILE - 20, TILE - 20);
    ctx.strokeStyle = "#5a3218";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 2, by + 4);
    ctx.lineTo(bx + 2, by + TILE - 4);
    ctx.moveTo(bx + 28, by + 4);
    ctx.lineTo(bx + 28, by + TILE - 4);
    ctx.stroke();
  } else if (type === BLOCK.STONE) {
    ctx.fillStyle = "#707070";
    ctx.fillRect(bx + 2, by + 2, 13, 13);
    ctx.fillRect(bx + 17, by + 17, 13, 13);
  } else if (type === BLOCK.BEDROCK) {
    ctx.fillStyle = "#404050";
    ctx.fillRect(bx + 4, by + 4, 8, 8);
    ctx.fillRect(bx + 18, by + 10, 6, 6);
    ctx.fillRect(bx + 8, by + 20, 10, 6);
  } else if (type === BLOCK.LEAVES) {
    ctx.fillStyle = "#2a6010";
    ctx.fillRect(bx + 4, by + 4, 6, 6);
    ctx.fillRect(bx + 14, by + 2, 8, 6);
    ctx.fillRect(bx + 2, by + 16, 10, 6);
    ctx.fillRect(bx + 16, by + 18, 8, 6);
  } else if (type === BLOCK.DIRT) {
    ctx.fillStyle = "#6a3a1a";
    ctx.fillRect(bx + 3, by + 5, 5, 5);
    ctx.fillRect(bx + 18, by + 14, 6, 4);
    ctx.fillRect(bx + 8, by + 22, 4, 5);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, TILE - 1, TILE - 1);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  frame: number,
  invincible: boolean,
) {
  if (invincible && Math.floor(frame / 4) % 2 === 0) return;
  const x = Math.floor(screenX);
  const y = Math.floor(screenY);
  const legSwing = Math.sin(frame * 0.2) * 4;
  ctx.fillStyle = "#4a6daf";
  ctx.fillRect(x + 8, y + 22, 7, 10);
  ctx.fillRect(x + 17, y + 22, 7, 10);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(x + 7 + legSwing, y + 30, 8, 4);
  ctx.fillRect(x + 17 - legSwing, y + 30, 8, 4);
  ctx.fillStyle = "#4a8a2a";
  ctx.fillRect(x + 6, y + 12, 20, 12);
  ctx.fillStyle = "#f0c090";
  ctx.fillRect(x + 2, y + 13, 5, 10);
  ctx.fillRect(x + 25, y + 13, 5, 10);
  ctx.fillStyle = "#f0c090";
  ctx.fillRect(x + 7, y + 2, 18, 12);
  ctx.fillStyle = "#5a3210";
  ctx.fillRect(x + 7, y + 2, 18, 4);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 10, y + 7, 4, 4);
  ctx.fillRect(x + 18, y + 7, 4, 4);
  ctx.fillStyle = "#303080";
  ctx.fillRect(x + 11, y + 8, 2, 2);
  ctx.fillRect(x + 19, y + 8, 2, 2);
}

function drawCreeper(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  exploding: boolean,
  explodeTimer: number,
) {
  const x = Math.floor(screenX);
  const y = Math.floor(screenY);
  const flash = exploding && Math.floor(explodeTimer / 3) % 2 === 0;
  const bodyColor = flash ? "#ffffff" : "#3d8b3d";
  const darkColor = flash ? "#cccccc" : "#2a5a2a";
  const faceColor = flash ? "#ffffff" : "#1a2e1a";
  ctx.fillStyle = darkColor;
  ctx.fillRect(x + 6, y + 22, 7, 10);
  ctx.fillRect(x + 19, y + 22, 7, 10);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 4, y + 12, 24, 12);
  ctx.fillRect(x + 4, y + 1, 24, 13);
  ctx.fillStyle = faceColor;
  ctx.fillRect(x + 8, y + 4, 5, 4);
  ctx.fillRect(x + 19, y + 4, 5, 4);
  ctx.fillRect(x + 11, y + 9, 3, 4);
  ctx.fillRect(x + 8, y + 11, 4, 3);
  ctx.fillRect(x + 20, y + 11, 4, 3);
}

function getSkyColor(dayTime: number) {
  const t = (dayTime % DAY_DURATION) / DAY_DURATION;
  const nightness = Math.sin(t * Math.PI);
  if (nightness < 0.5) {
    const n = nightness / 0.5;
    const r = Math.floor(135 * (1 - n) + 10 * n);
    const g = Math.floor(206 * (1 - n) + 10 * n);
    const b = Math.floor(235 * (1 - n) + 26 * n);
    return { r, g, b, nightness };
  }
  const n = (nightness - 0.5) / 0.5;
  const r = Math.floor(10 * (1 - n) + 135 * n);
  const g = Math.floor(10 * (1 - n) + 206 * n);
  const b = Math.floor(26 * (1 - n) + 235 * n);
  return { r, g, b, nightness };
}

export default function MinecraftGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    world: Uint8Array;
    px: number;
    py: number;
    pvx: number;
    pvy: number;
    onGround: boolean;
    health: number;
    score: number;
    hotbar: { block: number; count: number }[];
    selectedSlot: number;
    cameraX: number;
    dayTime: number;
    creepers: Creeper[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    keys: Set<string>;
    mouseDown: boolean;
    mouseCanvasX: number;
    mouseCanvasY: number;
    miningTarget: { tx: number; ty: number; progress: number } | null;
    dead: boolean;
    frame: number;
    stars: { x: number; y: number; r: number }[];
    creeperSpawnTimer: number;
    invincibleTimer: number;
  } | null>(null);
  const animRef = useRef<number>(0);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const world = generateWorld(Date.now());
    let spawnY = 0;
    for (let y = 0; y < WORLD_H; y++) {
      if (getBlock(world, 100, y) !== BLOCK.AIR) {
        spawnY = y - 1;
        break;
      }
    }

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * (CANVAS_H * 0.6),
      r: Math.random() * 1.5 + 0.5,
    }));

    stateRef.current = {
      world,
      px: 100 * TILE,
      py: spawnY * TILE,
      pvx: 0,
      pvy: 0,
      onGround: false,
      health: 10,
      score: 0,
      hotbar: [
        { block: BLOCK.DIRT, count: 20 },
        { block: BLOCK.STONE, count: 10 },
        { block: BLOCK.WOOD, count: 5 },
        { block: BLOCK.LEAVES, count: 15 },
        { block: BLOCK.GRASS, count: 5 },
        { block: BLOCK.AIR, count: 0 },
        { block: BLOCK.AIR, count: 0 },
        { block: BLOCK.AIR, count: 0 },
        { block: BLOCK.AIR, count: 0 },
      ],
      selectedSlot: 0,
      cameraX: 0,
      dayTime: 0,
      creepers: [],
      particles: [],
      floatingTexts: [],
      keys: new Set(),
      mouseDown: false,
      mouseCanvasX: 0,
      mouseCanvasY: 0,
      miningTarget: null,
      dead: false,
      frame: 0,
      stars,
      creeperSpawnTimer: 0,
      invincibleTimer: 0,
    };

    function spawnExplosionParticles(wx: number, wy: number) {
      const s = stateRef.current;
      if (!s) return;
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        s.particles.push({
          x: wx,
          y: wy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 40 + Math.random() * 20,
          maxLife: 60,
          color: Math.random() > 0.5 ? "#5a8a30" : "#3a6a18",
          size: Math.random() * 5 + 2,
        });
      }
    }

    function spawnBlockParticles(wx: number, wy: number, color: string) {
      const s = stateRef.current;
      if (!s) return;
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        s.particles.push({
          x: wx,
          y: wy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 20 + Math.random() * 15,
          maxLife: 35,
          color,
          size: Math.random() * 4 + 2,
        });
      }
    }

    function gameLoop() {
      const s = stateRef.current;
      if (!s || !canvas || !ctx) return;

      s.frame++;
      s.dayTime = (s.dayTime + 1) % DAY_DURATION;
      const isNight =
        s.dayTime / DAY_DURATION > 0.25 && s.dayTime / DAY_DURATION < 0.75;

      if (!s.dead) {
        let vx = 0;
        if (s.keys.has("ArrowLeft") || s.keys.has("a") || s.keys.has("A"))
          vx -= PLAYER_SPEED;
        if (s.keys.has("ArrowRight") || s.keys.has("d") || s.keys.has("D"))
          vx += PLAYER_SPEED;
        if (
          s.onGround &&
          (s.keys.has("ArrowUp") ||
            s.keys.has("w") ||
            s.keys.has("W") ||
            s.keys.has(" "))
        ) {
          s.pvy = JUMP_FORCE;
        }
        s.pvx = vx;
        s.pvy = Math.min(s.pvy + GRAVITY, 15);

        const result = moveEntity(
          s.world,
          s.px,
          s.py,
          s.pvx,
          s.pvy,
          TILE - 2,
          TILE * 2 - 2,
        );
        s.px = result.x;
        s.py = result.y;
        s.pvx = result.vx;
        s.pvy = result.vy;
        s.onGround = result.onGround;

        if (s.py > WORLD_H * TILE) {
          s.health = Math.max(0, s.health - 2);
          let fallY = 0;
          for (let y = 0; y < WORLD_H; y++) {
            if (getBlock(s.world, 100, y) !== BLOCK.AIR) {
              fallY = (y - 2) * TILE;
              break;
            }
          }
          s.px = 100 * TILE;
          s.py = fallY;
          s.pvy = 0;
        }

        if (s.mouseDown) {
          const worldMouseX = s.mouseCanvasX + s.cameraX;
          const worldMouseY = s.mouseCanvasY;
          const tx = Math.floor(worldMouseX / TILE);
          const ty = Math.floor(worldMouseY / TILE);
          const playerTX = Math.floor(s.px / TILE);
          const playerTY = Math.floor(s.py / TILE);
          const dist = Math.abs(tx - playerTX) + Math.abs(ty - playerTY);
          if (dist <= 5 && getBlock(s.world, tx, ty) !== BLOCK.AIR) {
            if (
              s.miningTarget &&
              s.miningTarget.tx === tx &&
              s.miningTarget.ty === ty
            ) {
              s.miningTarget.progress++;
              const hardness = BLOCK_HARDNESS[getBlock(s.world, tx, ty)] || 30;
              if (s.miningTarget.progress >= hardness) {
                const blockType = getBlock(s.world, tx, ty);
                if (blockType !== BLOCK.BEDROCK) {
                  setBlock(s.world, tx, ty, BLOCK.AIR);
                  s.score++;
                  spawnBlockParticles(
                    tx * TILE + TILE / 2 - s.cameraX,
                    ty * TILE + TILE / 2,
                    BLOCK_COLORS[blockType] || "#888",
                  );
                  s.floatingTexts.push({
                    x: tx * TILE - s.cameraX,
                    y: ty * TILE,
                    text: `+1 ${BLOCK_NAMES[blockType] || ""}`,
                    life: 40,
                    color:
                      blockType === BLOCK.DIAMOND
                        ? "#4ae0d0"
                        : blockType === BLOCK.IRON
                          ? "#c09060"
                          : blockType === BLOCK.COAL
                            ? "#aaa"
                            : "#fff",
                  });
                  const slot = s.hotbar.find(
                    (sl) => sl.block === blockType && sl.count > 0,
                  );
                  if (slot) {
                    slot.count++;
                  } else {
                    const empty = s.hotbar.find((sl) => sl.count === 0);
                    if (empty) {
                      empty.block = blockType;
                      empty.count = 1;
                    }
                  }
                  s.miningTarget = null;
                }
              }
            } else {
              s.miningTarget = { tx, ty, progress: 0 };
            }
          } else {
            s.miningTarget = null;
          }
        } else {
          s.miningTarget = null;
        }

        const targetCamX = s.px - CANVAS_W / 2 + TILE;
        s.cameraX += (targetCamX - s.cameraX) * 0.1;
        s.cameraX = Math.max(0, Math.min(s.cameraX, WORLD_W * TILE - CANVAS_W));

        if (isNight) {
          s.creeperSpawnTimer++;
          if (s.creeperSpawnTimer > 300 && s.creepers.length < 6) {
            s.creeperSpawnTimer = 0;
            const side = Math.random() > 0.5 ? 1 : -1;
            const spawnX = Math.max(
              0,
              Math.min(s.px + side * (CANVAS_W * 0.6), (WORLD_W - 1) * TILE),
            );
            let cSpawnY = 0;
            const cTX = Math.floor(spawnX / TILE);
            for (let y = 0; y < WORLD_H; y++) {
              if (getBlock(s.world, cTX, y) !== BLOCK.AIR) {
                cSpawnY = (y - 2) * TILE;
                break;
              }
            }
            s.creepers.push({
              x: spawnX,
              y: cSpawnY,
              vx: 0,
              vy: 0,
              onGround: false,
              exploding: false,
              explodeTimer: 0,
            });
          }
        } else {
          s.creepers = s.creepers.filter((c) => c.exploding);
        }

        s.creepers = s.creepers.filter((creeper) => {
          if (creeper.exploding) {
            creeper.explodeTimer++;
            if (creeper.explodeTimer > 60) {
              spawnExplosionParticles(
                creeper.x + TILE / 2 - s.cameraX,
                creeper.y + TILE,
              );
              const dx = creeper.x - s.px;
              const dy = creeper.y - s.py;
              if (
                Math.sqrt(dx * dx + dy * dy) < TILE * 4 &&
                s.invincibleTimer <= 0
              ) {
                s.health = Math.max(0, s.health - 3);
                s.invincibleTimer = 120;
              }
              const cx = Math.floor((creeper.x + TILE / 2) / TILE);
              const cy = Math.floor((creeper.y + TILE) / TILE);
              for (let dx2 = -2; dx2 <= 2; dx2++) {
                for (let dy2 = -2; dy2 <= 2; dy2++) {
                  if (getBlock(s.world, cx + dx2, cy + dy2) !== BLOCK.BEDROCK) {
                    setBlock(s.world, cx + dx2, cy + dy2, BLOCK.AIR);
                  }
                }
              }
              return false;
            }
            return true;
          }

          const dx = s.px - creeper.x;
          creeper.vx = Math.abs(dx) > 2 ? (dx > 0 ? 1.5 : -1.5) : 0;
          if (creeper.onGround) {
            const ahead = Math.floor(
              (creeper.x + (dx > 0 ? TILE + 4 : -4)) / TILE,
            );
            const cTY = Math.floor((creeper.y + TILE * 2 - 4) / TILE);
            if (isSolid(getBlock(s.world, ahead, cTY)))
              creeper.vy = JUMP_FORCE * 0.8;
          }
          creeper.vy = Math.min(creeper.vy + GRAVITY, 15);
          const cr = moveEntity(
            s.world,
            creeper.x,
            creeper.y,
            creeper.vx,
            creeper.vy,
            TILE - 4,
            TILE * 2 - 4,
          );
          creeper.x = cr.x;
          creeper.y = cr.y;
          creeper.vx = cr.vx;
          creeper.vy = cr.vy;
          creeper.onGround = cr.onGround;

          const pdx = s.px + TILE / 2 - (creeper.x + TILE / 2);
          const pdy = s.py + TILE - (creeper.y + TILE);
          if (Math.sqrt(pdx * pdx + pdy * pdy) < TILE * 1.5) {
            creeper.exploding = true;
            creeper.explodeTimer = 0;
          }
          return true;
        });

        if (s.invincibleTimer > 0) s.invincibleTimer--;
        if (s.health <= 0 && !s.dead) {
          s.dead = true;
          setDead(true);
        }
      }

      s.particles = s.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        return p.life > 0;
      });
      s.floatingTexts = s.floatingTexts.filter((ft) => {
        ft.y -= 0.5;
        ft.life--;
        return ft.life > 0;
      });

      // --- RENDER ---
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const sky = getSkyColor(s.dayTime);
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      gradient.addColorStop(
        0,
        `rgb(${sky.r - 20},${sky.g - 20},${sky.b - 10})`,
      );
      gradient.addColorStop(1, `rgb(${sky.r},${sky.g},${sky.b})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (sky.nightness > 0.3) {
        const alpha = Math.min(1, (sky.nightness - 0.3) / 0.4);
        for (const star of s.stars) {
          ctx.fillStyle = `rgba(255,255,255,${alpha * (0.5 + Math.sin(s.frame * 0.05 + star.x) * 0.2)})`;
          ctx.fillRect(star.x, star.y, star.r * 2, star.r * 2);
        }
      }

      const camTX = Math.floor(s.cameraX / TILE);
      const visW = Math.ceil(CANVAS_W / TILE) + 2;
      const visH = Math.ceil(CANVAS_H / TILE) + 2;
      for (let ty = 0; ty < visH; ty++) {
        for (let tx = camTX; tx < camTX + visW; tx++) {
          const b = getBlock(s.world, tx, ty);
          if (b !== BLOCK.AIR) {
            drawBlock(ctx, tx * TILE - Math.floor(s.cameraX), ty * TILE, b);
          }
        }
      }

      if (s.miningTarget) {
        const { tx, ty, progress } = s.miningTarget;
        const hardness = BLOCK_HARDNESS[getBlock(s.world, tx, ty)] || 30;
        const frac = progress / hardness;
        const bx = tx * TILE - Math.floor(s.cameraX);
        const by = ty * TILE;
        ctx.fillStyle = `rgba(0,0,0,${frac * 0.6})`;
        ctx.fillRect(bx, by, TILE, TILE);
        ctx.strokeStyle = `rgba(0,0,0,${frac})`;
        ctx.lineWidth = 1;
        const numLines = Math.floor(frac * 5);
        for (let i = 0; i < numLines; i++) {
          ctx.beginPath();
          ctx.moveTo(bx + 4 + i * 5, by + 4);
          ctx.lineTo(bx + 7 + i * 5, by + TILE - 4);
          ctx.stroke();
        }
      }

      for (const creeper of s.creepers) {
        const sx = creeper.x - s.cameraX;
        if (sx > -TILE * 2 && sx < CANVAS_W + TILE * 2) {
          drawCreeper(
            ctx,
            sx,
            creeper.y,
            creeper.exploding,
            creeper.explodeTimer,
          );
        }
      }

      if (!s.dead) {
        drawPlayer(ctx, s.px - s.cameraX, s.py, s.frame, s.invincibleTimer > 0);
      }

      for (const p of s.particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      for (const ft of s.floatingTexts) {
        ctx.globalAlpha = ft.life / 40;
        ctx.fillStyle = ft.color;
        ctx.font = "bold 12px monospace";
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, 180, 28);
      for (let i = 0; i < 10; i++) {
        const hx = 8 + i * 17;
        ctx.fillStyle = i < s.health ? "#e02020" : "#500";
        ctx.fillRect(hx, 6, 14, 14);
        if (i < s.health) {
          ctx.fillStyle = "#ff6060";
          ctx.fillRect(hx + 2, 8, 4, 4);
        }
      }

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(CANVAS_W - 130, 0, 130, 28);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`Blocks: ${s.score}`, CANVAS_W - 125, 18);

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(CANVAS_W / 2 - 50, 0, 100, 22);
      ctx.fillStyle = isNight ? "#aaaaff" : "#ffffaa";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(isNight ? "NIGHT" : "DAY", CANVAS_W / 2, 15);
      ctx.textAlign = "left";

      // Hotbar
      const hotbarY = CANVAS_H - 52;
      const hotbarX = CANVAS_W / 2 - (9 * 46) / 2;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(hotbarX - 4, hotbarY - 4, 9 * 46 + 8, 48);
      for (let i = 0; i < 9; i++) {
        const sx = hotbarX + i * 46;
        const selected = i === s.selectedSlot;
        ctx.fillStyle = selected
          ? "rgba(255,255,255,0.25)"
          : "rgba(100,100,100,0.5)";
        ctx.fillRect(sx, hotbarY, 42, 40);
        ctx.strokeStyle = selected ? "#ffd" : "#555";
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeRect(sx, hotbarY, 42, 40);
        const slot = s.hotbar[i];
        if (slot.count > 0 && slot.block !== BLOCK.AIR) {
          ctx.fillStyle = BLOCK_COLORS[slot.block] || "#888";
          ctx.fillRect(sx + 5, hotbarY + 5, 24, 24);
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 5, hotbarY + 5, 24, 24);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px monospace";
          ctx.fillText(`${slot.count}`, sx + 4, hotbarY + 38);
        }
        ctx.fillStyle = "#aaa";
        ctx.font = "9px monospace";
        ctx.fillText(`${i + 1}`, sx + 32, hotbarY + 12);
      }

      // Crosshair
      {
        const worldMouseX = s.mouseCanvasX + s.cameraX;
        const worldMouseY = s.mouseCanvasY;
        const tx = Math.floor(worldMouseX / TILE);
        const ty = Math.floor(worldMouseY / TILE);
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          tx * TILE - Math.floor(s.cameraX) + 1,
          ty * TILE + 1,
          TILE - 2,
          TILE - 2,
        );
      }

      if (s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText("YOU DIED", CANVAS_W / 2, CANVAS_H / 2 - 30);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px monospace";
        ctx.fillText(
          `Blocks Mined: ${s.score}`,
          CANVAS_W / 2,
          CANVAS_H / 2 + 20,
        );
        ctx.fillStyle = "#aaa";
        ctx.font = "16px monospace";
        ctx.fillText(
          "Click PLAY AGAIN to restart",
          CANVAS_W / 2,
          CANVAS_H / 2 + 60,
        );
        ctx.textAlign = "left";
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(gameLoop);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current?.keys.add(e.key);
      const num = Number.parseInt(e.key);
      if (num >= 1 && num <= 9 && stateRef.current)
        stateRef.current.selectedSlot = num - 1;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown")
        e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current?.keys.delete(e.key);
    };

    const getCanvasPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
        y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const pos = getCanvasPos(e);
      s.mouseCanvasX = pos.x;
      s.mouseCanvasY = pos.y;
      if (e.button === 0) {
        s.mouseDown = true;
      } else if (e.button === 2) {
        const worldMouseX = pos.x + s.cameraX;
        const worldMouseY = pos.y;
        const tx = Math.floor(worldMouseX / TILE);
        const ty = Math.floor(worldMouseY / TILE);
        const playerTX = Math.floor(s.px / TILE);
        const playerTY = Math.floor(s.py / TILE);
        const dist = Math.abs(tx - playerTX) + Math.abs(ty - playerTY);
        if (
          dist <= 5 &&
          getBlock(s.world, tx, ty) === BLOCK.AIR &&
          s.hotbar[s.selectedSlot].count > 0
        ) {
          const hasNeighbor =
            isSolid(getBlock(s.world, tx - 1, ty)) ||
            isSolid(getBlock(s.world, tx + 1, ty)) ||
            isSolid(getBlock(s.world, tx, ty - 1)) ||
            isSolid(getBlock(s.world, tx, ty + 1));
          if (hasNeighbor) {
            const pTX1 = Math.floor(s.px / TILE);
            const pTX2 = Math.floor((s.px + TILE - 3) / TILE);
            const pTY1 = Math.floor(s.py / TILE);
            const pTY2 = Math.floor((s.py + TILE * 2 - 3) / TILE);
            if (tx < pTX1 || tx > pTX2 || ty < pTY1 || ty > pTY2) {
              setBlock(s.world, tx, ty, s.hotbar[s.selectedSlot].block);
              s.hotbar[s.selectedSlot].count--;
              if (s.hotbar[s.selectedSlot].count === 0)
                s.hotbar[s.selectedSlot].block = BLOCK.AIR;
            }
          }
        }
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (stateRef.current && e.button === 0)
        stateRef.current.mouseDown = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const pos = getCanvasPos(e);
      s.mouseCanvasX = pos.x;
      s.mouseCanvasY = pos.y;
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    const onWheel = (e: WheelEvent) => {
      if (stateRef.current)
        stateRef.current.selectedSlot =
          (stateRef.current.selectedSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("wheel", onWheel);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handlePlayAgain = () => {
    if (stateRef.current) onGameOver(stateRef.current.score);
  };

  return (
    <div className="relative" style={{ width: CANVAS_W, maxWidth: "100%" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          display: "block",
          width: "100%",
          imageRendering: "pixelated",
          cursor: "crosshair",
          background: "#5BE3FF",
        }}
        tabIndex={0}
      />
      {dead && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16">
          <button
            type="button"
            onClick={handlePlayAgain}
            className="mt-4 px-6 py-2 bg-red-700 hover:bg-red-600 text-white font-mono font-bold rounded border-2 border-red-400 text-sm"
            data-ocid="minecraft.restart_button"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
