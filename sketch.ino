#define BLYNK_TEMPLATE_ID   "TMPL3WI6BCctl"
#define BLYNK_TEMPLATE_NAME "Smart Energy Monitor"
#define BLYNK_AUTH_TOKEN    "57dI6p2oarR_GX5j9VNfOSQMkHO2vNmR"

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------- Display Setup ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---------- WiFi Credentials ----------
char ssid[] = "Wokwi-GUEST";
char pass[] = "";

// ---------- Constants ----------
#define NUM_ROOMS 5
#define VOLTAGE 220.0
#define RATE 6.0               // Cost per kWh (₹)

// ---------- Potentiometer Pins ----------
int potPins[NUM_ROOMS] = {34, 35, 32, 33, 36};   // ADC pins for each room

// ---------- Variables ----------
float current[NUM_ROOMS] = {0};
float power[NUM_ROOMS] = {0};
float cost[NUM_ROOMS] = {0};
float monthlyBill[NUM_ROOMS] = {0};
float limit[NUM_ROOMS] = {500, 500, 500, 500, 500};   // W limits per room

// ---------- Function: Get Current from Pot ----------
float getCurrent(int potPin) {
  int potValue = analogRead(potPin);              // 0 – 4095
  float current = map(potValue, 0, 4095, 0, 250) / 100.0;  
  // 0 – 4095 → 0.00 – 2.50 A
  return current;
}

// ---------- Function: Read and Calculate ----------
void readRooms() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  for (int i = 0; i < NUM_ROOMS; i++) {
    current[i] = getCurrent(potPins[i]);                 // Amps
    power[i] = current[i] * VOLTAGE;                     // Watts
    cost[i] = (power[i] / 1000.0) * RATE;                // ₹/hr
    monthlyBill[i] = cost[i] * 24 * 30;                  // ₹/month approx

    // Send values to Blynk (3 virtual pins per room: Power, Cost, Monthly Bill)
    Blynk.virtualWrite(i * 3 + 1, round(power[i] * 100) / 100.0);     
    Blynk.virtualWrite(i * 3 + 2, round(cost[i] * 100) / 100.0);      
    Blynk.virtualWrite(i * 3 + 3, round(monthlyBill[i] * 100) / 100.0);

    // Debugging on Serial Monitor
    Serial.printf("Room%d | Pot=%d | Current=%.2fA | Power=%.1fW | Hourly=₹%.2f | Monthly=₹%.2f | %s\n",
                  i + 1, analogRead(potPins[i]), current[i], power[i],
                  cost[i], monthlyBill[i],
                  (power[i] > limit[i]) ? "CUTOFF" : "OK");

    // Display on OLED
    display.setCursor(0, i * 12);
    display.printf("R%d: %.1fW %s", i + 1, power[i], (power[i] > limit[i]) ? "CUTOFF" : "OK");
  }

  display.display();
}

void setup() {
  Serial.begin(115200);

  // Initialize OLED display
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }

  // Connect to Blynk
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

  // Set all potentiometer pins as INPUT
  for (int i = 0; i < NUM_ROOMS; i++) {
    pinMode(potPins[i], INPUT);
  }
}

void loop() {
  Blynk.run();
  readRooms();  
  delay(2000);   // update every 2s
}
