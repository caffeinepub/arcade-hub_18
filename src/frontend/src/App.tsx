import { Toaster } from "@/components/ui/sonner";
import type { GameData } from "@/data/games";
import GamePage from "@/pages/GamePage";
import HomePage from "@/pages/HomePage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}

function AppContent() {
  const [activeGame, setActiveGame] = useState<GameData | null>(null);

  if (activeGame) {
    return <GamePage game={activeGame} onBack={() => setActiveGame(null)} />;
  }

  return <HomePage onPlayGame={setActiveGame} />;
}
