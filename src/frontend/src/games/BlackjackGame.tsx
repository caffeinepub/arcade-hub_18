import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useRef, useState } from "react";
import { playCardFlip, playClick, playDeath, playWin } from "../utils/sound";

interface Card {
  rank: string;
  suit: string;
  value: number;
  faceDown?: boolean;
}

type GamePhase = "bet" | "playing" | "dealerTurn" | "result";
type Outcome = "win" | "blackjack" | "lose" | "push" | null;

interface LeaderboardEntry {
  name: string;
  chips: number;
  date: string;
}

const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
const SUITS = ["♠", "♥", "♦", "♣"];

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = Number.parseInt(rank);
      if (["J", "Q", "K"].includes(rank)) value = 10;
      else if (rank === "A") value = 11;
      deck.push({ rank, suit, value });
    }
  }
  return deck;
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function calcHandValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.faceDown) continue;
    total += c.value;
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isRed(suit: string): boolean {
  return suit === "♥" || suit === "♦";
}

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const stored = localStorage.getItem("blackjack-leaderboard");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  localStorage.setItem("blackjack-leaderboard", JSON.stringify(entries));
}

const BET_OPTIONS = [25, 50, 100, 250, 500];

interface Props {
  onGameOver: (score: number) => void;
  isFullscreen?: boolean;
}

export default function BlackjackGame({
  onGameOver,
  isFullscreen = false,
}: Props) {
  const { theme } = useTheme();
  const [chips, setChips] = useState<number>(() => {
    const stored = localStorage.getItem("blackjack-chips");
    return stored ? Number.parseInt(stored) : 1000;
  });
  const [bet, setBet] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("bet");
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [message, setMessage] = useState("");
  const dealerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>(loadLeaderboard);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedThisRound, setSavedThisRound] = useState(false);
  const [lastSavedChips, setLastSavedChips] = useState<number | null>(null);

  // Persist chips
  useEffect(() => {
    localStorage.setItem("blackjack-chips", String(chips));
  }, [chips]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (dealerTimerRef.current) clearTimeout(dealerTimerRef.current);
    };
  }, []);

  // Scale factor for fullscreen mode
  const scale = isFullscreen ? 1.6 : 1;
  const fs = (base: number) => Math.round(base * scale);

  // Theme-based colors
  const themeColors = {
    minecraft: {
      felt: "#1a3a1a",
      feltBorder: "#4CAF50",
      accent: "#4CAF50",
      chipBase: "#2d5a1b",
    },
    neon: {
      felt: "#0a0a2e",
      feltBorder: "#00ffff",
      accent: "#00ffff",
      chipBase: "#0f0f3a",
    },
    retro: {
      felt: "#1a0a0a",
      feltBorder: "#ff5500",
      accent: "#ff5500",
      chipBase: "#2e1010",
    },
    space: {
      felt: "#050514",
      feltBorder: "#9C27B0",
      accent: "#9C27B0",
      chipBase: "#0a0a22",
    },
  };
  const tc = themeColors[theme] || themeColors.minecraft;

  function handleSaveScore() {
    const trimmed = saveName.trim().slice(0, 16) || "PLAYER";
    const entry: LeaderboardEntry = {
      name: trimmed,
      chips,
      date: new Date().toLocaleDateString(),
    };
    const updated = [...leaderboard, entry]
      .sort((a, b) => b.chips - a.chips)
      .slice(0, 10);
    setLeaderboard(updated);
    saveLeaderboard(updated);
    setLastSavedChips(chips);
    setSavedThisRound(true);
    setShowLeaderboard(true);
  }

  function startDeal() {
    if (bet === 0 || bet > chips) return;
    const freshDeck = shuffle(buildDeck());
    const p1 = freshDeck.pop()!;
    const d1 = freshDeck.pop()!;
    const p2 = freshDeck.pop()!;
    const d2 = { ...freshDeck.pop()!, faceDown: true };
    const pHand = [p1, p2];
    const dHand = [d1, d2];
    setDeck(freshDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setOutcome(null);
    setMessage("");
    setSavedThisRound(false);

    const pScore = calcHandValue(pHand);
    const dScore = calcHandValue([d1]);
    if (pScore === 21) {
      const revealedDHand = dHand.map((c) => ({ ...c, faceDown: false }));
      const fullDScore = calcHandValue(revealedDHand);
      setDealerHand(revealedDHand);
      if (fullDScore === 21) {
        endGame("push", pHand, revealedDHand);
      } else {
        endGame("blackjack", pHand, revealedDHand);
      }
    } else {
      playCardFlip();
      setPhase("playing");
      void dScore;
    }
  }

  function hit() {
    playCardFlip();
    if (phase !== "playing" || deck.length === 0) return;
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerHand, card];
    setDeck(newDeck);
    setPlayerHand(newHand);
    const score = calcHandValue(newHand);
    if (score > 21) {
      const revealedDHand = dealerHand.map((c) => ({ ...c, faceDown: false }));
      setDealerHand(revealedDHand);
      endGame("lose", newHand, revealedDHand);
    }
  }

  function stand() {
    if (phase !== "playing") return;
    const revealedDHand = dealerHand.map((c) => ({ ...c, faceDown: false }));
    setDealerHand(revealedDHand);
    setPhase("dealerTurn");
    runDealerTurn(revealedDHand, [...deck]);
  }

  function doubleDown() {
    if (phase !== "playing" || playerHand.length !== 2 || bet > chips - bet)
      return;
    setBet((b) => b * 2);
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerHand, card];
    setDeck(newDeck);
    setPlayerHand(newHand);
    const score = calcHandValue(newHand);
    const revealedDHand = dealerHand.map((c) => ({ ...c, faceDown: false }));
    setDealerHand(revealedDHand);
    if (score > 21) {
      endGame("lose", newHand, revealedDHand);
    } else {
      setPhase("dealerTurn");
      runDealerTurn(revealedDHand, newDeck);
    }
  }

  function runDealerTurn(dHand: Card[], currentDeck: Card[]) {
    let hand = [...dHand];
    let d = [...currentDeck];

    function drawNext() {
      const score = calcHandValue(hand);
      if (score >= 17) {
        endGame(null, playerHand, hand);
        return;
      }
      const card = d.pop()!;
      hand = [...hand, card];
      d = [...d];
      setDealerHand([...hand]);
      dealerTimerRef.current = setTimeout(drawNext, 600);
    }

    dealerTimerRef.current = setTimeout(drawNext, 600);
  }

  function endGame(forcedOutcome: Outcome, pHand: Card[], dHand: Card[]) {
    const pScore = calcHandValue(pHand);
    const dScore = calcHandValue(dHand);

    let result: Outcome;
    if (forcedOutcome !== null) {
      result = forcedOutcome;
    } else if (pScore > 21) {
      result = "lose";
    } else if (dScore > 21) {
      result = "win";
    } else if (pScore > dScore) {
      result = "win";
    } else if (pScore === dScore) {
      result = "push";
    } else {
      result = "lose";
    }

    setOutcome(result);

    if (result === "win" || result === "blackjack") playWin();
    else if (result === "lose") playDeath();
    setChips((prev) => {
      let next = prev;
      if (result === "win") next = prev - bet + bet * 2;
      else if (result === "blackjack")
        next = prev - bet + Math.floor(bet * 2.5);
      else if (result === "push") next = prev;
      else next = prev - bet;
      localStorage.setItem("blackjack-chips", String(next));
      if (next <= 0) setTimeout(() => onGameOver(0), 1200);
      return next;
    });

    const msgs: Record<string, string> = {
      win: "🎉 YOU WIN!",
      blackjack: "🃏 BLACKJACK! 3:2 PAYOUT!",
      lose: pScore > 21 ? "💥 BUST! DEALER WINS!" : "😢 DEALER WINS!",
      push: "🤝 PUSH — BET RETURNED!",
    };
    setMessage(msgs[result] ?? "");
    setPhase("result");
  }

  function newRound() {
    setBet(0);
    setPlayerHand([]);
    setDealerHand([]);
    setOutcome(null);
    setMessage("");
    setPhase("bet");
    setSavedThisRound(false);
    setSaveName("");
    if (chips <= 0) {
      setChips(1000);
    }
  }

  function addBet(amount: number) {
    playClick();
    if (phase !== "bet") return;
    setBet((b) => Math.min(b + amount, chips));
  }

  function clearBet() {
    setBet(0);
  }

  const playerScore = calcHandValue(playerHand);
  const dealerScore = calcHandValue(dealerHand.filter((c) => !c.faceDown));

  const isInTopTen =
    lastSavedChips !== null &&
    leaderboard.some((e) => e.chips === lastSavedChips);

  const cardW = fs(64);
  const cardH = fs(96);

  return (
    <div
      className="relative flex flex-col items-center gap-4 rounded-xl select-none"
      style={{
        background: `radial-gradient(ellipse at center, ${tc.felt} 0%, #0a0a0a 100%)`,
        border: `2px solid ${tc.feltBorder}33`,
        width: isFullscreen ? "100%" : undefined,
        maxWidth: isFullscreen ? 900 : undefined,
        minWidth: isFullscreen ? undefined : 480,
        minHeight: isFullscreen ? "80vh" : 560,
        fontFamily: "'Press Start 2P', monospace",
        padding: isFullscreen ? "32px 40px" : "16px",
        justifyContent: isFullscreen ? "center" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex w-full justify-between items-center mb-1">
        <div
          className="px-3 py-1 rounded"
          style={{
            color: tc.accent,
            border: `1px solid ${tc.accent}55`,
            background: `${tc.accent}11`,
            fontSize: `${fs(9)}px`,
            fontFamily: "inherit",
          }}
        >
          💰 CHIPS: ${chips.toLocaleString()}
        </div>
        <div className="flex gap-2 items-center">
          {bet > 0 && (
            <div
              className="px-3 py-1 rounded"
              style={{
                color: "#F5C518",
                border: "1px solid #F5C51855",
                background: "#F5C51811",
                fontSize: `${fs(9)}px`,
                fontFamily: "inherit",
              }}
            >
              🎲 BET: ${bet.toLocaleString()}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowLeaderboard((v) => !v)}
            data-ocid="blackjack.toggle"
            className="px-2 py-1 rounded transition-all hover:scale-105 active:scale-95"
            style={{
              fontSize: `${fs(8)}px`,
              fontFamily: "inherit",
              background: showLeaderboard ? `${tc.accent}33` : "#111",
              border: `1px solid ${showLeaderboard ? tc.accent : "#444"}`,
              color: showLeaderboard ? tc.accent : "#888",
              cursor: "pointer",
              whiteSpace: "nowrap",
              padding: isFullscreen ? "8px 14px" : undefined,
            }}
          >
            🏆 SCORES
          </button>
        </div>
      </div>

      {/* Dealer hand */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          style={{
            fontSize: `${fs(9)}px`,
            color: "#aaa",
            fontFamily: "inherit",
            letterSpacing: "0.1em",
          }}
        >
          DEALER
          {phase !== "bet" && phase !== "playing"
            ? ` — ${dealerScore}`
            : phase === "playing"
              ? " — ?"
              : ""}
        </div>
        <div
          className="flex gap-2 flex-wrap justify-center items-center"
          style={{ minHeight: cardH + 4 }}
        >
          {dealerHand.map((card, i) => (
            <CardView
              key={`d-${i}-${card.rank}${card.suit}`}
              card={card}
              accent={tc.accent}
              width={cardW}
              height={cardH}
              scale={scale}
            />
          ))}
          {dealerHand.length === 0 && (
            <div style={{ color: "#555", fontSize: `${fs(10)}px` }}>
              Waiting for deal...
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className="w-full"
        style={{
          height: "1px",
          background: `linear-gradient(to right, transparent, ${tc.feltBorder}44, transparent)`,
        }}
      />

      {/* Player hand */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          style={{
            fontSize: `${fs(9)}px`,
            color: "#aaa",
            fontFamily: "inherit",
            letterSpacing: "0.1em",
          }}
        >
          YOU{playerHand.length > 0 ? ` — ${playerScore}` : ""}
        </div>
        <div
          className="flex gap-2 flex-wrap justify-center items-center"
          style={{ minHeight: cardH + 4 }}
        >
          {playerHand.map((card, i) => (
            <CardView
              key={`p-${i}-${card.rank}${card.suit}`}
              card={card}
              accent={tc.accent}
              width={cardW}
              height={cardH}
              scale={scale}
            />
          ))}
          {playerHand.length === 0 && (
            <div style={{ color: "#555", fontSize: `${fs(10)}px` }}>
              Place your bet!
            </div>
          )}
        </div>
      </div>

      {/* Result message */}
      {message && (
        <div
          className="text-center px-4 py-2 rounded-lg"
          style={{
            fontSize: `${fs(11)}px`,
            color:
              outcome === "win" || outcome === "blackjack"
                ? "#4CAF50"
                : outcome === "push"
                  ? "#F5C518"
                  : "#f44336",
            border: `1px solid ${
              outcome === "win" || outcome === "blackjack"
                ? "#4CAF50"
                : outcome === "push"
                  ? "#F5C518"
                  : "#f44336"
            }55`,
            background: `${
              outcome === "win" || outcome === "blackjack"
                ? "#4CAF50"
                : outcome === "push"
                  ? "#F5C518"
                  : "#f44336"
            }11`,
            fontFamily: "inherit",
            letterSpacing: "0.05em",
          }}
        >
          {message}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 w-full">
        {phase === "bet" && (
          <>
            <div
              style={{
                fontSize: `${fs(8)}px`,
                color: "#888",
                fontFamily: "inherit",
              }}
            >
              SELECT BET:
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {BET_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => addBet(amt)}
                  data-ocid="blackjack.bet_button"
                  disabled={amt > chips}
                  className="rounded transition-all hover:scale-105 active:scale-95"
                  style={{
                    fontSize: `${fs(9)}px`,
                    fontFamily: "inherit",
                    background: amt > chips ? "#222" : `${tc.accent}22`,
                    border: `1px solid ${amt > chips ? "#444" : `${tc.accent}66`}`,
                    color: amt > chips ? "#555" : tc.accent,
                    cursor: amt > chips ? "not-allowed" : "pointer",
                    padding: isFullscreen ? "10px 18px" : "8px 12px",
                  }}
                >
                  +${amt}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearBet}
                data-ocid="blackjack.cancel_button"
                className="rounded transition-all hover:scale-105 active:scale-95"
                style={{
                  fontSize: `${fs(9)}px`,
                  fontFamily: "inherit",
                  background: "#f4433622",
                  border: "1px solid #f4433666",
                  color: "#f44336",
                  padding: isFullscreen ? "10px 20px" : "8px 16px",
                }}
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={startDeal}
                data-ocid="blackjack.primary_button"
                disabled={bet === 0 || bet > chips}
                className="rounded transition-all hover:scale-105 active:scale-95"
                style={{
                  fontSize: `${fs(9)}px`,
                  fontFamily: "inherit",
                  background: bet === 0 ? "#222" : `${tc.accent}33`,
                  border: `1px solid ${bet === 0 ? "#444" : tc.accent}`,
                  color: bet === 0 ? "#555" : tc.accent,
                  cursor: bet === 0 ? "not-allowed" : "pointer",
                  padding: isFullscreen ? "10px 28px" : "8px 24px",
                }}
              >
                DEAL ▶
              </button>
            </div>
          </>
        )}

        {phase === "playing" && (
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              type="button"
              onClick={hit}
              data-ocid="blackjack.primary_button"
              className="rounded transition-all hover:scale-105 active:scale-95"
              style={{
                fontSize: `${fs(9)}px`,
                fontFamily: "inherit",
                background: `${tc.accent}33`,
                border: `1px solid ${tc.accent}`,
                color: tc.accent,
                padding: isFullscreen ? "12px 28px" : "8px 20px",
              }}
            >
              HIT
            </button>
            <button
              type="button"
              onClick={stand}
              data-ocid="blackjack.secondary_button"
              className="rounded transition-all hover:scale-105 active:scale-95"
              style={{
                fontSize: `${fs(9)}px`,
                fontFamily: "inherit",
                background: "#F5C51822",
                border: "1px solid #F5C518",
                color: "#F5C518",
                padding: isFullscreen ? "12px 28px" : "8px 20px",
              }}
            >
              STAND
            </button>
            {playerHand.length === 2 && bet <= chips - bet && (
              <button
                type="button"
                onClick={doubleDown}
                data-ocid="blackjack.toggle"
                className="rounded transition-all hover:scale-105 active:scale-95"
                style={{
                  fontSize: `${fs(9)}px`,
                  fontFamily: "inherit",
                  background: "#9C27B022",
                  border: "1px solid #9C27B0",
                  color: "#9C27B0",
                  padding: isFullscreen ? "12px 20px" : "8px 20px",
                }}
              >
                DOUBLE DOWN
              </button>
            )}
          </div>
        )}

        {phase === "dealerTurn" && (
          <div
            style={{
              fontSize: `${fs(9)}px`,
              color: "#888",
              fontFamily: "inherit",
            }}
          >
            DEALER DRAWING...
          </div>
        )}

        {phase === "result" && (
          <div className="flex flex-col items-center gap-3 w-full">
            {/* Save score row */}
            {!savedThisRound ? (
              <div className="flex gap-2 items-center flex-wrap justify-center">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && saveName.trim()) handleSaveScore();
                  }}
                  placeholder="YOUR NAME"
                  maxLength={16}
                  data-ocid="blackjack.input"
                  style={{
                    fontFamily: "inherit",
                    fontSize: `${fs(8)}px`,
                    background: "#111",
                    border: `1px solid ${tc.accent}66`,
                    color: tc.accent,
                    padding: isFullscreen ? "10px 14px" : "6px 10px",
                    borderRadius: "4px",
                    outline: "none",
                    width: isFullscreen ? 200 : 130,
                    letterSpacing: "1px",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveScore}
                  data-ocid="blackjack.save_button"
                  className="rounded transition-all hover:scale-105 active:scale-95"
                  style={{
                    fontSize: `${fs(8)}px`,
                    fontFamily: "inherit",
                    background: `${tc.accent}33`,
                    border: `1px solid ${tc.accent}`,
                    color: tc.accent,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    padding: isFullscreen ? "10px 18px" : "4px 12px",
                  }}
                >
                  🏆 SAVE
                </button>
              </div>
            ) : (
              <div
                style={{
                  fontSize: `${fs(8)}px`,
                  color: isInTopTen ? "#F5C518" : "#888",
                  fontFamily: "inherit",
                }}
              >
                {isInTopTen ? "⭐ SCORE SAVED!" : "SCORE NOT IN TOP 10"}
              </div>
            )}
            <button
              type="button"
              onClick={newRound}
              data-ocid="blackjack.primary_button"
              className="rounded transition-all hover:scale-105 active:scale-95"
              style={{
                fontSize: `${fs(9)}px`,
                fontFamily: "inherit",
                background: `${tc.accent}33`,
                border: `1px solid ${tc.accent}`,
                color: tc.accent,
                padding: isFullscreen ? "12px 36px" : "8px 32px",
              }}
            >
              {chips <= 0 ? "RESTART (FREE $1000)" : "NEXT ROUND ▶"}
            </button>
          </div>
        )}
      </div>

      {/* Low chip warning */}
      {chips > 0 && chips < 100 && phase === "bet" && (
        <div
          style={{
            fontSize: `${fs(8)}px`,
            color: "#f44336",
            fontFamily: "inherit",
            textAlign: "center",
          }}
          data-ocid="blackjack.error_state"
        >
          ⚠ LOW CHIPS — RUNNING OUT!
        </div>
      )}

      {/* Leaderboard Panel */}
      {showLeaderboard && (
        <div
          className="w-full rounded-lg"
          style={{
            background: "#080808",
            border: `2px solid ${tc.accent}44`,
            padding: isFullscreen ? "20px 24px" : "12px",
            marginTop: "4px",
          }}
          data-ocid="blackjack.panel"
        >
          <div
            style={{
              fontSize: `${fs(9)}px`,
              color: tc.accent,
              letterSpacing: "2px",
              marginBottom: "10px",
              textAlign: "center",
              textShadow: `0 0 8px ${tc.accent}66`,
            }}
          >
            🏆 TOP SCORES
          </div>
          {leaderboard.length === 0 ? (
            <div
              style={{
                fontSize: `${fs(7)}px`,
                color: "#555",
                textAlign: "center",
                fontFamily: "inherit",
                padding: "8px",
              }}
              data-ocid="blackjack.empty_state"
            >
              NO SCORES YET
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {leaderboard.map((entry, i) => {
                const isCurrentSession =
                  savedThisRound &&
                  lastSavedChips === entry.chips &&
                  entry.name === (saveName.trim().slice(0, 16) || "PLAYER");
                return (
                  <div
                    key={`lb-${entry.name}-${entry.chips}-${entry.date}`}
                    data-ocid={`blackjack.item.${i + 1}`}
                    className="flex items-center gap-2 px-2 py-1 rounded"
                    style={{
                      background: isCurrentSession
                        ? `${tc.accent}22`
                        : i % 2 === 0
                          ? "#111"
                          : "#0d0d0d",
                      border: isCurrentSession
                        ? `1px solid ${tc.accent}66`
                        : "1px solid transparent",
                    }}
                  >
                    <span
                      style={{
                        fontSize: `${fs(8)}px`,
                        color:
                          i === 0
                            ? "#FFD700"
                            : i === 1
                              ? "#C0C0C0"
                              : i === 2
                                ? "#CD7F32"
                                : "#555",
                        fontFamily: "inherit",
                        width: "20px",
                        flexShrink: 0,
                      }}
                    >
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `#${i + 1}`}
                    </span>
                    <span
                      style={{
                        fontSize: `${fs(7)}px`,
                        color: isCurrentSession ? tc.accent : "#ccc",
                        fontFamily: "inherit",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.name.slice(0, 12)}
                    </span>
                    <span
                      style={{
                        fontSize: `${fs(8)}px`,
                        color: "#F5C518",
                        fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      ${entry.chips.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CardView({
  card,
  accent,
  width = 64,
  height = 96,
  scale = 1,
}: {
  card: Card;
  accent: string;
  width?: number;
  height?: number;
  scale?: number;
}) {
  const fs = (base: number) => Math.round(base * scale);

  if (card.faceDown) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          width,
          height,
          background: "linear-gradient(135deg, #1a3a6e 0%, #0d1e3e 100%)",
          border: "2px solid #2a4a8e",
          boxShadow: "2px 2px 8px #00000088",
        }}
      >
        <div
          style={{
            width: Math.round(width * 0.75),
            height: Math.round(height * 0.833),
            background:
              "repeating-linear-gradient(45deg, #1a3a6e, #1a3a6e 4px, #0d1e3e 4px, #0d1e3e 8px)",
            borderRadius: 4,
            border: "1px solid #2a4a8e66",
          }}
        />
      </div>
    );
  }

  const red = isRed(card.suit);
  return (
    <div
      className="flex flex-col justify-between rounded-lg"
      style={{
        width,
        height,
        background: "#f8f4f0",
        border: `2px solid ${accent}66`,
        boxShadow: "2px 2px 8px #00000088",
        color: red ? "#c0392b" : "#1a1a1a",
        position: "relative",
        padding: fs(4),
      }}
    >
      <div
        style={{
          fontSize: `${fs(11)}px`,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <div>{card.rank}</div>
        <div style={{ fontSize: `${fs(10)}px` }}>{card.suit}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: `${fs(22)}px`,
          opacity: 0.25,
        }}
      >
        {card.suit}
      </div>
      <div
        style={{
          fontSize: `${fs(11)}px`,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Press Start 2P', monospace",
          transform: "rotate(180deg)",
          alignSelf: "flex-end",
        }}
      >
        <div>{card.rank}</div>
        <div style={{ fontSize: `${fs(10)}px` }}>{card.suit}</div>
      </div>
    </div>
  );
}
