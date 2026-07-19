const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'township.db');

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
    initializeDatabase();
  }
});

// Setup middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// New 2D Tile-Grid Coordinates starting state for a new town
const DEFAULT_STATE = {
  level: 1,
  xp: 0,
  xp_required: 100,
  coins: 200, // starting with a bit more coins to place a few items early
  barn: {
    capacity: 40,
    items: {
      wheat: 3,
      corn: 2,
      brick: 1,
      glass: 1,
      slab: 1
    }
  },
  // Crop plots placed on specific 2D coordinates on the grass grid
  plots: [
    { id: 1, x: 5, y: 9, planted: null, timeTotal: 0, timeLeft: 0 },
    { id: 2, x: 6, y: 9, planted: null, timeTotal: 0, timeLeft: 0 },
    { id: 3, x: 7, y: 9, planted: null, timeTotal: 0, timeLeft: 0 },
    { id: 4, x: 5, y: 10, planted: null, timeTotal: 0, timeLeft: 0 },
    { id: 5, x: 6, y: 10, planted: null, timeTotal: 0, timeLeft: 0 },
    { id: 6, x: 7, y: 10, planted: null, timeTotal: 0, timeLeft: 0 }
  ],
  // Grid placement for buildings (x, y are top-left cells; w, h are cell dimensions)
  buildings: [
    { id: "barn", type: "barn", name: "Barn", x: 8, y: 3, w: 2, h: 2, unlocked: true },
    { id: "helipad", type: "helipad", name: "Helipad", x: 5, y: 3, w: 2, h: 2, unlocked: true },
    { id: "cowshed", type: "cowshed", name: "Cowshed", x: 1, y: 5, w: 3, h: 3, unlocked: true, cows: [
      { id: 1, px: 0.3, py: 0.3, tx: 0.3, ty: 0.3, state: "idle", timeLeft: 0 },
      { id: 2, px: 0.7, py: 0.6, tx: 0.7, ty: 0.6, state: "idle", timeLeft: 0 }
    ] },
    { id: "bakery", type: "factory", name: "Bakery", factoryKey: "bakery", x: 11, y: 3, w: 2, h: 2, unlocked: true, cost: 0, queue: [], completed: [], maxQueue: 3 },
    { id: "feedMill", type: "factory", name: "Feed Mill", factoryKey: "feedMill", x: 14, y: 3, w: 2, h: 2, unlocked: true, cost: 0, queue: [], completed: [], maxQueue: 3 },
    { id: "dairy", type: "factory", name: "Dairy", factoryKey: "dairy", x: 11, y: 6, w: 2, h: 2, unlocked: false, cost: 150, queue: [], completed: [], maxQueue: 3 },
    { id: "sugarRefinery", type: "factory", name: "Sugar Refinery", factoryKey: "sugarRefinery", x: 14, y: 6, w: 2, h: 2, unlocked: false, cost: 300, queue: [], completed: [], maxQueue: 3 }
  ],
  trains: [
    {
      id: "express",
      name: "Express Cargo 🚅",
      state: "at_station",
      timeLeft: 0,
      timeTotal: 12,
      trackRow: 0,
      crates: [
        { id: 1, cargoNeeded: "butter", amountNeeded: 1, loaded: false },
        { id: 2, cargoNeeded: "sugar", amountNeeded: 1, loaded: false },
        { id: 3, cargoNeeded: "bread", amountNeeded: 2, loaded: false },
        { id: 4, cargoNeeded: "corn", amountNeeded: 3, loaded: false }
      ],
      rewards: null,
      animatedX: 10
    },
    {
      id: "local",
      name: "Local Freighter 🚂",
      state: "at_station",
      timeLeft: 0,
      timeTotal: 25,
      trackRow: 1,
      crates: [
        { id: 1, cargoNeeded: "wheat", amountNeeded: 3, loaded: false },
        { id: 2, cargoNeeded: "corn", amountNeeded: 2, loaded: false },
        { id: 3, cargoNeeded: "bread", amountNeeded: 1, loaded: false }
      ],
      rewards: null,
      animatedX: 10
    },
    {
      id: "metro",
      name: "Metro Materials 🚇",
      state: "at_station",
      timeLeft: 0,
      timeTotal: 45,
      trackRow: 2,
      crates: [
        { id: 1, cargoNeeded: "carrot", amountNeeded: 4, loaded: false },
        { id: 2, cargoNeeded: "sugarcane", amountNeeded: 4, loaded: false },
        { id: 3, cargoNeeded: "cornMeal", amountNeeded: 2, loaded: false },
        { id: 4, cargoNeeded: "cake", amountNeeded: 1, loaded: false },
        { id: 5, cargoNeeded: "cheese", amountNeeded: 1, loaded: false }
      ],
      rewards: null,
      animatedX: 10
    }
  ],
  helicopter: {
    state: "at_pad", // "at_pad", "flying_out", "flying_in"
    timeLeft: 0,
    orders: [
      { id: 1, title: "Farmer Jack", request: { wheat: 3 }, reward: { coins: 15, xp: 8 } },
      { id: 2, title: "Baker Marie", request: { bread: 2 }, reward: { coins: 40, xp: 20 } },
      { id: 3, title: "Cowboy Billy", request: { corn: 4 }, reward: { coins: 25, xp: 12 } }
    ],
    activeOrder: null
  },
  ships: [
    {
      id: "cargo",
      name: "S.S. Odyssey 🚢",
      state: "locked",
      timeLeft: 0,
      timeTotal: 30,
      dockX: 4,
      crates: [
        { id: 1, cargoNeeded: "wheat", amountNeeded: 5, loaded: false },
        { id: 2, cargoNeeded: "bread", amountNeeded: 3, loaded: false },
        { id: 3, cargoNeeded: "sugar", amountNeeded: 2, loaded: false },
        { id: 4, cargoNeeded: "milk", amountNeeded: 3, loaded: false }
      ],
      rewards: null,
      animatedX: -10
    },
    {
      id: "yacht",
      name: "Wave Rider 🛥️",
      state: "locked",
      timeLeft: 0,
      timeTotal: 40,
      dockX: 12,
      crates: [
        { id: 1, cargoNeeded: "butter", amountNeeded: 2, loaded: false },
        { id: 2, cargoNeeded: "syrup", amountNeeded: 1, loaded: false },
        { id: 3, cargoNeeded: "cake", amountNeeded: 1, loaded: false }
      ],
      rewards: null,
      animatedX: -10
    }
  ]
};

function initializeDatabase() {
  db.serialize(() => {
    // Create game state table
    db.run(`CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY,
      state_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating game_state table:', err.message);
    });

    // Create milestones/logs table
    db.run(`CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating milestones table:', err.message);
    });
  });
}

// REST API Endpoints

// GET: Load game state
app.get('/api/state', (req, res) => {
  db.get('SELECT state_json FROM game_state WHERE id = 1', [], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to retrieve state' });
    }
    
    if (!row) {
      // Seed default state if not exists
      const stateStr = JSON.stringify(DEFAULT_STATE);
      db.run('INSERT INTO game_state (id, state_json) VALUES (1, ?)', [stateStr], (insertErr) => {
        if (insertErr) {
          console.error(insertErr.message);
          return res.status(500).json({ error: 'Failed to initialize default state' });
        }
        console.log('Seeded database with default 2D grid state');
        return res.json(DEFAULT_STATE);
      });
    } else {
      try {
        const state = JSON.parse(row.state_json);
        return res.json(state);
      } catch (parseErr) {
        console.error('JSON Parse error on loaded state:', parseErr);
        return res.status(500).json({ error: 'Database state corrupted' });
      }
    }
  });
});

// POST: Save game state
app.post('/api/state', (req, res) => {
  const stateStr = JSON.stringify(req.body);
  db.run(
    'UPDATE game_state SET state_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    [stateStr],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to save state' });
      }
      return res.json({ success: true });
    }
  );
});

// POST: Reset game state
app.post('/api/reset', (req, res) => {
  db.serialize(() => {
    const stateStr = JSON.stringify(DEFAULT_STATE);
    db.run('UPDATE game_state SET state_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [stateStr]);
    db.run('DELETE FROM milestones');
    db.run('INSERT INTO milestones (message) VALUES (?)', ['Founded a brand new 2D visual Township!']);
    
    console.log('Game state and milestones reset.');
    return res.json(DEFAULT_STATE);
  });
});

// GET: Retrieve milestones log
app.get('/api/milestones', (req, res) => {
  db.all('SELECT message, timestamp FROM milestones ORDER BY id DESC LIMIT 50', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to retrieve milestones' });
    }
    return res.json(rows);
  });
});

// POST: Log a new milestone
app.post('/api/milestones', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  db.run('INSERT INTO milestones (message) VALUES (?)', [message], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to log milestone' });
    }
    return res.json({ success: true, id: this.lastID });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`Township Simulator backend is running!`);
  console.log(`Open your browser at http://localhost:${PORT}`);
  console.log(`===============================================`);
});
