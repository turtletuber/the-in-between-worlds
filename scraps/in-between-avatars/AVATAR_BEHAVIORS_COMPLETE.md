# Avatar Autonomous Behavior System ✨

## What Was Added

I've enhanced the avatars in `in-between-avatars` with autonomous behaviors that make them feel independent and aligned with their lore. Each companion now has their own personality, interests, and movement patterns.

---

## How It Works

### Personality System

Each avatar has a personality profile that defines:

- **Preferred Worlds** - Which worlds they like to visit
- **Interests** - Which objects/elements they're attracted to
- **Movement Speed** - How fast they move (varies by personality)
- **Wander Radius** - How far they roam from origin
- **Investigation Time** - How long they spend examining objects
- **Curiosity** - Likelihood to investigate new things (0.0 to 1.0)

---

## Avatar Personalities

### 🐉 **Dragon**
```javascript
{
    preferredWorlds: ['caves', 'mountains'],
    interests: ['singingCrystal', 'starlightStalactite', 'depthMemoryStone', 'dataNode'],
    movementSpeed: 0.015,
    wanderRadius: 8,
    investigationTime: 5,
    curiosity: 0.8
}
```
**Behavior:** Seeker of hidden truths. Investigates singing crystals in The Reflection Depths and data nodes on the mountains. Moderately curious, medium investigation time.

### 🤖 **Robot**
```javascript
{
    preferredWorlds: ['caves', 'mountains', 'CosmicHub'],
    interests: ['singingCrystal', 'dataNode', 'dataCrystal', 'echoC hamber'],
    movementSpeed: 0.012,
    wanderRadius: 10,
    investigationTime: 8,
    curiosity: 0.9
}
```
**Behavior:** Analytical observer. Most curious avatar (0.9). Spends longest time investigating data-related objects. Loves crystals and data structures.

### 🐼 **Panda**
```javascript
{
    preferredWorlds: ['forest', 'campground'],
    interests: ['meditationStone', 'singingSequoia', 'harmonicOrb', 'eternalEmber'],
    movementSpeed: 0.008,
    wanderRadius: 6,
    investigationTime: 12,
    curiosity: 0.4
}
```
**Behavior:** Contemplative and slow. Lowest curiosity (0.4) - prefers to sit and meditate. Longest investigation time (12s). Smallest wander radius. Seeks meditation stones and sequoias.

### 👻 **Ghost**
```javascript
{
    preferredWorlds: ['campground', 'CosmicHub'],
    interests: ['memoryFragment', 'shelterOfSolitude', 'cosmicIsland'],
    movementSpeed: 0.01,
    wanderRadius: 12,
    investigationTime: 6,
    curiosity: 0.6
}
```
**Behavior:** Seeker of memories and shelter. Moderate curiosity. Drawn to memory fragments and the shelter. Wide wandering range.

### 👽 **Zorp** (Alien)
```javascript
{
    preferredWorlds: ['mountains', 'CosmicHub'],
    interests: ['dataCrystal', 'dataNode', 'observationPlatform', 'mistStream', 'cosmicIsland'],
    movementSpeed: 0.013,
    wanderRadius: 15,
    investigationTime: 10,
    curiosity: 1.0
}
```
**Behavior:** Always investigating! Maximum curiosity (1.0). Widest wander radius (15 units). Obsessed with data, observations, and cosmic structures. This is their nature - constant analysis.

### 👶 **Junior**
```javascript
{
    preferredWorlds: ['campground', 'forest', 'CosmicHub'],
    interests: ['eternalEmber', 'memoryFragment', 'lightMote', 'glowingFern'],
    movementSpeed: 0.02,
    wanderRadius: 8,
    curiosity: 0.7
}
```
**Behavior:** Fastest mover! Interested in light, warmth, and memories. Shortest investigation time (4s) - gets distracted quickly. Playful energy.

---

## Behavior States

Each avatar operates in one of four states:

### 🌀 **Wandering**
- Picks random points within their wander radius
- Moves toward target location
- When reaching target, transitions to idle
- Default state

### 🔍 **Investigating**
- Found an interesting object nearby
- Moves toward the object
- Spends investigation time examining it
- Console logs what they're investigating
- Returns to wandering when done

### 💤 **Idle**
- Stopped at a location
- Gently bobbing in place
- Velocity slows to zero
- After timeout, resumes wandering
- May transition to following player

### 🚶 **Following**
- Player is within range (10-25 units)
- Follows at comfortable distance (5-8 units)
- Moves faster than normal (1.5x speed)
- After timeout, returns to idle then wandering

---

## Movement Behaviors

### Autonomous Movement
- Each avatar picks targets based on personality
- Smooth velocity-based movement (not teleporting)
- Horizontal movement only (Y handled by bobbing)
- Velocity damping for natural deceleration

### Bobbing Animation
```javascript
avatar.position.y = baseHeight + Math.sin(time * 0.5 + bobOffset) * 0.2
```
- Always active regardless of state
- Unique phase offset per avatar (bobOffset)
- 0.2 unit amplitude for gentle floating
- 0.5 Hz frequency for slow, dreamy motion

### Interest Detection
```javascript
if (data.state === 'wandering' &&
    data.stateTimer <= 0 &&
    Math.random() < personality.curiosity * delta)
{
    findInterestingObject(avatar);
}
```
- Scans scene for interesting objects
- Checks both top-level objects and children
- Only considers objects 3-20 units away
- Picks closest interesting object
- Transitions to investigating state

---

## Object Interests by World

### **Cosmic Hub**
- Zorp → cosmic islands
- Robot → cosmic islands
- Ghost → cosmic islands, memory fragments
- Junior → light motes

### **The Gathering Memory (Campground)**
- Panda → eternal ember, meditation stones
- Ghost → memory fragments, shelter of solitude
- Junior → eternal ember, memory fragments

### **The Heights of Clarity (Mountains/Zorp's Home)**
- Dragon → data nodes, data crystals
- Robot → data nodes, data crystals
- Zorp → data crystals, observation platforms, mist streams

### **The Listening Woods (Forest/Panda's Home)**
- Panda → meditation stones, singing sequoias, harmonic orb
- Junior → glowing ferns, light motes

### **The Reflection Depths (Caves/Dragon+Robot's Home)**
- Dragon → singing crystals, starlight stalactites, depth memory stones
- Robot → singing crystals, echo chambers

---

## Technical Implementation

### Files Modified:
1. `in-between-avatars/js/scene.js`

### New Functions:
- `updateAvatarBehaviors(time, delta)` - Main behavior loop
- `updateAvatarWandering(avatar, time, delta)` - Wandering state
- `updateAvatarInvestigating(avatar, time, delta)` - Investigating state
- `updateAvatarIdle(avatar, time, delta)` - Idle state
- `updateAvatarFollowing(avatar, time, delta)` - Following player state
- `findInterestingObject(avatar)` - Scans scene for interesting objects

### Enhanced Data Structure:
```javascript
sprite.userData = {
    avatarRenderer,
    name,
    personality: {
        preferredWorlds,
        interests,
        movementSpeed,
        wanderRadius,
        investigationTime,
        curiosity
    },
    state: 'wandering',
    stateTimer: 0,
    targetPosition: null,
    targetObject: null,
    velocity: Vector3,
    baseHeight: number,
    bobOffset: randomPhase
}
```

### Lines Added: ~240 lines

---

## Observable Behaviors

When you run the in-between world, you'll see:

**Console Logs:**
```
Created 6 avatars with autonomous behaviors
Zorp is investigating dataCrystal
Dragon is investigating singingCrystal
Panda is investigating meditationStone
```

**Visual Behaviors:**
- Avatars floating around the world
- Moving toward objects they find interesting
- Pausing to investigate (slow down, hover near object)
- Occasionally following you
- Each moves at different speeds
- Different roaming patterns based on personality

**Per-World Observations:**

- **Cosmic Hub**: Zorp wanders widely, investigating islands
- **Mountains**: Zorp frequently visits data crystals, Dragon and Robot investigate data nodes
- **Forest**: Panda spends long periods at meditation stones and sequoias
- **Campground**: Panda drawn to eternal ember, Ghost investigates shelter
- **Caves**: Dragon and Robot attracted to singing crystals

---

## Philosophy

This behavior system embodies the "independent companions" concept:

**Not Pets:**
- They have their own interests
- They wander when they want
- They investigate what interests *them*
- They follow player only occasionally

**Personality-Driven:**
- Zorp is always curious (1.0 curiosity)
- Panda is contemplative (0.4 curiosity, long investigations)
- Junior is playful and quick (fastest, short attention)
- Robot is analytical (long investigations, data-focused)

**World-Aligned:**
- Each companion has preferred worlds
- Their interests match the world elements
- Creates natural "habitats" for each character

**Emergent Behavior:**
- Simple state machine creates complex-feeling behaviors
- Randomness + personality = unique moments
- Console logs let you see their "thoughts"

---

## Future Enhancements

### Potential Additions:
- [ ] Mood system (avatars react to discoveries)
- [ ] Avatar-to-avatar interactions (gathering in groups)
- [ ] Sound effects when investigating
- [ ] Visual indicators (thought bubbles, glows)
- [ ] Teleportation to preferred worlds when you switch
- [ ] "Calling" system - avatar comes to you
- [ ] Collecting memories together (cooperative gameplay)
- [ ] Avatar preferences affect world ambiance
- [ ] Day/night cycles change behavior
- [ ] Seasonal events trigger special behaviors

### Advanced Behaviors:
- [ ] Zorp: Actually uses observation platforms (looks out)
- [ ] Panda: Sits and meditates for extended periods
- [ ] Dragon: Circles around objects before investigating
- [ ] Robot: Processes data (visual effect) when near crystals
- [ ] Ghost: Phases in/out near memory fragments
- [ ] Junior: Plays with light motes (chasing behavior)

---

## Lore Integration

Each avatar's behavior reinforces their character:

**Dragon** - Seeker of hidden knowledge
> Drawn to dark places (caves) and mysterious objects (singing crystals, starlight). Medium curiosity balanced with caution.

**Robot** - Analytical observer
> Obsessed with data structures and frequencies. Highest investigation time after Panda - thorough analysis. High curiosity (0.9).

**Panda** - Patient contemplative
> Slow movement, small range, low curiosity. Prefers calm places (forest, campground). Spends longest time in meditation.

**Ghost** - Memory seeker
> Drawn to memories and shelter. Moderate in all stats - balanced spirit seeking connection.

**Zorp** - Cosmic data gatherer
> Maximum curiosity (1.0), always investigating. Widest range. This IS their purpose - constant observation and analysis.

**Junior** - Playful explorer
> Fastest, most energetic. Drawn to light and warmth. Short attention span but high energy.

---

## Testing Checklist

When you open in-between-avatars:

- [ ] Avatars are floating and bobbing
- [ ] Each avatar moves at different speed
- [ ] Console shows investigation messages
- [ ] Avatars wander to different locations
- [ ] Avatars move toward interesting objects
- [ ] Avatars pause when investigating
- [ ] Avatars occasionally follow you
- [ ] Zorp investigates more frequently than others
- [ ] Panda moves slowly and contemplatively
- [ ] Junior zips around quickly
- [ ] Switch to Mountains - watch Zorp investigate data
- [ ] Switch to Forest - watch Panda meditate
- [ ] Switch to Caves - watch Dragon/Robot explore crystals
- [ ] Stand still far away - an avatar may come follow you

---

## Summary

The avatars now feel **alive** and **independent**:

- ✅ Each has unique personality
- ✅ World-specific interests and behaviors
- ✅ Autonomous movement and decision-making
- ✅ State machine creates natural-feeling actions
- ✅ Aligned with character lore
- ✅ Not always following player (independent)
- ✅ Console logs show "thoughts"
- ✅ Emergence from simple rules

**Before:** Static sprites that just floated in place
**After:** Independent companions with personalities, interests, and autonomous behaviors

---

**Watch your companions explore. They have their own lives. ✨**
