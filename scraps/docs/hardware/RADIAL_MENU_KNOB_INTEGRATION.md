# Radial Menu Smart Knob Integration - Technical Specification

**Date:** 2025-11-24
**Target Hardware:** Waveshare ESP32-S3 Knob Touch LCD 1.8"
**Related Code:** `campground/public/radial-menu.js`, `campground/public/flo-radial-integration.js`

## Executive Summary

Port the browser-based radial menu system to run on the Waveshare ESP32-S3 smart knob with OTA (Over-The-Air) updates for fast iteration. Uses a command-based architecture where the Raspberry Pi runs menu logic and the knob handles rendering and input.

## Hardware Specifications

### Waveshare ESP32-S3 Knob
- **Display:** 360×360 pixels, 1.8" round IPS LCD, capacitive touch
- **MCU:** Dual-chip (ESP32-S3 + ESP32)
- **Memory:** 16MB Flash, 8MB PSRAM
- **Connectivity:** WiFi 2.4GHz, Bluetooth
- **Input:** Rotary encoder, capacitive touch screen
- **Extras:** Audio DAC, microphone, vibration motor, battery support

**Key Insight:** With 8MB PSRAM, the device is powerful enough to run standalone, but we chose command-based architecture for easier AI-assisted development.

## Architecture Decision

### Selected: Option C - Command-Based Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│  Raspberry Pi       │  WiFi   │  ESP32-S3 Knob       │
│  ├── radial-menu.js │◄───────►│  ├── LVGL renderer   │
│  │   (state logic)  │  JSON   │  ├── Native 60fps    │
│  └── Sends commands │         │  └── No lag!         │
└─────────────────────┘         └──────────────────────┘
```

**Benefits:**
1. **Low bandwidth** (~1-2KB per update, only when state changes)
2. **Smooth 60fps** animations (rendered locally on knob)
3. **Keep existing JS logic** (just send state updates)
4. **Battery friendly** (WiFi only sends small JSON messages)
5. **Low latency** (no pixel streaming delay)
6. **AI-friendly** (edit JS without flashing firmware)

**Rejected Alternatives:**
- **Option A (Standalone):** Would require porting all JS to C++/LVGL
- **Option B1 (Web browser on ESP32):** Limited browser support on ESP32
- **Option B2 (Pixel streaming):** High bandwidth (3.5 MB/s), latency issues

## Development Workflow

### Problem Statement
Arduino IDE workflow is painfully slow for iterative development:
- Compilation: 45-90 seconds every time
- USB upload: 30-45 seconds
- Serial monitor: Manual open/close
- **Total iteration time: 2-3 minutes**

### Solution: OTA (Over-The-Air) Updates

**Speed Comparison:**

| Method | Upload Time | Iteration Speed |
|--------|-------------|-----------------|
| USB Serial | ~40 seconds | 😴 Slow |
| OTA WiFi | ~8 seconds | ⚡ **5x faster!** |

**How OTA Works:**
1. ESP32-S3 flash is partitioned (App0, App1)
2. New firmware downloads to App1 while App0 runs
3. After verification, bootloader switches to App1
4. If App1 crashes, auto-rollback to App0 (safe!)

**First-Time Setup:**
```bash
# 1. Flash OTA-enabled firmware via USB (one time)
pio run -e esp32-s3-usb -t upload --upload-port /dev/ttyUSB0

# 2. Note IP address from serial monitor
# IP Address: 192.168.1.42
# Hostname: esp32-knob.local
```

**Daily Workflow (No USB!):**
```bash
# Edit code in VS Code
code knob_ota_radial_menu.ino

# Flash over WiFi (8 seconds)
./flash-ota.sh

# Monitor logs wirelessly
pio device monitor --port socket://esp32-knob.local:23
```

## Communication Protocol

### WebSocket Connection
- **Server:** Raspberry Pi (ws://pi-ip:8080/knob)
- **Client:** ESP32-S3 Knob
- **Format:** JSON messages
- **Reconnect:** Auto-reconnect on disconnect

### Message Schemas

#### Knob → Pi (Input Events)

**Rotary Encoder:**
```json
{
  "type": "rotate",
  "delta": 1,
  "timestamp": 1234567890
}
```

**Touch Tap:**
```json
{
  "type": "tap",
  "x": 180,
  "y": 180,
  "timestamp": 1234567890
}
```

**Connection Status:**
```json
{
  "type": "hello",
  "device": "esp32-knob",
  "ip": "192.168.1.42",
  "version": "1.0.0"
}
```

#### Pi → Knob (State Updates)

**Menu State Update:**
```json
{
  "type": "menu_state",
  "rotation": 45,
  "selectedIndex": 1,
  "expanded": true,
  "options": [
    {
      "icon": "💬",
      "panel": "chat",
      "angle": 0,
      "selected": false
    },
    {
      "icon": "🎭",
      "panel": "mood",
      "angle": 45,
      "selected": true
    },
    {
      "icon": "📊",
      "panel": "status",
      "angle": 90,
      "selected": false
    }
  ]
}
```

**Drawing Commands (Future):**
```json
{
  "type": "draw_circle",
  "x": 180,
  "y": 180,
  "radius": 50,
  "color": "#ff69b4"
}
```

## File Structure

```
tomodachi/
├── campground/
│   ├── public/
│   │   ├── radial-menu.js           # ⭐ Existing: Core RadialMenu class
│   │   └── flo-radial-integration.js # ⭐ Existing: Flo + Menu integration
│   └── server/
│       └── websocket-server.js       # 🆕 TODO: WebSocket server for knob
│
└── smartKnob/
    └── knob_ota_radial_menu/         # ⭐ Created: OTA firmware
        ├── knob_ota_radial_menu.ino  # Main firmware with OTA
        ├── platformio.ini             # Fast build config
        ├── flash-ota.sh               # One-command flash script
        ├── README.md                  # Full documentation
        └── QUICK_START.md             # 5-minute setup guide
```

## Implementation Phases

### Phase 1: OTA Development Setup ✅ COMPLETE
- [x] Create OTA-enabled ESP32 firmware skeleton
- [x] WebSocket client integration
- [x] LVGL display initialization
- [x] Encoder input handling
- [x] Development scripts (flash-ota.sh)
- [x] Documentation (README, QUICK_START)

**Deliverables:** `smartKnob/knob_ota_radial_menu/`

### Phase 2: Pi WebSocket Server 🔜 NEXT
**Goal:** Create WebSocket server on Raspberry Pi that receives knob input and sends menu state.

**Tasks:**
- [ ] Create `campground/server/websocket-server.js`
- [ ] Handle knob connection/disconnection
- [ ] Parse incoming rotation/tap events
- [ ] Send menu state updates to knob
- [ ] Integration with existing radial-menu.js

**Acceptance Criteria:**
- Knob rotation triggers scroll events in browser
- Browser menu state syncs to knob display
- Auto-reconnect on WiFi drops

### Phase 3: Knob-Side Rendering 🔜 TODO
**Goal:** Implement LVGL-based radial menu rendering on ESP32.

**Tasks:**
- [ ] Parse JSON menu state messages
- [ ] Render radial menu with LVGL
- [ ] Animate menu rotation (60fps)
- [ ] Highlight selected option
- [ ] Expand/collapse animations
- [ ] Visual feedback for selections

**Acceptance Criteria:**
- Menu renders at 60fps with smooth rotation
- Selected item highlights correctly
- Animations match browser version

### Phase 4: Input Handling 🔜 TODO
**Goal:** Map physical knob interactions to menu actions.

**Tasks:**
- [ ] Rotary encoder → menu rotation
- [ ] Touch tap → option selection
- [ ] Haptic feedback on selection
- [ ] Visual feedback on input

**Acceptance Criteria:**
- Turning knob rotates menu smoothly
- Tapping selects highlighted option
- Haptic motor provides tactile feedback

### Phase 5: Polish & Optimization 🔜 TODO
**Goal:** Production-ready experience.

**Tasks:**
- [ ] Battery optimization (WiFi sleep modes)
- [ ] Error handling and recovery
- [ ] Connection status indicators
- [ ] Performance profiling
- [ ] User testing and refinement

## Technical Constraints

### ESP32 Firmware
- **Language:** C++ (Arduino framework)
- **Graphics:** LVGL 8.x
- **WebSocket:** Links2004/WebSockets library
- **JSON:** ArduinoJson library
- **Target FPS:** 60fps for animations
- **Max WiFi latency:** <50ms for responsive feel

### Raspberry Pi Server
- **Language:** Node.js / JavaScript
- **WebSocket:** ws library
- **Port:** 8080 (configurable)
- **Concurrent clients:** Support multiple knobs

## Development Tools

### Required Software
- **PlatformIO** (recommended) or Arduino IDE
- **VS Code** with PlatformIO extension
- **Node.js** for Pi server
- **Git** for version control

### Recommended Workflow
```bash
# Terminal 1: Pi WebSocket server
cd campground && npm run dev

# Terminal 2: Knob monitor
pio device monitor --port socket://esp32-knob.local:23

# Terminal 3: Development
code smartKnob/knob_ota_radial_menu/knob_ota_radial_menu.ino
# Edit, save
./flash-ota.sh  # 8 seconds to flash!
```

## Success Metrics

### Development Speed
- **Target:** <15 second iteration cycle (edit → flash → test)
- **Current:** 8-12 seconds with OTA ✅

### User Experience
- **Menu responsiveness:** <50ms from knob turn to display update
- **Animation smoothness:** 60fps with no frame drops
- **Connection reliability:** Auto-reconnect within 5 seconds

### Code Maintainability
- **Logic location:** JavaScript (easy AI assistance)
- **Firmware changes:** Rare (only for new primitives)
- **Protocol:** JSON (human-readable, debuggable)

## Open Questions

1. **Battery life:** How long should knob stay connected on battery?
   - Option A: Always-on WiFi (1-2 hours)
   - Option B: WiFi sleep after 60s idle (8-10 hours)
   - Option C: WiFi on-demand (button press) (24+ hours)

2. **Fallback behavior:** What if WiFi/Pi unavailable?
   - Option A: Show error screen
   - Option B: Basic standalone mode (cached menu)
   - Option C: Bluetooth fallback

3. **Multi-knob support:** Should one Pi support multiple knobs?
   - If yes, need device ID scheme

## References

### Documentation
- [ESP32 OTA Updates](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/ota.html)
- [LVGL Documentation](https://docs.lvgl.io/)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)
- [Waveshare ESP32-S3 Knob Wiki](https://www.waveshare.com/wiki/ESP32-S3-Knob-Touch-LCD-1.8)

### Related Code
- Browser radial menu: `campground/public/radial-menu.js`
- Flo integration: `campground/public/flo-radial-integration.js`
- Existing knob examples: `smartKnob/knob_combined_wifi_ble/`

## Timeline Estimate

| Phase | Estimated Time | Status |
|-------|---------------|--------|
| Phase 1: OTA Setup | 4 hours | ✅ Complete |
| Phase 2: Pi Server | 2-3 hours | 🔜 Next |
| Phase 3: Knob Rendering | 4-6 hours | 🔜 TODO |
| Phase 4: Input Handling | 2-3 hours | 🔜 TODO |
| Phase 5: Polish | 3-4 hours | 🔜 TODO |
| **Total** | **15-20 hours** | **~20% done** |

## Next Action Items

### For Fresh Branch
1. Create new branch from up-to-date main
2. Cherry-pick or recreate OTA firmware setup
3. Start with Phase 2: Pi WebSocket Server
4. Implement basic knob ↔ Pi communication
5. Add menu rendering to knob
6. Test end-to-end integration

### Immediate TODO
- [ ] Set up Pi WebSocket server skeleton
- [ ] Test knob connection to server
- [ ] Send test message from Pi → Knob
- [ ] Verify knob receives and displays message
- [ ] Implement rotation event handling

---

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Status:** Phase 1 Complete, Phase 2 Ready to Start
