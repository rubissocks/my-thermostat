// Handles logins
function login() {
  const id = document.getElementById('esp_id').value.trim();
  const pass = document.getElementById('password').value;

  if (!id || !pass) {
    alert("Please enter ID and password");
    return;
  }

  // Initialising websocket communication with the url where its hosted
  ws = new WebSocket("ws://localhost:300/socket/"); //"wss://raspiwebsocket.duckdns.org/socket/"

  // When connection is established sends the credentials to check if they are valid
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: "login",
      esp_id: id,
      password: pass
    }));
  };

  ws.onmessage = (recievedMessage) => {
    const message = JSON.parse(recievedMessage.data);
    if (message.type === "login" && message.success) {
      const latestData = message.latest_data
      const state=(latestData.status_on === "1") ? "ON" : "OFF";
      
      if (state == "ON") {
        state += ", and it is "
        state += (latestData.heating) ? "heating" : "cooling"
      }
      document.getElementById('login_successful').innerHTML = `
      <div class="card">
        <h2>Login successful!</h2>
        <h3>Thermostat ${id} is currently ${state} </h3>
          <p>Current Temperature: ${latestData.temp} °C</p>
          <p>Set Temperature: ${latestData.set_temp} °C</p>
          <p>Pressure: ${latestData.pressure} °C</p>
          <p>Ventilator speed: ${latestData.ventilator} °C</p>
          <p>Set Ventilator speed: ${latestData.set_ventilator} °C</p>
          <p>At ${formatDate(latestData.time)}</p>
        <div class="actions">
          <button onclick="historyOptions()">Show History</button>
          <button onclick="setTemp()">Set Temperature</button>
        </div>
      </div>
      `;
    } else {
      document.getElementById('login_successful').innerHTML = `
      <div class="card">
        <h2>Login failed!</h2>
        <p>Double-check ID and password.</p>
      </div>
      `;}
  };

  ws.onerror = (err) => {
    console.error("WebSocket error", err);
    alert("Connection error");
  };
}

function historyOptions() {
  document.getElementById('history_options').innerHTML = `
      <div class="card">
        <button onclick="weekHistory()">Past Week</button>
        <p>description</p>
        <button onclick="monthHistory()">Past Month</button>
        <p>description</p>
        <button onclick="sixMonthHistory()">Past Six Months</button>
        <p>description</p>
        <button onclick="signalHistory()">Signal history</button>
        <p>description</p>
      </div>
      `;
}

function getSignalHistory() {
  const id = document.getElementById('esp_id').value.trim();
  ws = new WebSocket("ws://localhost:300/socket/"); //"wss://raspiwebsocket.duckdns.org/socket/"

  wsonopen = () => {
    ws.send(JSON.stringify({
      type: "history",
      esp_id: id
    }))
  }

  wsonmessage = (recievedMessage) => {
    const message = JSON.parse(recievedMessage);
    console.log
  }
}

// Formats MySQL timestamps into '{time} on {date}' strings
function formatDate(mysqlTimestamp) {
  const date = new Date(mysqlTimestamp);

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are 0-indexed
  const year = date.getFullYear();

  const formatted = `${hours}:${minutes}:${seconds} on ${day}. ${month}. ${year}`;
  return formatted;
}