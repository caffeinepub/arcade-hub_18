import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useRef, useState } from "react";

interface Card {
  rank: string;
  suit: string;
  value: number;
  faceDown?: boolean;
}

type GamePhase = "bet" | "playing" | "dealerTurn" | "result";
type Outcome = "win" | "blackjack" | "lose" | "push" | null;

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

const BET_OPTIONS = [25, 50, 100, 250, 500];

interface Props {
  onGameOver: (score: number) => void;
}

export default function BlackjackGame({ onGameOver }: Props) {
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

    const pScore = calcHandValue(pHand);
    const dScore = calcHandValue([d1]); // only visible card
    if (pScore === 21) {
      // Check for blackjack - reveal dealer
      const revealedDHand = dHand.map((c) => ({ ...c, faceDown: false }));
      const fullDScore = calcHandValue(revealedDHand);
      setDealerHand(revealedDHand);
      if (fullDScore === 21) {
        endGame("push", pHand, revealedDHand);
      } else {
        endGame("blackjack", pHand, revealedDHand);
      }
    } else {
      setPhase("playing");
      void dScore; // suppress lint
    }
  }

  function hit() {
    if (phase !== "playing" || deck.length === 0) return;
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerHand, card];
    setDeck(newDeck);
    setPlayerHand(newHand);
    const score = calcHandValue(newHand);
    if (score > 21) {
      // bust - reveal dealer
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

    setChips((prev) => {
      let next = prev;
      if (result === "win") next = prev - bet + bet * 2;
      else if (result === "blackjack")
        next = prev - bet + Math.floor(bet * 2.5);
      else if (result === "push")
        next = prev; // no change
      else next = prev - bet;
      localStorage.setItem("blackjack-chips", String(next));
      // Report score if at 0
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
    if (chips <= 0) {
      setChips(1000);
    }
  }

  function addBet(amount: number) {
    if (phase !== "bet") return;
    setBet((b) => Math.min(b + amount, chips));
  }

  function clearBet() {
    setBet(0);
  }

  const playerScore = calcHandValue(playerHand);
  const dealerScore = calcHandValue(dealerHand.filter((c) => !c.faceDown));

  return (
    <div
      className="relative flex flex-col items-center gap-4 p-4 rounded-xl select-none"
      style={{
        background: `radial-gradient(ellipse at center, ${tc.felt} 0%, #0a0a0a 100%)`,
        border: `2px solid ${tc.feltBorder}33`,
        minWidth: 480,
        minHeight: 560,
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Header */}
      <div className="flex w-full justify-between items-center mb-1">
        <div
          className="text-xs px-3 py-1 rounded"
          style={{
            color: tc.accent,
            border: `1px solid ${tc.accent}55`,
            background: `${tc.accent}11`,
            fontSize: "9px",
            fontFamily: "inherit",
          }}
        >
          💰 CHIPS: ${chips.toLocaleString()}
        </div>
        {bet > 0 && (
          <div
            className="text-xs px-3 py-1 rounded"
            style={{
              color: "#F5C518",
              border: "1px solid #F5C51855",
              background: "#F5C51811",
              fontSize: "9px",
              fontFamily: "inherit",
            }}
          >
            🎲 BET: ${bet.toLocaleString()}
          </div>
        )}
      </div>

      {/* Dealer hand */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          style={{
            fontSize: "9px",
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
        <div className="flex gap-2 flex-wrap justify-center min-h-[100px] items-center">
          {dealerHand.map((card, i) => (
            <CardView
              key={`d-${i}-${card.rank}${card.suit}`}
              card={card}
              accent={tc.accent}
            />
          ))}
          {dealerHand.length === 0 && (
            <div style={{ color: "#555", fontSize: "10px" }}>
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
            fontSize: "9px",
            color: "#aaa",
            fontFamily: "inherit",
            letterSpacing: "0.1em",
          }}
        >
          YOU{playerHand.length > 0 ? ` — ${playerScore}` : ""}
        </div>
        <div className="flex gap-2 flex-wrap justify-center min-h-[100px] items-center">
          {playerHand.map((card, i) => (
            <CardView
              key={`p-${i}-${card.rank}${card.suit}`}
              card={card}
              accent={tc.accent}
            />
          ))}
          {playerHand.length === 0 && (
            <div style={{ color: "#555", fontSize: "10px" }}>
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
            fontSize: "11px",
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
              style={{ fontSize: "8px", color: "#888", fontFamily: "inherit" }}
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
                  className="px-3 py-2 rounded transition-all hover:scale-105 active:scale-95"
                  style={{
                    fontSize: "9px",
                    fontFamily: "inherit",
                    background: amt > chips ? "#222" : `${tc.accent}22`,
                    border: `1px solid ${amt > chips ? "#444" : `${tc.accent}66`}`,
                    color: amt > chips ? "#555" : tc.accent,
                    cursor: amt > chips ? "not-allowed" : "pointer",
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
                className="px-4 py-2 rounded transition-all hover:scale-105 active:scale-95"
                style={{
                  fontSize: "9px",
                  fontFamily: "inherit",
                  background: "#f4433622",
                  border: "1px solid #f4433666",
                  color: "#f44336",
                }}
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={startDeal}
                data-ocid="blackjack.primary_button"
                disabled={bet === 0 || bet > chips}
                className="px-6 py-2 rounded transition-all hover:scale-105 active:scale-95"
                style={{
                  fontSize: "9px",
                  fontFamily: "inherit",
                  background: bet === 0 ? "#222" : `${tc.accent}33`,
                  border: `1px solid ${bet === 0 ? "#444" : tc.accent}`,
                  color: bet === 0 ? "#555" : tc.accent,
                  cursor: bet === 0 ? "not-allowed" : "pointer",
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
              className="px-5 py-2 rounded transition-all hover:scale-105 active:scale-95"
              style={{
                fontSize: "9px",
                fontFamily: "inherit",
                background: `${tc.accent}33`,
                border: `1px solid ${tc.accent}`,
                color: tc.accent,
              }}
            >
              HIT
            </button>
            <button
              type="button"
              onClick={stand}
              data-ocid="blackjack.secondary_button"
              className="px-5 py-2 rounded transition-all hover:scale-105 active:scale-95"
              style={{
                fontSize: "9px",
                fontFamily: "inherit",
                background: "#F5C51822",
                border: "1px solid #F5C518",
                color: "#F5C518",
              }}
            >
              STAND
            </button>
            {playerHand.length === 2 && bet <= chips - bet && (
              <button
                type="button"
                onClick={doubleDown}
                data-ocid="blackjack.toggle"
                className="px-5 py-2 rounded transition-all hover:scale-105 active:scale-95"
                style={{
                  fontSize: "9px",
                  fontFamily: "inherit",
                  background: "#9C27B022",
                  border: "1px solid #9C27B0",
                  color: "#9C27B0",
                }}
              >
                DOUBLE DOWN
              </button>
            )}
          </div>
        )}

        {phase === "dealerTurn" && (
          <div
            style={{ fontSize: "9px", color: "#888", fontFamily: "inherit" }}
          >
            DEALER DRAWING...
          </div>
        )}

        {phase === "result" && (
          <button
            type="button"
            onClick={newRound}
            data-ocid="blackjack.primary_button"
            className="px-8 py-2 rounded transition-all hover:scale-105 active:scale-95"
            style={{
              fontSize: "9px",
              fontFamily: "inherit",
              background: `${tc.accent}33`,
              border: `1px solid ${tc.accent}`,
              color: tc.accent,
            }}
          >
            {chips <= 0 ? "RESTART (FREE $1000)" : "NEXT ROUND ▶"}
          </button>
        )}
      </div>

      {/* Low chip warning */}
      {chips > 0 && chips < 100 && phase === "bet" && (
        <div
          style={{
            fontSize: "8px",
            color: "#f44336",
            fontFamily: "inherit",
            textAlign: "center",
          }}
          data-ocid="blackjack.error_state"
        >
          ⚠ LOW CHIPS — RUNNING OUT!
        </div>
      )}
    </div>
  );
}

function CardView({ card, accent }: { card: Card; accent: string }) {
  if (card.faceDown) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          width: 64,
          height: 96,
          background: "linear-gradient(135deg, #1a3a6e 0%, #0d1e3e 100%)",
          border: "2px solid #2a4a8e",
          boxShadow: "2px 2px 8px #00000088",
        }}
      >
        <div
          style={{
            width: 48,
            height: 80,
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
      className="flex flex-col justify-between p-1 rounded-lg"
      style={{
        width: 64,
        height: 96,
        background: "#f8f4f0",
        border: `2px solid ${accent}66`,
        boxShadow: "2px 2px 8px #00000088",
        color: red ? "#c0392b" : "#1a1a1a",
        position: "relative",
      }}
    >
      {/* Top-left rank+suit */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <div>{card.rank}</div>
        <div style={{ fontSize: "10px" }}>{card.suit}</div>
      </div>
      {/* Center suit */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "22px",
          opacity: 0.25,
        }}
      >
        {card.suit}
      </div>
      {/* Bottom-right rank+suit (rotated) */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Press Start 2P', monospace",
          transform: "rotate(180deg)",
          alignSelf: "flex-end",
        }}
      >
        <div>{card.rank}</div>
        <div style={{ fontSize: "10px" }}>{card.suit}</div>
      </div>
    </div>
  );
}
