import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSubmitScore } from "@/hooks/useQueries";
import { Loader2, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  score: number;
  gameId: string;
  gameTitle: string;
  onClose: () => void;
}

export default function ScoreModal({
  open,
  score,
  gameId,
  gameTitle,
  onClose,
}: Props) {
  const [playerName, setPlayerName] = useState("");
  const { mutate: submitScore, isPending } = useSubmitScore();

  const handleSubmit = () => {
    if (!playerName.trim()) return;
    submitScore(
      { gameId, player: playerName.trim(), score },
      {
        onSuccess: () => {
          toast.success("Score submitted! 🏆");
          onClose();
        },
        onError: () => {
          toast.error("Failed to submit score. Try again!");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="score.modal"
        className="bg-card border-neon-cyan/40 max-w-sm glow-cyan"
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <Trophy
              className="h-10 w-10 text-neon-gold"
              style={{ filter: "drop-shadow(0 0 12px #F6D33B)" }}
            />
          </div>
          <DialogTitle className="font-arcade text-sm text-center text-neon-cyan text-glow-cyan">
            GAME OVER
          </DialogTitle>
          <p className="text-center text-xs text-muted-foreground mt-1">
            {gameTitle}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="text-center">
            <p className="text-[10px] font-arcade text-muted-foreground tracking-widest mb-1">
              YOUR SCORE
            </p>
            <p
              className="font-arcade text-3xl"
              style={{
                color: "#F6D33B",
                textShadow: "0 0 15px rgba(246,211,59,0.8)",
              }}
            >
              {score.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <label
              className="text-xs text-muted-foreground font-medium"
              htmlFor="player-name"
            >
              Enter your name for the leaderboard:
            </label>
            <Input
              id="player-name"
              data-ocid="score.input"
              placeholder="Your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              maxLength={20}
              className="bg-background border-neon-cyan/30 focus:border-neon-cyan text-foreground"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!playerName.trim() || isPending}
              data-ocid="score.submit_button"
              className="flex-1 font-arcade text-[9px] tracking-wider bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/30"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "SUBMIT SCORE"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="score.cancel_button"
              className="flex-1 font-arcade text-[9px] tracking-wider border-muted text-muted-foreground hover:text-foreground"
            >
              SKIP
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
