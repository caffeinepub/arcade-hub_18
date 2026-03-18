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
      className="group relative overflow-hidden mc-panel flex flex-col transition-transform hover:-translate-y-1 duration-200"
    >
      {/* Thumbnail image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover"
        />
        {/* Category badge */}
        <span
          className="absolute top-2 left-2 font-arcade text-[8px] px-2 py-1 mc-slot"
          style={{ color: game.accentColor }}
        >
          {game.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3
          className="font-arcade text-[11px] tracking-wider mc-text-shadow"
          style={{ color: game.accentColor }}
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
              fill={i < Math.floor(game.rating) ? "#F5C518" : "transparent"}
              style={{
                color: i < Math.floor(game.rating) ? "#F5C518" : "#4a4a4a",
              }}
            />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">
            {game.rating}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onPlay(game)}
          data-ocid={`games.play_button.${index}`}
          className="mt-2 w-full font-arcade text-[9px] tracking-wider py-2 px-4 mc-btn flex items-center justify-center gap-2"
        >
          <Play className="h-3 w-3" />
          PLAY NOW
        </button>
      </div>
    </div>
  );
}
