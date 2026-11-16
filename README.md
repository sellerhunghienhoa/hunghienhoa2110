# Little Legends: Puzzle PVP

Clean-room original Match-3 Puzzle PVP project built with **React + TypeScript + Vite**, an authoritative **WebSocket PvP server**, and **Capacitor iOS** (`.ipa` build pipeline).

## Features
- **Match-3 PVP Arena (7×7 grid, 6 gem types)**: Tap or swipe adjacent gems, trigger cascading combos, spawn **Line Cleaver (4-match)** and **Nova Bomb (5/L/T-match)** special gems, earn **Extra Turns**, charge Legend mana, and cast active/limited skills.
- **3 Playable Modes**:
  - **VS AI Duel** (3 progressive AI squads)
  - **Local 2P Pass & Play**
  - **Online Room PvP** (6-letter room code over WebSocket via `npm run server`)
- **5-Tab Game Loop & Splash**:
  - **Store**: 1x and 9x Summon Packs (*Collect New Legends* 3×3 showcase), **Earn Rewards!** 10-slice Spin Wheel, currency exchange.
  - **Legend**: 5-slot lineup builder (drag-and-drop or tap-to-assign), `All / Active / Limited / Passive` filters, shard & Gold upgrades.
  - **Match**: Live PvP combat arena.
  - **Tournament**: **Multiplayer Arena** 8-player knockout bracket (Quarterfinals → Semifinals → Finals) + 3-stage Trial Cup.
  - **Island**: **Home Decoration** 6-plot Sanctuary Park builder + passive resource generators with assigned Legend guardians.

## Run on Windows / Desktop
```bash
npm install
npm test
npm run dev
```
Optional online PvP room server (for two browsers/devices):
```bash
npm run server
```

## Build `.ipa` for iOS
Windows cannot compile Xcode iOS binaries directly, so the Capacitor iOS project (`ios/App/App.xcodeproj`) is paired with `.github/workflows/build-ios-ipa.yml`:

1. Push this repository to GitHub (or open `ios/App/App.xcodeproj` in Xcode on a Mac).
2. Run the **Build iOS IPA** workflow on `macos-latest`:
   - **Without Apple signing secrets**: outputs `LittleLegends-unsigned.ipa` as a workflow artifact (for sideloading/re-signing with AltStore, Sideloadly, or Xcode).
   - **With Apple signing secrets** (`APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_PROVISIONING_PROFILE_BASE64`, `APPLE_TEAM_ID`): outputs `LittleLegends-signed.ipa`.
