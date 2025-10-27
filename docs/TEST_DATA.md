# Test Data System

Gamestr includes a comprehensive local test data system that allows you to develop and test the application without connecting to Nostr relays.

## Overview

The test data system provides:
- **Sample score events** for 5 different games
- **Test player profiles** with names, avatars, and bios
- **Realistic score distributions** across different difficulty levels
- **Time-based data** with scores from different days
- **Achievement examples** showing how achievements work

## Files

### `src/lib/testData.ts`

Contains all test data including:
- `TEST_DEV_PUBKEY` - The test developer's pubkey
- `TEST_PLAYERS` - Array of 5 test players with metadata
- `ALL_TEST_SCORES` - Combined array of all test score events
- `TEST_PLAYER_METADATA` - Kind 0 events for test players

Individual score arrays:
- `SNAKE_GAME_SCORES` - 10 scores for Classic Snake
- `TETRIS_SCORES` - 8 scores for Block Puzzle Master
- `RACING_SCORES` - 6 scores for Speed Racer 3D
- `PUZZLE_SCORES` - 6 scores for Gem Crusher
- `SHOOTER_SCORES` - 6 scores for Cosmic Defender

### `src/hooks/useScoresWithTestData.ts`

Enhanced hook that combines real relay data with test data:
- `useScoresWithTestData` - Drop-in replacement for `useScores`
- `getTestPlayerMetadata` - Get metadata for test players
- `isTestPlayer` - Check if a pubkey is a test player

## Usage

### In Components

The test data is automatically included by default. Use the `includeTestData` option to control it:

```typescript
// Include test data (default)
const { data: games } = useGamesWithScores({ includeTestData: true });

// Exclude test data (production mode)
const { data: games } = useGamesWithScores({ includeTestData: false });
```

### UI Toggle

The home page includes a toggle switch to show/hide test data in real-time. This allows users to:
1. See how the app works with data immediately
2. Toggle to see only real relay data
3. Compare test data vs real data

### Test Player Profiles

Test players have full profiles with:
- Names (Alice, Bob, Charlie, Diana, Eve)
- Profile pictures from Pexels
- Bio descriptions
- Multiple scores across different games

## Test Data Structure

### Score Distribution

Each game has realistic score distributions:

**Snake Game** (10 scores)
- Range: 9,500 - 25,000 points
- Difficulties: easy, normal, hard
- Time span: 0-10 days ago

**Block Puzzle Master** (8 scores)
- Range: 22,000 - 45,000 points
- Difficulties: normal, hard, expert
- Includes achievements

**Speed Racer 3D** (6 scores)
- Range: 82,000 - 98,500 points
- Different circuits
- Time trial mode

**Gem Crusher** (6 scores)
- Range: 110,000 - 156,000 points
- Endless mode
- Level progression

**Cosmic Defender** (6 scores)
- Range: 185,000 - 285,000 points
- Survival mode
- Wave-based progression

### Time Distribution

Scores are distributed over time:
- **Today** (0 days ago) - Most recent scores
- **Yesterday** (1 day ago) - Recent activity
- **This week** (2-7 days ago) - Weekly leaderboard data
- **This month** (8-30 days ago) - Monthly leaderboard data

This allows testing of all time period filters:
- Daily leaderboards
- Weekly leaderboards
- Monthly leaderboards
- All-time leaderboards

## Identifying Test Data

Test data is marked with a special tag:
```json
["t", "test"]
```

Helper functions are provided:
- `isTestEvent(event)` - Check if an event is test data
- `filterTestEvents(events)` - Remove test events from array
- `getTestEvents(events)` - Get only test events

## Development Workflow

### 1. Initial Development
Start with test data enabled to build and test features:
```typescript
const { data } = useGamesWithScores({ includeTestData: true });
```

### 2. Testing Real Data
Toggle test data off to test with real relay data:
```typescript
const { data } = useGamesWithScores({ includeTestData: false });
```

### 3. Production
Deploy with test data available but toggleable by users.

## Adding More Test Data

To add more test games or scores:

1. **Add game metadata** to `INITIAL_GAME_CONFIG` in `src/lib/gameConfig.ts`
2. **Create score events** using `createTestScore()` in `src/lib/testData.ts`
3. **Add to export** in the `ALL_TEST_SCORES` array

Example:
```typescript
// In testData.ts
export const NEW_GAME_SCORES: NostrEvent[] = [
  createTestScore('new-game', 0, 10000, { 
    difficulty: 'normal', 
    daysAgo: 0 
  }),
  // ... more scores
];

// Add to ALL_TEST_SCORES
export const ALL_TEST_SCORES: NostrEvent[] = [
  ...SNAKE_GAME_SCORES,
  ...TETRIS_SCORES,
  ...NEW_GAME_SCORES, // Add here
];
```

## Test Player Profiles

Test players are automatically handled by the `useAuthor` hook. When a test player pubkey is detected, it returns the local metadata instead of querying relays.

To add more test players:

```typescript
// In testData.ts
export const TEST_PLAYERS = [
  // ... existing players
  {
    pubkey: 'player-frank-pubkey-1234567890abcdef',
    name: 'Frank',
    picture: 'https://images.pexels.com/...',
    about: 'Game enthusiast and collector!',
  },
];
```

## Benefits

### For Development
- ✅ **Instant feedback** - No waiting for relay queries
- ✅ **Offline development** - Work without internet
- ✅ **Consistent data** - Same data every time
- ✅ **Fast iteration** - No network delays

### For Testing
- ✅ **Predictable results** - Known data for testing
- ✅ **Edge cases** - Test with various score ranges
- ✅ **Time periods** - Test all leaderboard filters
- ✅ **Different players** - Test social features

### For Demos
- ✅ **Always works** - No relay dependencies
- ✅ **Looks populated** - Professional appearance
- ✅ **Realistic data** - Believable scores and players
- ✅ **Toggleable** - Show real data when available

## Production Considerations

In production, you may want to:

1. **Default to real data** - Set `includeTestData: false` by default
2. **Hide toggle for users** - Only show test data in development
3. **Add dev mode flag** - Use environment variable to control test data
4. **Clear separation** - Visually distinguish test data if shown

Example environment-based approach:
```typescript
const isDevelopment = import.meta.env.DEV;
const { data } = useGamesWithScores({ 
  includeTestData: isDevelopment 
});
```

## Test Data Quality

The test data is designed to be:
- **Realistic** - Believable scores and progressions
- **Diverse** - Different games, players, and difficulties
- **Time-distributed** - Spans multiple days for time filters
- **Achievement-rich** - Shows how achievements work
- **Well-formatted** - Follows NIP-762 specification exactly

## Maintenance

When updating the NIP-762 specification or adding new features:
1. Update test data to match new schema
2. Add examples of new features
3. Test with both test data and real data
4. Document any changes in this file
