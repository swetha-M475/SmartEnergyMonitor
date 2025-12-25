import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =======================
// MySQL Connection
// =======================
const db = await mysql.createPool({
  host: "localhost",   // change if MySQL runs elsewhere
  user: "root",        // your MySQL username
  password: "swetha@2005",        // your MySQL password
  database: "elect", // make sure you created this DB
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// =======================
// Create Tables (Run once at startup)
// =======================
await db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(100),
    role ENUM('admin','user') DEFAULT 'user'
  )
`);

await db.query(`
  CREATE TABLE IF NOT EXISTS room_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_no INT,
    date DATE,
    power FLOAT,
    cost FLOAT,
    monthlyBill FLOAT
  )
`);

await db.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// =======================
// Routes
// =======================

// ✅ 1. User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username=? AND password=?",
      [username, password]
    );
    if (rows.length > 0) {
      res.json({ success: true, role: rows[0].role, userId: rows[0].id });
    } else {
      res.status(401).json({ success: false, message: "Invalid login" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// ✅ 2. Insert Room Usage (ESP/Blynk pushes data here)
app.post("/usage", async (req, res) => {
  const { room_no, power, cost, monthlyBill } = req.body;
  try {
    await db.query(
      "INSERT INTO room_usage (room_no, date, power, cost, monthlyBill) VALUES (?, CURDATE(), ?, ?, ?)",
      [room_no, power, cost, monthlyBill]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB insert error" });
  }
});

// ✅ 3. Get Usage for Specific User Room
app.get("/usage/:room_no", async (req, res) => {
  const { room_no } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM room_usage WHERE room_no=? ORDER BY date DESC",
      [room_no]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB query error" });
  }
});

// ✅ 4. Admin – Get All Rooms Usage
app.get("/admin/usage", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM room_usage ORDER BY date DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB query error" });
  }
});

// ✅ 5. Admin – Post Message
app.post("/admin/message", async (req, res) => {
  const { message } = req.body;
  try {
    await db.query("INSERT INTO messages (message) VALUES (?)", [message]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "DB insert error" });
  }
});


app.get("/messages", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM messages ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB query error" });
  }
});


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
