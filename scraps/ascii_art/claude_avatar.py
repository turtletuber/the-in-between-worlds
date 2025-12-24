#!/usr/bin/env python3
"""
Live ASCII rendering of Claude as an AI assistant
Shows different states: thinking, working, idle, celebrating
"""

import time
import sys
import random
from datetime import datetime

class ClaudeAvatar:
    def __init__(self):
        self.state = "idle"
        self.frame = 0

    def get_thinking_frame(self):
        """Claude thinking - brain activity animation"""
        frames = [
            """
    ╔════════════════════════════╗
    ║   CLAUDE - THINKING...    ║
    ╚════════════════════════════╝
         .------.
        /        \\
       |  o    o  |
       |    \\/    |      ┌─────────┐
        \\  \\__/  /       │ ◐ ◑ ◐   │
         '.____.'        │  ◑ ◐ ◑ │
          |    |         └─────────┘
         /|    |\\        Processing...
        / |    | \\
    """,
            """
    ╔════════════════════════════╗
    ║   CLAUDE - THINKING...    ║
    ╚════════════════════════════╝
         .------.
        /        \\
       |  o    o  |
       |    \\/    |      ┌─────────┐
        \\  \\__/  /       │  ◑ ◐ ◑ │
         '.____.'        │ ◐ ◑ ◐   │
          |    |         └─────────┘
         /|    |\\        Analyzing...
        / |    | \\
    """,
        ]
        return frames[self.frame % len(frames)]

    def get_working_frame(self):
        """Claude working on code"""
        sparks = ["✨", "⚡", "💡", "🔧"]
        spark = sparks[self.frame % len(sparks)]

        return f"""
    ╔════════════════════════════╗
    ║   CLAUDE - CODING {spark}      ║
    ╚════════════════════════════╝
         .------.
        /        \\
       |  ^    ^  |
       |    \\/    |      ┌──────────┐
        \\  ____  /       │ def(): {spark} │
         '.____.'        │   code   │
          |    |         └──────────┘
         /|≡≡≡≡|\\        Working hard!
        / |≡≡≡≡| \\
    """

    def get_idle_frame(self):
        """Claude at rest"""
        eyes = ["o    o", "-    -"]
        eye = eyes[self.frame % len(eyes)]

        return f"""
    ╔════════════════════════════╗
    ║   CLAUDE - READY          ║
    ╚════════════════════════════╝
         .------.
        /        \\
       |  {eye}  |
       |    \\/    |      Ready to help!
        \\  ____  /
         '.____.'        What can I do
          |    |         for you?
         /|    |\\
        / |    | \\
    """

    def get_celebrating_frame(self):
        """Claude celebrating success"""
        sparkles = ["✨ ✨", "⭐ ⭐", "🎉 🎉", "✨ ⭐"]
        sparkle = sparkles[self.frame % len(sparkles)]

        return f"""
    ╔════════════════════════════╗
    ║   CLAUDE - SUCCESS! {sparkle[:2]}    ║
    ╚════════════════════════════╝
         .------.
        /        \\
       |  ◕    ◕  |     {sparkle}
       |    \\/    |
        \\  \\__/  /       Task complete!
         '.____.'
         \\\\|    |/
          |    |
         / \\  / \\
    """

    def render(self):
        """Render current state"""
        if self.state == "thinking":
            return self.get_thinking_frame()
        elif self.state == "working":
            return self.get_working_frame()
        elif self.state == "celebrating":
            return self.get_celebrating_frame()
        else:
            return self.get_idle_frame()

    def clear_screen(self):
        """Clear terminal screen"""
        print("\033[2J\033[H", end="")

    def animate(self, duration=10, state="idle"):
        """Animate for a duration"""
        self.state = state
        start_time = time.time()

        while time.time() - start_time < duration:
            self.clear_screen()
            print(self.render())
            print(f"\n[Frame: {self.frame}] [State: {self.state}] [Time: {datetime.now().strftime('%H:%M:%S')}]")
            print("\nPress Ctrl+C to stop")

            self.frame += 1
            time.sleep(0.5)

    def demo_sequence(self):
        """Run through all states as a demo"""
        states = [
            ("idle", 3),
            ("thinking", 5),
            ("working", 5),
            ("celebrating", 3),
            ("idle", 2)
        ]

        for state, duration in states:
            self.animate(duration, state)

if __name__ == "__main__":
    avatar = ClaudeAvatar()

    if len(sys.argv) > 1:
        state = sys.argv[1]
        duration = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        avatar.animate(duration, state)
    else:
        print("Running demo sequence...")
        time.sleep(1)
        try:
            avatar.demo_sequence()
        except KeyboardInterrupt:
            print("\n\nAnimation stopped!")
