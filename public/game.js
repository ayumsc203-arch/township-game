// ==========================================================================
// CONFIGURATIONS & GAME PARAMETERS
// ==========================================================================
const MAP_SIZE = 20; // 20x20 Grid
const TILE_SIZE = 48; // 48px square tiles

const CROP_RECIPES = {
  wheat: { emoji: "🌾", time: 10, xp: 1, name: "Wheat", color: "#fbc02d" },
  corn: { emoji: "🌽", time: 20, xp: 2, name: "Corn", color: "#fbc02d" },
  carrot: { emoji: "🥕", time: 40, xp: 4, name: "Carrot", color: "#f57c00" },
  sugarcane: { emoji: "🍭", time: 60, xp: 6, name: "Sugarcane", color: "#4caf50" }
};

const FACTORY_RECIPES = {
  feedMill: {
    cowFeed: { name: "Cow Feed", emoji: "🐮🌾", cost: { wheat: 2 }, time: 10, xp: 2 },
    cornMeal: { name: "Corn Meal", emoji: "🌽🥣", cost: { corn: 2 }, time: 20, xp: 4 }
  },
  bakery: {
    bread: { name: "Bread", emoji: "🍞", cost: { wheat: 2 }, time: 15, xp: 3 },
    cake: { name: "Cake", emoji: "🍰", cost: { wheat: 2, sugar: 1 }, time: 45, xp: 9 }
  },
  dairy: {
    butter: { name: "Butter", emoji: "🧈", cost: { cowFeed: 1 }, time: 30, xp: 6 },
    cheese: { name: "Cheese", emoji: "🧀", cost: { cornMeal: 1 }, time: 40, xp: 8 }
  },
  sugarRefinery: {
    sugar: { name: "Sugar", emoji: "🍬", cost: { sugarcane: 2 }, time: 25, xp: 5 },
    syrup: { name: "Syrup", emoji: "🍯", cost: { sugarcane: 3 }, time: 50, xp: 10 }
  }
};

const ITEM_EMOJIS = {
  wheat: "🌾", corn: "🌽", carrot: "🥕", sugarcane: "🍭",
  cowFeed: "🐮🌾", cornMeal: "🌽🥣", bread: "🍞", cake: "🍰",
  butter: "🧈", cheese: "🧀", sugar: "🍬", syrup: "🍯",
  brick: "🧱", glass: "🥛", slab: "🪨", milk: "🥛"
};

// Procedural Audio Synthesizer Class
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playPlant() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    // Noise-like rustling sound for seeds planting
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playUpgrade() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    
    // Play a happy arpeggio chord
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  playTrainWhistle() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    
    const now = this.ctx.currentTime;
    const freqs = [587.33, 622.25]; // detuned train chime chord
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(now + 0.7);
    });
  }
}

const synth = new SoundSynth();

// ==========================================================================
// RENDER & CAMERAS STATE variables
// ==========================================================================
let canvas, ctx;
let camera = { x: 50, y: 50, scale: 1.0, dragStart: null, initialCam: null };
let state = null;
let activeTool = "select"; // select, sickle, seed_wheat, seed_corn, seed_carrot, feed_cow
let shopOpen = false;
let selectedShopItem = null;
let placingBuilding = null; // Building layout structure when placing

// Real-time animation coordinates
let animatedTrainX = 10;
let animatedHelicopter = { x: 0, y: 0, angle: 0, scale: 1.0 };
let helicopterAnim = { progress: 0, lastState: "at_pad" }; // Smooth tracking
let particleEngine = { particles: [], floatingTexts: [] };
let factoryMenuOpenKey = null;

// ==========================================================================
// CORE INITIALIZERS
// ==========================================================================
window.onload = async () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  // Resize handler
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Load backend save
  await loadGame();
  
  setupListeners();
  
  // Start drawing and server ticks
  requestAnimationFrame(drawLoop);
  setInterval(gameTick, 1000);
  setInterval(() => saveGame(true), 10000); // Autosave 10s
};

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}

// ==========================================================================
// LISTENERS & MOUSE INPUTS
// ==========================================================================
function setupListeners() {
  // Toolbar buttons click
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const toolBtn = e.currentTarget;
      if (toolBtn.id === 'shop-btn') return; // handled separately
      
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      toolBtn.classList.add('active');
      activeTool = toolBtn.getAttribute('data-tool');
      placingBuilding = null; // cancel build preview
    });
  });

  // Sound toggle click
  document.getElementById('sound-toggle-btn').addEventListener('click', (e) => {
    synth.init();
    synth.enabled = !synth.enabled;
    e.currentTarget.innerText = synth.enabled ? "🔊 Sound On" : "🔇 Muted";
    synth.playPop();
  });

  // Mouse drag camera or tools swipes
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
  
  // Wheel zoom
  canvas.addEventListener('wheel', handleWheel);
}

// Convert screen (client) pixel coordinate to world tile coordinate
function screenToWorld(sx, sy) {
  const wx = (sx - camera.x) / (TILE_SIZE * camera.scale);
  const wy = (sy - camera.y) / (TILE_SIZE * camera.scale);
  return { x: wx, y: wy, tx: Math.floor(wx), ty: Math.floor(wy) };
}

let isSwiping = false;

function handleMouseDown(e) {
  synth.init();
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const world = screenToWorld(mouseX, mouseY);

  if (activeTool !== "select") {
    // Swipe farming tools
    isSwiping = true;
    applySwipeTool(world.tx, world.ty);
  } else if (placingBuilding) {
    // Placement mode: Place building
    placeShopItem(world.tx, world.ty);
  } else {
    // Select mode: check clicks or pan camera
    const clickedBuilding = findBuildingAt(world.tx, world.ty);
    const clickedPlot = findPlotAt(world.tx, world.ty);

    if (clickedBuilding) {
      handleBuildingClick(clickedBuilding);
    } else if (clickedPlot) {
      // Swipe/click details
      if (clickedPlot.planted && clickedPlot.timeLeft === 0) {
        harvestPlot(clickedPlot.id, mouseX, mouseY);
      }
    } else if (world.ty >= 0 && world.ty <= 2 && world.tx >= 0 && world.tx < MAP_SIZE) {
      // Clicked on Tracks/Train!
      const clickedTrackId = world.ty === 0 ? "express" : world.ty === 1 ? "local" : "metro";
      openTrainModal(clickedTrackId);
    } else {
      // Pan camera drag start
      camera.dragStart = { x: e.clientX, y: e.clientY };
      camera.initialCam = { x: camera.x, y: camera.y };
    }
  }
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const world = screenToWorld(mouseX, mouseY);

  if (isSwiping && activeTool !== "select") {
    applySwipeTool(world.tx, world.ty, mouseX, mouseY);
  } else if (camera.dragStart) {
    const dx = e.clientX - camera.dragStart.x;
    const dy = e.clientY - camera.dragStart.y;
    camera.x = camera.initialCam.x + dx;
    camera.y = camera.initialCam.y + dy;
  }

  // Update building place preview position
  if (placingBuilding) {
    placingBuilding.x = world.tx;
    placingBuilding.y = world.ty;
  }
}

function handleMouseUp() {
  camera.dragStart = null;
  isSwiping = false;
}

function handleWheel(e) {
  e.preventDefault();
  const zoomFactor = 1.1;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Zoom center calculation
  const worldMouse = screenToWorld(mouseX, mouseY);

  if (e.deltaY < 0) {
    camera.scale = Math.min(2.5, camera.scale * zoomFactor);
  } else {
    camera.scale = Math.max(0.5, camera.scale / zoomFactor);
  }

  camera.x = mouseX - worldMouse.x * TILE_SIZE * camera.scale;
  camera.y = mouseY - worldMouse.y * TILE_SIZE * camera.scale;
}

// Swipe tool logic (sweeping crops, planting, feeding cows)
function applySwipeTool(tx, ty, sx, sy) {
  const plot = findPlotAt(tx, ty);
  
  if (plot) {
    if (activeTool === "sickle" && plot.planted && plot.timeLeft === 0) {
      harvestPlot(plot.id, sx, sy);
    } else if (activeTool.startsWith("seed_") && !plot.planted) {
      const seedType = activeTool.replace("seed_", "");
      plantPlot(plot.id, seedType);
    }
  }

  // Swipe feed cows pasture
  const b = findBuildingAt(tx, ty);
  if (b && b.type === "cowshed" && activeTool === "feed_cow") {
    feedCows(b);
  }
}

// Finder functions
function findBuildingAt(tx, ty) {
  if (!state) return null;
  return state.buildings.find(b => 
    b.unlocked && tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h
  );
}

function findPlotAt(tx, ty) {
  if (!state) return null;
  return state.plots.find(p => p.x === tx && p.y === ty);
}

// ==========================================================================
// API REST SYNCHRONIZERS
// ==========================================================================
async function loadGame() {
  try {
    const res = await fetch('/api/state');
    state = await res.json();
    
    // Auto-heal/reset database if old state structure from Part 1 is detected
    if (!state || !state.buildings || !state.plots || (state.plots.length > 0 && !state.plots[0].hasOwnProperty('x'))) {
      console.warn('Obsolete save format detected in SQLite database. Performing automatic migration reset...');
      const resetRes = await fetch('/api/reset', { method: 'POST' });
      state = await resetRes.json();
    }
    
    // Auto-heal/migrate database if old train state is detected
    if (state && !state.trains) {
      console.warn('Migrating train state to new multi-trains system...');
      state.trains = [
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
      ];
      if (state.train) delete state.train;
      await saveGame(true);
    }
    
    console.log('2D Grid State loaded:', state);
    renderHUD();
    renderBarn();
    renderShopItems();
  } catch (err) {
    console.error(err);
  }
}

async function saveGame(silent = true) {
  if (!state) return;
  try {
    if (!silent) document.getElementById('save-indicator').classList.add('active');
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!silent) {
      setTimeout(() => document.getElementById('save-indicator').classList.remove('active'), 1000);
    }
  } catch (err) {
    console.error(err);
  }
}

async function resetGame() {
  if (!confirm("Clear database state? Your visual town map coordinates will reset.")) return;
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    state = await res.json();
    placingBuilding = null;
    synth.playUpgrade();
    renderAll();
  } catch (err) {
    console.error(err);
  }
}

// ==========================================================================
// REAL-TIME ENGINE CLOCK & SIMULATIONS
// ==========================================================================
function gameTick() {
  if (!state) return;

  // 1. Growth countdowns
  state.plots.forEach(plot => {
    if (plot.planted && plot.timeLeft > 0) plot.timeLeft--;
  });

  // 2. Factory production countdowns
  state.buildings.forEach(b => {
    if (b.type === "factory" && b.queue.length > 0) {
      const active = b.queue[0];
      if (!active.startTime) {
        active.startTime = Date.now();
        active.timeLeft = active.duration;
      }
      if (active.timeLeft > 0) {
        active.timeLeft--;
      } else {
        // Complete
        b.queue.shift();
        b.completed.push(active.item);
      }
    }

    // 3. Cow Milk countdowns
    if (b.type === "cowshed") {
      b.cows.forEach(cow => {
        if (cow.state === "eating") {
          if (cow.timeLeft > 0) {
            cow.timeLeft--;
          } else {
            cow.state = "milky"; // milk ready
          }
        }
      });
    }
  });

  // 4. Train logistics ticking
  if (state.trains) {
    state.trains.forEach(t => {
      if (t.state === "traveling") {
        if (t.timeLeft > 0) {
          t.timeLeft--;
        } else {
          t.state = "returned";
          t.rewards = rollTrainRewardsFor(t.id);
          synth.playTrainWhistle();
        }
      }
    });
  }

  // 5. Helicopter return ticking
  if (state.helicopter.state === "flying_out") {
    if (state.helicopter.timeLeft > 0) {
      state.helicopter.timeLeft--;
    } else {
      state.helicopter.state = "flying_in";
      state.helicopter.timeLeft = 3;
    }
  } else if (state.helicopter.state === "flying_in") {
    if (state.helicopter.timeLeft > 0) {
      state.helicopter.timeLeft--;
    } else {
      state.helicopter.state = "at_pad";
      state.helicopter.activeOrder = null;
    }
  }

  // Helipad order cooling down
  state.helicopter.orders.forEach((o, i) => {
    if (o.cooldown !== undefined && o.cooldown > 0) {
      o.cooldown--;
      if (o.cooldown === 0) {
        state.helicopter.orders[i] = generateRandomOrder();
      }
    }
  });

  // Keep DOM panels updated
  renderHUD();
  updateFactoryModalUI();
  updateHelipadModalUI();
  updateTrainModalUI();
}

// Generate random helicopter order appropriate for player level
function generateRandomOrder() {
  const unlockedItems = ["wheat"];
  if (state.level >= 1) unlockedItems.push("corn", "bread", "cowFeed");
  if (state.level >= 2) unlockedItems.push("carrot", "butter", "cheese", "cornMeal");
  
  const request = {};
  const itemCount = Math.min(2, Math.floor(Math.random() * 2) + 1);

  for (let i = 0; i < itemCount; i++) {
    const randomItem = unlockedItems[Math.floor(Math.random() * unlockedItems.length)];
    const maxQty = randomItem === "wheat" ? 4 : randomItem === "corn" ? 3 : 2;
    request[randomItem] = Math.floor(Math.random() * maxQty) + 1;
  }

  let coins = 0;
  let xp = 0;
  for (const [item, qty] of Object.entries(request)) {
    const stats = getItemValue(item);
    coins += stats.coins * qty;
    xp += stats.xp * qty;
  }

  return {
    id: Date.now() + Math.floor(Math.random() * 100),
    title: CITIZEN_NAMES[Math.floor(Math.random() * CITIZEN_NAMES.length)],
    request,
    reward: { coins: Math.round(coins * 1.1), xp: Math.round(xp * 1.1) }
  };
}

const CITIZEN_NAMES = ["Farmer Jack", "Mayor Thomas", "Baker Marie", "Cowboy Billy", "Dr. Emma"];

function getItemValue(item) {
  const values = {
    wheat: { coins: 3, xp: 2 },
    corn: { coins: 6, xp: 4 },
    carrot: { coins: 12, xp: 8 },
    cowFeed: { coins: 8, xp: 5 },
    cornMeal: { coins: 15, xp: 10 },
    bread: { coins: 12, xp: 8 },
    butter: { coins: 20, xp: 12 },
    cheese: { coins: 30, xp: 18 }
  };
  return values[item] || { coins: 5, xp: 5 };
}

function rollTrainRewards() {
  const materials = ["brick", "glass", "slab"];
  const rewards = {};
  const qty = Math.floor(Math.random() * 2) + 2; // 2 or 3 items
  for (let i = 0; i < qty; i++) {
    const mat = materials[Math.floor(Math.random() * materials.length)];
    rewards[mat] = (rewards[mat] || 0) + 1;
  }
  return rewards;
}

// ==========================================================================
// FRONTEND INTERFACES & DRAWING ENGINE
// ==========================================================================
function renderAll() {
  renderHUD();
  renderBarn();
  renderShopItems();
}

function renderHUD() {
  if (!state) return;
  document.getElementById('hud-level').innerText = state.level;
  document.getElementById('hud-coins').innerText = state.coins;
  
  let currentInventoryCount = 0;
  for (const qty of Object.values(state.barn.items)) {
    currentInventoryCount += qty;
  }
  document.getElementById('hud-barn-capacity').innerText = `${currentInventoryCount}/${state.barn.capacity}`;

  const xpPercent = Math.min(100, (state.xp / state.xp_required) * 100);
  document.getElementById('hud-xp-bar').style.width = `${xpPercent}%`;
  document.getElementById('hud-xp-text').innerText = `${state.xp}/${state.xp_required} XP`;
}

// 60FPS Draw Loop
function drawLoop(time) {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);

  // 1. Draw Map Tiles
  drawGrassGrid();
  drawTracks();

  // 2. Draw Crop Fields
  drawCrops(time);

  // 3. Draw placed buildings
  drawBuildings(time);

  // 4. Draw preview building follows mouse coordinates
  if (placingBuilding) {
    drawPlacementPreview();
  }

  // 5. Draw flying trains and helicopter vectors
  drawTrains(time);
  drawHelicopterOnCanvas(time);

  ctx.restore();

  // Render flying particles in screen coordinates overlay
  drawParticles(time);

  requestAnimationFrame(drawLoop);
}

// Alternating checkered grass tiles
function drawGrassGrid() {
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.04)";

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      // checker colors
      ctx.fillStyle = (x + y) % 2 === 0 ? "#7cb342" : "#8bc34a"; // cozy green tones
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

// Draw 3 Railway lines stacked vertically on rows 0, 1, and 2
function drawTracks() {
  for (let row = 0; row < 3; row++) {
    const ry = row * TILE_SIZE + 24;
    ctx.save();
    
    // Wooden Ties
    ctx.fillStyle = "#5d4037";
    for (let x = 0; x < MAP_SIZE * TILE_SIZE; x += 24) {
      ctx.fillRect(x, ry - 8, 8, 16);
    }

    // Iron rails
    ctx.strokeStyle = "#78909c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, ry - 4);
    ctx.lineTo(MAP_SIZE * TILE_SIZE, ry - 4);
    ctx.moveTo(0, ry + 4);
    ctx.lineTo(MAP_SIZE * TILE_SIZE, ry + 4);
    ctx.stroke();

    ctx.restore();
  }
}

// Drawing Crop Plots
function drawCrops(time) {
  if (!state) return;
  
  state.plots.forEach(plot => {
    ctx.save();
    
    // Soil
    ctx.fillStyle = "#8d6e63";
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2.5;
    ctx.fillRect(plot.x * TILE_SIZE + 3, plot.y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    ctx.strokeRect(plot.x * TILE_SIZE + 3, plot.y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);

    if (plot.planted) {
      const recipe = CROP_RECIPES[plot.planted];
      const px = plot.x * TILE_SIZE + TILE_SIZE / 2;
      const py = plot.y * TILE_SIZE + TILE_SIZE - 6;

      const pct = (plot.timeTotal - plot.timeLeft) / plot.timeTotal;

      if (plot.timeLeft > 0) {
        // Growth stages sprout and green stem
        ctx.fillStyle = "#4caf50";
        if (pct < 0.5) {
          // Sprout
          ctx.beginPath();
          ctx.arc(px, py, 6 * pct + 2, 0, Math.PI, true);
          ctx.fill();
        } else {
          // Stalk growing taller
          ctx.fillRect(px - 3, py - 20 * pct, 6, 20 * pct);
          // Leaves
          ctx.beginPath();
          ctx.ellipse(px - 6, py - 15 * pct, 4, 2, -Math.PI/6, 0, Math.PI*2);
          ctx.ellipse(px + 6, py - 18 * pct, 4, 2, Math.PI/6, 0, Math.PI*2);
          ctx.fill();
        }
      } else {
        // Ripe crop: Draw unique sways
        ctx.save();
        ctx.translate(px, py);
        
        const sway = Math.sin(time / 200) * 0.08;
        ctx.rotate(sway);

        if (plot.planted === "wheat") {
          // Golden Wheat
          ctx.fillStyle = "#ffca28";
          ctx.strokeStyle = "#ffa000";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-8, -18, -12, -30);
          ctx.moveTo(0, 0); ctx.quadraticCurveTo(0, -22, 0, -34);
          ctx.moveTo(6, 0); ctx.quadraticCurveTo(8, -18, 12, -30);
          ctx.stroke();
          
          // Wheat heads
          ctx.beginPath();
          ctx.arc(-12, -30, 4, 0, Math.PI*2);
          ctx.arc(0, -34, 4, 0, Math.PI*2);
          ctx.arc(12, -30, 4, 0, Math.PI*2);
          ctx.fill();
        } else if (plot.planted === "corn") {
          // Green stalks with yellow cobs
          ctx.fillStyle = "#4caf50";
          ctx.fillRect(-3, -32, 6, 32); // stalk
          
          // Leaves
          ctx.beginPath();
          ctx.ellipse(-8, -16, 8, 3, -Math.PI/6, 0, Math.PI*2);
          ctx.ellipse(8, -20, 8, 3, Math.PI/6, 0, Math.PI*2);
          ctx.fill();
          
          // Yellow cobs
          ctx.fillStyle = "#ffd54f";
          ctx.strokeStyle = "#ffb300";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(-6, -14, 5, 2.5, -Math.PI/3, 0, Math.PI*2);
          ctx.ellipse(6, -18, 5, 2.5, Math.PI/3, 0, Math.PI*2);
          ctx.fill();
          ctx.stroke();
        } else if (plot.planted === "carrot") {
          // Restore translation to draw relative to soil surface
          ctx.restore();
          ctx.save();
          
          // Orange body peeking out
          ctx.fillStyle = "#ff9800";
          ctx.strokeStyle = "#e65100";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(plot.x * TILE_SIZE + TILE_SIZE/2, plot.y * TILE_SIZE + TILE_SIZE - 4, 12, Math.PI, 0);
          ctx.fill();
          ctx.stroke();
          
          // Green leaves swaying
          ctx.translate(plot.x * TILE_SIZE + TILE_SIZE/2, plot.y * TILE_SIZE + TILE_SIZE - 12);
          ctx.rotate(sway);
          ctx.fillStyle = "#4caf50";
          ctx.beginPath();
          ctx.ellipse(-6, -10, 4, 8, -Math.PI/6, 0, Math.PI*2);
          ctx.ellipse(0, -14, 4, 10, 0, 0, Math.PI*2);
          ctx.ellipse(6, -10, 4, 8, Math.PI/6, 0, Math.PI*2);
          ctx.fill();
        } else if (plot.planted === "sugarcane") {
          // Segmented tall sugarcane stalks
          ctx.fillStyle = "#81c784";
          ctx.strokeStyle = "#2e7d32";
          ctx.lineWidth = 1.5;
          
          ctx.fillRect(-8, -36, 5, 36);
          ctx.fillRect(3, -36, 5, 36);
          
          // Node bands
          ctx.beginPath();
          ctx.moveTo(-8, -12); ctx.lineTo(-3, -12);
          ctx.moveTo(-8, -24); ctx.lineTo(-3, -24);
          ctx.moveTo(3, -10); ctx.lineTo(8, -10);
          ctx.moveTo(3, -22); ctx.lineTo(8, -22);
          ctx.stroke();
          
          // Leaves splay
          ctx.fillStyle = "#4caf50";
          ctx.beginPath();
          ctx.ellipse(-12, -26, 6, 2, -Math.PI/4, 0, Math.PI*2);
          ctx.ellipse(10, -22, 6, 2, Math.PI/4, 0, Math.PI*2);
          ctx.fill();
        }
        
        ctx.restore();
      }
    }
    
    ctx.restore();
  });
}

// Drawing Placed Buildings with identifiable structures and name tags
function drawBuildings(time) {
  if (!state) return;

  state.buildings.forEach(b => {
    if (!b.unlocked) return;

    ctx.save();
    ctx.translate(b.x * TILE_SIZE, b.y * TILE_SIZE);

    const bx = b.w * TILE_SIZE / 2;
    const by = b.h * TILE_SIZE / 2;

    if (b.type === "barn") {
      // Red Barn
      ctx.fillStyle = "#ef5350";
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5;
      ctx.fillRect(4, 4, b.w * TILE_SIZE - 8, b.h * TILE_SIZE - 8);
      ctx.strokeRect(4, 4, b.w * TILE_SIZE - 8, b.h * TILE_SIZE - 8);

      // Roof
      ctx.fillStyle = "#3e2723";
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(b.w * TILE_SIZE / 2, -15);
      ctx.lineTo(b.w * TILE_SIZE, 6);
      ctx.closePath();
      ctx.fill();

      // Barn Door with X
      ctx.fillStyle = "#efebe9";
      ctx.fillRect(bx - 12, b.h * TILE_SIZE - 28, 24, 24);
      ctx.strokeStyle = "#ef5350";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 12, b.h * TILE_SIZE - 28);
      ctx.lineTo(bx + 12, b.h * TILE_SIZE - 4);
      ctx.moveTo(bx + 12, b.h * TILE_SIZE - 28);
      ctx.lineTo(bx - 12, b.h * TILE_SIZE - 4);
      ctx.stroke();

      // Silo Container next to Barn
      ctx.fillStyle = "#cfd8dc";
      ctx.strokeStyle = "#90a4ae";
      ctx.lineWidth = 2;
      ctx.fillRect(b.w * TILE_SIZE - 12, 16, 12, b.h * TILE_SIZE - 16);
      ctx.strokeRect(b.w * TILE_SIZE - 12, 16, 12, b.h * TILE_SIZE - 16);
      ctx.fillStyle = "#78909c";
      ctx.beginPath();
      ctx.arc(b.w * TILE_SIZE - 6, 16, 6, Math.PI, 0);
      ctx.fill();

    } else if (b.type === "helipad") {
      // Helipad concrete circle with hazard stripes
      ctx.fillStyle = "#78909c";
      ctx.strokeStyle = "#ffd54f";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bx, by, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // H text
      ctx.fillStyle = "white";
      ctx.font = "bold 26px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("H", bx, by);

      // Antenna control tower next to it
      ctx.fillStyle = "#455a64";
      ctx.fillRect(6, 6, 14, 26);
      ctx.fillStyle = "#90a4ae";
      ctx.beginPath();
      ctx.arc(13, 6, 6, 0, Math.PI*2);
      ctx.fill();
      // needle
      ctx.strokeStyle = "#cfd8dc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(13, -10);
      ctx.stroke();

    } else if (b.type === "cowshed") {
      // Fence yard
      ctx.fillStyle = "#a1887f";
      ctx.fillRect(2, 2, b.w * TILE_SIZE - 4, b.h * TILE_SIZE - 4);
      
      // Inside pasture
      ctx.fillStyle = "#9ccc65";
      ctx.fillRect(8, 8, b.w * TILE_SIZE - 16, b.h * TILE_SIZE - 16);

      // Small red wooden shed with yellow hay roof
      ctx.fillStyle = "#c62828";
      ctx.fillRect(8, 8, 36, 36);
      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath();
      ctx.moveTo(4, 8);
      ctx.lineTo(26, -2);
      ctx.lineTo(48, 8);
      ctx.fill();

      // Wooden Sign Board
      ctx.fillStyle = "#8d6e63";
      ctx.fillRect(b.w * TILE_SIZE - 28, 8, 20, 10);
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(b.w * TILE_SIZE - 20, 18, 4, 10);
      ctx.fillStyle = "white";
      ctx.font = "8px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🐮", b.w * TILE_SIZE - 18, 13);

      // Update and Draw Cows in yard
      drawCows(b, time);

    } else if (b.type === "factory") {
      // Factory base structure (Concrete colors)
      ctx.fillStyle = b.factoryKey === "bakery" ? "#d84315" : b.factoryKey === "feedMill" ? "#8d6e63" : b.factoryKey === "dairy" ? "#e0f7fa" : "#eceff1";
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 2.5;
      ctx.fillRect(6, 6, b.w * TILE_SIZE - 12, b.h * TILE_SIZE - 12);
      ctx.strokeRect(6, 6, b.w * TILE_SIZE - 12, b.h * TILE_SIZE - 12);

      // Awning stripes
      ctx.fillStyle = b.factoryKey === "bakery" ? "#ef5350" : b.factoryKey === "feedMill" ? "#ffb300" : b.factoryKey === "dairy" ? "#0288d1" : "#7b1fa2";
      ctx.fillRect(8, 6, b.w * TILE_SIZE - 16, 12);
      ctx.fillStyle = "#ffffff";
      for (let sx = 14; sx < b.w * TILE_SIZE - 12; sx += 16) {
        ctx.fillRect(sx, 6, 8, 12);
      }

      // Unique factory identification features
      if (b.factoryKey === "feedMill") {
        // Grain stalk drawing on front
        ctx.fillStyle = "#ffe082";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🌾", bx, by + 12);

        // Windmill rotation
        ctx.save();
        ctx.translate(bx, by - 6);
        const bladeAngle = time / 350;
        ctx.rotate(bladeAngle);
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-32, 0); ctx.lineTo(32, 0);
        ctx.moveTo(0, -32); ctx.lineTo(0, 32);
        ctx.stroke();

        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(10, -5, 20, 10);
        ctx.fillRect(-30, -5, 20, 10);
        ctx.fillRect(-5, 10, 10, 20);
        ctx.fillRect(-5, -30, 10, 20);
        ctx.restore();

      } else if (b.factoryKey === "bakery") {
        // Chimney smoking
        ctx.fillStyle = "#4e342e";
        ctx.fillRect(b.w * TILE_SIZE - 22, -6, 10, 18);
        
        // Large bread loaf logo
        ctx.fillStyle = "#ffe082";
        ctx.beginPath();
        ctx.ellipse(bx, by + 8, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffb300";
        ctx.lineWidth = 1.5;
        ctx.stroke();

      } else if (b.factoryKey === "dairy") {
        // Giant milk bottle standing on top
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#b2ebf2";
        ctx.lineWidth = 2;
        ctx.fillRect(bx - 8, -18, 16, 24);
        ctx.beginPath();
        ctx.moveTo(bx - 8, -18);
        ctx.lineTo(bx - 4, -26);
        ctx.lineTo(bx + 4, -26);
        ctx.lineTo(bx + 8, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#0288d1";
        ctx.fillRect(bx - 5, -29, 10, 3); // blue cap

        // Window with cyan glass
        ctx.fillStyle = "#80deea";
        ctx.fillRect(8, by + 6, 14, 14);

      } else if (b.factoryKey === "sugarRefinery") {
        // Silver industrial tank dome
        ctx.fillStyle = "#b0bec5";
        ctx.beginPath();
        ctx.arc(bx, 6, 18, Math.PI, 0);
        ctx.fill();

        // Candies / Crystals indicator
        ctx.fillStyle = "#e0f2f1";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🍬", bx, by + 12);

        // Tall steel smokestacks
        ctx.fillStyle = "#90a4ae";
        ctx.fillRect(8, -16, 6, 22);
        ctx.fillRect(20, -16, 6, 22);
        ctx.fillStyle = "#d32f2f";
        ctx.fillRect(8, -16, 6, 3);
        ctx.fillRect(20, -16, 6, 3);
      }

      // Completed items bubbles hovering above
      if (b.completed.length > 0) {
        ctx.save();
        ctx.fillStyle = "white";
        ctx.strokeStyle = "#ffb300";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bx, -12, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx - 6, -2);
        ctx.lineTo(bx, 6);
        ctx.lineTo(bx + 6, -2);
        ctx.fill();

        const emoji = ITEM_EMOJIS[b.completed[0]] || "📦";
        ctx.fillStyle = "black";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, bx, -12);
        ctx.restore();
      }
    }

    // DRAW LABEL PILL UNDER THE BUILDING
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    
    const labelText = b.name.toUpperCase();
    ctx.font = "bold 9px Outfit";
    const tw = ctx.measureText(labelText).width + 12;
    const th = 14;
    const ly = b.h * TILE_SIZE - 2;

    ctx.beginPath();
    // draw manual rounded rect for compatibility
    ctx.rect(bx - tw/2, ly - th/2, tw, th);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, bx, ly);
    ctx.restore();

    ctx.restore();
  });
}

// Wandering Cows pasture graphics
function drawCows(b, time) {
  // pasturing space size
  const yardW = b.w * TILE_SIZE;
  const yardH = b.h * TILE_SIZE;

  b.cows.forEach(cow => {
    // interpolation physics: walk toward target only when NOT eating
    if (cow.state !== "eating") {
      const dx = cow.tx - cow.px;
      const dy = cow.ty - cow.py;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.02) {
        cow.px += (dx / dist) * 0.005;
        cow.py += (dy / dist) * 0.005;
      } else {
        // arrived, idle state
        if (cow.state === "idle" && Math.random() < 0.01) {
          // choose new target inside pasture fence
          cow.tx = 0.2 + Math.random() * 0.6;
          cow.ty = 0.2 + Math.random() * 0.6;
        }
      }
    }

    // Drawing Cow Shape (client vector coordinates)
    const cx = cow.px * yardW;
    const cy = cow.py * yardH;

    ctx.save();
    ctx.translate(cx, cy);

    // Body
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Black spots
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(-4, -2, 3, 0, Math.PI*2);
    ctx.arc(3, 2, 4, 0, Math.PI*2);
    ctx.arc(0, -3, 2.5, 0, Math.PI*2);
    ctx.fill();

    // Head
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(8, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = "#ff8a80"; // pink snout
    ctx.beginPath();
    ctx.ellipse(10, -3, 4, 2.5, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes & Chewing indicator
    ctx.fillStyle = "black";
    if (cow.state === "eating") {
      // closed happy eyes
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.moveTo(7, -5); ctx.lineTo(8, -4); ctx.lineTo(9, -5);
      ctx.stroke();

      // Chewing Hay pile next to mouth
      ctx.fillStyle = "#ffeb3b";
      ctx.strokeStyle = "#fbc02d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(11, -1);
      ctx.lineTo(17, -5);
      ctx.lineTo(21, 2);
      ctx.lineTo(9, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#f57f17";
      ctx.beginPath();
      ctx.moveTo(12, 1); ctx.lineTo(18, -3);
      ctx.moveTo(14, 0); ctx.lineTo(16, 2);
      ctx.stroke();

      // Mini progress bar above cow's back
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(-12, -18, 24, 3.5);
      
      const pct = (20 - cow.timeLeft) / 20;
      ctx.fillStyle = "#4caf50";
      ctx.fillRect(-12, -18, 24 * pct, 3.5);

      // Eating label text
      ctx.fillStyle = "white";
      ctx.font = "bold 6px Outfit";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`EATING ${cow.timeLeft}s`, 0, -23);

    } else {
      ctx.beginPath();
      ctx.arc(8, -5, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Collectible bubble on cow
    if (cow.state === "milky") {
      ctx.save();
      ctx.translate(0, -18);
      ctx.fillStyle = "white";
      ctx.strokeStyle = "#4caf50";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = "9px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🥛", 0, 0);
      ctx.restore();
    }

    ctx.restore();
  });
}

// Grid placing collisions check
function drawPlacementPreview() {
  ctx.save();
  
  const clear = isPlacementClear(placingBuilding.x, placingBuilding.y, placingBuilding.w, placingBuilding.h);
  
  ctx.fillStyle = clear ? "rgba(76, 175, 80, 0.4)" : "rgba(239, 83, 80, 0.4)";
  ctx.fillRect(placingBuilding.x * TILE_SIZE, placingBuilding.y * TILE_SIZE, placingBuilding.w * TILE_SIZE, placingBuilding.h * TILE_SIZE);
  
  ctx.strokeStyle = clear ? "#4caf50" : "#ef5350";
  ctx.lineWidth = 2;
  ctx.strokeRect(placingBuilding.x * TILE_SIZE, placingBuilding.y * TILE_SIZE, placingBuilding.w * TILE_SIZE, placingBuilding.h * TILE_SIZE);

  ctx.restore();
}

function isPlacementClear(gridX, gridY, w, h) {
  // Map boundary (must leave top 3 rows for tracks)
  if (gridX < 0 || gridX + w > MAP_SIZE || gridY < 3 || gridY + h > MAP_SIZE) return false;

  // Track tracks overlap
  if (gridY <= 2) return false;

  // Buildings overlap check
  for (const b of state.buildings) {
    if (!b.unlocked) continue;
    // boxes overlap
    if (gridX < b.x + b.w && gridX + w > b.x && gridY < b.y + b.h && gridY + h > b.y) {
      return false;
    }
  }

  // Plots overlap check
  for (const p of state.plots) {
    if (gridX < p.x + 1 && gridX + w > p.x && gridY < p.y + 1 && gridY + h > p.y) {
      return false;
    }
  }

  return true;
}

// Open building shop listing items
function toggleShop() {
  shopOpen = !shopOpen;
  document.getElementById('shop-drawer').classList.toggle('open', shopOpen);
}

function renderShopItems() {
  const container = document.getElementById('shop-items-grid');
  container.innerHTML = '';

  const shopConfig = [
    { type: "plot", name: "Crop Plot", emoji: "🟫", cost: 0, level: 1 },
    { type: "cowshed", name: "Cowshed", emoji: "🐮🏡", cost: 50, level: 1 },
    { type: "bakery", name: "Bakery", emoji: "🍞🏭", cost: 0, level: 1 },
    { type: "feedMill", name: "Feed Mill", emoji: "🌾🏭", cost: 0, level: 1 },
    { type: "dairy", name: "Dairy Factory", emoji: "🥛🏭", cost: 150, level: 2 },
    { type: "sugarRefinery", name: "Sugar Refinery", emoji: "🍬🏭", cost: 300, level: 3 }
  ];

  shopConfig.forEach(item => {
    const card = document.createElement('div');
    card.className = 'shop-item-card';
    
    const locked = state.level < item.level;
    
    card.innerHTML = `
      <span class="shop-item-icon">${locked ? '🔒':item.emoji}</span>
      <span class="shop-item-name">${item.name}</span>
      <span class="shop-item-cost">🪙 ${item.cost}</span>
      <span class="shop-item-limit">${locked ? `Locks Level ${item.level}`:'Buy'}</span>
    `;

    if (!locked) {
      card.onclick = () => selectShopItem(item);
    }
    container.appendChild(card);
  });
}

function selectShopItem(item) {
  if (state.coins < item.cost) {
    alert("Not enough coins!");
    return;
  }

  // Close shop drawer
  toggleShop();
  
  // Enter placing state preview
  let w = 2, h = 2;
  if (item.type === "cowshed") { w = 3; h = 3; }
  else if (item.type === "plot") { w = 1; h = 1; }

  placingBuilding = {
    type: item.type,
    name: item.name,
    cost: item.cost,
    x: 10, y: 10, w, h
  };
  
  // Set pointer tool active
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tool-select').classList.add('active');
  activeTool = "select";
}

// Purchase and commit building placement
function placeShopItem(tx, ty) {
  if (!isPlacementClear(tx, ty, placingBuilding.w, placingBuilding.h)) {
    alert("Invalid space! Check boundary overlaps.");
    return;
  }

  state.coins -= placingBuilding.cost;

  if (placingBuilding.type === "plot") {
    // Add new crop plot
    state.plots.push({
      id: Date.now(),
      x: tx,
      y: ty,
      planted: null,
      timeTotal: 0,
      timeLeft: 0
    });
  } else if (placingBuilding.type === "cowshed") {
    // Add Cowshed
    state.buildings.push({
      id: "cowshed_" + Date.now(),
      type: "cowshed",
      name: "Cowshed",
      x: tx, y: ty, w: 3, h: 3, unlocked: true,
      cows: [
        { id: 1, px: 0.3, py: 0.3, tx: 0.3, ty: 0.3, state: "idle", timeLeft: 0 },
        { id: 2, px: 0.7, py: 0.6, tx: 0.7, ty: 0.6, state: "idle", timeLeft: 0 }
      ]
    });
  } else {
    // Add factory structure
    state.buildings.push({
      id: placingBuilding.type + "_" + Date.now(),
      type: "factory",
      name: placingBuilding.name,
      factoryKey: placingBuilding.type,
      x: tx, y: ty, w: 2, h: 2, unlocked: true,
      queue: [], completed: [], maxQueue: 3
    });
  }

  synth.playUpgrade();
  logMilestone(`🏗️ Placed building ${placingBuilding.name} at coordinate (${tx}, ${ty})`);
  
  placingBuilding = null;
  renderAll();
  saveGame(true);
}

// Cow pasture feeding action
function feedCows(b) {
  const stock = state.barn.items.cowFeed || 0;
  
  let cowsFed = false;
  b.cows.forEach(cow => {
    if (cow.state === "idle") {
      if (state.barn.items.cowFeed && state.barn.items.cowFeed > 0) {
        state.barn.items.cowFeed--;
        cow.state = "eating";
        cow.timeLeft = 20; // 20s to feed
        cowsFed = true;
      }
    }
  });

  if (cowsFed) {
    synth.playPlant();
    renderBarn();
    saveGame(true);
  }
}

// Collect cow milk output
function collectCowMilk(b, clickedCow, mx, my) {
  if (!addToBarn("milk", 1)) {
    showFloatingText("Barn Full! 📦❌", mx, my, "#ef5350");
    return;
  }
  
  clickedCow.state = "idle";
  clickedCow.timeLeft = 0;
  
  addXP(3); // 3 XP per milk
  synth.playPop();

  spawnFloatingText("+3 XP", mx, my, "#ffb300");
  spawnFlyingParticle("milk", mx, my, "#hud-barn-pill");
  spawnFlyingParticle("xp", mx, my, "#hud-xp-badge");

  renderBarn();
  saveGame(true);
}

// Click intersections handler on visual map
function handleBuildingClick(b) {
  if (b.type === "factory") {
    // Open active overlay modal
    openFactoryModal(b.factoryKey);
  } else if (b.type === "helipad") {
    // Open Helipad
    openHelicopterModal();
  } else if (b.type === "barn") {
    // Slide Barn drawer
    toggleBarn();
  } else if (b.id.startsWith("cowshed")) {
    // Check if cow is ready to milk
    // Find mouse offsets relative to building
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const world = screenToWorld(event.clientX, event.clientY);
    
    // Find cowshed building bounds
    const yardW = b.w * TILE_SIZE;
    const yardH = b.h * TILE_SIZE;
    const bx = b.x * TILE_SIZE;
    const by = b.y * TILE_SIZE;
    
    // Check if clicked near any milky cow
    let milked = false;
    b.cows.forEach(cow => {
      const cx = bx + cow.px * yardW;
      const cy = by + cow.py * yardH;
      const dist = Math.hypot(mx - (cx * camera.scale + camera.x), my - (cy * camera.scale + camera.y));
      
      if (cow.state === "milky" && dist < 30 * camera.scale) {
        collectCowMilk(b, cow, event.clientX, event.clientY);
        milked = true;
      }
    });

    if (!milked) {
      alert("Feed cows by swiping Cow Feed over the pasture pasture! 🐮🌾");
    }
  }
}

// ==========================================================================
// VECTOR GRAPHICS MOVING SPRITES
// ==========================================================================
function drawTrains(time) {
  if (!state || !state.trains) return;

  state.trains.forEach(t => {
    const ry = t.trackRow * TILE_SIZE + 24;

    // Smooth movement logic at different speeds per train type
    if (t.state === "traveling") {
      if (t.animatedX < 25) {
        t.animatedX += (t.id === "express" ? 0.22 : t.id === "local" ? 0.15 : 0.1);
        if (t.animatedX > 25) t.animatedX = 25;
      }
    } else if (t.state === "returned") {
      if (t.animatedX > 20) {
        t.animatedX = -15; // Teleport left off-screen to roll in forward
      }
      if (t.animatedX < 10) {
        t.animatedX += (t.id === "express" ? 0.18 : t.id === "local" ? 0.12 : 0.08);
        if (t.animatedX > 10) t.animatedX = 10;
      }
    } else {
      t.animatedX = 10; // station coordinate
    }

    ctx.save();
    ctx.translate(t.animatedX * TILE_SIZE, ry);

    // Dynamic Train Designs: Sleek Silver Express, Blue Local Steam, Orange Metro
    let locomotiveColor = "#1e3a8a";
    let cabinColor = "#60a5fa";
    let carriageColor = "#71717a";

    if (t.id === "express") {
      locomotiveColor = "#cfd8dc"; // Silver Bullet train nose
      cabinColor = "#b0bec5";
      carriageColor = "#90a4ae";
    } else if (t.id === "metro") {
      locomotiveColor = "#e65100"; // Orange Metro subway
      cabinColor = "#ffb74d";
      carriageColor = "#e0e0e0";
    }

    const wheelAngle = time / 150;

    if (t.id === "express") {
      // Sleek Silver Bullet Train Nose
      ctx.fillStyle = locomotiveColor;
      ctx.beginPath();
      ctx.moveTo(-60, 6);
      ctx.lineTo(-20, -18);
      ctx.lineTo(0, -18);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      
      // Windshield
      ctx.fillStyle = "#374151";
      ctx.beginPath();
      ctx.moveTo(-35, -9);
      ctx.lineTo(-24, -15);
      ctx.lineTo(-14, -15);
      ctx.lineTo(-18, -9);
      ctx.closePath();
      ctx.fill();
    } else {
      // Traditional Locomotive
      ctx.fillStyle = locomotiveColor;
      ctx.fillRect(-60, -18, 60, 24);
      
      // Cabin
      ctx.fillStyle = cabinColor;
      ctx.fillRect(-22, -26, 18, 10);
      
      // Chimney smoke puff emission
      ctx.fillStyle = "black";
      ctx.fillRect(-52, -26, 8, 10);
    }

    // Wheels rotation
    ctx.fillStyle = "#374151";
    ctx.save();
    ctx.translate(-50, 6);
    ctx.rotate(wheelAngle);
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-15, 6);
    ctx.rotate(wheelAngle);
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Draw Cargo Cars (crates count)
    const crateCount = t.crates.length;
    for (let i = 1; i <= crateCount; i++) {
      const ox = -60 - (i * 70); // space out cars
      ctx.fillStyle = carriageColor;
      ctx.fillRect(ox, -14, 58, 20);

      // Wheels
      ctx.save();
      ctx.translate(ox + 12, 6);
      ctx.rotate(wheelAngle);
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(ox + 46, 6);
      ctx.rotate(wheelAngle);
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Crates on Cars
      if (t.state === "at_station") {
        const crate = t.crates[i - 1];
        if (crate) {
          ctx.fillStyle = crate.loaded ? "#10b981" : "#d97706";
          ctx.fillRect(ox + 8, -26, 42, 14);

          // Crate label
          ctx.fillStyle = "white";
          ctx.font = "bold 9px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const icon = ITEM_EMOJIS[crate.cargoNeeded] || "📦";
          ctx.fillText(icon, ox + 29, -20);
        }
      }
    }

    ctx.restore();
  });
}

function drawHelicopterOnCanvas(time) {
  if (!state) return;

  const hx = 5 * TILE_SIZE + TILE_SIZE; // helipad grid center
  const hy = 3 * TILE_SIZE + TILE_SIZE;

  ctx.save();

  if (state.helicopter.state === "flying_out") {
    // Smooth 60fps tracking using client state progress
    if (helicopterAnim.lastState !== "flying_out") {
      helicopterAnim.progress = 0;
      helicopterAnim.lastState = "flying_out";
    }
    // 8-second delivery loop (approx 480 frames at 60fps)
    helicopterAnim.progress = Math.min(1.0, helicopterAnim.progress + 1 / (60 * 8));
    const progress = helicopterAnim.progress;
    
    const startX = hx;
    const startY = hy;
    const ctrlX = hx + 150;
    const ctrlY = hy - 300;
    const endX = MAP_SIZE * TILE_SIZE + 100;
    const endY = -100;

    // Bezier path formula
    animatedHelicopter.x = (1 - progress) * (1 - progress) * startX + 2 * (1 - progress) * progress * ctrlX + progress * progress * endX;
    animatedHelicopter.y = (1 - progress) * (1 - progress) * startY + 2 * (1 - progress) * progress * ctrlY + progress * progress * endY;
    
    animatedHelicopter.scale = 1.0 - progress * 0.7;
    animatedHelicopter.angle = progress > 0.8 ? -0.1 : 0.2; // tilt

  } else if (state.helicopter.state === "flying_in") {
    if (helicopterAnim.lastState !== "flying_in") {
      helicopterAnim.progress = 0;
      helicopterAnim.lastState = "flying_in";
    }
    // 3-second return flight (approx 180 frames)
    helicopterAnim.progress = Math.min(1.0, helicopterAnim.progress + 1 / (60 * 3));
    const progress = helicopterAnim.progress;
    
    const startX = -100;
    const startY = -50;
    const ctrlX = hx - 100;
    const ctrlY = hy - 150;
    const endX = hx;
    const endY = hy;

    animatedHelicopter.x = (1 - progress) * (1 - progress) * startX + 2 * (1 - progress) * progress * ctrlX + progress * progress * endX;
    animatedHelicopter.y = (1 - progress) * (1 - progress) * startY + 2 * (1 - progress) * progress * ctrlY + progress * progress * endY;
    
    animatedHelicopter.scale = 0.3 + progress * 0.7;
    animatedHelicopter.angle = -0.15 * (1 - progress);

  } else {
    // Hovering at pad bob
    helicopterAnim.lastState = "at_pad";
    helicopterAnim.progress = 0;
    animatedHelicopter.x = hx;
    animatedHelicopter.y = hy + Math.sin(time / 200) * 3;
    animatedHelicopter.scale = 1.0;
    animatedHelicopter.angle = 0;
  }

  // Draw Helicopter Body
  ctx.translate(animatedHelicopter.x, animatedHelicopter.y);
  ctx.scale(animatedHelicopter.scale, animatedHelicopter.scale);
  ctx.rotate(animatedHelicopter.angle);

  // Chassis
  ctx.fillStyle = "#f57c00";
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  // Cockpit window
  ctx.fillStyle = "#e0f7fa";
  ctx.beginPath();
  ctx.arc(8, -4, 10, Math.PI * 1.5, Math.PI * 0.5);
  ctx.fill();

  // Tail boom
  ctx.strokeStyle = "#f57c00";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-32, -8);
  ctx.stroke();

  // Tail rotor
  ctx.fillStyle = "#374151";
  ctx.beginPath();
  ctx.arc(-32, -8, 5, 0, Math.PI * 2);
  ctx.fill();

  // Main rotor shaft
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -22);
  ctx.stroke();

  // Spinning blades
  ctx.save();
  ctx.translate(0, -22);
  ctx.rotate(time / 40); // very fast spin
  ctx.fillStyle = "rgba(100,100,100,0.6)";
  ctx.fillRect(-28, -2, 56, 4);
  ctx.restore();

  ctx.restore();
}

// ==========================================================================
// FARMING INTERACTIVES
// ==========================================================================
function plantPlot(plotId, cropType) {
  const plot = state.plots.find(p => p.id === plotId);
  const recipe = CROP_RECIPES[cropType];
  
  plot.planted = cropType;
  plot.timeTotal = recipe.time;
  plot.timeLeft = recipe.time;

  synth.playPlant();
  saveGame(true);
}

function harvestPlot(plotId, sx, sy) {
  const plot = state.plots.find(p => p.id === plotId);
  const crop = plot.planted;
  const recipe = CROP_RECIPES[crop];

  if (!addToBarn(crop, 1)) {
    // If swipe harvesting, launch alert text
    spawnFloatingText("Barn Full! 📦❌", sx, sy, "#ef5350");
    return;
  }

  plot.planted = null;
  plot.timeTotal = 0;
  plot.timeLeft = 0;

  addXP(recipe.xp);
  synth.playPop();

  spawnFloatingText(`+${recipe.xp} XP`, sx, sy, "#ffb300");
  spawnFlyingParticle(crop, sx, sy, "#hud-barn-pill");
  spawnFlyingParticle("xp", sx, sy, "#hud-xp-badge");

  saveGame(true);
}

function addXP(amount) {
  state.xp += amount;
  if (state.xp >= state.xp_required) {
    state.xp -= state.xp_required;
    state.level++;
    state.xp_required = Math.round(state.xp_required * 1.55);
    synth.playUpgrade();
    alert(`🎉 Level Up! Your Township reached level ${state.level}! 🎉`);
    
    // Add additional crop plots on level up
    state.plots.push({ id: Date.now(), x: 5 + state.plots.length % 4, y: 11 + Math.floor(state.plots.length / 4), planted: null, timeTotal: 0, timeLeft: 0 });
    
    renderAll();
  }
}

// ==========================================================================
// SLIDING BARN DRAWER
// ==========================================================================
function toggleBarn() {
  document.getElementById('barn-drawer').classList.toggle('open');
  renderBarn();
}

function renderBarn() {
  if (!state) return;
  const container = document.getElementById('barn-items-list');
  container.innerHTML = '';

  let currentCount = 0;
  for (const [item, qty] of Object.entries(state.barn.items)) {
    if (qty <= 0) continue;
    currentCount += qty;

    const card = document.createElement('div');
    card.className = 'barn-item-card';
    const emoji = ITEM_EMOJIS[item] || "📦";
    
    card.innerHTML = `
      <span class="barn-item-icon">${emoji}</span>
      <span class="barn-item-name">${item}</span>
      <span class="barn-item-qty">${qty}</span>
      <button style="position:absolute;top:2px;right:2px;background:none;border:none;cursor:pointer;font-size:8px;font-weight:700;" 
              onclick="sellBarnItem('${item}')">🪙 Sell</button>
    `;
    container.appendChild(card);
  }

  document.getElementById('barn-capacity-indicator').innerHTML = `
    <strong>Barn Storage Capacity:</strong> ${currentCount} / ${state.barn.capacity} items
  `;
  document.getElementById('hud-barn-capacity').innerText = `${currentCount}/${state.barn.capacity}`;

  // Upgrade material pill requirements
  const matPills = document.getElementById('upgrade-materials');
  const bStock = state.barn.items.brick || 0;
  const gStock = state.barn.items.glass || 0;
  const sStock = state.barn.items.slab || 0;

  const isBReady = bStock >= 2;
  const isGReady = gStock >= 2;
  const isSReady = sStock >= 2;

  matPills.innerHTML = `
    <div class="material-cost-pill ${isBReady ? 'sufficient':''}">🧱 ${bStock}/2</div>
    <div class="material-cost-pill ${isGReady ? 'sufficient':''}">🥛 ${gStock}/2</div>
    <div class="material-cost-pill ${isSReady ? 'sufficient':''}">🪨 ${sStock}/2</div>
  `;

  document.getElementById('upgrade-barn-btn').disabled = !(isBReady && isGReady && isSReady);
}

function addToBarn(item, quantity) {
  let count = 0;
  for (const q of Object.values(state.barn.items)) count += q;

  if (count + quantity > state.barn.capacity) return false;

  state.barn.items[item] = (state.barn.items[item] || 0) + quantity;
  return true;
}

function sellBarnItem(item) {
  if ((state.barn.items[item] || 0) <= 0) return;
  state.barn.items[item]--;
  const val = getItemValue(item);
  state.coins += Math.round(val.coins * 0.5) || 2;
  
  synth.playPop();
  renderAll();
  saveGame(true);
}

function upgradeBarn() {
  state.barn.items.brick -= 2;
  state.barn.items.glass -= 2;
  state.barn.items.slab -= 2;
  state.barn.capacity += 20;

  synth.playUpgrade();
  renderAll();
  saveGame(true);
}

// ==========================================================================
// FACTORY OVERLAY MODAL
// ==========================================================================
function openFactoryModal(factoryKey) {
  factoryMenuOpenKey = factoryKey;
  document.getElementById('factory-action-modal').style.display = 'block';
  updateFactoryModalUI();
}

function closeFactoryModal() {
  factoryMenuOpenKey = null;
  document.getElementById('factory-action-modal').style.display = 'none';
}

function updateFactoryModalUI() {
  if (!factoryMenuOpenKey) return;
  const f = state.buildings.find(b => b.factoryKey === factoryMenuOpenKey);
  if (!f) return;

  document.getElementById('factory-menu-title').innerText = `🏭 ${f.name} Management`;
  
  // 1. Update active queue
  const queueEl = document.getElementById('factory-menu-queue');
  queueEl.innerHTML = '';
  for (let i = 0; i < f.maxQueue; i++) {
    const slot = document.createElement('div');
    slot.className = 'factory-queue-slot';
    
    if (f.queue[i]) {
      const activeItem = f.queue[i];
      slot.className = 'factory-queue-slot active';
      slot.innerHTML = ITEM_EMOJIS[activeItem.item] || "📦";
      
      if (i === 0) {
        const percent = ((activeItem.duration - activeItem.timeLeft) / activeItem.duration) * 100;
        slot.innerHTML += `<div class="factory-queue-progress" style="width:${percent}%"></div>`;
      }
    }
    queueEl.appendChild(slot);
  }

  // 2. Completed collect bubble
  const collector = document.getElementById('factory-menu-collector');
  if (f.completed.length > 0) {
    collector.style.display = 'flex';
    collector.innerHTML = `
      ${ITEM_EMOJIS[f.completed[0]] || "📦"}
      ${f.completed.length > 1 ? `<div class="factory-collector-badge">${f.completed.length}</div>` : ''}
    `;
  } else {
    collector.style.display = 'none';
  }

  // 3. Recipes list
  const recipesContainer = document.getElementById('factory-menu-recipes');
  recipesContainer.innerHTML = '';

  const recipeConfig = FACTORY_RECIPES[factoryMenuOpenKey];
  for (const [recipeKey, recipe] of Object.entries(recipeConfig)) {
    const option = document.createElement('div');
    option.className = 'recipe-option';

    let costStr = "";
    for (const [ing, count] of Object.entries(recipe.cost)) {
      costStr += `${ITEM_EMOJIS[ing]}x${count} `;
    }

    option.innerHTML = `
      <span class="recipe-icon">${ITEM_EMOJIS[recipeKey] || "📦"}</span>
      <span class="recipe-cost">${costStr.trim()}</span>
    `;
    
    option.onclick = () => queueActiveFactoryItem(recipeKey);
    recipesContainer.appendChild(option);
  }
}

function queueActiveFactoryItem(recipeKey) {
  const f = state.buildings.find(b => b.factoryKey === factoryMenuOpenKey);
  const recipe = FACTORY_RECIPES[factoryMenuOpenKey][recipeKey];

  if (f.queue.length >= f.maxQueue) {
    alert("Queue full!");
    return;
  }

  for (const [ing, count] of Object.entries(recipe.cost)) {
    const stock = state.barn.items[ing] || 0;
    if (stock < count) {
      alert(`Need ${count}x ${ing.toUpperCase()}`);
      return;
    }
  }

  // Deduct
  for (const [ing, count] of Object.entries(recipe.cost)) {
    state.barn.items[ing] -= count;
  }

  f.queue.push({
    item: recipeKey,
    name: recipe.name,
    duration: recipe.time,
    timeLeft: recipe.time
  });

  synth.playPlant();
  renderBarn();
  updateFactoryModalUI();
  saveGame(true);
}

function collectActiveFactory() {
  const f = state.buildings.find(b => b.factoryKey === factoryMenuOpenKey);
  if (f.completed.length === 0) return;

  const item = f.completed[0];
  const recipe = FACTORY_RECIPES[factoryMenuOpenKey][item];

  if (!addToBarn(item, 1)) {
    alert("Barn full!");
    return;
  }

  f.completed.shift();
  addXP(recipe.xp);
  synth.playPop();

  // Floating sparks from center screen
  const rect = canvas.getBoundingClientRect();
  spawnFloatingText(`+${recipe.xp} XP`, rect.width/2, rect.height/2, "#ffb300");
  spawnFlyingParticle(item, rect.width/2, rect.height/2, "#hud-barn-pill");
  spawnFlyingParticle("xp", rect.width/2, rect.height/2, "#hud-xp-badge");

  renderBarn();
  updateFactoryModalUI();
  saveGame(true);
}

// ==========================================================================
// HELICOPTER ORDERS BOARD MODAL
// ==========================================================================
function openHelicopterModal() {
  document.getElementById('helicopter-modal').style.display = 'flex';
  updateHelipadModalUI();
}

function closeHelicopterModal() {
  document.getElementById('helicopter-modal').style.display = 'none';
}

function getItemGuideText(item) {
  const guides = {
    wheat: "Grow Wheat on Crop Fields (takes 10s)",
    corn: "Grow Corn on Crop Fields (takes 20s)",
    carrot: "Grow Carrot on Crop Fields (takes 40s)",
    sugarcane: "Grow Sugarcane on Crop Fields (takes 60s)",
    cowFeed: "Mill Cow Feed in Feed Mill (costs 2 Wheat, takes 10s)",
    cornMeal: "Mill Corn Meal in Feed Mill (costs 2 Corn, takes 20s)",
    bread: "Bake Bread in Bakery (costs 2 Wheat, takes 15s)",
    cake: "Bake Cake in Bakery (costs 2 Wheat + 1 Sugar, takes 45s)",
    butter: "Churn Butter in Dairy (costs 1 Cow Feed, takes 30s)",
    cheese: "Churn Cheese in Dairy (costs 1 Corn Meal, takes 40s)",
    sugar: "Refine Sugar in Sugar Refinery (costs 2 Sugarcane, takes 25s)",
    syrup: "Refine Syrup in Sugar Refinery (costs 3 Sugarcane, takes 50s)",
    milk: "Feed cows in Cowshed Pasture (takes 20s)"
  };
  return guides[item] || "Collect or craft this item.";
}

function updateHelipadModalUI() {
  const container = document.getElementById('orders-board');
  if (!container || document.getElementById('helicopter-modal').style.display === 'none') return;
  container.innerHTML = '';

  state.helicopter.orders.forEach((order, idx) => {
    if (order.cooldown !== undefined && order.cooldown > 0) {
      const coold = document.createElement('div');
      coold.className = 'order-cooldown-overlay';
      coold.innerHTML = `🕒 Transmit cooldown: <strong>${order.cooldown}s</strong>`;
      container.appendChild(coold);
      return;
    }

    const card = document.createElement('div');
    card.className = 'order-card';

    let itemsHtml = "";
    let isReady = true;

    for (const [item, qty] of Object.entries(order.request)) {
      const stock = state.barn.items[item] || 0;
      const satisfied = stock >= qty;
      if (!satisfied) isReady = false;

      itemsHtml += `
        <span class="order-item-req ${satisfied ? 'fulfilled':''}">
          ${ITEM_EMOJIS[item]} ${stock}/${qty}
        </span>
      `;
    }

    // Generate step-by-step guidance details for tooltip
    let guideHtml = `<div class="order-tooltip-content">`;
    guideHtml += `<strong>🎓 FULFILLMENT GUIDE</strong>`;
    for (const [item, qty] of Object.entries(order.request)) {
      const itemEmoji = ITEM_EMOJIS[item] || "📦";
      const guideText = getItemGuideText(item);
      guideHtml += `
        <div class="tooltip-guide-row">
          ${itemEmoji} <strong>${qty}x ${item.toUpperCase()}:</strong><br>
          ${guideText}
        </div>
      `;
    }
    guideHtml += `</div>`;

    card.innerHTML = `
      <div>
        <div class="order-recipient-container">
          <span class="order-recipient">👤 ${order.title} ❓</span>
          ${guideHtml}
        </div>
        <div class="order-items">${itemsHtml}</div>
        <div class="order-rewards">
          <span>🪙 +${order.reward.coins}</span>
          <span>⭐ +${order.reward.xp}</span>
        </div>
      </div>
      <div class="order-actions">
        <button class="trash-btn" onclick="trashOrder(${idx})">🗑️</button>
        <button class="send-order-btn ${isReady && state.helicopter.state === 'at_pad' ? 'ready':''}" 
                onclick="sendHelicopter(${idx})"
                ${!isReady || state.helicopter.state !== 'at_pad' ? 'disabled':''}>
          SEND
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function trashOrder(idx) {
  state.helicopter.orders[idx] = { cooldown: 20 };
  updateHelipadModalUI();
  saveGame(true);
}

function sendHelicopter(idx) {
  if (state.helicopter.state !== "at_pad") return;
  const order = state.helicopter.orders[idx];

  for (const [item, qty] of Object.entries(order.request)) {
    state.barn.items[item] -= qty;
  }

  state.helicopter.state = "flying_out";
  state.helicopter.timeLeft = 8;
  state.helicopter.activeOrder = order;

  state.helicopter.orders[idx] = generateRandomOrder();

  state.coins += order.reward.coins;
  addXP(order.reward.xp);
  
  // Whirring engine sound
  synth.playTrainWhistle(); // fallback Whistle to double for sound indicators

  // Floating rewards particles from centers
  const rect = canvas.getBoundingClientRect();
  const px = rect.width / 2;
  const py = rect.height / 2;

  spawnFloatingText(`+${order.reward.coins} 🪙`, px, py, "#ffd54f");
  spawnFloatingText(`+${order.reward.xp} XP`, px, py - 18, "#ffb300");
  
  for (let i = 0; i < 4; i++) {
    setTimeout(() => spawnFlyingParticle("coins", px, py, "#hud-coins-badge"), i * 150);
    setTimeout(() => spawnFlyingParticle("xp", px, py, "#hud-xp-badge"), i * 150 + 50);
  }

  closeHelicopterModal();
  renderAll();
  saveGame(true);
}

// ==========================================================================
// TRAIN STATION LOGISTICS MODALS
// ==========================================================================
let activeTrainId = "local";

function openTrainModal(trainId) {
  if (trainId) activeTrainId = trainId;
  document.getElementById('train-modal').style.display = 'flex';
  updateTrainModalUI();
}

function closeTrainModal() {
  document.getElementById('train-modal').style.display = 'none';
}

function rollNewCratesFor(trainId) {
  const unlockedItems = ["wheat", "corn", "bread"];
  if (state.level >= 2) {
    unlockedItems.push("carrot", "cowFeed", "milk", "butter");
  }
  if (state.level >= 3) {
    unlockedItems.push("sugarcane", "cornMeal", "cheese", "sugar", "syrup", "cake");
  }
  
  const count = trainId === "express" ? 4 : trainId === "local" ? 3 : 5;
  
  return Array.from({ length: count }, (_, idx) => {
    const item = unlockedItems[Math.floor(Math.random() * unlockedItems.length)];
    // Express/Metro require smaller counts for high-tier products
    let amount = 2;
    if (item === "wheat") amount = 4;
    else if (item === "corn" || item === "carrot" || item === "sugarcane") amount = 3;
    else if (item === "bread" || item === "butter" || item === "cheese" || item === "sugar") amount = 2;
    else amount = 1; // cakes, syrup, meals
    
    return { id: idx + 1, cargoNeeded: item, amountNeeded: amount, loaded: false };
  });
}

function rollTrainRewardsFor(trainId) {
  const count = trainId === "express" ? 4 : trainId === "local" ? 2 : 6;
  const mats = ["brick", "glass", "slab"];
  const rewards = {};
  for (let i = 0; i < count; i++) {
    const m = mats[Math.floor(Math.random() * mats.length)];
    rewards[m] = (rewards[m] || 0) + 1;
  }
  return rewards;
}

function updateTrainModalUI() {
  const t = state.trains.find(tr => tr.id === activeTrainId);
  if (!t || document.getElementById('train-modal').style.display === 'none') return;

  // Set Modal title
  document.getElementById('train-modal-title').innerHTML = `${t.name} Depot`;

  // Render Crates
  const cratesContainer = document.getElementById('train-modal-crates-container');
  if (cratesContainer) {
    cratesContainer.innerHTML = '';
    t.crates.forEach((crate, idx) => {
      const crateBox = document.createElement('div');
      
      if (t.state !== "at_station") {
        crateBox.className = "train-modal-crate";
        crateBox.innerHTML = `<div class="crate-label">Traveling...</div>`;
      } else if (crate.loaded) {
        crateBox.className = "train-modal-crate loaded";
        crateBox.innerHTML = `
          <div class="crate-label">✔️ Loaded</div>
          <span style="font-size:20px;">${ITEM_EMOJIS[crate.cargoNeeded]}</span>
        `;
      } else {
        const stock = state.barn.items[crate.cargoNeeded] || 0;
        const ready = stock >= crate.amountNeeded;
        const rewardCoins = crate.amountNeeded * 15;
        const rewardXP = crate.amountNeeded * 10;
        crateBox.className = "train-modal-crate";
        crateBox.innerHTML = `
          <div class="crate-label">${ITEM_EMOJIS[crate.cargoNeeded]}x${crate.amountNeeded}</div>
          <span style="font-size:11px;font-weight:700;">Stock: ${stock}/${crate.amountNeeded}</span>
          <div style="font-size:11px; font-weight:700; color:#5d4037; margin: 3px 0; display:flex; gap:6px; justify-content:center; align-items:center;">
            <span>🪙 +${rewardCoins}</span>
            <span>⭐ +${rewardXP}</span>
          </div>
          <button class="unlock-btn" style="padding:4px 10px; font-size:11px; background:${ready?'var(--primary)':'#cbd5e0'}; color:white;" 
                  onclick="loadTrainCrate(${idx + 1})" ${!ready?'disabled':''}>
            LOAD
          </button>
        `;
      }
      cratesContainer.appendChild(crateBox);
    });
  }

  // Bottom action bar
  const container = document.getElementById('train-modal-actions');
  if (container) {
    if (t.state === "traveling") {
      container.innerHTML = `<span>🚂 Traveling... returns in ${t.timeLeft}s</span>`;
    } else if (t.state === "returned") {
      container.innerHTML = `
        <button class="upgrade-barn-btn" style="background:#4caf50;color:white;" onclick="unloadTrainCargo()">
          🎁 COLLECT BUILDING MATERIALS
        </button>
      `;
    } else {
      const loadedCount = t.crates.filter(c => c.loaded).length;
      const isFull = loadedCount === t.crates.length;
      if (isFull) {
        container.innerHTML = `
          <button class="upgrade-barn-btn" style="background:#1e3a8a;color:white;" onclick="dispatchTrainCrates()">
            🚂 SEND TRAIN (COOLDOWN ${t.timeTotal}s)
          </button>
        `;
      } else {
        container.innerHTML = `<span>Load all ${t.crates.length} crates to send the train! (${loadedCount}/${t.crates.length})</span>`;
      }
    }
  }
}

function loadTrainCrate(crateId) {
  const t = state.trains.find(tr => tr.id === activeTrainId);
  const crate = t.crates[crateId - 1];
  const stock = state.barn.items[crate.cargoNeeded] || 0;
  if (stock < crate.amountNeeded) return;

  state.barn.items[crate.cargoNeeded] -= crate.amountNeeded;
  crate.loaded = true;

  const rewardCoins = crate.amountNeeded * 15;
  const rewardXP = crate.amountNeeded * 10;
  state.coins += rewardCoins;
  addXP(rewardXP);

  synth.playPop();
  
  // FX elements
  const rect = canvas.getBoundingClientRect();
  spawnFloatingText(`+${rewardCoins} 🪙`, rect.width/2, rect.height/2, "#ffd54f");
  spawnFlyingParticle("coins", rect.width/2, rect.height/2, "#hud-coins-badge");
  spawnFlyingParticle("xp", rect.width/2, rect.height/2, "#hud-xp-badge");

  renderAll();
  updateTrainModalUI();
  saveGame(true);
}

function dispatchTrainCrates() {
  const t = state.trains.find(tr => tr.id === activeTrainId);
  t.state = "traveling";
  t.timeLeft = t.timeTotal;
  synth.playTrainWhistle();
  
  closeTrainModal();
  updateTrainModalUI();
  saveGame(true);
}

function unloadTrainCargo() {
  const t = state.trains.find(tr => tr.id === activeTrainId);
  const rewards = t.rewards;
  if (!rewards) return;

  let rewardCount = 0;
  for (const qty of Object.values(rewards)) rewardCount += qty;

  let barnStock = 0;
  for (const q of Object.values(state.barn.items)) barnStock += q;

  if (barnStock + rewardCount > state.barn.capacity) {
    alert("Barn is full! Sell items first.");
    return;
  }

  // Load into barn
  for (const [mat, qty] of Object.entries(rewards)) {
    state.barn.items[mat] = (state.barn.items[mat] || 0) + qty;
  }

  synth.playUpgrade();
  
  const rect = canvas.getBoundingClientRect();
  const px = rect.width / 2;
  const py = rect.height / 2;
  
  for (const [mat, qty] of Object.entries(rewards)) {
    for (let i = 0; i < qty; i++) {
      spawnFlyingParticle(mat, px, py, "#hud-barn-pill");
    }
  }

  logMilestone(`🚂 ${t.name} returned! Collected: ${Object.entries(rewards).map(([m,q]) => `${q}x ${m}`).join(', ')}.`);

  t.state = "at_station";
  t.rewards = null;
  
  // Re-roll cargo
  t.crates = rollNewCratesFor(t.id);

  closeTrainModal();
  renderAll();
  saveGame(true);
}

function recycleTrainCrates() {
  const t = state.trains.find(tr => tr.id === activeTrainId);
  if (!t || t.state !== "at_station") return;

  if (!confirm("Recalculate new cargo requests for this train?")) return;

  t.crates = rollNewCratesFor(t.id);
  updateTrainModalUI();
  synth.playPop();
  saveGame(true);
}

// Attach clicked train on tracks to open modal
canvas.addEventListener('click', (e) => {
  if (placingBuilding || activeTool !== "select") return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const world = screenToWorld(mouseX, mouseY);

  // Check if click intersects train track area (rows 0, 1, 2)
  if (world.ty >= 0 && world.ty <= 2 && world.tx >= 0 && world.tx < MAP_SIZE) {
    const clickedTrackId = world.ty === 0 ? "express" : world.ty === 1 ? "local" : "metro";
    openTrainModal(clickedTrackId);
  }
});

// ==========================================================================
// PARTICLE ANIMATIONS RENDERING (CANVAS DRAWS ON SCREEN)
// ==========================================================================
function spawnFloatingText(text, x, y, color = "#fff") {
  particleEngine.floatingTexts.push({
    text, x, y, color, startTime: Date.now(), duration: 1000
  });
}

function spawnFlyingParticle(itemType, startX, startY, destinationSelector) {
  const target = document.querySelector(destinationSelector);
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const endX = rect.left + rect.width / 2;
  const endY = rect.top + rect.height / 2;

  particleEngine.particles.push({
    item: itemType,
    sx: startX, sy: startY,
    ex: endX, ey: endY,
    cx: (startX + endX) / 2 + (Math.random() - 0.5) * 150,
    cy: Math.min(startY, endY) - 120, // arc peak
    startTime: Date.now(), duration: 750,
    targetEl: target
  });
}

function drawParticles(time) {
  const now = Date.now();

  // Draw floating text
  ctx.save();
  particleEngine.floatingTexts = particleEngine.floatingTexts.filter(t => {
    const elapsed = now - t.startTime;
    if (elapsed > t.duration) return false;

    const pct = elapsed / t.duration;
    const dy = -40 * pct;
    const opacity = 1 - pct;

    ctx.fillStyle = t.color;
    ctx.globalAlpha = opacity;
    ctx.font = "bold 14px Outfit";
    ctx.fillText(t.text, t.x, t.y + dy);
    return true;
  });
  ctx.restore();

  // Draw flying particle items
  ctx.save();
  particleEngine.particles = particleEngine.particles.filter(p => {
    const elapsed = now - p.startTime;
    if (elapsed > p.duration) {
      // finish bounce
      p.targetEl.style.transform = "scale(1.15)";
      setTimeout(() => p.targetEl.style.transform = "none", 120);
      return false;
    }

    const pct = elapsed / p.duration;
    
    // Bezier curve calculations
    const x = (1 - pct) * (1 - pct) * p.sx + 2 * (1 - pct) * pct * p.cx + pct * pct * p.ex;
    const y = (1 - pct) * (1 - pct) * p.sy + 2 * (1 - pct) * pct * p.cy + pct * pct * p.ey;

    const scale = 1.3 - pct * 0.7;
    const opacity = pct > 0.8 ? (1 - pct) * 5 : 1;

    ctx.globalAlpha = opacity;
    ctx.font = `${Math.round(22 * scale)}px Arial`;
    const emoji = ITEM_EMOJIS[p.item] || "⭐";
    ctx.fillText(emoji, x - 10, y + 6);

    return true;
  });
  ctx.restore();
}
