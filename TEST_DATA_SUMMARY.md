# Test Data System - Quick Reference

## 📊 What's Included

### Test Games (5 total)
1. **Classic Snake** - Arcade/Casual/Retro (10 scores)
2. **Block Puzzle Master** - Puzzle/Arcade/Retro (8 scores)
3. **Speed Racer 3D** - Racing/Action/3D (6 scores)
4. **Gem Crusher** - Puzzle/Casual/Match-3 (6 scores)
5. **Cosmic Defender** - Shooter/Action/Sci-Fi (6 scores)

### Test Players (5 total)
- **Alice** - Competitive gamer and speedrunner
- **Bob** - Casual gamer enjoying puzzle games
- **Charlie** - Professional esports player
- **Diana** - Game developer and player
- **Eve** - Retro gaming enthusiast

### Test Scores (36 total)
- Distributed across 0-10 days ago
- Multiple difficulty levels (easy, normal, hard, expert)
- Various game modes (single-player, time-trial, endless, survival)
- Includes achievements and level progression
- Realistic score ranges for each game

## 🎮 How It Works

### Automatic Integration
Test data is **automatically included** by default:
- No configuration needed
- Works offline
- Instant results
- No relay delays

### UI Toggle
Users can toggle test data on/off:
- Located in the filters section on home page
- Persists across page reloads (via React state)
- Updates results immediately
- Shows/hides test badge on scores

### Visual Indicators
Test data is marked with:
- **"Test" badge** on leaderboard entries (desktop only)
- **`t: test` tag** in event data
- Easily identifiable in UI

## 🔧 For Developers

### Using Test Data in Components

```typescript
// Automatically includes test data
const { data: games } = useGamesWithScores();

// Explicitly control test data
const { data: games } = useGamesWithScores({ 
  includeTestData: true // or false
});
```

### Checking for Test Data

```typescript
import { isTestEvent, filterTestEvents } from '@/lib/testData';

// Check if event is test data
if (isTestEvent(event)) {
  console.log('This is test data');
}

// Remove test events
const realScoresOnly = filterTestEvents(allScores);
```

### Adding More Test Data

1. Open `src/lib/testData.ts`
2. Use `createTestScore()` helper:

```typescript
export const NEW_GAME_SCORES = [
  createTestScore('new-game', 0, 5000, {
    level: '1',
    difficulty: 'easy',
    daysAgo: 0
  }),
  // Add more...
];

// Add to ALL_TEST_SCORES
export const ALL_TEST_SCORES = [
  ...SNAKE_GAME_SCORES,
  ...NEW_GAME_SCORES, // Add here
];
```

3. Add game metadata to `src/lib/gameConfig.ts`:

```typescript
'test-developer-pubkey-1234567890abcdef:new-game': {
  name: 'New Game',
  description: '...',
  image: '...',
  genres: ['action'],
  // ...
}
```

## 📈 Score Distributions

### Classic Snake (10 scores)
- **Range**: 9,500 - 25,000
- **Top Score**: 25,000 (Charlie, hard mode)
- **Difficulties**: easy (3), normal (4), hard (3)
- **Time Span**: Today to 10 days ago

### Block Puzzle Master (8 scores)
- **Range**: 22,000 - 45,000
- **Top Score**: 45,000 (Diana, expert mode)
- **Difficulties**: normal (3), hard (3), expert (2)
- **Achievements**: line-clear-master, tetris-king

### Speed Racer 3D (6 scores)
- **Range**: 82,000 - 98,500
- **Top Score**: 98,500 (Charlie, expert mode)
- **Mode**: Time trial on various circuits
- **Achievements**: perfect-lap, speed-demon

### Gem Crusher (6 scores)
- **Range**: 110,000 - 156,000
- **Top Score**: 156,000 (Bob, hard mode)
- **Mode**: Endless with level progression
- **Achievements**: combo-master, gem-crusher

### Cosmic Defender (6 scores)
- **Range**: 185,000 - 285,000
- **Top Score**: 285,000 (Eve, expert mode)
- **Mode**: Survival with wave progression
- **Achievements**: alien-destroyer, no-damage

## 🎯 Testing Scenarios

### Time Period Filters
- **Daily**: Scores from today (0 days ago)
- **Weekly**: Scores from last 7 days
- **Monthly**: Scores from last 30 days
- **All-Time**: All scores

Test data is distributed to populate all time periods.

### Difficulty Filters
Test data includes:
- Easy (beginner scores)
- Normal (intermediate scores)
- Hard (advanced scores)
- Expert (professional scores)

### Game Modes
Test data includes various modes:
- Single-player
- Time-trial
- Endless
- Survival

### Achievements
Test data includes achievement examples:
- line-clear-master
- tetris-king
- perfect-lap
- speed-demon
- combo-master
- gem-crusher
- alien-destroyer
- no-damage

## 🚀 Production Deployment

### Option 1: Keep Test Data (Recommended)
- Users can toggle it on/off
- Helpful for new users to see how it works
- Shows the platform's potential
- No relay dependency for initial load

### Option 2: Remove Test Data
Set `includeTestData: false` by default:

```typescript
const { data } = useGamesWithScores({ 
  includeTestData: false 
});
```

### Option 3: Environment-Based
Use environment variables:

```typescript
const isDev = import.meta.env.DEV;
const { data } = useGamesWithScores({ 
  includeTestData: isDev 
});
```

## 📝 Benefits

### Development
✅ **Instant feedback** - No waiting for relays
✅ **Offline work** - Develop without internet
✅ **Consistent data** - Same results every time
✅ **Fast iteration** - No network delays

### Testing
✅ **Predictable** - Known data for testing features
✅ **Complete coverage** - All time periods covered
✅ **Edge cases** - Various score ranges and scenarios
✅ **Social features** - Multiple players to test with

### Demos
✅ **Always works** - No relay failures
✅ **Looks professional** - Populated with realistic data
✅ **Interactive** - Toggle on/off to show both modes
✅ **Impressive** - Shows platform capabilities

## 🔍 Finding Test Data

### In the UI
- Look for the **"Test" badge** on leaderboard entries
- Toggle the **"Show test data"** switch on home page
- Test players have consistent avatars and names

### In the Code
```typescript
import { 
  ALL_TEST_SCORES,
  TEST_PLAYERS,
  isTestEvent 
} from '@/lib/testData';

// Check events
const testScores = ALL_TEST_SCORES.filter(isTestEvent);

// Get test players
const testPlayers = TEST_PLAYERS;
```

## 📚 Documentation

For complete documentation, see:
- **`docs/TEST_DATA.md`** - Full test data system documentation
- **`src/lib/testData.ts`** - Test data source file
- **`src/hooks/useScoresWithTestData.ts`** - Enhanced hooks

## 🎨 Test Data Quality

The test data is designed to be:
- ✅ **Realistic** - Believable scores and progressions
- ✅ **Diverse** - Different games, players, difficulties
- ✅ **Time-distributed** - Spans multiple days
- ✅ **Achievement-rich** - Shows achievement system
- ✅ **Well-structured** - Follows NIP-762 exactly
- ✅ **Professional** - High-quality player profiles
- ✅ **Comprehensive** - Covers all features

---

**The test data system makes Gamestr immediately usable for development, testing, and demos without any Nostr relay setup!** 🚀
