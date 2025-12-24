# How to Run the Live Animations

The animations work best when run **directly in your terminal**, not through Claude Code's output.

## Quick Start

Open your macOS Terminal and run:

```bash
cd ~/Desktop/ascii_ai

# Run the experimental avatar (full demo)
python3 experimental_avatar.py

# Or try specific modes:
python3 experimental_avatar.py thinking 10
python3 experimental_avatar.py fluid 15
python3 experimental_avatar.py matrix 20
python3 experimental_avatar.py celebrating 5
python3 experimental_avatar.py idle 10
```

## Why Terminal Instead of Here?

The animations use **ANSI escape codes** to:
- Clear the screen (`\033[2J`)
- Move cursor to home (`\033[H`)
- Update frames in place

When run through Claude Code's Bash tool, all the output is captured and shown at once (which is why you had to scroll).

In a **real terminal**, each frame **replaces** the previous one, creating smooth animation!

## Tips for Best Experience

1. **Maximize your terminal** for best visual effect
2. **Dark theme** works best with the color scheme
3. **Font**: Monospace fonts like Menlo, Monaco, or Fira Code look great
4. Press **Ctrl+C** to stop any animation

## Alternative: Background Mode

If you want to see it while doing other things:

```bash
# Run in background
python3 experimental_avatar.py thinking 30 &

# Or open a new terminal tab (Cmd+T) and run there
```

Enjoy the show!
