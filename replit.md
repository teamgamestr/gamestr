# Gamestr - Decentralized Gaming Leaderboards

## Project Overview
Gamestr is a social gaming score platform built on the Nostr protocol. It enables games to publish scores, players to compete on leaderboards, and communities to celebrate gaming achievements in a decentralized, censorship-resistant way.

**Status:** Fully configured and running on Replit
**Last Updated:** November 2, 2025

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
   - Interactive guides and playground
   - Built-in analytics
   - Open protocol (NIP-762)

### Directory Structure
```
/src
  /components - React components including UI library
  /contexts - React contexts (App, DM, NWC)
  /hooks - Custom React hooks for Nostr, scores, auth
  /lib - Utilities, game config, test data
  /pages - Page components (Home, GameDetail, PlayerProfile, etc.)
  /test - Test setup and utilities
/docs - Documentation
/public - Static assets
```

## Replit Configuration

### Development Server
- **Workflow:** `dev` 
- **Command:** `npm run dev`
- **Port:** 5000 (webview)
- **Host:** 0.0.0.0
- **Access:** Configured with `allowedHosts: true` for Replit proxy

### Deployment
- **Type:** Autoscale (stateless web app)
- **Build:** `npm run build` (outputs to /dist)
- **Run:** `npx vite preview --host 0.0.0.0 --port 5000`

## Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests with TypeScript, ESLint, Vitest, and build
- `npm run deploy` - Deploy to Nostr

## Environment Setup
No environment variables required for basic functionality. The app uses:
- Local IndexedDB for user settings
- Nostr relays for data (configured in-app)
- Optional: NWC (Nostr Wallet Connect) for zap functionality

## Test Data
The app includes comprehensive test data for development:
- 5 example games with metadata
- 5 test players with profiles
- 36 test score events
- Toggle in UI to show/hide test data

See `/docs/TEST_DATA.md` for details.

## For Game Developers
Integration is simple - publish kind 30762 events to Nostr with:
- Required tags: `d`, `game`, `score`, `p` (player pubkey)
- Optional tags: `level`, `difficulty`, `mode`, `achievements`, genre tags

Full documentation available at `/developers` route in the app.

## Recent Changes (Import Setup)
- ✅ Updated Vite config to use port 5000 with 0.0.0.0 host
- ✅ Enabled `allowedHosts: true` for Replit proxy compatibility
- ✅ Configured dev workflow for webview output
- ✅ Set up deployment configuration for autoscale
- ✅ Created .gitignore for Node.js project
- ✅ Verified app loads correctly with all features

## Notes
- This is a frontend-only application (no backend server)
- Data is fetched from Nostr relays in real-time
- All user authentication happens via Nostr keys
- No database setup required
