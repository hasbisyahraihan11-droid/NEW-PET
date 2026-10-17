
"use strict";

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "mimi_pixel_world_v1";

const PETS = {
  cat: {
    name: "Cat", price: 0, color: "#f5b8a1", light: "#ffe0c8",
    dark: "#8e5668", eye: "#493047",
    art: [
      "................",
      "....DD....DD....",
      "...DLLD..DLLD...",
      "...DLLLLLLLLD...",
      "..DLLLLLLLLLLD..",
      "..DLLLLLLLLLLD..",
      ".DLLLLLLLLLLLLD.",
      ".DLLLLLLLLLLLLD.",
      ".DLLLELLLLLELLD.",
      ".DLLLLLLLLLLLLD.",
      ".DLLLLLNNLLLLLD.",
      ".DLLLLLMMMLLLLD.",
      "..DLLLLLLLLLLD..",
      "...DLLLLLLLLD...",
      "...D.D....D.D...",
      "................"
    ]
  },
  dog: {
    name: "Puppy", price: 80, color: "#d9a16d", light: "#f4d4a2",
    dark: "#885637", eye: "#382b37",
    art: [
      "................",
      "...DD......DD...",
      "..DLLD......DLD..",
      "..DLLLD....DLLLD.",
      "..DLLLLLLLLLLLLD.",
      ".DLLLLLLLLLLLLLD.",
      ".DLLLLLLLLLLLLLD.",
      ".DLLLLLLLLLLLLLD.",
      ".DLLLELLLLLELLLD.",
      ".DLLLLLLLLLLLLLD.",
      ".DLLLLLLNNLLLLLD.",
      "..DLLLLLMMMLLLD..",
      "..DLLLLLLLLLLLD..",
      "...DLLLLLLLLLD...",
      "...D.D....D.D....",
      "................"
    ]
  },
  bunny: {
    name: "Bunny", price: 120, color: "#eacbe9", light: "#fff0fa",
    dark: "#a879b1", eye: "#493047",
    art: [
      "...DD......DD...",
      "...DLD....DLD...",
      "...DLLD..DLLD...",
      "...DLLD..DLLD...",
      "...DLLLLLLLLD...",
      "..DLLLLLLLLLLD..",
      "..DLLLLLLLLLLD..",
      ".DLLLLLLLLLLLLD.",
      ".DLLLELLLLLELLD.",
      ".DLLLLLLLLLLLLD.",
      ".DLLLLLNNLLLLLD.",
      ".DLLLLLMMMLLLLD.",
      "..DLLLLLLLLLLD..",
      "...DLLLLLLLLD...",
      "...D.D....D.D...",
      "................"
    ]
  },
  slime: {
    name: "Slime", price: 160, color: "#9ce8bc", light: "#d7ffe5",
    dark: "#438b78", eye: "#294f50",
    art: [
      "................",
      "................",
      "......DD........",
      ".....DLLD.......",
      "....DLLLLD......",
      "...DLLLLLLD.....",
      "..DLLLLLLLLD....",
      ".DLLLLLLLLLLD...",
      ".DLLLLLLLLLLLD..",
      ".DLLLELLLLLELD..",
      ".DLLLLLLLLLLLD..",
      ".DLLLLLMMMLLLD..",
      "..DLLLLLLLLLD...",
      "...DLLLLLLLD....",
      "................",
      "................"
    ]
  }
};

const ACCESSORIES = [
  { id: "bow", name: "Pink Bow", icon: "🎀", price: 35 },
  { id: "crown", name: "Tiny Crown", icon: "👑", price: 60 },
  { id: "flower", name: "Flower", icon: "🌸", price: 45 },
  { id: "glasses", name: "Cool Glasses", icon: "🕶️", price: 55 },
  { id: "halo", name: "Angel Halo", icon: "😇", price: 75 }
];

const DECORATIONS = [
  { id: "plant", name: "Little Plant", icon: "🪴", price: 25 },
  { id: "bear", name: "Teddy Bear", icon: "🧸", price: 50 },
  { id: "cake", name: "Birthday Cake", icon: "🎂", price: 65 },
  { id: "star", name: "Magic Star", icon: "⭐", price: 40 }
];

const ROOMS = [
  { id: "sky", name: "Sky Dream", icon: "☁️", color: "#a8c8ef" },
  { id: "pink", name: "Pink Candy", icon: "🍓", color: "#e9b8d7" },
  { id: "lavender", name: "Lavender Night", icon: "🌙", color: "#b9b1ef" },
  { id: "mint", name: "Mint Garden", icon: "🌿", color: "#b2dfc2" }
];

function freshState() {
  return {
    player: "Player",
    petName: "Mimi",
    species: "cat",
    coins: 100,
    level: 1,
    xp: 0,
    energy: 80,
    hunger: 25,
    happy: 80,
    clean: 85,
    accessory: null,
    decoration: "plant",
    room: "sky",
    ownedPets: ["cat"],
    ownedAccessories: [],
    ownedDecorations: ["plant"],
    quests: { feed: false, play: false, clean: false },
    sleepUntil: 0,
    lastTick: Date.now(),
    lastQuestDay: new Date().toDateString()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();

    const saved = JSON.parse(raw);
    const base = freshState();

    return {
      ...base,
      ...saved,
      quests: { ...base.quests, ...(saved.quests || {}) },
      ownedPets: Array.isArray(saved.ownedPets) ? saved.ownedPets : ["cat"],
      ownedAccessories: Array.isArray(saved.ownedAccessories) ? saved.ownedAccessories : [],
      ownedDecorations: Array.isArray(saved.ownedDecorations) ? saved.ownedDecorations : ["plant"]
    };
  } catch (error) {
    console.warn("Could not load save:", error);
    return freshState();
  }
}

let state = loadState();
let shopCategory = "accessories";
let sleepTimer = null;
let noticeTimer = null;

function saveState() {
  try {
    state.lastTick = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save game:", error);
    showNotice("Couldn't save. Check your browser storage.");
  }
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function showNotice(message) {
  $("notice").textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    $("notice").textContent = "Your little world is waiting for you ♡";
  }, 3000);
}

function addXP(amount) {
  state.xp += amount;

  while (state.xp >= 100) {
    state.xp -= 100;
    state.level++;
    state.coins += 25;
    showNotice(`LEVEL UP! You're now level ${state.level}! +25 coins`);
  }
}

function drawPet(species) {
  const pet = PETS[species] || PETS.cat;
  const svgGroup = $("petPixels");
  svgGroup.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";

  pet.art.forEach((line, y) => {
    [...line].forEach((pixel, x) => {
      if (pixel === ".") return;

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", "1");
      rect.setAttribute("height", "1");

      let fill = pet.color;

      if (pixel === "D") fill = pet.dark;
      if (pixel === "L") fill = pet.color;
      if (pixel === "E") fill = pet.eye;
      if (pixel === "N") fill = "#ff8ca6";
      if (pixel === "M") fill = "#a95077";

      rect.setAttribute("fill", fill);
      svgGroup.appendChild(rect);
    });
  });

  // Small highlight pixels give the sprite more depth.
  const highlights = species === "slime"
    ? [[5, 7], [6, 7], [5, 8]]
    : [[4, 6], [5, 6], [10, 6]];

  highlights.forEach(([x, y]) => {
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", "1");
    rect.setAttribute("height", "1");
    rect.setAttribute("fill", pet.light);
    svgGroup.appendChild(rect);
  });
}

function isSleeping() {
  return state.sleepUntil > Date.now();
}

function updateRoom() {
  const room = ROOMS.find(item => item.id === state.room) || ROOMS[0];
  $("scene").style.background =
    `linear-gradient(${room.color} 0%, #d6d7ed 73%, #c1b0df 73%)`;

  const decor = DECORATIONS.find(item => item.id === state.decoration);
  $("roomDeco").textContent = decor ? decor.icon : "🪴";
}

function updateStats() {
  const values = {
    energy: state.energy,
    hunger: state.hunger,
    happy: state.happy,
    clean: state.clean
  };

  Object.entries(values).forEach(([key, value]) => {
    const rounded = Math.round(clamp(value));
    $(`${key}Value`).textContent = rounded;
    $(`${key}Bar`).style.width = `${rounded}%`;
  });

  $("coins").textContent = state.coins;
  $("level").textContent = state.level;
  $("levelBadge").textContent = state.level;
  $("xpText").textContent = `${state.xp} / 100 XP`;
  $("xpBar").style.width = `${state.xp}%`;

  $("helloName").textContent = state.player;
  $("petNameHeading").textContent = state.petName;
  $("petTitle").textContent = `${state.petName} the ${PETS[state.species].name}`;

  drawPet(state.species);

  const sprite = $("petSprite");
  sprite.className = `pet-sprite ${state.species}`;
  sprite.classList.toggle("sleeping", isSleeping());

  $("zzz").hidden = !isSleeping();
  $("sleepPanel").hidden = !isSleeping();

  $("feedBtn").disabled = isSleeping();
  $("playBtn").disabled = isSleeping();
  $("cleanBtn").disabled = isSleeping();
  $("sleepBtn").disabled = isSleeping();

  if (isSleeping()) {
    $("mood").textContent = "SLEEPING...";
  } else if (state.hunger >= 75) {
    $("mood").textContent = "HUNGRY!";
  } else if (state.energy < 25) {
    $("mood").textContent = "SLEEPY...";
  } else if (state.happy < 30) {
    $("mood").textContent = "LONELY...";
  } else if (state.clean < 25) {
    $("mood").textContent = "MESSY!";
  } else {
    $("mood").textContent = "HAPPY!";
  }

  renderQuests();
  updateRoom();
}

function renderQuests() {
  const keys = ["feed", "play", "clean"];
  const completed = keys.filter(key => state.quests[key]).length;

  $("questCount").textContent = `${completed} / 3`;

  keys.forEach(key => {
    $(`quest${key[0].toUpperCase()}${key.slice(1)}`).textContent =
      state.quests[key] ? "✓" : "○";
  });
}

function resetDailyQuestsIfNeeded() {
  const today = new Date().toDateString();

  if (state.lastQuestDay !== today) {
    state.lastQuestDay = today;
    state.quests = { feed: false, play: false, clean: false };
  }
}

function completeQuest(key) {
  if (state.quests[key]) return;

  state.quests[key] = true;
  const done = Object.values(state.quests).every(Boolean);

  if (done) {
    state.coins += 40;
    addXP(25);
    showNotice("All daily quests complete! +40 coins and +25 XP!");
  } else {
    showNotice("Quest completed! Keep going!");
  }
}

function care(action) {
  if (isSleeping()) {
    showNotice("Your pet is sleeping. Let them rest!");
    return;
  }

  switch (action) {
    case "feed":
      if (state.hunger <= 0) {
        showNotice("Your pet is already full! ♡");
        return;
      }
      state.hunger = clamp(state.hunger - 30);
      state.energy = clamp(state.energy + 5);
      state.coins += 3;
      addXP(10);
      completeQuest("feed");
      showNotice("Nom nom! Your pet enjoyed the snack. +3 coins");
      break;

    case "play":
      if (state.energy < 12) {
        showNotice("Too tired to play. Let your pet rest first!");
        return;
      }
      state.energy = clamp(state.energy - 12);
      state.hunger = clamp(state.hunger + 8);
      state.happy = clamp(state.happy + 20);
      state.coins += 5;
      addXP(15);
      completeQuest("play");
      showNotice("What a fun time! +5 coins and +15 XP");
      break;

    case "clean":
      if (state.clean >= 100) {
        showNotice("Already squeaky clean! ✨");
        return;
      }
      state.clean = clamp(state.clean + 35);
      state.happy = clamp(state.happy + 5);
      addXP(10);
      completeQuest("clean");
      showNotice("Fresh and clean! Your pet looks adorable.");
      break;
  }

  saveState();
  updateStats();
}

function startSleep() {
  if (isSleeping()) return;

  state.sleepUntil = Date.now() + 30000;
  saveState();
  updateStats();
  showNotice("Sweet dreams! Energy will recover gradually.");

  if (sleepTimer) clearInterval(sleepTimer);
  sleepTimer = setInterval(updateSleep, 250);
  updateSleep();
}

function updateSleep() {
  const remaining = Math.max(0, state.sleepUntil - Date.now());
  const duration = 30000;
  const progress = clamp(((duration - remaining) / duration) * 100);

  $("sleepCountdown").textContent =
    `00:${String(Math.ceil(remaining / 1000)).padStart(2, "0")}`;
  $("sleepProgress").style.width = `${progress}%`;

  if (remaining <= 0) {
    wakePet(false);
  } else {
    // Gradual recovery: 100 energy over 30 seconds.
    const elapsed = 250;
    state.energy = clamp(state.energy + (100 / duration) * elapsed);
    state.happy = clamp(state.happy + (2 / duration) * elapsed);
    updateStats();
  }
}

function wakePet(early) {
  if (sleepTimer) {
    clearInterval(sleepTimer);
    sleepTimer = null;
  }

  const wasSleeping = state.sleepUntil > 0;
  state.sleepUntil = 0;

  if (wasSleeping && !early) {
    state.energy = 100;
    state.happy = clamp(state.happy + 5);
    addXP(10);
    showNotice("Good morning! Your pet is fully rested. +10 XP");
  } else if (early) {
    showNotice("Your pet woke up early. Take it easy!");
  }

  saveState();
  updateStats();
}

function renderPets() {
  $("petCatalog").innerHTML = "";

  Object.entries(PETS).forEach(([id, pet]) => {
    const owned = state.ownedPets.includes(id);
    const selected = state.species === id;

    const card = document.createElement("article");
    card.className = `pet-card${selected ? " selected" : ""}`;

    const preview = document.createElement("div");
    preview.className = "pet-preview";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("shape-rendering", "crispEdges");

    pet.art.forEach((line, y) => {
      [...line].forEach((pixel, x) => {
        if (pixel === ".") return;
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", 1);
        rect.setAttribute("height", 1);
        rect.setAttribute("fill",
          pixel === "D" ? pet.dark :
          pixel === "E" ? pet.eye :
          pixel === "N" ? "#ff8ca6" :
          pixel === "M" ? "#a95077" : pet.color);
        svg.appendChild(rect);
      });
    });

    preview.appendChild(svg);

    const title = document.createElement("h3");
    title.textContent = pet.name;

    const description = document.createElement("p");
    description.textContent = selected ? "Your current friend" :
      owned ? "Ready to play" : `${pet.price} coins`;

    const button = document.createElement("button");
    button.className = selected ? "small-btn" : "primary-btn";
    button.textContent = selected ? "SELECTED" : owned ? "CHOOSE PET" : `🪙 ${pet.price}`;

    button.disabled = selected;

    button.addEventListener("click", () => {
      if (!owned) {
        if (state.coins < pet.price) {
          showNotice("Not enough coins yet. Keep caring for your pet!");
          return;
        }
        state.coins -= pet.price;
        state.ownedPets.push(id);
      }

      state.species = id;
      state.accessory = null;
      saveState();
      renderPets();
      updateStats();
      showNotice(`Meet your ${pet.name}! ♡`);
    });

    card.append(preview, title, description, button);
    $("petCatalog").appendChild(card);
  });
}

function renderShop() {
  $("shopGrid").innerHTML = "";

  const items = shopCategory === "accessories" ? ACCESSORIES : DECORATIONS;
  const ownedList = shopCategory === "accessories"
    ? state.ownedAccessories
    : state.ownedDecorations;

  items.forEach(item => {
    const owned = ownedList.includes(item.id);
    const equipped = shopCategory === "accessories"
      ? state.accessory === item.id
      : state.decoration === item.id;

    const card = document.createElement("article");
    card.className = `shop-card${owned ? " owned" : ""}`;

    const icon = document.createElement("div");
    icon.className = "item-icon";
    icon.textContent = item.icon;

    const title = document.createElement("h3");
    title.textContent = item.name;

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = owned ? (equipped ? "EQUIPPED ✓" : "OWNED") : `🪙 ${item.price}`;

    const button = document.createElement("button");
    button.className = owned ? "small-btn" : "primary-btn";
    button.textContent = equipped ? "EQUIPPED" : owned ? "EQUIP" : "BUY";
    button.disabled = equipped;

    button.addEventListener("click", () => {
      if (!owned) {
        if (state.coins < item.price) {
          showNotice("Not enough coins. Complete quests to earn more!");
          return;
        }

        state.coins -= item.price;
        ownedList.push(item.id);
      }

      if (shopCategory === "accessories") {
        state.accessory = item.id;
      } else {
        state.decoration = item.id;
      }

      saveState();
      renderShop();
      updateStats();
      showNotice(`${item.name} is ready! ✨`);
    });

    card.append(icon, title, price, button);
    $("shopGrid").appendChild(card);
  });
}

function renderRooms() {
  $("roomGrid").innerHTML = "";

  ROOMS.forEach(room => {
    const card = document.createElement("article");
    card.className = `room-card${state.room === room.id ? " selected" : ""}`;

    const preview = document.createElement("div");
    preview.className = "room-preview";
    preview.style.background = room.color;
    preview.textContent = room.icon;

    const title = document.createElement("h3");
    title.textContent = room.name;

    const button = document.createElement("button");
    button.className = state.room === room.id ? "small-btn" : "primary-btn";
    button.textContent = state.room === room.id ? "CURRENT ROOM" : "USE ROOM";
    button.disabled = state.room === room.id;

    button.addEventListener("click", () => {
      state.room = room.id;
      saveState();
      renderRooms();
      updateStats();
      showNotice(`${room.name} is now your room!`);
    });

    card.append(preview, title, button);
    $("roomGrid").appendChild(card);
  });
}

function switchPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  if (pageId === "pets") renderPets();
  if (pageId === "shop") renderShop();
  if (pageId === "room") renderRooms();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function tickNeeds() {
  const now = Date.now();
  const elapsed = Math.min((now - (state.lastTick || now)) / 1000, 3600);
  state.lastTick = now;

  if (!isSleeping()) {
    state.hunger = clamp(state.hunger + elapsed * 0.12);
    state.happy = clamp(state.happy - elapsed * 0.04);
    state.clean = clamp(state.clean - elapsed * 0.025);
    state.energy = clamp(state.energy - elapsed * 0.035);
  }

  resetDailyQuestsIfNeeded();
  saveState();
  updateStats();
}

function init() {
  // Recover safely if the page was closed while the pet was sleeping.
  const now = Date.now();
  const elapsed = Math.max(0, now - (state.lastTick || now));

  if (state.sleepUntil > now) {
    const slept = Math.min(elapsed, 30000);
    state.energy = clamp(state.energy + slept / 300);
  }

  state.lastTick = now;
  resetDailyQuestsIfNeeded();

  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  });

  document.querySelectorAll("[data-shop]").forEach(button => {
    button.addEventListener("click", () => {
      shopCategory = button.dataset.shop;

      document.querySelectorAll("[data-shop]").forEach(tab => {
        tab.classList.toggle("active", tab === button);
      });

      renderShop();
    });
  });

  $("feedBtn").addEventListener("click", () => care("feed"));
  $("playBtn").addEventListener("click", () => care("play"));
  $("cleanBtn").addEventListener("click", () => care("clean"));
  $("sleepBtn").addEventListener("click", startSleep);
  $("wakeBtn").addEventListener("click", () => wakePet(true));

  $("renameBtn").addEventListener("click", () => {
    $("nameInput").value = state.player;
    $("nameDialog").showModal();
  });

  $("cancelName").addEventListener("click", () => $("nameDialog").close());

  $("nameForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("nameInput").value.trim();
    if (!name) return;

    state.player = name.slice(0, 16);
    saveState();
    updateStats();
    $("nameDialog").close();
    showNotice(`Welcome, ${state.player}! ♡`);
  });

  $("resetBtn").addEventListener("click", () => $("confirmDialog").showModal());
  $("cancelReset").addEventListener("click", () => $("confirmDialog").close());

  $("resetForm").addEventListener("submit", event => {
    event.preventDefault();

    if (sleepTimer) clearInterval(sleepTimer);

    localStorage.removeItem(SAVE_KEY);
    state = freshState();

    $("confirmDialog").close();
    switchPage("home");
    updateStats();
    renderPets();
    renderShop();
    renderRooms();
    showNotice("A fresh new adventure begins!");
  });

  updateStats();
  renderPets();
  renderShop();
  renderRooms();

  if (isSleeping()) {
    sleepTimer = setInterval(updateSleep, 250);
    updateSleep();
  }

  // Needs change slowly while the game is open.
  setInterval(tickNeeds, 10000);
}

init();
