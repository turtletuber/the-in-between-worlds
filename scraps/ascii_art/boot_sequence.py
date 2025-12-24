#!/usr/bin/env python3
"""
Tomodachi Boot Sequence
Orchestrates a beautiful boot animation using the full experimental avatar
"""

import sys
import os

# Add parent directory to path to import experimental_avatar
sys.path.insert(0, os.path.dirname(__file__))

from experimental_avatar import ExperimentalAvatar

def run_boot_sequence():
    """Run the Tomodachi boot sequence"""
    avatar = ExperimentalAvatar()

    # Boot sequence: slower progression through modes
    boot_modes = [
        ("idle", 2.5),        # Waking up
        ("thinking", 3.5),    # Initializing
        ("fluid", 2.5),       # Systems flowing
        ("celebrating", 1.5), # Boot complete!
    ]

    try:
        for mode, duration in boot_modes:
            avatar.animate(duration, mode)

        # Clear and show final message
        avatar.clear_screen()
        print(f"""
{avatar.COLORS['green']}{avatar.COLORS['bold']}╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                    ✓  B O O T   C O M P L E T E             ║
║                                                              ║
║                  🏕️  Entering Base Camp...                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{avatar.COLORS['reset']}
""")

    except KeyboardInterrupt:
        avatar.clear_screen()
        print(f"\n{avatar.COLORS['yellow']}Boot interrupted.{avatar.COLORS['reset']}\n")
        sys.exit(0)

if __name__ == "__main__":
    run_boot_sequence()
