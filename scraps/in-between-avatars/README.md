# The In-Between - Avatar Companions

A beautiful 3D dreamscape where Tomodachi avatars float and drift among mystical elements, combining the simplicity and magic of the in-between world with the personality of animated avatar companions.

## What This Is

This project brings together:
- **The In-Between**: Your elegant THREE.js exploration of zooming perspectives and dreamlike spaces
- **Tomodachi Avatars**: The animated canvas-based avatar characters (cat, dragon, robot, panda, ghost) now living as floating companions in this 3D world

The avatars are rendered as billboarded sprites (they always face the camera) and drift gently around the island like ethereal companions, each with their own personality and animations.

## File Structure

```
in-between-avatars/
├── index.html           # Main HTML file with UI and imports
├── js/
│   ├── scene.js         # THREE.js scene, camera, avatars, and animation
│   ├── avatar-renderer.js   # Cat avatar (base class)
│   ├── dragon-avatar.js     # Dragon avatar with fire effects
│   ├── robot-avatar.js      # Robot avatar with digital effects
│   ├── panda-avatar.js      # Panda avatar with zen theme
│   └── ghost-avatar.js      # Ghost avatar with ethereal effects
└── README.md
```

## How to Run

### Option 1: Python Server (Simplest)
```bash
cd in-between-avatars
python3 -m http.server 8084
```
Then open: http://localhost:8084

### Option 2: Any local server
```bash
npx serve .
# or
npx http-server
```

## Controls

- **Scroll**: Zoom between perspective levels (spirit → companion → observer → overseer → ascent → departure)
- **Click**: Move the light orb (you) around the island
- **Drag**: Rotate the camera view
- **Watch**: The avatars drift and float autonomously

## The Avatars

Each avatar has its own personality and visual style:

1. **Cat** (Pink) - Happy, cheerful, the friendly greeter
2. **Dragon** (Red-orange) - Fierce and creative, with fire particle effects
3. **Robot** (Blue-gray) - Logical and precise, with digital scan effects
4. **Panda** (Black/white) - Calm and zen, with meditation theme
5. **Ghost** (Translucent) - Mysterious and ethereal, with phasing effects

They all:
- Float and drift around the island
- Always face the camera (billboard sprites)
- Have animated expressions and moods
- Emit soft glowing light
- Move with gentle, dreamy physics

## Extending This

### Adding More Avatars

In `scene.js`, find the `createAvatarCompanions()` function and add to the `avatarConfigs` array:

```javascript
{ type: 'cat', position: { x: 5, y: 2, z: 3 }, size: 128, mood: 'happy' }
```

### Changing Avatar Behavior

Edit the `updateAvatars()` function in `scene.js` to modify:
- Drift speed
- Movement patterns
- Interaction with player
- Mood changes

### Adding New Avatar Types

1. Copy an existing avatar JS file (e.g., `dragon-avatar.js`)
2. Modify the class name and visual appearance
3. Add the script tag to `index.html`
4. Reference it in `createAvatarSprite()` switch statement

## Technical Notes

- **Canvas Textures**: Each avatar is a self-animating `<canvas>` element that gets converted to a THREE.js texture
- **Sprite Materials**: Using `THREE.Sprite` for billboarding effect
- **No Build Step**: Pure HTML/JS/THREE.js from CDN - no compilation needed
- **Performance**: Each avatar runs its own animation loop for smooth, independent motion

## Philosophy

This project represents the ideal of bringing Tomodachi elements into the in-between's elegant simplicity, rather than porting the in-between into Tomodachi's complexity. It's about:
- Maintaining the dreamlike, meditative quality of the original in-between
- Adding personality and companionship through the avatars
- Keeping it simple enough to understand and modify
- Showing how much can be done with so little

## Next Steps

Ideas for future enhancements:
- Avatar interactions (they wave when you get close)
- Memory fragments that avatars can collect
- Different moods based on location (calm near water, excited near flowers)
- Speech bubbles with personality-appropriate messages
- More avatar types (alien, junior, etc.)
- Day/night cycle that affects avatar behavior
- Avatar trails and particle effects in 3D

Enjoy exploring this space between dreams! ✨
