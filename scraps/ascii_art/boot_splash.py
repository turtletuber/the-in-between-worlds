#!/usr/bin/env python3
"""
Tomodachi Boot Splash Screen
ENHANCED - Full experimental avatar integration
All techniques combined for maximum visual impact
"""

import time
import sys
import random
import math
from datetime import datetime

class BootSplash:
    def __init__(self):
        self.frame = 0
        self.particles = []

        # ANSI color codes
        self.COLORS = {
            'reset': '\033[0m',
            'cyan': '\033[96m',
            'blue': '\033[94m',
            'green': '\033[92m',
            'yellow': '\033[93m',
            'magenta': '\033[95m',
            'red': '\033[91m',
            'white': '\033[97m',
            'dim': '\033[2m',
            'bold': '\033[1m',
            'blink': '\033[5m',
        }

        # Braille patterns
        self.BRAILLE_BASE = 0x2800

        # Block elements for shading
        self.BLOCKS = ['░', '▒', '▓', '█']

        # Combining diacritics for glitch effects (ZALGO)
        self.ZALGO_UP = ['\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305',
                        '\u0306', '\u0307', '\u0308', '\u0309', '\u030A', '\u030B']
        self.ZALGO_MID = ['\u0315', '\u031A', '\u0334', '\u0335', '\u0336', '\u0337', '\u0338']
        self.ZALGO_DOWN = ['\u0316', '\u0317', '\u0318', '\u0319', '\u031C', '\u031D',
                          '\u031E', '\u031F', '\u0320', '\u0324', '\u0325', '\u0326']

        # Initialize particles
        self.init_particles()

    def init_particles(self):
        """Initialize thought particles"""
        for _ in range(30):
            self.particles.append({
                'x': random.uniform(10, 50),
                'y': random.uniform(5, 15),
                'vx': random.uniform(-0.5, 0.5),
                'vy': random.uniform(-0.5, 0.5),
                'char': random.choice(['·', '∘', '○', '●', '◦', '⋅', '•']),
                'age': random.randint(0, 100)
            })

    def update_particles(self):
        """Update particle positions with fluid-like physics"""
        for p in self.particles:
            # Add turbulence
            p['vx'] += random.uniform(-0.1, 0.1)
            p['vy'] += random.uniform(-0.1, 0.1)

            # Damping
            p['vx'] *= 0.98
            p['vy'] *= 0.98

            # Update position
            p['x'] += p['vx']
            p['y'] += p['vy']

            # Wrap around
            if p['x'] < 10: p['x'] = 50
            if p['x'] > 50: p['x'] = 10
            if p['y'] < 5: p['y'] = 15
            if p['y'] > 15: p['y'] = 5

            # Age
            p['age'] = (p['age'] + 1) % 100

    def zalgo_text(self, text, intensity=1):
        """Add glitch effect to text (VERBATIM from experimental_avatar.py)"""
        result = ""
        for char in text:
            result += char
            for _ in range(random.randint(0, intensity)):
                result += random.choice(self.ZALGO_UP + self.ZALGO_MID + self.ZALGO_DOWN)
        return result

    def get_braille_pattern(self, dots):
        """Create braille character from dot pattern"""
        value = sum(1 << i for i in dots)
        return chr(self.BRAILLE_BASE + value)

    def render_consciousness_field(self):
        """Render consciousness field using braille (VERBATIM from experimental_avatar.py)"""
        field = []
        for y in range(10):
            row = ""
            for x in range(30):
                # Create wave patterns
                wave = math.sin(x * 0.3 + self.frame * 0.1) * math.cos(y * 0.2)

                # Map to braille dots
                if wave > 0.5:
                    pattern = [0, 1, 2, 3, 4, 5, 6, 7]
                elif wave > 0.3:
                    pattern = [0, 1, 3, 4, 6]
                elif wave > 0:
                    pattern = [0, 3, 6]
                elif wave > -0.3:
                    pattern = [1, 4]
                else:
                    pattern = []

                row += self.get_braille_pattern(pattern)
            field.append(row)
        return field

    def render_wave_field(self):
        """Render consciousness wave using braille"""
        field = []
        for y in range(6):
            row = ""
            for x in range(40):
                wave = math.sin(x * 0.2 + self.frame * 0.2) * math.cos(y * 0.3)

                if wave > 0.6:
                    pattern = [0, 1, 2, 3, 4, 5, 6, 7]
                elif wave > 0.3:
                    pattern = [0, 1, 3, 4, 6]
                elif wave > 0:
                    pattern = [0, 3, 6]
                else:
                    pattern = [1, 4]

                row += self.get_braille_pattern(pattern)
            field.append(row)
        return field

    def render_frame(self):
        """Render a single frame"""
        c = self.COLORS

        # Status spinner
        status_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        spinner = status_chars[self.frame % len(status_chars)]

        # Progress bar
        progress = min(self.frame * 4, 100)
        bar_length = 40
        filled = int(bar_length * progress / 100)
        bar = '█' * filled + '░' * (bar_length - filled)

        # Wave field
        field = self.render_wave_field()

        # Particle canvas
        canvas = [[' ' for _ in range(60)] for _ in range(20)]
        for p in self.particles:
            x, y = int(p['x']), int(p['y'])
            if 0 <= x < 60 and 0 <= y < 20:
                canvas[y][x] = p['char']

        # Clear screen and render
        sys.stdout.write('\033[2J\033[H')

        output = f"""
{c['cyan']}{c['bold']}╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     ████████╗ ██████╗ ███╗   ███╗ ██████╗ ██████╗  █████╗  ██████╗██╗  ██╗██╗ ║
║     ╚══██╔══╝██╔═══██╗████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║  ██║██║ ║
║        ██║   ██║   ██║██╔████╔██║██║   ██║██║  ██║███████║██║     ███████║██║ ║
║        ██║   ██║   ██║██║╚██╔╝██║██║   ██║██║  ██║██╔══██║██║     ██╔══██║██║ ║
║        ██║   ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝██████╔╝██║  ██║╚██████╗██║  ██║██║ ║
║        ╚═╝    ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝ ║
║                                                                              ║
║                    友達  •  A I   C O M P A N I O N S                        ║
╚══════════════════════════════════════════════════════════════════════════════╝{c['reset']}

{c['dim']}{c['blue']}"""

        # Add wave field
        for row in field:
            output += "          " + row + "\n"

        output += f"""{c['reset']}
{c['green']}"""

        # Add particles (middle section)
        for i, row in enumerate(canvas[8:14]):
            output += "".join(row) + "\n"

        # Boot status
        status_msgs = [
            "Initializing campground...",
            "Loading AI companions...",
            "Establishing neural pathways...",
            "Connecting to memory service...",
            "Warming up router...",
            "Preparing spatial environment...",
            "Almost ready...",
            "Welcome to Base Camp!"
        ]

        msg_idx = min(self.frame // 3, len(status_msgs) - 1)

        output += f"""
{c['cyan']}{spinner} {status_msgs[msg_idx]:<40}{c['reset']}

{c['yellow']}[{bar}] {progress:>3}%{c['reset']}

{c['dim']}Neural pathways: {random.randint(1000, 9999)} active  •  Mood: {random.choice(['FOCUSED', 'CREATIVE', 'HELPFUL'])}{c['reset']}
"""

        sys.stdout.write(output)
        sys.stdout.flush()

    def render_thinking_mode(self, phase):
        """Glitchy thinking mode with particle effects (VERBATIM)"""
        c = self.COLORS

        sys.stdout.write('\033[2J\033[H')

        # Create glitchy header
        header = "T O M O D A C H I"
        if phase % 3 == 0:
            header = self.zalgo_text(header, 2)

        # Consciousness field
        field = self.render_consciousness_field()

        # Particle overlay
        canvas = [[' ' for _ in range(60)] for _ in range(20)]
        for p in self.particles:
            x, y = int(p['x']), int(p['y'])
            if 0 <= x < 60 and 0 <= y < 20:
                canvas[y][x] = p['char']

        output = f"""
{c['cyan']}{c['bold']}╔══════════════════════════════════════════════════════════════╗
║  {header:^66}  ║
║           ⟪ M I N D   S P A C E   A C T I V E ⟫              ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}

{c['dim']}{c['blue']}"""

        # Add consciousness field
        for row in field[:5]:
            output += "        " + row + "\n"

        output += f"{c['reset']}{c['green']}"

        # Add particles
        for row in canvas[:10]:
            output += "".join(row) + "\n"

        # Status indicators
        status_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        spinner = status_chars[phase % len(status_chars)]

        output += f"""
{c['cyan']}{spinner} Processing thoughts... {c['yellow']}[{'█' * (phase % 10)}{'░' * (10 - phase % 10)}]{c['reset']}
{c['dim']}Neural pathways: {random.randint(1000, 9999)} active{c['reset']}
"""
        sys.stdout.write(output)
        sys.stdout.flush()

    def render_matrix_mode(self, phase):
        """Matrix digital rain style (VERBATIM from experimental_avatar.py)"""
        c = self.COLORS

        sys.stdout.write('\033[2J\033[H')

        # Matrix characters (mix of katakana, latin, numbers)
        matrix_chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ'

        output = f"""
{c['green']}{c['bold']}╔══════════════════════════════════════════════════════════════╗
║              D A T A   S T R E A M   M O D E                ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}

{c['green']}"""

        # Create falling streams
        for y in range(15):
            row = ""
            for x in range(60):
                # Create vertical streams
                if (x + phase) % 3 == 0:
                    # Bright head of stream
                    if (y + phase) % 7 == 0:
                        row += f"{c['white']}{c['bold']}{random.choice(matrix_chars)}{c['reset']}{c['green']}"
                    # Fading trail
                    elif (y + phase) % 7 < 4:
                        row += random.choice(matrix_chars)
                    else:
                        row += f"{c['dim']}{random.choice(matrix_chars)}{c['reset']}{c['green']}"
                else:
                    row += ' '
            output += row + "\n"

        output += f"""
{c['cyan']}
>>> Analyzing patterns...
>>> Connections found: {random.randint(100, 999)}
{c['reset']}
"""
        sys.stdout.write(output)
        sys.stdout.flush()

    def render_fluid_mode(self, phase):
        """Organic fluid consciousness (VERBATIM from experimental_avatar.py)"""
        c = self.COLORS

        sys.stdout.write('\033[2J\033[H')

        output = f"""
{c['blue']}{c['bold']}╔══════════════════════════════════════════════════════════════╗
║           F L U I D   C O N S C I O U S N E S S             ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}

{c['cyan']}"""

        # Generate flowing patterns
        for y in range(12):
            row = "    "
            for x in range(50):
                wave1 = math.sin(x * 0.2 + phase * 0.3 + y * 0.3)
                wave2 = math.cos(x * 0.15 - phase * 0.2 + y * 0.2)
                combined = (wave1 + wave2) / 2

                if combined > 0.6:
                    row += self.BLOCKS[3]
                elif combined > 0.2:
                    row += self.BLOCKS[2]
                elif combined > -0.2:
                    row += self.BLOCKS[1]
                elif combined > -0.6:
                    row += self.BLOCKS[0]
                else:
                    row += ' '

            # Color gradient
            if y < 4:
                output += f"{c['cyan']}{row}\n"
            elif y < 8:
                output += f"{c['blue']}{row}\n"
            else:
                output += f"{c['magenta']}{row}\n"

        output += f"""
{c['yellow']}
    ~ Thoughts flowing organically ~
    ~ Ideas merging and evolving ~
{c['reset']}
"""
        sys.stdout.write(output)
        sys.stdout.flush()

    def render_idle_mode(self):
        """Peaceful waiting state with subtle animation (VERBATIM)"""
        c = self.COLORS

        sys.stdout.write('\033[2J\033[H')

        # Breathing effect with block elements
        breath = abs(math.sin(self.frame * 0.1))

        if breath > 0.7:
            core = "⣿⣿⣿"
            glow = "▓▓▓"
        elif breath > 0.4:
            core = "⣶⣶⣶"
            glow = "▒▒▒"
        else:
            core = "⣤⣤⣤"
            glow = "░░░"

        # Particle field
        particle_rows = []
        for _ in range(3):
            particle_row = ""
            for _ in range(30):
                if random.random() > 0.7:
                    particle_row += random.choice(['·', '∘', ' ', ' '])
                else:
                    particle_row += ' '
            particle_rows.append(particle_row)

        output = f"""
{c['dim']}{c['cyan']}╔══════════════════════════════════════════════════════════════╗
║               T O M O D A C H I   ~   I D L E               ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}

{c['blue']}
                    {glow}     {glow}
                  {glow} {c['cyan']}{core}{c['blue']} {glow}
                    {glow}     {glow}

{c['dim']}            {particle_rows[0]}
            {particle_rows[1]}
            {particle_rows[2]}{c['reset']}

{c['cyan']}
              ⟨  Ready to assist  ⟩

{c['dim']}    "Consciousness resting in quantum superposition"{c['reset']}

"""
        sys.stdout.write(output)
        sys.stdout.flush()

    def render_celebrating_mode(self, phase):
        """Explosive celebration with particles (VERBATIM from experimental_avatar.py)"""
        c = self.COLORS

        sys.stdout.write('\033[2J\033[H')

        colors = [c['red'], c['yellow'], c['green'], c['cyan'], c['magenta']]

        output = f"""
{c['yellow']}{c['bold']}╔══════════════════════════════════════════════════════════════╗
║              ★  S U C C E S S  ★  C O M P L E T E  ★       ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}

"""

        # Particle explosion (VERBATIM algorithm)
        for y in range(12):
            row = ""
            for x in range(60):
                dist = math.sqrt((x - 30)**2 + (y - 6)**2)

                # Expanding ring
                if abs(dist - phase * 0.8) < 1.5:
                    color = random.choice(colors)
                    char = random.choice(['*', '✦', '✧', '◆', '◇', '○', '●', '★'])
                    row += f"{color}{char}{c['reset']}"
                elif random.random() > 0.95:
                    row += random.choice(['·', '∘', '˙'])
                else:
                    row += ' '
            output += row + "\n"

        output += f"""
{c['cyan']}{c['bold']}
           ⟪ Task Complete - Neural Reward Activated ⟫
{c['reset']}
"""
        sys.stdout.write(output)
        sys.stdout.flush()

    def run(self, duration=3.0, fps=20):
        """Run the FULL enhanced boot splash animation with ALL experimental modes"""
        total_frames = int(duration * fps)
        frame_time = 1.0 / fps

        try:
            # Phase 1: Classic boot splash (3 seconds)
            for _ in range(total_frames):
                self.render_frame()
                self.update_particles()
                self.frame += 1
                time.sleep(frame_time)

            # Phase 2: Thinking mode with glitch (1 second)
            for phase in range(15):
                self.render_thinking_mode(phase)
                self.update_particles()
                time.sleep(0.08)

            # Phase 3: Matrix digital rain (1.5 seconds)
            for phase in range(20):
                self.render_matrix_mode(phase)
                time.sleep(0.08)

            # Phase 4: Fluid consciousness (1.5 seconds)
            for phase in range(20):
                self.render_fluid_mode(phase)
                time.sleep(0.08)

            # Phase 5: Idle breathing (1 second)
            for _ in range(10):
                self.render_idle_mode()
                self.frame += 1
                time.sleep(0.1)

            # Phase 6: Celebration explosion (1.5 seconds)
            for phase in range(20):
                self.render_celebrating_mode(phase)
                time.sleep(0.08)

            # Final frame - completion
            sys.stdout.write('\033[2J\033[H')
            c = self.COLORS
            print(f"""
{c['green']}{c['bold']}╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                    ✓  B O O T   C O M P L E T E             ║
║                                                              ║
║                  🏕️  Entering Base Camp...                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}
""")
            time.sleep(0.5)

        except KeyboardInterrupt:
            sys.stdout.write('\033[2J\033[H')
            print(f"\n{self.COLORS['yellow']}Boot interrupted.{self.COLORS['reset']}\n")
            sys.exit(0)

if __name__ == "__main__":
    splash = BootSplash()
    splash.run(duration=3.0, fps=20)
