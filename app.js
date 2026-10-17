alert("JAVASCRIPT MIMI BERJALAN!");
/* MIMI PIXEL PET — GAME ENGINE */

const SUPABASE_URL = "https://clzaohchgcigvjmasgke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uWzC4hMSZcnQjCMQi3OH7w_Xr97SdnF";

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

let user = null;
let pet = null;
let busy = false;
let toastTimer = null;
let speechTimer = null;

const defaults = {
  hunger: 80,
  happiness: 80,
  energy: 100,
  clean: 100,
  level: 1,
  exp: 0,
  coins: 0,
  last_tick: Date.now(),
  is_sleeping: false
};

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, number(value)));
}

function normalizeState(raw) {
  const state = { ...defaults, ...(raw || {}) };

  state.hunger = clamp(state.hunger);
  state.happiness = clamp(state.happiness);
  state.energy = clamp(state.energy);
  state.clean = clamp(state.clean);
  state.level = Math.max(1, Math.floor(number(state.level, 1)));
  state.exp = Math.max(0, Math.floor(number(state.exp)));
  state.coins = Math.max(0, Math.floor(number(state.coins)));
  state.last_tick = number(state.last_tick, Date.now());
  state.is_sleeping = Boolean(state.is_sleeping);

  return state;
}

function setMessage(id, message, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error", error);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2300);
}

function speak(message) {
  $("speechBubble").textContent = message;

  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    if (pet) updateMood();
  }, 3500);
}

function showLogin() {
  $("loginScreen").classList.remove("hidden");
  $("petScreen").classList.add("hidden");
}

function showGame() {
  $("loginScreen").classList.add("hidden");
  $("petScreen").classList.remove("hidden");
}

function safeColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : fallback;
}

function getState() {
  pet.pet_state = normalizeState(pet.pet_state);
  return pet.pet_state;
}

/* Ambil profil atau buat profil pertama kali */
async function getOrCreateProfile(authUser) {
  const { data, error } = await client
    .from("robot_profiles")
    .select("*")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const playerName =
    authUser.user_metadata?.display_name ||
    authUser.email?.split("@")[0] ||
    "Player";

  const { data: created, error: createError } = await client
    .from("robot_profiles")
    .insert({
      user_id: authUser.id,
      player_name: playerName,
      pet_name: "Mimi",
      body_color: "#f5f0ff",
      eye_color: "#42f5ee",
      screen_color: "#17152e",
      pet_state: { ...defaults, last_tick: Date.now() }
    })
    .select()
    .single();

  if (createError) throw createError;
  return created;
}

/* Waktu offline: kebutuhan berubah saat kembali bermain */
function applyElapsedTime() {
  const state = getState();
  const now = Date.now();
  const elapsed = Math.max(0, now - state.last_tick);

  // Maksimal 7 hari untuk menghindari perhitungan waktu ekstrem.
  const minutes = Math.min(elapsed / 60000, 7 * 24 * 60);

  if (state.is_sleeping) {
    state.energy = clamp(state.energy + minutes * 0.7);
    state.hunger = clamp(state.hunger - minutes * 0.12);
    state.clean = clamp(state.clean - minutes * 0.04);

    if (state.energy >= 100) {
      state.is_sleeping = false;
    }
  } else {
    state.hunger = clamp(state.hunger - minutes * 0.22);
    state.happiness = clamp(state.happiness - minutes * 0.12);
    state.energy = clamp(state.energy - minutes * 0.16);
    state.clean = clamp(state.clean - minutes * 0.08);
  }

  state.last_tick = now;
}

/* Tampilan */
function render() {
  if (!pet) return;

  const state = getState();

  $("playerName").textContent = pet.player_name || "Player";
  $("petNameDisplay").textContent = (pet.pet_name || "Mimi").toUpperCase();
  $("petTitle").textContent = pet.pet_name || "Mimi";
  $("petNameInput").value = pet.pet_name || "Mimi";

  $("bodyColor").value = safeColor(pet.body_color, "#f5f0ff");
  $("eyeColor").value = safeColor(pet.eye_color, "#42f5ee");

  $("robot").style.setProperty(
    "--robot-body",
    safeColor(pet.body_color, "#f5f0ff")
  );
  $("robot").style.setProperty(
    "--robot-eye",
    safeColor(pet.eye_color, "#42f5ee")
  );

  $("level").textContent = state.level;
  $("coins").textContent = state.coins;
  $("expText").textContent = `${state.exp}/100`;
  $("expBar").style.width = `${clamp(state.exp)}%`;

  setNeed("hunger", state.hunger);
  setNeed("happiness", state.happiness);
  setNeed("energy", state.energy);
  setNeed("clean", state.clean);

  $("robot").classList.toggle("sleeping", state.is_sleeping);
  updateMood();
}

function setNeed(name, value) {
  const amount = Math.round(clamp(value));

  $(`${name}Value`).textContent = amount;
  $(`${name}Bar`).style.width = `${amount}%`;
}

function updateMood() {
  if (!pet) return;

  const state = getState();
  let message = "Mimi senang bertemu kamu!";

  if (state.is_sleeping) {
    message = "Zzz... Mimi sedang tidur.";
  } else if (state.hunger < 25) {
    message = "Mimi lapar... mau makan 🍓";
  } else if (state.energy < 20) {
    message = "Mimi capek, mau tidur 🌙";
  } else if (state.clean < 25) {
    message = "Mimi ingin mandi 🫧";
  } else if (state.happiness < 25) {
    message = "Yuk, bermain bareng Mimi!";
  } else if (state.happiness >= 80) {
    message = "Mimi bahagia banget! ♡";
  }

  $("moodText").textContent = message;

  // Jangan menimpa ucapan interaksi yang sedang tampil.
  if (!speechTimer) {
    $("speechBubble").textContent = state.is_sleeping
      ? "Zzz... 💤"
      : state.hunger < 25
        ? "Mimi lapar!"
        : state.happiness < 25
          ? "Ayo main!"
          : "Hai, bro! ♡";
  }
}

/* Simpan data profil ke Supabase */
async function savePet() {
  if (!user || !pet) throw new Error("Sesi login tidak ditemukan.");

  getState().last_tick = Date.now();

  const { data, error } = await client
    .from("robot_profiles")
    .update({
      pet_name: pet.pet_name,
      body_color: safeColor(pet.body_color, "#f5f0ff"),
      eye_color: safeColor(pet.eye_color, "#42f5ee"),
      pet_state: getState(),
      updated_at: new Date().toISOString()
    })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  pet = data;
  render();
}

async function safeSave() {
  if (busy) return false;

  busy = true;
  try {
    await savePet();
    return true;
  } catch (error) {
    console.error("Mimi save error:", error);
    toast("Gagal menyimpan progres. Cek koneksi.");
    return false;
  } finally {
    busy = false;
  }
}

/* Login */
$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
  ) {
    setMessage("loginMessage", "Isi konfigurasi Supabase di app.js.", true);
    return;
  }

  const button = $("loginForm").querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "LOADING...";

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) throw error;

    user = data.user;
    pet = await getOrCreateProfile(user);

    applyElapsedTime();
    render();
    showGame();

    // Simpan waktu dan kebutuhan yang sudah diperbarui.
    await savePet();
    speak("Akhirnya kamu pulang! ♡");
  }catch (error) {
  console.error("Mimi login/profile error:", error);

  setMessage(
    "loginMessage",
    "Error: " + (
      error?.message ||
      error?.details ||
      JSON.stringify(error) ||
      "Kesalahan tidak diketahui"
    ),
    true
  );
} finally {
  button.disabled = false;
  button.textContent = "START GAME ▶";
}
});

/* Aktivitas Tamagotchi */
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!pet || busy) return;

    const state = getState();
    const action = button.dataset.action;

    if (action !== "sleep" && state.is_sleeping) {
      toast("Mimi sedang tidur. Bangunkan dulu dengan mengetuk Mimi!");
      return;
    }

    if (action === "feed") {
      state.hunger = clamp(state.hunger + 25);
      state.happiness = clamp(state.happiness + 3);
      state.clean = clamp(state.clean - 2);
      speak("Nyam nyam! Enak banget! 🍓");
      toast("Mimi sudah makan!");
    } else if (action === "play") {
      if (state.energy < 15) {
        speak("Mimi capek...");
        toast("Energi Mimi terlalu rendah.");
        return;
      }

      state.happiness = clamp(state.happiness + 18);
      state.energy = clamp(state.energy - 12);
      state.hunger = clamp(state.hunger - 6);
      state.clean = clamp(state.clean - 4);
      state.coins += 2;
      gainExp(15);

      speak("Yeay! Main lagi! 🎮");
      $("robot").classList.add("bounce");
      setTimeout(() => $("robot").classList.remove("bounce"), 1000);
    } else if (action === "clean") {
      state.clean = 100;
      state.happiness = clamp(state.happiness + 5);
      speak("Wah, bersih dan wangi! 🫧");
      toast("Kamar Mimi sudah bersih!");
    } else if (action === "sleep") {
      if (state.is_sleeping) {
        state.is_sleeping = false;
        speak("Mimi sudah bangun! ☀️");
      } else {
        state.is_sleeping = true;
        speak("Selamat malam... Zzz 💤");
      }
    }

    render();
    await safeSave();
  });
});

function gainExp(amount) {
  const state = getState();
  state.exp += amount;

  while (state.exp >= 100) {
    state.exp -= 100;
    state.level += 1;
    state.coins += 10;
    toast(`LEVEL UP! Mimi level ${state.level} ★`);
  }
}

/* Sentuh robot untuk mendapat reaksi */
$("robot").addEventListener("click", async () => {
  if (!pet || busy) return;

  const state = getState();

  if (state.is_sleeping) {
    state.is_sleeping = false;
    speak("Udah bangun, bro! ☀️");
  } else {
    state.happiness = clamp(state.happiness + 4);
    speak("Hehehe! Gelitikin Mimi! ♡");
    $("robot").classList.add("happy", "bounce");
    setTimeout(() => {
      $("robot").classList.remove("happy", "bounce");
    }, 1000);
  }

  render();
  await safeSave();
});

/* Ganti nama dan warna */
$("saveCustomBtn").addEventListener("click", async () => {
  if (!pet || busy) return;

  const name = $("petNameInput").value.trim();

  if (!name) {
    setMessage("saveMessage", "Nama robot tidak boleh kosong.", true);
    return;
  }

  pet.pet_name = name.slice(0, 24);
  pet.body_color = $("bodyColor").value;
  pet.eye_color = $("eyeColor").value;

  const saved = await safeSave();

  if (saved) {
    setMessage("saveMessage", "Berhasil disimpan! ✦");
    speak("Aku suka nama dan warna baruku!");
  } else {
    setMessage("saveMessage", "Gagal menyimpan perubahan.", true);
  }
});

/* Logout */
$("logoutBtn").addEventListener("click", async () => {
  const { error } = await client.auth.signOut();

  if (error) {
    toast("Gagal logout. Coba lagi.");
    return;
  }

  user = null;
  pet = null;
  showLogin();
});

/* Kondisi berubah setiap menit saat game terbuka */
setInterval(async () => {
  if (!pet || !user || busy || document.hidden) return;

  const state = getState();

  if (state.is_sleeping) {
    state.energy = clamp(state.energy + 0.7);
    state.hunger = clamp(state.hunger - 0.12);
    state.clean = clamp(state.clean - 0.04);

    if (state.energy >= 100) state.is_sleeping = false;
  } else {
    state.hunger = clamp(state.hunger - 0.22);
    state.happiness = clamp(state.happiness - 0.12);
    state.energy = clamp(state.energy - 0.16);
    state.clean = clamp(state.clean - 0.08);
  }

  state.last_tick = Date.now();
  render();
  await safeSave();
}, 60000);

/* Pulihkan sesi ketika halaman dibuka kembali */
async function init() {
  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
  ) {
    showLogin();
    setMessage("loginMessage", "Isi Project URL dan Publishable Key di app.js.", true);
    return;
  }

  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    if (data.session?.user) {
      user = data.session.user;
      pet = await getOrCreateProfile(user);
      applyElapsedTime();
      render();
      showGame();
      await savePet();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error("Mimi initialization error:", error);
    showLogin();
    setMessage(
      "loginMessage",
      "Sesi atau profil gagal dimuat. Periksa konfigurasi Supabase.",
      true
    );
  }
}

document.addEventListener("visibilitychange", async () => {
  if (!document.hidden && user && pet && !busy) {
    // Hitung kebutuhan selama game tidak aktif.
    applyElapsedTime();
    render();
    await safeSave();
  }
});

init();
