# Arcade Hub

## Current State
Arcade Hub is a web-based platform with a growing library of classic and casual games featuring Minecraft-themed UI and interchangeable themes. Current games include Snake, Tetris, Memory Match, Flappy Bird, Road Rush, Speed Drift, Space Shooter, Street Racer, Block Miner, Geometry Dash, Block Blast, Cookie Clicker, Solar Smash, Basketball Random, and Sky Ace.

## Requested Changes (Diff)

### Add
- Blackjack card game accessible from the main game library
- Full blackjack gameplay: player vs dealer, standard deck, hit/stand/double down actions
- Betting system: player starts with a chip balance, places bets before each hand
- Dealer draws to 17, player busts at over 21
- Ace handling: 1 or 11
- Win/loss/push outcomes with correct payouts (blackjack pays 3:2)
- Best/current chip balance persisted to localStorage
- Game thumbnail/selector card in the arcade grid
- Full-screen support

### Modify
- Add Blackjack entry to the games list/grid on the main page

### Remove
- Nothing

## Implementation Plan
1. Create a BlackjackGame React component with full game logic (deck, hand evaluation, dealer AI)
2. Implement betting UI: chip balance display, bet input, deal button
3. Implement gameplay UI: card display for player and dealer, hit/stand/double down buttons
4. Handle all outcomes: win, lose, push, blackjack (3:2 payout)
5. Persist chip balance to localStorage
6. Add fullscreen support
7. Register game in the main games grid with a thumbnail
