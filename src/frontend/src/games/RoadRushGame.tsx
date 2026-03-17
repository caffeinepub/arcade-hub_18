import { useCallback, useEffect, useRef } from "react";

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

const ENEMY_COLORS = ["#FF4C1A", "#FFD700", "#00E5FF", "#FF69B4", "#7FFF00"];

interface Enemy {
  x: number;
  y: number;
  color: string;
  lane: number;
}

function drawCar(
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

  // Body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(cx + 4, cy, w - 8, h, 6);
  ctx.fill();

  // Windshield
  ctx.fillStyle = isPlayer ? "rgba(0,220,255,0.6)" : "rgba(200,200,255,0.4)";
  ctx.beginPath();
  if (isPlayer) {
    ctx.roundRect(cx + 8, cy + 10, w - 16, 18, 3);
  } else {
    ctx.roundRect(cx + 8, cy + h - 28, w - 16, 18, 3);
  }
  ctx.fill();

  // Wheels
  ctx.fillStyle = "#111";
  ctx.fillRect(cx, cy + 8, 8, 18);
  ctx.fillRect(cx + w - 8, cy + 8, 8, 18);
  ctx.fillRect(cx, cy + h - 26, 8, 18);
  ctx.fillRect(cx + w - 8, cy + h - 26, 8, 18);

  // Headlights / taillights
  if (isPlayer) {
    ctx.fillStyle = "rgba(255,200,50,0.9)";
    ctx.fillRect(cx + 6, cy, 8, 5);
    ctx.fillRect(cx + w - 14, cy, 8, 5);
  } else {
    ctx.fillStyle = "rgba(255,50,50,0.9)";
    ctx.fillRect(cx + 6, cy + h - 5, 8, 5);
    ctx.fillRect(cx + w - 14, cy + h - 5, 8, 5);
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

    // Sky/background
    ctx.fillStyle = "#080d14";
    ctx.fillRect(0, 0, W, H);

    // Grass on sides
    ctx.fillStyle = "#0a1a08";
    ctx.fillRect(0, 0, ROAD_LEFT, H);
    ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);

    // Road surface
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_COUNT_W(), H);

    // Road edge lines
    ctx.strokeStyle = "#FF4C1A";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#FF4C1A";
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT, 0);
    ctx.lineTo(ROAD_LEFT, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ROAD_RIGHT, 0);
    ctx.lineTo(ROAD_RIGHT, H);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dashed lane dividers
    const dashLen = 40;
    const dashGap = 30;
    const period = dashLen + dashGap;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
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

    // Player car glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(255,76,26,0.6)";
    drawCar(ctx, s.playerX, H - 80, PLAYER_W, PLAYER_H, "#FF4C1A", true);
    ctx.shadowBlur = 0;

    // Enemy cars
    for (const e of s.enemies) {
      drawCar(ctx, e.x, e.y, ENEMY_W, ENEMY_H, e.color, false);
    }

    // Score
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = "#FF4C1A";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${s.score}`, 10, 22);
    ctx.fillStyle = "rgba(255,76,26,0.6)";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText(`SPEED: ${s.speed.toFixed(1)}x`, W - 120, 22);

    if (!s.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FF4C1A";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#FF4C1A";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#FFD700";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE: ${s.score}`, W / 2, H / 2 + 10);
      ctx.textAlign = "left";
    }
  }, []);

  function ROAD_COUNT_W() {
    return ROAD_RIGHT - ROAD_LEFT;
  }

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

    // Lane change
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
    // Smooth move toward lane center
    const targetX = LANE_CENTERS[s.playerLane];
    s.playerX += (targetX - s.playerX) * 0.22;

    // Scroll dashes
    s.dashOffset += s.speed * 2;

    // Spawn enemies
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

    // Move enemies
    for (const e of s.enemies) {
      e.y += s.speed * 2.5;
    }
    // Remove off-screen
    s.enemies = s.enemies.filter((e) => e.y < H + ENEMY_H);

    // Collision
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
        border: "1px solid rgba(255,76,26,0.5)",
        boxShadow: "0 0 24px rgba(255,76,26,0.3)",
        maxWidth: "100%",
      }}
      tabIndex={0}
    />
  );
}
