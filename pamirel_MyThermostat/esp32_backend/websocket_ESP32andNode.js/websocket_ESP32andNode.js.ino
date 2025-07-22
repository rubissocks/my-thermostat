#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient_Generic.h>
#include <ArduinoJson.h>
#include <mbedtls/md.h>  // For HMACs
#include <Preferences.h>

Preferences preferences;  // For storing data (like eeprom)
WebSocketsClient webSocket;

const char* ssid = "24D292";
const char* password = "ej7uainq8k";
const char* websocketServer = "raspiwebsocket.duckdns.org";  // domain of websocket server
const uint16_t websocketPort = 443;                          // secure websocket server runs on port 443
bool gotMail = false;


const int comFrequency = 10;  // Sets how often data is sent

// Unique for each thermostat
const int thermostatId = 43130;
uint8_t secretKey[32];

// This input is given only once during initial setup
// const char* keyString=


// Sample data (recorded by sensors)
bool thermostatStatus = true;
float currentTemp = 69;
float setTemp = 13.3;
bool thermostatHeating = false;
int currentVentilator = 2;
int setVentilator = 2;
float pressure = 99.7;
float wifiSignal = 10.1;
float rfSignal = 23.1;

// Function declerations
String createSecureJSON();
String calculateHMAC(const String& message, const uint8_t* key);
void storeHMACKey(const char* keyNamespace, const char* keyName, const uint8_t* key, size_t keyLength);
bool retrieveHMACKey(const char* keyNamespace, const char* keyName, uint8_t* output, size_t bufferSize);
bool hexStringToBytes(const char* hexString, uint8_t* output);


void setup() {
  Serial.begin(115200);

  const char* prefsNamespace = "hmac_keys";
  const char* keyName = "43130key";

  if (!retrieveHMACKey(prefsNamespace, keyName, secretKey, sizeof(secretKey))) {
    Serial.println("No key saved, use the storeHMACKey function");
  }

  // uint8_t initialKey[32];
  // if (hexStringToBytes(keyString,initialKey)) {
  //   storeHMACKey(prefsNamespace, keyName, initialKey, sizeof(initialKey));
  //   Serial.println("Key succesfully stored! Delete keyString, uncomment loop(), comment out initalKey and this if statement, then reupload");
  // }


  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("! **Connected to WiFi!**");

  // Configuring WebSocket
  webSocket.beginSSL(websocketServer, websocketPort, "/socket/");
  webSocket.setReconnectInterval(5000);
  webSocket.onEvent(webSocketEventHandler);
}

void loop() {
  webSocket.loop();  // Must be called regularly

  // Sends a JSON every set amount of seconds when connected via websocket server
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 1000 * comFrequency) {
    if (webSocket.isConnected()) {
      String payload = createSecureJSON();
      webSocket.sendTXT(payload);
      Serial.println("Sent: " + payload);
    }
    lastSend = millis();
  }

  if (gotMail) {
    // check hmac, sanitize recieved msg
    Serial.print("some data was recieved");
    gotMail = false;
  }
}

// Function which prints the current websocket status in the serial monitor
// It also formats recieved messages into JSON documents for handling in the loop
void webSocketEventHandler(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("Disconnected from WebSocket");
      break;
    case WStype_CONNECTED:
      Serial.println("Connected to WebSocket");
      break;
    case WStype_TEXT:
      gotMail = true;
      //JsonDocument recievedJson;
      //deserializeJson(recievedJson,payload);
      break;

    case WStype_ERROR:
      Serial.println("WebSocket Error");
      break;
  }
}

// Creates a secure JSON with all the necessary data and HMAC
String createSecureJSON() {
  // Creates a temporary document without HMAC
  JsonDocument tempDoc;
  tempDoc["id"] = thermostatId;
  tempDoc["status_on"] = thermostatStatus;
  tempDoc["temp"] = currentTemp;
  tempDoc["set_temp"] = setTemp;
  tempDoc["heating"] = thermostatHeating;
  tempDoc["ventilator"] = currentVentilator;
  tempDoc["set_ventilator"] = setVentilator;
  tempDoc["pressure"] = pressure;
  tempDoc["wifi_signal"] = wifiSignal;
  tempDoc["rf_signal"] = rfSignal;

  // Serializes without HMAC
  String message;
  serializeJson(tempDoc, message);

  // Calculates HMAC
  String hmac = calculateHMAC(message, secretKey);

  // Creates final document with HMAC
  JsonDocument finalDoc;
  finalDoc = tempDoc;  // Copies all values
  finalDoc["hmac"] = hmac;

  // Serialize final payload
  String payload;
  serializeJson(finalDoc, payload);

  return payload;
}

// Calculates HMAC
String calculateHMAC(const String& message, const uint8_t* key) {
  uint8_t hmacResult[32];

  mbedtls_md_context_t ctx;                       // Creates HMAC context
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;  // Specifies encryption type (SHA256)

  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1);
  mbedtls_md_hmac_starts(&ctx, key, 32);  // Loads 32 byte key into algorithm
  mbedtls_md_hmac_update(&ctx, (const uint8_t*)message.c_str(), message.length());

  mbedtls_md_hmac_finish(&ctx, hmacResult);  // Stores algorithm result into hmacResult
  mbedtls_md_free(&ctx);                     // Ends algorithm

  // Convert to hex string
  char hexBuffer[65];
  for (int i = 0; i < 32; i++) {
    sprintf(hexBuffer + (i * 2), "%02x", hmacResult[i]);  // 32-byte array ({0xF7, 0x1B, ...}) becomes 64-char hex string (f71b4a40...)
  }
  hexBuffer[64] = 0;

  return String(hexBuffer);
}

// Function to securely store the HMAC key
void storeHMACKey(const char* keyNamespace, const char* keyName, const uint8_t* key, size_t keyLength) {
  preferences.begin(keyNamespace, false);  // false = write

  // Stores key length first
  preferences.putUInt("key_len", keyLength);

  // Stores key data
  preferences.putBytes(keyName, key, keyLength);

  preferences.end();
}

// Function to retrieve the HMAC key
bool retrieveHMACKey(const char* keyNamespace, const char* keyName, uint8_t* output, size_t bufferSize) {
  preferences.begin(keyNamespace, true);  // true for read-only mode

  // First get the key length
  size_t keyLength = preferences.getUInt("key_len", 0);

  if (keyLength == 0 || keyLength > bufferSize) {
    preferences.end();
    return false;
  }

  // Get the actual key data
  size_t bytesRead = preferences.getBytes(keyName, output, bufferSize);

  preferences.end();

  return bytesRead == keyLength;
}

// Function to convert a string of hex characters to an array of bytes values (only works for 64 char hex strings)
// Returns true if conversion was made, and false if length of hex string wasn't 64
bool hexStringToBytes(const char* hexString, uint8_t* output) {
  if (!(strlen(hexString) == 64)) {
    return false;
  }
  for (size_t i = 0; i < 32; i++) {
    // Read 2 hex chars at a time
    char hexByte[3] = { hexString[i * 2], hexString[i * 2 + 1], '\0' };

    // Convert to byte
    output[i] = strtol(hexByte, NULL, 16);
  }
  return true;
}