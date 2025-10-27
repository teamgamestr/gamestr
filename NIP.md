# NIP-762: Game Scores

`draft` `optional`

This NIP defines a standardized format for publishing game scores to the Nostr network, enabling decentralized leaderboards, player achievements, and social gaming features.

## Event Kind

- `762`: Game Score Event

## Event Structure

A kind 762 event represents a player's score in a game. The event MUST include the following tags:

### Required Tags

- `d` - Unique identifier for this score event (format: `<game-identifier>:<timestamp>:<random>`)
- `game` - Game identifier (unique string chosen by game developer)
- `score` - Numeric score value (as string)
- `p` - Player's pubkey (the person who achieved this score)

### Optional Tags

- `level` - Game level or stage where score was achieved
- `difficulty` - Difficulty level (e.g., "easy", "normal", "hard", "expert")
- `mode` - Game mode (e.g., "single-player", "multiplayer", "co-op")
- `duration` - Time taken to achieve score in seconds
- `achievements` - Comma-separated list of achievement IDs earned
- `replay` - URL to replay file or video proof
- `verification` - Cryptographic proof or signature for anti-cheat
- `version` - Game version string
- `platform` - Platform where game was played (e.g., "web", "ios", "android", "pc")
- `t` - Genre tags for categorization (e.g., "arcade", "puzzle", "fps")

### Content Field

The `content` field SHOULD contain a human-readable description of the score achievement, such as:

```
"Achieved 15,000 points on Level 12 in Hard mode!"
```

The content field MAY be empty if no description is provided.

## Example Event

```json
{
  "kind": 762,
  "pubkey": "game-developer-pubkey",
  "created_at": 1698765432,
  "content": "New high score! Beat the boss on expert difficulty.",
  "tags": [
    ["d", "snake-game:1698765432:abc123"],
    ["game", "snake-game"],
    ["score", "15000"],
    ["p", "player-pubkey"],
    ["level", "12"],
    ["difficulty", "hard"],
    ["mode", "single-player"],
    ["duration", "180"],
    ["achievements", "first-win,speed-demon,perfectionist"],
    ["version", "1.2.0"],
    ["platform", "web"],
    ["t", "arcade"],
    ["t", "casual"]
  ],
  "id": "...",
  "sig": "..."
}
```

## Publishing Scores

### By Game Developers

Game developers SHOULD publish score events from their game's Nostr account (pubkey). The developer's pubkey serves as the authoritative source for that game's scores.

### By Players

Players MAY also publish their own score events, but games SHOULD implement verification mechanisms to prevent cheating when using player-published scores.

## Querying Scores

### All Scores for a Game

```typescript
const events = await nostr.query([{
  kinds: [762],
  authors: [gameDeveloperPubkey],
  '#game': ['snake-game'],
  limit: 100
}], { signal });
```

### Player's Scores Across All Games

```typescript
const events = await nostr.query([{
  kinds: [762],
  '#p': [playerPubkey],
  limit: 100
}], { signal });
```

### Top Scores by Game and Difficulty

```typescript
const events = await nostr.query([{
  kinds: [762],
  authors: [gameDeveloperPubkey],
  '#game': ['snake-game'],
  '#difficulty': ['hard'],
  limit: 100
}], { signal });

// Sort by score in JavaScript
const topScores = events
  .map(e => ({
    event: e,
    score: parseInt(e.tags.find(([name]) => name === 'score')?.[1] || '0')
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);
```

### Scores by Genre

```typescript
const events = await nostr.query([{
  kinds: [762],
  '#t': ['arcade'],
  limit: 100
}], { signal });
```

## Leaderboard Time Periods

Clients can filter scores by time period using the `since` and `until` filters:

```typescript
// Last 24 hours (daily)
const daily = await nostr.query([{
  kinds: [762],
  '#game': ['snake-game'],
  since: Math.floor(Date.now() / 1000) - 86400
}], { signal });

// Last 7 days (weekly)
const weekly = await nostr.query([{
  kinds: [762],
  '#game': ['snake-game'],
  since: Math.floor(Date.now() / 1000) - 604800
}], { signal });

// Last 30 days (monthly)
const monthly = await nostr.query([{
  kinds: [762],
  '#game': ['snake-game'],
  since: Math.floor(Date.now() / 1000) - 2592000
}], { signal });

// All time (no since filter)
const allTime = await nostr.query([{
  kinds: [762],
  '#game': ['snake-game']
}], { signal });
```

## Anti-Cheat and Verification

Games implementing anti-cheat measures SHOULD include a `verification` tag containing:

1. A cryptographic signature of the score data
2. A hash of the game state at score achievement
3. A replay file hash for verification

Example verification tag:

```json
["verification", "sig:abc123,hash:def456,replay:ghi789"]
```

Clients MAY display verification status and allow filtering of verified vs unverified scores.

## Game Metadata

Game metadata (name, description, image, genre, URL) is NOT stored in kind 762 events. Instead:

1. Clients maintain a configuration object mapping `<developer-pubkey>:<game-identifier>` to metadata
2. Games MAY publish metadata as kind 0 events (profile metadata) or custom addressable events
3. Clients SHOULD provide fallback metadata for unknown games
4. Users/admins SHOULD be able to add/edit game metadata through the client interface

## Achievements and Badges

The `achievements` tag contains comma-separated achievement IDs. Achievement definitions are game-specific and should be documented by game developers. Clients MAY display achievement icons and descriptions based on game metadata configuration.

## Social Interactions

Users can interact with score events using standard Nostr event kinds:

- **Zap** (NIP-57): Send sats to celebrate a score
- **Comment** (kind 1): Reply to a score event with a comment
- **Quote** (kind 1): Quote-repost a score with commentary
- **React** (kind 7): Add emoji reactions to scores

## Privacy Considerations

Score events are public by default. Players concerned about privacy should:

1. Use pseudonymous Nostr identities for gaming
2. Be aware that all scores are publicly queryable
3. Consider using separate gaming-specific Nostr accounts

## Implementation Notes

- Scores are stored as strings to support arbitrary precision and formatting
- The `d` tag ensures each score event is unique and prevents duplicates
- Game identifiers SHOULD be lowercase, hyphenated strings (e.g., "snake-game")
- Timestamps in the `d` tag help with chronological sorting
- Multiple genre tags (`t`) allow games to appear in multiple categories
