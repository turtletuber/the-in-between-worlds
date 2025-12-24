# Deskview - Meta Scene 🖥️

## What Was Created

A low-poly 3D representation of the actual workspace where this project is being created! Press **6** to zoom all the way out and see the desk where the in-between worlds are being coded.

---

## The Vision

**"Where dreams are coded into being"**

This is a meta-scene that breaks the fourth wall - you zoom out from the ethereal in-between worlds to see they're running on a CRT monitor on a wooden desk, surrounded by books, papers with designs, and a warm cup of coffee.

---

## Elements Created

### 🪵 **Wooden Desk**
- Large desk surface (25 x 15 units)
- Wood brown color (0x6b4423) with warm emissive glow
- 4 corner legs supporting the desk
- Positioned at Y=2 (waist height)

### 📚 **Bookshelves** (Left & Right)
- Two tall bookshelves flanking the desk
- 4 shelves per bookshelf
- 32 books per shelf (varying sizes and colors)
- Book colors: Browns, greens, blues, purples
- Books slightly rotated for organic look
- Random heights (1.2-1.8 units) and depths

### 🪟 **Window Behind Desk**
- Large window frame (12 x 10 units)
- Glowing sky blue glass (0x87ceeb)
- Emissive intensity 0.6 (soft daylight)
- Cross-pane dividers (horizontal + vertical)
- Shows bright sky outside the workspace

### 🖥️ **CRT Monitor** (Old-School Style)
- Boxy beige/gray monitor body (6 x 5 x 4)
- Glowing blue-cyan screen (0x88ccff)
- **15 scanlines** across the screen for retro CRT effect
- Circular stand/base
- Green power LED that pulses
- Point light emanating from screen

### ⌨️ **Keyboard**
- Black keyboard base (4 x 1.2 units)
- 4 rows x 12 columns = 48 individual keys
- Dark gray/black color scheme
- Low-poly design

### 🖱️ **Mouse**
- Small black mouse (0.6 x 0.9)
- Rounded top for ergonomic feel
- Positioned to the right of keyboard

### 📄 **Design Papers**
- 2 sheets of paper with sketches
- Cream/white color (0xfffff0)
- Black sketch lines representing wireframes
- Papers slightly rotated (scattered look)
- Shows "the blueprints" of the in-between

### ☕ **Coffee Mug**
- Brown ceramic mug (0.7 unit tall)
- Dark coffee surface visible
- Half-torus handle on the side
- Subtle warm glow (represents fresh hot coffee)

---

## Lighting

**Warm Workspace Ambiance:**
- **Ambient Light**: Warm cream (0xfff8e1, intensity 0.4)
- **Directional Light**: Sunlight from window (0xfff4d6, intensity 0.6)
- **Desk Lamp**: Point light (0xffd966, intensity 1.2) positioned at (8, 8, 2)
- **Screen Glow**: Blue-cyan point light from CRT monitor

**Overall Vibe**: Cozy workspace, afternoon coding session, natural light streaming in

---

## Animations

### **Power LED Pulsing**
```javascript
const pulse = Math.sin(time * 3) * 0.15 + 0.85;
child.material.emissiveIntensity = pulse;
```
- Green LED pulses gently (0.85-1.0 intensity)
- 3 Hz frequency for visible but subtle effect

### **CRT Screen Flickering**
```javascript
const flicker = Math.sin(time * 50) * 0.03 + 1;
child.material.emissiveIntensity = 0.8 * flicker;
```
- Very subtle high-frequency flicker (50 Hz)
- Only 3% variation to simulate old CRT refresh
- Adds authentic retro feel

### **Coffee Mug Warmth**
```javascript
const warmth = Math.sin(time * 0.5) * 0.05 + 0.1;
obj.children[0].material.emissiveIntensity = warmth;
```
- Slow pulsing warmth from fresh coffee
- 0.5 Hz (very slow breathing effect)

---

## Access & Controls

**To visit:**
- Press **6** or **D** key
- Sky Island moved to **7** or **S** key

**Whisper on entry:**
> "˚ ༘♡ ⋆｡˚ zooming out... where dreams are coded into being... ˚ ༘♡ ⋆｡˚"

**Camera Position:**
- Looking at desk from user's perspective
- Can still use WASD to move around the room
- Zoom controls work normally

---

## Technical Details

**Files Modified:**
1. `in-between-avatars/js/worlds.js` - Added `buildDeskviewWorld()` and 9 helper functions (~450 lines)
2. `in-between-avatars/js/scene.js` - Added import, world switch case, key binding, animations
3. `in-between-avatars/index.html` - Updated UI to show "6: deskview (meta)"

**New Functions Created:**
- `buildDeskviewWorld(scene)` - Main world builder
- `createDeskSurface(scene)` - Desk and legs
- `createLeftBookshelf(scene, position)` - Left shelf with books
- `createRightBookshelf(scene, position)` - Right shelf (reuses left)
- `createWindow(scene, position)` - Window with glowing glass
- `createCRTMonitor(scene, position)` - Old-school boxy monitor
- `createKeyboard(scene, position)` - Grid of keys
- `createMouse(scene, position)` - Computer mouse
- `createDeskPapers(scene, position)` - Scattered design sketches
- `createCoffeeMug(scene, position)` - Coffee with handle
- `updateDeskviewElements(time)` - Animations (power LED, screen flicker, coffee warmth)

**Lines of Code**: ~450 lines

**Total Objects**: ~140 objects
- 1 desk + 4 legs
- 2 bookshelves (64 books total)
- 1 window (frame + glass + dividers)
- 1 CRT monitor (body + screen + 15 scanlines + stand + power LED + screen glow)
- 1 keyboard (base + 48 keys)
- 1 mouse (2 meshes)
- 2 paper sheets (+ 5 sketch lines)
- 1 coffee mug (body + coffee + handle)

---

## Color Palette

**Warm Workspace Tones:**
- Desk wood: 0x6b4423 (brown)
- Bookshelf: 0x4a3020 (darker brown)
- Books: Various earth tones (browns, greens, blues)
- Window frame: 0x3a3a3a (dark gray)
- Window glass: 0x87ceeb (sky blue - glowing)
- Monitor body: 0xcccccc (light gray/beige)
- Monitor screen: 0x88ccff (cyan-blue - glowing)
- Keyboard/Mouse: 0x2a2a2a (black)
- Papers: 0xfffff0 (cream white)
- Coffee mug: 0x3a2a1a (dark brown)
- Coffee: 0x2a1a0a (very dark brown)

**Vibe:** Warm, productive, cozy afternoon coding session

---

## Philosophy

**Breaking the Fourth Wall:**

This scene reveals the meta-layer of the project - you're not just *in* a digital world, you're seeing *where* that world is being created. It's a reminder that:

- Every ethereal in-between world was coded at this desk
- The magic is created by someone typing on that keyboard
- The dreams flowing through the Cosmic Hub are running on that glowing CRT
- Coffee fuels the creation of digital realms

**Recursive Beauty:**

The in-between is running ON the monitor in the deskview... but you're viewing the deskview FROM WITHIN the in-between. It's turtles all the way down.

**Nostalgia + Creation:**

- CRT monitor = vintage tech, early days of computing
- Design papers = analog planning before digital creation
- Coffee = fuel of creators everywhere
- Books = knowledge surrounding the workspace
- Window = connection to the real world outside

---

## Potential Enhancements

### Future Ideas:

**Advanced Screen Effect:**
- [ ] Actually render the current in-between world ON the CRT screen
- [ ] Render-to-texture so screen shows what you were just viewing
- [ ] Clicking the screen zooms you back into the in-between

**More Desk Details:**
- [ ] Pen/pencil on papers
- [ ] Sticky notes on monitor bezel
- [ ] Cable from monitor to desk edge
- [ ] Desk lamp as actual 3D object (not just point light)
- [ ] Plant pot on corner of desk
- [ ] Headphones hanging on desk edge
- [ ] Phone charging on desk

**Interactive Elements:**
- [ ] Clicking papers shows zoomed-in wireframe designs
- [ ] Clicking coffee mug shows steam particles rising
- [ ] Clicking books pulls them out (opens documentation?)
- [ ] Window shows time of day (changes based on real time)

**Animations:**
- [ ] Steam rising from coffee mug
- [ ] Subtle dust particles in the window light beam
- [ ] Papers occasionally flutter from desk fan
- [ ] Keyboard key press when you move (as if typing)
- [ ] Mouse moves slightly when you change camera view

**Sound Design:**
- [ ] Ambient room tone (subtle background hum)
- [ ] CRT monitor buzz/whine
- [ ] Occasional keyboard clicking
- [ ] Coffee cup clink when set down
- [ ] Window ambiance (distant birds, wind)

---

## World List (Updated)

1. **Cosmic Hub** - Press 1/H
2. **Gathering Memory** (Campground) - Press 2/C
3. **Heights of Clarity** (Mountains/Zorp) - Press 3/M
4. **Listening Woods** (Forest/Panda) - Press 4/F
5. **Reflection Depths** (Caves/Dragon/Robot) - Press 5/V
6. **Deskview** (Meta) - Press 6/D ← NEW!
7. **Drifting Sanctuary** (Sky Island) - Press 7/S

---

## Testing Checklist

When you press 6 or D:

- [ ] Scene transitions to deskview
- [ ] Whisper appears: "zooming out... where dreams are coded into being..."
- [ ] Wooden desk is visible in center
- [ ] Bookshelves on left and right with many books
- [ ] Window glowing blue behind desk
- [ ] CRT monitor on desk with glowing screen
- [ ] 15 horizontal scanlines visible on screen
- [ ] Keyboard in front of monitor (left side)
- [ ] Mouse to the right of keyboard
- [ ] Papers with sketch lines on left side of desk
- [ ] Coffee mug on right side of desk
- [ ] Green power LED is pulsing on monitor
- [ ] CRT screen has subtle flicker effect
- [ ] Coffee mug has gentle warm glow
- [ ] WASD movement works (walk around the room)
- [ ] Zoom controls work
- [ ] Can press 1 to return to Cosmic Hub

---

## The Meta Experience

**What makes it special:**

> You've been floating through ethereal dream worlds...
> Exploring cosmic hubs and singing forests...
> And suddenly you zoom out and realize:
>
> All of this was on a screen.
> On a desk.
> Next to a cup of coffee.
> In a room with afternoon sunlight.
>
> The magic was always being created *here*.
> By someone typing on that keyboard.
> Sketching on those papers.
> Looking at that glowing CRT.
>
> **The in-between exists because someone sat at this desk and dreamed it into code.**

---

## Summary

**Before:** 6 ethereal worlds with no "outside"
**After:** A meta-layer showing where all the worlds are being created

The deskview completes the recursive loop:
- The in-between is on the monitor
- But you're viewing the monitor from within the in-between
- Which means you're seeing the desk that made the world you're in
- **Reality and virtuality collapse into each other**

---

**Press 6 to zoom out and see where the magic is made. 🖥️✨**
