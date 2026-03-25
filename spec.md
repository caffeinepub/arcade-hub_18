# Arcade Hub — Snake Enhancement

## Current State
Snake has: score counter, 5 skins, 4 game modes (Classic/SpeedRun/Portal/Maze), best score per mode, 3 power-ups (star/clock/cherry), combo system, pause, death flash, mobile D-pad, 25x25 grid.

## Requested Changes (Diff)

### Add
- Persistent top-10 leaderboard (trophy button toggle, same pattern as Blackjack/Cookie Clicker)
- Shield power-up: absorbs one fatal collision (wall or self), flashes snake white when active
- Particle burst when eating food (8 small colored particles fly outward, fade in ~400ms)
- Gradient/fade on snake body — tail segments become progressively more transparent/darker
- Portal gates drawn on edges in Portal mode (glowing cyan doorways on walls showing where wrapping occurs)
- Level counter in HUD — increases every 5 food eaten, displayed alongside score
- Smooth score number animation (count up)

### Modify
- Snake head: draw rounded rectangle with visible eyes (direction-aware), mouth detail
- Food: change to a glowing apple/diamond shape with better spark effect
- HUD: add level display, make combo more prominent with color change per combo tier
- Game over screen: show final score, level reached, mode, skin used

### Remove
- Nothing

## Implementation Plan
1. Add leaderboard data structure + localStorage persistence + trophy panel UI
2. Add shield power-up type + logic (absorb death once, white flash)
3. Add particle system in canvas render (array of particles, each with velocity/alpha/color)
4. Snake body gradient: draw from tail→head, alpha increases. Head drawn as rounded rect with eyes/mouth
5. Portal mode: compute dynamic portal gate positions based on snake head approach direction; draw cyan arches on wall edges
6. Level = Math.floor(foodEaten / 5) + 1; show in HUD
7. Leaderboard: save entry with name, score, mode on game over prompt; top-10; toggle with trophy icon
