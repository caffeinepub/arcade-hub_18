import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { GameData } from "@/data/games";
import ChatPage from "@/pages/ChatPage";
import GamePage from "@/pages/GamePage";
import HomePage from "@/pages/HomePage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const [activeGame, setActiveGame] = useState<GameData | null>(null);
  const [showChat, setShowChat] = useState(false);

  function handleNavClick(section: string) {
    if (section === "CHAT") {
      setShowChat(true);
      setActiveGame(null);
    }
  }

  if (showChat) {
    return <ChatPage onBack={() => setShowChat(false)} />;
  }

  if (activeGame) {
    return <GamePage game={activeGame} onBack={() => setActiveGame(null)} />;
  }

  return <HomePage onPlayGame={setActiveGame} onNavClick={handleNavClick} />;
}
