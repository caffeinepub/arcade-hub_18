import { Button } from "@/components/ui/button";
import type { GameData } from "@/data/games";
import { Play, Star } from "lucide-react";

interface Props {
  game: GameData;
  onPlay: (game: GameData) => void;
  index: number;
}

const STAR_KEYS = ["s1", "s2", "s3", "s4", "s5"];

export default function GameCard({ game, onPlay, index }: Props) {
  return (
    <div
      data-ocid={`games.item.${index}`}
      className="group relative rounded-lg overflow-hidden neon-border-cyan bg-card flex flex-col transition-transform hover:-translate-y-1 hover:shadow-neon-cyan duration-300"
    >
      {/* Thumbnail */}
      <div
        className="relative h-36 flex items-center justify-center overflow-hidden scanlines"
        style={{ background: game.gradient }}
      >
        <div
          className="font-arcade text-2xl"
          style={{
            color: game.accentColor,
            textShadow: `0 0 20px ${game.accentColor}`,
          }}
        >
          {game.title.split(" ")[0].charAt(0)}
        </div>
        <span
          className="absolute top-2 left-2 font-arcade text-[8px] px-2 py-1 rounded"
          style={{
            background: `${game.accentColor}22`,
            border: `1px solid ${game.accentColor}66`,
            color: game.accentColor,
          }}
        >
          {game.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3
          className="font-arcade text-[11px] tracking-wider"
          style={{
            color: game.accentColor,
            textShadow: `0 0 8px ${game.accentColor}66`,
          }}
        >
          {game.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {game.description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-auto pt-2">
          {STAR_KEYS.map((key, i) => (
            <Star
              key={key}
              className="h-3 w-3"
              fill={i < Math.floor(game.rating) ? "#F6D33B" : "transparent"}
              style={{
                color: i < Math.floor(game.rating) ? "#F6D33B" : "#4a5568",
              }}
            />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">
            {game.rating}
          </span>
        </div>

        <Button
          onClick={() => onPlay(game)}
          data-ocid={`games.play_button.${index}`}
          size="sm"
          className="mt-2 w-full font-arcade text-[9px] tracking-wider"
          style={{
            background: `${game.accentColor}22`,
            border: `1px solid ${game.accentColor}88`,
            color: game.accentColor,
            boxShadow: `0 0 8px ${game.accentColor}33`,
          }}
        >
          <Play className="h-3 w-3 mr-1" />
          PLAY NOW
        </Button>
      </div>
    </div>
  );
}
