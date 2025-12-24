# 🤝 Feedback System Integration with Collaborative Tokens

**Date:** 2025-12-07

---

## Philosophy

**Feedback is collaboration.** When you teach Tomo, correct routing mistakes, or confirm successful interactions, you're actively participating in improving the system. This is partnership work and deserves to be recognized with collaborative tokens.

---

## Token Awards

### Positive Feedback (👍)
**+2 tokens**

- Quick confirmation that Tomo routed correctly
- Celebrates successful collaboration
- Low effort, but valuable for reinforcement learning

**Example:** User clicks thumbs-up on a well-routed message
```
"✅ Thanks! This helps improve routing accuracy.
+2 tokens earned together 🤝"
```

### Corrective Feedback
**+5 tokens**

- User identifies wrong routing
- Selects what the correct route should have been
- Helps Tomo learn from mistakes

**Example:** User corrects "this should have been memory_query not chat"
```
"✅ Correction saved! The router will learn from this.
+5 tokens earned together 🤝"
```

### Corrective Feedback with Example
**+10 tokens**

- User identifies wrong routing
- Provides what Tomo should have said instead
- Maximum effort, maximum learning value

**Example:** User corrects routing AND writes expected response
```
"✅ Correction saved with example! The router will learn from this.
+10 tokens earned together 🤝"
```

---

## How It Works

### 1. User Gives Feedback

**Positive (Thumbs Up):**
```javascript
submitPositiveFeedback(response);
// → Calls window.appState.trackPositiveFeedback()
// → Awards +2 tokens
```

**Corrective (Wrong Route):**
```javascript
submitCorrectionWithExpected(input, correctRoute, correctIntent);
// → Reads expected reply textarea
// → Calls window.appState.trackCorrectiveFeedback(hasExpectedReply)
// → Awards +5 tokens (or +10 with example)
```

### 2. AppState Tracks Engagement

```typescript
trackPositiveFeedback(): void {
  this.state.engagement.feedbackGiven++;
  this.awardTokens('positive_feedback', 2);
}

trackCorrectiveFeedback(hasExpectedReply: boolean): void {
  this.state.engagement.feedbackGiven++;

  if (hasExpectedReply) {
    this.awardTokens('corrective_feedback_with_example', 10);
  } else {
    this.awardTokens('corrective_feedback', 5);
  }
}
```

### 3. User Sees Token Reward

Success message appears with token count:
```
✅ Correction saved!
+5 tokens earned together 🤝
```

### 4. Engagement Metrics Updated

```typescript
engagement: {
  conversationCount: 42,
  todosCompleted: 15,
  feedbackGiven: 8,        // ← Tracked!
  tomoTokens: 127,         // ← Updated!
  moodsExplored: Set(5),
  worldsVisited: Set(3)
}
```

---

## Benefits

### 1. **Incentivizes Feedback**
- Users WANT to give feedback because it feels rewarding
- Transforms "work" into "partnership activity"
- More feedback = better system over time

### 2. **Recognizes Effort**
- More detailed feedback = more tokens
- Values the time user spends helping Tomo improve
- Acknowledges that teaching is collaboration

### 3. **Tracks Engagement**
- `feedbackGiven` metric shows user investment in system
- Higher feedback count = more committed user
- Can unlock achievements ("Teaching Master: 50+ corrections")

### 4. **Unified System**
- All collaborative activities use same token system
- Conversations, todos, feedback all reward partnership
- Consistent user experience

---

## Implementation Details

### Files Modified

1. **`campground/src/state/AppState.ts`**
   - Added `feedbackGiven: number` to `EngagementMetrics`
   - Added `trackPositiveFeedback()` method
   - Added `trackCorrectiveFeedback(hasExpectedReply)` method

2. **`campground/src/state/globals.ts`**
   - Exposed `window.appState` globally
   - Allows feedback.js to call tracking methods

3. **`campground/public/js/ui/feedback.js`**
   - Updated `submitCorrectionWithExpected()` to call `trackCorrectiveFeedback()`
   - Updated `submitPositiveFeedback()` to call `trackPositiveFeedback()`
   - Modified success messages to show token rewards
   - Added header comment explaining integration

---

## Future Enhancements

### Achievements Based on Feedback

```typescript
// In checkUnlocks()
if (engagement.feedbackGiven >= 10) {
  console.log('🎓 [AppState] Partnership Achievement: Helpful Teacher!');
}

if (engagement.feedbackGiven >= 50) {
  console.log('🏆 [AppState] Partnership Achievement: Master Mentor!');
}
```

### Feedback Quality Metrics

Could track:
- Positive vs. corrective feedback ratio
- Corrections with examples vs. without
- Feedback response time (how quickly user gives feedback)

### Feedback Leaderboard (if multi-user)

Show users who contribute most feedback to help system improve.

---

## User Experience Flow

```
User chats with Tomo
  ↓
Tomo responds (might be wrong routing)
  ↓
User clicks thumbs-down (or corrects)
  ↓
Feedback dialog appears
  ↓
User selects correct routing
  ↓
(Optional) User types what Tomo should have said
  ↓
User submits
  ↓
System:
  1. Saves correction to vector DB
  2. Awards tokens (+5 or +10)
  3. Shows success message
  4. Updates engagement.feedbackGiven
  ↓
User feels good about helping Tomo learn! 🤝
```

---

## Console Output Examples

### Positive Feedback:
```
[AppState] +2 tokens for "positive_feedback" (collaborative total: 45)
✅ Confirmed correct routing: "what's the weather" → local/chat
```

### Corrective Feedback:
```
[AppState] +5 tokens for "corrective_feedback" (collaborative total: 50)
📚 Learned correction: "remember this" should be local/memory_query
🤝 [AppState] Collaboration Milestone: 50 tokens earned together!
```

### Corrective with Example:
```
[AppState] +10 tokens for "corrective_feedback_with_example" (collaborative total: 60)
📚 Learned correction: "search for python docs" should be phone_home/web_search with reply: "Let me search the web for Python documentation..."
```

---

## Testing

### Manual Test:
1. Run `npm run dev` in campground
2. Send a message to Tomo
3. Click thumbs-down on response
4. Select correct routing
5. (Optional) Type expected response
6. Submit
7. Check console for token award
8. Run `tomoDebug.getEngagement()` to verify `feedbackGiven` incremented

### Expected Results:
- Success message shows "+5 tokens" or "+10 tokens"
- Console shows collaborative total updated
- `engagement.feedbackGiven` increases
- `engagement.tomoTokens` increases by correct amount

---

## Documentation

This integration is documented in:
- `campground/src/state/AppState.ts` - Method JSDoc comments
- `campground/public/js/ui/feedback.js` - Header comment
- `campground/src/state/STATE_USAGE_EXAMPLES.md` - (to be added)
- This file (`FEEDBACK_TOKEN_INTEGRATION.md`)

---

**The feedback system is now fully integrated with the collaborative token framework!** 🎉

Users are rewarded for helping Tomo learn, transforming feedback from a chore into a partnership activity.
