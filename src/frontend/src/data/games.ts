export interface GameData {
  id: string;
  title: string;
  description: string;
  rating: number;
  gradient: string;
  accentColor: string;
  controls: string;
  category: string;
  thumbnail: string;
}

export const GAMES: GameData[] = [
  {
    id: "snake",
    title: "SNAKE",
    description:
      "Guide the snake to eat food and grow. Avoid walls and yourself!",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #1a2e0a 0%, #2a4a10 50%, #0e1a05 100%)",
    accentColor: "#4CAF50",
    controls: "Arrow Keys to move",
    category: "CLASSIC",
    thumbnail: "/assets/generated/game-snake.dim_400x240.jpg",
  },
  {
    id: "tetris",
    title: "TETRIS",
    description: "Stack falling blocks and clear lines to score big!",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #0a1a2e 0%, #0a2a3e 50%, #051018 100%)",
    accentColor: "#4FC3F7",
    controls: "Arrows to move/rotate",
    category: "PUZZLE",
    thumbnail: "/assets/generated/game-tetris.dim_400x240.jpg",
  },
  {
    id: "memory-match",
    title: "MEMORY MATCH",
    description: "Flip cards to find matching pairs. Test your memory!",
    rating: 4.6,
    gradient: "linear-gradient(135deg, #2e1a0a 0%, #3e2a10 50%, #1a0e05 100%)",
    accentColor: "#F5C518",
    controls: "Click cards to flip",
    category: "BRAIN",
    thumbnail: "/assets/generated/game-memory-match.dim_400x240.jpg",
  },
  {
    id: "flappy-bird",
    title: "FLAPPY BIRD",
    description:
      "Tap to flap and navigate through the pipes. How far can you go?",
    rating: 4.7,
    gradient: "linear-gradient(135deg, #1a2e3e 0%, #2a3e50 50%, #0e1a28 100%)",
    accentColor: "#87CEEB",
    controls: "Space / Click to flap",
    category: "ARCADE",
    thumbnail: "/assets/generated/game-flappy-bird.dim_400x240.jpg",
  },
  {
    id: "road-rush",
    title: "ROAD RUSH",
    description:
      "Dodge oncoming traffic on a high-speed highway. How long can you survive?",
    rating: 4.7,
    gradient: "linear-gradient(135deg, #2e0a0a 0%, #3e1010 50%, #1a0505 100%)",
    accentColor: "#E53935",
    controls: "Arrow Left/Right to dodge",
    category: "RACING",
    thumbnail: "/assets/generated/game-road-rush.dim_400x240.jpg",
  },
  {
    id: "speed-drift",
    title: "SPEED DRIFT",
    description:
      "Race through a winding track, drift around corners and beat your high score!",
    rating: 4.5,
    gradient: "linear-gradient(135deg, #0a0a2e 0%, #0a1040 50%, #050818 100%)",
    accentColor: "#1B5E9E",
    controls: "Left/Right arrows to steer",
    category: "RACING",
    thumbnail: "/assets/generated/game-speed-drift.dim_400x240.jpg",
  },
  {
    id: "space-shooter",
    title: "SPACE SHOOTER",
    description:
      "Blast enemy ships before they reach you! Survive waves of alien invaders.",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #0a0a1e 0%, #150a28 50%, #08050e 100%)",
    accentColor: "#9C27B0",
    controls: "Arrow Left/Right to move, Space to shoot",
    category: "SHOOTER",
    thumbnail: "/assets/generated/game-space-shooter.dim_400x240.jpg",
  },
  {
    id: "street-racer",
    title: "STREET RACER",
    description:
      "Bet your cash, race 3 rivals, and unlock faster cars. Can you go from rags to riches?",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #2e1a00 0%, #3e2800 50%, #1a0e00 100%)",
    accentColor: "#FFD700",
    controls: "Arrow Keys to steer",
    category: "RACING",
    thumbnail: "/assets/generated/game-street-racer.dim_400x240.jpg",
  },
  {
    id: "block-miner",
    title: "BLOCK MINER",
    description:
      "Mine diamonds, gold and rare ores before your columns overflow! Click fast or get buried!",
    rating: 4.7,
    gradient: "linear-gradient(135deg, #1a0e05 0%, #2e1a08 50%, #0e0803 100%)",
    accentColor: "#8B6914",
    controls: "Click blocks to mine them",
    category: "MINECRAFT",
    thumbnail: "/assets/generated/game-block-miner.dim_400x240.jpg",
  },
  {
    id: "geometry-dash",
    title: "GEOMETRY DASH",
    description:
      "Jump over spikes and obstacles in this Minecraft rhythm runner! Tap to survive!",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #1a0a2e 0%, #2e1a40 50%, #0e0818 100%)",
    accentColor: "#9B59B6",
    controls: "Space / Click to jump",
    category: "PLATFORMER",
    thumbnail: "/assets/generated/game-geometry-dash.dim_400x240.jpg",
  },
  {
    id: "block-blast",
    title: "BLOCK BLAST",
    description:
      "Place blocks to fill rows and columns. Clear as many as you can before you run out of space!",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #0a1a0a 0%, #1a2e0a 50%, #050e03 100%)",
    accentColor: "#5D8A2C",
    controls: "Click piece to select, click grid to place",
    category: "PUZZLE",
    thumbnail: "/assets/generated/game-block-blast.dim_400x240.jpg",
  },
  {
    id: "cookie-clicker",
    title: "COOKIE CLICKER",
    description:
      "Click the cookie to bake more cookies! Buy upgrades to automate your cookie empire!",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #2e1a00 0%, #4a2e08 50%, #1a0e00 100%)",
    accentColor: "#C8760A",
    controls: "Click the cookie!",
    category: "CASUAL",
    thumbnail: "/assets/generated/game-cookie-clicker.dim_400x240.jpg",
  },
  {
    id: "solar-smash",
    title: "SOLAR SMASH",
    description:
      "Destroy planets with lasers, meteors, nukes and more! Obliterate the solar system!",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #0a0520 0%, #150a38 50%, #050210 100%)",
    accentColor: "#ff6644",
    controls: "Click planet to fire weapon",
    category: "SANDBOX",
    thumbnail: "/assets/generated/game-solar-smash.dim_400x240.jpg",
  },
  {
    id: "basketball-random",
    title: "BASKETBALL RANDOM",
    description:
      "Shoot hoops as the basket moves to a new random spot after every score! Streak for bonus points!",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #2e1400 0%, #4a2200 50%, #1a0a00 100%)",
    accentColor: "#FF6600",
    controls: "Click to aim and shoot",
    category: "SPORTS",
    thumbnail: "/assets/generated/game-basketball-random.dim_400x240.jpg",
  },
  {
    id: "sky-ace",
    title: "SKY ACE",
    description:
      "Pilot your blocky plane through enemy skies! Shoot down red fighters and survive endless waves!",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #0a1e2e 0%, #1a3a50 50%, #051018 100%)",
    accentColor: "#4aa8e8",
    controls: "Arrow Up/Down or W/S to move",
    category: "SHOOTER",
    thumbnail: "/assets/generated/game-sky-ace.dim_400x240.jpg",
  },
  {
    id: "blackjack",
    title: "BLACKJACK",
    description:
      "Beat the dealer to 21 without going bust! Hit, Stand, or Double Down to win big chips!",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #0a2e0a 0%, #0f3d12 50%, #051a07 100%)",
    accentColor: "#22c55e",
    controls: "Click buttons to Hit / Stand / Double Down",
    category: "CASINO",
    thumbnail: "/assets/generated/game-blackjack.dim_400x240.jpg",
  },
  {
    id: "pokemon-ruby",
    title: "POKEMON RUBY",
    description:
      "Explore the overworld, battle wild Pokemon in tall grass, and become the greatest trainer!",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #2e0a0a 0%, #4a0808 50%, #1a0505 100%)",
    accentColor: "#cc2200",
    controls: "Arrow Keys / WASD to move",
    category: "RPG",
    thumbnail: "/assets/generated/game-pokemon-ruby.dim_400x240.jpg",
  },
];
