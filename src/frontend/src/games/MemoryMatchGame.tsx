import { useEffect, useRef, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const SYMBOLS = [
  "\u26CF",
  "\u2694\uFE0F",
  "\uD83E\uDEB5",
  "\uD83D\uDC8E",
  "\uD83E\uDEA8",
  "\uD83C\uDF3F",
  "\uD83E\uDDF1",
  "\uD83C\uDF4E",
];
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
        className="w-full flex items-center justify-between px-4 py-2 rounded"
        style={{
          background: "#2D1E0A",
          border: "1px solid #8B5E3C",
        }}
      >
        <span className="font-arcade text-[9px]" style={{ color: "#FFD700" }}>
          SCORE: {score}
        </span>
        <span className="font-arcade text-[9px]" style={{ color: "#FFD700" }}>
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
            className="w-16 h-16 sm:w-20 sm:h-20 rounded font-arcade text-2xl flex items-center justify-center transition-all duration-300 cursor-pointer"
            style={{
              background: card.matched
                ? "#3A5A2A"
                : card.flipped
                  ? "#2A3A22"
                  : "#5C4A3A",
              border: card.matched
                ? "2px solid #6FAA46"
                : card.flipped
                  ? "2px solid #5D8A3C"
                  : "2px solid #3A2A1A",
              boxShadow: card.matched ? "0 0 8px #5D8A3C" : "none",
            }}
          >
            {card.flipped || card.matched ? (
              card.symbol
            ) : (
              <span style={{ color: "#8B7355", fontSize: "1.2rem" }}>?</span>
            )}
          </button>
        ))}
      </div>

      {matches === TOTAL_PAIRS && (
        <div className="text-center mt-2">
          <p className="font-arcade text-sm" style={{ color: "#5D8A3C" }}>
            YOU WIN! 🏆
          </p>
          <p
            className="font-arcade text-[9px] mt-2"
            style={{ color: "#FFD700" }}
          >
            FINAL SCORE: {score}
          </p>
        </div>
      )}
    </div>
  );
}
