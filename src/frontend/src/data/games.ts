export interface GameData {
  id: string;
  title: string;
  description: string;
  rating: number;
  gradient: string;
  accentColor: string;
  controls: string;
  category: string;
}

export const GAMES: GameData[] = [
  {
    id: "snake",
    title: "SNAKE",
    description:
      "Guide the snake to eat food and grow. Avoid walls and yourself!",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #0a2a2a 0%, #0e3a3a 50%, #0a1f1f 100%)",
    accentColor: "#21D4FF",
    controls: "Arrow Keys to move",
    category: "CLASSIC",
  },
  {
    id: "tetris",
    title: "TETRIS",
    description: "Stack falling blocks and clear lines to score big!",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #1a0a2a 0%, #2a0a3a 50%, #1a0a20 100%)",
    accentColor: "#C83CFF",
    controls: "Arrows to move/rotate",
    category: "PUZZLE",
  },
  {
    id: "memory-match",
    title: "MEMORY MATCH",
    description: "Flip cards to find matching pairs. Test your memory!",
    rating: 4.6,
    gradient: "linear-gradient(135deg, #0a2a10 0%, #0a3a18 50%, #051a0a 100%)",
    accentColor: "#38F26D",
    controls: "Click cards to flip",
    category: "BRAIN",
  },
  {
    id: "flappy-bird",
    title: "FLAPPY BIRD",
    description:
      "Tap to flap and navigate through the pipes. How far can you go?",
    rating: 4.7,
    gradient: "linear-gradient(135deg, #2a1a00 0%, #3a2a00 50%, #1a1000 100%)",
    accentColor: "#F59E0B",
    controls: "Space / Click to flap",
    category: "ARCADE",
  },
  {
    id: "road-rush",
    title: "ROAD RUSH",
    description:
      "Dodge oncoming traffic on a high-speed highway. How long can you survive?",
    rating: 4.7,
    gradient: "linear-gradient(135deg, #2a0a0a 0%, #3a1000 50%, #1a0800 100%)",
    accentColor: "#FF4C1A",
    controls: "Arrow Left/Right to dodge",
    category: "RACING",
  },
  {
    id: "speed-drift",
    title: "SPEED DRIFT",
    description:
      "Race through a winding track, drift around corners and beat your high score!",
    rating: 4.5,
    gradient: "linear-gradient(135deg, #0a0a2a 0%, #0a1040 50%, #05081a 100%)",
    accentColor: "#00C8FF",
    controls: "Left/Right arrows to steer",
    category: "RACING",
  },
  {
    id: "space-shooter",
    title: "SPACE SHOOTER",
    description:
      "Blast enemy ships before they reach you! Survive waves of alien invaders.",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #0a0a1a 0%, #0a0a2e 50%, #050510 100%)",
    accentColor: "#FF3C6E",
    controls: "Arrow Left/Right to move, Space to shoot",
    category: "SHOOTER",
  },
  {
    id: "street-racer",
    title: "STREET RACER",
    description:
      "Bet your cash, race 3 rivals, and unlock faster cars. Can you go from rags to riches?",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #1a0f00 0%, #2a1800 50%, #1a0a00 100%)",
    accentColor: "#F5A623",
    controls: "Arrow Keys to steer",
    category: "RACING",
  },
];
