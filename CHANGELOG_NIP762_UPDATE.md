# NIP-762 Update: Migration to Kind 30762 (Addressable Replaceable Events)

**Date**: October 28, 2025

## Overview

Gamestr has been updated to use the latest version of NIP-762, which changes the score event kind from `762` to `30762` (addressable replaceable events) and adds a new `state` tag for score lifecycle management.

## Key Changes

### 1. Event Kind Change: 762 → 30762

**Before (Old):**
```json
{
  "kind": 762,
  "tags": [
    ["d", "game:timestamp:random"],
    ["game", "my-game"],
    ["score", "1000"],
    ["p", "player-pubkey"]
  ]
}
```

**After (New):**
```json
{
  "kind": 30762,
  "tags": [
    ["d", "my-game:player-pubkey:level-1"],
    ["game", "my-game"],
    ["score", "1000"],
    ["p", "player-pubkey"],
    ["state", "active"]
  ]
}
```

### 2. Addressable Replaceable Event Behavior

Kind 30762 is an **addressable replaceable event**, which means:

- Only the **latest event** for a given `pubkey` + `d` tag combination is retained by relays
- Scores can be **updated** by publishing a new event with the same `d` tag
- Perfect for updating verification status or correcting scores

**Example: Updating a Score**
```typescript
// Initial score
await nostr.event({
  kind: 30762,
  tags: [
    ["d", "my-game:player-pubkey:level-1"],
    ["game", "my-game"],
    ["score", "1000"],
    ["p", "player-pubkey"],
    ["state", "active"]
  ]
});

// Later: Update to verified status
await nostr.event({
  kind: 30762,
  tags: [
    ["d", "my-game:player-pubkey:level-1"], // Same d tag!
    ["game", "my-game"],
    ["score", "1000"],
    ["p", "player-pubkey"],
    ["state", "verified"] // Updated state
  ]
});
```

### 3. New State Tag

The `state` tag tracks the lifecycle of a score:

- **`active`** - Score is current and valid (default if omitted)
- **`verified`** - Score has been verified by anti-cheat or manual review
- **`disputed`** - Score is under review due to suspected cheating
- **`invalidated`** - Score has been proven invalid and should not appear on leaderboards

**Filtering by State:**
```typescript
// Query only verified scores
const events = await nostr.query([{
  kinds: [30762],
  '#game': ['my-game'],
  '#state': ['verified']
}]);
```

### 4. Updated d-tag Format

The `d` tag now uses a more structured format:

**Old Format:** `<game>:<timestamp>:<random>`
**New Format:** `<game>:<player-pubkey>:<context>`

**Examples:**
- `snake-game:abc123:default` - Default score context
- `snake-game:abc123:level-12-hard` - Specific level and difficulty
- `snake-game:abc123:speedrun` - Speedrun category

This format ensures proper scoping and allows players to have multiple score contexts per game.

### 5. Automatic Filtering of Invalidated Scores

Gamestr now automatically filters out scores with `state: invalidated` from all leaderboards. This ensures that proven cheating or invalid scores don't appear in rankings.

## Migration Guide for Developers

### If You're Publishing Scores

Update your code to use kind 30762:

```typescript
// Old
const event = {
  kind: 762,
  tags: [
    ["d", `my-game:${Date.now()}:${Math.random()}`],
    ["game", "my-game"],
    ["score", score.toString()],
    ["p", playerPubkey]
  ]
};

// New
const event = {
  kind: 30762,
  tags: [
    ["d", `my-game:${playerPubkey}:${context}`],
    ["game", "my-game"],
    ["score", score.toString()],
    ["p", playerPubkey],
    ["state", "active"] // Add state tag
  ]
};
```

### If You're Querying Scores

Update your queries to use kind 30762:

```typescript
// Old
const events = await nostr.query([{
  kinds: [762],
  '#game': ['my-game']
}]);

// New
const events = await nostr.query([{
  kinds: [30762],
  '#game': ['my-game']
}]);
```

## Benefits of This Update

1. **Score Updates**: Scores can now be updated without creating duplicate events
2. **Verification Workflow**: Games can mark scores as verified after anti-cheat checks
3. **Dispute Resolution**: Disputed scores can be marked and reviewed
4. **Cleaner Data**: Only the latest version of each score is stored by relays
5. **Better Organization**: Structured d-tag format allows multiple score contexts per player

## Backward Compatibility

⚠️ **Breaking Change**: This is a breaking change. Old kind 762 events will no longer be recognized by Gamestr.

If you have existing kind 762 events, you'll need to:
1. Republish them as kind 30762 events
2. Update your integration code to use the new kind

## Testing

All existing tests have been updated and are passing. The test data now uses kind 30762 events with proper state tags.

## Documentation Updates

- ✅ `NIP.md` - Complete specification updated
- ✅ `README.md` - Examples and references updated
- ✅ `src/pages/Developers.tsx` - Code examples updated
- ✅ `src/pages/Playground.tsx` - Event playground updated
- ✅ `src/hooks/useScores.ts` - Query logic updated
- ✅ `src/lib/testData.ts` - Test data updated
- ✅ All documentation and prompts updated

## Questions?

- Read the full specification in `NIP.md`
- Try the updated playground at `/playground`
- Check the developer guide at `/developers`

---

**Commit**: 7c60638d - "Update NIP-762 to use kind 30762 (addressable replaceable) with state tag"
