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
    <div className="rounded-lg neon-border-magenta bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-secondary/20 flex items-center gap-2">
        <Trophy
          className="h-4 w-4"
          style={{ color: "#F6D33B", filter: "drop-shadow(0 0 6px #F6D33B)" }}
        />
        <div>
          <p className="text-[9px] font-arcade text-muted-foreground tracking-widest">
            GLOBAL LEADERBOARD
          </p>
          <h2 className="text-sm font-arcade text-secondary text-glow-magenta mt-0.5">
            TOP SCORES
          </h2>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        <p
          className="text-[9px] font-arcade"
          style={{ color: "rgba(33,212,255,0.7)" }}
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
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {isError && (
          <p
            className="text-xs text-destructive text-center py-4"
            data-ocid="leaderboard.error_state"
          >
            Failed to load scores
          </p>
        )}
        {!isLoading && !isError && top10.length === 0 && (
          <div className="text-center py-8" data-ocid="leaderboard.empty_state">
            <p className="text-xs text-muted-foreground">No scores yet.</p>
            <p className="text-[10px] mt-1" style={{ color: "#38F26D" }}>
              Be the first to play!
            </p>
          </div>
        )}
        {top10.map((entry, i) => (
          <div
            key={`${entry.player}-${i}`}
            data-ocid={`leaderboard.item.${i + 1}`}
            className="flex items-center justify-between py-2 px-3 rounded"
            style={{
              background:
                i === 0
                  ? "rgba(246,211,59,0.08)"
                  : i === 1
                    ? "rgba(200,60,255,0.06)"
                    : "rgba(33,212,255,0.04)",
              border:
                i === 0
                  ? "1px solid rgba(246,211,59,0.3)"
                  : "1px solid transparent",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="font-arcade text-[10px] w-5 text-center"
                style={{
                  color:
                    i === 0
                      ? "#F6D33B"
                      : i === 1
                        ? "#C0C0C0"
                        : i === 2
                          ? "#CD7F32"
                          : "#9AA6B2",
                }}
              >
                #{i + 1}
              </span>
              <span className="text-xs text-foreground font-medium truncate max-w-[100px]">
                {entry.player}
              </span>
            </div>
            <span
              className="font-arcade text-[10px]"
              style={{
                color: "#F6D33B",
                textShadow: "0 0 8px rgba(246,211,59,0.6)",
              }}
            >
              {Number(entry.score).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
