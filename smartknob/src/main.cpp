#include "cst816.h"
#include "lcd_bl_pwm_bsp.h"
#include "lcd_bsp.h"
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  delay(1000); // Massive safety delay for power stability
  Serial.println("\n\n=== RECOVERY MODE: Forced Backlight ===");
  pinMode(47, OUTPUT);
  digitalWrite(47, HIGH); // Force light on immediately

  Serial.println("Step 1: Touch init...");
  Touch_Init();

  Serial.println("Step 1.5: PMIC init (Enable AMOLED Power)...");
  PMIC_Init();
  Serial.println("  Touch OK");

  Serial.println("Step 2: Display + LVGL init...");
  lcd_lvgl_Init();
  Serial.println("  Display OK");

  Serial.println("Step 3: Backlight init...");
  lcd_bl_pwm_bsp_init(LCD_PWM_MODE_255);
  Serial.println("  Backlight OK");

  Serial.println("=== INIT COMPLETE ===");
  Serial.println("You should see red screen with white text!");

  // RAW HARDWARE TEST
  lcd_raw_test();
}

void loop() {
  static int count = 0;
  if (count % 10 == 0) {
    Serial.print("Running... ");
    Serial.println(count / 10);
  }
  count++;
  delay(100);
}
