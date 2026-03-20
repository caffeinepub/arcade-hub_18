import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;
  cpsPerOwned: number;
  clickPowerBonus: number;
  owned: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  char: string;
  color: string;
  size: number;
}

const UPGRADES_TEMPLATE: Omit<Upgrade, "owned">[] = [
  {
    id: "cursor",
    name: "CURSOR",
    emoji: "🖱️",
    description: "Auto-clicks the cookie",
    baseCost: 15,
    cpsPerOwned: 0.1,
    clickPowerBonus: 0,
  },
  {
    id: "grandma",
    name: "GRANDMA",
    emoji: "👵",
    description: "Bakes cookies lovingly",
    baseCost: 100,
    cpsPerOwned: 0.5,
    clickPowerBonus: 0,
  },
  {
    id: "farm",
    name: "COOKIE FARM",
    emoji: "🌾",
    description: "Grows cookie plants",
    baseCost: 500,
    cpsPerOwned: 2,
    clickPowerBonus: 0,
  },
  {
    id: "factory",
    name: "FACTORY",
    emoji: "🏭",
    description: "Mass produces cookies",
    baseCost: 2000,
    cpsPerOwned: 10,
    clickPowerBonus: 0,
  },
  {
    id: "mine",
    name: "COOKIE MINE",
    emoji: "⛏️",
    description: "Mines cookie ore deep underground",
    baseCost: 10000,
    cpsPerOwned: 50,
    clickPowerBonus: 0,
  },
  {
    id: "alchemy",
    name: "ALCHEMY LAB",
    emoji: "⚗️",
    description: "Transforms gold into cookies",
    baseCost: 75000,
    cpsPerOwned: 200,
    clickPowerBonus: 0,
  },
  {
    id: "portal",
    name: "COOKIE PORTAL",
    emoji: "🌀",
    description: "Opens a rift to a cookie dimension",
    baseCost: 500000,
    cpsPerOwned: 1000,
    clickPowerBonus: 0,
  },
  {
    id: "timemachine",
    name: "TIME MACHINE",
    emoji: "⏰",
    description: "Pulls cookies from the future",
    baseCost: 2000000,
    cpsPerOwned: 5000,
    clickPowerBonus: 0,
  },
  {
    id: "antimatter",
    name: "ANTIMATTER",
    emoji: "⚛️",
    description: "Condenses the universe into cookies",
    baseCost: 15000000,
    cpsPerOwned: 25000,
    clickPowerBonus: 0,
  },
  {
    id: "prism",
    name: "PRISM",
    emoji: "💎",
    description: "Converts light itself into cookies",
    baseCost: 100000000,
    cpsPerOwned: 100000,
    clickPowerBonus: 0,
  },
  // Click power upgrades
  {
    id: "betterclick",
    name: "BETTER CLICK",
    emoji: "👆",
    description: "+1 cookie per click",
    baseCost: 200,
    cpsPerOwned: 0,
    clickPowerBonus: 1,
  },
  {
    id: "goldenclick",
    name: "GOLDEN CLICK",
    emoji: "✨",
    description: "+5 cookies per click",
    baseCost: 5000,
    cpsPerOwned: 0,
    clickPowerBonus: 5,
  },
  {
    id: "diamondclick",
    name: "DIAMOND CLICK",
    emoji: "💠",
    description: "+25 cookies per click",
    baseCost: 50000,
    cpsPerOwned: 0,
    clickPowerBonus: 25,
  },
  {
    id: "meteorclick",
    name: "METEOR CLICK",
    emoji: "☄️",
    description: "+150 cookies per click",
    baseCost: 500000,
    cpsPerOwned: 0,
    clickPowerBonus: 150,
  },
  {
    id: "cosmicclick",
    name: "COSMIC CLICK",
    emoji: "🌌",
    description: "+1,000 cookies per click",
    baseCost: 5000000,
    cpsPerOwned: 0,
    clickPowerBonus: 1000,
  },
];

const MILESTONES = [100, 1000, 10000, 100000, 1000000, 10000000, 1000000000];
const MILESTONE_NAMES: Record<number, string> = {
  100: "Cookie Apprentice",
  1000: "Cookie Baker",
  10000: "Cookie Master",
  100000: "Cookie Overlord",
  1000000: "Cookie God",
  10000000: "Cookie Universe",
  1000000000: "Cookie Singularity",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString();
}

function getUpgradeCost(
  upgrade: Omit<Upgrade, "owned">,
  owned: number,
): number {
  return Math.floor(upgrade.baseCost * 1.15 ** owned);
}

interface Props {
  onGameOver?: (score: number) => void;
}

export default function CookieClickerGame({ onGameOver: _onGameOver }: Props) {
  const [cookies, setCookies] = useState(0);
  const [totalCookies, setTotalCookies] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(
    UPGRADES_TEMPLATE.map((u) => ({ ...u, owned: 0 })),
  );
  const [particles, setParticles] = useState<Particle[]>([]);
  const [cookieScale, setCookieScale] = useState(1);
  const [cookieRotation, setCookieRotation] = useState(0);
  const particleIdRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef(Date.now());
  const cookiesRef = useRef(0);
  const upgradesRef = useRef(upgrades);

  useEffect(() => {
    cookiesRef.current = cookies;
  }, [cookies]);

  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);

  const cps = upgrades.reduce((sum, u) => sum + u.cpsPerOwned * u.owned, 0);
  const clickPower =
    1 + upgrades.reduce((sum, u) => sum + u.clickPowerBonus * u.owned, 0);

  // Game loop for CPS
  useEffect(() => {
    function tick() {
      const now = Date.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      const currentCps = upgradesRef.current.reduce(
        (sum, u) => sum + u.cpsPerOwned * u.owned,
        0,
      );
      if (currentCps > 0) {
        const gained = currentCps * dt;
        setCookies((c) => c + gained);
        setTotalCookies((t) => t + gained);
      }

      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            life: p.life - 1,
          }))
          .filter((p) => p.life > 0),
      );

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Milestone check
  useEffect(() => {
    for (const milestone of MILESTONES) {
      if (totalCookies >= milestone && lastMilestoneRef.current < milestone) {
        lastMilestoneRef.current = milestone;
        toast.success(
          `🍪 ${MILESTONE_NAMES[milestone]}! ${formatNumber(milestone)} cookies baked!`,
          { duration: 3000 },
        );
      }
    }
  }, [totalCookies]);

  const spawnClickParticles = useCallback(
    (clickX: number, clickY: number, power: number) => {
      const CHARS = ["🍪", "+1", "✨", "⭐", "💫", `+${Math.floor(power)}`];
      const newParticles: Particle[] = Array.from({ length: 5 }, () => ({
        id: particleIdRef.current++,
        x: clickX + (Math.random() - 0.5) * 30,
        y: clickY,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 4 + 2),
        life: 40 + Math.random() * 20,
        maxLife: 60,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        color: `hsl(${30 + Math.random() * 30}, 90%, ${55 + Math.random() * 25}%)`,
        size: 10 + Math.random() * 10,
      }));
      setParticles((prev) => [...prev.slice(-60), ...newParticles]);
    },
    [],
  );

  const handleCookieClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      setCookies((c) => c + clickPower);
      setTotalCookies((t) => t + clickPower);
      setCookieScale(0.88);
      setCookieRotation((r) => r + (Math.random() * 6 - 3));
      setTimeout(() => setCookieScale(1.06), 80);
      setTimeout(() => setCookieScale(1), 160);
      spawnClickParticles(clickX, clickY, clickPower);
    },
    [clickPower, spawnClickParticles],
  );

  const buyUpgrade = useCallback((upgradeId: string) => {
    setUpgrades((prev) =>
      prev.map((u) => {
        if (u.id !== upgradeId) return u;
        const cost = getUpgradeCost(u, u.owned);
        if (cookiesRef.current < cost) return u;
        setCookies((c) => c - cost);
        return { ...u, owned: u.owned + 1 };
      }),
    );
  }, []);

  const cpsUpgrades = upgrades.filter((u) => u.cpsPerOwned > 0);
  const clickUpgrades = upgrades.filter((u) => u.clickPowerBonus > 0);

  return (
    <div
      className="flex flex-col md:flex-row w-full gap-0"
      style={{ minHeight: "520px", fontFamily: "'Press Start 2P', monospace" }}
    >
      {/* Left: cookie area */}
      <div
        className="flex-1 flex flex-col items-center justify-start pt-6 pb-4 px-4"
        style={{
          background: "linear-gradient(180deg, #0e1a05 0%, #1a2e0a 100%)",
          borderRight: "2px solid #2a4a10",
          position: "relative",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Pixel grid bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(93,138,44,0.06) 15px, rgba(93,138,44,0.06) 16px),
              repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(93,138,44,0.06) 15px, rgba(93,138,44,0.06) 16px)
            `,
          }}
        />

        {/* Cookie counter */}
        <div className="text-center mb-2 z-10">
          <p
            style={{
              fontSize: "22px",
              color: "#F5C518",
              textShadow: "2px 2px 0 #7a4e00, 0 0 20px #F5C51866",
              lineHeight: 1.2,
            }}
          >
            {formatNumber(Math.floor(cookies))}
          </p>
          <p
            style={{
              fontSize: "8px",
              color: "#a0c060",
              marginTop: "2px",
              letterSpacing: "2px",
            }}
          >
            COOKIES
          </p>
        </div>

        {/* CPS display */}
        <div className="text-center mb-4 z-10">
          <p
            style={{ fontSize: "7px", color: "#7a9a50", letterSpacing: "1px" }}
          >
            {cps.toFixed(1)} per second
          </p>
          <p
            style={{ fontSize: "7px", color: "#6a8a40", letterSpacing: "1px" }}
          >
            {formatNumber(Math.floor(totalCookies))} total baked
          </p>
        </div>

        {/* The Big Cookie */}
        <button
          type="button"
          onClick={handleCookieClick}
          data-ocid="cookie.canvas_target"
          aria-label="Click to bake a cookie"
          style={{
            transform: `scale(${cookieScale}) rotate(${cookieRotation}deg)`,
            transition: "transform 0.06s ease-out",
            cursor: "pointer",
            userSelect: "none",
            position: "relative",
            zIndex: 10,
            background: "none",
            border: "none",
            padding: 0,
            outline: "none",
          }}
        >
          <svg
            width="180"
            height="180"
            viewBox="0 0 16 16"
            role="img"
            aria-label="Pixel art cookie"
            style={{
              imageRendering: "pixelated",
              filter:
                "drop-shadow(0 0 18px #c8760088) drop-shadow(0 4px 8px #00000088)",
            }}
          >
            <title>Pixel art cookie</title>
            <rect x="4" y="1" width="8" height="1" fill="#8B4513" />
            <rect x="2" y="2" width="12" height="1" fill="#A0522D" />
            <rect x="1" y="3" width="14" height="1" fill="#A0522D" />
            <rect x="1" y="4" width="14" height="1" fill="#CD853F" />
            <rect x="1" y="5" width="14" height="1" fill="#D2691E" />
            <rect x="1" y="6" width="14" height="1" fill="#CD853F" />
            <rect x="1" y="7" width="14" height="1" fill="#C8760A" />
            <rect x="1" y="8" width="14" height="1" fill="#CD853F" />
            <rect x="1" y="9" width="14" height="1" fill="#D2691E" />
            <rect x="1" y="10" width="14" height="1" fill="#CD853F" />
            <rect x="1" y="11" width="14" height="1" fill="#C8760A" />
            <rect x="2" y="12" width="12" height="1" fill="#A0522D" />
            <rect x="1" y="12" width="14" height="1" fill="#A0522D" />
            <rect x="2" y="13" width="12" height="1" fill="#8B4513" />
            <rect x="4" y="14" width="8" height="1" fill="#7B3503" />
            {/* Chocolate chips */}
            <rect x="4" y="4" width="2" height="2" fill="#3B1E08" />
            <rect x="9" y="3" width="2" height="2" fill="#3B1E08" />
            <rect x="11" y="7" width="2" height="2" fill="#3B1E08" />
            <rect x="3" y="8" width="2" height="2" fill="#3B1E08" />
            <rect x="7" y="6" width="2" height="2" fill="#3B1E08" />
            <rect x="6" y="10" width="2" height="2" fill="#3B1E08" />
            <rect x="10" y="11" width="2" height="2" fill="#3B1E08" />
            {/* Highlight */}
            <rect
              x="3"
              y="3"
              width="2"
              height="1"
              fill="#E8A87C"
              opacity="0.7"
            />
            <rect
              x="3"
              y="4"
              width="1"
              height="1"
              fill="#E8A87C"
              opacity="0.5"
            />
          </svg>
        </button>

        {/* Click hint */}
        <p
          className="mt-3 z-10"
          style={{ fontSize: "7px", color: "#4a6a30", letterSpacing: "2px" }}
        >
          CLICK THE COOKIE!
        </p>

        {/* Particles layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 20 }}
        >
          {particles.map((p) => (
            <span
              key={p.id}
              style={{
                position: "absolute",
                left: `calc(50% - 90px + ${p.x}px)`,
                top: `${140 + p.y}px`,
                fontSize: `${p.size}px`,
                color: p.color,
                opacity: p.life / p.maxLife,
                pointerEvents: "none",
                transform: "translate(-50%, -50%)",
                textShadow: `0 0 6px ${p.color}`,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {p.char}
            </span>
          ))}
        </div>
      </div>

      {/* Right: upgrades shop */}
      <div
        style={{
          width: "280px",
          minWidth: "240px",
          background: "#0a1208",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Shop header */}
        <div
          style={{
            padding: "10px 12px 8px",
            borderBottom: "2px solid #2a4a10",
            background: "#0e1a05",
          }}
        >
          <p
            style={{
              fontSize: "9px",
              color: "#5D8A2C",
              textShadow: "1px 1px 0 #1a3a00",
              letterSpacing: "2px",
            }}
          >
            🏪 UPGRADES SHOP
          </p>
        </div>

        {/* Upgrades list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {/* CPS Section */}
          <div
            style={{
              fontSize: "7px",
              color: "#4a7a20",
              letterSpacing: "2px",
              padding: "4px 2px 2px",
              borderBottom: "1px solid #1a3a08",
              marginBottom: "2px",
            }}
          >
            ⚙️ AUTO BAKERS
          </div>
          {cpsUpgrades.map((upgrade) => {
            const cost = getUpgradeCost(upgrade, upgrade.owned);
            const canAfford = cookies >= cost;
            const totalCps = upgrade.cpsPerOwned * upgrade.owned;

            return (
              <button
                key={upgrade.id}
                type="button"
                onClick={() => buyUpgrade(upgrade.id)}
                data-ocid={`shop.${upgrade.id}.button`}
                disabled={!canAfford}
                style={{
                  background: canAfford
                    ? "linear-gradient(135deg, #1a3a0a, #2a5a10)"
                    : "linear-gradient(135deg, #111808, #192410)",
                  border: canAfford ? "2px solid #4a7a20" : "2px solid #1a2a10",
                  borderRadius: "2px",
                  padding: "7px 10px",
                  cursor: canAfford ? "pointer" : "not-allowed",
                  opacity: canAfford ? 1 : 0.55,
                  textAlign: "left",
                  transition: "all 0.1s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: canAfford ? "0 0 8px #4a7a2033" : "none",
                }}
              >
                <span style={{ fontSize: "16px", flexShrink: 0 }}>
                  {upgrade.emoji}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "7px",
                        color: canAfford ? "#c8e890" : "#607050",
                        letterSpacing: "1px",
                      }}
                    >
                      {upgrade.name}
                    </span>
                    <span
                      style={{
                        fontSize: "8px",
                        color: canAfford ? "#F5C518" : "#705030",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      ×{upgrade.owned}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "7px",
                        color: canAfford ? "#F5C518" : "#705030",
                        letterSpacing: "0.5px",
                      }}
                    >
                      🍪 {formatNumber(cost)}
                    </span>
                    <span
                      style={{
                        fontSize: "6px",
                        color: "#7a9a50",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {upgrade.owned > 0
                        ? `+${totalCps.toFixed(1)}/s`
                        : `+${upgrade.cpsPerOwned}/s`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Click Power Section */}
          <div
            style={{
              fontSize: "7px",
              color: "#c8901a",
              letterSpacing: "2px",
              padding: "8px 2px 2px",
              borderBottom: "1px solid #3a2808",
              marginBottom: "2px",
              marginTop: "4px",
            }}
          >
            👆 CLICK POWER
          </div>
          {clickUpgrades.map((upgrade) => {
            const cost = getUpgradeCost(upgrade, upgrade.owned);
            const canAfford = cookies >= cost;
            const totalBonus = 1 + upgrade.clickPowerBonus * upgrade.owned;

            return (
              <button
                key={upgrade.id}
                type="button"
                onClick={() => buyUpgrade(upgrade.id)}
                data-ocid={`shop.${upgrade.id}.button`}
                disabled={!canAfford}
                style={{
                  background: canAfford
                    ? "linear-gradient(135deg, #3a2008, #5a3a10)"
                    : "linear-gradient(135deg, #1a1208, #241808)",
                  border: canAfford ? "2px solid #8a5a20" : "2px solid #2a1a08",
                  borderRadius: "2px",
                  padding: "7px 10px",
                  cursor: canAfford ? "pointer" : "not-allowed",
                  opacity: canAfford ? 1 : 0.55,
                  textAlign: "left",
                  transition: "all 0.1s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: canAfford ? "0 0 8px #8a5a2033" : "none",
                }}
              >
                <span style={{ fontSize: "16px", flexShrink: 0 }}>
                  {upgrade.emoji}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "7px",
                        color: canAfford ? "#f0c880" : "#706040",
                        letterSpacing: "1px",
                      }}
                    >
                      {upgrade.name}
                    </span>
                    <span
                      style={{
                        fontSize: "8px",
                        color: canAfford ? "#F5C518" : "#705030",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      ×{upgrade.owned}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "7px",
                        color: canAfford ? "#F5C518" : "#705030",
                        letterSpacing: "0.5px",
                      }}
                    >
                      🍪 {formatNumber(cost)}
                    </span>
                    <span
                      style={{
                        fontSize: "6px",
                        color: "#c8901a",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {upgrade.owned > 0
                        ? `click:+${totalBonus}`
                        : `+${upgrade.clickPowerBonus}/click`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stats footer */}
        <div
          style={{
            padding: "8px 12px",
            borderTop: "2px solid #2a4a10",
            background: "#0e1a05",
          }}
        >
          <p
            style={{ fontSize: "6px", color: "#4a6a30", letterSpacing: "1px" }}
          >
            CPS: {cps.toFixed(1)} | CLICK: +{clickPower}
          </p>
        </div>
      </div>
    </div>
  );
}
