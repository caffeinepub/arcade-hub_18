# Arcade Hub

## Current State
Arcade Hub is a web-based platform with a growing library of games including Snake, Tetris, Memory Match, Flappy Bird, Road Rush, Speed Drift, Space Shooter, Street Racer, Block Miner, Geometry Dash, Block Blast, Cookie Clicker, Solar Smash, and Basketball Random. All games use Minecraft-themed visuals by default with interchangeable themes.

## Requested Changes (Diff)

### Add
- **Sky Ace**: A side-scrolling airplane shooter game. Player pilots a plane that auto-scrolls through the sky, shooting down enemy planes and dodging obstacles. Features: score counter, lives (3), enemy waves that increase in speed/frequency, and particle explosion effects on hits. Minecraft-themed aesthetic (pixelated sky, blocky clouds, blocky plane and enemies).

### Modify
- Add Sky Ace to the game grid on the main page with a thumbnail.

### Remove
- Nothing.

## Implementation Plan
1. Create `SkyAce.tsx` game component with Canvas-based side-scrolling shooter.
2. Player plane on the left side, can move up/down with arrow keys or W/S.
3. Auto-fire bullets; enemy planes spawn from the right and move left.
4. Obstacles (clouds, mountains) scroll in the background.
5. Score increments per enemy destroyed; lives decrease on collision.
6. Game over screen with score and restart.
7. Minecraft pixel art style: blocky plane, pixelated clouds, green hills.
8. Add Sky Ace entry to the games list in App.tsx with thumbnail.
9. Full-screen button support.
