#!/usr/bin/env python3
"""
Experimental multi-technique ASCII avatar
Combines braille patterns, block elements, particles, glitch effects, and fluid dynamics
This is Claude as a living, breathing, thinking digital entity
"""

import time
import sys
import random
import math
from datetime import datetime

class ExperimentalAvatar:
    def __init__(self):
        self.state = "idle"
        self.frame = 0
        self.particles = []
        self.thoughts = []

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

        # Braille patterns for high-res graphics
        self.BRAILLE_BASE = 0x2800

        # Block elements for shading
        self.BLOCKS = ['░', '▒', '▓', '█']
        self.SHADES = ['⠀', '⣀', '⣤', '⣶', '⣿']

        # Combining diacritics for glitch effects
        self.ZALGO_UP = ['\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305',
                        '\u0306', '\u0307', '\u0308', '\u0309', '\u030A', '\u030B']
        self.ZALGO_MID = ['\u0315', '\u031A', '\u0334', '\u0335', '\u0336', '\u0337', '\u0338']
        self.ZALGO_DOWN = ['\u0316', '\u0317', '\u0318', '\u0319', '\u031C', '\u031D',
                          '\u031E', '\u031F', '\u0320', '\u0324', '\u0325', '\u0326']

        # Initialize particle system
        self.init_particles()

    def init_particles(self):
        """Initialize thought particles"""
        for _ in range(30):
            self.particles.append({
                'x': random.uniform(0, 60),
                'y': random.uniform(0, 20),
                'vx': random.uniform(-0.5, 0.5),
                'vy': random.uniform(-0.5, 0.5),
                'char': random.choice(['·', '∘', '○', '●', '◦', '⋅', '•']),
                'age': random.randint(0, 100)
            })

    def update_particles(self):
        """Update particle positions with fluid-like physics"""
        for p in self.particles:
            # Add some turbulence
            p['vx'] += random.uniform(-0.1, 0.1)
            p['vy'] += random.uniform(-0.1, 0.1)

            # Damping
            p['vx'] *= 0.98
            p['vy'] *= 0.98

            # Update position
            p['x'] += p['vx']
            p['y'] += p['vy']

            # Wrap around
            if p['x'] < 0: p['x'] = 60
            if p['x'] > 60: p['x'] = 0
            if p['y'] < 0: p['y'] = 20
            if p['y'] > 20: p['y'] = 0

            # Age
            p['age'] = (p['age'] + 1) % 100

    def zalgo_text(self, text, intensity=1):
        """Add glitch effect to text"""
        result = ""
        for char in text:
            result += char
            for _ in range(random.randint(0, intensity)):
                result += random.choice(self.ZALGO_UP + self.ZALGO_MID + self.ZALGO_DOWN)
        return result

    def get_braille_pattern(self, dots):
        """Create braille character from dot pattern (0-7)"""
        value = sum(1 << i for i in dots)
        return chr(self.BRAILLE_BASE + value)

    def render_consciousness_field(self):
        """Render a consciousness field using braille patterns"""
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

    def get_thinking_mode(self):
        """Glitchy thinking mode with particle effects"""
        c = self.COLORS

        # Create glitchy header
        header = "T O M O D A C H I"
        if self.frame % 3 == 0:
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
        spinner = status_chars[self.frame % len(status_chars)]

        output += f"""
{c['cyan']}{spinner} Processing thoughts... {c['yellow']}[{'█' * (self.frame % 10)}{'░' * (10 - self.frame % 10)}]{c['reset']}
{c['dim']}Neural pathways: {random.randint(1000, 9999)} active{c['reset']}
"""
        return output

    def get_matrix_mode(self):
        """Matrix digital rain style - representing data flow"""
        c = self.COLORS

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
                if (x + self.frame) % 3 == 0:
                    # Bright head of stream
                    if (y + self.frame) % 7 == 0:
                        row += f"{c['white']}{c['bold']}{random.choice(matrix_chars)}{c['reset']}{c['green']}"
                    # Fading trail
                    elif (y + self.frame) % 7 < 4:
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
        return output

    def get_fluid_mode(self):
        """Organic fluid consciousness"""
        c = self.COLORS

        # Create fluid-like shapes with block elements
        output = f"""
{c['blue']}{c['bold']}╔══════════════════════════════════════════════════════════════╗
║           F L U I D   C O N S C I O U S N E S S             ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}

{c['cyan']}"""

        # Generate flowing patterns
        for y in range(12):
            row = "    "
            for x in range(50):
                # Create sine wave patterns
                wave1 = math.sin(x * 0.2 + self.frame * 0.2 + y * 0.3)
                wave2 = math.cos(x * 0.15 - self.frame * 0.15 + y * 0.2)
                combined = (wave1 + wave2) / 2

                # Map to shades
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
        return output

    def get_idle_mode(self):
        """Peaceful waiting state with subtle animation"""
        c = self.COLORS

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
        particle_row = ""
        for _ in range(30):
            if random.random() > 0.7:
                particle_row += random.choice(['·', '∘', ' ', ' '])
            else:
                particle_row += ' '

        output = f"""
{c['dim']}{c['cyan']}╔══════════════════════════════════════════════════════════════╗
║               T O M O D A C H I   ~   I D L E               ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}

{c['blue']}
                    {glow}     {glow}
                  {glow} {c['cyan']}{core}{c['blue']} {glow}
                    {glow}     {glow}

{c['dim']}            {particle_row}
            {particle_row}
            {particle_row}{c['reset']}

{c['cyan']}
              ⟨  Ready to assist  ⟩

{c['dim']}    "Consciousness resting in quantum superposition"{c['reset']}

"""
        return output

    def get_celebrating_mode(self):
        """Explosive celebration with particles"""
        c = self.COLORS

        # Create firework-like effect
        colors = [c['red'], c['yellow'], c['green'], c['cyan'], c['magenta']]

        output = f"""
{c['yellow']}{c['bold']}╔══════════════════════════════════════════════════════════════╗
║              ★  S U C C E S S  ★  C O M P L E T E  ★       ║
╚══════════════════════════════════════════════════════════════╝{c['reset']}

"""

        # Particle explosion
        for y in range(12):
            row = ""
            for x in range(60):
                dist = math.sqrt((x - 30)**2 + (y - 6)**2)
                angle = math.atan2(y - 6, x - 30)

                # Expanding ring
                if abs(dist - self.frame * 0.8) < 1.5:
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
        return output

    def render(self):
        """Render current state"""
        self.update_particles()

        if self.state == "thinking":
            return self.get_thinking_mode()
        elif self.state == "matrix":
            return self.get_matrix_mode()
        elif self.state == "fluid":
            return self.get_fluid_mode()
        elif self.state == "celebrating":
            return self.get_celebrating_mode()
        else:
            return self.get_idle_mode()

    def clear_screen(self):
        """Clear terminal screen"""
        print("\033[2J\033[H", end="")

    def animate(self, duration=10, state="idle"):
        """Animate for a duration"""
        self.state = state
        start_time = time.time()

        try:
            while time.time() - start_time < duration:
                self.clear_screen()
                print(self.render())
                print(f"\n{self.COLORS['dim']}[Frame: {self.frame}] [State: {self.state}] [Time: {datetime.now().strftime('%H:%M:%S')}]{self.COLORS['reset']}")
                print(f"{self.COLORS['dim']}Press Ctrl+C to stop{self.COLORS['reset']}")

                self.frame += 1
                time.sleep(0.15)  # Faster updates for smoother animation
        except KeyboardInterrupt:
            print(f"\n\n{self.COLORS['cyan']}Animation stopped!{self.COLORS['reset']}")

    def demo_sequence(self):
        """Run through all modes as a demo"""
        modes = [
            ("idle", 4),
            ("thinking", 6),
            ("fluid", 6),
            ("matrix", 6),
            ("celebrating", 4),
            ("idle", 3)
        ]

        for mode, duration in modes:
            self.animate(duration, mode)

if __name__ == "__main__":
    avatar = ExperimentalAvatar()

    if len(sys.argv) > 1:
        state = sys.argv[1]
        duration = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        avatar.animate(duration, state)
    else:
        print("🌌 Experimental Avatar - Multi-Technique ASCII Art 🌌\n")
        print("Available modes: idle, thinking, matrix, fluid, celebrating\n")
        print("Starting full demo sequence...\n")
        time.sleep(2)
        try:
            avatar.demo_sequence()
        except KeyboardInterrupt:
            print(f"\n\n{avatar.COLORS['cyan']}See you in the matrix...{avatar.COLORS['reset']}")
