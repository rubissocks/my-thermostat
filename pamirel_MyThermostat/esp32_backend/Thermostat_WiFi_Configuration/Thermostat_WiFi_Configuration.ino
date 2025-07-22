#include <WiFi.h>
#include <WebServer.h>
#include <EEPROM.h>
#include <WebSocketClient.h>

WebServer server(80); // Port 80 for HTTP

bool wifiConnected; // Keeps track of connection status

// Credentials for AP
String APname = "LCD Pamirel Termostat";
String APpassword = "password123";

unsigned long apShutdownTime = 0; // For the  AP shutdown delay
String fontStyle = "<style>body { font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif; margin: 20px; }</style>"; // Font used for HTML pages

// Function declarations
  void handleRoot();
  void handleScan();
  void handleConnect();
  void handleStatus();
  void handleForget();
  void startAP();
  void loadCredentials();
  void saveCredentials(String ssid, String pass);

// EEPROM settings
#define EEPROM_SIZE 64
String savedSSID = "";
String savedPass = "";

void setup() {
  EEPROM.begin(EEPROM_SIZE);
  
  // Try to load saved credentials
  loadCredentials();
  
  // If saved credentials are available, try to connect
  if (savedSSID.length() > 0) {

    WiFi.begin(savedSSID.c_str(), savedPass.c_str()); // Try to connect via EEPROM data
    
    delay(1000*10); // Gives 10 seconds for the connection to establish
  } 

  // Starts AP - if there are no saved credentials or connection fails, limits AP duration
  if (WiFi.status() != WL_CONNECTED) {
    startAP();
    wifiConnected=false;
  } else {
    startAP();
    apShutdownTime = millis() + 300000;  // Keeps AP up for 5 minutes
    wifiConnected=true;
  }


  // Setup server routes
  server.on("/", handleRoot); // The root page
  server.on("/scan", handleScan); // Displays all available SSIDs
  server.on("/connect", handleConnect); // Enables connecting to SSIDs
  server.on("/status", handleStatus); // Displays connection status
  server.on("/forget", handleForget); // Enables EEPROM to forget credentials

  server.begin();
}

void startAP() {
  // Sets IP address for the access point
  IPAddress local_IP(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);

  // Creates open access point
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(APname, APpassword);
}

void loadCredentials() {
  // Read credentials saved on EEPROM
  savedSSID = EEPROM.readString(0);
  savedPass = EEPROM.readString(32);
  savedSSID.trim();
  savedPass.trim();
}

void saveCredentials(String ssid, String pass) {
  // Save the credentials on the EEPROM
  EEPROM.writeString(0, ssid);
  EEPROM.writeString(32, pass);
  EEPROM.commit();
}

void handleRoot() {
  // HTML code for webpage
  String html = R"=====(
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style> 
      body { font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif; margin: 20px; }
      .network { padding: 10px; margin: 5px; background: #f0f0f0; border-radius: 5px; }
      button { padding: 8px 15px; background: #94d0f8; color: white; border: none; border-radius: 4px; }
      input { padding: 8px; margin: 5px 0; width: 100%; box-sizing: border-box; }
      
      .scanning { color: #000; padding: 10px;}
      .spinner { display: inline-block; animation: spin 1s linear infinite;}
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); }}

      .status-container {display: flex; align-items: center; gap: 0; margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;}
      .refresh-btn {background: none; border: none; font-size: 1.2em; cursor: pointer; padding: 0; margin: 0; line-height: 1; color: inherit;}
      .refresh-btn:hover {color: #94d0f8;}

      #connectionStatus {padding-right: 4px;}
    </style>
  </head>
  <body>
    <h1>Thermostat WiFi Configuration</h1>

    <h2> Connection status: </h2>
    <div class="status-container">
      <div id="connectionStatus">
      </div>
    <button onclick="refreshStatus()" class="refresh-btn">&#x21bb;</button>
    </div>
    <p><a href="/forget" style="color:rgb(255, 0, 0);">Forget Saved Network</a></p>

    <div id="networks"></div>

    <p><a href="trst.je.nas" style="color:#4382ac;"onclick="refreshNetworks();return false;">Rescan Networks</a></p>

    <form action="/connect" method="POST">
      <h2>Connect to Network</h2>
      <input type="text" name="ssid" placeholder="Network SSID" required>
      <input type="password" name="password" placeholder="Password">
      <button type="submit">Connect</button>
    </form>

    <script>

      fetch('/scan')
        .then(response => response.text())
        .then(data => {
          document.getElementById('networks').innerHTML = data;
        });
      

      function refreshNetworks() { // Refreshes the displayed scanned networks
      const networksDiv = document.getElementById('networks'); 
    
      const oldContent = networksDiv.innerHTML; // Saves current list of networks
      networksDiv.innerHTML = '<div class="scanning">Scanning... <span class="spinner">&#x231b;</span></div>'; // Adds loading animation

        fetch('/scan')
          .then(response => response.text())
          .then(data => {
            networksDiv.innerHTML = data; // Updates with new networks
          })
          .catch(error => {
            networksDiv.innerHTML = oldContent; // Restores old list if new list isn't available
            console.error("Scan failed:", error);
          });
      }

      function refreshStatus() {
        const statusDiv = document.getElementById('connectionStatus');
        statusDiv.innerHTML = '<span class="scanning">Checking...</span>'; // Plays animation
        
        fetch('/status') // Fetches connection status from ESP
          .then(response => response.text())
          .then(data => {
            statusDiv.innerHTML = data;
          });
      }  

      // Loads networks and conection status after the rest if the page has loaded
      window.onload = function() {
      refreshNetworks();
      refreshStatus();
      };
    </script>
  </body>
  </html>
    )=====";

  server.send(200, "text/html", html); // Sends the HTML to the server
}

void handleScan() {
  String networks = fontStyle;
  networks += "<h2>Available Networks:</h2>";

  int n = WiFi.scanNetworks(); // Checks number of available networks
  
  if (n == 0) {
    networks += "<p>No networks found</p>";
  } else {
    for (int i = 0; i < n; ++i) { // Displays data for each network
      networks += "<div class='network'>";
      networks += "<strong>" + WiFi.SSID(i) + "</strong> ("+ WiFi.RSSI(i) + " dBm) "; // Network name & signla strenght
      networks += WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? " Open " : " Secured "; // SSID security
      networks += "<button onclick=\"document.getElementsByName('ssid')[0].value='" + WiFi.SSID(i) + "'\">Select</button>"; // Selected network is inserted into SSID field
      networks += "</div>";
    }
  }
  server.send(200, "text/html", networks);
}

void handleConnect() {
  String ssid = server.arg("ssid"); // Reads form field "ssid"
  String password = server.arg("password"); // Reads form field "password"
  
  saveCredentials(ssid, password); // Saves credentials on EEPROM
  
  String message = fontStyle;
  message += "<h1>Connecting to " + ssid + "</h1>";
  message += "<p>Device will attempt to connect and reboot.</p>";
  message += "<p>Check WiFi LED or see <a href='/'>connection status</a>.</p>";
  
  server.send(200, "text/html", message);
  
  // Gives time for response to be sent
  delay(1000);
  
  // Restarts ESP to connect to new network
  ESP.restart();
}

void handleStatus() {
  // Displays connection status
  String status = fontStyle;
  
  if (WiFi.status() == WL_CONNECTED) {
    status += "Connected to <strong>" + WiFi.SSID() + "</strong>";
    status += " (" + String(WiFi.RSSI()) + " dBm)";
  } else {
    status = "Not connected";
  }
  server.send(200, "text/html", status);
}

void handleForget(){
  // Clear EEPROM credentials
  EEPROM.writeString(0, "");   // Clear SSID
  EEPROM.writeString(32, "");  // Clear password
  EEPROM.commit();

  String message = fontStyle;
  message += "<h1>WiFi Credentials Forgotten</h1>";
  message += "<p>The thermostat will reboot.</p>";
  message += "<p><a href='/'>Back to config.</a></p>";
  server.send(200, "text/html", message);
  
  delay(1000);
  ESP.restart();  // Reboots to apply changes
}

void loop() {
  server.handleClient();

  if (apShutdownTime > 0 && millis() > apShutdownTime) {
  WiFi.softAPdisconnect(true);  // Shut down AP after delay
  apShutdownTime = 0;
  }
}