# Arcade Hub

## Current State
Arcade Hub has 9 games. Each game has a thumbnail in games.ts and is rendered in GamePage.tsx.

## Requested Changes (Diff)

### Add
- GeometryDashGame.tsx: rhythm-based side-scroller. Cube auto-runs right, Space/Click to jump over spikes. Score = distance. Minecraft-themed: grass-block hero, stone/lava spike obstacles, increasing speed over time.
- Entry in games.ts for geometry-dash
- Thumbnail image

### Modify
- GamePage.tsx: add geometry-dash rendering case

### Remove
- Nothing

## Implementation Plan
1. Generate Geometry Dash thumbnail
2. Create GeometryDashGame.tsx (canvas, auto-scroll, jump, obstacles, score)
3. Add entry to games.ts
4. Wire up in GamePage.tsx
