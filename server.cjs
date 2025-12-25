const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const axios = require("axios");
const roomPins = [
  [1, 2, 3],  // Room 1: power, cost, monthly_bill
  [4, 5, 6],  // Room 2
  [7, 8, 9],  // Room 3
  [10,11,12], // Room 4
  [13,14,15]  // Room 5
];
const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "swetha@2005",
  database: "elect"
});

// Create table if not exists
db.query(`
  CREATE TABLE IF NOT EXISTS energy_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_no INT,
    power FLOAT,
    cost FLOAT,
    monthly_bill FLOAT,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

db.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_no INT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Fetch data from Blynk Cloud (update every 30 minutes)
const BLYNK_TOKEN = "57dI6p2oarR_GX5j9VNfOSQMkHO2vNmR"; // replace with your token
const BASE_URL = `https://blynk.cloud/external/api/get?token=${BLYNK_TOKEN}`;

async function fetchBlynkData() {
  for (let i = 0; i < roomPins.length; i++) {
    try {
      const [pPin, cPin, mPin] = roomPins[i];

      const power  = await axios.get(`${BASE_URL}&V${pPin}`);
      const cost   = await axios.get(`${BASE_URL}&V${cPin}`);
      const month  = await axios.get(`${BASE_URL}&V${mPin}`);

      console.log(`Room ${i+1} -> Power: ${power.data}, Cost: ${cost.data}, MonthBill: ${month.data}`);

      db.query(
        "INSERT INTO energy_logs (room_no, power, cost, monthly_bill, log_time) VALUES (?, ?, ?, ?, NOW())",
        [i+1, power.data, cost.data, month.data],
        (err) => {
          if (err) console.error(err);
          else console.log(`Saved room ${i+1}`);
        }
      );
    } catch (err) {
      console.error("Error fetching Blynk:", err.message);
    }
  }
}

// Run fetch every 30 minutes
setInterval(fetchBlynkData, 5000);
fetchBlynkData(); // run initially

// Routes

// User: fetch single room logs
app.get("/usage/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  db.query(
    "SELECT * FROM energy_logs WHERE room_no=? ORDER BY log_time DESC LIMIT 100",
    [roomId],
    (err, rows) => {
      if (err) return res.status(500).send(err);
      res.json(rows);
    }
  );
});

// Admin: fetch all rooms
app.get("/admin/usage", (req, res) => {
  db.query(
    "SELECT * FROM energy_logs ORDER BY log_time DESC",
    (err, rows) => {
      if (err) return res.status(500).send(err);
      res.json(rows);
    }
  );
});

// Admin: send message to a room
app.post("/admin/message", (req, res) => {
  const { room_no, message } = req.body;
  if (!room_no || !message) return res.status(400).json({ error: "Missing fields" });

  db.query(
    "INSERT INTO messages (room_no, message) VALUES (?, ?)",
    [room_no, message],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ success: true });
    }
  );
});

// User: get messages
app.get("/messages/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  db.query(
    "SELECT * FROM messages WHERE room_no=? ORDER BY id DESC",
    [roomId],
    (err, rows) => {
      if (err) return res.status(500).send(err);
      res.json(rows);
    }
  );
});

app.listen(5000, () => console.log("Server running on port 5000"));
