import { Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const TEX_SIZE = 512;

const WEAPONS = [
  {
    id: "laser",
    name: "LASER",
    emoji: "🔴",
    damage: 80,
    color: "#ff4444",
    craterR: 20,
  },
  {
    id: "meteor",
    name: "METEOR",
    emoji: "☄️",
    damage: 150,
    color: "#ff8c00",
    craterR: 45,
  },
  {
    id: "nuke",
    name: "NUKE",
    emoji: "💣",
    damage: 280,
    color: "#00ff88",
    craterR: 72,
  },
  {
    id: "blackhole",
    name: "BLACK HOLE",
    emoji: "🌑",
    damage: 200,
    color: "#aa55ff",
    craterR: 58,
  },
  {
    id: "ice",
    name: "ICE RAY",
    emoji: "❄️",
    damage: 60,
    color: "#55ccff",
    craterR: 17,
  },
];

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function buildPlanetCanvas(generation: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d")!;
  const rng = seededRng(generation + 1);
  const type = generation % 3;

  if (type === 0) {
    // Earth-like
    ctx.fillStyle = "#1a4a8a";
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < 8; i++) {
      const x = rng() * TEX_SIZE;
      const y = rng() * TEX_SIZE;
      const r = 40 + rng() * 80;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(
        0,
        `rgba(${40 + Math.floor(rng() * 30)},${100 + Math.floor(rng() * 60)},${30 + Math.floor(rng() * 20)},0.9)`,
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const capG1 = ctx.createLinearGradient(0, 0, 0, 60);
    capG1.addColorStop(0, "rgba(240,248,255,0.9)");
    capG1.addColorStop(1, "rgba(240,248,255,0)");
    ctx.fillStyle = capG1;
    ctx.fillRect(0, 0, TEX_SIZE, 60);
    const capG2 = ctx.createLinearGradient(0, TEX_SIZE - 60, 0, TEX_SIZE);
    capG2.addColorStop(0, "rgba(240,248,255,0)");
    capG2.addColorStop(1, "rgba(240,248,255,0.9)");
    ctx.fillStyle = capG2;
    ctx.fillRect(0, TEX_SIZE - 60, TEX_SIZE, 60);
  } else if (type === 1) {
    // Mars-like
    ctx.fillStyle = "#8b3a1a";
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < 12; i++) {
      const x = rng() * TEX_SIZE;
      const y = rng() * TEX_SIZE;
      const r = 20 + rng() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const l = Math.floor(rng() * 40);
      g.addColorStop(0, `rgba(${180 + l},${80 + l},${30 + l},0.7)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Gas giant
    const baseG = ctx.createLinearGradient(0, 0, 0, TEX_SIZE);
    baseG.addColorStop(0, "#c8960a");
    baseG.addColorStop(0.3, "#a07020");
    baseG.addColorStop(0.6, "#d4aa40");
    baseG.addColorStop(1, "#8b6010");
    ctx.fillStyle = baseG;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < 10; i++) {
      const y = rng() * TEX_SIZE;
      const h = 10 + rng() * 30;
      const bandG = ctx.createLinearGradient(0, y, 0, y + h);
      const dark = rng() > 0.5;
      bandG.addColorStop(0, dark ? "rgba(60,30,5,0)" : "rgba(255,200,80,0)");
      bandG.addColorStop(
        0.5,
        dark ? "rgba(60,30,5,0.5)" : "rgba(255,200,80,0.4)",
      );
      bandG.addColorStop(1, dark ? "rgba(60,30,5,0)" : "rgba(255,200,80,0)");
      ctx.fillStyle = bandG;
      ctx.fillRect(0, y, TEX_SIZE, h);
    }
  }
  return canvas;
}

function paintCrater(
  ctx: CanvasRenderingContext2D,
  u: number,
  v: number,
  radius: number,
  color: string,
) {
  const x = u * TEX_SIZE;
  const y = v * TEX_SIZE;
  const ring = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2.2);
  ring.addColorStop(0, `${color}00`);
  ring.addColorStop(0.4, `${color}55`);
  ring.addColorStop(1, `${color}00`);
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();
  const crater = ctx.createRadialGradient(x, y, 0, x, y, radius);
  crater.addColorStop(0, "rgba(0,0,0,0.97)");
  crater.addColorStop(0.5, "rgba(15,5,5,0.88)");
  crater.addColorStop(0.85, "rgba(30,15,10,0.5)");
  crater.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = crater;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

interface HitFlash {
  id: number;
  position: THREE.Vector3;
  color: string;
  t: number;
}

interface CameraZSyncProps {
  cameraZRef: React.MutableRefObject<number>;
}

function CameraZSync({ cameraZRef }: CameraZSyncProps) {
  useFrame(({ camera }) => {
    camera.position.z = cameraZRef.current;
    // Keep far clipping plane well beyond camera position for infinite zoom
    (camera as THREE.PerspectiveCamera).far = cameraZRef.current * 10 + 10000;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  });
  return null;
}

interface PlanetSceneProps {
  generation: number;
  planetScale: number;
  weaponRef: React.MutableRefObject<number>;
  onHit: (damage: number) => void;
  exploding: boolean;
  onExplosionDone: () => void;
  cameraZRef: React.MutableRefObject<number>;
}

function PlanetScene({
  generation,
  planetScale,
  weaponRef,
  onHit,
  exploding,
  onExplosionDone,
  cameraZRef,
}: PlanetSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const atmoRef = useRef<THREE.Mesh>(null!);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [flashes, setFlashes] = useState<HitFlash[]>([]);
  const flashIdRef = useRef(0);
  const pointsRef = useRef<THREE.Points>(null!);
  const particlePosRef = useRef<Float32Array | null>(null);
  const particleVelRef = useRef<Float32Array | null>(null);
  const particleColRef = useRef<Float32Array | null>(null);
  const particleAgeRef = useRef<Float32Array | null>(null);
  const explosionInitRef = useRef(false);
  const scaleRef = useRef(planetScale);
  const doneFiredRef = useRef(false);

  const PARTICLE_COUNT = 200;

  useEffect(() => {
    const planetCanvas = buildPlanetCanvas(generation);
    canvasRef.current = planetCanvas;
    ctxRef.current = planetCanvas.getContext("2d");
    const tex = new THREE.CanvasTexture(planetCanvas);
    textureRef.current = tex;
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshPhongMaterial).map = tex;
      (meshRef.current.material as THREE.MeshPhongMaterial).needsUpdate = true;
      meshRef.current.scale.setScalar(planetScale);
    }
    if (atmoRef.current) {
      atmoRef.current.scale.setScalar(planetScale);
    }
    scaleRef.current = planetScale;
    explosionInitRef.current = false;
    doneFiredRef.current = false;
    setFlashes([]);
    return () => {
      tex.dispose();
    };
  }, [generation, planetScale]);

  useEffect(() => {
    if (!exploding) return;
    if (explosionInitRef.current) return;
    explosionInitRef.current = true;
    doneFiredRef.current = false;
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const age = new Float32Array(PARTICLE_COUNT);
    const colors = ["#ff6622", "#ff4400", "#ffaa00", "#ff8800", "#ffff44"];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      const speed = (1 + Math.random() * 4) * planetScale;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      vel[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      vel[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      vel[i * 3 + 2] = speed * Math.cos(phi);
      const c = new THREE.Color(
        colors[Math.floor(Math.random() * colors.length)],
      );
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      age[i] = Math.random() * 0.5;
    }
    particlePosRef.current = pos;
    particleVelRef.current = vel;
    particleColRef.current = col;
    particleAgeRef.current = age;
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      geo.attributes.position.needsUpdate = true;
    }
  }, [exploding, planetScale]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (!exploding) {
      meshRef.current.rotation.y += delta * 0.08;
    } else {
      scaleRef.current = scaleRef.current * (1 - delta * 2);
      if (scaleRef.current < 0.001) scaleRef.current = 0.001;
      meshRef.current.scale.setScalar(scaleRef.current);
      if (atmoRef.current) atmoRef.current.scale.setScalar(scaleRef.current);

      if (
        particlePosRef.current &&
        particleVelRef.current &&
        particleAgeRef.current &&
        pointsRef.current
      ) {
        const pos = particlePosRef.current;
        const vel = particleVelRef.current;
        const age = particleAgeRef.current;
        let maxAge = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          age[i] += delta;
          if (age[i] > maxAge) maxAge = age[i];
          pos[i * 3] += vel[i * 3] * delta;
          pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
          pos[i * 3 + 2] += vel[i * 3 + 2] * delta;
        }
        const geo = pointsRef.current.geometry;
        if (geo.attributes.position) {
          geo.attributes.position.needsUpdate = true;
        }
        if (maxAge > 2.5 && !doneFiredRef.current) {
          doneFiredRef.current = true;
          onExplosionDone();
        }
      }
    }
  });

  const handleClick = useCallback(
    (e: any) => {
      if (exploding) return;
      e.stopPropagation();
      const uv = e.uv as THREE.Vector2 | null;
      if (!uv) return;
      const w = weaponRef.current;
      const weapon = WEAPONS[w];
      if (ctxRef.current && textureRef.current) {
        paintCrater(ctxRef.current, uv.x, uv.y, weapon.craterR, weapon.color);
        textureRef.current.needsUpdate = true;
      }
      const fid = flashIdRef.current++;
      const pos = e.point.clone();
      setFlashes((prev) => [
        ...prev,
        { id: fid, position: pos, color: weapon.color, t: 0 },
      ]);
      setTimeout(
        () => setFlashes((prev) => prev.filter((f) => f.id !== fid)),
        600,
      );
      onHit(weapon.damage);
    },
    [exploding, weaponRef, onHit],
  );

  return (
    <>
      <CameraZSync cameraZRef={cameraZRef} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} color="#fffbe8" />
      <pointLight position={[-4, -3, 4]} intensity={0.4} color="#4466ff" />
      <Stars
        radius={100000}
        depth={50000}
        count={5000}
        factor={4}
        saturation={0}
        fade
      />

      {/* Planet */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: R3F mesh does not support onKeyDown */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        scale={[planetScale, planetScale, planetScale]}
      >
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial shininess={15} />
      </mesh>

      {/* Atmosphere */}
      <mesh ref={atmoRef} scale={[planetScale, planetScale, planetScale]}>
        <sphereGeometry args={[2.08, 32, 32]} />
        <meshPhongMaterial
          color="#4488ff"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Hit flashes */}
      {flashes.map((flash) => (
        <mesh key={flash.id} position={flash.position}>
          <sphereGeometry args={[0.18 * planetScale, 8, 8]} />
          <meshBasicMaterial color={flash.color} transparent opacity={0.8} />
        </mesh>
      ))}

      {/* Explosion particles */}
      {exploding && (
        <points ref={pointsRef}>
          <bufferGeometry />
          <pointsMaterial
            size={0.08 * planetScale}
            vertexColors
            blending={THREE.AdditiveBlending}
            transparent
            depthWrite={false}
          />
        </points>
      )}
    </>
  );
}

interface Props {
  onGameOver: (score: number) => void;
}

export default function SolarSmashGame({ onGameOver: _onGameOver }: Props) {
  const [planetsDestroyed, setPlanetsDestroyed] = useState(0);
  const maxHp = Math.round(1000 * (1 + planetsDestroyed * 0.3));
  const [hp, setHp] = useState(maxHp);
  const [score, setScore] = useState(0);
  const [selectedWeapon, setSelectedWeapon] = useState(0);
  const [exploding, setExploding] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [showDestroyed, setShowDestroyed] = useState(false);
  const [hitScores, setHitScores] = useState<
    { id: number; damage: number; x: number; y: number }[]
  >([]);
  const hitScoreIdRef = useRef(0);
  const selectedWeaponRef = useRef(selectedWeapon);
  const cameraZRef = useRef(6);
  const containerRef = useRef<HTMLDivElement>(null);

  // Planet scale grows 30% each destruction
  const planetScale = 1 + planetsDestroyed * 0.3;

  useEffect(() => {
    selectedWeaponRef.current = selectedWeapon;
  }, [selectedWeapon]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Zoom speed scales with distance for comfortable infinite zoom
      cameraZRef.current = Math.max(
        0.1,
        cameraZRef.current +
          e.deltaY * 0.01 * Math.max(1, cameraZRef.current * 0.15),
      );
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleHit = useCallback((damage: number) => {
    setHp((prev) => {
      const next = Math.max(0, prev - damage);
      if (next === 0 && prev > 0) {
        setExploding(true);
        setShowDestroyed(true);
      }
      return next;
    });
    setScore((prev) => prev + damage);
    const id = hitScoreIdRef.current++;
    const x = 280 + Math.random() * 80;
    const y = 200 + Math.random() * 120;
    setHitScores((prev) => [...prev, { id, damage, x, y }]);
    setTimeout(
      () => setHitScores((prev) => prev.filter((h) => h.id !== id)),
      900,
    );
  }, []);

  const handleExplosionDone = useCallback(() => {
    setPlanetsDestroyed((d) => {
      const nextD = d + 1;
      const nextMaxHp = Math.round(1000 * (1 + nextD * 0.3));
      setHp(nextMaxHp);
      return nextD;
    });
    setExploding(false);
    setShowDestroyed(false);
    setGeneration((g) => g + 1);
    setScore((s) => s + 500);
  }, []);

  const hpPct = hp / maxHp;
  const hpColor = hpPct > 0.6 ? "#44ff88" : hpPct > 0.3 ? "#ffaa00" : "#ff4444";

  return (
    <div
      ref={containerRef}
      style={{
        width: 640,
        height: 520,
        position: "relative",
        background: "#000010",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes solar-popup {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.7); }
        }
        @keyframes solar-flash {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
      `}</style>

      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
      >
        <PlanetScene
          generation={generation}
          planetScale={planetScale}
          weaponRef={selectedWeaponRef}
          onHit={handleHit}
          exploding={exploding}
          onExplosionDone={handleExplosionDone}
          cameraZRef={cameraZRef}
        />
      </Canvas>

      {/* HP bar */}
      <div style={{ position: "absolute", top: 12, left: 12, width: 180 }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: "#aaa",
            marginBottom: 4,
            letterSpacing: 1,
          }}
        >
          PLANET HP
        </div>
        <div
          style={{
            background: "rgba(0,0,0,0.6)",
            border: "1px solid #333",
            borderRadius: 4,
            height: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${hpPct * 100}%`,
              height: "100%",
              background: hpColor,
              transition: "width 0.15s, background 0.3s",
              boxShadow: `0 0 8px ${hpColor}88`,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: hpColor,
            marginTop: 2,
          }}
        >
          {hp} / {maxHp}
        </div>
      </div>

      {/* Score + size indicator */}
      <div
        style={{ position: "absolute", top: 12, right: 12, textAlign: "right" }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 18,
            color: "#ffd700",
            fontWeight: "bold",
            textShadow: "0 0 10px #ffd70088",
          }}
        >
          {score.toLocaleString()}
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: "#888",
            marginTop: 2,
          }}
        >
          🪐 {planetsDestroyed} destroyed
        </div>
        {planetsDestroyed > 0 && (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: "#ff9944",
              marginTop: 1,
            }}
          >
            SIZE x{planetScale.toFixed(1)}
          </div>
        )}
      </div>

      {/* Floating hit scores */}
      {hitScores.map((h) => (
        <div
          key={h.id}
          style={{
            position: "absolute",
            left: h.x,
            top: h.y,
            fontFamily: "monospace",
            fontSize: 16,
            fontWeight: "bold",
            color: WEAPONS[selectedWeapon].color,
            textShadow: `0 0 8px ${WEAPONS[selectedWeapon].color}`,
            pointerEvents: "none",
            animation: "solar-popup 0.9s ease-out forwards",
            zIndex: 20,
          }}
        >
          +{h.damage}
        </div>
      ))}

      {/* Planet destroyed banner */}
      {showDestroyed && (
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: "monospace",
            fontSize: 24,
            fontWeight: "bold",
            color: "#ff4444",
            textShadow: "0 0 20px #ff444488, 0 0 40px #ff000066",
            animation: "solar-flash 0.5s ease-in-out infinite",
            whiteSpace: "nowrap",
            zIndex: 30,
            letterSpacing: 2,
          }}
        >
          💥 PLANET DESTROYED!
        </div>
      )}

      {/* Zoom hint */}
      <div
        style={{
          position: "absolute",
          bottom: 68,
          right: 10,
          fontFamily: "monospace",
          fontSize: 9,
          color: "rgba(255,255,255,0.3)",
          pointerEvents: "none",
          letterSpacing: 0.5,
        }}
      >
        scroll to zoom
      </div>

      {/* Weapon bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "8px 12px",
          background: "rgba(0,0,0,0.75)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {WEAPONS.map((w, i) => (
          <button
            key={w.id}
            type="button"
            data-ocid={`solar.weapon.${(i + 1) as 1 | 2 | 3 | 4 | 5}`}
            onClick={() => setSelectedWeapon(i)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "6px 10px",
              background:
                selectedWeapon === i
                  ? `${w.color}22`
                  : "rgba(255,255,255,0.05)",
              border: `2px solid ${selectedWeapon === i ? w.color : "rgba(255,255,255,0.1)"}`,
              borderRadius: 6,
              cursor: "pointer",
              boxShadow:
                selectedWeapon === i ? `0 0 12px ${w.color}66` : "none",
              transition: "all 0.15s",
              minWidth: 78,
            }}
          >
            <span style={{ fontSize: 20 }}>{w.emoji}</span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                color: selectedWeapon === i ? w.color : "#aaa",
                letterSpacing: 1,
              }}
            >
              {w.name}
            </span>
            <span
              style={{ fontFamily: "monospace", fontSize: 9, color: "#666" }}
            >
              -{w.damage} HP
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
