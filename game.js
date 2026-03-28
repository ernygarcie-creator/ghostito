// ═══════════════════════════════════════════════════════════════════════
//  GHOSTITO — La Travesía del Alma   v3.0
//  10 niveles · Historia · Luz Primordial · Móvil ABXY
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

// ── Detección móvil ─────────────────────────────────────────────────────
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
              || window.matchMedia('(pointer:coarse)').matches;
if (isMobile) document.getElementById('mc').classList.add('on');

// ── Constantes base ─────────────────────────────────────────────────────
const GHOST_SCALE  = 0.70;
const FOOT_OFFSET  = 82.3972;
const MOVE_SPEED   = 5;
const JUMP_SPEED   = -14;
const DASH_SPEED   = 15;
const ATTACK_SPD   = 2;
const DESC_SPD     = 3;
const GRAVITY      = 0.5;
const SCENE_IDX    = [-1, 0, 1, 2];
const WORLD_W      = SCENE_IDX.length * GW;
const START_IDX    = SCENE_IDX.indexOf(0);
const LIGHT_MAX    = 100;        // unidades para llenar barra
const LIGHT_PER_HIT = 12;       // luz ganada por espectro
const EXPLOSION_R  = 320;       // radio px de explosión de luz

const DESC_REDUCTIONS = [
  0,5.1422,18.9294,25.8818,41.7907,
  49.7708,76.9557,92.5294,132.9139,167.9932
];

// ── 10 Niveles ──────────────────────────────────────────────────────────
// Cada nivel define: cuántos espectros matar, velocidad sp1/sp2,
// amplitud ola sp1, intervalo spawn (ms), cuántos pueden estar activos,
// y mensaje del Ser de Luz al completar
const LEVELS = [
  { // 1
    goal:5, sp1spd:2, sp2spd:2, waveAmp:0.33, spawnMs:5000, maxActive:1,
    msg:'Bien, pequeño resplandor. El primer umbral ha cedido ante tu voluntad.'
  },
  { // 2
    goal:8, sp1spd:3, sp2spd:3, waveAmp:0.45, spawnMs:4000, maxActive:2,
    msg:'Los espectros se agitan. Algo los mueve con más furia. Mantén la llama encendida.'
  },
  { // 3
    goal:10, sp1spd:4, sp2spd:4, waveAmp:0.55, spawnMs:3500, maxActive:2,
    msg:'El Demiurgo de las Sombras te ha notado. Avanza sin miedo.'
  },
  { // 4
    goal:13, sp1spd:5, sp2spd:4, waveAmp:0.6, spawnMs:3000, maxActive:3,
    msg:'Tus manos sostienen la Escarcha con más firmeza ahora. Lo siento desde aquí.'
  },
  { // 5
    goal:15, sp1spd:5, sp2spd:5, waveAmp:0.65, spawnMs:2800, maxActive:3,
    msg:'A mitad del camino. El túnel está más cerca. No te detengas, vástago de la luz.'
  },
  { // 6
    goal:18, sp1spd:6, sp2spd:5, waveAmp:0.7, spawnMs:2500, maxActive:3,
    msg:'Los espectros son más densos aquí. Usa la Luz Primordial cuando te cerquen.'
  },
  { // 7
    goal:20, sp1spd:7, sp2spd:6, waveAmp:0.72, spawnMs:2200, maxActive:4,
    msg:'El Demiurgo lanza oleadas dobles. Observa sus patrones y actúa con decisión.'
  },
  { // 8
    goal:25, sp1spd:8, sp2spd:7, waveAmp:0.75, spawnMs:2000, maxActive:4,
    msg:'Casi puedo verte desde aquí. El túnel pulsa con tu energía. ¡Sigue!'
  },
  { // 9
    goal:28, sp1spd:9, sp2spd:8, waveAmp:0.78, spawnMs:1800, maxActive:5,
    msg:'El último velo se adelgaza. Reúne toda la luz que puedas para el paso final.'
  },
  { // 10
    goal:30, sp1spd:10, sp2spd:9, waveAmp:0.82, spawnMs:1500, maxActive:5,
    msg:null // fin del juego → pantalla de decisión
  },
];

// ── Diálogos de historia ─────────────────────────────────────────────────
const STORY_INTRO = [
  'Pequeño Resplandor entre las sombras… escúchame.',
  'Escúchame, vástago de la Luz Primera. Has caído lejos de mi protección.',
  'Unas manos oscuras intentaron apagar tu llama. Tu cuerpo yace en muerte clínica.',
  'Pero tu espíritu persiste. Vives una Experiencia Cercana a la Muerte, en un espacio más allá del espacio… un tiempo más allá del tiempo.',
  'Soy el Ser de Luz que aguarda al final del Túnel. Desde aquí puedo guiarte.',
  'Lo que ves a tu alrededor no son espíritus verdaderos. Son fragmentos de almas mutiladas por el dolor, moldeadas por el Demiurgo de las Sombras para bloquearte el paso.',
  'Yo te envío ahora la Escarcha Espectral. Con ella podrás disolver esas sombras fabricadas.',
  'Avanza y empuña la Escarcha Espectral.',
];

const STORY_POSTWEAPON = [
  'Bien. La tienes. Ahora escucha: cada espectro que disuelvas libera luz protoplasmática.',
  'Esa materia de luz llenará tu reserva de Poder Primordial. Cuando esté llena, podrás desatar una Explosión de Luz que barrerá todo a tu alrededor.',
  'El túnel está arriba, más allá de múltiples umbrales. Asciende nivel a nivel. Yo estaré contigo en cada paso.',
];

// ── Imágenes ─────────────────────────────────────────────────────────────
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
let loaded = 0;

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
    loaded++;
    const pct = Math.round(loaded/total*100);
    document.getElementById('loadFill').style.width = pct+'%';
    document.getElementById('loadTxt').textContent  = msgs[Math.min(3,Math.floor(pct/26))];
    if (loaded===total) cb();
  }
}

// ── Música ───────────────────────────────────────────────────────────────
const music = new Audio('music/musicether_oar_the_whole_other.mp3');
music.loop=true; music.volume=0.4;
function tryMusic(){ music.play().catch(()=>{}); }

// ── Estado global ────────────────────────────────────────────────────────
// Fases: 'intro'|'playing'|'levelclear'|'decision'|'ending_back'|'ending_light'
let phase = 'intro';
let dlgQueue = [], dlgIdx = 0, dlgCallback = null;

// Ghostito
let gx,gy,gvy,gDir,gSt;
let blinkT,blinking;
let attacking,atkFrame,atkTimer,swordName;
let dashLeft,descending,descRev,descStage,descT;
let dustPending;

// Progreso
let hp, lightPower, currentLevel, defeated, cameraX;

// Espectros — arrays para soportar múltiples activos
let spectros1=[[], false], spectros2=[];  // simplificado abajo
let sp1list=[], sp2list=[];
let sp1timer=0, sp2timer=0;
let waveT=0;

// Partículas de luz
let lightParticles=[];

// Explosión
let explosionActive=false, explosionR=0, explosionAlpha=0;

// ── HUD DOM ──────────────────────────────────────────────────────────────
const heartsEl    = document.getElementById('hearts');
const scoreEl     = document.getElementById('scoreEl');
const levelEl     = document.getElementById('levelEl');
const lightFillEl = document.getElementById('lightFill');

function updateHUD(){
  // Corazones
  heartsEl.innerHTML='';
  for(let i=0;i<5;i++){
    const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 24 24');
    s.classList.add('heart');
    if(i>=hp) s.classList.add('lost');
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d','M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
    p.setAttribute('fill', i<hp ? '#ff4466' : 'rgba(255,255,255,0.12)');
    s.appendChild(p); heartsEl.appendChild(s);
  }
  const lv = LEVELS[currentLevel];
  scoreEl.textContent  = `${defeated} / ${lv.goal}`;
  levelEl.textContent  = `Nivel ${currentLevel+1}`;
  lightFillEl.style.width = Math.round(lightPower/LIGHT_MAX*100)+'%';
}

function initLevel(){
  sp1list=[]; sp2list=[];
  sp1timer=0; sp2timer=0; waveT=0;
}

function initState(){
  gx=START_IDX*GW+GW/2; gy=0; gvy=0;
  gDir='right'; gSt='ghostito';
  blinkT=0; blinking=false;
  attacking=false; atkFrame=0; atkTimer=0; swordName=null;
  dashLeft=0; descending=false; descRev=false; descStage=0; descT=0;
  dustPending=null;
  hp=5; lightPower=0; currentLevel=0; defeated=0; cameraX=0;
  lightParticles=[]; explosionActive=false;
  initLevel();
  updateHUD();
}

// ── Diálogo ──────────────────────────────────────────────────────────────
const dlgEl      = document.getElementById('dlg');
const dlgTextEl  = document.getElementById('dlgText');

function showDialog(lines, cb){
  dlgQueue = Array.isArray(lines) ? lines : [lines];
  dlgIdx   = 0;
  dlgCallback = cb || null;
  dlgEl.classList.add('on');
  dlgTextEl.textContent = dlgQueue[0];
}

function advanceDialog(){
  dlgIdx++;
  if(dlgIdx < dlgQueue.length){
    dlgTextEl.textContent = dlgQueue[dlgIdx];
    // reiniciar animación
    dlgEl.querySelector('#dlgBox').style.animation='none';
    requestAnimationFrame(()=>{ dlgEl.querySelector('#dlgBox').style.animation=''; });
  } else {
    dlgEl.classList.remove('on');
    if(dlgCallback){ const f=dlgCallback; dlgCallback=null; f(); }
  }
}

// ── Teclado ──────────────────────────────────────────────────────────────
const K={};
document.addEventListener('keydown',e=>{
  if(!K[e.code]){ K[e.code]=true; onKeyDown(e.code); }
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup',e=>{ K[e.code]=false; onKeyUp(e.code); });

// ── Controles móvil ──────────────────────────────────────────────────────
function mobHold(id, code){
  const el=document.getElementById(id); if(!el) return;
  const dn=e=>{ e.preventDefault(); el.classList.add('pressed'); if(!K[code]){K[code]=true;onKeyDown(code);} };
  const up=e=>{ e.preventDefault(); el.classList.remove('pressed'); K[code]=false; onKeyUp(code); };
  el.addEventListener('touchstart',dn,{passive:false});
  el.addEventListener('touchend',up,{passive:false});
  el.addEventListener('mousedown',dn);
  el.addEventListener('mouseup',up);
}
function mobTap(id,code){
  const el=document.getElementById(id); if(!el) return;
  const dn=e=>{ e.preventDefault(); el.classList.add('pressed'); onKeyDown(code); };
  const up=e=>{ e.preventDefault(); el.classList.remove('pressed'); onKeyUp(code); };
  el.addEventListener('touchstart',dn,{passive:false});
  el.addEventListener('touchend',up,{passive:false});
  el.addEventListener('mousedown',dn);
  el.addEventListener('mouseup',up);
}

mobHold('dL','ArrowLeft');
mobHold('dR','ArrowRight');
mobTap ('dU','Space');          // saltar con flecha arriba
mobTap ('btnB','Space');        // B = saltar
mobTap ('btnY','KeyX');         // Y = atacar (KeyX en código)
mobTap ('btnX','KeyZ');         // X = Luz Primordial (KeyZ)
mobTap ('btnA','KeyC');         // A = recoger (KeyC, futuro)
mobHold('btnZR','KeyA');        // ZR = Dash

// Touch en canvas para avanzar diálogo / iniciar
canvas.addEventListener('touchend',e=>{ e.preventDefault(); handleAnyInput(); },{passive:false});
document.addEventListener('keydown',()=>{ handleAnyInput(); },{capture:false});

function handleAnyInput(){
  if(dlgEl.classList.contains('on')){ advanceDialog(); return; }
  if(phase==='decision') return;
  if(phase==='ending_back'||phase==='ending_light') return;
}

// ── Helpers imagen ────────────────────────────────────────────────────────
function img(n){ return imgs[n]||null; }
function ghostW(){ const i=img('ghostito'); return i?i.naturalWidth*GHOST_SCALE:80; }
function ghostH(){ const i=img('ghostito'); return i?i.naturalHeight*GHOST_SCALE:100; }
function specSize(name){ const i=img(name); return i?{w:i.naturalWidth*0.7,h:i.naturalHeight*0.7}:{w:60,h:80}; }

// ── AABB (hitboxes ajustadas al centro real del sprite) ───────────────────
function ghostRect(){
  // Reducimos el ancho al 60% del sprite para mayor precisión
  const w=ghostW()*0.6, h=ghostH()*0.85;
  return {x:gx-w/2, y:gy-h/2, w, h};
}
function swordRect(){
  if(!swordName) return null;
  const si=img(swordName); if(!si) return null;
  const sw=si.naturalWidth*1.2, sh=si.naturalHeight*1.2;
  // La espada parte desde el centro del personaje, no desde su borde exterior
  let sx;
  if(swordName.startsWith('r_')){
    sx = gx + ghostW()*0.05;           // ligeramente a la derecha del centro
  } else {
    sx = gx - sw - ghostW()*0.05;      // ligeramente a la izquierda del centro
  }
  return {x:sx, y:gy-sh*0.65, w:sw, h:sh};
}
function spRect1(sp){
  const {w,h}=specSize('espectro');
  // Hitbox centrada al 70% del sprite real
  const hw=w*0.7, hh=h*0.75;
  return {x:sp.wx-hw/2, y:sp.wy-hh/2, w:hw, h:hh};
}
function spRect2(sp){
  const {w,h}=specSize('espectro2');
  const hw=w*0.7, hh=h*0.75;
  return {x:sp.wx-hw/2, y:sp.wy-hh/2, w:hw, h:hh};
}
function overlap(a,b){
  return a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}

// ── Partículas de luz ─────────────────────────────────────────────────────
function spawnLightParticles(wx,wy){
  for(let i=0;i<14;i++){
    const angle=Math.random()*Math.PI*2;
    const spd=2+Math.random()*4;
    lightParticles.push({
      x:wx-cameraX, y:wy,
      vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd-2,
      life:1, size:3+Math.random()*4,
      color: Math.random()<0.5 ? '#f0c060' : '#ffffff'
    });
  }
}

// ── Flash de luz primordial ────────────────────────────────────────────────
const flashEl = document.getElementById('flash');
function triggerFlash(){
  flashEl.style.background='rgba(255,255,255,0.92)';
  setTimeout(()=>{ flashEl.style.background='rgba(255,255,255,0)'; },180);
}

// ── Explosión de luz ──────────────────────────────────────────────────────
function triggerLightExplosion(){
  if(lightPower < LIGHT_MAX) return;
  lightPower=0; updateHUD();
  explosionActive=true; explosionR=0; explosionAlpha=0.9;
  triggerFlash();

  // Eliminar todos los espectros en rango
  const gr=ghostRect();
  const cx=gx, cy=gy;
  sp1list=sp1list.filter(sp=>{
    const d=Math.hypot(sp.wx-cx,sp.wy-cy);
    if(d<EXPLOSION_R){ spawnLightParticles(sp.wx-cameraX,sp.wy); defeated++; return false; }
    return true;
  });
  sp2list=sp2list.filter(sp=>{
    const d=Math.hypot(sp.wx-cx,sp.wy-cy);
    if(d<EXPLOSION_R){ spawnLightParticles(sp.wx-cameraX,sp.wy); defeated++; return false; }
    return true;
  });
  updateHUD();
  checkLevelClear();
}

// ── Inputs ────────────────────────────────────────────────────────────────
function onKeyDown(code){
  // Diálogo siempre tiene prioridad
  if(dlgEl.classList.contains('on')){ advanceDialog(); return; }
  if(phase==='intro'||phase==='levelclear') return;
  if(phase==='decision'){
    if(code==='ArrowLeft'||code==='KeyA') endGame('back');
    if(code==='ArrowRight'||code==='KeyD'||code==='Space'||code==='Enter') endGame('light');
    return;
  }
  if(phase==='ending_back'||phase==='ending_light') return;

  if(phase==='playing'){
    if(code==='Space'&&gvy===0&&!descending){ gvy=JUMP_SPEED; gSt=gDir; }
    else if((code==='KeyA'||code==='ShiftRight')&&dashLeft===0&&!descending){
      dustPending={wx:gx,wy:gy,dir:gDir}; dashLeft=DASH_SPEED; gSt=`dash_${gDir}`;
    }
    else if(code==='KeyX'&&!attacking&&!descending){
      if(gSt==='ghostito') gSt=gDir;
      attacking=true; atkFrame=0; atkTimer=0;
      swordName=`${gDir==='right'?'r':'l'}_sword1`;
    }
    else if(code==='KeyZ'){ triggerLightExplosion(); }
    // Descendio con flecha abajo
    else if(code==='ArrowDown'&&!descending){
      descending=true; descRev=false; descStage=1; descT=0;
    }
  }
}
function onKeyUp(code){
  if(code==='ArrowDown'&&descending) descRev=true;
}

// ── UPDATE ─────────────────────────────────────────────────────────────────
function update(dt){
  if(phase!=='playing') return;

  const ml=!!K['ArrowLeft'], mr=!!K['ArrowRight'];
  const lv=LEVELS[currentLevel];

  // ── Ghostito ────────────────────────────────────────────────────────
  if(descending){
    descT++;
    if(descT>=DESC_SPD){ descT=0;
      if(!descRev) descStage=Math.min(10,descStage+1);
      else{ descStage=Math.max(1,descStage-1); if(descStage===1){descending=false;descRev=false;} }
    }
    if(ml){gx=Math.max(0,gx-MOVE_SPEED);gDir='left';}
    if(mr){gx=Math.min(WORLD_W,gx+MOVE_SPEED);gDir='right';}
  } else {
    if(dashLeft>0){
      gx+=(gSt.includes('right')?DASH_SPEED:-DASH_SPEED); dashLeft--;
    } else {
      if(ml){gx=Math.max(0,gx-MOVE_SPEED);gDir='left';gSt='left';}
      else if(mr){gx=Math.min(WORLD_W,gx+MOVE_SPEED);gDir='right';gSt='right';}
      else gSt=gDir;
      gvy+=GRAVITY; gy+=gvy;
      if(attacking){
        atkTimer++;
        if(atkTimer>=ATTACK_SPD){ atkFrame++; atkTimer=0;
          if(atkFrame>=3){attacking=false;atkFrame=0;swordName=null;}
          else swordName=`${gDir==='right'?'r':'l'}_sword${atkFrame+1}`;
        }
      }
    }
    const hw=ghostW()/2;
    gx=Math.max(hw,Math.min(WORLD_W-hw,gx));
  }

  // Suelo
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
  if(sp1timer>=lv.spawnMs && sp1list.length<maxA){
    sp1timer=0;
    sp1list.push({wx:SCENE_IDX.indexOf(2)*GW+GW, wy:GH/2, phase:Math.random()*Math.PI*2});
  }
  sp2timer+=dt;
  if(sp2timer>=lv.spawnMs*1.3 && sp2list.length<maxA){
    sp2timer=0;
    const {w}=specSize('espectro2');
    sp2list.push({wx:-w, wy:gy});
  }

  // ── Mover y colisionar espectro1 ─────────────────────────────────────
  const sr=swordRect();
  sp1list=sp1list.filter(sp=>{
    sp.wx -= lv.sp1spd;
    sp.phase += 0.05;
    const amp=(GH/2)*lv.waveAmp;
    // Niveles altos: trayectoria zigzag
    if(currentLevel>=5){
      sp.wy = GH/2 + amp*Math.sin(sp.phase) + (amp*0.3)*Math.sin(sp.phase*2.7);
    } else {
      sp.wy = GH/2 + amp*Math.sin(sp.phase);
    }

    // Espada → espectro1
    if(attacking && overlap(sr, spRect1(sp))){
      spawnLightParticles(sp.wx-cameraX, sp.wy);
      defeated++; lightPower=Math.min(LIGHT_MAX,lightPower+LIGHT_PER_HIT);
      updateHUD(); checkLevelClear(); return false;
    }
    // Espectro → Ghostito
    if(overlap(ghostRect(),spRect1(sp))){
      if(!descending){hp--;updateHUD();checkDead();}
      return false;
    }
    if(sp.wx < -200) return false;
    return true;
  });

  // ── Mover y colisionar espectro2 ─────────────────────────────────────
  sp2list=sp2list.filter(sp=>{
    sp.wx += lv.sp2spd;
    sp.wy  = gy + (currentLevel>=4 ? Math.sin(waveT*2)*50 : 0);

    if(attacking && overlap(sr, spRect2(sp))){
      spawnLightParticles(sp.wx-cameraX, sp.wy);
      defeated++; lightPower=Math.min(LIGHT_MAX,lightPower+LIGHT_PER_HIT);
      updateHUD(); checkLevelClear(); return false;
    }
    if(overlap(ghostRect(),spRect2(sp))){
      if(!descending){hp--;updateHUD();checkDead();}
      return false;
    }
    if(sp.wx>WORLD_W+200) return false;
    return true;
  });

  // ── Polvo de dash ─────────────────────────────────────────────────────
  // (se dibuja en draw, se limpia aquí)
  // dustPending se limpia en draw

  // ── Partículas ───────────────────────────────────────────────────────
  lightParticles=lightParticles.filter(p=>{
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life-=0.03;
    return p.life>0;
  });

  // ── Explosión ────────────────────────────────────────────────────────
  if(explosionActive){
    explosionR+=22;
    explosionAlpha-=0.05;
    if(explosionR>EXPLOSION_R||explosionAlpha<=0){explosionActive=false;}
  }
}

function checkDead(){ if(hp<=0){hp=0;updateHUD();phase='over';} }

function checkLevelClear(){
  const lv=LEVELS[currentLevel];
  if(defeated>=lv.goal){
    phase='levelclear';
    sp1list=[]; sp2list=[];
    if(currentLevel===9){
      // Último nivel → decisión final
      setTimeout(()=>{ phase='decision'; },800);
    } else {
      const msg=lv.msg;
      setTimeout(()=>{
        showDialog([msg, '¿Estás listo para el siguiente umbral?'],()=>{
          currentLevel++;
          defeated=0;
          initLevel();
          updateHUD();
          phase='playing';
        });
      },600);
    }
  }
}

function endGame(choice){
  phase = choice==='back' ? 'ending_back' : 'ending_light';
}

// ── DRAW ────────────────────────────────────────────────────────────────
function draw(ts){
  ctx.clearRect(0,0,GW,GH);

  if(phase==='intro'){
    drawDarkness(ts); return;
  }
  if(phase==='over'){
    drawGameOver(ts); return;
  }
  if(phase==='decision'){
    drawDecision(ts); return;
  }
  if(phase==='ending_back'){
    drawEndingBack(ts); return;
  }
  if(phase==='ending_light'){
    drawEndingLight(ts); return;
  }

  // ── Juego normal (playing | levelclear) ─────────────────────────────

  // 1) Fondos lontananza
  SCENE_IDX.forEach((idx,pos)=>{
    const xOff=pos*GW-cameraX;
    const name=idx<0?`${Math.abs(idx)}_background_lontananza`:idx>0?`background_lontananza_${idx}`:'background_lontananza';
    if(img(name)) ctx.drawImage(img(name),xOff,0,GW,GH);
    else{ctx.fillStyle='#050518';ctx.fillRect(xOff,0,GW,GH);}
  });

  // 2) Fondos medios
  SCENE_IDX.forEach((idx,pos)=>{
    const xOff=pos*GW-cameraX;
    const name=idx<0?`${Math.abs(idx)}background`:idx>0?`background${idx}`:'background';
    if(img(name)) ctx.drawImage(img(name),xOff,0,GW,GH);
  });

  // 2.5) Polvo de dash
  if(dustPending){
    const{wx,wy,dir}=dustPending;
    const dn=`another_one_bites_the_dust_${dir}`;
    const di=img(dn);
    if(di){ const sx=dir==='left'?wx-cameraX:wx-cameraX-di.naturalWidth; ctx.drawImage(di,sx,wy-di.naturalHeight/2); }
    dustPending=null;
  }

  // 3) Ghostito + espada
  drawGhost();

  // 4) Primer plano
  SCENE_IDX.forEach((idx,pos)=>{
    const xOff=pos*GW-cameraX;
    const name=idx<0?`${Math.abs(idx)}_background_cercano`:idx>0?`background_cercano_${idx}`:'background_cercano';
    if(img(name)) ctx.drawImage(img(name),xOff,0,GW,GH);
  });

  // 5) Espectros 1
  sp1list.forEach(sp=>{
    const{w,h}=specSize('espectro');
    const si=img('espectro');
    if(si) ctx.drawImage(si,sp.wx-cameraX-w/2,sp.wy-h/2,w,h);
  });

  // 6) Espectros 2 (volteados)
  sp2list.forEach(sp=>{
    const{w,h}=specSize('espectro2');
    const si=img('espectro2');
    if(si){
      ctx.save();
      ctx.translate(sp.wx-cameraX+w/2,sp.wy-h/2);
      ctx.scale(-1,1);
      ctx.drawImage(si,-w,0,w,h);
      ctx.restore();
    }
  });

  // 7) Partículas de luz protoplasmática
  lightParticles.forEach(p=>{
    ctx.save();
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.shadowColor=p.color; ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  });

  // 8) Explosión de luz
  if(explosionActive){
    ctx.save();
    ctx.globalAlpha=explosionAlpha*0.35;
    const grad=ctx.createRadialGradient(gx-cameraX,gy,0,gx-cameraX,gy,explosionR);
    grad.addColorStop(0,'#ffffff');
    grad.addColorStop(0.5,'#f0c060');
    grad.addColorStop(1,'rgba(240,192,96,0)');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.arc(gx-cameraX,gy,explosionR,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // 9) Banner de nivel completado
  if(phase==='levelclear'){
    ctx.save();
    ctx.globalAlpha=0.75;
    ctx.fillStyle='#03020c';
    ctx.fillRect(0,GH/2-60,GW,120);
    ctx.globalAlpha=1;
    ctx.textAlign='center';
    ctx.font=`bold ${GW*0.042}px 'Cinzel Decorative',serif`;
    ctx.fillStyle='#f0c060';
    ctx.shadowColor='#f0c060'; ctx.shadowBlur=30;
    ctx.fillText(`✦ Umbral ${currentLevel+1} superado ✦`,GW/2,GH/2+16);
    ctx.shadowBlur=0; ctx.textAlign='left';
    ctx.restore();
  }
}

function drawGhost(){
  const sx=gx-cameraX;
  // Espada detrás
  if(attacking&&swordName&&img(swordName)){
    const si=img(swordName);
    const sw=si.naturalWidth*1.2,sh=si.naturalHeight*1.2;
    const sxp=swordName.startsWith('r_')?sx+ghostW()*0.05:sx-sw-ghostW()*0.05;
    ctx.drawImage(si,sxp,gy-sh/1.5,sw,sh);
  }
  // Ghostito
  let iname;
  if(descending||descRev) iname=`descendio${descStage}`;
  else if(attacking)       iname=gSt;
  else if(blinking)        iname=['left','right'].includes(gSt)?`${gSt}_parpadeo`:'ghostito_parpadeo';
  else                     iname=gSt;
  const gi=img(iname)||img('ghostito');
  if(gi){ const gw=gi.naturalWidth*GHOST_SCALE,gh2=gi.naturalHeight*GHOST_SCALE; ctx.drawImage(gi,sx-gw/2,gy-gh2/2,gw,gh2); }
}

// ── Pantallas especiales ──────────────────────────────────────────────────
function drawDarkness(ts){
  // Fondo absolutamente negro con partícula de luz central
  ctx.fillStyle='#03020c';
  ctx.fillRect(0,0,GW,GH);
  // Pulso suave de luz en centro
  const p=0.04+0.03*Math.sin(ts/800);
  const grd=ctx.createRadialGradient(GW/2,GH/2,0,GW/2,GH/2,300);
  grd.addColorStop(0,`rgba(126,207,255,${p})`);
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd;
  ctx.fillRect(0,0,GW,GH);
}

function drawGameOver(ts){
  ctx.fillStyle='rgba(3,2,12,0.94)'; ctx.fillRect(0,0,GW,GH);
  ctx.textAlign='center';
  ctx.font=`bold ${GW*0.07}px 'Cinzel Decorative',serif`;
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
  // Luz al fondo
  const grd=ctx.createRadialGradient(GW/2,0,0,GW/2,0,GH*1.1);
  grd.addColorStop(0,'rgba(240,220,140,0.22)');
  grd.addColorStop(1,'rgba(0,0,0,0)');
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

  // Opción izquierda: volver
  const ox=GW*0.25;
  ctx.fillStyle='rgba(126,207,255,0.08)';
  ctx.strokeStyle='rgba(126,207,255,0.3)'; ctx.lineWidth=1;
  roundRect(ctx,ox-GW*0.16,GH*0.42,GW*0.32,GH*0.28,16);
  ctx.fill(); ctx.stroke();
  ctx.font=`bold ${GW*0.022}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#7ecfff';
  ctx.fillText('← Regresar',ox,GH*0.52);
  ctx.font=`300 italic ${GW*0.017}px 'Crimson Pro',serif`;
  ctx.fillStyle='rgba(180,200,255,0.65)';
  ctx.fillText('Volver al cuerpo físico.',ox,GH*0.59);
  ctx.fillText('Una segunda oportunidad.',ox,GH*0.65);

  // Opción derecha: luz
  const ox2=GW*0.75;
  ctx.fillStyle='rgba(240,192,96,0.08)';
  ctx.strokeStyle='rgba(240,192,96,0.3)';
  roundRect(ctx,ox2-GW*0.16,GH*0.42,GW*0.32,GH*0.28,16);
  ctx.fill(); ctx.stroke();
  ctx.font=`bold ${GW*0.022}px 'Cinzel Decorative',serif`;
  ctx.fillStyle='#f0c060';
  ctx.fillText('Avanzar a la Luz →',ox2,GH*0.52);
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
  // Luz brillante expansiva
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

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// ── Reinicio desde game over / endings ───────────────────────────────────
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
  phase='intro';
  tryMusic();
  // Primera tanda: antes de tener la espada
  showDialog(STORY_INTRO, ()=>{
    // Ya tiene la espada → segunda tanda
    showDialog(STORY_POSTWEAPON, ()=>{
      phase='playing';
    });
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
  initState();
  startIntro();
  requestAnimationFrame(ts=>{ lastTs=ts; requestAnimationFrame(loop); });
});

})();
