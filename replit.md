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
- `npm test` - Run TypeScript, ESLint, Vitest, and build checks
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

## Multi-Leaderboard Support
Games can define multiple leaderboards via the `leaderboards` array in `GameMetadata` (in `src/lib/gameConfig.ts`). Each `LeaderboardConfig` specifies:
- `label`: Display name (e.g., "Score", "Highest Word")
- `scoreTag`: The Nostr event tag to read the score from (e.g., "score", "score:highestword")
- `direction`: Sort direction ("asc" or "desc")
- `displayTag` (optional): Extra tag to show alongside the score (e.g., "highestword")
- `displayLabel` (optional): Label for the display value (e.g., "Word")

On desktop, multiple leaderboards display side-by-side. On mobile, they use tabs. Games without a `leaderboards` config use the standard single leaderboard. The `useMultiLeaderboard` hook (in `src/hooks/useScores.ts`) fetches and parses scores for all configured boards.

`LeaderboardConfig` also supports two display preferences (used by both `leaderboards` and `leaderboardSplit`):
- `filterTag` + `filterValue` (optional): Restrict a board to events whose `filterTag` equals `filterValue` (used to split boards by level/track).
- `scoreFormat` (optional): `"number"` (default, thousands-separated) or `"time"` (value rendered as `m:ss.xx` / `s.xx`).
- `scoreUnit` (optional): Input units for `"time"` — `"ms"` or `"s"` (default `"s"`).

## Per-Level (Split) Leaderboards
Two orthogonal axes describe a game's boards:
1. **Score *what*** → multiple metrics on the same events, via `leaderboards: LeaderboardConfig[]` (different `scoreTag` per board). Example: Words With Zaps (Score + Highest Word).
2. **Score *where*** → one metric split into a board per tag value, via `leaderboardSplit` on `GameMetadata`. Example: BTC Rally splits lap time (`score` tag, milliseconds, `direction: "asc"`) by the `level` tag into one board per track.

`LeaderboardSplitConfig` fields:
- `splitTag`: Event tag whose value selects the board (e.g., "level").
- `scoreTag` (optional, default "score"), `direction`, `scoreFormat`, `scoreUnit`.
- `layout` (optional): `"tabs"` renders a horizontally scrollable track selector (best for many values); `"grid"` reuses the side-by-side layout.
- `values`: Ordered list of `{ value, label }` mapping raw tag values to friendly names.

`resolveLeaderboards(metadata)` (in `src/lib/gameConfig.ts`) expands either config into a `LeaderboardConfig[]`. `formatScoreValue(value, prefs)` and `getScoreDisplayPrefs(metadata)` apply the display preferences consistently across GameDetail, ScoreDetail, and PlayerProfile (including direction-aware "best" scores for `asc` games).

## Recent Changes
- ✅ Added per-level (split) leaderboards and score display preferences (Jun 7, 2026)
  - BTC Rally configured with 7 per-track boards (scrollable tab selector), time-formatted scores (ms), lower-is-better
  - New `leaderboardSplit` config + `scoreFormat`/`scoreUnit`/`filterTag` on `LeaderboardConfig`
  - Time formatting applied across GameDetail, ScoreDetail, and PlayerProfile
- ✅ Added multi-leaderboard support for games (Mar 2, 2026)
  - Words With Zaps configured with Score and Highest Word boards
  - Desktop: side-by-side layout; Mobile: tabbed interface
  - LeaderboardPanel component with displayValue support
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
