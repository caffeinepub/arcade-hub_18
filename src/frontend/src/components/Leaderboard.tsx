import type { GameData } from "@/data/games";
import { useGetLeaderboard } from "@/hooks/useQueries";
import { Loader2, Trophy } from "lucide-react";

interface Props {
  game: GameData;
}

export default function Leaderboard({ game }: Props) {
  const { data: entries, isLoading, isError } = useGetLeaderboard(game.id);
  const top10 = entries?.slice(0, 10) ?? [];

  return (
    <div className="mc-panel overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: "2px solid #1a1a1a", backgroundColor: "#222" }}
      >
        <Trophy className="h-4 w-4" style={{ color: "#F5C518" }} />
        <div>
          <p
            className="text-[9px] font-arcade mc-text-shadow tracking-widest"
            style={{ color: "#888" }}
          >
            GLOBAL LEADERBOARD
          </p>
          <h2
            className="text-sm font-arcade mc-text-shadow-gold mt-0.5"
            style={{ color: "#F5C518" }}
          >
            TOP SCORES
          </h2>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        <p
          className="text-[9px] font-arcade mc-text-shadow"
          style={{ color: "#5D8A2C" }}
        >
          {game.title}
        </p>
      </div>

      <div className="px-4 pb-4 space-y-1" data-ocid="leaderboard.table">
        {isLoading && (
          <div
            className="flex items-center justify-center py-8"
            data-ocid="leaderboard.loading_state"
          >
            <Loader2
              className="h-6 w-6 animate-spin"
              style={{ color: "#5D8A2C" }}
            />
          </div>
        )}
        {isError && (
          <p
            className="text-xs text-destructive text-center py-4 font-arcade text-[9px]"
            data-ocid="leaderboard.error_state"
          >
            Failed to load scores
          </p>
        )}
        {!isLoading && !isError && top10.length === 0 && (
          <div className="text-center py-8" data-ocid="leaderboard.empty_state">
            <p className="text-xs text-muted-foreground font-arcade text-[9px] mc-text-shadow">
              No scores yet.
            </p>
            <p
              className="text-[9px] mt-1 font-arcade mc-text-shadow-green"
              style={{ color: "#5D8A2C" }}
            >
              Be the first to play!
            </p>
          </div>
        )}
        {top10.map((entry, i) => (
          <div
            key={`${entry.player}-${i}`}
            data-ocid={`leaderboard.item.${i + 1}`}
            className="flex items-center justify-between py-2 px-3"
            style={{
              backgroundColor:
                i === 0
                  ? "rgba(245,197,24,0.12)"
                  : i === 1
                    ? "rgba(180,180,180,0.08)"
                    : "rgba(255,255,255,0.04)",
              borderLeft:
                i === 0
                  ? "3px solid #F5C518"
                  : i === 1
                    ? "3px solid #C0C0C0"
                    : i === 2
                      ? "3px solid #CD7F32"
                      : "3px solid #333",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="font-arcade text-[10px] w-5 text-center mc-text-shadow"
                style={{
                  color:
                    i === 0
                      ? "#F5C518"
                      : i === 1
                        ? "#C0C0C0"
                        : i === 2
                          ? "#CD7F32"
                          : "#7a7a7a",
                }}
              >
                #{i + 1}
              </span>
              <span className="text-xs text-foreground font-medium truncate max-w-[100px]">
                {entry.player}
              </span>
            </div>
            <span
              className="font-arcade text-[10px] mc-text-shadow-gold"
              style={{ color: "#F5C518" }}
            >
              {Number(entry.score).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
