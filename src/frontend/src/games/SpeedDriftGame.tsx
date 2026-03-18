import { useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const W = 400;
const H = 560;
const ROAD_W = 220;
const PLAYER_W = 32;
const PLAYER_H = 56;
const GAME_DURATION = 60;

interface Segment {
  x: number;
  curve: number;
}

interface Obstacle {
  segIndex: number;
  offsetX: number;
  passed: boolean;
}

type GameState = {
  scrollOffset: number;
  playerOffsetX: number;
  steerVel: number;
  speed: number;
  onRoad: boolean;
  offRoadFrames: number;
  score: number;
  frame: number;
  alive: boolean;
  timeLeft: number;
  lastTime: number;
  segments: Segment[];
  obstacles: Obstacle[];
  keys: { left: boolean; right: boolean };
  obstacleCrashes: number;
};

function ensureSegments(s: GameState) {
  const needed = Math.ceil(s.scrollOffset) + H + 200;
  while (s.segments.length < needed) {
    const prev =
      s.segments.length > 0
        ? s.segments[s.segments.length - 1]
        : { x: W / 2, curve: 0 };
    let curve = prev.curve + (Math.random() - 0.5) * 0.08;
    curve = Math.max(-1.2, Math.min(1.2, curve));
    const nx = prev.x + curve * 1.2;
    const clampedX = Math.max(
      ROAD_W / 2 + 20,
      Math.min(W - ROAD_W / 2 - 20, nx),
    );
    s.segments.push({ x: clampedX, curve });
  }
}

function spawnObstacles(s: GameState) {
  const aheadIdx = Math.floor(s.scrollOffset) + H + 100;
  const lastObs =
    s.obstacles.length > 0 ? s.obstacles[s.obstacles.length - 1].segIndex : 0;
  if (aheadIdx - lastObs > 150) {
    const offsets = [-50, 0, 50];
    const off = offsets[Math.floor(Math.random() * offsets.length)];
    s.obstacles.push({ segIndex: aheadIdx, offsetX: off, passed: false });
  }
}

function drawPlayerCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tilt: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  const hw = PLAYER_W / 2;
  const hh = PLAYER_H / 2;

  // Minecart body — dark gray
  ctx.fillStyle = "#3A3A3A";
  ctx.fillRect(-hw + 3, -hh, PLAYER_W - 6, PLAYER_H);

  // Wooden plank accent
  ctx.fillStyle = "#8B5E3C";
  ctx.fillRect(-hw + 3, -4, PLAYER_W - 6, 8);

  // Block highlights
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-hw + 3, hh);
  ctx.lineTo(-hw + 3, -hh);
  ctx.lineTo(hw - 3, -hh);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.moveTo(hw - 3, -hh);
  ctx.lineTo(hw - 3, hh);
  ctx.lineTo(-hw + 3, hh);
  ctx.stroke();

  // Wheels
  ctx.fillStyle = "#111";
  ctx.fillRect(-hw - 2, -hh + 6, 7, 14);
  ctx.fillRect(hw - 5, -hh + 6, 7, 14);
  ctx.fillRect(-hw - 2, hh - 20, 7, 14);
  ctx.fillRect(hw - 5, hh - 20, 7, 14);

  // Gold headlights
  ctx.fillStyle = "rgba(255,215,0,0.9)";
  ctx.fillRect(-hw + 5, -hh, 7, 4);
  ctx.fillRect(hw - 12, -hh, 7, 4);

  ctx.restore();
}

function drawStoneBlock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  // Stone block obstacle
  ctx.fillStyle = "#7A7A7A";
  ctx.fillRect(-6, -8, 12, 16);
  // Block highlight
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-6, -8);
  ctx.lineTo(6, -8);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.lineTo(6, 8);
  ctx.lineTo(-6, 8);
  ctx.stroke();
  // Label
  ctx.fillStyle = "#FFD700";
  ctx.font = "5px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("STONE", 0, 14);
  ctx.restore();
}

export default function SpeedDriftGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    scrollOffset: 0,
    playerOffsetX: 0,
    steerVel: 0,
    speed: 4,
    onRoad: true,
    offRoadFrames: 0,
    score: 0,
    frame: 0,
    alive: true,
    timeLeft: GAME_DURATION,
    lastTime: 0,
    segments: [],
    obstacles: [],
    keys: { left: false, right: false },
    obstacleCrashes: 0,
  });
  const rafRef = useRef<number | null>(null);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;

    // Dark Minecraft sky
    ctx.fillStyle = "#1A2A1A";
    ctx.fillRect(0, 0, W, H);

    const baseIdx = Math.floor(s.scrollOffset);

    for (let screenY = H; screenY >= 0; screenY--) {
      const segIdx = baseIdx + (H - screenY);
      if (segIdx < 0 || segIdx >= s.segments.length) continue;
      const seg = s.segments[segIdx];
      const roadLeft = seg.x - ROAD_W / 2;
      const roadRight = seg.x + ROAD_W / 2;

      // Grass sides
      ctx.fillStyle = screenY % 40 < 20 ? "#5D8A3C" : "#4E7830";
      ctx.fillRect(0, screenY, W, 1);

      // Dirt road surface
      ctx.fillStyle = screenY % 60 < 30 ? "#8B5E3C" : "#7A5230";
      ctx.fillRect(roadLeft, screenY, ROAD_W, 1);

      // Gold center dash (rails)
      const dashPhase = (segIdx + Math.floor(s.scrollOffset * 2)) % 40;
      if (dashPhase < 20) {
        ctx.fillStyle = "rgba(255,215,0,0.5)";
        ctx.fillRect(seg.x - 1, screenY, 2, 1);
      }

      // Gold edge marks
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(roadLeft, screenY, 4, 1);
      ctx.fillRect(roadRight - 4, screenY, 4, 1);
    }

    for (const obs of s.obstacles) {
      const screenY = H - (obs.segIndex - baseIdx);
      if (screenY < -20 || screenY > H + 20) continue;
      const seg = s.segments[obs.segIndex];
      if (!seg) continue;
      drawStoneBlock(ctx, seg.x + obs.offsetX, screenY);
    }

    const playerScreenX = W / 2 + s.playerOffsetX;
    const tilt = s.steerVel * 0.08;
    drawPlayerCar(ctx, playerScreenX, H - 100, tilt);

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = "#FFD700";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${s.score}`, 10, 23);
    ctx.textAlign = "right";
    ctx.fillStyle = s.timeLeft < 10 ? "#CC3333" : "#FFD700";
    ctx.fillText(`TIME: ${Math.ceil(s.timeLeft)}`, W - 10, 23);
    ctx.textAlign = "left";

    if (!s.onRoad) {
      ctx.fillStyle = "rgba(204,51,51,0.15)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#CC3333";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("OFF ROAD!", W / 2, H / 2);
      ctx.textAlign = "left";
    }

    if (!s.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFD700";
      ctx.font = "13px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TIME'S UP!", W / 2, H / 2 - 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE: ${s.score}`, W / 2, H / 2 + 10);
      ctx.textAlign = "left";
    }
  }, []);

  const loop = useCallback(
    (timestamp: number) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const s = stateRef.current;

      if (!s.alive) {
        draw(ctx);
        return;
      }

      if (s.lastTime === 0) s.lastTime = timestamp;
      const dt = Math.min((timestamp - s.lastTime) / 1000, 0.05);
      s.lastTime = timestamp;

      s.timeLeft -= dt;
      if (s.timeLeft <= 0) {
        s.timeLeft = 0;
        s.alive = false;
        draw(ctx);
        cbRef.current(s.score);
        return;
      }

      s.frame++;
      s.speed = 4 + (GAME_DURATION - s.timeLeft) / 15;

      const steerAccel = 0.6;
      const steerFriction = 0.82;
      if (s.keys.left) s.steerVel -= steerAccel;
      if (s.keys.right) s.steerVel += steerAccel;
      s.steerVel *= steerFriction;
      const effectiveSpeed = s.onRoad ? 1 : 0.45;
      s.playerOffsetX += s.steerVel * effectiveSpeed;

      s.scrollOffset += s.speed * effectiveSpeed;
      s.score = Math.floor(s.scrollOffset / 10);

      ensureSegments(s);
      spawnObstacles(s);

      const baseIdx = Math.floor(s.scrollOffset);
      const playerSegIdx = baseIdx + 100;
      const playerSeg = s.segments[playerSegIdx];
      if (playerSeg) {
        const playerWorldX = W / 2 + s.playerOffsetX;
        const distFromCenter = Math.abs(playerWorldX - playerSeg.x);
        s.onRoad = distFromCenter < ROAD_W / 2 - PLAYER_W / 2;
      }

      if (!s.onRoad) {
        s.offRoadFrames++;
      } else {
        s.offRoadFrames = 0;
      }

      const playerWorldX2 = W / 2 + s.playerOffsetX;
      for (const obs of s.obstacles) {
        if (obs.passed) continue;
        const obsScreenY = H - (obs.segIndex - baseIdx);
        if (obsScreenY < H - 120 || obsScreenY > H - 80) continue;
        const obsSeg = s.segments[obs.segIndex];
        if (!obsSeg) continue;
        const approxObsScreenX = obsSeg.x + obs.offsetX;
        if (Math.abs(approxObsScreenX - playerWorldX2) < 28) {
          obs.passed = true;
          s.obstacleCrashes++;
          s.steerVel *= -2;
          s.score = Math.max(0, s.score - 20);
        } else if (obsScreenY < H - 140) {
          obs.passed = true;
        }
      }

      s.obstacles = s.obstacles.filter((o) => {
        const sy = H - (o.segIndex - baseIdx);
        return sy > -50;
      });

      draw(ctx);
      rafRef.current = requestAnimationFrame(loop);
    },
    [draw],
  );

  useEffect(() => {
    const s = stateRef.current;
    s.scrollOffset = 0;
    s.playerOffsetX = 0;
    s.steerVel = 0;
    s.speed = 4;
    s.onRoad = true;
    s.offRoadFrames = 0;
    s.score = 0;
    s.frame = 0;
    s.alive = true;
    s.timeLeft = GAME_DURATION;
    s.lastTime = 0;
    s.segments = [];
    s.obstacles = [];
    s.keys = { left: false, right: false };
    s.obstacleCrashes = 0;
    ensureSegments(s);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        s.keys.left = true;
        e.preventDefault();
      }
      if (e.key === "ArrowRight") {
        s.keys.right = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") s.keys.left = false;
      if (e.key === "ArrowRight") s.keys.right = false;
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
        border: "3px solid #8B5E3C",
        boxShadow: "none",
        maxWidth: "100%",
      }}
      tabIndex={0}
    />
  );
}
