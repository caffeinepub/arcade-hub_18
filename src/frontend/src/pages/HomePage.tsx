import Footer from "@/components/Footer";
import GameCard from "@/components/GameCard";
import Header from "@/components/Header";
import Leaderboard from "@/components/Leaderboard";
import { GAMES } from "@/data/games";
import type { GameData } from "@/data/games";
import { ChevronRight, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface Props {
  onPlayGame: (game: GameData) => void;
  onNavClick?: (section: string) => void;
}

export default function HomePage({ onPlayGame, onNavClick }: Props) {
  const [leaderboardGame, setLeaderboardGame] = useState(GAMES[0]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onNavClick={onNavClick} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 px-4 sm:px-6">
          {/* Grass block decorative top strip */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: "#5D8A2C" }}
          />

          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mc-panel p-8 sm:p-12 text-center relative overflow-hidden"
            >
              {/* Stone texture overlay */}
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(255,255,255,0.5) 7px, rgba(255,255,255,0.5) 8px),
                    repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.5) 7px, rgba(255,255,255,0.5) 8px)`,
                }}
              />

              {/* Corner block icons */}
              <div className="absolute top-4 left-6 text-2xl opacity-60">
                🌿
              </div>
              <div className="absolute top-4 right-6 text-2xl opacity-60">
                ⛏️
              </div>
              <div className="absolute bottom-4 left-10 text-xl opacity-50">
                💎
              </div>
              <div className="absolute bottom-4 right-10 text-xl opacity-50">
                🏆
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="font-arcade text-[9px] tracking-widest mb-4"
                style={{ color: "#5D8A2C" }}
              >
                ◀ WELCOME TO THE ARCADE ▶
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="font-arcade text-2xl sm:text-4xl leading-relaxed mb-6 text-white"
                style={{ textShadow: "3px 4px 0 #1a3a00" }}
              >
                UNLEASH THE
                <br />
                ARCADE AGE!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-muted-foreground max-w-md mx-auto mb-8"
              >
                Play classic arcade games, compete on global leaderboards, and
                prove you are the ultimate champion.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  type="button"
                  onClick={() => onPlayGame(GAMES[0])}
                  data-ocid="hero.primary_button"
                  className="font-arcade text-[11px] tracking-wider px-8 py-4 mc-btn-green inline-flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  START PLAYING
                  <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Main content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Games grid */}
            <div className="flex-1">
              <div className="mb-6">
                <p
                  className="font-arcade text-[9px] tracking-widest mb-1 mc-text-shadow"
                  style={{ color: "#7C5230" }}
                >
                  FEATURED GAMES
                </p>
                <h2
                  className="font-arcade text-xl mc-text-shadow-green"
                  style={{ color: "#5D8A2C" }}
                >
                  TRENDING HITS
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {GAMES.map((game, i) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                  >
                    <GameCard
                      game={game}
                      onPlay={(g) => {
                        setLeaderboardGame(g);
                        onPlayGame(g);
                      }}
                      index={i + 1}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Leaderboard sidebar */}
            <div className="lg:w-72 xl:w-80">
              <div className="mb-4">
                <p
                  className="font-arcade text-[9px] tracking-widest mb-1 mc-text-shadow"
                  style={{ color: "#7C5230" }}
                >
                  GLOBAL
                </p>
                <h2
                  className="font-arcade text-xl mc-text-shadow-gold"
                  style={{ color: "#F5C518" }}
                >
                  RANKINGS
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {GAMES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setLeaderboardGame(g)}
                    data-ocid={`leaderboard.${g.id}.tab`}
                    className="font-arcade text-[8px] px-2 py-1 mc-btn mc-text-shadow transition-all"
                    style={{
                      backgroundColor:
                        leaderboardGame.id === g.id ? "#5D8A2C" : undefined,
                      color: leaderboardGame.id === g.id ? "#fff" : "#b0b0b0",
                    }}
                  >
                    {g.title.split(" ")[0]}
                  </button>
                ))}
              </div>

              <Leaderboard game={leaderboardGame} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
