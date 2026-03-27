import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { playClick, playCombo, playPowerUp, playWin } from "../utils/sound";

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

interface LeaderboardEntry {
  name: string;
  views: number;
  date: string;
}

interface GoldenVideo {
  active: boolean;
  multiplier: number;
  timeLeft: number; // seconds
  maxTime: number;
}

const UPGRADES_TEMPLATE: Omit<Upgrade, "owned">[] = [
  {
    id: "thumbnail",
    name: "THUMBNAIL DESIGNER",
    emoji: "🎨",
    description: "Better thumbnails get more clicks",
    baseCost: 15,
    cpsPerOwned: 0.1,
    clickPowerBonus: 0,
  },
  {
    id: "editor",
    name: "VIDEO EDITOR",
    emoji: "✂️",
    description: "Polished cuts get more watch time",
    baseCost: 100,
    cpsPerOwned: 0.5,
    clickPowerBonus: 0,
  },
  {
    id: "collab",
    name: "COLLAB PARTNER",
    emoji: "🤝",
    description: "Grow each other's audience",
    baseCost: 500,
    cpsPerOwned: 2,
    clickPowerBonus: 0,
  },
  {
    id: "sponsor",
    name: "SPONSORSHIP",
    emoji: "💰",
    description: "Brands pay to promote your channel",
    baseCost: 2000,
    cpsPerOwned: 10,
    clickPowerBonus: 0,
  },
  {
    id: "algorithm",
    name: "ALGORITHM HACK",
    emoji: "🤖",
    description: "Game the YouTube algorithm",
    baseCost: 10000,
    cpsPerOwned: 50,
    clickPowerBonus: 0,
  },
  {
    id: "viral",
    name: "VIRAL VIDEO",
    emoji: "🔥",
    description: "That one video that blows up",
    baseCost: 75000,
    cpsPerOwned: 200,
    clickPowerBonus: 0,
  },
  {
    id: "merch",
    name: "MERCH LINE",
    emoji: "👕",
    description: "Turn subscribers into revenue",
    baseCost: 500000,
    cpsPerOwned: 1000,
    clickPowerBonus: 0,
  },
  {
    id: "studio",
    name: "YOUTUBE STUDIO",
    emoji: "🏢",
    description: "Professional production setup",
    baseCost: 2000000,
    cpsPerOwned: 5000,
    clickPowerBonus: 0,
  },
  {
    id: "network",
    name: "MCN DEAL",
    emoji: "📡",
    description: "Multi-channel network deal",
    baseCost: 15000000,
    cpsPerOwned: 25000,
    clickPowerBonus: 0,
  },
  {
    id: "trending",
    name: "TRENDING #1",
    emoji: "🏆",
    description: "Top of YouTube trending page",
    baseCost: 100000000,
    cpsPerOwned: 100000,
    clickPowerBonus: 0,
  },
  {
    id: "clickbait",
    name: "CLICKBAIT TITLE",
    emoji: "🎯",
    description: "+1 view per click",
    baseCost: 200,
    cpsPerOwned: 0,
    clickPowerBonus: 1,
  },
  {
    id: "hd",
    name: "4K VIDEO",
    emoji: "📹",
    description: "+5 views per click",
    baseCost: 5000,
    cpsPerOwned: 0,
    clickPowerBonus: 5,
  },
  {
    id: "shorts",
    name: "YOUTUBE SHORTS",
    emoji: "📱",
    description: "+25 views per click",
    baseCost: 50000,
    cpsPerOwned: 0,
    clickPowerBonus: 25,
  },
  {
    id: "premiere",
    name: "PREMIERE EVENT",
    emoji: "🎬",
    description: "+150 views per click",
    baseCost: 500000,
    cpsPerOwned: 0,
    clickPowerBonus: 150,
  },
  {
    id: "livestream",
    name: "LIVE STREAM",
    emoji: "🔴",
    description: "+1,000 views per click",
    baseCost: 5000000,
    cpsPerOwned: 0,
    clickPowerBonus: 1000,
  },
];

const MILESTONES = [100, 1000, 10000, 100000, 1000000, 10000000, 1000000000];
const MILESTONE_NAMES: Record<number, string> = {
  100: "Small Creator",
  1000: "Rising Star",
  10000: "Monetized!",
  100000: "Going Viral",
  1000000: "1M Club",
  10000000: "YouTube Famous",
  1000000000: "1 Billion Views!",
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

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const stored = localStorage.getItem("tube-clicker-leaderboard");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  localStorage.setItem("tube-clicker-leaderboard", JSON.stringify(entries));
}

const GOLDEN_MULTIPLIERS = [2, 3, 5, 7, 10];
const GOLDEN_DURATION = 15; // seconds
// Spawn interval: random between 45-90 seconds
const GOLDEN_MIN_INTERVAL = 45;
const GOLDEN_MAX_INTERVAL = 90;

interface Props {
  onGameOver?: (score: number) => void;
  isFullscreen?: boolean;
}

export default function TubeClickerGame({
  onGameOver: _onGameOver,
  isFullscreen = false,
}: Props) {
  const [views, setViews] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(
    UPGRADES_TEMPLATE.map((u) => ({ ...u, owned: 0 })),
  );
  const [particles, setParticles] = useState<Particle[]>([]);
  const [videoScale, setVideoScale] = useState(1);
  const [videoRotation, setVideoRotation] = useState(0);
  const particleIdRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef(Date.now());
  const viewsRef = useRef(0);
  const upgradesRef = useRef(upgrades);

  // Golden video state
  const [goldenVideo, setGoldenVideo] = useState<GoldenVideo>({
    active: false,
    multiplier: 2,
    timeLeft: 0,
    maxTime: GOLDEN_DURATION,
  });
  const goldenRef = useRef(goldenVideo);
  const goldenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextGoldenRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>(loadLeaderboard);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(false);
  const [lastSavedViews, setLastSavedViews] = useState<number | null>(null);

  const scale = isFullscreen ? 1.6 : 1;
  const fs = (base: number) => Math.round(base * scale);

  useEffect(() => {
    viewsRef.current = views;
  }, [views]);

  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);

  useEffect(() => {
    goldenRef.current = goldenVideo;
  }, [goldenVideo]);

  const cps = upgrades.reduce((sum, u) => sum + u.cpsPerOwned * u.owned, 0);
  const clickPower =
    1 + upgrades.reduce((sum, u) => sum + u.clickPowerBonus * u.owned, 0);

  // Schedule golden video spawn
  const scheduleNextGolden = useCallback(() => {
    if (nextGoldenRef.current) clearTimeout(nextGoldenRef.current);
    const delay =
      (GOLDEN_MIN_INTERVAL +
        Math.random() * (GOLDEN_MAX_INTERVAL - GOLDEN_MIN_INTERVAL)) *
      1000;
    nextGoldenRef.current = setTimeout(() => {
      const multiplier =
        GOLDEN_MULTIPLIERS[
          Math.floor(Math.random() * GOLDEN_MULTIPLIERS.length)
        ];
      playCombo();
      setGoldenVideo({
        active: true,
        multiplier,
        timeLeft: GOLDEN_DURATION,
        maxTime: GOLDEN_DURATION,
      });
      toast(
        `⭐ GOLDEN VIDEO! ${multiplier}x multiplier for ${GOLDEN_DURATION}s! Click now!`,
        { duration: 4000 },
      );
    }, delay);
  }, []);

  // Start scheduling golden videos on mount
  useEffect(() => {
    scheduleNextGolden();
    return () => {
      if (nextGoldenRef.current) clearTimeout(nextGoldenRef.current);
      if (goldenTimerRef.current) clearInterval(goldenTimerRef.current);
    };
  }, [scheduleNextGolden]);

  // Countdown timer for active golden video
  useEffect(() => {
    if (goldenVideo.active) {
      if (goldenTimerRef.current) clearInterval(goldenTimerRef.current);
      goldenTimerRef.current = setInterval(() => {
        setGoldenVideo((prev) => {
          if (!prev.active) return prev;
          const next = prev.timeLeft - 1;
          if (next <= 0) {
            if (goldenTimerRef.current) clearInterval(goldenTimerRef.current);
            scheduleNextGolden();
            return { ...prev, active: false, timeLeft: 0 };
          }
          return { ...prev, timeLeft: next };
        });
      }, 1000);
    }
    return () => {
      if (goldenTimerRef.current) clearInterval(goldenTimerRef.current);
    };
  }, [goldenVideo.active, scheduleNextGolden]);

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
        const multiplier = goldenRef.current.active
          ? goldenRef.current.multiplier
          : 1;
        const gained = currentCps * dt * multiplier;
        setViews((c) => c + gained);
        setTotalViews((t) => t + gained);
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
      if (totalViews >= milestone && lastMilestoneRef.current < milestone) {
        lastMilestoneRef.current = milestone;
        toast.success(
          `📺 ${MILESTONE_NAMES[milestone]}! ${formatNumber(milestone)} views!`,
          { duration: 3000 },
        );
      }
    }
  }, [totalViews]);

  const spawnClickParticles = useCallback(
    (clickX: number, clickY: number, power: number) => {
      const isGolden = goldenRef.current.active;
      const CHARS = isGolden
        ? [
            "⭐",
            "💛",
            "✨",
            "🌟",
            `x${goldenRef.current.multiplier}`,
            `+${formatNumber(power * goldenRef.current.multiplier)}`,
          ]
        : ["📺", "❤️", "👍", "💬", "⭐", `+${Math.floor(power)}`];
      const newParticles: Particle[] = Array.from(
        { length: isGolden ? 8 : 5 },
        () => ({
          id: particleIdRef.current++,
          x: clickX + (Math.random() - 0.5) * 30,
          y: clickY,
          vx: (Math.random() - 0.5) * 4,
          vy: -(Math.random() * 4 + 2),
          life: 40 + Math.random() * 20,
          maxLife: 60,
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          color: isGolden
            ? `hsl(${40 + Math.random() * 20}, 100%, ${55 + Math.random() * 20}%)`
            : `hsl(${Math.random() > 0.5 ? 0 : 30}, 90%, ${55 + Math.random() * 25}%)`,
          size: 10 + Math.random() * (isGolden ? 14 : 10),
        }),
      );
      setParticles((prev) => [...prev.slice(-60), ...newParticles]);
    },
    [],
  );

  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const multiplier = goldenRef.current.active
        ? goldenRef.current.multiplier
        : 1;
      const gained = clickPower * multiplier;
      setViews((c) => c + gained);
      setTotalViews((t) => t + gained);
      setVideoScale(0.88);
      setVideoRotation((r) => r + (Math.random() * 6 - 3));
      setTimeout(() => setVideoScale(1.06), 80);
      setTimeout(() => setVideoScale(1), 160);
      spawnClickParticles(clickX, clickY, clickPower);
    },
    [clickPower, spawnClickParticles],
  );

  const buyUpgrade = useCallback((upgradeId: string) => {
    playPowerUp();
    setUpgrades((prev) =>
      prev.map((u) => {
        if (u.id !== upgradeId) return u;
        const cost = getUpgradeCost(u, u.owned);
        if (viewsRef.current < cost) return u;
        setViews((c) => c - cost);
        return { ...u, owned: u.owned + 1 };
      }),
    );
  }, []);

  function handleSaveScore() {
    const trimmed = saveName.trim().slice(0, 16) || "YOUTUBER";
    const entry: LeaderboardEntry = {
      name: trimmed,
      views: Math.floor(totalViews),
      date: new Date().toLocaleDateString(),
    };
    const updated = [...leaderboard, entry]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    setLeaderboard(updated);
    saveLeaderboard(updated);
    setLastSavedViews(Math.floor(totalViews));
    setSavedThisSession(true);
    setShowSaveInput(false);
    setShowLeaderboard(true);
  }

  const cpsUpgrades = upgrades.filter((u) => u.cpsPerOwned > 0);
  const clickUpgrades = upgrades.filter((u) => u.clickPowerBonus > 0);

  const isInTopTen =
    savedThisSession &&
    lastSavedViews !== null &&
    leaderboard.some((e) => e.views === lastSavedViews);

  // Subscribers = roughly 1% of total views
  const subscribers = Math.floor(totalViews * 0.01);

  const goldenBarWidth = goldenVideo.active
    ? (goldenVideo.timeLeft / goldenVideo.maxTime) * 100
    : 0;

  return (
    <div
      className="flex flex-col md:flex-row w-full gap-0"
      style={{
        minHeight: `${fs(520)}px`,
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Left: video area */}
      <div
        className="flex-1 flex flex-col items-center justify-start pb-4 px-4"
        style={{
          paddingTop: `${fs(24)}px`,
          background: goldenVideo.active
            ? "linear-gradient(180deg, #1a1000 0%, #2a1800 100%)"
            : "linear-gradient(180deg, #0e0404 0%, #1a0808 100%)",
          borderRight: "2px solid #3a0a0a",
          position: "relative",
          overflow: "hidden",
          minWidth: 0,
          transition: "background 0.5s ease",
        }}
      >
        {/* Pixel grid bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: goldenVideo.active
              ? `
                repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,200,0,0.06) 15px, rgba(255,200,0,0.06) 16px),
                repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(255,200,0,0.06) 15px, rgba(255,200,0,0.06) 16px)
              `
              : `
                repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,0,0,0.04) 15px, rgba(255,0,0,0.04) 16px),
                repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(255,0,0,0.04) 15px, rgba(255,0,0,0.04) 16px)
              `,
          }}
        />

        {/* Golden Video Banner */}
        {goldenVideo.active && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              background: "linear-gradient(90deg, #7a5500, #FFD700, #7a5500)",
              padding: `${fs(4)}px ${fs(8)}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 12px #FFD70088",
            }}
          >
            <span
              style={{
                fontSize: `${fs(7)}px`,
                color: "#1a0a00",
                textShadow: "none",
                fontFamily: "inherit",
                animation: "pulse 0.8s ease-in-out infinite alternate",
              }}
            >
              ⭐ GOLDEN VIDEO x{goldenVideo.multiplier}!
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: `${fs(6)}px`,
              }}
            >
              <div
                style={{
                  width: `${fs(80)}px`,
                  height: `${fs(6)}px`,
                  background: "#3a2000",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${goldenBarWidth}%`,
                    height: "100%",
                    background: "#1a0a00",
                    transition: "width 1s linear",
                    borderRadius: "3px",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: `${fs(7)}px`,
                  color: "#1a0a00",
                  fontFamily: "inherit",
                  minWidth: `${fs(22)}px`,
                }}
              >
                {goldenVideo.timeLeft}s
              </span>
            </div>
          </div>
        )}

        {/* Views counter */}
        <div
          className="text-center mb-2 z-10"
          style={{ marginTop: goldenVideo.active ? `${fs(32)}px` : 0 }}
        >
          <p
            style={{
              fontSize: `${fs(22)}px`,
              color: goldenVideo.active ? "#FFD700" : "#FF0000",
              textShadow: goldenVideo.active
                ? "2px 2px 0 #7a5500, 0 0 20px #FFD70066"
                : "2px 2px 0 #7a0000, 0 0 20px #FF000066",
              lineHeight: 1.2,
              transition: "color 0.3s, text-shadow 0.3s",
            }}
          >
            {formatNumber(Math.floor(views))}
          </p>
          <p
            style={{
              fontSize: `${fs(8)}px`,
              color: goldenVideo.active ? "#ffdd60" : "#ff6060",
              marginTop: "2px",
              letterSpacing: "2px",
            }}
          >
            VIEWS
          </p>
        </div>

        {/* Stats display */}
        <div className="text-center mb-4 z-10">
          <p
            style={{
              fontSize: `${fs(7)}px`,
              color: goldenVideo.active ? "#cc9900" : "#aa4444",
              letterSpacing: "1px",
            }}
          >
            {goldenVideo.active
              ? `${(cps * goldenVideo.multiplier).toFixed(1)} views/sec (x${goldenVideo.multiplier}!)`
              : `${cps.toFixed(1)} views/sec`}
          </p>
          <p
            style={{
              fontSize: `${fs(7)}px`,
              color: "#884444",
              letterSpacing: "1px",
              marginTop: "2px",
            }}
          >
            {formatNumber(subscribers)} subscribers
          </p>
          <p
            style={{
              fontSize: `${fs(7)}px`,
              color: "#664444",
              letterSpacing: "1px",
              marginTop: "2px",
            }}
          >
            total: {formatNumber(Math.floor(totalViews))}
          </p>
        </div>

        {/* Video click target */}
        <div
          className="relative z-10"
          style={{
            transform: `scale(${videoScale}) rotate(${videoRotation}deg)`,
            transition: "transform 0.08s ease",
            transformOrigin: "center center",
            filter: goldenVideo.active
              ? "drop-shadow(0 0 16px #FFD700)"
              : "none",
          }}
        >
          <button
            type="button"
            onClick={handleVideoClick}
            data-ocid="tube_clicker.canvas_target"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "block",
            }}
            aria-label="Click to earn views"
          >
            <svg
              width={fs(220)}
              height={fs(150)}
              viewBox="0 0 220 150"
              role="img"
              aria-label="YouTube video player"
              style={{ display: "block", imageRendering: "pixelated" }}
            >
              {/* Video player background */}
              <rect
                x="0"
                y="0"
                width="220"
                height="150"
                rx="4"
                fill={goldenVideo.active ? "#1a1000" : "#111"}
              />
              <rect
                x="2"
                y="2"
                width="216"
                height="146"
                rx="3"
                fill={goldenVideo.active ? "#2a1800" : "#1a1a1a"}
              />

              {/* Gradient overlay */}
              <defs>
                <linearGradient id="vidGrad" x1="0" y1="0" x2="0" y2="1">
                  {goldenVideo.active ? (
                    <>
                      <stop offset="0%" stopColor="#3a2000" stopOpacity="0.7" />
                      <stop
                        offset="100%"
                        stopColor="#1a0a00"
                        stopOpacity="0.9"
                      />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#300000" stopOpacity="0.6" />
                      <stop
                        offset="100%"
                        stopColor="#0a0000"
                        stopOpacity="0.9"
                      />
                    </>
                  )}
                </linearGradient>
                {goldenVideo.active && (
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )}
              </defs>
              <rect
                x="2"
                y="2"
                width="216"
                height="130"
                rx="3"
                fill="url(#vidGrad)"
              />

              {/* Golden shimmer frame */}
              {goldenVideo.active && (
                <rect
                  x="1"
                  y="1"
                  width="218"
                  height="148"
                  rx="4"
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="2"
                  opacity="0.8"
                />
              )}

              {/* Pixel grid lines */}
              {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1="2"
                  x2={x}
                  y2="130"
                  stroke={goldenVideo.active ? "#FFD70008" : "#FF000008"}
                  strokeWidth="1"
                />
              ))}
              {[20, 40, 60, 80, 100, 120].map((y) => (
                <line
                  key={y}
                  x1="2"
                  y1={y}
                  x2="218"
                  y2={y}
                  stroke={goldenVideo.active ? "#FFD70008" : "#FF000008"}
                  strokeWidth="1"
                />
              ))}

              {/* Big play button */}
              <polygon
                points="80,42 80,108 160,75"
                fill={goldenVideo.active ? "#FFD700" : "#FF0000"}
                opacity="0.9"
                filter={goldenVideo.active ? "url(#glow)" : undefined}
              />
              <polygon
                points="80,42 80,65 130,53"
                fill={goldenVideo.active ? "#FFEEAA" : "#FF4444"}
                opacity="0.5"
              />

              {/* YouTube logo top-left */}
              <rect
                x="6"
                y="6"
                width="32"
                height="20"
                rx="4"
                fill={goldenVideo.active ? "#FFD700" : "#FF0000"}
              />
              <polygon
                points="14,9 14,23 28,16"
                fill={goldenVideo.active ? "#1a0a00" : "white"}
              />

              {/* Golden star overlay */}
              {goldenVideo.active && (
                <text
                  x="180"
                  y="30"
                  fontSize="20"
                  textAnchor="middle"
                  fill="#FFD700"
                  opacity="0.9"
                >
                  ⭐
                </text>
              )}

              {/* Progress bar at bottom */}
              <rect x="2" y="130" width="216" height="18" fill="#111" />
              <rect
                x="2"
                y="133"
                width="130"
                height="4"
                rx="2"
                fill={goldenVideo.active ? "#FFD700" : "#FF0000"}
              />
              <rect x="2" y="133" width="216" height="4" rx="2" fill="#333" />
              <rect
                x="2"
                y="133"
                width="130"
                height="4"
                rx="2"
                fill={goldenVideo.active ? "#FFD700" : "#FF0000"}
              />
              <circle
                cx="132"
                cy="135"
                r="6"
                fill={goldenVideo.active ? "#FFD700" : "#FF0000"}
              />

              {/* Video title area */}
              <rect x="6" y="138" width="80" height="5" rx="2" fill="#444" />
              <rect x="6" y="144" width="50" height="3" rx="1" fill="#333" />

              {/* View count bottom right */}
              <rect x="170" y="138" width="46" height="9" rx="2" fill="#222" />
            </svg>
          </button>
        </div>

        <p
          style={{
            fontSize: `${fs(7)}px`,
            color: goldenVideo.active ? "#cc9900" : "#664444",
            marginTop: `${fs(10)}px`,
            letterSpacing: "1px",
            zIndex: 10,
          }}
        >
          +
          {formatNumber(
            goldenVideo.active
              ? clickPower * goldenVideo.multiplier
              : clickPower,
          )}{" "}
          per click
          {goldenVideo.active && ` (x${goldenVideo.multiplier})`}
        </p>

        {/* Particles */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 20, overflow: "hidden" }}
        >
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `calc(50% + ${p.x - 110}px)`,
                top: `calc(50% + ${p.y - 75}px)`,
                fontSize: `${p.size}px`,
                color: p.color,
                opacity: p.life / p.maxLife,
                pointerEvents: "none",
                userSelect: "none",
                fontFamily: "monospace",
                fontWeight: "bold",
                textShadow: `0 0 4px ${p.color}`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {p.char}
            </div>
          ))}
        </div>
      </div>

      {/* Right: shop */}
      <div
        style={{
          width: `${fs(300)}px`,
          minWidth: `${fs(260)}px`,
          background: "linear-gradient(180deg, #0a0404 0%, #150808 100%)",
          borderLeft: "2px solid #3a0a0a",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Shop header */}
        <div
          style={{
            padding: `${fs(10)}px ${fs(12)}px`,
            borderBottom: "2px solid #3a0a0a",
            background: "#0e0505",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: `${fs(9)}px`,
              color: "#FF0000",
              letterSpacing: "2px",
              textShadow: "1px 1px 0 #7a0000",
            }}
          >
            📺 UPGRADES
          </span>
          <button
            type="button"
            onClick={() => setShowLeaderboard((s) => !s)}
            data-ocid="tube_clicker.open_modal_button"
            style={{
              background: showLeaderboard ? "#FF0000" : "#2a0808",
              border: "1px solid #FF0000",
              color: showLeaderboard ? "white" : "#FF0000",
              cursor: "pointer",
              fontSize: `${fs(8)}px`,
              padding: `${fs(3)}px ${fs(6)}px`,
              fontFamily: "inherit",
            }}
          >
            🏆
          </button>
        </div>

        {/* Leaderboard panel */}
        {showLeaderboard && (
          <div
            data-ocid="tube_clicker.panel"
            style={{
              background: "#0e0505",
              borderBottom: "2px solid #3a0a0a",
              padding: `${fs(10)}px`,
            }}
          >
            <p
              style={{
                fontSize: `${fs(8)}px`,
                color: "#FF4444",
                letterSpacing: "2px",
                marginBottom: `${fs(6)}px`,
              }}
            >
              🏆 TOP CREATORS
            </p>
            {leaderboard.length === 0 && (
              <p
                style={{
                  fontSize: `${fs(7)}px`,
                  color: "#664444",
                  marginBottom: `${fs(6)}px`,
                }}
              >
                No entries yet!
              </p>
            )}
            {leaderboard.map((entry, i) => (
              <div
                key={`${entry.name}-${entry.views}-${i}`}
                data-ocid={`tube_clicker.item.${i + 1}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: `${fs(6)}px`,
                  color:
                    i === 0
                      ? "#FFD700"
                      : i === 1
                        ? "#C0C0C0"
                        : i === 2
                          ? "#CD7F32"
                          : "#884444",
                  marginBottom: `${fs(3)}px`,
                  padding: `${fs(2)}px`,
                  background:
                    isInTopTen && entry.views === lastSavedViews
                      ? "#2a0808"
                      : "transparent",
                }}
              >
                <span>
                  #{i + 1} {entry.name}
                </span>
                <span>{formatNumber(entry.views)}</span>
              </div>
            ))}

            {/* Save score */}
            {!savedThisSession ? (
              !showSaveInput ? (
                <button
                  type="button"
                  onClick={() => setShowSaveInput(true)}
                  data-ocid="tube_clicker.secondary_button"
                  style={{
                    marginTop: `${fs(6)}px`,
                    width: "100%",
                    background: "#2a0808",
                    border: "1px solid #FF0000",
                    color: "#FF4444",
                    cursor: "pointer",
                    fontSize: `${fs(6)}px`,
                    padding: `${fs(4)}px`,
                    fontFamily: "inherit",
                  }}
                >
                  SAVE MY SCORE
                </button>
              ) : (
                <div style={{ marginTop: `${fs(6)}px` }}>
                  <input
                    type="text"
                    placeholder="YOUR NAME"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveScore()}
                    data-ocid="tube_clicker.input"
                    maxLength={16}
                    style={{
                      width: "100%",
                      background: "#1a0808",
                      border: "1px solid #FF0000",
                      color: "#FF4444",
                      fontSize: `${fs(6)}px`,
                      padding: `${fs(3)}px`,
                      fontFamily: "inherit",
                      marginBottom: `${fs(3)}px`,
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveScore}
                    data-ocid="tube_clicker.submit_button"
                    style={{
                      width: "100%",
                      background: "#FF0000",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontSize: `${fs(6)}px`,
                      padding: `${fs(4)}px`,
                      fontFamily: "inherit",
                    }}
                  >
                    SAVE
                  </button>
                </div>
              )
            ) : (
              <p
                style={{
                  marginTop: `${fs(6)}px`,
                  fontSize: `${fs(6)}px`,
                  color: "#FF4444",
                  textAlign: "center",
                }}
              >
                {isInTopTen ? "✅ YOU MADE IT!" : "SCORE SAVED!"}
              </p>
            )}
          </div>
        )}

        {/* Upgrades list */}
        <div style={{ flex: 1, overflowY: "auto", padding: `${fs(8)}px` }}>
          {/* Auto Views section */}
          <p
            style={{
              fontSize: `${fs(7)}px`,
              color: "#FF0000",
              letterSpacing: "2px",
              marginBottom: `${fs(6)}px`,
              textShadow: "1px 1px 0 #7a0000",
            }}
          >
            📺 AUTO VIEWS
          </p>
          {cpsUpgrades.map((u) => {
            const cost = getUpgradeCost(u, u.owned);
            const canAfford = Math.floor(views) >= cost;
            return (
              <button
                type="button"
                key={u.id}
                onClick={() => buyUpgrade(u.id)}
                data-ocid="tube_clicker.button"
                disabled={!canAfford}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: canAfford ? "#2a0808" : "#0e0404",
                  border: `1px solid ${canAfford ? "#FF0000" : "#3a0a0a"}`,
                  color: canAfford ? "#ff8080" : "#664444",
                  cursor: canAfford ? "pointer" : "not-allowed",
                  fontSize: `${fs(6)}px`,
                  padding: `${fs(5)}px ${fs(7)}px`,
                  marginBottom: `${fs(4)}px`,
                  fontFamily: "inherit",
                  display: "block",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2px",
                  }}
                >
                  <span>
                    {u.emoji} {u.name}
                  </span>
                  <span style={{ color: canAfford ? "#FF4444" : "#553333" }}>
                    {u.owned > 0 && `[${u.owned}]`}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{
                      color: canAfford ? "#884444" : "#442222",
                      fontSize: `${fs(5)}px`,
                    }}
                  >
                    {u.description}
                  </span>
                  <span style={{ color: canAfford ? "#FFAA00" : "#664422" }}>
                    {formatNumber(cost)} 👁️
                  </span>
                </div>
              </button>
            );
          })}

          {/* Click Power section */}
          <p
            style={{
              fontSize: `${fs(7)}px`,
              color: "#FF6600",
              letterSpacing: "2px",
              margin: `${fs(10)}px 0 ${fs(6)}px`,
              textShadow: "1px 1px 0 #7a3300",
            }}
          >
            👆 CLICK POWER
          </p>
          {clickUpgrades.map((u) => {
            const cost = getUpgradeCost(u, u.owned);
            const canAfford = Math.floor(views) >= cost;
            return (
              <button
                type="button"
                key={u.id}
                onClick={() => buyUpgrade(u.id)}
                data-ocid="tube_clicker.button"
                disabled={!canAfford}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: canAfford ? "#2a1000" : "#0e0404",
                  border: `1px solid ${canAfford ? "#FF6600" : "#3a1a00"}`,
                  color: canAfford ? "#ffaa60" : "#664444",
                  cursor: canAfford ? "pointer" : "not-allowed",
                  fontSize: `${fs(6)}px`,
                  padding: `${fs(5)}px ${fs(7)}px`,
                  marginBottom: `${fs(4)}px`,
                  fontFamily: "inherit",
                  display: "block",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2px",
                  }}
                >
                  <span>
                    {u.emoji} {u.name}
                  </span>
                  <span style={{ color: canAfford ? "#FF8833" : "#553322" }}>
                    {u.owned > 0 && `[${u.owned}]`}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{
                      color: canAfford ? "#886644" : "#442211",
                      fontSize: `${fs(5)}px`,
                    }}
                  >
                    {u.description}
                  </span>
                  <span style={{ color: canAfford ? "#FFAA00" : "#664422" }}>
                    {formatNumber(cost)} 👁️
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
