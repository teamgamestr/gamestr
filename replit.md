# Gamestr - Decentralized Gaming Leaderboards

## Project Overview
Gamestr is a social gaming score platform built on the Nostr protocol. It enables games to publish scores, players to compete on leaderboards, and communities to celebrate gaming achievements in a decentralized, censorship-resistant way.

**Status:** Fully configured and running on Replit
**Last Updated:** February 28, 2026

## Technology Stack
- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite 6.3.5
- **Styling:** TailwindCSS with shadcn/ui components
- **Protocol:** Nostr (NIP-762 for game scores)
- **State Management:** TanStack Query
- **Routing:** React Router v6

## Project Architecture

### Key Features
1. **Player Features:**
   - Global leaderboards across all games
   - Personal stats and gaming history
   - Multi-game support
   - Zap scores (send Bitcoin sats)
   - Advanced filtering by genre, difficulty, mode, time period

2. **Developer Features:**
   - Easy integration via Nostr events (kind 30762)
   - Developer guide with code examples
   - Built-in analytics
   - Open protocol (NIP-762)

### Directory Structure
```
/src
  /components - React components including UI library
  /contexts - React contexts (App, DM, NWC)
  /hooks - Custom React hooks for Nostr, scores, auth
  /lib - Utilities, game config
  /pages - Page components (Home, GameDetail, PlayerProfile, etc.)
/docs - Documentation
/public - Static assets
/server - Score bot and server utilities
```

## Replit Configuration

### Development Server
- **Workflow:** `dev` 
- **Command:** `bash scripts/setup-ssh.sh && npm run dev`
- **Port:** 5000 (webview)
- **Host:** 0.0.0.0
- **Access:** Configured with `allowedHosts: true` for Replit proxy

### Deployment
- **Type:** Autoscale (stateless web app)
- **Build:** `npm run build` (outputs to /dist)
- **Run:** `node server.js` (Express server with SEO meta injection and score bot)

## Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run TypeScript, ESLint, and build checks
- `npm run deploy` - Deploy to Nostr

## Environment Setup
No environment variables required for basic functionality. The app uses:
- Local IndexedDB for user settings
- Nostr relays for data (configured in-app)
- Optional: NWC (Nostr Wallet Connect) for zap functionality

### Git SSH Setup
The `GITHUB_SSH_KEY` secret contains a base64-encoded SSH private key for GitHub (authenticates as `dadofsambonzuki`).

The SSH setup runs automatically on startup as part of the `dev` workflow command. The script (`scripts/setup-ssh.sh`) decodes the key, writes it to `~/.ssh/id_ed25519`, adds GitHub to known_hosts, and configures `~/.ssh/config`.

The git remote uses SSH: `git@github.com:teamgamestr/gamestr.git`

## For Game Developers
Integration is simple - publish kind 30762 events to Nostr with:
- Required tags: `d`, `game`, `score`, `p` (player pubkey)
- Optional tags: `level`, `difficulty`, `mode`, `achievements`, genre tags

Full documentation available at `/developers` route in the app.

## Game Config Cache Invalidation

When you update `src/lib/gameConfig.ts`, you must also update the `GAME_CONFIG_VERSION` constant to force users' browsers to reload the new configuration:

```typescript
// In src/lib/gameConfig.ts
export const GAME_CONFIG_VERSION = "YYYY-MM-DD-vN";  // e.g., "2024-12-17-v2"
```

This version is stored in users' local storage and compared on each page load. When the version changes, the cached config is automatically replaced with the new defaults.

## Recent Changes
- ✅ Removed playground, demo games, and test functionality (Feb 28, 2026)
  - Deleted Playground page and route
  - Removed 5 demo games (snake-game, tetris-clone, speed-racer, match-three, space-shooter)
  - Removed test data system (testData.ts, useScoresWithTestData.ts, test toggle in UI)
  - Removed test tag filtering from kind 30762 events
  - Removed vitest test files and test infrastructure
  - Cleaned up all test-related imports and references
- ✅ Added Words With Zaps as a player-signed kind 30762 game (Feb 28, 2026)
- ✅ Simplified game URLs to /:gameIdentifier (Feb 24, 2026)
- ✅ Added kind 5555 (player-signed) score event support (Feb 24, 2026)
- ✅ Added support for listing games without a Nostr pubkey (Feb 23, 2026)
- ✅ Added game config versioning for automatic cache invalidation (Dec 17, 2025)

## Notes
- This is a frontend-only application with an optional Express server for production (SEO + score bot)
- Data is fetched from Nostr relays in real-time
- All user authentication happens via Nostr keys
- No database setup required
