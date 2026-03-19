import { useEffect, useRef, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const CANVAS_W = 600;
const CANVAS_H = 500;
const TOTAL_LAPS = 5;

const WAYPOINTS: { x: number; y: number }[] = [
  { x: 300, y: 80 },
  { x: 420, y: 90 },
  { x: 510, y: 120 },
  { x: 550, y: 170 },
  { x: 555, y: 250 },
  { x: 550, y: 330 },
  { x: 510, y: 380 },
  { x: 420, y: 410 },
  { x: 300, y: 420 },
  { x: 180, y: 410 },
  { x: 90, y: 380 },
  { x: 50, y: 330 },
  { x: 45, y: 250 },
  { x: 50, y: 170 },
  { x: 90, y: 120 },
  { x: 180, y: 90 },
];

const TRACK_WIDTH = 80;

interface Car {
  x: number;
  y: number;
  angle: number;
  speed: number;
  vx: number;
  vy: number;
  lap: number;
  waypointIndex: number;
  bodyColor: string;
  spoilerColor: string;
  number: number;
  finished: boolean;
  finishTime: number;
}

function createPlayerCar(): Car {
  return {
    x: WAYPOINTS[0].x - 30,
    y: WAYPOINTS[0].y,
    angle: 0,
    speed: 0,
    vx: 0,
    vy: 0,
    lap: 0,
    waypointIndex: 1,
    bodyColor: "#FF6600",
    spoilerColor: "#CC4400",
    number: 1,
    finished: false,
    finishTime: 0,
  };
}

function createAICar(index: number): Car {
  const configs = [
    { bodyColor: "#2255CC", spoilerColor: "#113399", number: 2, offset: -15 },
    { bodyColor: "#22AA44", spoilerColor: "#116622", number: 3, offset: 15 },
    { bodyColor: "#CCCC00", spoilerColor: "#999900", number: 4, offset: 30 },
  ];
  const cfg = configs[index];
  return {
    x: WAYPOINTS[0].x + cfg.offset,
    y: WAYPOINTS[0].y + (index + 1) * 22,
    angle: 0,
    speed: 0,
    vx: 0,
    vy: 0,
    lap: 0,
    waypointIndex: 1,
    bodyColor: cfg.bodyColor,
    spoilerColor: cfg.spoilerColor,
    number: cfg.number,
    finished: false,
    finishTime: 0,
  };
}

function getOrdinal(n: number): string {
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
}

function drawBlockyCar(
  ctx: CanvasRenderingContext2D,
  car: Car,
  isPlayer: boolean,
) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle + Math.PI / 2);

  ctx.fillStyle = car.bodyColor;
  ctx.fillRect(-10, -16, 20, 32);

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(-10, -16, 4, 4);
  ctx.fillRect(-10, -16, 20, 3);

  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-10, -16, 20, 32);

  ctx.fillStyle = car.spoilerColor;
  ctx.fillRect(-11, 12, 22, 6);
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 1;
  ctx.strokeRect(-11, 12, 22, 6);

  ctx.fillStyle = "#222";
  ctx.fillRect(-14, -14, 5, 8);
  ctx.fillRect(9, -14, 5, 8);
  ctx.fillRect(-14, 6, 5, 8);
  ctx.fillRect(9, 6, 5, 8);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(car.number), 0, -2);

  if (isPlayer) {
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(-3, -22, 6, 4);
  }

  ctx.restore();
}

function drawDirtTrack(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#2D5A1B";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  for (let gx = 0; gx < CANVAS_W; gx += 8) {
    for (let gy = 0; gy < CANVAS_H; gy += 8) {
      const shade =
        (gx + gy) % 16 === 0 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.04)";
      ctx.fillStyle = shade;
      ctx.fillRect(gx, gy, 8, 8);
    }
  }

  ctx.save();

  // Stone edge
  ctx.beginPath();
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i];
    if (i === 0) ctx.moveTo(wp.x, wp.y);
    else ctx.lineTo(wp.x, wp.y);
  }
  ctx.closePath();
  ctx.lineWidth = TRACK_WIDTH + 10;
  ctx.strokeStyle = "#555566";
  ctx.stroke();

  ctx.setLineDash([8, 4]);
  ctx.strokeStyle = "rgba(80,80,100,0.5)";
  ctx.stroke();
  ctx.setLineDash([]);

  // Main dirt
  ctx.beginPath();
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i];
    if (i === 0) ctx.moveTo(wp.x, wp.y);
    else ctx.lineTo(wp.x, wp.y);
  }
  ctx.closePath();
  ctx.lineWidth = TRACK_WIDTH;
  ctx.strokeStyle = "#8B5E2A";
  ctx.stroke();

  ctx.lineWidth = TRACK_WIDTH - 6;
  ctx.strokeStyle = "#7A5222";
  ctx.setLineDash([3, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner grass
  ctx.beginPath();
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i];
    if (i === 0) ctx.moveTo(wp.x, wp.y);
    else ctx.lineTo(wp.x, wp.y);
  }
  ctx.closePath();
  ctx.lineWidth = TRACK_WIDTH - 20;
  ctx.strokeStyle = "#3A7A22";
  ctx.stroke();

  // Center dashes
  ctx.beginPath();
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i];
    if (i === 0) ctx.moveTo(wp.x, wp.y);
    else ctx.lineTo(wp.x, wp.y);
  }
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.setLineDash([12, 10]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();

  // Checkerboard finish line
  const sf = WAYPOINTS[0];
  const sfNext = WAYPOINTS[1];
  const dx = sfNext.x - sf.x;
  const dy = sfNext.y - sf.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = -4; i <= 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#fff" : "#000";
    ctx.fillRect(sf.x + nx * i * 5 - 3, sf.y + ny * i * 5 - 3, 6, 6);
  }
}

export default function SprintCarRacerGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    player: createPlayerCar(),
    aiCars: [createAICar(0), createAICar(1), createAICar(2)],
    keys: { up: false, down: false, left: false, right: false },
    raceStartTime: Date.now(),
    raceOver: false,
    finishedPosition: 1,
    finishedScore: 0,
  });
  const animRef = useRef<number>(0);
  const [raceOver, setRaceOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalPosition, setFinalPosition] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const s = stateRef.current;
    s.player = createPlayerCar();
    s.aiCars = [createAICar(0), createAICar(1), createAICar(2)];
    s.keys = { up: false, down: false, left: false, right: false };
    s.raceStartTime = Date.now();
    s.raceOver = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowUp") s.keys.up = true;
      if (e.key === "ArrowDown") s.keys.down = true;
      if (e.key === "ArrowLeft") s.keys.left = true;
      if (e.key === "ArrowRight") s.keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") s.keys.up = false;
      if (e.key === "ArrowDown") s.keys.down = false;
      if (e.key === "ArrowLeft") s.keys.left = false;
      if (e.key === "ArrowRight") s.keys.right = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const MAX_SPEED = 4.2;
    const AI_MAX_SPEEDS = [3.6, 3.4, 3.8];
    const ACCEL = 0.12;
    const BRAKE = 0.18;
    const FRICTION = 0.96;
    const STEER = 0.065;

    function advanceWaypoint(car: Car, targetIdx: number): boolean {
      const wp = WAYPOINTS[targetIdx];
      const dx = wp.x - car.x;
      const dy = wp.y - car.y;
      return Math.sqrt(dx * dx + dy * dy) < 30;
    }

    function checkLap(car: Car) {
      const prevWp =
        (car.waypointIndex - 1 + WAYPOINTS.length) % WAYPOINTS.length;
      if (prevWp === WAYPOINTS.length - 1 && car.waypointIndex === 1) {
        car.lap += 1;
      }
    }

    function updateAI(car: Car, maxSpeed: number, dt: number) {
      if (car.finished) return;
      const target = WAYPOINTS[car.waypointIndex];
      const dx = target.x - car.x;
      const dy = target.y - car.y;
      const targetAngle = Math.atan2(dy, dx) - Math.PI / 2;

      let angleDiff = targetAngle - car.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      car.angle += angleDiff * 0.08;

      car.speed = Math.min(car.speed + ACCEL * 0.8, maxSpeed);
      car.vx = Math.sin(car.angle) * car.speed;
      car.vy = -Math.cos(car.angle) * car.speed;
      car.x += car.vx * dt;
      car.y += car.vy * dt;

      if (advanceWaypoint(car, car.waypointIndex)) {
        car.waypointIndex = (car.waypointIndex + 1) % WAYPOINTS.length;
        checkLap(car);
      }

      if (car.lap >= TOTAL_LAPS) {
        car.finished = true;
        car.finishTime = Date.now() - s.raceStartTime;
      }
    }

    function updatePlayer(dt: number) {
      const car = s.player;
      if (car.finished) return;

      if (s.keys.left) car.angle -= STEER;
      if (s.keys.right) car.angle += STEER;

      if (s.keys.up) {
        car.speed = Math.min(car.speed + ACCEL, MAX_SPEED);
      } else if (s.keys.down) {
        car.speed = Math.max(car.speed - BRAKE, -1.5);
      } else {
        car.speed *= FRICTION;
      }

      car.vx = Math.sin(car.angle) * car.speed * 0.6 + car.vx * 0.4;
      car.vy = -Math.cos(car.angle) * car.speed * 0.6 + car.vy * 0.4;

      car.x = Math.max(10, Math.min(CANVAS_W - 10, car.x + car.vx * dt));
      car.y = Math.max(10, Math.min(CANVAS_H - 10, car.y + car.vy * dt));

      if (advanceWaypoint(car, car.waypointIndex)) {
        car.waypointIndex = (car.waypointIndex + 1) % WAYPOINTS.length;
        checkLap(car);
      }

      if (car.lap >= TOTAL_LAPS) {
        car.finished = true;
        car.finishTime = Date.now() - s.raceStartTime;
      }
    }

    function getPosition(): number {
      const allCars = [s.player, ...s.aiCars];
      const sorted = [...allCars].sort((a, b) => {
        if (b.lap !== a.lap) return b.lap - a.lap;
        return b.waypointIndex - a.waypointIndex;
      });
      return sorted.findIndex((c) => c === s.player) + 1;
    }

    function calcScore(position: number, timeMs: number): number {
      const baseScores = [1000, 700, 400, 200];
      const base = baseScores[Math.min(position - 1, 3)];
      const timePenalty = Math.floor(timeMs / 1000) * 2;
      return Math.max(base - timePenalty, 50);
    }

    let lastTime = performance.now();

    function loop(now: number) {
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;

      if (s.raceOver) {
        // Draw final overlay
        drawDirtTrack(ctx);
        for (const ai of s.aiCars) drawBlockyCar(ctx, ai, false);
        drawBlockyCar(ctx, s.player, true);

        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#FF8C00";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("RACE OVER!", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 20px monospace";
        ctx.fillText(
          `FINISHED: ${getOrdinal(s.finishedPosition)}`,
          CANVAS_W / 2,
          CANVAS_H / 2,
        );
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px monospace";
        ctx.fillText(
          `SCORE: ${s.finishedScore}`,
          CANVAS_W / 2,
          CANVAS_H / 2 + 35,
        );
        ctx.textAlign = "left";
        return;
      }

      updatePlayer(dt);
      for (let i = 0; i < s.aiCars.length; i++)
        updateAI(s.aiCars[i], AI_MAX_SPEEDS[i], dt);

      if (s.player.finished) {
        s.raceOver = true;
        const pos = getPosition();
        const score = calcScore(pos, s.player.finishTime);
        s.finishedPosition = pos;
        s.finishedScore = score;
        setFinalPosition(pos);
        setFinalScore(score);
        setRaceOver(true);
        setTimeout(() => onGameOver(score), 2500);
      }

      const pos = getPosition();

      drawDirtTrack(ctx);
      for (const ai of s.aiCars) drawBlockyCar(ctx, ai, false);
      drawBlockyCar(ctx, s.player, true);

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(8, 8, 160, 90);
      ctx.strokeStyle = "#FF8C00";
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, 160, 90);

      ctx.font = "bold 13px monospace";
      ctx.fillStyle = "#FF8C00";
      ctx.fillText("LAP", 18, 30);
      ctx.fillStyle = "#fff";
      ctx.fillText(
        `${Math.min(s.player.lap + 1, TOTAL_LAPS)} / ${TOTAL_LAPS}`,
        60,
        30,
      );

      ctx.fillStyle = "#FF8C00";
      ctx.fillText("POS", 18, 52);
      ctx.fillStyle = "#FFD700";
      ctx.fillText(getOrdinal(pos), 60, 52);

      ctx.fillStyle = "#FF8C00";
      ctx.fillText("SPD", 18, 74);
      ctx.fillStyle = "#fff";
      ctx.fillText(`${Math.abs(Math.round(s.player.speed * 25))} MPH`, 60, 74);

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onGameOver]);

  return (
    <div className="relative" data-ocid="sprint_car_racer.canvas_target">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          display: "block",
          imageRendering: "pixelated",
          border: "3px solid #FF8C0088",
          borderRadius: "4px",
          maxWidth: "100%",
        }}
      />
      {raceOver && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          data-ocid="sprint_car_racer.success_state"
        >
          <div className="bg-black/80 border-2 border-orange-500 rounded px-8 py-4 text-center">
            <p className="text-orange-400 font-mono text-xl font-bold">
              🏁 RACE COMPLETE!
            </p>
            <p className="text-yellow-400 font-mono text-lg">
              {getOrdinal(finalPosition)} PLACE
            </p>
            <p className="text-white font-mono">Score: {finalScore}</p>
          </div>
        </div>
      )}
    </div>
  );
}
