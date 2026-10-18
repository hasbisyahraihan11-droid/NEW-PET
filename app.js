/* =========================================
   MIMI'S PIXEL WORLD
   Pixel pet + games + sleep + Supabase
========================================= */

// Isi setelah membuat project Supabase.
// Gunakan Project URL dan publishable key (atau anon key lama).
const SUPABASE_URL = "https://clzaohchgcigvjmasgke.supabase.co";
const SUPABASE_KEY = "sb_publishable_uWzC4hMSZcnQjCMQi3OH7w_Xr97SdnF";

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "mimi_pixel_world_v3";
const SLEEP_SECONDS = 30;

const db = window.supabase && SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_KEY.includes("PASTE_")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const PETS = {
  cat: {
    name: "Pixel Cat",
    pattern: [
      "................",
      "....##......##..",
      "...####....####.",
      "...############.",
      "..##############",
      "..##############",
      ".###############",
      ".###..####..####",
      ".###..####..####",
      ".##############.",
      ".##############.",
      ".##############.",
      "..############..",
      "..###.####.###..",
      "..###.####.###..",
      "...##......##..."
    ]
  },
  bunny: {
    name: "Pixel Bunny",
    pattern: [
      ".....##....##...",
      ".....##....##...",
      ".....##....##...",
      "....###....###..",
      "....###....###..",
      "...############.",
      "..##############",
      "..##############",
      "..###..####..###.",
      "..###..####..###.",
      "..##############",
      "..##############",
      "...############.",
      "...###.####.###..",
      "...###.####.###..",
      "....##......##..."
    ]
  },
  dog: {
    name: "Pixel Dog",
    pattern: [
      "................",
      "...####....####.",
      "..######..######",
      "..######..######",
      ".###############.",
      ".###############.",
      ".###############.",
      ".###..####..####.",
      ".###..####..####.",
      ".###############.",
      ".#######..######.",
      ".###############.",
      "..##############.",
      "..###.######.###..",
      "..###.######.###..",
      "...##........##..."
    ]
  },
  slime: {
    name: "Pixel Slime",
    pattern: [
      "................",
      "................",
      "......####......",
      "....########....",
      "...##########...",
      "..############..",
      ".##############.",
      ".##############.",
      ".###..####..###..",
      ".###..####..###..",
      ".##############.",
      ".##############.",
      ".##############.",
      "..############..",
      "...##########...",
      "................"
    ]
  }
};

// Pixel grid: # = badan, . = transparan.
// Mata dan mulut digambar terpisah supaya bentuknya konsisten.
const ACCESSORIES = [
  {
    id: "none", name: "No Accessory", price: 0, free: true,
    pattern: [".", ".", "."], colors: {}
  },
  {
    id: "crown", name: "Royal Crown", price: 0, free: true,
    pattern: [
      "...Y.....Y...",
      "..YYY...YYY..",
      "..YYYYYYYYY..",
      ".YYYYYYYYYYY.",
      ".YYYYYYYYYYY.",
      ".YYYYYYYYYYY."
    ],
    colors: { Y: "#ffd83d" }
  },
  {
    id: "bow", name: "Pink Bow", price: 25,
    pattern: [
      "RRR...RRR",
      "RRRR.RRRR",
      ".RRRRRRR.",
      "..RRRRR..",
      "...RRR..."
    ],
    colors: { R: "#ff77ad" }
  },
  {
    id: "flower", name: "Pixel Flower", price: 30,
    pattern: [
      "..PPP..",
      ".PPPPP.",
      "PPYPPPP",
      ".PPPPP.",
      "..PPP..",
      "...G...",
      "...G..."
    ],
    colors: { P: "#ff8cc0", Y: "#ffdb57", G: "#53b87e" }
  },
  {
    id: "glasses", name: "Pixel Glasses", price: 35,
    pattern: [
      "BB....BB",
      "BBBBBBBB",
      "BB....BB",
      "...BB..."
    ],
    colors: { B: "#3b355d" }
  },
  {
    id: "halo", name: "Golden Halo", price: 40,
    pattern: [
      "..YYYYYYY..",
      ".YY.....YY.",
      "YY.......YY"
    ],
    colors: { Y: "#ffcf42" }
  },
  {
    id: "star", name: "Star Crown", price: 45,
    pattern: [
      "...Y...Y...",
      "..YYY.YYY..",
      "...YYYYY...",
      ".YYYYYYYYY.",
      "..YYYYYYY.."
    ],
    colors: { Y: "#ffe14d" }
  }
];

const DECORATIONS = [
  { id: "plant", name: "Pixel Plant", price: 20, icon: "♣" },
  { id: "lamp", name: "Star Lamp", price: 30, icon: "✦" },
  { id: "teddy", name: "Tiny Teddy", price: 35, icon: "▣" },
  { id: "heart", name: "Heart Pillow", price: 25, icon: "♥" },
  { id: "moon", name: "Moon Light", price: 40, icon: "☾" },
  { id: "rainbow", name: "Pixel Rainbow", price: 50, icon: "▥" }
];

const DEFAULT_STATE = {
  playerName: "Player",
  petName: "Mimi",
  petType: "cat",
  petColor: "#ffb6ce",
  hunger: 80,
  happiness: 80,
  energy: 100,
  clean: 100,
  level: 1,
  exp: 0,
  coins: 100,
  equipped: "none",
  ownedAccessories: ["none", "crown"],
  ownedDecorations: [],
  equippedDecoration: "",
  theme: "mint",
  customAccessories: [],
  careCount: 0,
  gamesPlayed: 0,
  questClaimed: false,
  sleepUntil: 0,
  lastTick: Date.now()
};

let state = loadLocal();
let session = null;
let authMode = "login";
let toastTimer = null;
let sleepInterval = null;
let catchInterval = null;
let catchActive = false;
let catchScore = 0;
let catchTime = 15;
let memoryDeck = [];
let memoryOpen = [];
let memoryLocked = false;
let memoryMatches = 0;
let memoryStarted = false;
let editorPixels = Array(77).fill("");
let eraseMode = false;
let saving = false;
let saveQueued = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? { ...clone(DEFAULT_STATE), ...JSON.parse(raw) } : clone(DEFAULT_STATE);
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function saveLocal() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  $("saveStatus").textContent = session ? "SAVING CLOUD..." : "LOCAL SAVE READY";
}

async function saveGame() {
  saveLocal();
  if (!db || !session) return;
  if (saving) {
    saveQueued = true;
    return;
  }

  saving = true;
  try {
    const { error } = await db.from("mimi_saves").upsert({
      user_id: session.user.id,
      save_data: state,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

    if (error) throw error;
    $("saveStatus").textContent = "CLOUD SAVE ✓";
  } catch (error) {
    console.error("Cloud save error:", error);
    $("saveStatus").textContent = "LOCAL SAVE · CLOUD ERROR";
  } finally {
    saving = false;
    if (saveQueued) {
      saveQueued = false;
      saveGame();
    }
  }
}

async function loadCloudSave() {
  if (!db || !session) return;
  try {
    const { data, error } = await db
      .from("mimi_saves")
      .select("save_data")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (data && data.save_data) {
      state = { ...clone(DEFAULT_STATE), ...data.save_data };
      saveLocal();
    } else {
      await saveGame();
    }
    renderAll();
    toast("Cloud save berhasil dimuat!");
  } catch (error) {
    console.error("Cloud load error:", error);
    toast("Cloud save gagal dimuat. Local save tetap tersedia.");
  }
}

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function addExp(amount) {
  state.exp += amount;
  while (state.exp >= 100) {
    state.exp -= 100;
    state.level += 1;
    state.coins += 20;
    toast("LEVEL UP! Bonus 20 coins!");
  }
}

function changeCoins(amount) {
  if (amount < 0 && state.coins < Math.abs(amount)) {
    toast("Koin lu belum cukup, bro!");
    return false;
  }
  state.coins += amount;
  renderCoins();
  return true;
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
}

function renderCoins() {
  $("coins").textContent = state.coins;
}

function updateStat(name, value) {
  const val = clamp(value);
  $(name + "Value").textContent = Math.round(val) + "%";
  $(name + "Bar").style.width = val + "%";
}

function isSleeping() {
  return state.sleepUntil > Date.now();
}

function tickNeeds() {
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(3600, (now - (state.lastTick || now)) / 1000));
  state.lastTick = now;

  if (isSleeping()) {
    state.energy = clamp(state.energy + elapsed * 1.1);
    state.hunger = clamp(state.hunger - elapsed * 0.12);
    if (state.sleepUntil <= now) finishSleep();
  } else {
    state.hunger = clamp(state.hunger - elapsed * 0.16);
    state.happiness = clamp(state.happiness - elapsed * 0.07);
    state.energy = clamp(state.energy - elapsed * 0.10);
    state.clean = clamp(state.clean - elapsed * 0.05);
  }
}

function renderStats() {
  updateStat("hunger", state.hunger);
  updateStat("happiness", state.happiness);
  updateStat("energy", state.energy);
  updateStat("clean", state.clean);
  $("levelValue").textContent = state.level;
  $("expValue").textContent = state.exp;
  $("expBar").style.width = Math.min(100, state.exp) + "%";

  let mood = "Feeling happy!";
  if (state.hunger < 25) mood = "Mimi is hungry...";
  else if (state.energy < 20) mood = "Mimi is tired...";
  else if (state.clean < 25) mood = "Mimi needs a bath!";
  else if (state.happiness < 30) mood = "Mimi needs some fun!";
  $("petMood").textContent = isSleeping() ? "Sweet dreams, Mimi..." : mood;

  $("careQuestText").textContent = `Care actions: ${Math.min(3, state.careCount)}/3`;
  $("gameQuestText").textContent = `Games played: ${Math.min(1, state.gamesPlayed)}/1`;
  $("claimQuestButton").disabled = state.questClaimed ||
    state.careCount < 3 || state.gamesPlayed < 1;
  $("claimQuestButton").textContent = state.questClaimed
    ? "QUEST COMPLETED ✓" : "CLAIM REWARD +25";
}

function renderPixelGrid(container, pattern, palette, options = {}) {
  container.innerHTML = "";
  const rows = pattern || [];
  const width = Math.max(1, ...rows.map(row => row.length));
  container.style.gridTemplateColumns = `repeat(${width}, 8px)`;
  container.style.gridAutoRows = "8px";

  for (const row of rows) {
    for (let x = 0; x < width; x++) {
      const ch = row[x] || ".";
      const cell = document.createElement("div");
      cell.className = "pixel-cell";
      if (ch === ".") {
        cell.classList.add("empty");
      } else {
        cell.style.background = palette[ch] || palette["#"] || "#ffffff";
      }
      container.appendChild(cell);
    }
  }
}

function renderPet(container, type, color) {
  const pet = PETS[type] || PETS.cat;
  const pattern = pet.pattern;
  container.innerHTML = "";
  container.style.gridTemplateColumns = "repeat(16, 8px)";
  container.style.gridTemplateRows = "repeat(16, 8px)";

  pattern.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[x] || ".";
      const cell = document.createElement("div");
      cell.className = "pixel-cell";

      if (ch === ".") {
        cell.classList.add("empty");
      } else {
        let pixelColor = color;
        const eyeRow = y === 7 || y === 8;
        const eyeCol = (x >= 4 && x <= 5) || (x >= 10 && x <= 11);

        if (eyeRow && eyeCol && ch === "#") pixelColor = "#302641";
        if (y === 10 && (x === 7 || x === 8)) pixelColor = "#d96d91";
        if (x === 1 || x === 14) pixelColor = shadeColor(color, -18);
        cell.style.background = pixelColor;
      }
      container.appendChild(cell);
    }
  });
}

function shadeColor(hex, amount) {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ffb6ce";
  const num = parseInt(clean.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function getAccessory(id) {
  return ACCESSORIES.find(item => item.id === id) ||
    state.customAccessories.find(item => item.id === id) || null;
}

function drawAccessory(container, item) {
  container.innerHTML = "";
  if (!item || item.id === "none") {
    container.style.display = "none";
    return;
  }
  container.style.display = "grid";
  const pattern = item.pattern || [];
  const width = Math.max(1, ...pattern.map(row => row.length));
  container.style.gridTemplateColumns = `repeat(${width}, 8px)`;
  container.style.gridAutoRows = "8px";

  pattern.forEach(row => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] || ".";
      const cell = document.createElement("div");
      cell.className = "pixel-cell";
      if (ch === ".") {
        cell.classList.add("empty");
      } else {
        cell.style.background = (item.colors && item.colors[ch]) || "#ffd83d";
      }
      container.appendChild(cell);
    }
  });
}

function renderRoom() {
  $("roomScene").className = "room-scene room-" + state.theme;
  $("roomLabel").textContent = (state.petName || "MIMI").toUpperCase() + "'S ROOM";
  const deco = DECORATIONS.find(item => item.id === state.equippedDecoration);
  $("roomDeco").textContent = deco ? deco.icon : "";
}

function renderSleep() {
  const sleeping = isSleeping();
  $("sleepBubble").hidden = !sleeping;
  $("sleepButton").textContent = sleeping ? "WAKE UP" : "☾ SLEEP";
  $("sleepStatus").textContent = sleeping ? "☾ Sleeping..." : "☾ Sleep schedule";

  if (sleeping) {
    const remaining = Math.max(0, Math.ceil((state.sleepUntil - Date.now()) / 1000));
    $("sleepText").textContent = `Bangun dalam ${remaining} detik.`;
    $("sleepProgress").style.width =
      (100 * (SLEEP_SECONDS - Math.min(SLEEP_SECONDS, remaining)) / SLEEP_SECONDS) + "%";
  } else {
    $("sleepText").textContent = "Mimi masih terjaga.";
    $("sleepProgress").style.width = "0%";
  }
}

function renderAccessoryList() {
  const list = $("accessoryList");
  list.innerHTML = "";
  const owned = [...new Set(state.ownedAccessories || ["none", "crown"])];
  const items = [
    ACCESSORIES[0],
    ...ACCESSORIES.filter(item => item.id !== "none" && owned.includes(item.id)),
    ...(state.customAccessories || [])
  ];

  $("accessoryCount").textContent = Math.max(0, items.length - 1) + " OWNED";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "accessory-card" + (state.equipped === item.id ? " selected" : "");

    const preview = document.createElement("div");
    preview.className = "item-icon";
    const pixels = document.createElement("div");
    pixels.className = "pixel-accessory";
    pixels.style.position = "static";
    pixels.style.transform = "none";
    drawAccessory(pixels, item);
    preview.appendChild(pixels);

    const title = document.createElement("b");
    title.textContent = item.name;
    const desc = document.createElement("p");
    desc.textContent = state.equipped === item.id ? "Currently equipped" : "Owned accessory";
    const button = document.createElement("button");
    button.textContent = state.equipped === item.id ? "EQUIPPED" : "EQUIP";
    button.disabled = state.equipped === item.id;
    button.addEventListener("click", () => {
      state.equipped = item.id;
      saveGame();
      renderAll();
      toast(item.name + " equipped!");
    });

    card.append(preview, title, desc, button);
    list.appendChild(card);
  });
}

function renderAll() {
  renderCoins();
  renderStats();
  renderSleep();
  renderRoom();

  $("playerName").textContent = state.playerName || "Player";
  $("petName").textContent = state.petName || "Mimi";
  $("petSelect").value = state.petType;
  $("petColor").value = state.petColor;

  renderPet($("petSprite"), state.petType, state.petColor);
  renderPet($("wardrobePet"), state.petType, state.petColor);

  drawAccessory($("petAccessory"), getAccessory(state.equipped));
  drawAccessory($("wardrobeAccessory"), getAccessory(state.equipped));

  renderAccessoryList();
  renderShop();
  renderThemeButtons();
  renderAuthButton();
  updateQuest();
}

function updateQuest() {
  $("careQuestText").textContent = `Care actions: ${Math.min(3, state.careCount)}/3`;
  $("gameQuestText").textContent = `Games played: ${Math.min(1, state.gamesPlayed)}/1`;
  $("claimQuestButton").disabled = state.questClaimed ||
    state.careCount < 3 || state.gamesPlayed < 1;
  $("claimQuestButton").textContent = state.questClaimed
    ? "QUEST COMPLETED ✓" : "CLAIM REWARD +25";
}

function care(action) {
  if (isSleeping()) {
    toast("Mimi lagi tidur, bro. Bangunkan dulu!");
    return;
  }

  if (action === "feed") {
    state.hunger = clamp(state.hunger + 25);
    state.happiness = clamp(state.happiness + 3);
    state.clean = clamp(state.clean - 2);
    toast("Nyam nyam! Mimi sudah makan.");
  } else if (action === "play") {
    if (state.energy < 10) return toast("Energi Mimi terlalu rendah!");
    state.happiness = clamp(state.happiness + 15);
    state.energy = clamp(state.energy - 10);
    addExp(5);
    toast("Mimi senang bermain!");
  } else if (action === "clean") {
    state.clean = clamp(state.clean + 35);
    state.happiness = clamp(state.happiness + 2);
    toast("Mimi jadi bersih!");
  } else if (action === "heal") {
    state.hunger = clamp(state.hunger + 8);
    state.happiness = clamp(state.happiness + 8);
    state.energy = clamp(state.energy + 8);
    state.clean = clamp(state.clean + 8);
    toast("Mimi merasa lebih baik!");
  }

  state.careCount += 1;
  addExp(3);
  renderAll();
  saveGame();
}

function startSleep() {
  if (isSleeping()) {
    state.sleepUntil = Date.now();
    finishSleep();
    return;
  }
  state.sleepUntil = Date.now() + SLEEP_SECONDS * 1000;
  state.lastTick = Date.now();
  toast("Selamat tidur, Mimi! Zzz...");
  renderAll();
  saveGame();
}

function finishSleep() {
  state.sleepUntil = 0;
  state.energy = clamp(state.energy + 30);
  state.happiness = clamp(state.happiness + 5);
  state.lastTick = Date.now();
  renderAll();
  saveGame();
  toast("Mimi sudah bangun dan lebih segar!");
}

function renderThemeButtons() {
  document.querySelectorAll(".theme-btn").forEach(button => {
    button.classList.toggle("selected", button.dataset.theme === state.theme);
  });
}

function renderShop() {
  const accessories = $("shopAccessories");
  accessories.innerHTML = "";

  ACCESSORIES.filter(item => item.id !== "none").forEach(item => {
    const owned = (state.ownedAccessories || []).includes(item.id);
    const card = document.createElement("div");
    card.className = "shop-item";
    const icon = document.createElement("div");
    icon.className = "item-icon";
    const preview = document.createElement("div");
    preview.className = "pixel-accessory";
    preview.style.position = "static";
    preview.style.transform = "none";
    drawAccessory(preview, item);
    icon.appendChild(preview);

    const title = document.createElement("b");
    title.textContent = item.name;
    const price = document.createElement("p");
    price.textContent = owned ? "Already owned" : item.price + " coins";
    const button = document.createElement("button");
    button.textContent = owned ? "OWNED" : "BUY";
    button.disabled = owned;
    button.addEventListener("click", () => buyAccessory(item));
    card.append(icon, title, price, button);
    accessories.appendChild(card);
  });

  const decoShop = $("shopDecorations");
  decoShop.innerHTML = "";
  DECORATIONS.forEach(item => {
    const owned = (state.ownedDecorations || []).includes(item.id);
    const card = document.createElement("div");
    card.className = "shop-item";
    const icon = document.createElement("div");
    icon.className = "item-icon";
    icon.textContent = item.icon;
    const title = document.createElement("b");
    title.textContent = item.name;
    const price = document.createElement("p");
    price.textContent = owned ? "Owned" : item.price + " coins";
    const button = document.createElement("button");
    button.textContent = owned ? (state.equippedDecoration === item.id ? "EQUIPPED" : "EQUIP") : "BUY";
    button.addEventListener("click", () => {
      if (owned) {
        state.equippedDecoration = item.id;
        saveGame();
        renderAll();
        toast(item.name + " dipasang!");
      } else if (changeCoins(-item.price)) {
        state.ownedDecorations.push(item.id);
        state.equippedDecoration = item.id;
        saveGame();
        renderAll();
        toast("Dekorasi berhasil dibeli!");
      }
    });
    card.append(icon, title, price, button);
    decoShop.appendChild(card);
  });
}

function buyAccessory(item) {
  if ((state.ownedAccessories || []).includes(item.id)) {
    toast("Aksesori ini sudah lu punya!");
    return;
  }
  if (!changeCoins(-item.price)) return;
  state.ownedAccessories.push(item.id);
  state.equipped = item.id;
  addExp(2);
  saveGame();
  renderAll();
  toast(item.name + " berhasil dibeli!");
}

function switchPage(page) {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active-page", section.id === page + "Page");
  });
  if (page === "wardrobe") renderAccessoryList();
  if (page === "shop") renderShop();
}

function setupEditor() {
  const editor = $("pixelEditor");
  editor.innerHTML = "";
  editorPixels.forEach((color, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "editor-cell" + (color ? " filled" : "");
    cell.setAttribute("aria-label", "Pixel " + (index + 1));
    cell.style.background = color || "#fff";
    cell.addEventListener("click", () => {
      editorPixels[index] = eraseMode ? "" : $("editorColor").value;
      cell.style.background = editorPixels[index] || "#fff";
      cell.classList.toggle("filled", Boolean(editorPixels[index]));
    });
    editor.appendChild(cell);
  });
}

function saveCustomAccessory() {
  const name = $("customAccessoryName").value.trim();
  if (!name) {
    toast("Kasih nama aksesori buatan lu dulu!");
    return;
  }
  if (!editorPixels.some(Boolean)) {
    toast("Gambar dulu beberapa pixel, bro!");
    return;
  }

  const rows = [];
  const colors = {};
  let colorIndex = 0;
  const colorKeys = "ABCDEFGHIJKLMNOPQRSTUVW";
  for (let y = 0; y < 7; y++) {
    let row = "";
    for (let x = 0; x < 11; x++) {
      const color = editorPixels[y * 11 + x];
      if (!color) {
        row += ".";
      } else {
        let key = Object.keys(colors).find(k => colors[k] === color);
        if (!key) {
          key = colorKeys[colorIndex % colorKeys.length];
          colorIndex++;
          colors[key] = color;
        }
        row += key;
      }
    }
    rows.push(row);
  }

  const id = "custom_" + Date.now();
  state.customAccessories.push({ id, name, price: 0, pattern: rows, colors });
  state.equipped = id;
  state.ownedAccessories.push(id);
  editorPixels = Array(77).fill("");
  $("customAccessoryName").value = "";
  setupEditor();
  renderAll();
  saveGame();
  toast("Aksesori pixel custom berhasil disimpan!");
}

function startCatchGame() {
  if (catchActive) return;
  catchActive = true;
  catchScore = 0;
  catchTime = 15;
  $("catchScore").textContent = catchScore;
  $("catchTimer").textContent = catchTime;
  $("catchArena").innerHTML = "";
  $("startCatch").disabled = true;

  const spawnStar = () => {
    if (!catchActive) return;
    const star = document.createElement("button");
    star.className = "catch-star";
    star.textContent = "★";
    star.setAttribute("aria-label", "Catch star");
    star.style.left = Math.random() * 80 + "%";
    star.style.top = Math.random() * 75 + "%";
    star.addEventListener("click", () => {
      if (!catchActive) return;
      catchScore++;
      $("catchScore").textContent = catchScore;
      star.remove();
      spawnStar();
    });
    $("catchArena").appendChild(star);
  };

  spawnStar();
  catchInterval = setInterval(() => {
    catchTime--;
    $("catchTimer").textContent = catchTime;
    if (catchTime <= 0) {
      clearInterval(catchInterval);
      catchActive = false;
      $("startCatch").disabled = false;
      const reward = Math.min(35, catchScore * 2);
      changeCoins(reward);
      addExp(Math.min(20, catchScore));
      state.gamesPlayed++;
      state.happiness = clamp(state.happiness + Math.min(15, catchScore));
      saveGame();
      renderAll();
      $("catchArena").innerHTML = `<div class="arena-hint">Time's up! Skor ${catchScore} · +${reward} coins</div>`;
      toast(`Game selesai! Kamu mendapat ${reward} coins.`);
    }
  }, 1000);
}

function startMemoryGame() {
  memoryDeck = ["♥", "★", "♫", "✿", "☾", "♦", "♥", "★", "♫", "✿", "☾", "♦"]
    .sort(() => Math.random() - 0.5);
  memoryOpen = [];
  memoryLocked = false;
  memoryMatches = 0;
  memoryStarted = true;
  $("memoryPairs").textContent = "0";
  renderMemoryBoard();
}

function renderMemoryBoard() {
  const board = $("memoryBoard");
  board.innerHTML = "";
  memoryDeck.forEach((symbol, index) => {
    const card = document.createElement("button");
    card.className = "memory-card";
    card.textContent = memoryOpen.includes(index) || card.dataset.matched ? symbol : "?";
    card.setAttribute("aria-label", "Memory card " + (index + 1));

    if (memoryOpen.includes(index) || card.dataset.matched) {
      card.classList.add("open");
      card.textContent = symbol;
    } else {
      card.textContent = "?";
    }

    if (memoryDeck[index] === null) {
      card.classList.add("matched");
      card.textContent = "✓";
      card.disabled = true;
    }

    card.addEventListener("click", () => flipMemoryCard(index));
    board.appendChild(card);
  });
}

function flipMemoryCard(index) {
  if (!memoryStarted || memoryLocked || memoryOpen.includes(index) || memoryDeck[index] === null) return;
  memoryOpen.push(index);
  renderMemoryBoard();

  if (memoryOpen.length === 2) {
    const [a, b] = memoryOpen;
    if (memoryDeck[a] === memoryDeck[b]) {
      memoryDeck[a] = null;
      memoryDeck[b] = null;
      memoryOpen = [];
      memoryMatches++;
      $("memoryPairs").textContent = memoryMatches;
      renderMemoryBoard();

      if (memoryMatches === 6) {
        memoryStarted = false;
        changeCoins(30);
        addExp(20);
        state.gamesPlayed++;
        state.happiness = clamp(state.happiness + 15);
        saveGame();
        renderAll();
        toast("Memory Match menang! +30 coins!");
      }
    } else {
      memoryLocked = true;
      setTimeout(() => {
        memoryOpen = [];
        memoryLocked = false;
        renderMemoryBoard();
      }, 700);
    }
  }
}

function renderAuthButton() {
  $("authButton").textContent = session ? "ACCOUNT" : "LOGIN";
  $("logoutButton").hidden = !session;
  $("submitAuth").hidden = Boolean(session);
  $("toggleAuthMode").hidden = Boolean(session);
  $("authTitle").textContent = session ? "Account connected" :
    (authMode === "login" ? "Login to Mimi" : "Create your account");
}

async function openAuth() {
  if (session) {
    $("authEmail").value = session.user.email || "";
    $("authPassword").value = "";
    $("authDialog").showModal();
    renderAuthButton();
    return;
  }
  if (!db) {
    toast("Atur Supabase URL dan key di app.js dulu, bro.");
  }
  $("authDialog").showModal();
}

async function submitAuth(event) {
  event.preventDefault();
  if (!db) {
    toast("Supabase belum dikonfigurasi. Cek URL dan key.");
    return;
  }

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  $("submitAuth").disabled = true;

  try {
    let result;
    if (authMode === "signup") {
      result = await db.auth.signUp({ email, password });
    } else {
      result = await db.auth.signInWithPassword({ email, password });
    }
    if (result.error) throw result.error;

    session = result.data.session;
    if (!session && authMode === "signup") {
      toast("Cek email untuk konfirmasi akun jika diminta.");
      return;
    }

    $("authDialog").close();
    if (session) await loadCloudSave();
    renderAuthButton();
    toast(session ? "Login berhasil!" : "Pendaftaran berhasil!");
  } catch (error) {
    console.error("Auth error:", error);
    toast(error.message || "Login gagal. Periksa email dan password.");
  } finally {
    $("submitAuth").disabled = false;
  }
}

async function logout() {
  if (db && session) {
    try {
      await saveGame();
      const { error } = await db.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
  session = null;
  $("authDialog").close();
  renderAuthButton();
  toast("Logout berhasil. Local save tetap ada di perangkat.");
}

function setupEvents() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  });

  document.querySelectorAll("[data-care]").forEach(button => {
    button.addEventListener("click", () => care(button.dataset.care));
  });

  $("sleepButton").addEventListener("click", startSleep);
  $("petSelect").addEventListener("change", event => {
    state.petType = event.target.value;
    renderAll();
    saveGame();
  });
  $("petColor").addEventListener("input", event => {
    state.petColor = event.target.value;
    renderPet($("petSprite"), state.petType, state.petColor);
    renderPet($("wardrobePet"), state.petType, state.petColor);
    saveGame();
  });

  $("renameButton").addEventListener("click", () => {
    const name = prompt("Nama baru untuk pet kamu:", state.petName);
    if (name && name.trim()) {
      state.petName = name.trim().slice(0, 20);
      renderAll();
      saveGame();
    }
  });

  document.querySelectorAll(".theme-btn").forEach(button => {
    button.addEventListener("click", () => {
      state.theme = button.dataset.theme;
      renderAll();
      saveGame();
    });
  });

  $("editorErase").addEventListener("click", () => {
    eraseMode = !eraseMode;
    $("editorErase").textContent = eraseMode ? "ERASER ON" : "ERASER";
  });
  $("editorClear").addEventListener("click", () => {
    editorPixels = Array(77).fill("");
    setupEditor();
  });
  $("saveCustomAccessory").addEventListener("click", saveCustomAccessory);
  $("startCatch").addEventListener("click", startCatchGame);
  $("startMemory").addEventListener("click", startMemoryGame);
  $("claimQuestButton").addEventListener("click", () => {
    if (state.questClaimed || state.careCount < 3 || state.gamesPlayed < 1) return;
    state.questClaimed = true;
    changeCoins(25);
    addExp(15);
    saveGame();
    renderAll();
    toast("Daily quest selesai! +25 coins!");
  });

  $("authButton").addEventListener("click", openAuth);
  $("closeAuth").addEventListener("click", () => $("authDialog").close());
  $("authForm").addEventListener("submit", submitAuth);
  $("toggleAuthMode").addEventListener("click", () => {
    authMode = authMode === "login" ? "signup" : "login";
    $("authTitle").textContent = authMode === "login" ? "Login to Mimi" : "Create your account";
    $("submitAuth").textContent = authMode === "login" ? "LOGIN" : "CREATE ACCOUNT";
    $("toggleAuthMode").textContent = authMode === "login"
      ? "Belum punya akun? Daftar" : "Sudah punya akun? Login";
    $("authPassword").value = "";
  });
  $("logoutButton").addEventListener("click", logout);
}

async function initSupabase() {
  if (!db) {
    $("saveStatus").textContent = "LOCAL SAVE · SUPABASE NOT SET";
    renderAuthButton();
    return;
  }
  try {
    const { data } = await db.auth.getSession();
    session = data.session;
    if (session) await loadCloudSave();
    db.auth.onAuthStateChange((_event, newSession) => {
      session = newSession;
      renderAuthButton();
    });
  } catch (error) {
    console.error("Supabase init error:", error);
  }
}

async function init() {
  setupEvents();
  setupEditor();
  tickNeeds();
  renderAll();
  await initSupabase();

  if (sleepInterval) clearInterval(sleepInterval);
  sleepInterval = setInterval(() => {
    tickNeeds();
    renderStats();
    renderSleep();
    if (Math.floor(Date.now() / 1000) % 10 === 0) saveGame();
  }, 1000);

  window.addEventListener("beforeunload", saveLocal);
}

init();
