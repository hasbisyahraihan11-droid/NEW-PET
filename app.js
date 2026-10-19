/* MIMI PIXEL PET — edit SUPABASE_URL and SUPABASE_ANON_KEY below */
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
const STORAGE_BUCKET = "accessories";

const $ = (id) => document.getElementById(id);
const isConfigured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const sb = isConfigured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const defaultPet = () => ({hunger:80,happiness:80,energy:100,clean:100,level:1,exp:0,coins:0,last_tick:Date.now(),is_sleeping:false,sleep_until:null,feed_count:0,play_count:0,clean_count:0});
let state = {user:null, profile:null, pet:defaultPet(), accessories:[], owned:new Set(), equipped:{}, isAdmin:false, guest:true, counts:{feed:0,play:0,clean:0}, busy:false};
const MISSION_DEFS = [
  {id:"feed3", title:"Isi perut Mimi", desc:"Beri makan 3 kali", reward:25, target:3, key:"feed_count"},
  {id:"play2", title:"Waktu bermain", desc:"Main atau elus 2 kali", reward:20, target:2, key:"play_count"},
  {id:"clean1", title:"Kamar kinclong", desc:"Bersihkan Mimi 1 kali", reward:15, target:1, key:"clean_count"}
];
let toastTimer;

function say(msg, kind="normal") { $("speechBubble").textContent = msg; const s=$("petSprite"); s.classList.remove("happy","sad","hop","sleeping"); if(kind) s.classList.add(kind); }
function toast(msg) { const el=$("toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2400); }
function message(id,msg){$(id).textContent=msg;}
function clamp(n){return Math.max(0,Math.min(100,Math.round(n)));}
function dayKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
function safeText(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function formatCoins(n){return Math.max(0,Math.floor(Number(n)||0)).toLocaleString("id-ID");}

function showAuth(){ $("authPanel").hidden=false; $("gamePanel").hidden=true; }
function showGame(){ $("authPanel").hidden=true; $("gamePanel").hidden=false; }
function saveGuest(){try{localStorage.setItem("mimi_guest_v1",JSON.stringify({pet:state.pet,owned:[...state.owned],equipped:state.equipped,counts:state.counts,missionDay:dayKey(),missions:loadGuestMissions()}));}catch{}}
function loadGuestMissions(){try{const v=JSON.parse(localStorage.getItem("mimi_guest_v1")||"{}");return v.missionDay===dayKey()?v.missions||{}:{};}catch{return {};}}
function loadGuest(){try{const v=JSON.parse(localStorage.getItem("mimi_guest_v1")||"{}");if(v.pet)state.pet={...defaultPet(),...v.pet};state.owned=new Set(v.owned||[]);state.equipped=v.equipped||{};state.counts=v.counts||{feed:0,play:0,clean:0};}catch{} state.guest=true;state.user=null;state.profile=null;state.isAdmin=false;showGame();renderAll();message("saveStatus","Mode tamu · tersimpan di perangkat");}

async function authAction(kind){
  if(!sb){message("authMessage","Isi SUPABASE_URL dan SUPABASE_ANON_KEY di app.js, atau gunakan mode tamu.");return;}
  const email=$("emailInput").value.trim(), password=$("passwordInput").value;
  if(!email||password.length<6){message("authMessage","Masukkan email dan password minimal 6 karakter.");return;}
  $("loginBtn").disabled=$("signupBtn").disabled=true;
  try{
    const result=kind==="signup"?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});
    if(result.error) throw result.error;
    if(kind==="signup"&&!result.data.session){message("authMessage","Akun dibuat. Cek email untuk konfirmasi jika diminta, lalu masuk.");return;}
    await startUser(result.data.user || result.data.session?.user);
  }catch(e){message("authMessage",e.message||"Login gagal.");}
  finally{$("loginBtn").disabled=$("signupBtn").disabled=false;}
}
async function startUser(user){
  if(!user) return;
  state.user=user;state.guest=false;
  const {data:profile,error}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
  if(error) throw error;
  if(!profile){
    const {error:insertError}=await sb.from("profiles").insert({id:user.id,coins:0,pet_data:defaultPet(),owned_accessories:[],equipped_accessories:{},mission_day:dayKey(),mission_claims:{}});
    if(insertError) throw insertError;
    const {data:created,error:readError}=await sb.from("profiles").select("*").eq("id",user.id).single();
    if(readError) throw readError; state.profile=created;
  } else state.profile=profile;
  state.pet={...defaultPet(),...(state.profile.pet_data||{}),coins:Number(state.profile.coins)||0};
  state.owned=new Set(state.profile.owned_accessories||[]);
  state.equipped=state.profile.equipped_accessories||{};
  state.isAdmin=await checkAdmin();
  await loadAccessories(); showGame(); renderAll();
  message("saveStatus",state.isAdmin?"Admin · tersimpan online":"Tersimpan online");
}
async function checkAdmin(){
  // Admin status comes from the protected user_roles table, never from local storage.
  const {data,error}=await sb.from("user_roles").select("role").eq("user_id",state.user.id).eq("role","admin").maybeSingle();
  return !error && !!data;
}
async function loadAccessories(){
  if(!sb){state.accessories=[];return;}
  const {data,error}=await sb.from("accessories_catalog").select("*").eq("active",true).order("created_at",{ascending:false});
  if(error){console.warn(error);state.accessories=[];return;}
  state.accessories=data||[];
}
async function persistProfile(){
  if(state.guest){saveGuest();return true;}
  if(!sb||!state.user||!state.profile)return false;
  const petData={...state.pet};
  delete petData.coins;
  // Coin balance, owned accessories, and mission claims are changed only by protected RPCs.
  const payload={pet_data:petData,equipped_accessories:state.equipped,updated_at:new Date().toISOString()};
  const {error}=await sb.from("profiles").update(payload).eq("id",state.user.id);
  if(error){console.error(error);toast("Gagal menyimpan: "+error.message);return false;}
  state.profile={...state.profile,...payload};return true;
}
async function updateStat(action){
  if(state.pet.is_sleeping && action!=="wake"){toast("Mimi lagi tidur. Bangunkan dulu ya!");return;}
  if(action==="feed"){
    if(state.pet.hunger>=100){toast("Mimi sudah kenyang!");return;}
    state.pet.hunger=clamp(state.pet.hunger+25);state.pet.happiness=clamp(state.pet.happiness+3);state.pet.clean=clamp(state.pet.clean-2);state.pet.feed_count=(state.pet.feed_count||0)+1;state.counts.feed++;
    say("Nyam nyam! Makasih!","happy");
  }else if(action==="play"){
    if(state.pet.energy<12){toast("Energi Mimi kurang. Istirahat dulu!");return;}
    state.pet.happiness=clamp(state.pet.happiness+12);state.pet.energy=clamp(state.pet.energy-9);state.pet.play_count=(state.pet.play_count||0)+1;state.counts.play++;
    say("Yeay, seru banget!","hop");
  }else if(action==="clean"){
    state.pet.clean=100;state.pet.clean_count=(state.pet.clean_count||0)+1;state.counts.clean++;say("Wangi dan bersih!","happy");
  }else if(action==="sleep"){
    state.pet.is_sleeping=true;state.pet.sleep_until=Date.now()+20000;say("Zzz... mimpi indah!","sleeping");toast("Mimi tidur selama 20 detik.");
  }else if(action==="wake"){
    state.pet.is_sleeping=false;state.pet.sleep_until=null;state.pet.energy=clamp(state.pet.energy+10);say("Selamat pagi!","happy");
  }
  addExp(3);renderAll();await persistProfile();await updateMissions();
}
function addExp(amount){state.pet.exp=(state.pet.exp||0)+amount;while(state.pet.exp>=100){state.pet.exp-=100;state.pet.level=(state.pet.level||1)+1;state.pet.coins+=30;say("Naik level! Bonus 30 koin!","happy");toast("Level naik! +30 koin");}}
async function tick(){
  if(!state.guest&&!state.user)return;
  const now=Date.now();
  if(state.pet.is_sleeping){
    if(now >= (state.pet.sleep_until||now)){state.pet.is_sleeping=false;state.pet.sleep_until=null;state.pet.energy=clamp(state.pet.energy+35);say("Aku sudah bangun!","happy");toast("Mimi bangun dan energinya pulih!");}
    else {state.pet.energy=clamp(state.pet.energy+1);}
  }else{
    state.pet.hunger=clamp(state.pet.hunger-1);
    state.pet.happiness=clamp(state.pet.happiness-(state.pet.hunger<25?2:1));
    state.pet.energy=clamp(state.pet.energy-1);
    state.pet.clean=clamp(state.pet.clean-1);
    if(state.pet.hunger<20)say("Aku lapar nih...","sad");
    else if(state.pet.happiness<25)say("Temenin aku dong...","sad");
  }
  state.pet.last_tick=now;renderStats();await persistProfile();
}
function missionState(){
  if(state.guest)return loadGuestMissions();
  if(state.profile?.mission_day===dayKey())return state.profile.mission_claims||{};
  return {};
}
async function updateMissions(){
  renderMissions();
  if(!state.guest && state.user){
    const {error}=await sb.from("profiles").update({mission_day:dayKey(),mission_claims:missionState()}).eq("id",state.user.id);
    if(error)console.warn(error);
  } else saveGuest();
}
function progressFor(m){
  if(m.key==="feed_count")return state.pet.feed_count||0;
  if(m.key==="play_count")return state.pet.play_count||0;
  return state.pet.clean_count||0;
}
async function claimMission(id){
  const m=MISSION_DEFS.find(x=>x.id===id);if(!m)return;
  const claims=missionState();if(claims[id]){toast("Misi ini sudah diklaim hari ini.");return;}
  if(progressFor(m)<m.target){toast("Selesaikan misinya dulu ya!");return;}
  if(!state.guest){
    const {data,error}=await sb.rpc("claim_mission_reward",{mission_id:id});
    if(error){toast("Gagal klaim: "+error.message);return;}
    state.pet.coins=Number(data?.coins ?? state.pet.coins);
    if(!state.profile.mission_claims)state.profile.mission_claims={};
    state.profile.mission_claims[id]=true;
    state.profile.mission_day=dayKey();
  }else{
    state.pet.coins+=m.reward;const c=loadGuestMissions();c[id]=true;
    try{const v=JSON.parse(localStorage.getItem("mimi_guest_v1")||"{}");v.missions=c;v.missionDay=dayKey();localStorage.setItem("mimi_guest_v1",JSON.stringify(v));}catch{}
  }
  await persistProfile();renderAll();toast(`Misi selesai! +${m.reward} koin`);
}
function renderMissions(){
  const claims=missionState();
  $("missionList").innerHTML=MISSION_DEFS.map(m=>{
    const progress=Math.min(progressFor(m),m.target),done=!!claims[m.id],ready=progress>=m.target&&!done;
    return `<div class="mission ${done?"done":""}"><div class="mission-check">${done?"✓":`${progress}/${m.target}`}</div><div class="mission-copy"><b>${safeText(m.title)}</b><small>${safeText(m.desc)}</small></div><button class="mission-reward" data-claim="${m.id}" ${(!ready||done)?"disabled":""}>${done?"Selesai":`+${m.reward} ◉`}</button></div>`;
  }).join("");
  $("missionList").querySelectorAll("[data-claim]").forEach(b=>b.addEventListener("click",()=>claimMission(b.dataset.claim)));
}
function renderStats(){
  const p=state.pet;
  for(const [key,id] of [["hunger","hunger"],["happiness","happy"],["energy","energy"],["clean","clean"]]){
    $(id+"Value").textContent=p[key];$(id+"Bar").style.width=p[key]+"%";
    $(id+"Bar").style.background=p[key]<25?"#ff83b7":p[key]<50?"#ffda7c":"#8ef0cc";
  }
  $("coinBalance").textContent=formatCoins(p.coins);
  $("levelBadge").textContent="LV "+p.level;
  $("expBar").style.width=(p.exp||0)+"%";
  $("sleepLabel").textContent=p.is_sleeping?"Bangunkan":"Tidur";
  $("petGreeting").textContent=p.is_sleeping?"Mimi lagi tidur...":"Hai, aku Mimi!";
  $("weatherBadge").textContent=(new Date().getHours()>=6&&new Date().getHours()<18)?"☀ DAY":"☾ NIGHT";
  $("room").classList.toggle("night",new Date().getHours()<6||new Date().getHours()>=18);
  $("room").classList.toggle("day",!(new Date().getHours()<6||new Date().getHours()>=18));
  $("petSprite").classList.toggle("sleeping",p.is_sleeping);
}
function renderShop(){
  const shop=$("shopView");
  if(!state.accessories.length){shop.innerHTML='<p class="muted">Belum ada aksesori di katalog. Admin bisa upload aksesori pertama lewat Admin Studio.</p>';return;}
  shop.innerHTML=state.accessories.map(a=>{
    const owned=state.owned.has(a.id),levelOK=state.pet.level>=a.min_level,canBuy=owned|| (levelOK&&state.pet.coins>=a.price);
    return `<article class="accessory-card"><div class="item-preview">${a.image_url?`<img src="${safeText(a.image_url)}" alt="">`:`<span class="item-placeholder">✦</span>`}</div><h4>${safeText(a.name)}</h4><div class="item-meta">${safeText(a.category)} · Lv. ${a.min_level}</div><div class="item-price">${a.price===0?"GRATIS":`${formatCoins(a.price)} koin`}</div><button class="btn ${owned?"secondary":"primary"}" data-buy="${a.id}" ${(!canBuy&&!owned)?"disabled":""}>${owned?"Sudah dimiliki":!levelOK?"Butuh Lv "+a.min_level:state.pet.coins<a.price?"Koin kurang":"Beli"}</button></article>`;
  }).join("");
  shop.querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",()=>buyAccessory(b.dataset.buy)));
}
function renderInventory(){
  const inv=$("inventoryView"),items=state.accessories.filter(a=>state.owned.has(a.id));
  if(!items.length){inv.innerHTML='<p class="muted">Belum ada aksesori. Coba beli dari toko!</p>';return;}
  inv.innerHTML=items.map(a=>{const equipped=Object.values(state.equipped).includes(a.id);return `<article class="accessory-card"><div class="item-preview">${a.image_url?`<img src="${safeText(a.image_url)}" alt="">`:"<span class=item-placeholder>✦</span>"}</div><h4>${safeText(a.name)}</h4><div class="item-meta">${safeText(a.category)}</div><button class="btn ${equipped?"secondary":"primary"}" data-equip="${a.id}">${equipped?"Lepas":"Pakai"}</button></article>`}).join("");
  inv.querySelectorAll("[data-equip]").forEach(b=>b.addEventListener("click",()=>equipAccessory(b.dataset.equip)));
}
function renderAdmin(){
  $("adminTab").hidden=!state.isAdmin;if(!state.isAdmin)return;
  const el=$("adminCatalog");
  if(!state.accessories.length){el.innerHTML='<p class="muted">Katalog masih kosong.</p>';return;}
  el.innerHTML=state.accessories.map(a=>`<div class="admin-row">${a.image_url?`<img src="${safeText(a.image_url)}" alt="">`:""}<div class="row-copy"><b>${safeText(a.name)}</b><small>${formatCoins(a.price)} koin · Lv ${a.min_level} · ${safeText(a.category)}</small></div><button class="danger-btn" data-delete="${a.id}">Hapus</button></div>`).join("");
  el.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteAccessory(b.dataset.delete)));
}
function renderAll(){renderStats();renderMissions();renderShop();renderInventory();renderAdmin();renderEquipped();}
function renderEquipped(){
  const box=$("equippedOverlay");box.innerHTML="";
  for(const id of Object.values(state.equipped)){
    const a=state.accessories.find(x=>x.id===id);if(!a||!a.image_url)continue;
    const img=document.createElement("img");img.className="equipped-item";img.src=a.image_url;img.alt=a.name;
    img.style.width=`${Number(a.scale_pct)||55}%`;img.style.left=`${Number(a.pos_x)||50}%`;img.style.top=`${Number(a.pos_y)||12}%`;box.appendChild(img);
  }
}
async function buyAccessory(id){
  const a=state.accessories.find(x=>x.id===id);if(!a)return;
  if(state.owned.has(id)){toast("Aksesori sudah ada di koleksimu.");return;}
  if(state.pet.level<a.min_level){toast(`Butuh level ${a.min_level}.`);return;}
  if(state.pet.coins<a.price){toast("Koin kamu belum cukup!");return;}
  if(!state.guest){
    const {data,error}=await sb.rpc("buy_accessory",{accessory_id:id});
    if(error){toast("Pembelian gagal: "+error.message);return;}
    state.pet.coins=Number(data?.coins??state.pet.coins);state.owned.add(id);
  }else{state.pet.coins-=a.price;state.owned.add(id);}
  await persistProfile();renderAll();toast("Berhasil membeli "+a.name+"!");
}
async function equipAccessory(id){
  if(!state.owned.has(id)){toast("Kamu belum punya aksesori ini.");return;}
  const a=state.accessories.find(x=>x.id===id);if(!a)return;
  if(Object.values(state.equipped).includes(id)){
    for(const k of Object.keys(state.equipped))if(state.equipped[k]===id)delete state.equipped[k];
  }else state.equipped[a.category]=id;
  await persistProfile();renderAll();toast("Penampilan Mimi diperbarui!");
}
async function uploadAccessory(e){
  e.preventDefault();if(!state.isAdmin||!state.user||!sb){message("adminMessage","Hanya admin yang bisa upload.");return;}
  const file=$("accImage").files[0];if(!file){message("adminMessage","Pilih foto aksesori dulu.");return;}
  if(!["image/png","image/webp","image/jpeg"].includes(file.type)){message("adminMessage","Gunakan PNG, WebP, atau JPEG.");return;}
  if(file.size>3*1024*1024){message("adminMessage","Ukuran gambar maksimal 3 MB.");return;}
  const name=$("accName").value.trim(),price=Number($("accPrice").value),level=Number($("accLevel").value),scale=Number($("accScale").value),x=Number($("accX").value),y=Number($("accY").value),category=$("accCategory").value;
  if(!name||price<0||level<1||scale<10||scale>180){message("adminMessage","Periksa nama, harga, level, dan ukuran.");return;}
  const ext=file.name.split(".").pop().toLowerCase(),path=`${state.user.id}/${crypto.randomUUID()}.${ext}`;
  message("adminMessage","Mengunggah gambar...");
  const {error:uploadError}=await sb.storage.from(STORAGE_BUCKET).upload(path,file,{upsert:false,contentType:file.type});
  if(uploadError){message("adminMessage","Upload gagal: "+uploadError.message);return;}
  const {data:publicData}=sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const {error:insertError}=await sb.from("accessories_catalog").insert({name,price,min_level:level,category,scale_pct:scale,pos_x:x,pos_y:y,image_url:publicData.publicUrl,storage_path:path,created_by:state.user.id,active:true});
  if(insertError){message("adminMessage","Gagal menyimpan katalog: "+insertError.message);return;}
  $("accessoryForm").reset();$("accPrice").value=100;$("accLevel").value=1;$("accScale").value=55;$("accX").value=50;$("accY").value=12;
  message("adminMessage","Aksesori berhasil dipublikasikan!");await loadAccessories();renderAll();toast("Aksesori baru masuk ke toko!");
}
async function deleteAccessory(id){
  if(!state.isAdmin||!confirm("Hapus aksesori ini dari katalog?"))return;
  const a=state.accessories.find(x=>x.id===id);if(!a)return;
  const {error}=await sb.from("accessories_catalog").delete().eq("id",id);
  if(error){toast("Gagal menghapus: "+error.message);return;}
  if(a.storage_path)await sb.storage.from(STORAGE_BUCKET).remove([a.storage_path]);
  state.owned.delete(id);for(const k of Object.keys(state.equipped))if(state.equipped[k]===id)delete state.equipped[k];
  await persistProfile();await loadAccessories();renderAll();toast("Aksesori dihapus.");
}
function setTab(tab){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  $("shopView").hidden=tab!=="shop";$("inventoryView").hidden=tab!=="inventory";$("adminView").hidden=tab!=="admin"||!state.isAdmin;
}
function miniGame(guess){
  if(state.pet.is_sleeping){toast("Mimi sedang tidur!");return;}
  if(state.pet.energy<5){toast("Energi Mimi terlalu rendah.");return;}
  const answer=Math.random()<.5?"kiri":"kanan";state.pet.energy=clamp(state.pet.energy-5);
  if(guess===answer){state.pet.coins+=10;state.pet.happiness=clamp(state.pet.happiness+5);addExp(5);message("miniGameMessage",`Tebakan benar! Mimi ke ${answer}. +10 koin!`);say("Wih, kamu jago!","happy");}
  else{message("miniGameMessage",`Hampir! Mimi ke ${answer}. Coba lagi ya.`);say("Yah, coba lagi!","sad");}
  renderAll();persistProfile();
}
function bindEvents(){
  $("loginBtn").addEventListener("click",()=>authAction("login"));$("signupBtn").addEventListener("click",()=>authAction("signup"));
  $("guestBtn").addEventListener("click",loadGuest);
  $("accountBtn").addEventListener("click",async()=>{if(state.user&&sb){if(confirm("Keluar dari akun Mimi?")){await sb.auth.signOut();state={...state,user:null,profile:null,pet:defaultPet(),accessories:[],owned:new Set(),equipped:{},isAdmin:false,guest:true,counts:{feed:0,play:0,clean:0},busy:false};showAuth();}}else toast("Mode tamu: progres tersimpan di perangkat ini.");});
  document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",async()=>{const a=b.dataset.action;if(a==="sleep"&&state.pet.is_sleeping)await updateStat("wake");else await updateStat(a);}));
  document.querySelectorAll("[data-guess]").forEach(b=>b.addEventListener("click",()=>miniGame(b.dataset.guess)));
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
  $("accessoryForm").addEventListener("submit",uploadAccessory);
}
async function init(){
  bindEvents();
  if(sb){
    const {data:{session}}=await sb.auth.getSession();
    if(session?.user){try{await startUser(session.user);}catch(e){console.error(e);message("authMessage","Gagal memuat profil: "+e.message);showAuth();}}
    sb.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT")showAuth();});
  }else{message("authMessage","Mode online belum disambungkan. Isi URL dan anon key Supabase, atau main mode tamu.");}
  setInterval(tick,30000);
}
init();
