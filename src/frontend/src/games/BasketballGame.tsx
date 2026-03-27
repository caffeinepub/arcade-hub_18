import { useCallback, useEffect, useRef, useState } from "react";
import { playBounce, playMiss, playShoot } from "../utils/sound";

interface Props {
  onGameOver: (score: number) => void;
}

const W = 480;
const H = 520;
const GRAVITY = 0.45;
const MAX_MISSES = 3;

interface Hoop {
  x: number;
  y: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  spinAngle: number;
  active: boolean;
}

interface Popup {
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
}

function randomHoop(): Hoop {
  return {
    x: 80 + Math.random() * (W - 160),
    y: 80 + Math.random() * (H - 240),
  };
}

export default function BasketballGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    ball: null as Ball | null,
    hoop: randomHoop(),
    score: 0,
    misses: 0,
    streak: 0,
    alive: true,
    popups: [] as Popup[],
    rimHit: false,
    animFrame: 0,
    phase: "playing" as "playing" | "gameover",
  });
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<"playing" | "gameover">("playing");
  const rafRef = useRef<number>(0);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  const drawHoop = useCallback((ctx: CanvasRenderingContext2D, hoop: Hoop) => {
    const { x, y } = hoop;
    const rimW = 48;
    const rimH = 10;

    // Backboard
    ctx.fillStyle = "#8B6914";
    ctx.fillRect(x - 30, y - 40, 60, 5);
    ctx.fillStyle = "#6B4F0A";
    ctx.fillRect(x - 28, y - 38, 56, 1);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 30, y - 40, 60, 5);

    // Pole
    ctx.fillStyle = "#888";
    ctx.fillRect(x + 28, y - 40, 5, 55);

    // Rim
    ctx.strokeStyle = "#E05010";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - rimW / 2, y);
    ctx.lineTo(x + rimW / 2, y);
    ctx.stroke();

    // Rim ends
    ctx.fillStyle = "#E05010";
    ctx.beginPath();
    ctx.arc(x - rimW / 2, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + rimW / 2, y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Net
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    const netTop = y + rimH / 2;
    const netBot = y + 28;
    const netSegs = 6;
    for (let i = 0; i <= netSegs; i++) {
      const tx = x - rimW / 2 + (rimW / netSegs) * i;
      const bx = x - rimW / 2 + rimW * 0.2 + ((rimW * 0.6) / netSegs) * i;
      ctx.beginPath();
      ctx.moveTo(tx, netTop);
      ctx.lineTo(bx, netBot);
      ctx.stroke();
    }
    for (let r = 0; r < 4; r++) {
      const t = r / 3;
      const ny2 = netTop + (netBot - netTop) * t;
      const lx = x - rimW / 2 + rimW * 0.2 * t;
      const rx = x + rimW / 2 - rimW * 0.2 * t;
      ctx.beginPath();
      ctx.moveTo(lx, ny2);
      ctx.lineTo(rx, ny2);
      ctx.stroke();
    }

    // Rim glow
    ctx.save();
    ctx.shadowColor = "#FF6600";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#FF6600";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, rimW / 2 - 4, rimH / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawBall = useCallback((ctx: CanvasRenderingContext2D, ball: Ball) => {
    const { x, y, spinAngle } = ball;
    const r = 16;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);

    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, "#FF8C00");
    grad.addColorStop(0.5, "#E56000");
    grad.addColorStop(1, "#A03800");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    ctx.fillStyle = "#1a0e05";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(139, 105, 20, 0.25)";
    ctx.lineWidth = 1;
    for (let fy = 0; fy < H; fy += 30) {
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.lineTo(W, fy);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 200, 50, 0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    ctx.strokeStyle = "rgba(255, 200, 50, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(W / 2, H + 40, 200, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    drawHoop(ctx, s.hoop);

    if (s.ball) {
      drawBall(ctx, s.ball);
    }

    for (const p of s.popups) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.font = "bold 18px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    // HUD - Score
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(8, 8, 110, 56);
    ctx.strokeStyle = "#FF6600";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, 110, 56);
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "left";
    ctx.fillText("SCORE", 16, 24);
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(String(s.score), 16, 48);

    // Streak
    if (s.streak >= 2) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W / 2 - 55, 8, 110, 40);
      ctx.strokeStyle = "#FF6600";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(W / 2 - 55, 8, 110, 40);
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillStyle = "#FF8C00";
      ctx.textAlign = "center";
      ctx.fillText(`STREAK x${s.streak}`, W / 2, 34);
    }

    // Lives
    ctx.textAlign = "right";
    ctx.font = "9px 'Press Start 2P', monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("LIVES", W - 12, 24);
    for (let i = 0; i < MAX_MISSES; i++) {
      const filled = i >= s.misses;
      ctx.font = "16px monospace";
      ctx.fillStyle = filled ? "#E53935" : "rgba(100,100,100,0.4)";
      ctx.textAlign = "right";
      ctx.fillText("\u2665", W - 10 - i * 22, 48);
    }

    // Game over overlay
    if (s.phase === "gameover") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = "22px 'Press Start 2P', monospace";
      ctx.fillStyle = "#FF4500";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 60);
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillStyle = "#aaa";
      ctx.fillText("FINAL SCORE", W / 2, H / 2 - 20);
      ctx.font = "28px 'Press Start 2P', monospace";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(String(s.score), W / 2, H / 2 + 20);
    }
  }, [drawHoop, drawBall]);

  const shootBall = useCallback((clientX: number, clientY: number) => {
    playShoot();
    const s = stateRef.current;
    if (!s.alive || s.ball) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = (clientX - rect.left) * (W / rect.width);
    const my = (clientY - rect.top) * (H / rect.height);
    const startX = W / 2;
    const startY = H - 40;
    const dx = mx - startX;
    const dy = my - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spd = Math.max(10, dist * 0.055);
    const angle = Math.atan2(dy, dx);
    s.ball = {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      spin: (Math.random() - 0.5) * 0.3,
      spinAngle: 0,
      active: true,
    };
    s.rimHit = false;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      shootBall(e.clientX, e.clientY);
    },
    [shootBall],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.key === " " || e.key === "Enter") {
        const cv = canvasRef.current;
        if (!cv) return;
        const rect = cv.getBoundingClientRect();
        // Shoot toward the hoop
        const s = stateRef.current;
        const hx = rect.left + (s.hoop.x / W) * rect.width;
        const hy = rect.top + (s.hoop.y / H) * rect.height;
        shootBall(hx, hy);
      }
    },
    [shootBall],
  );

  useEffect(() => {
    if (phase !== "playing") return;

    const loop = () => {
      const s = stateRef.current;
      if (!s.alive) return;

      s.animFrame++;

      if (s.ball) {
        const b = s.ball;
        b.vy += GRAVITY;
        b.x += b.vx;
        b.y += b.vy;
        b.spinAngle += b.spin;

        const h = s.hoop;
        const rimL = h.x - 24;
        const rimR = h.x + 24;
        const rimY = h.y;
        const ballR = 16;

        if (
          b.vy > 0 &&
          b.y >= rimY - 4 &&
          b.y <= rimY + 12 &&
          b.x > rimL + ballR &&
          b.x < rimR - ballR
        ) {
          const bonus = s.streak >= 2 ? s.streak : 1;
          const pts = 2 * bonus;
          s.score += pts;
          playBounce();
          s.streak += 1;
          s.ball = null;
          s.hoop = randomHoop();
          const popupText = s.rimHit ? `CLANK! +${pts}` : `SWISH! +${pts}`;
          const popupColor = s.rimHit ? "#FFD700" : "#00FF88";
          s.popups.push({
            text: popupText,
            x: h.x,
            y: h.y - 20,
            alpha: 1,
            color: popupColor,
          });
          setScore(s.score);
          setStreak(s.streak);
        } else if (
          Math.abs(b.x - rimL) < ballR + 5 &&
          Math.abs(b.y - rimY) < ballR + 5
        ) {
          b.vx = Math.abs(b.vx) * 0.6;
          b.vy = -Math.abs(b.vy) * 0.5;
          s.rimHit = true;
        } else if (
          Math.abs(b.x - rimR) < ballR + 5 &&
          Math.abs(b.y - rimY) < ballR + 5
        ) {
          b.vx = -Math.abs(b.vx) * 0.6;
          b.vy = -Math.abs(b.vy) * 0.5;
          s.rimHit = true;
        }

        if (b.y > H + 40 || b.x < -40 || b.x > W + 40) {
          s.misses += 1;
          playMiss();
          s.streak = 0;
          s.ball = null;
          s.rimHit = false;
          const missX = Math.max(60, Math.min(W - 60, b.x));
          s.popups.push({
            text: "MISS!",
            x: missX,
            y: H / 2,
            alpha: 1,
            color: "#FF4444",
          });
          setMisses(s.misses);
          setStreak(0);
          if (s.misses >= MAX_MISSES) {
            s.alive = false;
            s.phase = "gameover";
            setPhase("gameover");
            draw();
            setTimeout(() => cbRef.current(s.score), 400);
            return;
          }
        }
      }

      s.popups = s.popups
        .map((p) => ({ ...p, y: p.y - 1.2, alpha: p.alpha - 0.018 }))
        .filter((p) => p.alpha > 0);

      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, draw]);

  if (phase === "gameover") {
    return (
      <div
        className="flex flex-col items-center gap-4"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-lg"
          style={{
            border: "3px solid #FF6600",
            boxShadow: "0 0 20px #FF660044",
            cursor: "default",
          }}
        />
        <button
          type="button"
          data-ocid="basketball.primary_button"
          onClick={() => {
            const s = stateRef.current;
            s.ball = null;
            s.hoop = randomHoop();
            s.score = 0;
            s.misses = 0;
            s.streak = 0;
            s.alive = true;
            s.phase = "playing";
            s.popups = [];
            s.rimHit = false;
            setScore(0);
            setMisses(0);
            setStreak(0);
            setPhase("playing");
          }}
          style={{
            padding: "14px 32px",
            background: "linear-gradient(180deg, #FF6600 0%, #CC4400 100%)",
            border: "3px solid #FF9944",
            borderRadius: 8,
            color: "#fff",
            fontSize: "0.9rem",
            letterSpacing: "0.2em",
            cursor: "pointer",
            textShadow: "2px 2px 0 #661100",
            boxShadow: "0 4px 0 #882200",
          }}
        >
          ▶ PLAY AGAIN
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      <div
        data-ocid="basketball.panel"
        style={{
          width: W,
          background: "rgba(0,0,0,0.7)",
          border: "2px solid #FF6600",
          borderRadius: 6,
          padding: "8px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ color: "#888", fontSize: "0.42rem" }}>SCORE</div>
          <div style={{ color: "#FFD700", fontSize: "0.85rem" }}>{score}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#FF8C00", fontSize: "0.42rem" }}>
            🏀 BASKETBALL RANDOM
          </div>
          {streak >= 2 && (
            <div
              style={{ color: "#00FF88", fontSize: "0.42rem", marginTop: 2 }}
            >
              STREAK x{streak} 🔥
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#888", fontSize: "0.42rem" }}>MISSES</div>
          <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
            {([0, 1, 2] as const).map((i) => (
              <span
                key={`heart-${i}`}
                style={{
                  fontSize: "0.9rem",
                  color: i < misses ? "rgba(100,100,100,0.4)" : "#E53935",
                }}
              >
                ♥
              </span>
            ))}
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-lg"
        data-ocid="basketball.canvas_target"
        tabIndex={0}
        style={{
          border: "3px solid #FF6600",
          boxShadow: "0 0 12px #FF660044",
          cursor: "crosshair",
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />

      <div
        style={{
          color: "#666",
          fontSize: "0.4rem",
          letterSpacing: "0.1em",
          textAlign: "center",
        }}
      >
        CLICK TO AIM &amp; SHOOT — {MAX_MISSES} MISSES = GAME OVER
      </div>
    </div>
  );
}
