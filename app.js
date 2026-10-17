
/*
  MIMI VIRTUAL PET
  Isi SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY
  dengan data project Supabase milikmu.
*/

const SUPABASE_URL = "https://clzaohchgcigvjmasgke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uWzC4hMSZcnQjCMQi3OH7w_Xr97SdnF";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

let currentUser = null;
let profile = null;
let toastTimeout = null;

const defaultState = () => ({
  hunger: 80,
  happiness: 80,
  energy: 100,
  level: 1,
  exp: 0
});

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeState(state) {
  const defaults = defaultState();
  const source = state && typeof state === "object" ? state : {};

  return {
    hunger: clamp(safeNumber(source.hunger, defaults.hunger)),
    happiness: clamp(safeNumber(source.happiness, defaults.happiness)),
    energy: clamp(safeNumber(source.energy, defaults.energy)),
    level: Math.max(1, Math.floor(safeNumber(source.level, 1))),
    exp: Math.max(0, Math.floor(safeNumber(source.exp, 0)))
  };
}

function showMessage(id, message, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove("show"), 2400);
}

function showLogin() {
  $("loginScreen").classList.remove("hidden");
  $("petScreen").classList.add("hidden");
}

function showPet() {
  $("loginScreen").classList.add("hidden");
  $("petScreen").classList.remove("hidden");
}

function validColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : fallback;
}

async function loadOrCreateProfile(user) {
  const { data, error } = await supabaseClient
    .from("robot_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  // Profil baru dibuat untuk akun yang sudah berhasil login.
  const playerName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Player";

  const { data: created, error: insertError } = await supabaseClient
    .from("robot_profiles")
    .insert({
      user_id: user.id,
      player_name: playerName,
      pet_name: "Mimi",
      body_color: "#f4f7ff",
      eye_color: "#35eaff",
      screen_color: "#101827",
      pet_state: defaultState()
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return created;
}

function renderProfile() {
  if (!profile) return;

  const state = normalizeState(profile.pet_state);
  profile.pet_state = state;

  $("playerName").textContent = profile.player_name || "Player";
  $("petNameDisplay").textContent = profile.pet_name || "Mimi";
  $("petNameInput").value = profile.pet_name || "Mimi";
  $("bodyColor").value = validColor(profile.body_color, "#f4f7ff");
  $("eyeColor").value = validColor(profile.eye_color, "#35eaff");

  $("levelBadge").textContent = `LVL ${state.level}`;
  $("expText").textContent = `${state.exp} / 100 EXP`;
  $("expBar").style.width = `${clamp(state.exp)}%`;

  setStat("hunger", state.hunger);
  setStat("happiness", state.happiness);
  setStat("energy", state.energy);

  const robot = $("robot");
  robot.style.setProperty(
    "--body-color",
    validColor(profile.body_color, "#f4f7ff")
  );
  robot.style.setProperty(
    "--eye-color",
    validColor(profile.eye_color, "#35eaff")
  );

  updateMood(state);
}

function setStat(name, value) {
  const amount = clamp(value);
  $(`${name}Value`).textContent = `${amount}%`;
  $(`${name}Bar`).style.width = `${amount}%`;
}

function updateMood(state) {
  let mood = "Feeling cute";
  let text = "Si kecil siap menemanimu.";

  if (state.energy < 25) {
    mood = "Sleepy mode";
    text = "Mimi butuh istirahat.";
  } else if (state.hunger < 25) {
    mood = "Hungry mode";
    text = "Mimi mulai lapar nih.";
  } else if (state.happiness < 25) {
    mood = "Need attention";
    text = "Yuk luangkan waktu buat Mimi.";
  } else if (state.happiness >= 80) {
    mood = "Super happy ✦";
    text = "Mimi bahagia ditemani kamu!";
  }

  $("moodLabel").textContent = mood;
  $("petMoodText").textContent = text;

  const robot = $("robot");
  robot.classList.toggle("sleeping", state.energy < 25);
}

async function saveProfile() {
  if (!currentUser || !profile) throw new Error("Sesi login tidak ditemukan.");

  const payload = {
    player_name: profile.player_name,
    pet_name: profile.pet_name,
    body_color: validColor(profile.body_color, "#f4f7ff"),
    eye_color: validColor(profile.eye_color, "#35eaff"),
    screen_color: validColor(profile.screen_color, "#101827"),
    pet_state: normalizeState(profile.pet_state),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from("robot_profiles")
    .update(payload)
    .eq("user_id", currentUser.id)
    .select()
    .single();

  if (error) throw error;
  profile = data;
  renderProfile();
}

async function openPet(user) {
  currentUser = user;
  showMessage("loginMessage", "");

  try {
    profile = await loadOrCreateProfile(user);
    renderProfile();
    showPet();
  } catch (error) {
    console.error(error);
    showMessage(
      "loginMessage",
      "Profil gagal dimuat. Periksa tabel dan kebijakan RLS Supabase.",
      true
    );
    showLogin();
  }
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;
  const button = $("loginForm").querySelector('button[type="submit"]');

  button.disabled = true;
  button.textContent = "Memeriksa akun...";
  showMessage("loginMessage", "");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    await openPet(data.user);
  } catch (error) {
    console.error(error);
    showMessage(
      "loginMessage",
      "Login gagal. Periksa email, password, dan konfigurasi Supabase.",
      true
    );
  } finally {
    button.disabled = false;
    button.textContent = "Masuk ke dunia Mimi ↗";
  }
});

$("logoutBtn").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showToast("Gagal keluar. Coba lagi.");
    return;
  }

  currentUser = null;
  profile = null;
  $("password").value = "";
  showLogin();
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!profile) return;

    const state = normalizeState(profile.pet_state);
    const action = button.dataset.action;

    if (action === "feed") {
      state.hunger = clamp(state.hunger + 20);
      state.happiness = clamp(state.happiness + 3);
      showToast("Nyam nyam! Mimi sudah makan 🍓");
    } else if (action === "play") {
      if (state.energy < 15) {
        showToast("Mimi terlalu lelah. Istirahat dulu ya!");
        return;
      }
      state.happiness = clamp(state.happiness + 15);
      state.energy = clamp(state.energy - 12);
      state.hunger = clamp(state.hunger - 5);
      gainExp(state, 15);
      showToast("Yeay! Mimi senang bermain 🎮");
    } else if (action === "sleep") {
      state.energy = clamp(state.energy + 30);
      showToast("Zzz... Mimi mengisi energi 🌙");
    }

    profile.pet_state = state;
    renderProfile();

    button.disabled = true;
    try {
      await saveProfile();
    } catch (error) {
      console.error(error);
      showToast("Gagal menyimpan. Periksa koneksi.");
    } finally {
      button.disabled = false;
    }
  });
});

function gainExp(state, amount) {
  state.exp += amount;

  while (state.exp >= 100) {
    state.exp -= 100;
    state.level += 1;
    showToast(`Level up! Mimi sekarang level ${state.level} ✨`);
  }
}

$("saveCustomBtn").addEventListener("click", async () => {
  if (!profile) return;

  const name = $("petNameInput").value.trim();
  if (!name) {
    showMessage("saveMessage", "Nama robot tidak boleh kosong.", true);
    return;
  }

  profile.pet_name = name.slice(0, 24);
  profile.body_color = $("bodyColor").value;
  profile.eye_color = $("eyeColor").value;

  try {
    await saveProfile();
    showMessage("saveMessage", "Perubahan berhasil disimpan ✦");
    showToast("Mimi tampil dengan gaya baru!");
  } catch (error) {
    console.error(error);
    showMessage("saveMessage", "Gagal menyimpan perubahan.", true);
  }
});

async function initializeApp() {
  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
  ) {
    showMessage(
      "loginMessage",
      "Masukkan Project URL dan Publishable Key di app.js terlebih dahulu.",
      true
    );
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    if (data.session?.user) {
      await openPet(data.session.user);
    } else {
      showLogin();
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        currentUser = null;
        profile = null;
        showLogin();
      }
    });
  } catch (error) {
    console.error(error);
    showMessage("loginMessage", "Tidak bisa menghubungi Supabase.", true);
  }
}

initializeApp();
