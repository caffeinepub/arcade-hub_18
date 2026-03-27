import { Button } from "@/components/ui/button";
import { Car, DollarSign, Lock, Trophy, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playHit, playScore, playWin } from "../utils/sound";

interface Props {
  onGameOver: (score: number) => void;
}

const WALLET_KEY = "street-racer-wallet";
const DEFAULT_WALLET = 1000;

interface CarDef {
  id: string;
  name: string;
  cost: number;
  speed: number;
  handling: number;
  color: string;
  bodyColor: string;
}

const CARS: CarDef[] = [
  {
    id: "starter",
    name: "STARTER",
    cost: 0,
    speed: 4,
    handling: 5,
    color: "#888888",
    bodyColor: "#aaaaaa",
  },
  {
    id: "cruiser",
    name: "STREET CRUISER",
    cost: 500,
    speed: 6,
    handling: 6,
    color: "#2196F3",
    bodyColor: "#42A5F5",
  },
  {
    id: "coupe",
    name: "SPORT COUPE",
    cost: 1500,
    speed: 8,
    handling: 7,
    color: "#E91E63",
    bodyColor: "#F06292",
  },
  {
    id: "supercar",
    name: "SUPER CAR",
    cost: 4000,
    speed: 10,
    handling: 9,
    color: "#F5A623",
    bodyColor: "#FFD54F",
  },
];

const BET_OPTIONS = [100, 250, 500];

function getWallet(): number {
  const stored = localStorage.getItem(WALLET_KEY);
  return stored ? Number.parseInt(stored, 10) : DEFAULT_WALLET;
}

function saveWallet(amount: number) {
  localStorage.setItem(WALLET_KEY, String(amount));
}

function getOwnedCars(): string[] {
  const stored = localStorage.getItem("street-racer-owned");
  return stored ? JSON.parse(stored) : ["starter"];
}

function saveOwnedCars(cars: string[]) {
  localStorage.setItem("street-racer-owned", JSON.stringify(cars));
}

type Phase = "garage" | "race" | "results";

const CANVAS_W = 580;
const CANVAS_H = 400;
const TRACK_CX = CANVAS_W / 2;
const TRACK_CY = CANVAS_H / 2 + 10;
const TRACK_RX = 220;
const TRACK_RY = 150;
const TOTAL_LAPS = 3;

interface RaceCar {
  name: string;
  angle: number; // radians along oval
  laps: number;
  color: string;
  bodyColor: string;
  speed: number; // base degrees per frame
  finished: boolean;
  finishPos: number;
}

function angleToPos(angle: number) {
  return {
    x: TRACK_CX + TRACK_RX * Math.cos(angle),
    y: TRACK_CY + TRACK_RY * Math.sin(angle),
  };
}

function drawTrack(ctx: CanvasRenderingContext2D) {
  // Background
  ctx.fillStyle = "#1A1209"; // dark earthy
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Grass infield (inner oval)
  ctx.fillStyle = "#3D6B2A";
  ctx.beginPath();
  ctx.ellipse(
    TRACK_CX,
    TRACK_CY,
    TRACK_RX - 24,
    TRACK_RY - 24,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Outer track border
  ctx.save();
  ctx.strokeStyle = "#7A7A7A"; // stone border
  ctx.lineWidth = 48;
  ctx.beginPath();
  ctx.ellipse(TRACK_CX, TRACK_CY, TRACK_RX, TRACK_RY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Road surface
  ctx.strokeStyle = "#5C4A3A"; // dirt road surface
  ctx.lineWidth = 40;
  ctx.beginPath();
  ctx.ellipse(TRACK_CX, TRACK_CY, TRACK_RX, TRACK_RY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Center lane dashes
  ctx.strokeStyle = "rgba(255,215,0,0.4)"; // gold rails
  ctx.lineWidth = 1;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.ellipse(TRACK_CX, TRACK_CY, TRACK_RX, TRACK_RY, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Start/finish line
  const lineAngle = -Math.PI / 2;
  const inner = {
    x: TRACK_CX + (TRACK_RX - 20) * Math.cos(lineAngle),
    y: TRACK_CY + (TRACK_RY - 20) * Math.sin(lineAngle),
  };
  const outer = {
    x: TRACK_CX + (TRACK_RX + 20) * Math.cos(lineAngle),
    y: TRACK_CY + (TRACK_RY + 20) * Math.sin(lineAngle),
  };
  ctx.strokeStyle = "#F5A623";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(inner.x, inner.y);
  ctx.lineTo(outer.x, outer.y);
  ctx.stroke();
  ctx.restore();
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  car: RaceCar,
  isPlayer: boolean,
) {
  const pos = angleToPos(car.angle);
  // Compute heading tangent
  const dx = -TRACK_RX * Math.sin(car.angle);
  const dy = TRACK_RY * Math.cos(car.angle);
  const heading = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(heading);

  // Car body
  const w = isPlayer ? 16 : 13;
  const h = isPlayer ? 26 : 22;
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 3);
  ctx.fill();

  // Windshield stripe
  ctx.fillStyle = car.bodyColor;
  ctx.fillRect(-w / 2 + 2, -h / 2 + 4, w - 4, 7);

  // Tail glow for player
  if (isPlayer) {
    ctx.fillStyle = car.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

export default function StreetRacerGame({ onGameOver }: Props) {
  const [phase, setPhase] = useState<Phase>("garage");
  const [wallet, setWallet] = useState(getWallet);
  const [ownedCars, setOwnedCars] = useState(getOwnedCars);
  const [selectedCar, setSelectedCar] = useState("starter");
  const [bet, setBet] = useState(100);
  const [results, setResults] = useState<{
    order: RaceCar[];
    delta: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    cars: RaceCar[];
    keys: Set<string>;
    finishCount: number;
    done: boolean;
  } | null>(null);
  const rafRef = useRef<number>(0);

  // Sync wallet to localStorage
  useEffect(() => {
    saveWallet(wallet);
  }, [wallet]);

  // Buy a car
  const buyCar = (car: CarDef) => {
    if (wallet < car.cost || ownedCars.includes(car.id)) return;
    const newWallet = wallet - car.cost;
    const newOwned = [...ownedCars, car.id];
    setWallet(newWallet);
    setOwnedCars(newOwned);
    saveOwnedCars(newOwned);
    setSelectedCar(car.id);
  };

  // Start race
  const startRace = () => {
    playScore();
    setPhase("race");
  };

  // Game loop
  useEffect(() => {
    if (phase !== "race") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const playerCarDef = CARS.find((c) => c.id === selectedCar) || CARS[0];

    // Spread cars on start line with offset
    const startAngle = -Math.PI / 2;
    const spacing = 0.12;

    const aiNames = ["DUKE", "RAZOR", "NEON"];
    const aiColors = [
      { color: "#4CAF50", bodyColor: "#81C784" },
      { color: "#9C27B0", bodyColor: "#CE93D8" },
      { color: "#FF5722", bodyColor: "#FF8A65" },
    ];
    const aiSpeeds = [0.022, 0.02, 0.024];

    const cars: RaceCar[] = [
      {
        name: "YOU",
        angle: startAngle,
        laps: 0,
        color: playerCarDef.color,
        bodyColor: playerCarDef.bodyColor,
        speed: playerCarDef.speed * 0.004 + 0.008,
        finished: false,
        finishPos: 0,
      },
      ...aiNames.map((name, i) => ({
        name,
        angle: startAngle - spacing * (i + 1),
        laps: 0,
        color: aiColors[i].color,
        bodyColor: aiColors[i].bodyColor,
        speed: aiSpeeds[i],
        finished: false,
        finishPos: 0,
      })),
    ];

    const keys = new Set<string>();
    stateRef.current = { cars, keys, finishCount: 0, done: false };

    const onKeyDown = (e: KeyboardEvent) => keys.add(e.key);
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let prevAngle = cars[0].angle;

    const loop = () => {
      const state = stateRef.current;
      if (!state || state.done) return;

      const { cars: raceCars, keys: pressedKeys } = state;
      const player = raceCars[0];

      if (!player.finished) {
        // Player steering: keys adjust speed slightly
        let speedMod = 1.0;
        if (pressedKeys.has("ArrowLeft")) speedMod = 1.15;
        if (pressedKeys.has("ArrowRight")) speedMod = 0.87;
        player.angle += player.speed * speedMod;
      }

      // AI movement with slight randomness
      for (let i = 1; i < raceCars.length; i++) {
        if (!raceCars[i].finished) {
          raceCars[i].angle += raceCars[i].speed * (0.9 + Math.random() * 0.2);
        }
      }

      // Lap detection: crossed -PI/2 from below
      for (const car of raceCars) {
        if (car.finished) continue;
        const normalized =
          (((car.angle - -Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) %
          (Math.PI * 2);
        const prevNormalized =
          (((prevAngle - -Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) %
          (Math.PI * 2);
        if (car === player) {
          // lap detection for player
          if (
            prevNormalized > Math.PI * 1.8 &&
            normalized < 0.3 &&
            car.laps < TOTAL_LAPS
          ) {
            car.laps++;
            if (car.laps >= TOTAL_LAPS) {
              car.finished = true;
              state.finishCount++;
              car.finishPos = state.finishCount;
            }
          }
        }
      }

      // AI lap detection
      for (let i = 1; i < raceCars.length; i++) {
        const car = raceCars[i];
        if (car.finished) continue;
        const lapsFromAngle = Math.floor(
          (car.angle - -Math.PI / 2) / (Math.PI * 2),
        );
        if (lapsFromAngle > car.laps) {
          car.laps = lapsFromAngle;
          if (car.laps >= TOTAL_LAPS) {
            car.finished = true;
            state.finishCount++;
            car.finishPos = state.finishCount;
          }
        }
      }

      prevAngle = player.angle;

      // Draw
      drawTrack(ctx);

      // Lap counter
      const playerLap = Math.min(player.laps + 1, TOTAL_LAPS);
      ctx.fillStyle = "#F5A623";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`LAP ${playerLap}/${TOTAL_LAPS}`, 12, 24);

      // Wallet
      ctx.fillStyle = "#aaa";
      ctx.font = "12px monospace";
      ctx.fillText(`BET: $${bet}`, CANVAS_W - 90, 24);

      // Position indicator
      const sorted = [...raceCars].sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.finished && b.finished) return a.finishPos - b.finishPos;
        return b.angle - a.angle;
      });
      const playerPos = sorted.indexOf(player) + 1;
      ctx.fillStyle = playerPos === 1 ? "#F5A623" : "#fff";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`P${playerPos}/4`, CANVAS_W - 90, 44);

      // Draw AI cars first, player on top
      for (let i = raceCars.length - 1; i >= 1; i--) {
        drawCar(ctx, raceCars[i], false);
      }
      drawCar(ctx, player, true);

      // Car name labels
      for (let i = 1; i < raceCars.length; i++) {
        const pos = angleToPos(raceCars[i].angle);
        ctx.fillStyle = raceCars[i].color;
        ctx.font = "9px monospace";
        ctx.fillText(raceCars[i].name, pos.x - 12, pos.y - 16);
      }

      // Check if all finished
      if (raceCars.every((c) => c.finished)) {
        state.done = true;
        const order = [...raceCars].sort((a, b) => a.finishPos - b.finishPos);
        const playerFinish = order.indexOf(player) + 1; // 1-indexed
        let delta = 0;
        if (playerFinish === 1)
          delta = bet * 3; // win others' bets
        else if (playerFinish === 2)
          delta = 0; // break even
        else delta = -bet; // lose

        const newWallet = wallet + delta;
        setWallet(newWallet);
        saveWallet(newWallet);
        if (playerFinish === 1) playWin();
        else playHit();
        setResults({ order, delta });
        setPhase("results");
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase, selectedCar, bet, wallet]);

  // ---- Garage Screen ----
  if (phase === "garage") {
    const affordableBets = BET_OPTIONS.filter((b) => b <= wallet);
    return (
      <div
        className="w-full max-w-[580px] mx-auto"
        style={{ fontFamily: "monospace" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2
            className="font-arcade text-base"
            style={{ color: "#F5A623", textShadow: "0 0 10px #F5A62388" }}
          >
            STREET RACER
          </h2>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded"
            style={{ background: "#1a1200", border: "1px solid #F5A62344" }}
          >
            <DollarSign className="h-4 w-4" style={{ color: "#F5A623" }} />
            <span style={{ color: "#F5A623" }} className="font-bold text-lg">
              {wallet.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cars grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {CARS.map((car) => {
            const owned = ownedCars.includes(car.id);
            const canAfford = wallet >= car.cost;
            const isSelected = selectedCar === car.id;
            return (
              <button
                type="button"
                key={car.id}
                data-ocid={`street_racer.car_${car.id}.card`}
                onClick={() => {
                  if (owned) setSelectedCar(car.id);
                  else if (canAfford) buyCar(car);
                }}
                className="w-full rounded-lg p-3 cursor-pointer transition-all text-left"
                style={{
                  background: isSelected ? `${car.color}22` : "#111827",
                  border: isSelected
                    ? `2px solid ${car.color}`
                    : owned
                      ? `1px solid ${car.color}55`
                      : "1px solid #333",
                  opacity: !owned && !canAfford ? 0.5 : 1,
                  boxShadow: isSelected ? `0 0 12px ${car.color}44` : "none",
                }}
              >
                {/* Mini car visual */}
                <div className="flex items-center justify-center mb-2">
                  <div className="relative" style={{ width: 28, height: 44 }}>
                    <div
                      className="absolute inset-0 rounded"
                      style={{ background: car.color }}
                    />
                    <div
                      className="absolute"
                      style={{
                        top: 6,
                        left: 3,
                        right: 3,
                        height: 12,
                        background: car.bodyColor,
                        borderRadius: 2,
                      }}
                    />
                    {!owned && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: "rgba(0,0,0,0.6)",
                          borderRadius: 4,
                        }}
                      >
                        <Lock className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <p
                  className="text-center font-bold text-[10px] mb-1"
                  style={{ color: owned ? car.color : "#888" }}
                >
                  {car.name}
                </p>
                <div className="flex gap-2 text-[9px] text-gray-400 justify-center mb-1">
                  <span>
                    SPD <span style={{ color: "#F5A623" }}>{car.speed}</span>
                  </span>
                  <span>
                    HDL <span style={{ color: "#21D4FF" }}>{car.handling}</span>
                  </span>
                </div>
                {!owned ? (
                  <p
                    className="text-center text-[10px]"
                    style={{ color: canAfford ? "#38F26D" : "#FF4C1A" }}
                  >
                    ${car.cost.toLocaleString()}
                  </p>
                ) : isSelected ? (
                  <p
                    className="text-center text-[9px]"
                    style={{ color: car.color }}
                  >
                    SELECTED ✓
                  </p>
                ) : (
                  <p className="text-center text-[9px] text-gray-500">OWNED</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Bet selector */}
        <div className="mb-4">
          <p className="text-[10px] text-gray-400 mb-2 tracking-widest">
            SELECT BET
          </p>
          <div className="flex gap-2">
            {BET_OPTIONS.map((b) => {
              const canBet = b <= wallet;
              return (
                <button
                  type="button"
                  key={b}
                  data-ocid={`street_racer.bet_${b}.button`}
                  onClick={() => canBet && setBet(b)}
                  disabled={!canBet}
                  className="flex-1 py-2 rounded text-sm font-bold transition-all"
                  style={{
                    background: bet === b ? "#F5A62333" : "#111827",
                    border: bet === b ? "2px solid #F5A623" : "1px solid #333",
                    color: canBet ? (bet === b ? "#F5A623" : "#888") : "#444",
                    cursor: canBet ? "pointer" : "not-allowed",
                  }}
                >
                  ${b}
                </button>
              );
            })}
          </div>
          {affordableBets.length === 0 && (
            <p className="text-[10px] mt-1" style={{ color: "#FF4C1A" }}>
              Not enough cash! Minimum bet is $100.
            </p>
          )}
        </div>

        {/* Prize info */}
        <div
          className="rounded p-2 mb-4 text-[10px] text-gray-400"
          style={{ background: "#0a0a0a", border: "1px solid #222" }}
        >
          <div className="flex justify-between">
            <span>🥇 1st place</span>
            <span style={{ color: "#F5A623" }}>+${bet * 3}</span>
          </div>
          <div className="flex justify-between">
            <span>🥈 2nd place</span>
            <span style={{ color: "#888" }}>$0 (break even)</span>
          </div>
          <div className="flex justify-between">
            <span>🥉 3rd / 4th</span>
            <span style={{ color: "#FF4C1A" }}>-${bet}</span>
          </div>
        </div>

        <Button
          data-ocid="street_racer.race.primary_button"
          onClick={startRace}
          disabled={affordableBets.length === 0 || !bet}
          className="w-full font-bold text-sm py-5 tracking-widest"
          style={{
            background: "linear-gradient(90deg, #F5A623, #FF8C00)",
            color: "#000",
            border: "none",
            boxShadow: "0 0 20px #F5A62355",
          }}
        >
          <Zap className="h-4 w-4 mr-2" />
          RACE NOW — BET ${bet}
        </Button>
      </div>
    );
  }

  // ---- Race Screen ----
  if (phase === "race") {
    return (
      <div className="flex flex-col items-center gap-2">
        <p
          className="text-[9px] tracking-widest"
          style={{ color: "#F5A623", fontFamily: "monospace" }}
        >
          ← LEFT ARROW = ACCELERATE INSIDE &nbsp;|&nbsp; RIGHT ARROW = BRAKE
          INSIDE →
        </p>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-lg"
          style={{ border: "1px solid #F5A62344", maxWidth: "100%" }}
        />
      </div>
    );
  }

  // ---- Results Screen ----
  if (phase === "results" && results) {
    const { order, delta } = results;
    const playerIdx = order.findIndex((c) => c.name === "YOU");
    return (
      <div
        className="w-full max-w-[580px] mx-auto text-center"
        style={{ fontFamily: "monospace" }}
      >
        <h2
          className="font-arcade text-base mb-1"
          style={{ color: "#F5A623", textShadow: "0 0 10px #F5A62388" }}
        >
          RACE OVER
        </h2>
        <p className="text-[10px] text-gray-400 mb-4 tracking-widest">
          {playerIdx === 0
            ? "🏆 YOU WON!"
            : playerIdx === 1
              ? "😌 CLOSE RACE"
              : "💸 TOUGH LUCK"}
        </p>

        {/* Finish order */}
        <div
          className="rounded-lg overflow-hidden mb-4"
          style={{ border: "1px solid #333" }}
        >
          {order.map((car, i) => (
            <div
              key={car.name}
              data-ocid={`street_racer.result.item.${i + 1}`}
              className="flex items-center justify-between px-4 py-2"
              style={{
                background:
                  car.name === "YOU"
                    ? `${car.color}22`
                    : i % 2 === 0
                      ? "#111"
                      : "#0d0d0d",
                borderBottom: i < order.length - 1 ? "1px solid #222" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{["🥇", "🥈", "🥉", "4th"][i]}</span>
                <div
                  className="w-4 h-6 rounded"
                  style={{ background: car.color }}
                />
                <span
                  className="font-bold text-sm"
                  style={{ color: car.name === "YOU" ? car.color : "#ccc" }}
                >
                  {car.name}
                </span>
              </div>
              {car.name === "YOU" && (
                <span
                  className="text-sm font-bold"
                  style={{ color: delta >= 0 ? "#38F26D" : "#FF4C1A" }}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta !== 0 ? `$${Math.abs(delta)}` : "EVEN"}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Wallet */}
        <div
          className="flex items-center justify-center gap-2 mb-5 p-3 rounded-lg"
          style={{ background: "#1a1200", border: "1px solid #F5A62344" }}
        >
          <Trophy className="h-5 w-5" style={{ color: "#F5A623" }} />
          <span className="text-[10px] text-gray-400 tracking-widest">
            WALLET
          </span>
          <span className="font-bold text-xl" style={{ color: "#F5A623" }}>
            ${wallet.toLocaleString()}
          </span>
        </div>

        {/* Unlock hint */}
        {CARS.filter((c) => !ownedCars.includes(c.id) && wallet >= c.cost)
          .length > 0 && (
          <div
            className="mb-4 p-2 rounded text-[10px]"
            style={{
              background: "#0a1200",
              border: "1px solid #38F26D44",
              color: "#38F26D",
            }}
          >
            <Car className="inline h-3 w-3 mr-1" />
            You can now afford a new car! Visit the garage.
          </div>
        )}

        <div className="flex gap-3">
          <Button
            data-ocid="street_racer.race_again.primary_button"
            onClick={() => {
              setResults(null);
              setPhase("garage");
            }}
            className="flex-1 font-bold py-4 tracking-widest"
            style={{
              background: "linear-gradient(90deg, #F5A623, #FF8C00)",
              color: "#000",
              border: "none",
            }}
          >
            RACE AGAIN
          </Button>
          <Button
            data-ocid="street_racer.quit.secondary_button"
            onClick={() => onGameOver(wallet)}
            variant="outline"
            className="flex-1 font-bold py-4 tracking-widest"
            style={{ borderColor: "#444", color: "#888" }}
          >
            QUIT
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
