// THIS CODE IS TO BE RUN ON A RASPI

// Importing libraries for reading directory and file paths
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const encryptedKeysPath = path.join(__dirname, 'secrets', 'encrypted-keys.enc');

// Importing KeyManager for decrypting keys and verifying HMAC
import { KeyManager, verifyHMAC } from './utils/key-manager.js';
import dotenv from 'dotenv'; dotenv.config();

const master_key = process.env.master_key;
const keyManager = new KeyManager(master_key, encryptedKeysPath);

// Importing libraries for initialising websocket server
import http from 'http';
import { WebSocketServer } from "ws";

// Inisialising http and websocket server
const server = http.createServer();

const wss = new WebSocketServer({
  server,
  path: '/socket/',
  maxPayload: 50000,  // 50KiB is set as the max size of a recieved message
  verifyClient: (info) => {
    const origin = info.origin;
    return (
      true
    )
  },
});

// Importing MySQL communication and JSON formating
import { recordData, getLatestData, getTable, deleteData } from './utils/mysql-comms-utils.js';
import { validateJSON, sanitizeJSON } from './utils/json-utils.js'
import { verifyLogin } from './utils/input-utils.js';

// Callback function on connection
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  
  if (origin === origin) {
    console.log('Frontend connected');
    ws.on('message', async (recievedMessage) => {
      const message = JSON.parse(recievedMessage);

      // Verify username and passowrd
      if (message.type === "login") {

        if (!verifyLogin(message.esp_id, message.password)) {
          console.log("Invalid username or password");
          ws.send(JSON.stringify({ // If verification fails, informs user on webpage
            type: "login",
            success: false,
            reason: "Invalid username or password"
          }))
        } else {
          // If verification is successful, sends latest information
          const data = await getLatestData(message.esp_id);
          ws.send(JSON.stringify({
            type: "login",
            success: true,
            latest_data: data
          }))
        }
      } else if (message.type === "history") {
        ws.send(await getTable(message.esp_id))
      }

    });
    // send mysql queries
    // forward esp requests (with hmac)

  } else if (origin == 'https://esp32.local') {
    console.log('ESP32 connected')

    ws.on('close', () => {
      console.log('ESP disconnected');
    });

    ws.on('message', async (message) => {
      const recievedData = JSON.parse(message); // Parsing the incoming message to JSON format
      const recievedHmac = recievedData.hmac; // Extracting HMAC

      // Checking if all required fields are present in the data
      if (!validateJSON) {
        console.error('Missing required fields in data or invalid data type recieved (should be JSON)');
        return ws.send(JSON.stringify({ status: 'error', message: 'Data fields missing' }));
      }

      const data = sanitizeJSON(recievedData); // Sanitizing the JSON data to only include required fields

      // Getting key for recieved device ID
      const secretKey = keyManager.getKeyForDevice(data.id);
      if (!secretKey) { // Checking if the secret key exists
        console.error('No key found for device:', `esp-${data.id}`, ', closing connection');
        return ws.close();
      }

      // Verifying HMAC
      if (!verifyHMAC(data, recievedHmac, secretKey)) {
        console.log('HMAC does not match, closing connection')
        return ws.close();
      }

      try {
        if (await recordData(data.id, data.status_on, data.temp, data.set_temp, data.heating, data.ventilator, data.set_ventilator, data.pressure, data.wifi_signal, data.rf_signal)) {
          console.log('Data recorded successfully');
          ws.send(JSON.stringify({ status: 'error', message: 'Data recorded successfully' }));
        }
        else {
          ws.send(JSON.stringify({ status: 'error', message: 'Failed to record data' }));
        }
      }
      catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({ status: 'error', message: 'Failed to process message' }));
      }
    });
  } else {
    console.log('Unknows origin client connected!')
    ws.terminate();
  };
});


// A server which displays some text on https://raspiwebsocket.duckdns.org/esp when websocket server is running 
server.on('request', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <body>
      <h1>WebSocket Server Running</h1>
      <p>Status: <span id="status" style="color: red">Disconnected</span></p>
      <script>
        const ws = new WebSocket('ws://localhost:300/socket/');
        ws.onopen = () => document.getElementById('status').innerText = 'Connected (WSS)';
        ws.onerror = () => document.getElementById('status').innerText = 'Error';
      </script>
    </body>
    </html>
  `);
});

server.listen(300, () => console.log('HTTP/WS server running on port 300'));