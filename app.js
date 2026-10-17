
const $ = id => document.getElementById(id);

const INITIAL = {
  hunger: 80,
  happy: 85,
  energy: 90,
  exp: 0,
  sleeping: false,
  lastVisit: Date.now()
};

let state;

try {
  const saved = JSON.parse(localStorage.getItem("mimi-save"));
  state = saved && typeof saved === "object"
    ? { ...INITIAL, ...saved }
    : { ...INITIAL };

  for (const key of ["hunger", "happy", "energy"]) {
    if (!Number.isFinite(state[key])) state[key] = INITIAL[key];
    state[key] = Math.max(0, Math.min(100, state[key]));
  }

  if (!Number.isFinite(state.exp) || state.exp < 0) {
    state.exp = 0;
  }

  state.sleeping = Boolean(state.sleeping);
} catch {
  state = { ...INITIAL };
}

const speech = $("speech");
const petStatus = $("petStatus");
const catButton = $("catButton");

let sleepTimer = null;
let messageTimer = null;

function save() {
  state.lastVisit = Date.now();

  try {
    localStorage.setItem("mimi-save", JSON.stringify(state));
  } catch {
    // Game tetap bisa dimainkan jika penyimpanan tidak tersedia.
  }
}

function say(message) {
  speech.textContent = message;
}

function gainExp(amount) {
  state.exp += amount;
}

function getLevel() {
  return Math.floor(state.exp / 100) + 1;
}

function heartPop() {
  const heart = document.createElement("span");
  heart.className = "heart-pop";
  heart.textContent = ["♡", "♥", "✦"][Math.floor(Math.random() * 3)];

  const rect = catButton.getBoundingClientRect();
  const hero = document.querySelector(".hero");
  const heroRect = hero.getBoundingClientRect();

  heart.style.left = (
    rect.left - heroRect.left + rect.width * (0.3 + Math.random() * 0.4)
  ) + "px";

  heart.style.top = (
    rect.top - heroRect.top + rect.height * 0.3
  ) + "px";

  hero.appendChild(heart);
  setTimeout(() => heart.remove(), 1100);
}

function render() {
  $("hungerText").textContent = state.hunger + "%";
  $("happyText").textContent = state.happy + "%";
  $("energyText").textContent = state.energy + "%";

  $("hungerBar").style.width = state.hunger + "%";
  $("happyBar").style.width = state.happy + "%";
  $("energyBar").style.width = state.energy + "%";

  const level = getLevel();
  const expInLevel = state.exp % 100;

  $("level").textContent = level;
  $("expText").textContent = `${expInLevel} / 100 EXP`;
  $("expBar").style.width = expInLevel + "%";

  $("sleepLabel").textContent = state.sleeping
    ? "Bangunkan"
    : "Tidurkan";

  document.body.classList.toggle("sleeping", state.sleeping);
  document.body.classList.toggle("playing", false);

  if (state.sleeping) {
    petStatus.textContent = "Zzz... Mimi lagi mimpi indah 🌙";
  } else if (state.hunger <= 20) {
    petStatus.textContent = "Mimi lapar, kasih makan yuk 🍓";
  } else if (state.energy <= 20) {
    petStatus.textContent = "Mimi capek, waktunya istirahat 😴";
  } else if (state.happy <= 25) {
    petStatus.textContent = "Mimi kangen diperhatikan 🥺";
  } else if (state.happy >= 90) {
    petStatus.textContent = "Mimi bahagia banget! 💗";
  } else {
    petStatus.textContent = "Senang bermain denganmu! ♡";
  }

  save();
}

function feed() {
  if (state.sleeping) {
    say("Ssst... Mimi lagi tidur 😴");
    return;
  }

  if (state.hunger >= 100) {
    say("Mimi sudah kenyang, makasih! 💗");
    return;
  }

  const oldLevel = getLevel();

  state.hunger = Math.min(100, state.hunger + 20);
  state.happy = Math.min(100, state.happy + 4);
  gainExp(5);

  say("Nyam nyam! Enak banget! 🍓");
  heartPop();
  render();

  if (getLevel() > oldLevel) say("LEVEL UP! Mimi makin hebat! ✨");
}

function petMimi() {
  if (state.sleeping) {
    say("Elus pelan-pelan ya, Mimi lagi tidur 💤");
    return;
  }

  const oldLevel = getLevel();

  state.happy = Math.min(100, state.happy + 12);
  gainExp(8);

  say("Meowww~ aku suka dielus! 💕");
  heartPop();
  render();

  if (getLevel() > oldLevel) say("LEVEL UP! Yeay! ✨");
}

function play() {
  if (state.sleeping) {
    say("Bangunkan Mimi dulu kalau mau bermain 🌙");
    return;
  }

  if (state.energy < 15) {
    say("Mimi capek. Istirahat dulu yuk 🥺");
    return;
  }

  if (state.hunger < 10) {
    say("Mimi lapar banget! Kasih makan dulu ya 🍓");
    return;
  }

  const oldLevel = getLevel();

  state.happy = Math.min(100, state.happy + 15);
  state.hunger = Math.max(0, state.hunger - 8);
  state.energy = Math.max(0, state.energy - 12);
  gainExp(15);

  say("Yeayyy! Seru banget main sama kamu! 🧶");
  heartPop();

  document.body.classList.add("playing");
  setTimeout(() => document.body.classList.remove("playing"), 1400);

  render();

  if (getLevel() > oldLevel) say("LEVEL UP! Mimi makin jago! ✨");
}

function toggleSleep() {
  if (!state.sleeping) {
    state.sleeping = true;
    say("Selamat malam, Mimi... Zzz 🌙");
  } else {
    state.sleeping = false;
    say("Mimi bangun! Selamat pagi! ☀️");
  }

  render();
}

function tick() {
  if (state.sleeping) {
    state.energy = Math.min(100, state.energy + 5);

    if (state.energy >= 100) {
      state.sleeping = false;
      say("Mimi sudah segar dan bangun! ☀️");
    }
  } else {
    state.hunger = Math.max(0, state.hunger - 1);
    state.energy = Math.max(0, state.energy - 1);
  }

  render();
}

// Tombol interaksi
$("feedBtn").addEventListener("click", feed);
$("petBtn").addEventListener("click", petMimi);
$("playBtn").addEventListener("click", play);
$("sleepBtn").addEventListener("click", toggleSleep);

catButton.addEventListener("click", petMimi);

// Tombol reset dengan konfirmasi.
$("resetBtn").addEventListener("click", () => {
  if (!confirm("Mulai dari awal? Progres Mimi akan direset.")) return;

  state = { ...INITIAL, lastVisit: Date.now() };
  say("Halo lagi! Ayo rawat Mimi dari awal! 🐾");
  render();
});

// Simulasi kebutuhan: satu menit nyata = satu poin.
setInterval(tick, 60000);

// Pulihkan energi selama Mimi tidur meskipun tab tidak aktif.
// Perubahan waktu saat tab tertutup dihitung secara terbatas.
function recoverFromAway() {
  let savedAt = Number(state.lastVisit);

  if (!Number.isFinite(savedAt) || savedAt <= 0) {
    savedAt = Date.now();
  }

  const elapsed = Math.max(
    0,
    Math.min(3600000, Date.now() - savedAt)
  );

  const minutes = Math.floor(elapsed / 60000);

  if (state.sleeping) {
    state.energy = Math.min(100, state.energy + minutes * 5);

    if (state.energy >= 100) {
      state.sleeping = false;
    }
  } else {
    state.hunger = Math.max(0, state.hunger - minutes);
    state.energy = Math.max(0, state.energy - minutes);
  }
}

recoverFromAway();
render();
