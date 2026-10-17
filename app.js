/* Mimi Virtual Pet — frontend starter with local save + optional Supabase sync.
   Never put a Supabase service_role key in browser code. */
const SUPABASE_URL = "https://clzaohchgcigvjmasgke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uWzC4hMSZcnQjCMQi3OH7w_Xr97SdnF";
const hasSupabaseConfig = SUPABASE_URL.startsWith("https://") && !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");
const client = (hasSupabaseConfig && window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

const $ = (id) => document.getElementById(id);
const SPECIES = [
  {id:"cat",name:"Kucing",emoji:"🐱",unlock:1,color:"#f8c8d9"},
  {id:"rabbit",name:"Kelinci",emoji:"🐰",unlock:1,color:"#f3d9e7"},
  {id:"bear",name:"Beruang",emoji:"🐻",unlock:2,color:"#c99a77"},
  {id:"slime",name:"Slime",emoji:"🫧",unlock:2,color:"#a6e9d4"},
  {id:"dog",name:"Anjing",emoji:"🐶",unlock:3,color:"#e9c18c"},
  {id:"fox",name:"Rubah",emoji:"🦊",unlock:4,color:"#f3a46f"},
  {id:"panda",name:"Panda",emoji:"🐼",unlock:5,color:"#d9d8df"},
  {id:"dragon",name:"Naga",emoji:"🐲",unlock:7,color:"#a9d9b5"},
  {id:"penguin",name:"Penguin",emoji:"🐧",unlock:8,color:"#b8d8ef"}
];
const COLORS = [
  {name:"Pink",value:"#f8c8d9"},{name:"Lilac",value:"#cfc0f5"},{name:"Mint",value:"#a6e9d4"},
  {name:"Peach",value:"#f5c49c"},{name:"Sky",value:"#a9d8ef"},{name:"Cream",value:"#f5e8bd"},
  {name:"Berry",value:"#d99bc7"},{name:"Cloud",value:"#f4f1f5"}
];
const ITEMS = [
  {id:"none",type:"outfit",name:"Tanpa outfit",emoji:"—",price:0,level:1},
  {id:"tee",type:"outfit",name:"Kaos pastel",emoji:"👕",price:0,level:1},
  {id:"hoodie",type:"outfit",name:"Hoodie",emoji:"🧥",price:45,level:1},
  {id:"dress",type:"outfit",name:"Dress manis",emoji:"👗",price:70,level:2},
  {id:"wizard",type:"outfit",name:"Jubah mage",emoji:"🥋",price:110,level:4},
  {id:"crown",type:"hat",name:"Mahkota",emoji:"👑",price:0,level:1},
  {id:"beanie",type:"hat",name:"Beanie",emoji:"🧢",price:35,level:1},
  {id:"flowerhat",type:"hat",name:"Bunga",emoji:"🌸",price:45,level:2},
  {id:"witch",type:"hat",name:"Topi penyihir",emoji:"🧙",price:95,level:4},
  {id:"halo",type:"hat",name:"Halo",emoji:"😇",price:0,level:5},
  {id:"bow",type:"accessory",name:"Pita",emoji:"🎀",price:0,level:1},
  {id:"star",type:"accessory",name:"Bintang",emoji:"⭐",price:30,level:1},
  {id:"heart",type:"accessory",name:"Hati",emoji:"💖",price:40,level:2},
  {id:"wings",type:"accessory",name:"Sayap",emoji:"🪽",price:100,level:5},
  {id:"rainbow",type:"accessory",name:"Pelangi",emoji:"🌈",price:120,level:6}
];
const defaultState = () => ({
  playerName:"Bestie",petName:"Mimi",species:"cat",bodyColor:"#f8c8d9",shape:"round",
  outfit:"tee",hat:"",accessory:"bow",coins:120,level:1,xp:0,hunger:82,energy:90,happy:95,clean:88,
  owned:["none","tee","crown","bow"],ownedSpecies:["cat","rabbit"],questDone:false,createdAt:Date.now(),lastSeen:Date.now()
});
let state = defaultState();
let user = null;
let toastTimer = null;
let soundOn = true;
let currentFilter = "all";
let starGameInterval = null;
let starGameRemaining = 10;
let starGameScore = 0;
let memoryState = null;

function cloneDefault(){ return JSON.parse(JSON.stringify(defaultState())); }
function loadLocal(){
  try { const saved = JSON.parse(localStorage.getItem("mimiPetSave") || "null"); if(saved) state = {...cloneDefault(),...saved}; }
  catch(e){ console.warn("Local save could not be read", e); }
}
function saveLocal(){ state.lastSeen = Date.now(); try { localStorage.setItem("mimiPetSave", JSON.stringify(state)); } catch(e){} }
function toast(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2300); }
function say(message){ if(soundOn && "speechSynthesis" in window){ try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.lang="id-ID";u.rate=1.05;speechSynthesis.speak(u);}catch(e){} } }
function getSpecies(id=state.species){ return SPECIES.find(s=>s.id===id)||SPECIES[0]; }
function getItem(id){ return ITEMS.find(i=>i.id===id); }
function gainXP(amount){ state.xp += amount; while(state.xp >= state.level*100){state.xp -= state.level*100;state.level++;state.coins+=25;SPECIES.filter(s=>s.unlock<=state.level).forEach(s=>{if(!state.ownedSpecies.includes(s.id))state.ownedSpecies.push(s.id)});toast(`Level up! Sekarang level ${state.level} ✨ +25 koin`);} saveLocal();render(); }
function setMeter(id,value){ $(id).style.width=Math.max(0,Math.min(100,value))+"%"; $(id.replace("Meter","Value")).textContent=Math.round(value)+"%"; }
function render(){
  $("coinCount").textContent=state.coins; $("levelCount").textContent=state.level; $("levelLabel").textContent=state.level;
  $("xpCount").textContent=state.xp; $("xpGoal").textContent=state.level*100; $("xpMeter").style.width=(state.xp/(state.level*100)*100)+"%";
  $("playerNameDisplay").textContent=state.playerName; $("petNameDisplay").textContent=state.petName;
  $("petSpeciesDisplay").textContent=`${getSpecies().name} · Lv. ${state.level}`;
  $("petMoodLabel").textContent=state.happy>70?"Lagi happy ♡":state.happy>35?"Butuh perhatian":"Sedikit sedih";
  setMeter("hungerMeter",state.hunger);setMeter("energyMeter",state.energy);setMeter("happyMeter",state.happy);setMeter("cleanMeter",state.clean);
  const sp=getSpecies(); const body=$("petBody");
  body.style.background=state.bodyColor; body.style.borderRadius=state.shape==="round"?"48% 48% 43% 43%":state.shape==="chubby"?"48% 48% 48% 48%":"42% 42% 38% 38%";
  $("petEars").style.display=["slime","penguin"].includes(sp.id)?"none":"block";
  if(sp.id==="rabbit"){$("petEars").style.transform="scaleY(1.4)";}else{$("petEars").style.transform="";}
  if(sp.id==="bear"){$("petEars").style.setProperty("--ear-color",state.bodyColor);}
  $("petHat").textContent=(getItem(state.hat)?.emoji)||"";
  $("petOutfit").textContent="";
  const outfit=getItem(state.outfit);
  $("petOutfit").style.background=outfit?.id==="dress"?"#ee8eb8":outfit?.id==="hoodie"?"#b9a7ef":outfit?.id==="wizard"?"#8870b8":outfit?.id==="tee"?"#f6a8c9":"transparent";
  $("petOutfit").style.border=outfit&&outfit.id!=="none"?"3px solid #fff8":"0";
  $("petAccessory").textContent=getItem(state.accessory)?.emoji||"";
  $("studioEmoji").textContent=sp.emoji; $("studioPetTitle").textContent=`${state.petName} si ${sp.name}`;
  $("questStatus").textContent=state.questDone?"1/1":"0/1";
  $("questText").textContent=state.questDone?"Misi selesai! Kamu keren ♡":"Mainkan mini-game sekali";
  renderSpeciesStrip();renderStudioOptions();renderShop();
}
function renderSpeciesStrip(){
  $("speciesStrip").innerHTML=SPECIES.slice(0,5).map(sp=>{
    const owned=state.ownedSpecies.includes(sp.id)||state.level>=sp.unlock;
    return `<button class="species-chip ${sp.id===state.species?"selected":""} ${owned?"":"locked"}" data-species="${sp.id}"><span class="species-emoji">${sp.emoji}</span><span>${sp.name}</span><small>${owned?"Pilih":`Lv. ${sp.unlock}`}</small></button>`;
  }).join("");
}
function renderStudioOptions(){
  $("speciesOptions").innerHTML=SPECIES.map(sp=>{const unlocked=state.ownedSpecies.includes(sp.id)||state.level>=sp.unlock;return `<button class="choice ${sp.id===state.species?"selected":""} ${unlocked?"":"locked"}" data-pick-species="${sp.id}">${sp.emoji} ${sp.name}${unlocked?"":` · Lv${sp.unlock}`}</button>`}).join("");
  $("colorOptions").innerHTML=COLORS.map(c=>`<button class="color-dot ${c.value===state.bodyColor?"selected":""}" data-color="${c.value}" style="background:${c.value}" title="${c.name}" aria-label="${c.name}"></button>`).join("");
  $("shapeOptions").innerHTML=[["round","Bulat"],["chubby","Chubby"],["tiny","Mini"]].map(([id,name])=>`<button class="choice ${state.shape===id?"selected":""}" data-shape="${id}">${name}</button>`).join("");
  ["outfit","hat","accessory"].forEach(type=>{
    const target=type==="outfit"?"outfitOptions":type==="hat"?"hatOptions":"accessoryOptions";
    const current=state[type];
    const entries=ITEMS.filter(i=>i.type===type && (state.owned.includes(i.id)||i.price===0));
    if(type!=="outfit") entries.unshift({id:"",type,name:"Tanpa",emoji:"✕",price:0,level:1});
    $(target).innerHTML=entries.map(item=>`<button class="item-choice ${current===item.id?"selected":""}" data-equip="${type}:${item.id}"><span>${item.emoji}</span><small>${item.name}</small></button>`).join("");
  });
}
function renderShop(){
  const list=ITEMS.filter(i=>i.id!=="none" && (currentFilter==="all"||i.type===currentFilter));
  $("shopGrid").innerHTML=list.map(item=>{
    const owned=state.owned.includes(item.id),levelLocked=state.level<item.level;
    const label=owned?"Sudah punya":levelLocked?`🔒 Level ${item.level}`:item.price===0?"Gratis":`🪙 ${item.price}`;
    return `<article class="shop-item"><div class="shop-art">${item.emoji}</div><b>${item.name}</b><small>${item.type==="outfit"?"Outfit":item.type==="hat"?"Topi":"Aksesori"}</small><button class="shop-buy ${owned?"owned":levelLocked?"locked":""}" data-buy="${item.id}" ${owned||levelLocked?"disabled":""}>${label}</button></article>`;
  }).join("");
}
function chooseSpecies(id){
  const sp=getSpecies(id);
  if(!state.ownedSpecies.includes(id)&&state.level<sp.unlock){toast(`Spesies ini terbuka di level ${sp.unlock} 🔒`);return;}
  state.species=id;state.bodyColor=sp.color;saveLocal();render();toast(`${sp.name} siap jadi bestie kamu!`);
}
function performAction(action){
  if(action==="feed"){if(state.coins<10){toast("Koin belum cukup, main mini-game dulu ya!");return;}state.coins-=10;state.hunger=Math.min(100,state.hunger+22);state.happy=Math.min(100,state.happy+3);toast("Nyam nyam! Pet kamu kenyang 🍓");}
  if(action==="play"){if(state.energy<12){toast("Energi pet kurang. Coba istirahat dulu!");return;}state.energy-=12;state.happy=Math.min(100,state.happy+16);gainXP(8);toast("Yeay, seru banget main bareng! 🧶");}
  if(action==="clean"){state.clean=100;state.happy=Math.min(100,state.happy+5);toast("Sekarang wangi dan bersih 🫧");}
  if(action==="sleep"){state.energy=Math.min(100,state.energy+30);state.hunger=Math.max(0,state.hunger-4);toast("Zzz... energi terisi 💕");}
  saveLocal();render();
}
function buyItem(id){
  const item=getItem(id);if(!item)return;
  if(state.owned.includes(id)){toast("Item ini sudah kamu punya ♡");return;}
  if(state.level<item.level){toast(`Butuh level ${item.level} untuk item ini 🔒`);return;}
  if(state.coins<item.price){toast("Koin kamu belum cukup 🪙");return;}
  state.coins-=item.price;state.owned.push(id);state[item.type]=id;saveLocal();render();toast(`${item.name} berhasil dibeli! ♡`);say("Item baru! Yeay!");
}
function randomStyle(){
  const choices=ITEMS.filter(i=>state.owned.includes(i.id));
  ["outfit","hat","accessory"].forEach(type=>{const c=choices.filter(i=>i.type===type);if(c.length)state[type]=c[Math.floor(Math.random()*c.length)].id;});
  state.bodyColor=COLORS[Math.floor(Math.random()*COLORS.length)].value;saveLocal();render();toast("Gaya random buat kamu ✨");
}
function openModal(content){$("modalContent").innerHTML=content;$("modalBackdrop").classList.remove("hidden");}
function closeModal(){$("modalBackdrop").classList.add("hidden");if(starGameInterval){clearInterval(starGameInterval);starGameInterval=null;}}
function openNameModal(){openModal(`<h2>Siapa nama bestie-nya? ♡</h2><p>Atur nama kamu dan nama pet kesayangan.</p><label class="small">Nama kamu</label><input id="editPlayerName" maxlength="20" value="${escapeAttr(state.playerName)}"><label class="small">Nama pet</label><input id="editPetName" maxlength="20" value="${escapeAttr(state.petName)}"><button class="primary-button" id="saveNames">Simpan nama ♡</button>`);$("saveNames").onclick=()=>{state.playerName=$("editPlayerName").value.trim()||"Bestie";state.petName=$("editPetName").value.trim()||"Mimi";saveLocal();render();closeModal();toast("Nama berhasil disimpan!");};}
function escapeAttr(s){return String(s).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
function openStarGame(){
  starGameScore=0;starGameRemaining=10;
  openModal(`<div class="section-heading"><div><p class="eyebrow">MINI GAME</p><h2>Star Tap 💫</h2></div><span class="timer-pill">⏱ <b id="starTimer">10</b>s</span></div><p>Tap bintang sebanyak mungkin sebelum waktunya habis. Setiap tap = 1 poin!</p><div class="game-stars" id="gameStars">${Array.from({length:10},(_,i)=>`<button class="game-star" data-star="${i}">${["⭐","✨","💫","🌟"][i%4]}</button>`).join("")}</div><p>Skor: <b id="starScore">0</b></p><button class="primary-button" id="startStarGame">Mulai game ▶</button>`);
  $("gameStars").querySelectorAll("[data-star]").forEach(btn=>btn.disabled=true);
  $("startStarGame").onclick=()=>{
    $("startStarGame").disabled=true;$("startStarGame").textContent="Gas terus! ✨";
    $("gameStars").querySelectorAll("[data-star]").forEach(btn=>btn.disabled=false);
    starGameInterval=setInterval(()=>{starGameRemaining--;$("starTimer").textContent=starGameRemaining;if(starGameRemaining<=0){clearInterval(starGameInterval);starGameInterval=null;finishStarGame();}},1000);
  };
  $("gameStars").querySelectorAll("[data-star]").forEach(btn=>btn.onclick=()=>{if(starGameRemaining<=0)return;starGameScore++;$("starScore").textContent=starGameScore;btn.textContent=["🌟","💖","✨","🪙"][Math.floor(Math.random()*4)];btn.style.background="#fff0cb";});
}
function finishStarGame(){const reward=Math.min(50,starGameScore*2);state.coins+=reward;state.happy=Math.min(100,state.happy+8);state.questDone=true;saveLocal();render();$("modalContent").insertAdjacentHTML("beforeend",`<div class="result-note"><h2>Time's up! 🎉</h2><p>Kamu dapat <b>${reward} koin</b> dan pet makin happy.</p><button class="primary-button" id="gameDone">Ambil hadiah ♡</button></div>`);$("gameDone").onclick=()=>{gainXP(Math.max(5,starGameScore));closeModal();toast(`+${reward} koin dan EXP!`);};}
function openMemoryGame(){
  const icons=["🍓","🌸","🐱","🌙","🎀","🍰","⭐","🫧"];const deck=[...icons,...icons].sort(()=>Math.random()-.5);
  memoryState={deck,opened:[],matched:[],moves:0,locked:false};
  openModal(`<div class="section-heading"><div><p class="eyebrow">MINI GAME</p><h2>Memory Match 🧠</h2></div><span class="timer-pill">Moves <b id="memoryMoves">0</b></span></div><p>Cari semua pasangan yang sama. Semakin sedikit langkah, semakin banyak EXP!</p><div class="memory-grid" id="memoryGrid">${deck.map((_,i)=>`<button class="memory-card" data-card="${i}">?</button>`).join("")}</div><p id="memoryHint">Temukan 8 pasangan.</p>`);
  $("memoryGrid").querySelectorAll("[data-card]").forEach(btn=>btn.onclick=()=>flipMemory(Number(btn.dataset.card)));
}
function flipMemory(index){
  const m=memoryState;if(!m||m.locked||m.opened.includes(index)||m.matched.includes(index))return;
  m.opened.push(index);const btn=$("memoryGrid").querySelector(`[data-card="${index}"]`);btn.textContent=m.deck[index];btn.classList.add("revealed");
  if(m.opened.length===2){m.moves++;$("memoryMoves").textContent=m.moves;const [a,b]=m.opened;
    if(m.deck[a]===m.deck[b]){m.matched.push(a,b);m.opened=[];[a,b].forEach(i=>{const el=$("memoryGrid").querySelector(`[data-card="${i}"]`);el.classList.add("matched");el.disabled=true;});if(m.matched.length===m.deck.length){$("memoryHint").textContent="Semua pasangan ketemu! 🎉";$("modalContent").insertAdjacentHTML("beforeend",`<button class="primary-button" id="memoryReward">Ambil +${Math.max(15,50-m.moves*2)} EXP ♡</button>`);$("memoryReward").onclick=()=>{const xp=Math.max(15,50-m.moves*2);state.questDone=true;gainXP(xp);closeModal();toast(`Keren! +${xp} EXP`);};}}
    else{m.locked=true;setTimeout(()=>{[a,b].forEach(i=>{const el=$("memoryGrid").querySelector(`[data-card="${i}"]`);if(el){el.textContent="?";el.classList.remove("revealed");}});m.opened=[];m.locked=false;},650);}
  }
}
async function syncProfile(){
  if(!client||!user)return;
  try{
    const payload={user_id:user.id,player_name:state.playerName,pet_name:state.petName,body_color:state.bodyColor,eye_color:"#594456",screen_color:"#f8c8d9",pet_state:state,updated_at:new Date().toISOString()};
    const {error}=await client.from("robot_profiles").upsert(payload,{onConflict:"user_id"});
    if(error)throw error;toast("Progres berhasil disinkronkan ☁");
  }catch(err){console.warn("Supabase sync error:",err);toast("Tersimpan di perangkat. Sinkronisasi Supabase belum berhasil.");}
}
async function signInFlow(){
  if(!client){toast("Supabase belum dikonfigurasi. Mode lokal tetap bisa dimainkan.");return;}
  openModal(`<h2>Login akun ♡</h2><p>Login untuk mencoba menyimpan progres ke Supabase. Kamu juga bisa main tanpa akun di perangkat ini.</p><form id="loginForm"><label class="small">Email</label><input id="loginEmail" type="email" required autocomplete="email" placeholder="email@example.com"><label class="small">Password</label><input id="loginPassword" type="password" required autocomplete="current-password" placeholder="Password"><button class="primary-button" type="submit">Login & sync ♡</button></form><button class="secondary-button" id="localMode">Lanjut mode lokal</button><p id="loginMessage"></p>`);
  $("localMode").onclick=closeModal;
  $("loginForm").onsubmit=async e=>{e.preventDefault();const btn=$("loginForm").querySelector("button[type=submit]");btn.disabled=true;btn.textContent="LOADING...";try{const {data,error}=await client.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});if(error)throw error;user=data.user;const {data:row,error:readError}=await client.from("robot_profiles").select("*").eq("user_id",user.id).maybeSingle();if(readError)throw readError;if(row&&row.pet_state){state={...cloneDefault(),...row.pet_state};state.playerName=row.player_name||state.playerName;state.petName=row.pet_name||state.petName;}else{await syncProfile();}saveLocal();render();closeModal();toast("Login berhasil! ♡");}catch(err){$("loginMessage").textContent=err.message||"Login gagal";}finally{btn.disabled=false;btn.textContent="Login & sync ♡";}};
}
function bindEvents(){
  document.body.addEventListener("click",e=>{
    const action=e.target.closest("[data-action]");if(action){performAction(action.dataset.action);return;}
    const species=e.target.closest("[data-species]");if(species){chooseSpecies(species.dataset.species);return;}
    const pick=e.target.closest("[data-pick-species]");if(pick){chooseSpecies(pick.dataset.pickSpecies);return;}
    const color=e.target.closest("[data-color]");if(color){state.bodyColor=color.dataset.color;saveLocal();render();return;}
    const shape=e.target.closest("[data-shape]");if(shape){state.shape=shape.dataset.shape;saveLocal();render();return;}
    const equip=e.target.closest("[data-equip]");if(equip){const [type,id]=equip.dataset.equip.split(":");state[type]=id;saveLocal();render();return;}
    const buy=e.target.closest("[data-buy]");if(buy){buyItem(buy.dataset.buy);return;}
    const filter=e.target.closest("[data-filter]");if(filter){currentFilter=filter.dataset.filter;document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===filter));renderShop();return;}
    const tab=e.target.closest("[data-tab]");if(tab){$("studio").scrollIntoView({behavior:"smooth"});return;}
    const scroll=e.target.closest("[data-scroll]");if(scroll){document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b===scroll));if(scroll.dataset.scroll==="top")window.scrollTo({top:0,behavior:"smooth"});else $(scroll.dataset.scroll).scrollIntoView({behavior:"smooth"});}
  });
  $("profileButton").onclick=openNameModal;
  $("accountButton").onclick=signInFlow;
  $("modalClose").onclick=closeModal;
  $("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal();});
  $("randomizeButton").onclick=randomStyle;
  $("saveStyleButton").onclick=async()=>{saveLocal();render();if(user)await syncProfile();else toast("Gaya disimpan di perangkat ini ♡");};
  $("tapGameButton").onclick=openStarGame;
  $("memoryGameButton").onclick=openMemoryGame;
  $("soundButton").onclick=()=>{soundOn=!soundOn;$("soundButton").textContent=soundOn?"♫":"♪";toast(soundOn?"Suara diaktifkan":"Suara dimatikan");if(soundOn)say("Hai bestie!");};
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
}
function applyElapsedTime(){
  const minutes=Math.floor((Date.now()-(state.lastSeen||Date.now()))/60000);
  if(minutes>0){state.hunger=Math.max(0,state.hunger-Math.min(20,minutes*.5));state.energy=Math.max(0,state.energy-Math.min(15,minutes*.25));state.clean=Math.max(0,state.clean-Math.min(15,minutes*.3));}
}
function init(){
  loadLocal();applyElapsedTime();bindEvents();render();saveLocal();
  setInterval(()=>{state.hunger=Math.max(0,state.hunger-.25);state.clean=Math.max(0,state.clean-.15);saveLocal();render();},60000);
  if(client){client.auth.getSession().then(({data})=>{if(data?.session?.user){user=data.session.user;}}).catch(()=>{});}
}
init();
