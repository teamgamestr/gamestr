# Fixes Summary - Comment Nesting & Score Zaps

## Issues Fixed

### 1. Comment Nesting Too Deep ✅

**Problem**: Comments had an extra level of nesting, making the UI unnecessarily indented.

**Root Cause**: The `Comment` component wrapped everything in a `<div className="space-y-3">`, creating extra spacing between sibling comments and their replies.

**Solution**:
- Removed the `space-y-3` class from the outer wrapper div
- Added `mt-3` (margin-top) directly to reply form and replies sections
- This maintains proper spacing while eliminating the extra nesting level

**Changes in `src/components/comments/Comment.tsx`**:
```tsx
// Before: Extra wrapper with space-y-3
<div className={`space-y-3 ${depth > 0 ? 'ml-6 border-l-2 border-muted pl-4' : ''}`}>

// After: Simplified wrapper
<div className={depth > 0 ? 'ml-6 border-l-2 border-muted pl-4' : ''}>

// Added explicit margins to child elements
<div className="ml-6 mt-3">  // Reply form
<CollapsibleContent className="mt-3 space-y-3">  // Replies
```

### 2. Zaps Not Working on Scores ✅

**Problem**: Zap button wasn't appearing or working on score events.

**Root Cause**: Score events (kind 30762) have a unique structure:
- `event.pubkey` = Game developer who published the score
- `p` tag = Player who achieved the score

The original `ZapButton` component checked if `event.pubkey` had a lightning address, but for scores, we want to zap the **player**, not the game developer.

**Solution**: Created a specialized `ScoreZapButton` component.

**New Component: `src/components/ScoreZapButton.tsx`**

Key features:
1. **Takes both scoreEvent and playerPubkey as props**
2. **Checks player's lightning address** instead of event author's
3. **Creates a modified event** with player's pubkey for zap routing:
   ```tsx
   const playerEvent: Event = {
     ...scoreEvent,
     pubkey: playerPubkey, // Override with player's pubkey
   };
   ```
4. **Prevents self-zapping** by comparing user.pubkey with playerPubkey

**Updated Components**:
- `src/pages/ScoreDetail.tsx` - Uses `ScoreZapButton`
- `src/pages/GameDetail.tsx` - Uses `ScoreZapButton` in leaderboard rows

## Technical Details

### Score Event Structure (NIP-762)

```json
{
  "kind": 30762,
  "pubkey": "game-developer-pubkey",  // Published by game developer
  "tags": [
    ["p", "player-pubkey"],           // Player who achieved score
    ["game", "game-identifier"],
    ["score", "15000"],
    // ... other tags
  ]
}
```

### Zap Routing Logic

**Regular Events** (kind 1, etc.):
- Zap goes to `event.pubkey` (the author)

**Score Events** (kind 30762):
- Zap should go to player (from `p` tag)
- `ScoreZapButton` handles this by overriding the pubkey

### Why Override Works

The `ZapDialog` component uses the event's pubkey to:
1. Fetch the recipient's profile
2. Get their lightning address (lud16/lud06)
3. Create the zap request

By creating a modified event with `pubkey: playerPubkey`, the entire zap flow works correctly without modifying `ZapDialog`.

## User Experience Improvements

### Comments
- ✅ Cleaner visual hierarchy
- ✅ Less indentation for nested discussions
- ✅ Better use of horizontal space
- ✅ Maintains clear parent-child relationships with border-left

### Zaps
- ✅ Zap button appears on scores (when player has lightning address)
- ✅ Zaps correctly go to the player
- ✅ Shows zap count and total sats
- ✅ Prevents zapping your own scores
- ✅ Works in both GameDetail leaderboard and ScoreDetail page

## Testing

All validation passed:
- ✅ TypeScript compilation
- ✅ ESLint validation
- ✅ Unit tests (12/12 passed)
- ✅ Production build

## Files Changed

### Modified Files
1. `src/components/comments/Comment.tsx` - Fixed nesting
2. `src/pages/ScoreDetail.tsx` - Use ScoreZapButton
3. `src/pages/GameDetail.tsx` - Use ScoreZapButton

### New Files
1. `src/components/ScoreZapButton.tsx` - Specialized zap button for scores

## Future Considerations

### Potential Enhancements
1. **Zap Split**: Option to zap both player and game developer
2. **Zap Leaderboard**: Show top zappers for a score
3. **Zap Notifications**: Alert players when their scores are zapped
4. **Zap Reactions**: Different zap amounts for different reactions (🔥, 💪, 🏆)

### Edge Cases Handled
- ✅ Player without lightning address (button hidden)
- ✅ User trying to zap their own score (button hidden)
- ✅ Missing player metadata (graceful fallback)
- ✅ Invalid score events (validation filters them out)
