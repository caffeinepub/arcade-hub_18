import { useEffect, useRef, useState } from "react";
import {
  playDeath,
  playExplosion,
  playHit,
  playLaser,
  playLevelUp,
} from "../utils/sound";

interface Props {
  onGameOver: (score: number) => void;
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

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
  alive: boolean;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  blocks: { bx: number; by: number; bw: number; bh: number }[];
}

const W = 640;
const H = 400;
const GROUND_H = 48;
const PLAYER_W = 48;
const PLAYER_H = 28;
const BULLET_W = 14;
const BULLET_H = 6;
const ENEMY_W = 44;
const ENEMY_H = 26;
const BULLET_COOLDOWN = 280;

function makeCloud(x: number): Cloud {
  const baseY = 20 + Math.random() * 80;
  const baseW = 48 + Math.floor(Math.random() * 5) * 16;
  const baseH = 16 + Math.floor(Math.random() * 2) * 16;
  const blocks: Cloud["blocks"] = [];
  for (let bx = 0; bx < baseW; bx += 16) {
    for (let by = 0; by < baseH; by += 16) {
      if (Math.random() > 0.2) blocks.push({ bx, by, bw: 16, bh: 16 });
    }
  }
  return {
    x,
    y: baseY,
    width: baseW,
    height: baseH,
    speed: 0.5 + Math.random() * 0.5,
    blocks,
  };
}

type Context2D = CanvasRenderingContext2D;

function drawPlayerPlane(cx: Context2D, px: number, py: number, alpha: number) {
  cx.globalAlpha = alpha;
  cx.fillStyle = "#2d5a1b";
  cx.fillRect(px, py + 8, 36, 12);
  cx.fillStyle = "#1a3a0a";
  cx.fillRect(px + 36, py + 10, 12, 8);
  cx.fillStyle = "#3a7022";
  cx.fillRect(px + 8, py, 16, 10);
  cx.fillStyle = "#3a7022";
  cx.fillRect(px + 8, py + 18, 16, 8);
  cx.fillStyle = "#4a8f2a";
  cx.fillRect(px + 10, py + 4, 24, 8);
  cx.fillStyle = "#4a8f2a";
  cx.fillRect(px + 10, py + 16, 24, 8);
  cx.fillStyle = "#aaddff";
  cx.fillRect(px + 26, py + 10, 8, 8);
  cx.fillStyle = "#8B6914";
  cx.fillRect(px + 2, py + 11, 6, 6);
  cx.globalAlpha = 1;
}

function drawEnemyPlane(cx: Context2D, ex: number, ey: number) {
  cx.fillStyle = "#8b1a1a";
  cx.fillRect(ex + 8, ey + 8, 32, 12);
  cx.fillStyle = "#5a0f0f";
  cx.fillRect(ex, ey + 10, 8, 8);
  cx.fillStyle = "#7a1515";
  cx.fillRect(ex + 36, ey + 6, 8, 16);
  cx.fillStyle = "#aa2020";
  cx.fillRect(ex + 10, ey + 2, 22, 8);
  cx.fillRect(ex + 10, ey + 18, 22, 8);
  cx.fillStyle = "#ffcc88";
  cx.fillRect(ex + 10, ey + 10, 8, 8);
  cx.fillStyle = "#333";
  cx.fillRect(ex + 36, ey + 11, 6, 6);
}

export default function SkyAce({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const stateRef = useRef({
    playerY: H / 2 - PLAYER_H / 2,
    playerVY: 0,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    clouds: [] as Cloud[],
    hills: [] as { x: number; width: number; height: number; speed: number }[],
    score: 0,
    lives: 3,
    wave: 1,
    enemiesKilledThisWave: 0,
    gameOver: false,
    lastBulletTime: 0,
    lastEnemySpawn: 0,
    enemySpawnInterval: 1800,
    keys: { up: false, down: false },
    running: true,
    invincible: 0,
    shakeFrames: 0,
  });
  const animRef = useRef<number>(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayWave, setDisplayWave] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const s = stateRef.current;

    for (let i = 0; i < 6; i++) {
      s.clouds.push(makeCloud(Math.random() * W));
    }
    for (let i = 0; i < 5; i++) {
      s.hills.push({
        x: i * 160,
        width: 120 + Math.random() * 80,
        height: 30 + Math.random() * 40,
        speed: 1.2,
      });
    }

    const keyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
        s.keys.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
        s.keys.down = true;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
        s.keys.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
        s.keys.down = false;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    function spawnExplosion(x: number, y: number) {
      const colors = ["#ff4400", "#ff8800", "#ffcc00", "#ff2200", "#ffee44"];
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
        const speed = 1.5 + Math.random() * 3;
        s.particles.push({
          x: x + Math.random() * 10 - 5,
          y: y + Math.random() * 10 - 5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 30 + Math.random() * 20,
          maxLife: 50,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.floor(Math.random() * 3) * 4,
        });
      }
    }

    function loop(now: number) {
      if (!s.running) return;

      if (!s.gameOver) {
        const ACCEL = 0.4;
        const MAX_VY = 4;
        if (s.keys.up) s.playerVY -= ACCEL;
        else if (s.keys.down) s.playerVY += ACCEL;
        else s.playerVY *= 0.85;
        s.playerVY = Math.max(-MAX_VY, Math.min(MAX_VY, s.playerVY));
        s.playerY += s.playerVY;
        s.playerY = Math.max(
          0,
          Math.min(H - GROUND_H - PLAYER_H - 4, s.playerY),
        );

        if (now - s.lastBulletTime > BULLET_COOLDOWN) {
          s.bullets.push({
            x: 8 + PLAYER_W,
            y: s.playerY + PLAYER_H / 2 - BULLET_H / 2,
            speed: 9,
            alive: true,
          });
          s.lastBulletTime = now;
        }

        const spawnInterval = Math.max(
          600,
          s.enemySpawnInterval - (s.wave - 1) * 100,
        );
        if (now - s.lastEnemySpawn > spawnInterval) {
          const ey = Math.random() * (H - GROUND_H - ENEMY_H - 20) + 10;
          s.enemies.push({
            x: W + 10,
            y: ey,
            width: ENEMY_W,
            height: ENEMY_H,
            speed: 2.5 + (s.wave - 1) * 0.4 + Math.random() * 1.5,
            alive: true,
          });
          s.lastEnemySpawn = now;
        }

        for (const b of s.bullets) {
          b.x += b.speed;
          if (b.x > W + 20) b.alive = false;
        }
        for (const e of s.enemies) {
          e.x -= e.speed;
          if (e.x < -ENEMY_W - 10) e.alive = false;
        }

        for (const b of s.bullets) {
          if (!b.alive) continue;
          for (const e of s.enemies) {
            if (!e.alive) continue;
            if (
              b.x < e.x + e.width &&
              b.x + BULLET_W > e.x &&
              b.y < e.y + e.height &&
              b.y + BULLET_H > e.y
            ) {
              b.alive = false;
              e.alive = false;
              spawnExplosion(e.x + e.width / 2, e.y + e.height / 2);
              s.score += 10;
              playHit();
              playExplosion();
              s.enemiesKilledThisWave++;
              if (s.enemiesKilledThisWave >= 10) {
                s.wave++;
                s.enemiesKilledThisWave = 0;
              }
              setDisplayScore(s.score);
              playLevelUp();
              setDisplayWave(s.wave);
            }
          }
        }

        if (s.invincible <= 0) {
          const px = 8;
          const py = s.playerY;
          for (const e of s.enemies) {
            if (!e.alive) continue;
            if (
              px < e.x + e.width - 4 &&
              px + PLAYER_W - 4 > e.x + 4 &&
              py < e.y + e.height - 4 &&
              py + PLAYER_H - 4 > e.y + 4
            ) {
              e.alive = false;
              spawnExplosion(e.x + e.width / 2, e.y + e.height / 2);
              s.lives--;
              s.invincible = 120;
              s.shakeFrames = 12;
              setDisplayLives(s.lives);
              if (s.lives <= 0) {
                s.gameOver = true;
                playDeath();
                setIsGameOver(true);
                setFinalScore(s.score);
                onGameOverRef.current(s.score);
              }
            }
          }
        } else {
          s.invincible--;
        }

        s.bullets = s.bullets.filter((b) => b.alive);
        s.enemies = s.enemies.filter((e) => e.alive);

        for (const c of s.clouds) {
          c.x -= c.speed;
          if (c.x + c.width < 0) {
            c.x = W + 20;
            c.y = 20 + Math.random() * 80;
          }
        }
        for (const h of s.hills) {
          h.x -= h.speed;
          if (h.x + h.width < 0) {
            h.x = W + 20;
            h.height = 30 + Math.random() * 40;
            h.width = 120 + Math.random() * 80;
          }
        }
        for (const p of s.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.life--;
        }
        s.particles = s.particles.filter((p) => p.life > 0);
        if (s.shakeFrames > 0) s.shakeFrames--;
      }

      ctx.save();
      if (s.shakeFrames > 0) {
        ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      }

      const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
      skyGrad.addColorStop(0, "#4aa8e8");
      skyGrad.addColorStop(1, "#aadcf5");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H - GROUND_H);

      for (const h of s.hills) {
        ctx.fillStyle = "#5aad28";
        ctx.fillRect(h.x, H - GROUND_H - h.height, h.width, h.height);
        for (let bx = h.x; bx < h.x + h.width; bx += 16) {
          ctx.fillStyle = "#3a8c14";
          ctx.fillRect(bx, H - GROUND_H - h.height - 4, 16, 8);
        }
      }

      for (let bx = 0; bx < W; bx += 16) {
        ctx.fillStyle = "#5D8A2C";
        ctx.fillRect(bx, H - GROUND_H, 16, 12);
        ctx.fillStyle = "#7C5230";
        ctx.fillRect(bx, H - GROUND_H + 12, 16, GROUND_H - 12);
        ctx.fillStyle = "#6b461e";
        ctx.fillRect(bx + 15, H - GROUND_H, 1, GROUND_H);
        ctx.fillRect(bx, H - GROUND_H + 11, 16, 1);
      }

      for (const c of s.clouds) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        for (const b of c.blocks) {
          ctx.fillRect(c.x + b.bx, c.y + b.by, b.bw - 1, b.bh - 1);
        }
      }

      for (const b of s.bullets) {
        ctx.fillStyle = "#ffdd00";
        ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
        ctx.fillStyle = "#ff8800";
        ctx.fillRect(b.x, b.y + 1, 4, 4);
      }

      for (const e of s.enemies) {
        drawEnemyPlane(ctx, e.x, e.y);
      }

      const playerAlpha =
        s.invincible > 0
          ? Math.floor(s.invincible / 6) % 2 === 0
            ? 0.3
            : 1
          : 1;
      drawPlayerPlane(ctx, 8, s.playerY, playerAlpha);

      for (const p of s.particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);

    return () => {
      s.running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, []);

  function restart() {
    const s = stateRef.current;
    s.playerY = H / 2 - PLAYER_H / 2;
    s.playerVY = 0;
    s.bullets = [];
    s.enemies = [];
    s.particles = [];
    s.score = 0;
    s.lives = 3;
    s.wave = 1;
    s.enemiesKilledThisWave = 0;
    s.gameOver = false;
    s.lastBulletTime = 0;
    s.lastEnemySpawn = 0;
    s.enemySpawnInterval = 1800;
    s.invincible = 0;
    s.shakeFrames = 0;
    setDisplayScore(0);
    setDisplayLives(3);
    setDisplayWave(1);
    setIsGameOver(false);
    setFinalScore(0);
  }

  const HEART_SLOTS = [1, 2, 3];

  return (
    <div className="relative" style={{ width: W, maxWidth: "100%" }}>
      <div
        className="flex items-center justify-between px-3 py-1 font-arcade text-[9px] tracking-widest"
        style={{ background: "#0a1a00", borderBottom: "2px solid #5D8A2C" }}
      >
        <div style={{ color: "#ffdd00" }}>
          SCORE: <span style={{ color: "#fff" }}>{displayScore}</span>
        </div>
        <div style={{ color: "#87ceeb" }}>
          WAVE <span style={{ color: "#fff" }}>{displayWave}</span>
        </div>
        <div className="flex items-center gap-1" style={{ color: "#ff4444" }}>
          {HEART_SLOTS.map((slot) => (
            <span
              key={slot}
              style={{ opacity: slot <= displayLives ? 1 : 0.2 }}
            >
              ❤
            </span>
          ))}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: "block",
          imageRendering: "pixelated",
          maxWidth: "100%",
        }}
        data-ocid="sky_ace.canvas_target"
      />

      {isGameOver && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", top: "28px" }}
          data-ocid="sky_ace.modal"
        >
          <p
            className="font-arcade text-2xl mb-2"
            style={{ color: "#ff4444", textShadow: "2px 2px 0 #800" }}
          >
            GAME OVER
          </p>
          <p className="font-arcade text-sm mb-6" style={{ color: "#ffdd00" }}>
            SCORE: {finalScore}
          </p>
          <button
            type="button"
            onClick={restart}
            data-ocid="sky_ace.primary_button"
            className="font-arcade text-[10px] tracking-wider px-6 py-3"
            style={{
              background: "#2d5a1b",
              border: "2px solid #5D8A2C",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            ↺ PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
