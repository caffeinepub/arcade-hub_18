# Arcade Hub

## Current State
Arcade Hub has 7 games: Snake, Tetris, Memory Match, Flappy Bird, Road Rush, Speed Drift, Space Shooter. Backend stores global high scores per game. Frontend has a games grid, leaderboard sidebar, and individual game pages with score submit modal.

## Requested Changes (Diff)

### Add
- New game "Street Racer" (id: `street-racer`, category: RACING) added to games.ts
- `StreetRacerGame.tsx` -- top-down canvas racing game with:
  - Player car races 3 AI opponents on a looping oval/track
  - Bet system: before each race pick a wager (e.g. $100, $250, $500)
  - Win/lose money based on finish position (1st wins the pot, 2nd/3rd/4th loses bet)
  - Starting wallet of $1000 stored in localStorage (`street-racer-wallet`)
  - Car garage: 4 cars with increasing cost and performance (speed, handling)
    - Starter (free, default), Street ($500), Sport ($1500), Super ($4000)
  - Pre-race screen shows garage + wallet, lets player pick car and bet
  - Post-race screen shows result, earnings/losses, updated wallet
  - onGameOver(score) called with total wallet value at end (so it submits to leaderboard)
- Game registered in `GamePage.tsx`

### Modify
- `games.ts`: add Street Racer entry with orange-gold accent color
- `GamePage.tsx`: import and render `StreetRacerGame`

### Remove
- Nothing

## Implementation Plan
1. Add Street Racer to games.ts data
2. Build StreetRacerGame.tsx with canvas-based top-down racing, wallet/car system in localStorage, pre/post race UI screens
3. Wire into GamePage.tsx
