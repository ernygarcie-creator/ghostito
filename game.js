// ═══════════════════════════════════════════════════════════════════════
//  GHOSTITO — La Travesía del Alma   v4.0
//  Hitboxes corregidas · Partículas en coords mundo · Explosión total
//  Retroceso al recibir daño · Efectos de sonido Web Audio
// ═══════════════════════════════════════════════════════════════════════
(function () {
'use strict';

// ── Canvas ──────────────────────────────────────────────────────────────
const GW = 1600, GH = 900;
const canvas = document.getElementById('gc');
const ctx    = canvas.getContext('2d');
canvas.width  = GW;
canvas.height = GH;

function resize() {
  const s = Math.min(window.innerWidth/GW, window.innerHeight/GH);
  canvas.style.width  = (GW*s)+'px';
  canvas.style.height = (GH*s)+'px';
}
window.addEventListener('resize', resize);
resize();

// ── Móvil ────────────────────────────────────────────────────────────────
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
              || window.matchMedia('(pointer:coarse)').matches;
if (isMobile) document.getElementById('mc').classList.add('on');

// ── Constantes ───────────────────────────────────────────────────────────
const GHOST_SCALE = 0.70;
const FOOT_OFFSET = 82.3972;
const MOVE_SPEED  = 5;
const JUMP_SPEED  = -14;
const DASH_SPEED  = 15;
const ATTACK_SPD  = 2;
const DESC_SPD    = 3;
const GRAVITY     = 0.5;
const SCENE_IDX   = [-1, 0, 1, 2];
const WORLD_W     = SCENE_IDX.length * GW;
const START_IDX   = SCENE_IDX.indexOf(0);
const LIGHT_MAX   = 100;
const LIGHT_PER_HIT = 14;
const KNOCKBACK_SPD = 10;   // píxeles de retroceso al recibir daño
const KNOCKBACK_DUR = 12;   // frames de invulnerabilidad + retroceso

const DESC_REDUCTIONS = [
  0,5.1422,18.9294,25.8818,41.7907,
  49.7708,76.9557,92.5294,132.9139,167.9932
];

// ── Niveles ───────────────────────────────────────────────────────────────
const LEVELS = [
  { goal:5,  sp1spd:2, sp2spd:2, waveAmp:0.33, spawnMs:5000, maxActive:1,
    msg:'Bien, pequeño resplandor. El primer umbral ha cedido ante tu voluntad.' },
  { goal:8,  sp1spd:3, sp2spd:3, waveAmp:0.45, spawnMs:4000, maxActive:2,
    msg:'Los espectros se agitan con más furia. Mantén la llama encendida.' },
  { goal:10, sp1spd:4, sp2spd:4, waveAmp:0.55, spawnMs:3500, maxActive:2,
    msg:'El Demiurgo de las Sombras te ha notado. Avanza sin miedo.' },
  { goal:13, sp1spd:5, sp2spd:4, waveAmp:0.6,  spawnMs:3000, maxActive:3,
    msg:'Tus manos sostienen la Escarcha con más firmeza. Lo siento desde aquí.' },
  { goal:15, sp1spd:5, sp2spd:5, waveAmp:0.65, spawnMs:2800, maxActive:3,
    msg:'A mitad del camino. El túnel está más cerca. No te detengas.' },
  { goal:18, sp1spd:6, sp2spd:5, waveAmp:0.7,  spawnMs:2500, maxActive:3,
    msg:'Los espectros son más densos. Usa la Luz Primordial cuando te cerquen.' },
  { goal:20, sp1spd:7, sp2spd:6, waveAmp:0.72, spawnMs:2200, maxActive:4,
    msg:'El Demiurgo lanza oleadas dobles. Observa y actúa con decisión.' },
  { goal:25, sp1spd:8, sp2spd:7, waveAmp:0.75, spawnMs:2000, maxActive:4,
    msg:'Casi puedo verte desde aquí. El túnel pulsa con tu energía.' },
  { goal:28, sp1spd:9, sp2spd:8, waveAmp:0.78, spawnMs:1800, maxActive:5,
    msg:'El último velo se adelgaza. Reúne toda la luz para el paso final.' },
  { goal:30, sp1spd:10,sp2spd:9, waveAmp:0.82, spawnMs:1500, maxActive:5,
    msg:null },
];

// ── Diálogos ──────────────────────────────────────────────────────────────
const STORY_INTRO = [
  'Pequeño Resplandor entre las sombras… escúchame.',
  'Escúchame, vástago de la Luz Primera. Has caído lejos de mi protección.',
  'Unas manos oscuras intentaron apagar tu llama. Tu cuerpo yace en muerte clínica.',
  'Pero tu espíritu persiste. Vives una Experiencia Cercana a la Muerte… en un espacio más allá del espacio, un tiempo más allá del tiempo.',
  'Soy el Ser de Luz que aguarda al final del Túnel. Desde aquí puedo guiarte.',
  'Lo que ves no son espíritus verdaderos. Son fragmentos de almas mutiladas por el dolor, moldeadas por el Demiurgo de las Sombras para bloquearte el paso.',
  'Yo te envío ahora la Escarcha Espectral. Con ella podrás disolver esas sombras.',
  'Avanza y empuña la Escarcha Espectral.',
];
const STORY_POSTWEAPON = [
  'Bien. La tienes. Escucha: cada espectro que disuelvas libera luz protoplasmática.',
  'Esa materia de luz llenará tu reserva de Poder Primordial. Al completarse, podrás desatar una Explosión de Luz que barrerá todo lo que tengas alrededor.',
  'El túnel está más allá de múltiples umbrales. Asciende nivel a nivel. Yo estaré contigo.',
];

// ── Imágenes ──────────────────────────────────────────────────────────────
const IMAGE_NAMES = [
  'ghostito','ghostito_parpadeo',
  'left','left_parpadeo','right','right_parpadeo',
  'dash_left','dash_right',
  'descendio1','descendio2','descendio3','descendio4','descendio5',
  'descendio6','descendio7','descendio8','descendio9','descendio10',
  'attack1_right','attack2_right','attack3_right',
  'attack1_left','attack2_left','attack3_left',
  'r_sword1','r_sword2','r_sword3',
  'l_sword1','l_sword2','l_sword3',
  'espectro','espectro_parpadeo',
  'espectro2','espectro2_parpadeo',
  'another_one_bites_the_dust_left','another_one_bites_the_dust_right',
  '1_background_lontananza','1background','1_background_cercano',
  'background_lontananza','background','background_cercano',
  'background_lontananza_1','background1','background_cercano_1',
  'background_lontananza_2','background2','background_cercano_2',
];
const imgs = {};
let loadedCount = 0;

function loadImages(cb) {
  const total = IMAGE_NAMES.length;
  const msgs = ['Despertando en las sombras…','Forjando la Escarcha Espectral…','Tejiendo los umbrales…','¡El Ser de Luz aguarda!'];
  IMAGE_NAMES.forEach(name => {
    const im = new Image();
    im.onload  = () => { imgs[name]=im; tick(); };
    im.onerror = () => { imgs[name]=null; tick(); };
    im.src = `images/${name}.png`;
  });
  function tick() {
    loadedCount++;
    const pct = Math.round(loadedCount/total*100);
    document.getElementById('loadFill').style.width = pct+'%';
    document.getElementById('loadTxt').textContent  = msgs[Math.min(3,Math.floor(pct/26))];
    if (loadedCount===total) cb();
  }
}

// ── Música ────────────────────────────────────────────────────────────────
const music = new Audio('music/musicether_oar_the_whole_other.mp3');
music.loop=true; music.volume=0.4;
function tryMusic(){ music.play().catch(()=>{}); }

// ── Web Audio SFX (sin archivos externos) ────────────────────────────────
let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return audioCtx;
}

function sfxSword(){
  // Silbido metálico corto
  try {
    const ac=getAudioCtx();
    const osc=ac.createOscillator();
    const gain=ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(800,ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200,ac.currentTime+0.12);
    gain.gain.setValueAtTime(0.18,ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.14);
    osc.start(ac.currentTime); osc.stop(ac.currentTime+0.15);
  } catch(e){}
}

function sfxHit(){
  // Impacto sordo cuando un espectro golpea a Ghostito
  try {
    const ac=getAudioCtx();
    const buf=ac.createBuffer(1,ac.sampleRate*0.15,ac.sampleRate);
    const data=buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
    const src=ac.createBufferSource();
    const gain=ac.createGain();
    const filt=ac.createBiquadFilter();
    filt.type='lowpass'; filt.frequency.value=400;
    src.buffer=buf; src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.4,ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.15);
    src.start(ac.currentTime);
  } catch(e){}
}

function sfxKill(){
  // Dissolución etérea al eliminar un espectro
  try {
    const ac=getAudioCtx();
    const osc=ac.createOscillator();
    const gain=ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type='sine';
    osc.frequency.setValueAtTime(300,ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900,ac.currentTime+0.08);
    osc.frequency.exponentialRampToValueAtTime(150,ac.currentTime+0.25);
    gain.gain.setValueAtTime(0.22,ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.28);
    osc.start(ac.currentTime); osc.stop(ac.currentTime+0.3);
  } catch(e){}
}

function sfxExplosion(){
  // Estallido de luz primordial
  try {
    const ac=getAudioCtx();
    const buf=ac.createBuffer(1,ac.sampleRate*0.5,ac.sampleRate);
    const data=buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,1.5);
    const src=ac.createBufferSource();
    const gain=ac.createGain();
    const filt=ac.createBiquadFilter();
    filt.type='bandpass'; filt.frequency.value=200; filt.Q.value=0.5;
    src.buffer=buf; src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.6,ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.5);
    src.start(ac.currentTime);
  } catch(e){}
}

// ── Estado global ─────────────────────────────────────────────────────────
let phase = 'intro';
let dlgQueue=[], dlgIdx=0, dlgCallback=null;

// Ghostito — todas las coordenadas son MUNDO (no pantalla)
let gx, gy, gvy, gDir, gSt;
let blinkT, blinking;
let attacking, atkFrame, atkTimer, swordName;
let dashLeft, descending, descRev, descStage, descT;
let dustPending;
let knockbackFrames=0, knockbackDir=1;  // retroceso al recibir daño
let invFrames=0;                         // frames de invulnerabilidad

// Progreso
let hp, lightPower, currentLevel, defeated, cameraX;

// Espectros: cada objeto tiene coords MUNDO {wx, wy, phase}
let sp1list=[], sp2list=[];
let sp1timer=0, sp2timer=0, waveT=0;

// Partículas: coords MUNDO {wx, wy, vx, vy, life, size, color}
let lightParticles=[];

// Explosión visual
let explosionActive=false, explosionR=0, explosionAlpha=0;

// ── Tamaños de sprite (acceso directo, sin reescalar) ────────────────────
// Todos los sprites se dibujan a su tamaño REAL × GHOST_SCALE (para Ghostito)
// o × 0.7 (para espectros). Las hitboxes usan ESE tamaño, sin multiplicar de nuevo.

function ghostW(){ const i=imgs['ghostito']; return i ? i.naturalWidth *GHOST_SCALE : 80; }
function ghostH(){ const i=imgs['ghostito']; return i ? i.naturalHeight*GHOST_SCALE : 100; }

// Tamaño DIBUJADO de espectro1 (lo mismo que se pasa a drawImage)
function sp1W(){ const i=imgs['espectro']; return i ? i.naturalWidth *0.7 : 60; }
function sp1H(){ const i=imgs['espectro']; return i ? i.naturalHeight*0.7 : 80; }

// Tamaño DIBUJADO de espectro2
function sp2W(){ const i=imgs['espectro2']; return i ? i.naturalWidth *0.7 : 60; }
function sp2H(){ const i=imgs['espectro2']; return i ? i.naturalHeight*0.7 : 80; }

// ── HITBOXES — todas en coordenadas MUNDO ────────────────────────────────
// Regla: usamos el tamaño real dibujado, luego lo reducimos un poco
// al centro del sprite (80% ancho, 85% alto) para ser justo con el jugador.

function ghostRect(){
  const w=ghostW()*0.72, h=ghostH()*0.82;
  return { x:gx-w/2, y:gy-h/2, w, h };
}

function swordRect(){
  if(!swordName) return null;
  const si=imgs[swordName]; if(!si) return null;
  // La espada se dibuja a escala 1.0 (tamaño natural)
  const sw=si.naturalWidth, sh=si.naturalHeight;
  let sx;
  if(swordName.startsWith('r_')){
    // Golpea a la derecha: empieza en el borde derecho de Ghostito
    sx = gx + ghostW()*0.5 - sw*0.1;
  } else {
    // Golpea a la izquierda: termina en el borde izquierdo de Ghostito
    sx = gx - ghostW()*0.5 - sw*0.9;
  }
  const sy = gy - sh*0.7;
  return { x:sx, y:sy, w:sw, h:sh };
}

// Espectro1: se dibuja centrado en (sp.wx, sp.wy) con tamaño sp1W×sp1H
function spRect1(sp){
  const w=sp1W()*0.78, h=sp1H()*0.78;
  return { x:sp.wx-w/2, y:sp.wy-h/2, w, h };
}

// Espectro2: se dibuja centrado en (sp.wx, sp.wy) — flip horizontal solo visual
// La hitbox NO se ve afectada por el flip, sigue centrada en sp.wx
function spRect2(sp){
  const w=sp2W()*0.78, h=sp2H()*0.78;
  return { x:sp.wx-w/2, y:sp.wy-h/2, w, h };
}

function overlap(a,b){
  return a&&b && a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
}

// ── HUD ───────────────────────────────────────────────────────────────────
const heartsEl    = document.getElementById('hearts');
const scoreEl     = document.getElementById('scoreEl');
const levelEl     = document.getElementById('levelEl');
const lightFillEl = document.getElementById('lightFill');

function updateHUD(){
  heartsEl.innerHTML='';
  for(let i=0;i<5;i++){
    const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 24 24'); s.classList.add('heart');
    if(i>=hp) s.classList.add('lost');
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d','M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
    p.setAttribute('fill', i<hp?'#ff4466':'rgba(255,255,255,0.12)');
    s.appendChild(p); heartsEl.appendChild(s);
  }
  const lv=LEVELS[currentLevel];
  scoreEl.textContent = `${defeated} / ${lv.goal}`;
  levelEl.textContent = `Nivel ${currentLevel+1}`;
  lightFillEl.style.width = Math.round(lightPower/LIGHT_MAX*100)+'%';
}

function initLevel(){
  sp1list=[]; sp2list=[]; sp1timer=0; sp2timer=0; waveT=0;
}

function initState(){
  gx=START_IDX*GW+GW/2; gy=0; gvy=0;
  gDir='right'; gSt='ghostito';
  blinkT=0; blinking=false;
  attacking=false; atkFrame=0; atkTimer=0; swordName=null;
  dashLeft=0; descending=false; descRev=false; descStage=0; descT=0;
  dustPending=null; knockbackFrames=0; invFrames=0;
  hp=5; lightPower=0; currentLevel=0; defeated=0; cameraX=0;
  lightParticles=[]; explosionActive=false;
  initLevel(); updateHUD();
}

// ── Diálogo ───────────────────────────────────────────────────────────────
const dlgEl     = document.getElementById('dlg');
const dlgTextEl = document.getElementById('dlgText');

function showDialog(lines, cb){
  dlgQueue = Array.isArray(lines)?lines:[lines];
  dlgIdx=0; dlgCallback=cb||null;
  dlgEl.classList.add('on');
  dlgTextEl.textContent=dlgQueue[0];
}
function advanceDialog(){
  dlgIdx++;
  if(dlgIdx<dlgQueue.length){
    dlgTextEl.textContent=dlgQueue[dlgIdx];
    const box=dlgEl.querySelector('#dlgBox');
    box.style.animation='none';
    requestAnimationFrame(()=>{ box.style.animation=''; });
  } else {
    dlgEl.classList.remove('on');
    if(dlgCallback){ const f=dlgCallback; dlgCallback=null; f(); }
  }
}

// ── Teclado ───────────────────────────────────────────────────────────────
const K={};
document.addEventListener('keydown',e=>{
  if(!K[e.code]){ K[e.code]=true; onKeyDown(e.code); }
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup',e=>{ K[e.code]=false; onKeyUp(e.code); });

// ── Controles móvil ───────────────────────────────────────────────────────
function mobHold(id,code){
  const el=document.getElementById(id); if(!el) return;
  const dn=e=>{ e.preventDefault(); el.classList.add('pressed'); if(!K[code]){K[code]=true;onKeyDown(code);} };
  const up=e=>{ e.preventDefault(); el.classList.remove('pressed'); K[code]=false; onKeyUp(code); };
  el.addEventListener('touchstart',dn,{passive:false});
  el.addEventListener('touchend',up,{passive:false});
  el.addEventListener('mousedown',dn); el.addEventListener('mouseup',up);
}
function mobTap(id,code){
  const el=document.getElementById(id); if(!el) return;
  const dn=e=>{ e.preventDefault(); el.classList.add('pressed'); onKeyDown(code); };
  const up=e=>{ e.preventDefault(); el.classList.remove('pressed'); onKeyUp(code); };
  el.addEventListener('touchstart',dn,{passive:false});
  el.addEventListener('touchend',up,{passive:false});
  el.addEventListener('mousedown',dn); el.addEventListener('mouseup',up);
}

mobHold('dL','ArrowLeft'); mobHold('dR','ArrowRight');
mobTap('dU','Space');
mobTap('btnB','Space');
mobTap('btnY','KeyX');
mobTap('btnX','KeyZ');
mobTap('btnA','KeyC');
mobHold('btnZR','KeyA');

canvas.addEventListener('touchend',e=>{ e.preventDefault(); handleInput(); },{passive:false});

function handleInput(){
  if(dlgEl.classList.contains('on')){ advanceDialog(); return; }
}

// ── Inputs del juego ──────────────────────────────────────────────────────
function onKeyDown(code){
  if(dlgEl.classList.contains('on')){ advanceDialog(); return; }
  if(phase==='intro'||phase==='levelclear') return;
  if(phase==='decision'){
    if(code==='ArrowLeft') endGame('back');
    if(code==='ArrowRight'||code==='Space'||code==='Enter') endGame('light');
    return;
  }
  if(phase==='over'||phase==='ending_back'||phase==='ending_light'){
    if(code==='Enter'){ initState(); startIntro(); }
    return;
  }
  if(phase!=='playing') return;

  if(code==='Space'&&gvy===0&&!descending){
    gvy=JUMP_SPEED; gSt=gDir;
  } else if((code==='KeyA'||code==='ShiftRight')&&dashLeft===0&&!descending){
    dustPending={wx:gx,wy:gy,dir:gDir}; dashLeft=DASH_SPEED; gSt=`dash_${gDir}`;
  } else if(code==='KeyX'&&!attacking&&!descending){
    if(gSt==='ghostito') gSt=gDir;
    attacking=true; atkFrame=0; atkTimer=0;
    swordName=`${gDir==='right'?'r':'l'}_sword1`;
    sfxSword();
  } else if(code==='KeyZ'){
    triggerLightExplosion();
  } else if(code==='ArrowDown'&&!descending){
    descending=true; descRev=false; descStage=1; descT=0;
  }
}
function onKeyUp(code){
  if(code==='ArrowDown'&&descending) descRev=true;
}

// ── Partículas de luz — coords MUNDO ─────────────────────────────────────
// CORRECCIÓN: se guardan en coordenadas MUNDO, la cámara se aplica solo al dibujar
function spawnLightParticles(worldX, worldY){
  for(let i=0;i<16;i++){
    const angle=Math.random()*Math.PI*2;
    const spd=1.5+Math.random()*3.5;
    lightParticles.push({
      wx: worldX,            // coord MUNDO
      wy: worldY,
      vx: Math.cos(angle)*spd,
      vy: Math.sin(angle)*spd - 1.5,
      life:1, size:3+Math.random()*4,
      color: Math.random()<0.5 ? '#f0c060' : '#ffffff'
    });
  }
}

// ── Flash ─────────────────────────────────────────────────────────────────
const flashEl=document.getElementById('flash');
function triggerFlash(){
  flashEl.style.background='rgba(255,255,255,0.9)';
  setTimeout(()=>{ flashEl.style.background='rgba(255,255,255,0)'; },200);
}

// ── Explosión de luz primordial ────────────────────────────────────────────
// El radio cubre toda la pantalla visible (convertimos a unidades de pantalla)
function triggerLightExplosion(){
  if(lightPower<LIGHT_MAX) return;
  lightPower=0; updateHUD();
  sfxExplosion();
  triggerFlash();
  explosionActive=true; explosionR=0; explosionAlpha=0.9;

  // Eliminar TODOS los espectros visibles en pantalla
  // Un espectro es visible si su coord pantalla está entre 0 y GW
  sp1list=sp1list.filter(sp=>{
    const screenX=sp.wx-cameraX;
    if(screenX>-100 && screenX<GW+100){
      spawnLightParticles(sp.wx, sp.wy);
      defeated++; return false;
    }
    return true;
  });
  sp2list=sp2list.filter(sp=>{
    const screenX=sp.wx-cameraX;
    if(screenX>-100 && screenX<GW+100){
      spawnLightParticles(sp.wx, sp.wy);
      defeated++; return false;
    }
    return true;
  });
  updateHUD(); checkLevelClear();
}

// ── Knockback al recibir daño ─────────────────────────────────────────────
function applyKnockback(fromDir){
  // fromDir: 'left' si el espectro viene desde la izquierda, 'right' desde la derecha
  knockbackDir = (fromDir==='left') ? 1 : -1;  // Ghostito sale empujado al lado opuesto
  knockbackFrames=KNOCKBACK_DUR;
  invFrames=KNOCKBACK_DUR*2;  // invulnerabilidad el doble de tiempo
  sfxHit();
}

// ── UPDATE ────────────────────────────────────────────────────────────────
function update(dt){
  if(phase!=='playing') return;

  const ml=!!K['ArrowLeft'], mr=!!K['ArrowRight'];
  const lv=LEVELS[currentLevel];

  // ── Knockback (tiene prioridad sobre movimiento normal) ──────────────
  if(knockbackFrames>0){
    gx += knockbackDir * KNOCKBACK_SPD;
    knockbackFrames--;
  }
  if(invFrames>0) invFrames--;

  // ── Descendio ────────────────────────────────────────────────────────
  if(descending){
    descT++;
    if(descT>=DESC_SPD){ descT=0;
      if(!descRev) descStage=Math.min(10,descStage+1);
      else{ descStage=Math.max(1,descStage-1); if(descStage===1){descending=false;descRev=false;} }
    }
    if(knockbackFrames<=0){
      if(ml){gx=Math.max(0,gx-MOVE_SPEED);gDir='left';}
      if(mr){gx=Math.min(WORLD_W,gx+MOVE_SPEED);gDir='right';}
    }
  } else {
    if(dashLeft>0){
      gx+=(gSt.includes('right')?DASH_SPEED:-DASH_SPEED); dashLeft--;
    } else if(knockbackFrames<=0){
      if(ml){gx=Math.max(0,gx-MOVE_SPEED);gDir='left';gSt='left';}
      else if(mr){gx=Math.min(WORLD_W,gx+MOVE_SPEED);gDir='right';gSt='right';}
      else gSt=gDir;
    }
    gvy+=GRAVITY; gy+=gvy;
    if(attacking){
      atkTimer++;
      if(atkTimer>=ATTACK_SPD){ atkFrame++; atkTimer=0;
        if(atkFrame>=3){attacking=false;atkFrame=0;swordName=null;}
        else swordName=`${gDir==='right'?'r':'l'}_sword${atkFrame+1}`;
      }
    }
    const hw=ghostW()/2;
    gx=Math.max(hw,Math.min(WORLD_W-hw,gx));
  }

  // ── Suelo ────────────────────────────────────────────────────────────
  const floorY=GH-(FOOT_OFFSET*(GH/600));
  if(!descending&&!descRev){
    const minY=floorY-ghostH()/2;
    if(gy>minY){gy=minY;gvy=0;}
  } else {
    const r=descStage>0?DESC_REDUCTIONS[descStage-1]:0;
    gy=floorY-(ghostH()-r)/2;
  }

  cameraX=Math.min(Math.max(gx-GW/2,0),WORLD_W-GW);

  // Parpadeo
  blinkT+=dt/1000;
  if(!blinking&&blinkT>=3){blinking=true;blinkT=0;}
  else if(blinking&&blinkT>=0.2){blinking=false;blinkT=0;}

  waveT+=0.05;

  // ── Spawn ────────────────────────────────────────────────────────────
  const maxA=lv.maxActive;
  sp1timer+=dt;
  if(sp1timer>=lv.spawnMs&&sp1list.length<maxA){
    sp1timer=0;
    sp1list.push({ wx:SCENE_IDX.indexOf(2)*GW+GW, wy:GH/2, phase:Math.random()*Math.PI*2 });
  }
  sp2timer+=dt;
  if(sp2timer>=lv.spawnMs*1.3&&sp2list.length<maxA){
    sp2timer=0;
    sp2list.push({ wx:-sp2W(), wy:gy });
  }

  // ── Espada rect (en coords MUNDO) ────────────────────────────────────
  const sr=swordRect();

  // ── Espectro1 ─────────────────────────────────────────────────────────
  sp1list=sp1list.filter(sp=>{
    sp.wx-=lv.sp1spd;
    sp.phase+=0.05;
    const amp=(GH/2)*lv.waveAmp;
    sp.wy = currentLevel>=5
      ? GH/2 + amp*Math.sin(sp.phase) + amp*0.3*Math.sin(sp.phase*2.7)
      : GH/2 + amp*Math.sin(sp.phase);

    // Espada golpea espectro1
    if(attacking && overlap(sr, spRect1(sp))){
      spawnLightParticles(sp.wx, sp.wy);
      sfxKill();
      defeated++; lightPower=Math.min(LIGHT_MAX,lightPower+LIGHT_PER_HIT);
      updateHUD(); checkLevelClear(); return false;
    }
    // Espectro1 golpea Ghostito (solo si no está en invulnerabilidad)
    if(invFrames<=0 && overlap(ghostRect(), spRect1(sp))){
      hp--; updateHUD(); checkDead();
      applyKnockback('right'); // sp1 viene de la derecha, empuja a Ghostito a la izquierda
      return false;
    }
    if(sp.wx<-200) return false;
    return true;
  });

  // ── Espectro2 ─────────────────────────────────────────────────────────
  sp2list=sp2list.filter(sp=>{
    sp.wx+=lv.sp2spd;
    sp.wy = gy + (currentLevel>=4 ? Math.sin(waveT*2)*50 : 0);

    // Espada golpea espectro2
    if(attacking && overlap(sr, spRect2(sp))){
      spawnLightParticles(sp.wx, sp.wy);
      sfxKill();
      defeated++; lightPower=Math.min(LIGHT_MAX,lightPower+LIGHT_PER_HIT);
      updateHUD(); checkLevelClear(); return false;
    }
    // Espectro2 golpea Ghostito
    if(invFrames<=0 && overlap(ghostRect(), spRect2(sp))){
      hp--; updateHUD(); checkDead();
      applyKnockback('left'); // sp2 viene de la izquierda, empuja a Ghostito a la derecha
      return false;
    }
    if(sp.wx>WORLD_W+200) return false;
    return true;
  });

  // ── Partículas — actualizar en coords MUNDO ───────────────────────────
  lightParticles=lightParticles.filter(p=>{
    p.wx+=p.vx; p.wy+=p.vy; p.vy+=0.12; p.life-=0.028;
    return p.life>0;
  });

  // ── Explosión visual ──────────────────────────────────────────────────
  if(explosionActive){
    explosionR+=28; explosionAlpha-=0.045;
    if(explosionAlpha<=0){explosionActive=false;}
  }
}

function checkDead(){ if(hp<=0){hp=0;updateHUD();phase='over';} }

function checkLevelClear(){
  const lv=LEVELS[currentLevel];
  if(defeated>=lv.goal){
    phase='levelclear'; sp1list=[]; sp2list=[];
    if(currentLevel===9){
      setTimeout(()=>{ phase='decision'; },800);
    } else {
      setTimeout(()=>{
        showDialog([lv.msg,'¿Estás listo para el siguiente umbral?'],()=>{
          currentLevel++; defeated=0; initLevel(); updateHUD(); phase='playing';
        });
      },600);
    }
  }
}

function endGame(choice){
  phase = choice==='back' ? 'ending_back' : 'ending_light';
}

// ── DRAW ──────────────────────────────────────────────────────────────────
function draw(ts){
  ctx.clearRect(0,0,GW,GH);

  if(phase==='intro')        { drawDarkness(ts); return; }
  if(phase==='over')         { drawGameOver(ts); return; }
  if(phase==='decision')     { drawDecision(ts); return; }
  if(phase==='ending_back')  { drawEndingBack(ts); return; }
  if(phase==='ending_light') { drawEndingLight(ts); return; }

  // ── Juego (playing | levelclear) ───────────────────────────────────

  // 1) Fondos lontananza
  SCENE_IDX.forEach((idx,pos)=>{
    const xOff=pos*GW-cameraX;
    const name=idx<0?`${Math.abs(idx)}_background_lontananza`:idx>0?`background_lontananza_${idx}`:'background_lontananza';
    if(imgs[name]) ctx.drawImage(imgs[name],xOff,0,GW,GH);
    else{ ctx.fillStyle='#050518'; ctx.fillRect(xOff,0,GW,GH); }
  });

  // 2) Fondos medios
  SCENE_IDX.forEach((idx,pos)=>{
    const xOff=pos*GW-cameraX;
    const name=idx<0?`${Math.abs(idx)}background`:idx>0?`background${idx}`:'background';
    if(imgs[name]) ctx.drawImage(imgs[name],xOff,0,GW,GH);
  });

  // 2.5) Polvo de dash
  if(dustPending){
    const{wx,wy,dir}=dustPending;
    const dn=`another_one_bites_the_dust_${dir}`;
    const di=imgs[dn];
    if(di){ const sx=dir==='left'?wx-cameraX:wx-cameraX-di.naturalWidth; ctx.drawImage(di,sx,wy-di.naturalHeight/2); }
    dustPending=null;
  }

  // 3) Ghostito + espada
  drawGhost(ts);

  // 4) Primer plano
  SCENE_IDX.forEach((idx,pos)=>{
    const xOff=pos*GW-cameraX;
    const name=idx<0?`${Math.abs(idx)}_background_cercano`:idx>0?`background_cercano_${idx}`:'background_cercano';
    if(imgs[name]) ctx.drawImage(imgs[name],xOff,0,GW,GH);
  });

  // 5) Espectro1 — centrado en (sp.wx, sp.wy)
  sp1list.forEach(sp=>{
    const si=imgs['espectro']; if(!si) return;
    const w=sp1W(), h=sp1H();
    const sx=sp.wx-cameraX-w/2;
    const sy=sp.wy-h/2;
    ctx.drawImage(si,sx,sy,w,h);
  });

  // 6) Espectro2 — centrado en (sp.wx, sp.wy), flip horizontal solo visual
  // La hitbox se calcula con sp.wx sin offset de flip
  sp2list.forEach(sp=>{
    const si=imgs['espectro2']; if(!si) return;
    const w=sp2W(), h=sp2H();
    const cx_screen=sp.wx-cameraX;  // centro en pantalla
    ctx.save();
    ctx.translate(cx_screen, sp.wy-h/2);
    ctx.scale(-1,1);
    ctx.drawImage(si,-w/2,-0,w,h);   // drawImage desde -w/2 para que el centro quede en 0
    ctx.restore();
  });

  // 7) Partículas — CORRECCIÓN: convertir coord mundo a pantalla al dibujar
  lightParticles.forEach(p=>{
    const sx=p.wx-cameraX;   // ← coord pantalla calculada aquí
    const sy=p.wy;
    ctx.save();
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.shadowColor=p.color; ctx.shadowBlur=10;
    ctx.beginPath();
    ctx.arc(sx,sy,p.size,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  });

  // 8) Explosión visual (centrada en Ghostito en pantalla)
  if(explosionActive){
    const gsx=gx-cameraX;
    ctx.save();
    ctx.globalAlpha=explosionAlpha*0.4;
    const grad=ctx.createRadialGradient(gsx,gy,0,gsx,gy,explosionR);
    grad.addColorStop(0,'#ffffff');
    grad.addColorStop(0.4,'#f0c060');
    grad.addColorStop(1,'rgba(240,192,96,0)');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.arc(gsx,gy,explosionR,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // 9) Banner nivel completado
  if(phase==='levelclear'){
    ctx.save();
    ctx.globalAlpha=0.75; ctx.fillStyle='#03020c';
    ctx.fillRect(0,GH/2-65,GW,130);
    ctx.globalAlpha=1;
    ctx.textAlign='center';
    ctx.font=`bold ${GW*0.042}px 'Cinzel Decorative',serif`;
    ctx.fillStyle='#f0c060'; ctx.shadowColor='#f0c060'; ctx.shadowBlur=30;
    ctx.fillText(`✦ Umbral ${currentLevel+1} superado ✦`,GW/2,GH/2+16);
    ctx.shadowBlur=0; ctx.textAlign='left';
    ctx.restore();
  }
}

function drawGhost(ts){
  const sx=gx-cameraX;

  // Parpadeo de invulnerabilidad: Ghostito titila
  if(invFrames>0 && Math.floor(ts/80)%2===0) return;

  // Espada detrás de Ghostito (misma lógica de posición que swordRect)
  if(attacking&&swordName&&imgs[swordName]){
    const si=imgs[swordName];
    const sw=si.naturalWidth, sh=si.naturalHeight;
    let sxp;
    if(swordName.startsWith('r_')){
      sxp=sx+ghostW()*0.5-sw*0.1;
    } else {
      sxp=sx-ghostW()*0.5-sw*0.9;
    }
    ctx.drawImage(si,sxp,gy-sh*0.7,sw,sh);
  }

  // Ghostito
  let iname;
  if(descending||descRev)    iname=`descendio${descStage}`;
  else if(attacking)          iname=gSt;
  else if(blinking)           iname=['left','right'].includes(gSt)?`${gSt}_parpadeo`:'ghostito_parpadeo';
  else                        iname=gSt;

  const gi=imgs[iname]||imgs['ghostito'];
  if(gi){
    const gw=gi.naturalWidth*GHOST_SCALE, gh=gi.naturalHeight*GHOST_SCALE;
    ctx.drawImage(gi,sx-gw/2,gy-gh/2,gw,gh);
  }
}

// ── Pantallas ─────────────────────────────────────────────────────────────
function drawDarkness(ts){
  ctx.fillStyle='#03020c'; ctx.fillRect(0,0,GW,GH);
  const p=0.04+0.03*Math.sin(ts/800);
  const grd=ctx.createRadialGradient(GW/2,GH/2,0,GW/2,GH/2,300);
  grd.addColorStop(0,`rgba(126,207,255,${p})`);
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd; ctx.fillRect(0,0,GW,GH);
}

function drawGameOver(ts){
  ctx.fillStyle='rgba(3,2,12,0.94)'; ctx.fillRect(0,0,GW,GH);
  ctx.textAlign='center';
  ctx.font=`bold ${GW*0.065}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#cc2244'; ctx.shadowColor='#cc2244'; ctx.shadowBlur=50;
  ctx.fillText('LAS SOMBRAS TE HAN VENCIDO',GW/2,GH/2-30);
  ctx.shadowBlur=0;
  ctx.font=`300 italic ${GW*0.022}px 'Crimson Pro',serif`;
  ctx.fillStyle='rgba(200,210,255,0.65)';
  ctx.fillText('El Ser de Luz aguarda… pero deberás intentarlo de nuevo.',GW/2,GH/2+60);
  const pu=0.5+0.5*Math.sin(ts/500);
  ctx.globalAlpha=pu;
  ctx.font=`bold ${GW*0.019}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#7ecfff'; ctx.shadowColor='#7ecfff'; ctx.shadowBlur=18;
  ctx.fillText(isMobile?'Toca para renacer':'Presiona ENTER para renacer',GW/2,GH*0.82);
  ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawDecision(ts){
  ctx.fillStyle='rgba(3,2,12,0.96)'; ctx.fillRect(0,0,GW,GH);
  const grd=ctx.createRadialGradient(GW/2,0,0,GW/2,0,GH*1.1);
  grd.addColorStop(0,'rgba(240,220,140,0.22)'); grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd; ctx.fillRect(0,0,GW,GH);
  ctx.textAlign='center';
  ctx.font=`bold ${GW*0.032}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#f0c060'; ctx.shadowColor='#f0c060'; ctx.shadowBlur=40;
  ctx.fillText('¿Qué eliges, pequeño resplandor?',GW/2,GH*0.18);
  ctx.shadowBlur=0;
  ctx.font=`300 italic ${GW*0.021}px 'Crimson Pro',serif`;
  ctx.fillStyle='rgba(200,215,255,0.75)';
  ctx.fillText('Has llegado al umbral final. El túnel de luz te aguarda.',GW/2,GH*0.27);
  ctx.fillText('Pero tu cuerpo físico todavía puede ser salvado.',GW/2,GH*0.33);
  const ox=GW*0.25;
  ctx.fillStyle='rgba(126,207,255,0.08)'; ctx.strokeStyle='rgba(126,207,255,0.3)'; ctx.lineWidth=1;
  roundRect(ctx,ox-GW*0.16,GH*0.42,GW*0.32,GH*0.28,16); ctx.fill(); ctx.stroke();
  ctx.font=`bold ${GW*0.022}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#7ecfff'; ctx.fillText('← Regresar',ox,GH*0.52);
  ctx.font=`300 italic ${GW*0.017}px 'Crimson Pro',serif`;
  ctx.fillStyle='rgba(180,200,255,0.65)';
  ctx.fillText('Volver al cuerpo físico.',ox,GH*0.59);
  ctx.fillText('Una segunda oportunidad.',ox,GH*0.65);
  const ox2=GW*0.75;
  ctx.fillStyle='rgba(240,192,96,0.08)'; ctx.strokeStyle='rgba(240,192,96,0.3)';
  roundRect(ctx,ox2-GW*0.16,GH*0.42,GW*0.32,GH*0.28,16); ctx.fill(); ctx.stroke();
  ctx.font=`bold ${GW*0.022}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#f0c060'; ctx.fillText('Avanzar a la Luz →',ox2,GH*0.52);
  ctx.font=`300 italic ${GW*0.017}px 'Crimson Pro',serif`;
  ctx.fillStyle='rgba(240,220,160,0.65)';
  ctx.fillText('Cruzar hacia la Luz Primordial.',ox2,GH*0.59);
  ctx.fillText('El viaje del alma continúa.',ox2,GH*0.65);
  if(isMobile){
    ctx.font=`300 ${GW*0.015}px 'Crimson Pro',serif`;
    ctx.fillStyle='rgba(180,190,255,0.45)';
    ctx.fillText('◀ izquierda para regresar   |   derecha ▶ para la luz',GW/2,GH*0.88);
  }
  ctx.textAlign='left';
}

function drawEndingBack(ts){
  ctx.fillStyle='rgba(3,2,12,0.97)'; ctx.fillRect(0,0,GW,GH);
  ctx.textAlign='center';
  ctx.font=`bold ${GW*0.028}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#7ecfff'; ctx.shadowColor='#7ecfff'; ctx.shadowBlur=30;
  ctx.fillText('Tu espíritu retorna al cuerpo físico.',GW/2,GH*0.35);
  ctx.shadowBlur=0;
  ctx.font=`300 italic ${GW*0.021}px 'Crimson Pro',serif`;
  ctx.fillStyle='rgba(200,215,255,0.75)';
  ctx.fillText('Llevas contigo la memoria de la Luz.',GW/2,GH*0.46);
  ctx.fillText('Úsala bien en la vida que te ha sido devuelta.',GW/2,GH*0.53);
  const p=0.5+0.5*Math.sin(ts/500);
  ctx.globalAlpha=p;
  ctx.font=`bold ${GW*0.017}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#f0c060';
  ctx.fillText(isMobile?'Toca para jugar de nuevo':'ENTER para jugar de nuevo',GW/2,GH*0.78);
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawEndingLight(ts){
  ctx.fillStyle='#03020c'; ctx.fillRect(0,0,GW,GH);
  const r=Math.min(GW,GH)*0.8;
  const grd=ctx.createRadialGradient(GW/2,GH/2,0,GW/2,GH/2,r);
  grd.addColorStop(0,'rgba(255,245,200,0.4)');
  grd.addColorStop(0.5,'rgba(240,192,96,0.15)');
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd; ctx.fillRect(0,0,GW,GH);
  ctx.textAlign='center';
  ctx.font=`bold ${GW*0.028}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#f0e8c0'; ctx.shadowColor='#f0c060'; ctx.shadowBlur=50;
  ctx.fillText('Ghostito avanza hacia la Luz Primordial.',GW/2,GH*0.34);
  ctx.shadowBlur=0;
  ctx.font=`300 italic ${GW*0.021}px 'Crimson Pro',serif`;
  ctx.fillStyle='rgba(240,230,190,0.82)';
  ctx.fillText('El Ser de Luz te recibe con los brazos abiertos.',GW/2,GH*0.45);
  ctx.fillText('"Bien hecho, pequeño resplandor. Ya eres libre."',GW/2,GH*0.53);
  const p=0.5+0.5*Math.sin(ts/500);
  ctx.globalAlpha=p;
  ctx.font=`bold ${GW*0.017}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#ffffff';
  ctx.fillText(isMobile?'Toca para jugar de nuevo':'ENTER para jugar de nuevo',GW/2,GH*0.78);
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function roundRect(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
  c.closePath();
}

// ── Reinicio ──────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(e.code==='Enter'){
    if(phase==='over'||phase==='ending_back'||phase==='ending_light'){
      initState(); startIntro();
    }
  }
});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  if(phase==='over'||phase==='ending_back'||phase==='ending_light'){
    initState(); startIntro();
  }
},{passive:false,capture:true});

// ── Intro ─────────────────────────────────────────────────────────────────
function startIntro(){
  phase='intro'; tryMusic();
  showDialog(STORY_INTRO,()=>{
    showDialog(STORY_POSTWEAPON,()=>{ phase='playing'; });
  });
}

// ── Loop ──────────────────────────────────────────────────────────────────
let lastTs=0;
function loop(ts){
  const dt=Math.min(ts-lastTs,50); lastTs=ts;
  update(dt); draw(ts);
  requestAnimationFrame(loop);
}

// ── Arranque ──────────────────────────────────────────────────────────────
loadImages(()=>{
  document.getElementById('loading').style.opacity='0';
  setTimeout(()=>{ document.getElementById('loading').style.display='none'; },800);
  initState(); startIntro();
  requestAnimationFrame(ts=>{ lastTs=ts; requestAnimationFrame(loop); });
});

})();
