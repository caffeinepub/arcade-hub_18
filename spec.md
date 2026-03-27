# Arcade Hub

## Current State
Arcade Hub has 18+ games. None have sound effects. There is no audio system in place.

## Requested Changes (Diff)

### Add
- `src/frontend/src/utils/sound.ts` — Shared Web Audio API sound engine. Procedurally generates all sounds using oscillators and noise (no external audio files required). Exports named functions: `playJump()`, `playEat()`, `playDeath()`, `playScore()`, `playLevelUp()`, `playShoot()`, `playExplosion()`, `playHit()`, `playClick()`, `playFlap()`, `playCardFlip()`, `playMatch()`, `playMiss()`, `playBounce()`, `playDrift()`, `playMine()`, `playLaser()`, `playWin()`, `playCombo()`, `playPowerUp()`. All sounds lazy-init the AudioContext on first use (browser autoplay policy). Include a global mute toggle (`isMuted`, `toggleMute()`).
- A mute/unmute button (speaker icon) in the Header alongside other header controls.

### Modify
Add sound effects to all games:
- **SnakeGame**: eat food → `playEat`, death → `playDeath`, level up → `playLevelUp`, power-up collect → `playPowerUp`, combo → `playCombo`
- **TetrisGame**: piece lock → `playClick`, line clear → `playScore`, level up → `playLevelUp`, game over → `playDeath`
- **MemoryMatchGame**: card flip → `playCardFlip`, match → `playMatch`, miss → `playMiss`, win → `playWin`
- **FlappyBirdGame**: flap → `playFlap`, score → `playScore`, death → `playDeath`
- **RoadRushGame**: engine/move → subtle `playDrift` on dodge, crash → `playDeath`
- **SpeedDriftGame**: drift → `playDrift`, crash → `playDeath`
- **SpaceShooterGame**: shoot → `playLaser`, enemy hit → `playHit`, explosion → `playExplosion`, death → `playDeath`
- **StreetRacerGame**: race start → `playScore`, win → `playWin`, crash → `playHit`
- **BlockMinerGame**: mine → `playMine`, overflow/game over → `playDeath`, bonus → `playPowerUp`
- **GeometryDashGame**: jump → `playJump`, death → `playDeath`, score milestone → `playScore`
- **BlockBlastGame**: block place/clear → `playClick`, explosion → `playExplosion`, screen shake → `playHit`
- **CookieClickerGame**: click → `playClick`, upgrade buy → `playPowerUp`, golden cookie → `playCombo`
- **SolarSmashGame**: weapon fire → `playShoot`, hit → `playHit`, explosion → `playExplosion`, planet destroy → `playDeath` (big boom)
- **BasketballGame**: shoot → `playShoot`, score → `playBounce`, miss → `playMiss`
- **SkyAce**: shoot → `playLaser`, enemy hit → `playHit`, player death → `playDeath`, wave clear → `playLevelUp`
- **BlackjackGame**: card deal → `playCardFlip`, win → `playWin`, bust/lose → `playDeath`, chip bet → `playClick`
- **PokemonRubyGame**: battle start → `playScore`, attack → `playHit`, faint → `playDeath`, level up → `playLevelUp`, run → `playClick`
- **TubeClickerGame**: click → `playClick`, upgrade buy → `playPowerUp`, golden video → `playCombo`, leaderboard save → `playWin`

### Remove
Nothing removed.

## Implementation Plan
1. Create `src/frontend/src/utils/sound.ts` with Web Audio API procedural sound engine and mute toggle.
2. Add mute button (🔊/🔇 icon) to `Header.tsx`.
3. Import and wire sound calls into each of the 18 game files at the appropriate event points.
4. Validate (lint + typecheck + build).
