# Arcade Hub - Solar Smash Improvements

## Current State
Solar Smash is a 3D planet destruction game with:
- 5 weapons (Laser, Meteor, Nuke, Black Hole, Ice Ray)
- Canvas-based planet texture with 3 types (Earth, Mars, Gas Giant)
- Click to blast craters on planet texture
- HP bar (1000 HP), score tracking, planets destroyed counter
- Explosion particle effect when planet HP hits 0
- Planet respawns with new texture after destruction

## Requested Changes (Diff)

### Add
- 4 new weapons: Lightning Storm, Acid Rain, Gravity Bomb, Solar Flare
- Planet health regen mode toggle (planet slowly regenerates HP)
- Combo system: rapid hits in succession give bonus damage/score multiplier
- Screen shake on impact (especially for big weapons)
- Weapon charge indicator / cooldown for powerful weapons
- More detailed explosion: debris chunks flying off planet
- Planet ring system (Saturn-like ring on some planets)
- Weapon impact sound visual cue (ripple wave)

### Modify
- Planet types expanded: add 4th type (Ice/Tidal planet) and 5th type (Toxic/Alien planet)
- HP increased to 2000 for more satisfying destruction
- Hit popups show weapon name briefly
- Explosion effect lasts longer and looks more spectacular
- Weapon bar shows cooldown overlay for powerful weapons

### Remove
- Nothing removed

## Implementation Plan
1. Add new weapon definitions with cooldowns for Nuke/Black Hole/new heavy weapons
2. Add new planet types (Ice, Toxic)
3. Add ring mesh to planet scene for gas giant / some types
4. Increase HP to 2000
5. Implement combo multiplier: hits within 1.5s of each other chain a combo
6. Add screen shake state driven by impact magnitude
7. Add planet regen toggle button in UI
8. Expand explosion with debris chunks (small spheres flying outward)
9. Add ripple/shockwave mesh on impact
10. Polish weapon bar with cooldown progress overlay
