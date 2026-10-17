// =========================================
// MIMI PIXEL WORLD - GAME ENGINE
// =========================================

// Masukkan URL project Supabase dan publishable/anon key milikmu.
// Jangan pernah memasukkan service_role atau secret key ke frontend.
const SUPABASE_URL = "https://clzaohchgcigvjmasgke.supabase.co";
const SUPABASE_KEY = "sb_publishable_uWzC4hMSZcnQjCMQi3OH7w_Xr97SdnF";

const supabaseReady =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_KEY !== "MASUKKAN_SUPABASE_PUBLISHABLE_ATAU_ANON_KEY" &&
  Boolean(window.supabase);

const db = supabaseReady
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const $ = id => document.getElementById(id);
const MAX = 100;
const SAVE_KEY = "mimiWorldSaveV1";

const species = [
  { id: "cat", name: "Mimi the Cat", icon: "🐱", price: 0, description: "Manis, lembut, dan suka camilan.", color: "#fff1e7" },
  { id: "dog", name: "Bobo the Dog", icon: "🐶", price: 80, description: "Sahabat ceria yang suka bermain.", color: "#dfb895" },
  { id: "bunny", name: "Lulu the Bunny", icon: "🐰", price: 120, description: "Kelinci imut dengan telinga panjang.", color: "#f9e7f3" },
  { id: "slime", name: "Mochi the Slime", icon: "🟢", price: 160, description: "Slime kecil yang selalu ceria.", color: "#b6f2d0" }
];

const wardrobe = [
  { id: "bow", name: "Pink Bow", icon: "🎀", price: 20, category: "accessories", description: "Pita pink yang menggemaskan." },
  { id: "crown", name: "Royal Crown", icon: "👑", price: 75, category: "hats", description: "Mahkota untuk pet kerajaan." },
  { id: "flower", name: "Flower Clip", icon: "🌸", price: 30, category: "accessories", description: "Jepit bunga yang manis." },
  { id: "wizard", name: "Wizard Hat", icon: "🧙", price: 65, category: "hats", description: "Topi penyihir pixel." },
  { id: "halo", name: "Angel Halo", icon: "😇", price: 90, category: "hats", description: "Lingkaran cahaya di kepala." },
  { id: "heart", name: "Heart Glasses", icon: "🕶️", price: 45, category: "accessories", description: "Kacamata keren berbentuk hati." },
  { id: "star", name: "Star Hairpin", icon: "⭐", price: 25, category: "accessories", description: "Aksesori bintang kecil." },
  { id: "party", name: "Party Hat", icon: "🥳", price: 40, category: "hats", description: "Topi pesta penuh warna." }
];

const decorations = [
  { id: "bed", name: "Cozy Bed", icon: "🛏️", price: 40, description: "Tempat tidur empuk." },
  { id: "plant", name: "Little Plant", icon: "🪴", price: 25, description: "Tanaman kecil untuk kamar." },
  { id: "lamp", name: "Moon Lamp", icon: "🌙", price: 55, description: "Lampu malam yang cantik." },
  { id: "rug", name: "Pink Rug", icon: "🩷", price: 35, description: "Karpet lembut warna pink." },
  { id: "books", name: "Bookshelf", icon: "📚", price: 60, description: "Rak buku mini." },
  { id: "teddy", name: "Teddy Bear", icon: "🧸", price: 45, description: "Boneka teman Mimi." }
];

const questTemplates = [
  { id: "feed", name: "Snack Time", description: "Beri makan pet 2 kali.", target: 2, reward: 15, xp: 5 },
  { id: "play", name: "Play Together", description: "Main bersama pet 2 kali.", target: 2, reward: 20, xp: 8 },
  { id: "clean", name: "Fresh & Clean", description: "Bersihkan pet 1 kali.", target: 1, reward: 10, xp: 5 }
];

function defaultState() {
  return {
    name: "Mimi",
    species: "cat",
    energy: 70,
    hunger: 70,
    happiness: 80,
    coins: 100,
    level: 1,
    xp: 0,
    ownedSpecies: ["cat"],
    ownedWardrobe: [],
    equipped: null,
    ownedDecorations: [],
    roomDecorations: [],
    quests: {},
    questDate: localDateKey()
  };
}

function localDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

let state = loadLocal();
let currentUser = null;
let sleeping = false;
let sleepStart = 0;
let sleepEnergyStart = 0;
let sleepInterval = null;
let activeShopCategory = "hats";
let authMode = "login";
let saving = false;
let saveAgain = false;
let lastSave = 0;

function clamp(n) {
  return Math.max(0, Math.min(MAX, Math.round(n)));
}

function notify(message) {
  $("notice").textContent = message;
}

function persistLocal() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function saveGame() {
  persistLocal();

  if (!db || !currentUser) return;

  // Hindari terlalu banyak permintaan saat status berubah cepat.
  if (Date.now() - lastSave < 800) {
    saveAgain = true;
    return;
  }

  if (saving) {
    saveAgain = true;
    return;
  }

  saving = true;
  lastSave = Date.now();

  db.from("pet_saves").upsert({
    user_id: currentUser.id,
    save_data: state,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" })
    .then(({ error }) => {
      if (error) {
        console.error("Cloud save error:", error.message);
        $("cloudStatus").textContent = "Local Save";
      } else {
        $("cloudStatus").textContent = "☁ Cloud Saved";
      }
    })
    .finally(() => {
      saving = false;
      if (saveAgain) {
        saveAgain = false;
        setTimeout(saveGame, 900);
      }
    });
}

function gainXP(amount) {
  state.xp += amount;

  while (state.xp >= state.level * 20) {
    state.xp -= state.level * 20;
    state.level++;
    state.coins += 10;
    notify(`Level up! Kamu mencapai level ${state.level}! 🎉`);
  }
}

function refreshDailyQuests() {
  const today = localDateKey();

  if (state.questDate !== today) {
    state.questDate = today;
    state.quests = {};
  }

  for (const q of questTemplates) {
    if (!state.quests[q.id]) {
      state.quests[q.id] = { progress: 0, claimed: false };
    }
  }
}

function addQuestProgress(id, amount = 1) {
  refreshDailyQuests();

  const quest = questTemplates.find(q => q.id === id);
  const progress = state.quests[id];

  if (!quest || !progress || progress.claimed) return;

  progress.progress = Math.min(quest.target, progress.progress + amount);
}

function renderStats() {
  $("petName").textContent = state.name;
  $("petNameHeading").textContent = state.name;
  $("speciesLabel").textContent =
    `${species.find(s => s.id === state.species)?.icon || "🐾"} ` +
    `${species.find(s => s.id === state.species)?.name || "Pet"}`;

  $("level").textContent = state.level;
  $("coins").textContent = state.coins;
  $("xpText").textContent = `${state.xp} / ${state.level * 20} XP`;

  $("energyValue").textContent = `${state.energy}%`;
  $("hungerValue").textContent = `${state.hunger}%`;
  $("happyValue").textContent = `${state.happiness}%`;

  $("energyBar").style.width = `${state.energy}%`;
  $("hungerBar").style.width = `${state.hunger}%`;
  $("happyBar").style.width = `${state.happiness}%`;

  $("profileLevel").textContent = state.level;
  $("profileXP").textContent = `${state.xp} XP`;
  $("ownedCount").textContent =
    state.ownedWardrobe.length + state.ownedDecorations.length;

  const completed = questTemplates.filter(q =>
    state.quests[q.id]?.claimed
  ).length;

  $("questCount").textContent = `${completed}/3`;

  let mood = "Happy";
  if (state.energy < 25) mood = "Sleepy";
  else if (state.hunger < 25) mood = "Hungry";
  else if (state.happiness < 30) mood = "Lonely";
  else if (state.happiness >= 90) mood = "Super happy";

  $("moodText").textContent = sleeping
    ? "Mimi is sleeping peacefully... 🌙"
    : `Mood: ${mood}`;

  $("petSprite").className = `pet-sprite ${state.species}`;
  $("petSprite").classList.toggle("sleeping", sleeping);
  $("zzz").hidden = !sleeping;

  const accessory = wardrobe.find(i => i.id === state.equipped);
  $("petAccessory").textContent = accessory ? accessory.icon : "";

  $("feedBtn").disabled = sleeping;
  $("playBtn").disabled = sleeping;
  $("cleanBtn").disabled = sleeping;
  $("sleepBtn").disabled = sleeping;

  renderRoomDecor();
  persistLocal();
}

function renderAll() {
  refreshDailyQuests();
  renderStats();
  renderPets();
  renderWardrobe();
  renderRoomCatalog();
  renderRoomDecor();
  renderQuests();
  updateResetText();
}

function performAction(action) {
  if (sleeping) return;

  if (action === "feed") {
    if (state.coins < 3) return notify("Koin kamu belum cukup! 🪙");
    if (state.hunger >= 100) return notify("Mimi sudah kenyang! 🍓");

    state.coins -= 3;
    state.hunger = clamp(state.hunger + 25);
    state.happiness = clamp(state.happiness + 5);
    addQuestProgress("feed");
    gainXP(3);
    notify("Mimi menikmati camilannya! 🍓");
  }

  if (action === "play") {
    if (state.energy < 10) return notify("Energi Mimi terlalu rendah. Ajak tidur dulu!");
    state.energy = clamp(state.energy - 12);
    state.hunger = clamp(state.hunger - 8);
    state.happiness = clamp(state.happiness + 20);
    state.coins += 2;
    addQuestProgress("play");
    gainXP(5);
    notify("Wah, Mimi senang bermain! 🎾 +2 koin");
  }

  if (action === "clean") {
    state.happiness = clamp(state.happiness + 10);
    state.coins += 1;
    addQuestProgress("clean");
    gainXP(2);
    notify("Mimi sekarang bersih dan wangi! 🫧 +1 koin");
  }

  renderAll();
  saveGame();
}

function startSleep() {
  if (sleeping) return;

  sleeping = true;
  sleepStart = Date.now();
  sleepEnergyStart = state.energy;

  $("sleepPanel").hidden = false;
  $("sceneMessage").textContent = "Sweet dreams, Mimi... zZz";
  notify("Mimi sedang tidur. Energinya bertambah perlahan.");

  sleepInterval = setInterval(updateSleep, 250);
  updateSleep();
}

function updateSleep() {
  if (!sleeping) return;

  const elapsed = Math.min(30, (Date.now() - sleepStart) / 1000);
  const progress = elapsed / 30;

  state.energy = clamp(sleepEnergyStart + (100 - sleepEnergyStart) * progress);

  $("sleepCountdown").textContent = `${Math.ceil(30 - elapsed)}s`;
  $("sleepProgress").style.width = `${progress * 100}%`;

  renderStats();

  if (elapsed >= 30) endSleep(true);
}

function endSleep(completed = false) {
  if (!sleeping) return;

  clearInterval(sleepInterval);
  sleepInterval = null;

  if (!completed) {
    const elapsed = Math.min(30, (Date.now() - sleepStart) / 1000);
    const progress = elapsed / 30;
    state.energy = clamp(sleepEnergyStart + (100 - sleepEnergyStart) * progress);
  } else {
    state.energy = 100;
    state.happiness = clamp(state.happiness + 5);
    gainXP(5);
  }

  sleeping = false;
  $("sleepPanel").hidden = true;
  $("sleepProgress").style.width = "0%";
  $("sceneMessage").textContent = "Let's have a lovely day!";

  notify(completed
    ? "Mimi bangun segar dengan energi penuh! ☀️"
    : "Mimi dibangunkan lebih awal. ☀️");

  renderAll();
  saveGame();
}

function renderPets() {
  $("petCatalog").innerHTML = species.map(p => {
    const owned = state.ownedSpecies.includes(p.id);
    const active = state.species === p.id;

    return `
      <article class="item-card">
        <div class="item-art">${p.icon}</div>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="item-meta"><span>${active ? "Your pet" : "Pet species"}</span><b>${owned ? "✓" : `🪙 ${p.price}`}</b></div>
        <button data-species="${p.id}" ${active ? "disabled" : ""}>
          ${active ? "Currently Selected" : owned ? "Choose Pet" : "Unlock Pet"}
        </button>
      </article>`;
  }).join("");

  $("petCatalog").querySelectorAll("[data-species]").forEach(btn => {
    btn.addEventListener("click", () => chooseSpecies(btn.dataset.species));
  });
}

function chooseSpecies(id) {
  const p = species.find(s => s.id === id);
  if (!p) return;

  if (!state.ownedSpecies.includes(id)) {
    if (state.coins < p.price) return notify("Koin kamu belum cukup untuk membuka pet ini.");
    state.coins -= p.price;
    state.ownedSpecies.push(id);
  }

  state.species = id;
  notify(`${p.name} sekarang menjadi temanmu! 🐾`);
  renderAll();
  saveGame();
}

function renderWardrobe() {
  const items = wardrobe.filter(item => item.category === activeShopCategory);

  $("wardrobeCatalog").innerHTML = items.map(item => {
    const owned = state.ownedWardrobe.includes(item.id);
    const equipped = state.equipped === item.id;

    return `
      <article class="item-card">
        <div class="item-art">${item.icon}</div>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="item-meta"><span>Accessory</span><b>${owned ? "Owned" : `🪙 ${item.price}`}</b></div>
        <button data-item="${item.id}" class="${equipped ? "equipped" : ""}">
          ${equipped ? "✓ Equipped" : owned ? "Wear Item" : "Buy Item"}
        </button>
      </article>`;
  }).join("");

  $("wardrobeCatalog").querySelectorAll("[data-item]").forEach(btn => {
    btn.addEventListener("click", () => useWardrobeItem(btn.dataset.item));
  });
}

function useWardrobeItem(id) {
  const item = wardrobe.find(i => i.id === id);
  if (!item) return;

  if (state.equipped === id) {
    state.equipped = null;
    notify("Aksesori dilepas.");
  } else {
    if (!state.ownedWardrobe.includes(id)) {
      if (state.coins < item.price) return notify("Koin kamu belum cukup!");
      state.coins -= item.price;
      state.ownedWardrobe.push(id);
    }
    state.equipped = id;
    notify(`${item.name} berhasil dipasangkan! 🎀`);
  }

  renderAll();
  saveGame();
}

function renderRoomCatalog() {
  $("roomCatalog").innerHTML = decorations.map(item => {
    const owned = state.ownedDecorations.includes(item.id);
    const placed = state.roomDecorations.includes(item.id);

    return `
      <article class="item-card">
        <div class="item-art">${item.icon}</div>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="item-meta"><span>Decoration</span><b>${owned ? "Owned" : `🪙 ${item.price}`}</b></div>
        <button data-decor="${item.id}" class="${placed ? "equipped" : ""}">
          ${placed ? "✓ In Room" : owned ? "Place / Remove" : "Buy & Place"}
        </button>
      </article>`;
  }).join("");

  $("roomCatalog").querySelectorAll("[data-decor]").forEach(btn => {
    btn.addEventListener("click", () => toggleDecoration(btn.dataset.decor));
  });
}

function toggleDecoration(id) {
  const item = decorations.find(i => i.id === id);
  if (!item) return;

  if (!state.ownedDecorations.includes(id)) {
    if (state.coins < item.price) return notify("Koin kamu belum cukup!");
    state.coins -= item.price;
    state.ownedDecorations.push(id);
    state.roomDecorations.push(id);
    notify(`${item.name} dibeli dan dipasang! 🪴`);
  } else if (state.roomDecorations.includes(id)) {
    state.roomDecorations = state.roomDecorations.filter(x => x !== id);
    notify(`${item.name} disimpan di koleksi.`);
  } else {
    state.roomDecorations.push(id);
    notify(`${item.name} dipasang di kamar!`);
  }

  renderAll();
  saveGame();
}

function renderRoomDecor() {
  $("roomDecor").innerHTML = state.roomDecorations.map(id => {
    const item = decorations.find(d => d.id === id);
    return item ? `<span title="${item.name}">${item.icon}</span>` : "";
  }).join("");

  $("roomItems").innerHTML = state.roomDecorations.map(id => {
    const item = decorations.find(d => d.id === id);
    return item ? `<span title="${item.name}">${item.icon}</span>` : "";
  }).join("");
}

function renderQuests() {
  refreshDailyQuests();

  $("questCatalog").innerHTML = questTemplates.map(q => {
    const progress = state.quests[q.id];
    const done = progress.progress >= q.target;
    const percent = Math.min(100, progress.progress / q.target * 100);

    return `
      <article class="quest-card">
        <div class="quest-top">
          <h3>${q.name}</h3>
          <b>🪙 ${q.reward} · ⭐ ${q.xp} XP</b>
        </div>
        <p>${q.description}</p>
        <div class="bar"><span class="fill happy" style="width:${percent}%"></span></div>
        <div class="quest-top">
          <small>${progress.progress}/${q.target} completed</small>
          <small>${progress.claimed ? "Reward claimed" : done ? "Completed!" : "In progress"}</small>
        </div>
        <button data-claim="${q.id}" ${!done || progress.claimed ? "disabled" : ""}>
          ${progress.claimed ? "✓ Reward Claimed" : done ? "Claim Reward" : "Complete Mission"}
        </button>
      </article>`;
  }).join("");

  $("questCatalog").querySelectorAll("[data-claim]").forEach(btn => {
    btn.addEventListener("click", () => claimQuest(btn.dataset.claim));
  });
}

function claimQuest(id) {
  const q = questTemplates.find(item => item.id === id);
  const progress = state.quests[id];

  if (!q || !progress || progress.claimed || progress.progress < q.target) return;

  progress.claimed = true;
  state.coins += q.reward;
  gainXP(q.xp);
  notify(`Misi selesai! Kamu mendapat ${q.reward} koin dan ${q.xp} XP. 🎉`);

  renderAll();
  saveGame();
}

function updateResetText() {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  const ms = next - new Date();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  $("resetTime").textContent =
    `Misi diperbarui mengikuti tanggal lokal. Reset berikutnya sekitar ${hours} jam ${minutes} menit lagi.`;
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(el => {
    el.classList.toggle("active", el.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  if (page === "pets") renderPets();
  if (page === "shop") renderWardrobe();
  if (page === "room") renderRoomCatalog();
  if (page === "quests") renderQuests();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(btn => {
  btn.addEventListener("click", event => {
    event.preventDefault();
    showPage(btn.dataset.page);
  });
});

document.querySelectorAll("[data-shop]").forEach(btn => {
  btn.addEventListener("click", () => {
    activeShopCategory = btn.dataset.shop;
    document.querySelectorAll("[data-shop]").forEach(tab => {
      tab.classList.toggle("active", tab === btn);
    });
    renderWardrobe();
  });
});

$("feedBtn").addEventListener("click", () => performAction("feed"));
$("playBtn").addEventListener("click", () => performAction("play"));
$("cleanBtn").addEventListener("click", () => performAction("clean"));
$("sleepBtn").addEventListener("click", startSleep);
$("wakeBtn").addEventListener("click", () => endSleep(false));

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset progres game di perangkat ini?")) return;

  if (sleepInterval) clearInterval(sleepInterval);
  sleeping = false;
  sleepInterval = null;
  state = defaultState();
  $("sleepPanel").hidden = true;
  $("sleepProgress").style.width = "0%";

  renderAll();
  saveGame();
  notify("Progres lokal sudah direset.");
});

// =========================================
// SUPABASE AUTH + CLOUD SAVE
// =========================================

async function openAccountDialog() {
  $("authDialog").showModal();
  $("authMessage").textContent = "";

  if (currentUser) {
    $("authTitle").textContent = "Your Account";
    $("authSubmit").hidden = true;
    $("toggleAuth").hidden = true;
    $("logoutBtn").hidden = false;
    $("authEmail").value = currentUser.email || "";
    $("authEmail").disabled = true;
    $("authPassword").hidden = true;
  } else {
    $("authTitle").textContent = authMode === "login" ? "Welcome back!" : "Create your account";
    $("authSubmit").hidden = false;
    $("authSubmit").textContent = authMode === "login" ? "Login" : "Create Account";
    $("toggleAuth").hidden = false;
    $("logoutBtn").hidden = true;
    $("authEmail").disabled = false;
    $("authPassword").hidden = false;
    $("authEmail").value = "";
    $("authPassword").value = "";
    $("toggleAuth").textContent = authMode === "login"
      ? "Belum punya akun? Daftar"
      : "Sudah punya akun? Login";
  }
}

$("accountBtn").addEventListener("click", openAccountDialog);
$("closeAuth").addEventListener("click", () => $("authDialog").close());

$("toggleAuth").addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  openAccountDialog();
});

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!db) {
    $("authMessage").textContent =
      "Supabase belum dikonfigurasi. Isi URL dan publishable/anon key di app.js.";
    return;
  }

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  $("authSubmit").disabled = true;
  $("authMessage").textContent = "Memproses akun...";

  try {
    let result;

    if (authMode === "signup") {
      result = await db.auth.signUp({ email, password });
    } else {
      result = await db.auth.signInWithPassword({ email, password });
    }

    if (result.error) throw result.error;

    if (result.data.user && !result.data.session && authMode === "signup") {
      $("authMessage").textContent =
        "Akun dibuat. Cek email untuk konfirmasi, lalu login.";
      return;
    }

    currentUser = result.data.user;
    if (currentUser) await loadCloudSave();

    $("authDialog").close();
    $("accountBtn").textContent = "Account";
    $("cloudStatus").textContent = "☁ Connected";
    renderAll();
    notify("Berhasil login! Progresmu siap disimpan ke cloud. ☁️");
    saveGame();
  } catch (error) {
    $("authMessage").textContent = error.message || "Login gagal.";
  } finally {
    $("authSubmit").disabled = false;
  }
});

async function loadCloudSave() {
  if (!db || !currentUser) return;

  const { data, error } = await db
    .from("pet_saves")
    .select("save_data")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Cloud load error:", error.message);
    $("cloudStatus").textContent = "Local Save";
    notify("Login berhasil, tetapi cloud save belum bisa dimuat. Periksa SQL dan RLS.");
    return;
  }

  if (data?.save_data && typeof data.save_data === "object") {
    state = { ...defaultState(), ...data.save_data };
    refreshDailyQuests();
    persistLocal();
  } else {
    // Akun baru: salin progres lokal ke cloud.
    await db.from("pet_saves").upsert({
      user_id: currentUser.id,
      save_data: state,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
  }
}

$("logoutBtn").addEventListener("click", async () => {
  if (!db) return;

  await db.auth.signOut();
  currentUser = null;
  $("accountBtn").textContent = "Login";
  $("cloudStatus").textContent = "Local Save";
  $("authDialog").close();
  notify("Kamu sudah logout. Progres lokal di perangkat ini tetap tersimpan.");
});

async function initializeAuth() {
  if (!db) {
    $("cloudStatus").textContent = "Local Save";
    return;
  }

  $("cloudStatus").textContent = "Connecting...";

  const { data } = await db.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser) {
    await loadCloudSave();
    $("accountBtn").textContent = "Account";
    $("cloudStatus").textContent = "☁ Connected";
  } else {
    $("accountBtn").textContent = "Login";
    $("cloudStatus").textContent = "Local Save";
  }

  db.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    $("accountBtn").textContent = currentUser ? "Account" : "Login";
    $("cloudStatus").textContent = currentUser ? "☁ Connected" : "Local Save";
  });

  renderAll();
}

window.addEventListener("beforeunload", persistLocal);

renderAll();
initializeAuth();
