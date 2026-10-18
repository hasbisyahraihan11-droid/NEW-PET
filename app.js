/* Mimi's Pixel World — replace SUPABASE_URL and SUPABASE_ANON_KEY with your own project values. */
const SUPABASE_URL = 'https://clzaohchgcigvjmasgke.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uWzC4hMSZcnQjCMQi3OH7w_Xr97SdnF';
const SAVE_KEY = 'mimi-pixel-world-save-v1';
const $ = (id) => document.getElementById(id);
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));
const defaultState = () => ({
  petType: 'cat', petName: 'Mimi', coins: 120,
  stats: { hunger: 78, energy: 82, fun: 70, hygiene: 90 },
  equipped: null, ownedAccessories: [], ownedDecor: [], roomTheme: 'lavender', decoration: 'flower',
  designs: [], quests: { feed: false, game: false, clean: false },
  lastSeen: Date.now()
});
let state = loadLocalState();
let supabaseClient = null;
let currentUser = null;
let activeShop = 'accessories';
let sleepInterval = null;
let toastTimeout = null;
let gameInterval = null;
let gameTimeout = null;
let catchScore = 0;
let catchTime = 20;
let memoryCards = [];
let memoryOpen = [];
let memoryMoves = 0;
let memoryLocked = false;
let pixelColor = '#ff5e9c';
let eraserMode = false;
let pixelDrawing = Array(64).fill('');
let selectedDesignId = null;
const PETS = { cat: 'Mimi', dog: 'Bobo', bunny: 'Mochi', slime: 'Pip' };
const ACCESSORIES = [
  { id: 'bow', name: 'Pink Pixel Bow', icon: '🎀', price: 35, pattern: 'bow' },
  { id: 'crown', name: 'Tiny Crown', icon: '👑', price: 60, pattern: 'crown' },
  { id: 'flower', name: 'Daisy Clip', icon: '🌼', price: 30, pattern: 'flower' },
  { id: 'glasses', name: 'Pixel Shades', icon: '🕶️', price: 45, pattern: 'glasses' },
  { id: 'halo', name: 'Angel Halo', icon: '😇', price: 70, pattern: 'halo' }
];
const DECORATIONS = [
  { id: 'flower', name: 'Flower Pot', icon: '🪴', price: 25 },
  { id: 'lamp', name: 'Star Lamp', icon: '💡', price: 40 },
  { id: 'plant', name: 'Tiny Plant', icon: '🌵', price: 35 },
  { id: 'moon', name: 'Moon Mobile', icon: '🌙', price: 50 },
  { id: 'bear', name: 'Teddy Buddy', icon: '🧸', price: 55 }
];
const ROOMS = [
  { id: 'lavender', name: 'Lavender Dream', icon: '💜', price: 0 },
  { id: 'sunset', name: 'Peach Sunset', icon: '🌅', price: 45 },
  { id: 'ocean', name: 'Ocean Blue', icon: '🌊', price: 45 },
  { id: 'forest', name: 'Mint Forest', icon: '🌿', price: 45 }
];

function loadLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return defaultState();
    const base = defaultState();
    return { ...base, ...saved, stats: { ...base.stats, ...(saved.stats || {}) }, quests: { ...base.quests, ...(saved.quests || {}) }, designs: Array.isArray(saved.designs) ? saved.designs : [], ownedAccessories: Array.isArray(saved.ownedAccessories) ? saved.ownedAccessories : [], ownedDecor: Array.isArray(saved.ownedDecor) ? saved.ownedDecor : [] };
  } catch { return defaultState(); }
}
function saveLocal() {
  state.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (error) { console.warn('Local save failed', error); }
}
function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2400);
}
function setMessage(id, message, isError = false) {
  const el = $(id); if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#c44c78' : '';
}
function makePixelSvg(cells, colors = {}) {
  const rects = cells.map(([x, y, color]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[color] || color}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
function accessoryPattern(type) {
  const cells = [];
  const add = (x, y, c) => cells.push([x, y, c]);
  if (type === 'bow') {
    [[1,1],[2,1],[1,2],[2,2],[3,3],[4,3],[5,1],[6,1],[5,2],[6,2]].forEach(([x,y])=>add(x,y,'#ff5e9c'));
    add(3,2,'#ffd45e'); add(4,2,'#ffd45e'); add(3,3,'#ffb5d1'); add(4,3,'#ffb5d1');
  } else if (type === 'crown') {
    [[1,2],[2,3],[3,2],[4,3],[5,2],[6,3],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5]].forEach(([x,y])=>add(x,y,'#ffd45e'));
    add(2,4,'#ff78ad'); add(4,4,'#8f7bff'); add(5,4,'#68caff');
  } else if (type === 'flower') {
    [[3,1],[4,1],[2,2],[3,2],[4,2],[5,2],[3,3],[4,3]].forEach(([x,y])=>add(x,y,'#ff8ab8'));
    add(3,2,'#ffd45e'); add(4,2,'#ffd45e'); add(4,4,'#65d6a4'); add(4,5,'#65d6a4');
  } else if (type === 'glasses') {
    for (let x=0;x<3;x++) for(let y=2;y<4;y++) add(x+1,y,'#433b67');
    for (let x=0;x<3;x++) for(let y=2;y<4;y++) add(x+4,y,'#433b67');
    add(3,2,'#292343'); add(4,2,'#292343'); add(1,2,'#9ee4ff'); add(5,2,'#9ee4ff');
  } else if (type === 'halo') {
    for (let x=1;x<7;x++) { add(x,1,'#ffd45e'); add(x,2,'#ffd45e'); }
    for (let x=2;x<6;x++) { add(x,1,'#fff3b0'); }
  }
  return makePixelSvg(cells);
}
function designBackground(design) {
  if (!design || !Array.isArray(design.pixels)) return '';
  const cells = [];
  design.pixels.forEach((color, i) => { if (color) cells.push([i % 8, Math.floor(i / 8), color]); });
  return makePixelSvg(cells);
}
function getEquippedPattern() {
  if (!state.equipped) return '';
  if (state.equipped.startsWith('design:')) {
    const design = state.designs.find(d => d.id === state.equipped.slice(7));
    return designBackground(design);
  }
  const item = ACCESSORIES.find(a => a.id === state.equipped);
  return item ? accessoryPattern(item.pattern) : '';
}
function renderStats() {
  $('coinCount').textContent = state.coins;
  $('shopCoins').textContent = state.coins;
  for (const key of ['hunger','energy','fun','hygiene']) {
    const value = clamp(state.stats[key]);
    state.stats[key] = value;
    $(`${key}Value`).textContent = `${value}%`;
    $(`${key}Bar`).style.width = `${value}%`;
  }
  const average = Object.values(state.stats).reduce((a,b)=>a+b,0) / 4;
  $('petMood').textContent = average > 78 ? 'Mimi lagi happy! ♡' : average > 48 ? 'Mimi baik-baik aja, rawat terus ya!' : 'Mimi butuh perhatian kamu...';
  $('questFeed').textContent = state.quests.feed ? '✓ DONE' : '+10';
  $('questGame').textContent = state.quests.game ? '✓ DONE' : '+20';
  $('questClean').textContent = state.quests.clean ? '✓ DONE' : '+10';
}
function renderPet() {
  $('petName').textContent = state.petName || 'Mimi';
  $('petSprite').className = `pet-sprite ${state.petType || 'cat'}`;
  document.querySelectorAll('.pet-choice').forEach(btn => btn.classList.toggle('selected', btn.dataset.pet === state.petType));
  const pattern = getEquippedPattern();
  $('petAccessory').style.backgroundImage = pattern || 'none';
  $('petAccessory').hidden = !pattern;
  if (state.petType === 'slime') $('petAccessory').style.top = '25px'; else $('petAccessory').style.top = '16px';
  $('room').className = `room room-${state.roomTheme || 'lavender'}`;
  const deco = DECORATIONS.find(d => d.id === state.decoration);
  $('roomDeco').textContent = deco ? deco.icon : '✿';
  $('roomDeco').style.opacity = state.decoration ? '1' : '0';
  $('equippedLabel').textContent = state.equipped ? (state.equipped.startsWith('design:') ? (state.designs.find(d=>d.id===state.equipped.slice(7))?.name || 'Custom design') : (ACCESSORIES.find(a=>a.id===state.equipped)?.name || 'Accessory')) : 'None';
}
function renderDesignList() {
  const wrap = $('designList');
  if (!state.designs.length) { wrap.innerHTML = '<p class="hint">Belum ada desain. Buat aksesori pertamamu!</p>'; return; }
  wrap.innerHTML = state.designs.map(d => `<div class="design-item"><div class="design-thumb" style="background-image:${designBackground(d)}"></div><div><b>${escapeHTML(d.name)}</b></div><button data-wear-design="${escapeHTML(d.id)}">WEAR</button></div>`).join('');
  wrap.querySelectorAll('[data-wear-design]').forEach(btn => btn.addEventListener('click', () => { state.equipped = `design:${btn.dataset.wearDesign}`; saveLocal(); renderPet(); notify('Aksesori custom dipakai! ✨'); if(currentUser) saveCloud(false); }));
}
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderAll() { renderStats(); renderPet(); renderDesignList(); renderShop(); }
function awardCoins(amount, reason) { state.coins += amount; saveLocal(); renderStats(); if ($('shopCoins')) $('shopCoins').textContent = state.coins; notify(`${reason} +${amount} coins! 🪙`); }
function useQuest(questKey) {
  if (state.quests[questKey]) return;
  state.quests[questKey] = true;
  const reward = questKey === 'game' ? 20 : 10;
  state.coins += reward;
  notify(`Daily quest selesai! +${reward} coins ✨`);
}
function changeStat(key, amount) { state.stats[key] = clamp(state.stats[key] + amount); }
function doCare(action) {
  if (sleepInterval && action !== 'sleep') { notify('Mimi lagi tidur. Bangunkan dulu ya!'); return; }
  if (action === 'feed') { changeStat('hunger', 22); changeStat('hygiene', -3); useQuest('feed'); notify('Nyam nyam! Mimi kenyang 🍓'); }
  if (action === 'play') { changeStat('fun', 22); changeStat('energy', -10); changeStat('hunger', -5); notify('Yeay, Mimi senang main!'); }
  if (action === 'clean') { changeStat('hygiene', 25); useQuest('clean'); notify('Mimi bersih dan wangi! 🫧'); }
  saveLocal(); renderAll(); if (currentUser) saveCloud(false);
}
function beginSleep() {
  if (sleepInterval) return;
  let remaining = 30;
  $('sleepOverlay').hidden = false;
  $('sleepCountdown').textContent = '00:30';
  $('sleepProgress').style.width = '100%';
  $('sleepBtn').disabled = true;
  const finish = (cancelled = false) => {
    clearInterval(sleepInterval); sleepInterval = null;
    $('sleepOverlay').hidden = true; $('sleepBtn').disabled = false;
    if (!cancelled) { changeStat('energy', 40); changeStat('hunger', -4); changeStat('fun', 4); saveLocal(); renderAll(); notify('Mimi bangun dengan energi baru! ⚡'); if(currentUser) saveCloud(false); }
  };
  $('cancelSleepBtn').onclick = () => finish(true);
  sleepInterval = setInterval(() => {
    remaining--;
    $('sleepCountdown').textContent = `00:${String(remaining).padStart(2,'0')}`;
    $('sleepProgress').style.width = `${remaining / 30 * 100}%`;
    if (remaining <= 0) finish(false);
  }, 1000);
}
function setupPixelEditor() {
  const grid = $('pixelGrid'); grid.innerHTML = '';
  pixelDrawing.forEach((color, i) => {
    const cell = document.createElement('button'); cell.type = 'button'; cell.className = `pixel${color ? ' filled' : ''}`; cell.dataset.index = i; cell.setAttribute('aria-label', `Pixel ${i+1}`); cell.style.background = color || '#fff';
    cell.addEventListener('click', () => { pixelDrawing[i] = eraserMode ? '' : pixelColor; cell.style.background = pixelDrawing[i] || '#fff'; cell.classList.toggle('filled', !!pixelDrawing[i]); updatePreview(); });
    grid.appendChild(cell);
  });
  updatePreview();
}
function updatePreview() { $('accessoryPreview').style.backgroundImage = designBackground({pixels: pixelDrawing}); }
function saveDesign() {
  const name = $('designName').value.trim().slice(0,18) || 'My Pixel Accessory';
  if (!pixelDrawing.some(Boolean)) { notify('Gambar minimal satu pixel dulu ya!'); return; }
  const id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
  state.designs.push({ id, name, pixels: [...pixelDrawing], createdAt: Date.now() });
  state.equipped = `design:${id}`;
  saveLocal(); renderAll(); notify('Desain pixel disimpan dan langsung dipakai! 🎨'); if(currentUser) saveCloud(false);
}
function renderShop() {
  const wrap = $('shopGrid');
  let items = [];
  if (activeShop === 'accessories') items = ACCESSORIES.map(x=>({...x, kind:'accessory', owned:state.ownedAccessories.includes(x.id), equipped:state.equipped===x.id}));
  if (activeShop === 'decor') items = DECORATIONS.map(x=>({...x,kind:'decor',owned:state.ownedDecor.includes(x.id),equipped:state.decoration===x.id}));
  if (activeShop === 'rooms') items = ROOMS.map(x=>({...x,kind:'room',owned:x.id==='lavender'||state.roomTheme===x.id||state.ownedDecor.includes(`room:${x.id}`),equipped:state.roomTheme===x.id}));
  wrap.innerHTML = items.map(item => {
    const art = item.kind === 'accessory' ? `<div class="shop-art"><div class="pixel-shop-art" style="background-image:${accessoryPattern(item.pattern)}"></div></div>` : `<div class="shop-art">${item.icon}</div>`;
    const action = item.equipped ? 'EQUIPPED' : item.owned ? (item.kind === 'decor' ? 'PLACE DECOR' : item.kind === 'room' ? 'USE THEME' : 'WEAR') : `BUY · ${item.price} 🪙`;
    return `<article class="shop-item ${item.owned?'owned':''}">${art}<span class="tiny-label">${item.kind.toUpperCase()}</span><h3>${escapeHTML(item.name)}</h3><p>${item.kind==='accessory'?'A tiny pixel accessory for your pet.':item.kind==='decor'?'Bikin kamar Mimi makin nyaman.':'Ganti warna dan suasana kamar.'}</p><div class="shop-price">${item.price===0?'FREE':`${item.price} COINS`}</div><button class="${item.owned?'small-btn':'primary-btn'}" data-shop-action="${item.kind}" data-id="${item.id}" ${item.equipped?'disabled':''}>${action}</button></article>`;
  }).join('');
  wrap.querySelectorAll('[data-shop-action]').forEach(btn=>btn.addEventListener('click',()=>shopAction(btn.dataset.shopAction,btn.dataset.id)));
}
function shopAction(kind,id) {
  if (kind === 'accessory') {
    if (!state.ownedAccessories.includes(id)) {
      const item = ACCESSORIES.find(x=>x.id===id); if(state.coins<item.price){notify('Koin kamu belum cukup. Main mini game dulu!');return;}
      state.coins-=item.price; state.ownedAccessories.push(id);
    }
    state.equipped=id; notify('Aksesori dipakai! ✨');
  } else if (kind === 'decor') {
    if (!state.ownedDecor.includes(id)) {
      const item = DECORATIONS.find(x=>x.id===id); if(state.coins<item.price){notify('Koin kamu belum cukup. Main mini game dulu!');return;}
      state.coins-=item.price; state.ownedDecor.push(id);
    }
    state.decoration=id; notify('Dekorasi kamar diperbarui! 🪴');
  } else if (kind === 'room') {
    const item = ROOMS.find(x=>x.id===id);
    if(id!=='lavender' && !state.ownedDecor.includes(`room:${id}`)) {
      if(state.coins<item.price){notify('Koin kamu belum cukup. Main mini game dulu!');return;}
      state.coins-=item.price; state.ownedDecor.push(`room:${id}`);
    }
    state.roomTheme=id; notify('Tema kamar diganti! 🏡');
  }
  saveLocal(); renderAll(); if(currentUser) saveCloud(false);
}
function showPage(page) {
  document.querySelectorAll('.tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===page));
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id===`page-${page}`));
}
function stopGameTimers() { clearInterval(gameInterval); clearTimeout(gameTimeout); gameInterval=null; gameTimeout=null; }
function startCatchGame() {
  stopGameTimers(); catchScore=0; catchTime=20;
  $('gameTitle').textContent='CATCH THE STAR'; $('gameTimer').textContent='20 SEC'; $('gameMessage').textContent='Tap bintang yang muncul!';
  const board=$('gameBoard'); board.innerHTML='<div class="catch-board"></div>'; const cells=board.querySelector('.catch-board');
  for(let i=0;i<20;i++){const b=document.createElement('button');b.className='star-target';b.textContent='·';b.setAttribute('aria-label',`Target ${i+1}`);b.addEventListener('click',()=>{if(catchTime<=0)return;if(b.textContent==='★'){catchScore++;b.classList.add('hit');b.textContent='✦';$('gameMessage').textContent=`Score: ${catchScore}`;setTimeout(()=>{b.classList.remove('hit');b.textContent='·';},180);}});cells.appendChild(b);}
  const targets=[...cells.children]; let active=-1;
  const popStar=()=>{targets.forEach(t=>{t.textContent='·';t.classList.remove('hit')});active=Math.floor(Math.random()*targets.length);targets[active].textContent='★';}; popStar();
  gameInterval=setInterval(()=>{catchTime--; $('gameTimer').textContent=`${catchTime} SEC`;popStar();if(catchTime<=0){stopGameTimers();targets.forEach(t=>t.disabled=true);const reward=Math.min(40,Math.max(5,catchScore*2));state.stats.fun=clamp(state.stats.fun+12);awardCoins(reward,'Catch the Star');useQuest('game');saveLocal();renderAll();$('gameMessage').textContent=`Selesai! Score ${catchScore}. Hadiah ${reward} coins.`;if(currentUser)saveCloud(false);}},1000);
}
function startMemoryGame() {
  stopGameTimers(); memoryOpen=[];memoryMoves=0;memoryLocked=false;
  const symbols=['♥','◆','★','●','☀','☾','✿','♫'];memoryCards=[...symbols,...symbols].sort(()=>Math.random()-.5).map((symbol,index)=>({symbol,index,matched:false}));
  $('gameTitle').textContent='MEMORY MATCH';$('gameTimer').textContent='MOVES: 0';$('gameMessage').textContent='Buka dua kartu dan cari pasangan yang sama.';
  const board=$('gameBoard');board.innerHTML='<div class="memory-board"></div>';const grid=board.querySelector('.memory-board');
  memoryCards.forEach((card,index)=>{const b=document.createElement('button');b.className='memory-card';b.textContent=card.symbol;b.setAttribute('aria-label',`Kartu ${index+1}`);b.addEventListener('click',()=>flipMemory(index,b));grid.appendChild(b);});
}
function flipMemory(index,button) {
  const card=memoryCards[index];if(memoryLocked||card.matched||memoryOpen.some(x=>x.index===index))return;
  button.classList.add('open');memoryOpen.push({index,button});
  if(memoryOpen.length===2){memoryMoves++;$('gameTimer').textContent=`MOVES: ${memoryMoves}`;const [a,b]=memoryOpen;
    if(memoryCards[a.index].symbol===memoryCards[b.index].symbol){memoryCards[a.index].matched=true;memoryCards[b.index].matched=true;a.button.classList.add('matched');b.button.classList.add('matched');memoryOpen=[];
      if(memoryCards.every(c=>c.matched)){const reward=Math.max(10,50-(memoryMoves-8)*2);state.stats.fun=clamp(state.stats.fun+18);awardCoins(reward,'Memory Match');useQuest('game');saveLocal();renderAll();$('gameMessage').textContent=`Semua pasangan ketemu dalam ${memoryMoves} langkah! +${reward} coins`;if(currentUser)saveCloud(false);}
    }else{memoryLocked=true;gameTimeout=setTimeout(()=>{a.button.classList.remove('open');b.button.classList.remove('open');memoryOpen=[];memoryLocked=false;},650);}
  }
}
function validSupabaseConfig() { return SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR_PROJECT_ID') && SUPABASE_ANON_KEY.length>20 && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE'); }
function initSupabase() {
  if (!window.supabase || !validSupabaseConfig()) { $('cloudStatus').textContent='LOCAL MODE'; setMessage('authMessage','Supabase belum diatur. Game tetap tersimpan di perangkat ini.'); return; }
  try { supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY); $('cloudStatus').textContent='SUPABASE READY'; supabaseClient.auth.getSession().then(({data,error})=>{if(error)throw error; if(data.session) handleSignedIn(data.session);}).catch(err=>setMessage('authMessage',err.message,true));
    supabaseClient.auth.onAuthStateChange((_event,session)=>{if(session)handleSignedIn(session);else{currentUser=null;$('cloudStatus').textContent='LOCAL MODE';$('cloudStatus').classList.remove('connected');$('logoutBtn').hidden=true;}});
  } catch(error) { setMessage('authMessage',`Gagal menginisialisasi Supabase: ${error.message}`,true); }
}
async function handleSignedIn(session) {
  currentUser=session.user; $('cloudStatus').textContent='CONNECTED'; $('cloudStatus').classList.add('connected'); $('logoutBtn').hidden=false;
  setMessage('authMessage',`Login sebagai ${currentUser.email}. Mengambil save cloud...`);
  const {data,error}=await supabaseClient.from('mimi_saves').select('save_data').eq('user_id',currentUser.id).maybeSingle();
  if(error){setMessage('authMessage',`Login berhasil, tetapi baca save gagal: ${error.message}. Jalankan SQL setup.`,true);return;}
  if(data?.save_data && typeof data.save_data==='object'){
    const cloudState=data.save_data;
    // Cloud save is the source when it exists; local remains a fallback for a new account.
    state={...defaultState(),...cloudState,stats:{...defaultState().stats,...(cloudState.stats||{})},quests:{...defaultState().quests,...(cloudState.quests||{})}};
    saveLocal();renderAll();setMessage('authMessage','Save cloud berhasil dimuat.');
  } else { await saveCloud(false);setMessage('authMessage','Akun siap! Save lokal pertama sudah disimpan ke cloud.'); }
}
async function signInOrSignUp(mode) {
  if(!supabaseClient){notify('Isi konfigurasi Supabase di app.js dulu ya.');setMessage('authMessage','Buka app.js, isi SUPABASE_URL dan SUPABASE_ANON_KEY dari Project Settings → API.',true);return;}
  const email=$('emailInput').value.trim();const password=$('passwordInput').value;
  if(!email||password.length<6){setMessage('authMessage','Isi email dan password minimal 6 karakter.',true);return;}
  const button=mode==='signup'?$('signupBtn'):$('loginBtn');button.disabled=true;button.textContent='PLEASE WAIT...';
  try{
    const result=mode==='signup'?await supabaseClient.auth.signUp({email,password}):await supabaseClient.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    if(mode==='signup'&&!result.data.session)setMessage('authMessage','Akun dibuat. Cek email untuk konfirmasi, lalu login.');
    else if(result.data.session)await handleSignedIn(result.data.session);
  }catch(error){setMessage('authMessage',error.message||'Autentikasi gagal.',true);}
  finally{button.disabled=false;button.textContent=mode==='signup'?'DAFTAR':'LOGIN';}
}
async function saveCloud(showNotice=true) {
  saveLocal();
  if(!supabaseClient||!currentUser){if(showNotice)notify('Save lokal berhasil. Login untuk menyimpan ke cloud.');return;}
  const payload={...state,lastSeen:Date.now()};
  const {error}=await supabaseClient.from('mimi_saves').upsert({user_id:currentUser.id,save_data:payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error){setMessage('authMessage',`Cloud save gagal: ${error.message}. Pastikan tabel dan RLS sudah dibuat.`,true);if(showNotice)notify('Cloud save gagal. Cek SQL setup.');}
  else{setMessage('authMessage','Progres tersimpan ke Supabase ☁');if(showNotice)notify('Cloud save berhasil! ☁');}
}
async function signOut() { if(!supabaseClient)return;const {error}=await supabaseClient.auth.signOut();if(error){setMessage('authMessage',error.message,true);return;}currentUser=null;$('cloudStatus').textContent='LOCAL MODE';$('cloudStatus').classList.remove('connected');$('logoutBtn').hidden=true;setMessage('authMessage','Logout berhasil. Save lokal tetap tersedia.');notify('Kamu sudah logout.'); }
function setupEvents() {
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
  document.querySelectorAll('.shop-tab').forEach(btn=>btn.addEventListener('click',()=>{activeShop=btn.dataset.shop;document.querySelectorAll('.shop-tab').forEach(x=>x.classList.toggle('active',x===btn));renderShop();}));
  $('feedBtn').addEventListener('click',()=>doCare('feed'));$('playBtn').addEventListener('click',()=>doCare('play'));$('cleanBtn').addEventListener('click',()=>doCare('clean'));$('sleepBtn').addEventListener('click',beginSleep);
  $('changePetBtn').addEventListener('click',()=>{const order=['cat','dog','bunny','slime'];state.petType=order[(order.indexOf(state.petType)+1)%order.length];state.petName=PETS[state.petType];saveLocal();renderAll();notify(`Sekarang kamu punya ${state.petType}!`);if(currentUser)saveCloud(false);});
  document.querySelectorAll('.pet-choice').forEach(btn=>btn.addEventListener('click',()=>{state.petType=btn.dataset.pet;state.petName=PETS[state.petType];saveLocal();renderAll();if(currentUser)saveCloud(false);}));
  $('renameBtn').addEventListener('click',()=>{ $('newPetName').value=state.petName;$('nameDialog').showModal(); });
  $('confirmRenameBtn').addEventListener('click',(event)=>{event.preventDefault();const name=$('newPetName').value.trim();if(name){state.petName=name.slice(0,18);saveLocal();renderPet();if(currentUser)saveCloud(false);} $('nameDialog').close();});
  $('startCatchBtn').addEventListener('click',()=>{showPage('games');startCatchGame();});$('startMemoryBtn').addEventListener('click',()=>{showPage('games');startMemoryGame();});
  $('pixelColor').addEventListener('input',e=>{pixelColor=e.target.value;eraserMode=false;$('eraserBtn').textContent='⌫ ERASER';});
  $('eraserBtn').addEventListener('click',()=>{eraserMode=!eraserMode;$('eraserBtn').textContent=eraserMode?'✎ DRAW':'⌫ ERASER';});
  $('clearGridBtn').addEventListener('click',()=>{pixelDrawing=Array(64).fill('');setupPixelEditor();});
  $('saveDesignBtn').addEventListener('click',saveDesign);
  $('wearDesignBtn').addEventListener('click',()=>{if(!pixelDrawing.some(Boolean)){notify('Gambar aksesori dulu ya!');return;}const id=`temp${Date.now().toString(36)}`;state.designs.push({id,name:($('designName').value.trim()||'Custom Pixel').slice(0,18),pixels:[...pixelDrawing],createdAt:Date.now()});state.equipped=`design:${id}`;saveLocal();renderAll();notify('Custom pixel dipakai!');if(currentUser)saveCloud(false);});
  $('removeAccessoryBtn').addEventListener('click',()=>{state.equipped=null;saveLocal();renderPet();notify('Aksesori dilepas.');if(currentUser)saveCloud(false);});
  $('authForm').addEventListener('submit',e=>{e.preventDefault();signInOrSignUp('login');});$('signupBtn').addEventListener('click',()=>signInOrSignUp('signup'));$('logoutBtn').addEventListener('click',signOut);$('saveCloudBtn').addEventListener('click',()=>saveCloud(true));
}
function applyOfflineTime() {
  const elapsed=Math.max(0,Math.floor((Date.now()-(state.lastSeen||Date.now()))/60000));
  if(elapsed>0){state.stats.energy=clamp(state.stats.energy-Math.min(20,Math.floor(elapsed/10)));state.stats.hunger=clamp(state.stats.hunger-Math.min(20,Math.floor(elapsed/8)));state.stats.fun=clamp(state.stats.fun-Math.min(15,Math.floor(elapsed/12)));}
}
document.addEventListener('DOMContentLoaded',()=>{applyOfflineTime();setupEvents();setupPixelEditor();renderAll();initSupabase();saveLocal();});
const crownPixels = [
  "...Y...Y.",
  "..YYY.YYY",
  "..YYYYYYY",
  ".YYYYYYYYY",
  ".YYYYYYYYY"
];

function renderPixelCrown() {
  const crown = document.getElementById("petAccessory");
  if (!crown) return;

  crown.innerHTML = "";
  crown.style.gridTemplateColumns = "repeat(9, 8px)";
  crown.style.gridTemplateRows = "repeat(5, 8px)";

  crownPixels.forEach(row => {
    [...row].forEach(pixel => {
      const cell = document.createElement("div");
      cell.className = "pixel";

      if (pixel === "Y") {
        cell.style.background = "#ffd83d";
        cell.style.boxShadow = "inset -2px -2px #d78b27";
      }

      crown.appendChild(cell);
    });
  });

  crown.style.display = "grid";
}
