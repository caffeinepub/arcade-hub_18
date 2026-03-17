import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const W = 480;
const H = 560;

type EnemyType = "basic" | "zigzag";

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  type: EnemyType;
  shootTimer: number;
  shootInterval: number;
  zigzagOffset: number;
  speed: number;
  id: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  owner: "player" | "enemy";
  id: number;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  id: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

type GameState = "WAITING" | "PLAYING" | "WAVE_CLEAR" | "GAME_OVER";

interface GameData {
  state: GameState;
  playerX: number;
  playerVx: number;
  lives: number;
  score: number;
  wave: number;
  enemies: Enemy[];
  bullets: Bullet[];
  explosions: Explosion[];
  stars: Star[];
  keys: Set<string>;
  lastShot: number;
  invincible: number;
  waveClearTimer: number;
  eid: number;
  bid: number;
  xid: number;
  waveSpawnDone: boolean;
  frameCount: number;
}

function makeStars(): Star[] {
  return Array.from({ length: 80 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 1.5 + 0.3,
    alpha: Math.random() * 0.7 + 0.3,
  }));
}

function spawnWave(
  wave: number,
  eidStart: number,
): { enemies: Enemy[]; nextEid: number } {
  const enemies: Enemy[] = [];
  let eid = eidStart;
  const rows = Math.min(2 + Math.floor(wave / 2), 4);
  const cols = Math.min(4 + wave, 8);
  const speedMult = 1 + (wave - 1) * 0.15;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type: EnemyType = c % 3 === 2 ? "zigzag" : "basic";
      const xSpacing = W / (cols + 1);
      enemies.push({
        x: xSpacing * (c + 1),
        y: 40 + r * 55,
        w: 28,
        h: 22,
        hp: 1,
        type,
        shootTimer: Math.random() * 120 + 60,
        shootInterval: type === "zigzag" ? 100 : 150,
        zigzagOffset: Math.random() * Math.PI * 2,
        speed: (type === "zigzag" ? 0.9 : 0.6) * speedMult,
        id: eid++,
      });
    }
  }
  return { enemies, nextEid: eid };
}

function initGame(): GameData {
  const stars = makeStars();
  return {
    state: "WAITING",
    playerX: W / 2,
    playerVx: 0,
    lives: 3,
    score: 0,
    wave: 1,
    enemies: [],
    bullets: [],
    explosions: [],
    stars,
    keys: new Set(),
    lastShot: 0,
    invincible: 0,
    waveClearTimer: 0,
    eid: 1,
    bid: 1,
    xid: 1,
    waveSpawnDone: false,
    frameCount: 0,
  };
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  glowColor: string,
  size = 18,
) {
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = glowColor;
  ctx.fillStyle = color;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x - size * 0.7, y + size * 0.6);
  ctx.lineTo(x - size * 0.25, y + size * 0.2);
  ctx.lineTo(x, y + size * 0.4);
  ctx.lineTo(x + size * 0.25, y + size * 0.2);
  ctx.lineTo(x + size * 0.7, y + size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawEnemyShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: EnemyType,
) {
  const color = type === "basic" ? "#FFB800" : "#FF3C6E";
  const glow = type === "basic" ? "#FFB80088" : "#FF3C6E88";
  const size = 12;
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = glow;
  ctx.fillStyle = color;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x - size * 0.8, y - size * 0.5);
  ctx.lineTo(x - size * 0.3, y - size * 0.1);
  ctx.lineTo(x, y - size * 0.3);
  ctx.lineTo(x + size * 0.3, y - size * 0.1);
  ctx.lineTo(x + size * 0.8, y - size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export default function SpaceShooterGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<GameData>(initGame());
  const rafRef = useRef<number>(0);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  const [uiScore, setUiScore] = useState(0);
  const [uiLives, setUiLives] = useState(3);
  const [uiState, setUiState] = useState<GameState>("WAITING");
  const [uiWave, setUiWave] = useState(1);

  const syncUI = useCallback(() => {
    const g = gRef.current;
    setUiScore(g.score);
    setUiLives(g.lives);
    setUiState(g.state);
    setUiWave(g.wave);
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const g = gRef.current;

    ctx.fillStyle = "#060610";
    ctx.fillRect(0, 0, W, H);

    for (const s of g.stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    for (const b of g.bullets) {
      if (b.owner !== "enemy") continue;
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#FF3C3C";
      ctx.fillStyle = "#FF3C3C";
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 3, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const b of g.bullets) {
      if (b.owner !== "player") continue;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00F0FF";
      ctx.fillStyle = "#00F0FF";
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 2.5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const e of g.enemies) {
      drawEnemyShip(ctx, e.x, e.y, e.type);
    }

    const py = H - 50;
    if (g.state === "PLAYING" || g.state === "WAVE_CLEAR") {
      const visible =
        g.invincible === 0 || Math.floor(g.frameCount / 4) % 2 === 0;
      if (visible) {
        drawShip(ctx, g.playerX, py, "#FF3C6E", "#FF3C6E88");
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#FF3C6E";
        ctx.fillStyle = "#FF3C6E66";
        ctx.beginPath();
        ctx.ellipse(g.playerX, py + 18, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (const ex of g.explosions) {
      ctx.save();
      ctx.globalAlpha = ex.alpha;
      ctx.shadowBlur = 20;
      ctx.shadowColor = ex.color;
      ctx.strokeStyle = ex.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = ex.alpha * 0.3;
      ctx.fillStyle = ex.color;
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "rgba(6,6,16,0.7)";
    ctx.fillRect(0, 0, W, 36);
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = "#FF3C6E";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#FF3C6E";
    ctx.fillText(`SCORE: ${g.score}`, 10, 23);
    ctx.fillStyle = "#00F0FF";
    ctx.shadowColor = "#00F0FF";
    const waveText = `WAVE ${g.wave}`;
    const wm = ctx.measureText(waveText);
    ctx.fillText(waveText, W / 2 - wm.width / 2, 23);
    ctx.shadowBlur = 0;
    for (let i = 0; i < g.lives; i++) {
      ctx.fillStyle = "#FF3C6E";
      ctx.font = "12px serif";
      ctx.fillText("\u2665", W - 30 - i * 18, 24);
    }

    if (g.state === "WAITING") {
      ctx.fillStyle = "rgba(6,6,16,0.8)";
      ctx.fillRect(0, H / 2 - 60, W, 120);
      ctx.textAlign = "center";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.fillStyle = "#FF3C6E";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#FF3C6E";
      ctx.fillText("SPACE SHOOTER", W / 2, H / 2 - 20);
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillStyle = "#00F0FF";
      ctx.shadowColor = "#00F0FF";
      ctx.fillText("PRESS SPACE TO START", W / 2, H / 2 + 10);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }

    if (g.state === "WAVE_CLEAR") {
      ctx.textAlign = "center";
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.fillStyle = "#FFB800";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#FFB800";
      ctx.fillText(`WAVE ${g.wave - 1} CLEAR!`, W / 2, H / 2 - 10);
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillStyle = "#00F0FF";
      ctx.shadowColor = "#00F0FF";
      ctx.fillText(`WAVE ${g.wave} INCOMING...`, W / 2, H / 2 + 16);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }

    if (g.state === "GAME_OVER") {
      ctx.fillStyle = "rgba(6,6,16,0.85)";
      ctx.fillRect(0, H / 2 - 80, W, 160);
      ctx.textAlign = "center";
      ctx.font = "16px 'Press Start 2P', monospace";
      ctx.fillStyle = "#FF3C6E";
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#FF3C6E";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 30);
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillStyle = "#FFB800";
      ctx.shadowColor = "#FFB800";
      ctx.fillText(`SCORE: ${g.score}`, W / 2, H / 2);
      ctx.fillStyle = "#00F0FF";
      ctx.shadowColor = "#00F0FF";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillText("PRESS SPACE TO RESTART", W / 2, H / 2 + 30);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }
  }, []);

  const update = useCallback(() => {
    const g = gRef.current;
    if (g.state !== "PLAYING" && g.state !== "WAVE_CLEAR") return;
    g.frameCount++;

    if (!g.waveSpawnDone) {
      const { enemies, nextEid } = spawnWave(g.wave, g.eid);
      g.enemies = enemies;
      g.eid = nextEid;
      g.waveSpawnDone = true;
    }

    if (g.state === "WAVE_CLEAR") {
      g.waveClearTimer--;
      if (g.waveClearTimer <= 0) {
        g.state = "PLAYING";
        g.waveSpawnDone = false;
      }
      return;
    }

    const accel = 0.7;
    const maxVx = 5;
    const friction = 0.82;
    if (g.keys.has("ArrowLeft")) g.playerVx -= accel;
    if (g.keys.has("ArrowRight")) g.playerVx += accel;
    g.playerVx *= friction;
    g.playerVx = Math.max(-maxVx, Math.min(maxVx, g.playerVx));
    g.playerX += g.playerVx;
    g.playerX = Math.max(24, Math.min(W - 24, g.playerX));

    const now = g.frameCount;
    const shootCooldown = 12;
    if (g.keys.has(" ") && now - g.lastShot > shootCooldown) {
      g.bullets.push({
        x: g.playerX,
        y: H - 65,
        vy: -12,
        owner: "player",
        id: g.bid++,
      });
      g.lastShot = now;
    }

    g.bullets = g.bullets.filter((b) => b.y > -20 && b.y < H + 20);
    for (const b of g.bullets) {
      b.y += b.vy;
    }

    const py = H - 50;
    for (const e of g.enemies) {
      e.y += e.speed;
      if (e.type === "zigzag") {
        e.zigzagOffset += 0.06;
        e.x += Math.sin(e.zigzagOffset) * 2.2;
        e.x = Math.max(16, Math.min(W - 16, e.x));
      }
      e.shootTimer--;
      if (e.shootTimer <= 0) {
        const dx = g.playerX - e.x;
        const dy = py - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        g.bullets.push({
          x: e.x,
          y: e.y + 10,
          vy: (dy / dist) * 5 + 2,
          owner: "enemy",
          id: g.bid++,
        });
        e.shootTimer = e.shootInterval + Math.random() * 60;
      }
    }

    const reachedBottom = g.enemies.filter((e) => e.y > H - 20);
    if (reachedBottom.length > 0) {
      g.enemies = g.enemies.filter((e) => e.y <= H - 20);
      if (g.invincible === 0) {
        g.lives -= reachedBottom.length;
        g.invincible = 120;
        g.explosions.push({
          x: g.playerX,
          y: py,
          radius: 5,
          maxRadius: 40,
          alpha: 1,
          color: "#FF3C6E",
          id: g.xid++,
        });
      }
    }

    const survivingEnemies: Enemy[] = [];
    for (const e of g.enemies) {
      let hit = false;
      const hitBullets: number[] = [];
      for (const b of g.bullets) {
        if (b.owner !== "player") continue;
        if (
          Math.abs(b.x - e.x) < e.w / 2 + 3 &&
          Math.abs(b.y - e.y) < e.h / 2 + 8
        ) {
          hit = true;
          hitBullets.push(b.id);
        }
      }
      if (hit) {
        g.bullets = g.bullets.filter((b) => !hitBullets.includes(b.id));
        g.score += e.type === "basic" ? 10 : 25;
        g.explosions.push({
          x: e.x,
          y: e.y,
          radius: 5,
          maxRadius: 35,
          alpha: 1,
          color: e.type === "basic" ? "#FFB800" : "#FF3C6E",
          id: g.xid++,
        });
      } else {
        survivingEnemies.push(e);
      }
    }
    g.enemies = survivingEnemies;

    if (g.invincible === 0) {
      const hitByEnemy = g.bullets.filter(
        (b) =>
          b.owner === "enemy" &&
          Math.abs(b.x - g.playerX) < 16 &&
          Math.abs(b.y - py) < 20,
      );
      if (hitByEnemy.length > 0) {
        g.lives--;
        g.invincible = 120;
        g.bullets = g.bullets.filter((b) => !hitByEnemy.includes(b));
        g.explosions.push({
          x: g.playerX,
          y: py,
          radius: 5,
          maxRadius: 40,
          alpha: 1,
          color: "#FF3C6E",
          id: g.xid++,
        });
      }
    }
    if (g.invincible > 0) g.invincible--;

    g.explosions = g.explosions
      .map((ex) => ({
        ...ex,
        radius: ex.radius + (ex.maxRadius - ex.radius) * 0.15,
        alpha: ex.alpha - 0.04,
      }))
      .filter((ex) => ex.alpha > 0);

    if (g.lives <= 0) {
      g.lives = 0;
      g.state = "GAME_OVER";
      cbRef.current(g.score);
      syncUI();
      return;
    }

    if (g.enemies.length === 0 && g.state === "PLAYING") {
      g.wave++;
      g.state = "WAVE_CLEAR";
      g.waveClearTimer = 120;
      g.bullets = g.bullets.filter((b) => b.owner === "player");
    }

    syncUI();
  }, [syncUI]);

  const loop = useCallback(() => {
    update();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.focus();
    gRef.current = initGame();
    draw();
    rafRef.current = requestAnimationFrame(loop);

    const onKey = (e: KeyboardEvent) => {
      const g = gRef.current;
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      g.keys.add(e.key);
      if (e.key === " ") {
        if (g.state === "WAITING") {
          g.state = "PLAYING";
          g.waveSpawnDone = false;
          syncUI();
        } else if (g.state === "GAME_OVER") {
          const stars = g.stars;
          Object.assign(g, initGame());
          g.stars = stars;
          g.state = "PLAYING";
          g.waveSpawnDone = false;
          syncUI();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      gRef.current.keys.delete(e.key);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [draw, loop, syncUI]);

  const touchLeft = useCallback((down: boolean) => {
    if (down) gRef.current.keys.add("ArrowLeft");
    else gRef.current.keys.delete("ArrowLeft");
  }, []);

  const touchRight = useCallback((down: boolean) => {
    if (down) gRef.current.keys.add("ArrowRight");
    else gRef.current.keys.delete("ArrowRight");
  }, []);

  const touchShoot = useCallback(() => {
    const g = gRef.current;
    if (g.state === "WAITING") {
      g.state = "PLAYING";
      g.waveSpawnDone = false;
      syncUI();
    } else if (g.state === "GAME_OVER") {
      const stars = g.stars;
      Object.assign(g, initGame());
      g.stars = stars;
      g.state = "PLAYING";
      g.waveSpawnDone = false;
      syncUI();
    } else {
      g.keys.add(" ");
      setTimeout(() => g.keys.delete(" "), 100);
    }
  }, [syncUI]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        tabIndex={0}
        className="rounded-lg max-w-full"
        style={{
          border: "1px solid rgba(255,60,110,0.5)",
          boxShadow: "0 0 24px rgba(255,60,110,0.25)",
          outline: "none",
        }}
      />

      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          data-ocid="space_shooter.left_button"
          onPointerDown={() => touchLeft(true)}
          onPointerUp={() => touchLeft(false)}
          onPointerLeave={() => touchLeft(false)}
          className="w-14 h-14 rounded-full text-xl flex items-center justify-center select-none active:opacity-60"
          style={{
            background: "rgba(255,60,110,0.15)",
            border: "1px solid rgba(255,60,110,0.5)",
            color: "#FF3C6E",
          }}
        >
          &#9664;
        </button>
        <button
          type="button"
          data-ocid="space_shooter.shoot_button"
          onPointerDown={touchShoot}
          className="w-16 h-16 rounded-full flex items-center justify-center select-none active:opacity-60"
          style={{
            background: "rgba(0,240,255,0.15)",
            border: "2px solid rgba(0,240,255,0.6)",
            color: "#00F0FF",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "8px",
          }}
        >
          FIRE
        </button>
        <button
          type="button"
          data-ocid="space_shooter.right_button"
          onPointerDown={() => touchRight(true)}
          onPointerUp={() => touchRight(false)}
          onPointerLeave={() => touchRight(false)}
          className="w-14 h-14 rounded-full text-xl flex items-center justify-center select-none active:opacity-60"
          style={{
            background: "rgba(255,60,110,0.15)",
            border: "1px solid rgba(255,60,110,0.5)",
            color: "#FF3C6E",
          }}
        >
          &#9654;
        </button>
      </div>

      {uiState === "WAITING" && (
        <span data-ocid="space_shooter.loading_state" className="sr-only">
          waiting
        </span>
      )}
      {uiState === "GAME_OVER" && (
        <span data-ocid="space_shooter.error_state" className="sr-only">
          game over score {uiScore}
        </span>
      )}
      <span className="sr-only">
        Wave {uiWave} | Lives {uiLives} | Score {uiScore}
      </span>
    </div>
  );
}
