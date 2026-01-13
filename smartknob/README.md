# Smart Knob Development

Fast iteration setup for ESP32-S3-Knob-Touch-LCD-1.8

## Quick Start

### 1. Install PlatformIO
```bash
# VSCode extension (recommended)
# Or CLI:
pip install platformio
```

### 2. First Upload (USB)
```bash
cd smartknob
pio run -t upload -t monitor
```

### 3. Enable OTA for Wireless Updates
1. Update WiFi credentials in `src/main.cpp`
2. First upload via USB
3. After that, upload wirelessly:
```bash
pio run -e esp32s3-ota -t upload
```

Now you can iterate on GUI code and flash wirelessly in ~5 seconds!

## Development Workflow

### Fast GUI Iteration (No Hardware Needed!)
Use the native simulator to test GUI changes instantly:
```bash
# Install SDL2 first
brew install sdl2  # macOS
# sudo apt-get install libsdl2-dev  # Linux

# Run simulator
pio run -e native -t exec
```

### Hardware Development
1. Make changes to `src/main.cpp`
2. Flash wirelessly: `pio run -e esp32s3-ota -t upload`
3. Monitor serial: `pio device monitor`

## Project Structure
```
smartknob/
├── platformio.ini      # Build configuration
├── lv_conf.h          # LVGL settings
├── src/
│   └── main.cpp       # Your code here
└── lib/               # Custom libraries
```

## Tips for Fast Development

1. **GUI Development**: Use simulator first, then test on hardware
2. **OTA Updates**: After initial USB flash, all updates wireless
3. **Hot Reload**: Change WiFi password to enable auto-reconnect
4. **Serial Monitor**: Keep open to debug (`pio device monitor`)
5. **LVGL Docs**: https://docs.lvgl.io/8.4/

## Hardware Pins (Update as needed)
- Display: I2C
- Touch: I2C with interrupt
- Encoder A: GPIO 9
- Encoder B: GPIO 10
- Encoder Button: GPIO 11
- Audio: I2S to PCM5100A

## Next Steps
1. [ ] Add display driver initialization
2. [ ] Configure correct encoder pins
3. [ ] Build your GUI in `createUI()`
4. [ ] Test on hardware via OTA
