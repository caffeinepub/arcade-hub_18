import Footer from "@/components/Footer";
import GameCard from "@/components/GameCard";
import Header from "@/components/Header";
import Leaderboard from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/data/games";
import type { GameData } from "@/data/games";
import { ChevronRight, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface Props {
  onPlayGame: (game: GameData) => void;
}

export default function HomePage({ onPlayGame }: Props) {
  const [leaderboardGame, setLeaderboardGame] = useState(GAMES[0]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 px-4 sm:px-6">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10"
              style={{
                background: "radial-gradient(circle, #21D4FF, transparent)",
              }}
            />
            <div
              className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10"
              style={{
                background: "radial-gradient(circle, #C83CFF, transparent)",
              }}
            />
          </div>

          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative rounded-2xl overflow-hidden neon-border-cyan p-8 sm:p-12 text-center scanlines"
              style={{
                background:
                  "linear-gradient(135deg, #0E1520 0%, #0d1a2e 50%, #0a1020 100%)",
              }}
            >
              <div
                className="absolute top-4 left-6 text-2xl opacity-40"
                style={{ filter: "drop-shadow(0 0 8px #21D4FF)" }}
              >
                👾
              </div>
              <div
                className="absolute top-4 right-6 text-2xl opacity-40"
                style={{ filter: "drop-shadow(0 0 8px #C83CFF)" }}
              >
                🚀
              </div>
              <div
                className="absolute bottom-4 left-10 text-xl opacity-30"
                style={{ filter: "drop-shadow(0 0 6px #38F26D)" }}
              >
                💎
              </div>
              <div
                className="absolute bottom-4 right-10 text-xl opacity-30"
                style={{ filter: "drop-shadow(0 0 6px #F59E0B)" }}
              >
                ⚡
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="font-arcade text-[9px] tracking-widest mb-4"
                style={{ color: "rgba(33,212,255,0.7)" }}
              >
                ◀ WELCOME TO THE ARCADE ▶
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="font-arcade text-2xl sm:text-4xl leading-relaxed mb-6"
                style={{
                  background:
                    "linear-gradient(135deg, #21D4FF 0%, #C83CFF 50%, #38F26D 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 20px rgba(33,212,255,0.3))",
                }}
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
                <Button
                  onClick={() => onPlayGame(GAMES[0])}
                  data-ocid="hero.primary_button"
                  size="lg"
                  className="font-arcade text-[11px] tracking-wider px-8 py-6"
                  style={{
                    background: "linear-gradient(135deg, #38F26D22, #38F26D44)",
                    border: "1px solid #38F26D88",
                    color: "#38F26D",
                    boxShadow:
                      "0 0 20px rgba(56,242,109,0.4), 0 0 40px rgba(56,242,109,0.1)",
                  }}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  START PLAYING
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
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
                  className="font-arcade text-[9px] tracking-widest mb-1"
                  style={{ color: "rgba(33,212,255,0.7)" }}
                >
                  FEATURED GAMES
                </p>
                <h2
                  className="font-arcade text-xl text-glow-cyan"
                  style={{ color: "#21D4FF" }}
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
                    transition={{ delay: 0.1 * i, duration: 0.4 }}
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
                  className="font-arcade text-[9px] tracking-widest mb-1"
                  style={{ color: "rgba(200,60,255,0.7)" }}
                >
                  GLOBAL
                </p>
                <h2
                  className="font-arcade text-xl text-glow-magenta"
                  style={{ color: "#C83CFF" }}
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
                    className="font-arcade text-[8px] px-2 py-1 rounded transition-all"
                    style={{
                      background:
                        leaderboardGame.id === g.id
                          ? `${g.accentColor}22`
                          : "transparent",
                      border: `1px solid ${leaderboardGame.id === g.id ? g.accentColor : "rgba(255,255,255,0.1)"}`,
                      color:
                        leaderboardGame.id === g.id ? g.accentColor : "#9AA6B2",
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
