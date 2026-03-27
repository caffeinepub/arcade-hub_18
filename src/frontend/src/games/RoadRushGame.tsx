import { useCallback, useEffect, useRef } from "react";
import { playDeath, playDrift } from "../utils/sound";

interface Props {
  onGameOver: (score: number) => void;
}

const W = 400;
const H = 560;
const LANE_COUNT = 3;
const LANE_WIDTH = 100;
const ROAD_LEFT = (W - LANE_COUNT * LANE_WIDTH) / 2;
const ROAD_RIGHT = ROAD_LEFT + LANE_COUNT * LANE_WIDTH;
const PLAYER_W = 40;
const PLAYER_H = 70;
const ENEMY_W = 40;
const ENEMY_H = 70;
const LANE_CENTERS = [
  ROAD_LEFT + LANE_WIDTH * 0.5,
  ROAD_LEFT + LANE_WIDTH * 1.5,
  ROAD_LEFT + LANE_WIDTH * 2.5,
];

// Minecraft earthy enemy colors
const ENEMY_COLORS = ["#8B5E3C", "#5D8A3C", "#C8A96E", "#7A7A7A", "#DBC46C"];

interface Enemy {
  x: number;
  y: number;
  color: string;
  lane: number;
}

function drawMinecartCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bodyColor: string,
  isPlayer: boolean,
) {
  const cx = x - w / 2;
  const cy = y - h / 2;

  // Cart body
  ctx.fillStyle = isPlayer ? "#3A3A3A" : bodyColor;
  ctx.fillRect(cx + 2, cy, w - 4, h);

  // Wooden plank accent across middle
  ctx.fillStyle = isPlayer ? "#8B5E3C" : "#C8A96E";
  ctx.fillRect(cx + 2, cy + h / 2 - 4, w - 4, 8);

  // Block highlight
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 2, cy + h);
  ctx.lineTo(cx + 2, cy);
  ctx.lineTo(cx + w - 2, cy);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.moveTo(cx + w - 2, cy);
  ctx.lineTo(cx + w - 2, cy + h);
  ctx.lineTo(cx + 2, cy + h);
  ctx.stroke();

  // Wheels (black squares)
  ctx.fillStyle = "#111";
  ctx.fillRect(cx - 2, cy + 8, 8, 10);
  ctx.fillRect(cx + w - 6, cy + 8, 8, 10);
  ctx.fillRect(cx - 2, cy + h - 18, 8, 10);
  ctx.fillRect(cx + w - 6, cy + h - 18, 8, 10);

  // Player indicator — gold top
  if (isPlayer) {
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(cx + 8, cy, w - 16, 4);
  }
}

export default function RoadRushGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    playerLane: 1,
    playerX: LANE_CENTERS[1],
    enemies: [] as Enemy[],
    score: 0,
    speed: 3,
    dashOffset: 0,
    frame: 0,
    alive: true,
    keys: { left: false, right: false },
    laneChangeCooldown: 0,
    spawnTimer: 0,
  });
  const rafRef = useRef<number | null>(null);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;

    // Minecraft night sky
    ctx.fillStyle = "#1A2A3A";
    ctx.fillRect(0, 0, W, H);

    // Grass on sides
    ctx.fillStyle = "#5D8A3C";
    ctx.fillRect(0, 0, ROAD_LEFT, H);
    ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);

    // Road surface (cobblestone)
    ctx.fillStyle = "#5A5A5A";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, H);

    // Road edge lines (dirt border)
    ctx.strokeStyle = "#8B5E3C";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT, 0);
    ctx.lineTo(ROAD_LEFT, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ROAD_RIGHT, 0);
    ctx.lineTo(ROAD_RIGHT, H);
    ctx.stroke();

    // Dashed lane dividers — gold rails
    const dashLen = 40;
    const dashGap = 30;
    const period = dashLen + dashGap;
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.setLineDash([dashLen, dashGap]);
    ctx.lineDashOffset = -s.dashOffset % period;
    for (let i = 1; i < LANE_COUNT; i++) {
      const lx = ROAD_LEFT + i * LANE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Player car (minecart)
    drawMinecartCar(
      ctx,
      s.playerX,
      H - 80,
      PLAYER_W,
      PLAYER_H,
      "#3A3A3A",
      true,
    );

    // Enemy cars
    for (const e of s.enemies) {
      drawMinecartCar(ctx, e.x, e.y, ENEMY_W, ENEMY_H, e.color, false);
    }

    // Score
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = "#FFD700";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${s.score}`, 10, 22);
    ctx.fillStyle = "#C8A96E";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText(`SPEED: ${s.speed.toFixed(1)}x`, W - 120, 22);

    if (!s.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFD700";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE: ${s.score}`, W / 2, H / 2 + 10);
      ctx.textAlign = "left";
    }
  }, []);

  const loop = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    if (!s.alive) {
      draw(ctx);
      return;
    }

    s.frame++;
    s.score = Math.floor(s.frame / 6);
    s.speed = 3 + s.frame / 400;

    if (s.laneChangeCooldown > 0) s.laneChangeCooldown--;
    if (s.laneChangeCooldown === 0) {
      if (s.keys.left && s.playerLane > 0) {
        s.playerLane--;
        s.laneChangeCooldown = 18;
      } else if (s.keys.right && s.playerLane < LANE_COUNT - 1) {
        s.playerLane++;
        s.laneChangeCooldown = 18;
      }
    }
    const targetX = LANE_CENTERS[s.playerLane];
    s.playerX += (targetX - s.playerX) * 0.22;

    s.dashOffset += s.speed * 2;

    s.spawnTimer++;
    const spawnInterval = Math.max(40, 90 - s.frame / 50);
    if (s.spawnTimer >= spawnInterval) {
      s.spawnTimer = 0;
      const lane = Math.floor(Math.random() * LANE_COUNT);
      s.enemies.push({
        x: LANE_CENTERS[lane],
        y: -ENEMY_H,
        color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
        lane,
      });
    }

    for (const e of s.enemies) {
      e.y += s.speed * 2.5;
    }
    s.enemies = s.enemies.filter((e) => e.y < H + ENEMY_H);

    const px = s.playerX;
    const py = H - 80;
    for (const e of s.enemies) {
      const dx = Math.abs(e.x - px);
      const dy = Math.abs(e.y - py);
      if (
        dx < (PLAYER_W + ENEMY_W) / 2 - 6 &&
        dy < (PLAYER_H + ENEMY_H) / 2 - 8
      ) {
        s.alive = false;
        playDeath();
        draw(ctx);
        cbRef.current(s.score);
        return;
      }
    }

    draw(ctx);
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  useEffect(() => {
    const s = stateRef.current;
    s.playerLane = 1;
    s.playerX = LANE_CENTERS[1];
    s.enemies = [];
    s.score = 0;
    s.speed = 3;
    s.dashOffset = 0;
    s.frame = 0;
    s.alive = true;
    s.laneChangeCooldown = 0;
    s.spawnTimer = 0;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        stateRef.current.keys.left = true;
        e.preventDefault();
      }
      if (e.key === "ArrowRight") {
        stateRef.current.keys.right = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight") stateRef.current.keys.right = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [loop]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="rounded-lg"
      style={{
        border: "3px solid #6B6B6B",
        boxShadow: "none",
        maxWidth: "100%",
      }}
      tabIndex={0}
    />
  );
}
