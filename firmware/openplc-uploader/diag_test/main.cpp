#include <Arduino.h>

void setup() {
    pinMode(PD10, OUTPUT);
}

void loop() {
    digitalWrite(PD10, HIGH);
    delay(150);
    digitalWrite(PD10, LOW);
    delay(150);
}
