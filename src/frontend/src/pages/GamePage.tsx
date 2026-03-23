import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Leaderboard from "@/components/Leaderboard";
import ScoreModal from "@/components/ScoreModal";
import { Button } from "@/components/ui/button";
import type { GameData } from "@/data/games";
import BasketballGame from "@/games/BasketballGame";
import BlockBlastGame from "@/games/BlockBlastGame";
import BlockMinerGame from "@/games/BlockMinerGame";
import CookieClickerGame from "@/games/CookieClickerGame";
import FlappyBirdGame from "@/games/FlappyBirdGame";
import GeometryDashGame from "@/games/GeometryDashGame";
import MemoryMatchGame from "@/games/MemoryMatchGame";
import RoadRushGame from "@/games/RoadRushGame";
import SkyAce from "@/games/SkyAce";
import SnakeGame from "@/games/SnakeGame";
import SolarSmashGame from "@/games/SolarSmashGame";
import SpaceShooterGame from "@/games/SpaceShooterGame";
import SpeedDriftGame from "@/games/SpeedDriftGame";
import StreetRacerGame from "@/games/StreetRacerGame";
import TetrisGame from "@/games/TetrisGame";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  game: GameData;
  onBack: () => void;
}

export default function GamePage({ game, onBack }: Props) {
  const [gameKey, setGameKey] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      gameContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameOver(true);
    setModalOpen(true);
  };

  const restartGame = () => {
    setGameOver(false);
    setFinalScore(0);
    setGameKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Back + title */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            data-ocid="game.back_button"
            className="font-arcade text-[9px] text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/10 tracking-wider"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            BACK
          </Button>
          <div>
            <p className="font-arcade text-[9px] text-muted-foreground tracking-widest">
              {game.category}
            </p>
            <h1
              className="font-arcade text-lg"
              style={{
                color: game.accentColor,
                textShadow: `0 0 10px ${game.accentColor}88`,
              }}
            >
              {game.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Game area */}
          <div className="flex-1">
            <div
              ref={gameContainerRef}
              className="rounded-xl p-4 relative"
              style={{
                background: "#0E1520",
                border: `1px solid ${game.accentColor}44`,
                boxShadow: `0 0 20px ${game.accentColor}22`,
              }}
            >
              {/* Fullscreen button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                data-ocid="game.toggle"
                title={isFullscreen ? "EXIT" : "FULLSCREEN"}
                className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded font-arcade text-[8px] tracking-wider transition-all hover:scale-105"
                style={{
                  background: `${game.accentColor}22`,
                  border: `1px solid ${game.accentColor}66`,
                  color: game.accentColor,
                }}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
                <span>{isFullscreen ? "EXIT" : "FULLSCREEN"}</span>
              </button>

              {/* Controls hint */}
              <p className="font-arcade text-[8px] text-muted-foreground mb-3 text-center tracking-widest">
                🎮 {game.controls.toUpperCase()}
              </p>

              {/* Game canvas area */}
              <div className="flex justify-center">
                {game.id === "snake" && (
                  <SnakeGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "tetris" && (
                  <TetrisGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "memory-match" && (
                  <MemoryMatchGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "flappy-bird" && (
                  <FlappyBirdGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "road-rush" && (
                  <RoadRushGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "speed-drift" && (
                  <SpeedDriftGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "space-shooter" && (
                  <SpaceShooterGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "street-racer" && (
                  <StreetRacerGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "block-miner" && (
                  <BlockMinerGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "geometry-dash" && (
                  <GeometryDashGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "block-blast" && (
                  <BlockBlastGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "cookie-clicker" && (
                  <CookieClickerGame
                    key={gameKey}
                    onGameOver={handleGameOver}
                  />
                )}
                {game.id === "solar-smash" && (
                  <SolarSmashGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "basketball-random" && (
                  <BasketballGame key={gameKey} onGameOver={handleGameOver} />
                )}
                {game.id === "sky-ace" && (
                  <SkyAce key={gameKey} onGameOver={handleGameOver} />
                )}
              </div>

              {/* Restart button when game over */}
              {gameOver &&
                game.id !== "street-racer" &&
                game.id !== "cookie-clicker" &&
                game.id !== "solar-smash" &&
                game.id !== "basketball-random" &&
                game.id !== "sky-ace" && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={restartGame}
                      data-ocid="game.restart_button"
                      className="font-arcade text-[9px] tracking-wider"
                      style={{
                        background: `${game.accentColor}22`,
                        border: `1px solid ${game.accentColor}66`,
                        color: game.accentColor,
                      }}
                    >
                      ↺ PLAY AGAIN
                    </Button>
                  </div>
                )}
            </div>
          </div>

          {/* Leaderboard sidebar */}
          <div className="lg:w-72">
            <Leaderboard game={game} />
          </div>
        </div>
      </main>

      <Footer />

      <ScoreModal
        open={modalOpen}
        score={finalScore}
        gameId={game.id}
        gameTitle={game.title}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
