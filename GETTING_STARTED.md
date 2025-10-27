# Getting Started with Gamestr

Welcome to Gamestr! This guide will help you get up and running quickly.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 3. Explore the App

Open your browser and you'll immediately see:
- **5 example games** with leaderboards
- **36 test scores** from 5 different players
- **Fully functional UI** with all features working

No Nostr setup required for initial development!

## 🎮 What You'll See

### Home Page (`/`)
- Grid of game cards with images and descriptions
- Search bar to find games
- Genre filter pills (arcade, puzzle, racing, etc.)
- Filter tabs (All, Featured, Trending, New)
- **Test data toggle** to show/hide example data

### Game Detail Pages
Click any game to see:
- Full leaderboards with player rankings
- Time period filters (daily, weekly, monthly, all-time)
- Difficulty and mode filters
- Player avatars and stats
- Zap buttons for tipping players

### Player Profiles
Click any player to see:
- Personal stats and achievements
- Games played and scores
- Recent activity
- Best scores per game

### Developer Resources
- `/developers` - Integration guide with code examples
- `/playground` - Interactive event testing tool

## 🧪 Test Data System

Gamestr includes **comprehensive test data** so you can start developing immediately:

### What's Included
- ✅ 5 example games with full metadata
- ✅ 5 test players with profiles and avatars
- ✅ 36 realistic score events
- ✅ Multiple difficulty levels
- ✅ Various game modes
- ✅ Achievement examples
- ✅ Time-distributed scores (0-10 days ago)

### Toggle Test Data
Use the **"Show test data"** switch on the home page to:
- See how the app works with data
- Toggle to real relay data only
- Compare test vs real scores

### Test Data Badge
Test scores show a small "Test" badge in the leaderboard, so you always know what's real data vs test data.

## 🔑 Nostr Login

To publish scores or test the playground:

1. **Install a Nostr Extension**
   - [Alby](https://getalby.com/) (recommended)
   - [nos2x](https://github.com/fiatjaf/nos2x)
   - Any NIP-07 compatible extension

2. **Create/Import Account**
   - Generate a new Nostr keypair
   - Or import existing keys

3. **Log In**
   - Click "Log in" in the header
   - Approve the connection request
   - You're ready to publish!

## 🎯 Key Features to Try

### 1. Browse Games
- Use the search bar to find games
- Filter by genre (arcade, puzzle, racing, etc.)
- Switch between All/Featured/Trending/New

### 2. View Leaderboards
- Click any game card
- Try different time periods (daily, weekly, monthly, all-time)
- Filter by difficulty or mode
- See player rankings with trophy icons

### 3. Explore Player Profiles
- Click any player avatar or name
- See their gaming stats
- View scores across all games
- Check recent activity

### 4. Test the Playground
- Go to `/playground`
- Log in with Nostr
- Fill out the score event form
- Publish a test score
- See it appear in the feed!

### 5. Read Developer Docs
- Visit `/developers`
- See integration examples
- Copy code snippets
- Learn about NIP-762

## 🛠️ Development Workflow

### With Test Data (Default)
```typescript
// Test data is included automatically
const { data: games } = useGamesWithScores();
```

Perfect for:
- Building new features
- Testing UI components
- Offline development
- Quick iteration

### With Real Data
```typescript
// Disable test data
const { data: games } = useGamesWithScores({ 
  includeTestData: false 
});
```

Perfect for:
- Testing relay integration
- Verifying real data handling
- Production testing
- Performance testing

### Hybrid Mode
```typescript
// Combine both (default behavior)
const { data: games } = useGamesWithScores({ 
  includeTestData: true 
});
```

Perfect for:
- Demos and presentations
- Showing potential
- Development with real data
- Fallback when relays are slow

## 📁 Project Structure

```
gamestr/
├── src/
│   ├── components/      # UI components
│   │   ├── GameCard.tsx
│   │   ├── GamesGrid.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── hooks/          # Custom hooks
│   │   ├── useScores.ts
│   │   ├── useGameConfig.ts
│   │   └── useScoresWithTestData.ts
│   ├── lib/            # Utilities
│   │   ├── gameConfig.ts
│   │   └── testData.ts  # ← Test data here
│   ├── pages/          # Page components
│   │   ├── Home.tsx
│   │   ├── GameDetail.tsx
│   │   ├── PlayerProfile.tsx
│   │   ├── Developers.tsx
│   │   └── Playground.tsx
│   └── ...
├── docs/               # Documentation
│   └── TEST_DATA.md    # ← Test data docs
├── NIP.md             # NIP-762 specification
└── README.md          # Main documentation
```

## 🎨 Customization

### Add Your Own Games
Edit `src/lib/gameConfig.ts`:
```typescript
'your-pubkey:your-game': {
  name: 'Your Game',
  description: 'Game description',
  image: 'https://...',
  genres: ['action', 'arcade'],
  featured: true,
}
```

### Add Test Scores
Edit `src/lib/testData.ts`:
```typescript
export const YOUR_GAME_SCORES = [
  createTestScore('your-game', 0, 10000, {
    difficulty: 'normal',
    daysAgo: 0
  }),
];
```

### Change Theme
The app supports light and dark mode. Click the sun/moon icon in the header to toggle.

## 🐛 Troubleshooting

### No Games Showing?
- Check if test data toggle is ON
- Check browser console for errors
- Verify relay connection (if using real data)

### Scores Not Loading?
- Test data loads instantly
- Real data may take 1-3 seconds
- Check relay status in console

### Can't Publish Scores?
- Make sure you're logged in with Nostr
- Check that your extension is connected
- Try the playground page first

## 📚 Learn More

### Documentation
- **`README.md`** - Complete project documentation
- **`NIP.md`** - NIP-762 specification
- **`docs/TEST_DATA.md`** - Test data system details
- **`IMPLEMENTATION_SUMMARY.md`** - Implementation overview

### Pages to Visit
- `/` - Home page with games
- `/developers` - Integration guide
- `/playground` - Event testing tool
- `/game/:pubkey/:gameId` - Game leaderboards
- `/player/:pubkey` - Player profiles

## 🎉 You're Ready!

You now have a fully functional gaming leaderboard platform running locally with:
- ✅ Beautiful UI with dark mode
- ✅ Real-time leaderboards
- ✅ Player profiles
- ✅ Test data for development
- ✅ Developer tools
- ✅ Nostr integration

Start building, testing, and customizing Gamestr for your needs!

---

**Questions?** Check the docs or explore the code. Everything is well-documented and type-safe!

**Built with MKStack** - https://soapbox.pub/mkstack
