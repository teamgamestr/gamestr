# Gamestr 🎮

**Decentralized Gaming Leaderboards on Nostr**

Gamestr is a social gaming score platform built on the Nostr protocol. It enables games to publish scores, players to compete on leaderboards, and communities to celebrate gaming achievements—all in a decentralized, censorship-resistant way.

## Features

### For Players
- 🏆 **Global Leaderboards** - Compete with players worldwide across all games
- 📊 **Personal Stats** - Track your scores, achievements, and gaming history
- 🎮 **Multi-Game Support** - All your gaming achievements in one place
- ⚡ **Zap Scores** - Send sats to celebrate amazing achievements
- 🔍 **Advanced Filtering** - Filter by genre, difficulty, mode, and time period
- 🌐 **Decentralized** - Your scores are published to Nostr, not locked in a database

### For Developers
- 🚀 **Easy Integration** - Add leaderboards with just a few lines of code
- 📚 **Comprehensive Docs** - Interactive guides and code examples
- 🧪 **Event Playground** - Test score events in your browser
- 📈 **Built-in Analytics** - Track player engagement and top scores
- 🔓 **Open Protocol** - Based on NIP-762 (kind 762 events)
- 🌍 **Cross-Platform** - Works with any programming language

### Core Features
- **Game Discovery** - Browse games by genre, trending, featured, and new releases
- **Time-Based Leaderboards** - Daily, weekly, monthly, and all-time rankings
- **Rich Metadata** - Support for levels, difficulty, modes, achievements, and more
- **Social Interactions** - Comment, zap, and share scores
- **Player Profiles** - View any player's gaming history and achievements
- **Responsive Design** - Beautiful UI on desktop and mobile
- **Dark Mode** - Full dark/light theme support

## Technology Stack

- **React 18** - Modern React with hooks and concurrent rendering
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible UI components
- **Nostrify** - Nostr protocol integration
- **TanStack Query** - Data fetching and caching
- **React Router** - Client-side routing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Nostr account (for publishing scores and testing)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd gamestr

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## For Game Developers

### Quick Integration

1. **Create a Nostr Identity** for your game
2. **Choose a Game Identifier** (e.g., "my-awesome-game")
3. **Publish Score Events** when players achieve scores

### Example: Publishing a Score (JavaScript)

```javascript
import { SimplePool, getPublicKey, finalizeEvent } from 'nostr-tools';

const pool = new SimplePool();
const relays = ['wss://relay.nostr.band', 'wss://relay.damus.io'];

async function publishScore(playerPubkey, score, metadata = {}) {
  const event = {
    kind: 762,
    created_at: Math.floor(Date.now() / 1000),
    content: 'New high score!',
    tags: [
      ['d', `my-game:${Date.now()}:${Math.random().toString(36).substring(7)}`],
      ['game', 'my-awesome-game'],
      ['score', score.toString()],
      ['p', playerPubkey],
      ['t', 'arcade'], // Genre tag
    ],
  };

  const signedEvent = finalizeEvent(event, gamePrivateKey);
  await Promise.any(pool.publish(relays, signedEvent));
  
  return signedEvent;
}
```

### Score Event Structure (Kind 762)

```json
{
  "kind": 762,
  "pubkey": "game-developer-pubkey",
  "created_at": 1698765432,
  "content": "New high score achieved!",
  "tags": [
    ["d", "game-id:timestamp:random"],
    ["game", "my-awesome-game"],
    ["score", "15000"],
    ["p", "player-pubkey"],
    ["level", "12"],
    ["difficulty", "hard"],
    ["mode", "single-player"],
    ["t", "arcade"]
  ]
}
```

### Required Tags

- `d` - Unique identifier (format: `game:timestamp:random`)
- `game` - Your game identifier (lowercase, hyphenated)
- `score` - Numeric score value (as string)
- `p` - Player's Nostr pubkey

### Optional Tags

- `level` - Game level or stage
- `difficulty` - Difficulty level (easy, normal, hard, expert)
- `mode` - Game mode (single-player, multiplayer, co-op)
- `duration` - Time taken in seconds
- `achievements` - Comma-separated achievement IDs
- `t` - Genre tags (arcade, puzzle, fps, etc.)

### Adding Your Game to Gamestr

To appear on Gamestr with proper metadata (name, description, image, genres):

1. Visit the **Playground** page at `/playground`
2. Test your score events
3. Contact us or submit a PR to add your game metadata

## Project Structure

```
gamestr/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── GameCard.tsx  # Game thumbnail card
│   │   ├── GamesGrid.tsx # Games grid layout
│   │   ├── Header.tsx    # Navigation header
│   │   └── Layout.tsx    # Page layout wrapper
│   ├── hooks/            # Custom React hooks
│   │   ├── useScores.ts  # Query score events
│   │   ├── useGameConfig.ts # Game metadata management
│   │   └── ...
│   ├── lib/              # Utility functions
│   │   ├── gameConfig.ts # Game metadata configuration
│   │   └── ...
│   ├── pages/            # Page components
│   │   ├── Home.tsx      # Main games page
│   │   ├── GameDetail.tsx # Game leaderboard page
│   │   ├── PlayerProfile.tsx # Player profile page
│   │   ├── Developers.tsx # Developer guide
│   │   └── Playground.tsx # Event testing playground
│   └── ...
├── NIP.md               # NIP-762 specification
└── README.md           # This file
```

## Game Metadata Configuration

Games are configured in `src/lib/gameConfig.ts`. Each game is indexed by `<developer-pubkey>:<game-identifier>`:

```typescript
export const INITIAL_GAME_CONFIG: GameConfigMap = {
  'dev-pubkey:game-id': {
    name: 'My Awesome Game',
    description: 'An amazing game description',
    image: 'https://example.com/game-image.jpg',
    genres: ['arcade', 'casual'],
    url: 'https://example.com/play',
    developer: 'Developer Name',
    featured: true,
    trending: false,
    newRelease: false,
  },
};
```

## Available Genres

- action
- adventure
- arcade
- casual
- fps
- match-3
- multiplayer
- puzzle
- racing
- retro
- rpg
- sci-fi
- shooter
- simulation
- sports
- strategy
- 3d

## Leaderboard Time Periods

- **Daily** - Last 24 hours
- **Weekly** - Last 7 days
- **Monthly** - Last 30 days
- **All-Time** - All scores ever

## NIP-762: Game Scores

Gamestr implements NIP-762, a standardized format for publishing game scores to Nostr. The full specification is available in `NIP.md`.

### Key Features of NIP-762

- Uses kind 762 events
- Supports multiple difficulty levels and game modes
- Achievement tracking
- Genre categorization with `t` tags
- Anti-cheat verification support
- Time-based leaderboards

## Contributing

We welcome contributions! Here's how you can help:

### Adding Games

1. Fork the repository
2. Add your game metadata to `src/lib/gameConfig.ts`
3. Submit a pull request

### Improving the Platform

- Report bugs via GitHub issues
- Suggest features
- Submit pull requests
- Improve documentation
- Add translations

### Developer Resources

- Visit `/developers` for integration guides
- Use `/playground` to test score events
- Read `NIP.md` for the full specification
- Check `docs/` for implementation patterns

## Roadmap

### Phase 1 (Current)
- ✅ Core leaderboard functionality
- ✅ Game discovery and filtering
- ✅ Player profiles
- ✅ Developer guide and playground
- ✅ Time-based leaderboards

### Phase 2 (Planned)
- [ ] Friend leaderboards
- [ ] Achievement badges and icons
- [ ] Score verification system
- [ ] Game analytics dashboard
- [ ] Mobile app
- [ ] Notifications for new records
- [ ] Score comments and discussions
- [ ] Multi-language support

### Phase 3 (Future)
- [ ] Tournament system
- [ ] Team leaderboards
- [ ] Streaming integration
- [ ] Game developer analytics
- [ ] Custom leaderboard widgets
- [ ] API for third-party integrations

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: Visit `/developers` in the app
- **Issues**: GitHub Issues
- **Community**: Join us on Nostr

## Acknowledgments

- Built with [MKStack](https://soapbox.pub/mkstack)
- Powered by the [Nostr protocol](https://nostr.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

**Vibed with MKStack** - https://soapbox.pub/mkstack
