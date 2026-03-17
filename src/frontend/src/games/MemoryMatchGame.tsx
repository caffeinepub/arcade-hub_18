import { useEffect, useRef, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const SYMBOLS = ["🌟", "🎮", "👾", "🚀", "💎", "⚡", "🔥", "🎯"];
const TOTAL_PAIRS = 8;

interface Card {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

function createCards(): Card[] {
  const doubled = [...SYMBOLS, ...SYMBOLS];
  const shuffled = doubled.sort(() => Math.random() - 0.5);
  return shuffled.map((symbol, id) => ({
    id,
    symbol,
    flipped: false,
    matched: false,
  }));
}

export default function MemoryMatchGame({ onGameOver }: Props) {
  const [cards, setCards] = useState<Card[]>(createCards);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [matches, setMatches] = useState(0);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  useEffect(() => {
    if (matches === TOTAL_PAIRS) {
      setTimeout(() => cbRef.current(score + matches * 50), 500);
    }
  }, [matches, score]);

  const handleFlip = (id: number) => {
    if (locked) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const newFlipped = [...flipped, id];
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)),
    );
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [firstId] = newFlipped;
      const cardA = cards.find((c) => c.id === firstId)!;
      const cardB = card;

      if (cardA.symbol === cardB.symbol) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              newFlipped.includes(c.id) ? { ...c, matched: true } : c,
            ),
          );
          setFlipped([]);
          setLocked(false);
          setMatches((m) => m + 1);
          setScore((s) => s + 100);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              newFlipped.includes(c.id) ? { ...c, flipped: false } : c,
            ),
          );
          setFlipped([]);
          setLocked(false);
          setScore((s) => Math.max(0, s - 10));
        }, 900);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score bar */}
      <div
        className="w-full flex items-center justify-between px-4 py-2 rounded-lg"
        style={{
          background: "#0E1520",
          border: "1px solid rgba(56,242,109,0.3)",
        }}
      >
        <span
          className="font-arcade text-[9px]"
          style={{ color: "#38F26D", textShadow: "0 0 8px #38F26D" }}
        >
          SCORE: {score}
        </span>
        <span className="font-arcade text-[9px]" style={{ color: "#F6D33B" }}>
          {matches}/{TOTAL_PAIRS} PAIRS
        </span>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleFlip(card.id)}
            data-ocid={`memory.card.${i + 1}`}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg font-arcade text-2xl flex items-center justify-center transition-all duration-300 cursor-pointer"
            style={{
              background: card.matched
                ? "rgba(56,242,109,0.15)"
                : card.flipped
                  ? "rgba(33,212,255,0.15)"
                  : "#0E1520",
              border: card.matched
                ? "1px solid rgba(56,242,109,0.7)"
                : card.flipped
                  ? "1px solid rgba(33,212,255,0.7)"
                  : "1px solid rgba(255,255,255,0.08)",
              boxShadow: card.matched
                ? "0 0 12px rgba(56,242,109,0.4)"
                : card.flipped
                  ? "0 0 12px rgba(33,212,255,0.4)"
                  : "none",
            }}
          >
            {card.flipped || card.matched ? (
              card.symbol
            ) : (
              <span style={{ color: "rgba(255,255,255,0.15)" }}>❓</span>
            )}
          </button>
        ))}
      </div>

      {matches === TOTAL_PAIRS && (
        <div className="text-center mt-2">
          <p
            className="font-arcade text-sm"
            style={{ color: "#38F26D", textShadow: "0 0 15px #38F26D" }}
          >
            YOU WIN! 🎉
          </p>
          <p
            className="font-arcade text-[9px] mt-2"
            style={{ color: "#F6D33B" }}
          >
            FINAL SCORE: {score}
          </p>
        </div>
      )}
    </div>
  );
}
