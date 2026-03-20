# Arcade Hub

## Current State
Live Chat is a single global room. Users choose a display name and messages are stored in a flat array in the backend. The ChatPage renders messages, allows name editing, and sends to/from the single room.

## Requested Changes (Diff)

### Add
- Private chat rooms with custom join codes.
- Backend: rooms map keyed by code, each with its own message array.
- Backend functions: sendRoomMessage(code, sender, text), getRoomMessages(code).
- Frontend: room selection screen after name entry -- Global Chat or Private Room (enter/create code).
- Private room view shows the room code prominently for sharing.

### Modify
- ChatPage: add room-selection step between name entry and chat view.

### Remove
- Nothing.

## Implementation Plan
1. Add backend types and functions for private rooms.
2. Update ChatPage with room picker UI and private room chat view.
