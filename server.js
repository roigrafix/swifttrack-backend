const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./logistics.db', (err) => {
  if (err) console.error(err.message);
  console.log('Connected to the SQLite database.');
});

// Create table and insert sample data
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS parcels (
    trackingNumber TEXT PRIMARY KEY,
    sender TEXT,
    receiver TEXT,
    status TEXT,
    estimatedDelivery TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tracking_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trackingNumber TEXT,
    date TEXT,
    location TEXT,
    activity TEXT,
    FOREIGN KEY(trackingNumber) REFERENCES parcels(trackingNumber)
  )`);

  // Insert a sample parcel if it doesn't exist
  const sampleTracking = 'STX987654321';
  db.get(`SELECT trackingNumber FROM parcels WHERE trackingNumber = ?`, [sampleTracking], (err, row) => {
    if (!row) {
      db.run(`INSERT INTO parcels (trackingNumber, sender, receiver, status, estimatedDelivery) 
              VALUES (?, 'TechStore Inc.', 'Alice Smith', 'In Transit', '2026-10-28')`, [sampleTracking]);
      
      const history = [
        ['2026-10-25 08:00', 'New York, NY', 'Package picked up by courier'],
        ['2026-10-25 14:30', 'New York, NY', 'Processed at sorting facility'],
        ['2026-10-26 02:15', 'Chicago, IL', 'Arrived at transit hub']
      ];
      
      history.forEach(event => {
        db.run(`INSERT INTO tracking_history (trackingNumber, date, location, activity) VALUES (?, ?, ?, ?)`, 
               [sampleTracking, event[0], event[1], event[2]]);
      });
    }
  });
});

// API Endpoint to track a parcel
app.get('/api/track/:id', (req, res) => {
  const trackingNumber = req.params.id.toUpperCase();

  db.get(`SELECT * FROM parcels WHERE trackingNumber = ?`, [trackingNumber], (err, parcel) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!parcel) return res.status(404).json({ error: 'Tracking number not found' });

    db.all(`SELECT * FROM tracking_history WHERE trackingNumber = ? ORDER BY id DESC`, [trackingNumber], (err, history) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        ...parcel,
        history
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});