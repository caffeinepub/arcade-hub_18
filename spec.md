# Arcade Hub

## Current State
Arcade Hub is a Minecraft-themed web arcade with games, leaderboard, live chat, and header buttons. All styling uses hardcoded Minecraft-style CSS variables (dark stone, grass green, dirt brown) in index.css and inline styles throughout components.

## Requested Changes (Diff)

### Add
- ThemeContext (React context + provider) with a `theme` state and `setTheme` function, persisted to localStorage
- 4 themes:
  - **Minecraft** (default): current dark stone/grass green aesthetic
  - **Neon Arcade**: dark background with neon cyan, magenta, and electric purple glows
  - **Retro Pixel**: black background, bright red/yellow/white pixel art style
  - **Space**: deep navy/dark blue background with starfield texture, blue/violet accents
- Theme switcher UI: a small palette/paint icon button in the Header (right side, next to LOGIN), opens a compact dropdown with the 4 theme names
- Each theme overrides CSS custom properties (--background, --foreground, --primary, --card, etc.) and the .mc-border, .mc-panel, .mc-btn, .mc-grass-border-bottom border/bg colors via data-theme attribute on <html> or <body>

### Modify
- App.tsx: wrap AppContent in ThemeProvider
- Header.tsx: add theme switcher button
- index.css: add [data-theme="neon"], [data-theme="retro"], [data-theme="space"] CSS blocks that override variables and utility classes

### Remove
- Nothing removed

## Implementation Plan
1. Create src/frontend/src/contexts/ThemeContext.tsx with ThemeProvider and useTheme hook; persist to localStorage
2. Update index.css to add theme-specific variable overrides and mc-* class overrides per data-theme
3. Update App.tsx to wrap with ThemeProvider and apply data-theme to document.documentElement
4. Update Header.tsx to add a palette icon button + dropdown for theme selection
5. Validate and build
