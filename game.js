// ═══════════════════════════════════════════════════════════════════
//  GHOSTITO  —  HTML5 Canvas  |  Desktop + Mobile
//  Usa las imágenes de /images/ y música de /music/ del repositorio
// ═══════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ── Constantes ──────────────────────────────────────────────────────
const GW = 1600, GH = 900;      // resolución interna del juego
const FPS = 60;
const GHOST_SCALE   = 0.70;
const FOOT_OFFSET   = 82.3972;
const MOVE_SPEED    = 5;
const JUMP_SPEED    = -14;
const DASH_SPEED    = 15;
const ATTACK_SPEED  = 2;
const DESC_SPEED    = 3;
const GRAVITY       = 0.5;
const SPAWN_MS      = 5000;
const SPECTRO_SPD   = 2;
const SPECTRO2_SPD  = 2;
const WAVE_INC      = (2 * Math.PI) / (2 * FPS);
const WIN_COUNT     = 20;

const DESC_REDUCTIONS = [
  0, 5.1422, 18.9294, 25.8818, 41.7907,
  49.7708, 76.9557, 92.5294, 132.9139, 167.9932
];

const SCENARIO_IDX = [-1, 0, 1, 2];
const WORLD_W = SCENARIO_IDX.length * GW;
const START_IDX = SCENARIO_IDX.indexOf(0); // = 1

// ── Canvas ──────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = GW;
canvas.height = GH;

function resize() {
  const sx = window.innerWidth  / GW;
  const sy = window.innerHeight / GH;
  const s  = Math.min(sx, sy);
  canvas.style.width  = (GW * s) + 'px';
  canvas.style.height = (GH * s) + 'px';
}
window.addEventListener('resize', resize);
resize();

// ── Detección móvil ──────────────────────────────────────────────────
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
              || window.matchMedia('(pointer:coarse)').matches;

if (isMobile) {
  document.getElementById('mobileControls').classList.add('visible');
}

// ── Imágenes ─────────────────────────────────────────────────────────
const IMAGE_NAMES = [
  'ghostito','ghostito_parpadeo',
  'left','left_parpadeo',
  'right','right_parpadeo',
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
  IMAGE_NAMES.forEach(name => {
    const img = new Image();
    img.onload  = () => { imgs[name] = img; tick(); };
    img.onerror = () => { imgs[name] = null;  tick(); };
    img.src = `images/${name}.png`;
  });
  function tick() {
    loaded++;
    const pct = Math.round(loaded / total * 100);
    const fill = document.getElementById('loadFill');
    const text = document.getElementById('loadText');
    if (fill) fill.style.width = pct + '%';
    if (text) {
      const msgs = [
        'Invocando espíritus...',
        'Afilando la Escarcha Espectral...',
        'Preparando los escenarios...',
        '¡Casi listo!'
      ];
      text.textContent = msgs[Math.floor(pct / 26)] || '¡Listo!';
    }
    if (loaded === total) cb();
  }
}

// ── Música ───────────────────────────────────────────────────────────
const music = new Audio('music/musicether_oar_the_whole_other.mp3');
music.loop   = true;
music.volume = 0.45;

function tryMusic() {
  music.play().catch(() => {});
}

// ── Estado ───────────────────────────────────────────────────────────
let gamePhase = 'menu'; // 'menu' | 'playing' | 'over' | 'win'

// Ghostito
let gx, gy, gvy, gDir, gSt;
let blinkT, blinking;
let attacking, atkFrame, atkTimer, swordName;
let dashLeft, descending, descRev, descStage, descT;
let dustPending;

// Enemigos
let sp1, sp1active, sp1phase, sp1timer;
let sp2, sp2active, sp2timer;

// Progreso
let hp, defeated;
let cameraX;

// HUD DOM
const heartsEl = document.getElementById('hearts');
const scoreEl  = document.getElementById('scoreEl');

function initState() {
  gx = START_IDX * GW + GW / 2;
  gy = 0; gvy = 0;
  gDir = 'right'; gSt = 'ghostito';
  blinkT = 0; blinking = false;
  attacking = false; atkFrame = 0; atkTimer = 0; swordName = null;
  dashLeft = 0; descending = false; descRev = false; descStage = 0; descT = 0;
  dustPending = null;
  sp1 = null; sp1active = false; sp1phase = 0; sp1timer = 0;
  sp2 = null; sp2active = false; sp2timer = 0;
  hp = 5; defeated = 0; cameraX = 0;
  updateHUD();
}

function updateHUD() {
  // Corazones
  heartsEl.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.classList.add('heart');
    if (i >= hp) svg.classList.add('lost');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
    path.setAttribute('fill', i < hp ? '#ff4466' : 'rgba(255,255,255,0.15)');
    svg.appendChild(path);
    heartsEl.appendChild(svg);
  }
  scoreEl.textContent = `Espectros: ${defeated} / ${WIN_COUNT}`;
}

// ── Teclado ──────────────────────────────────────────────────────────
const K = {};
document.addEventListener('keydown', e => {
  if (!K[e.code]) { K[e.code] = true; onKeyDown(e.code); }
  if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))
    e.preventDefault();
});
document.addEventListener('keyup', e => { K[e.code] = false; onKeyUp(e.code); });

// ── Controles móvil ──────────────────────────────────────────────────
function setupMobileBtn(id, downCode, upCode) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e) => {
    e.preventDefault();
    el.classList.add('pressed');
    if (!K[downCode]) { K[downCode] = true; onKeyDown(downCode); }
  };
  const release = (e) => {
    e.preventDefault();
    el.classList.remove('pressed');
    K[downCode] = false;
    if (upCode) onKeyUp(downCode);
  };
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend',   release, { passive: false });
  el.addEventListener('mousedown',  press);
  el.addEventListener('mouseup',    release);
}

// Botones de acción (disparo único en keydown)
function setupActionBtn(id, code) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e) => {
    e.preventDefault();
    el.classList.add('pressed');
    onKeyDown(code);
  };
  const release = (e) => {
    e.preventDefault();
    el.classList.remove('pressed');
    onKeyUp(code);
  };
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend',   release, { passive: false });
  el.addEventListener('mousedown',  press);
  el.addEventListener('mouseup',    release);
}

setupMobileBtn('btnLeft',   'ArrowLeft');
setupMobileBtn('btnRight',  'ArrowRight');
setupActionBtn('btnUp',     'ArrowUp');   // no usado pero útil
setupActionBtn('btnJump',   'Space');
setupActionBtn('btnDash',   'KeyA');
setupActionBtn('btnAttack', 'KeyX');
setupMobileBtn('btnDown',   'KeyD', true);  // Descendio: hold

// Tap en canvas / pantalla para iniciar/reiniciar (móvil)
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (gamePhase === 'menu') { gamePhase = 'playing'; tryMusic(); }
  else if (gamePhase === 'over' || gamePhase === 'win') { initState(); gamePhase = 'playing'; }
}, { passive: false });

// ── Helpers de imagen ─────────────────────────────────────────────────
function img(name) { return imgs[name] || null; }

function ghostW() { const i=img('ghostito'); return i ? i.naturalWidth  * GHOST_SCALE : 80; }
function ghostH() { const i=img('ghostito'); return i ? i.naturalHeight * GHOST_SCALE : 100; }

function specSize(name) {
  const i = img(name);
  if (!i) return { w:60, h:80 };
  return { w: i.naturalWidth * 0.7, h: i.naturalHeight * 0.7 };
}

function drawImg(name, x, y, w, h, flipX) {
  const im = img(name); if (!im) return;
  ctx.save();
  if (flipX) { ctx.translate(x+w, y); ctx.scale(-1,1); ctx.drawImage(im, 0, 0, w, h); }
  else        ctx.drawImage(im, x, y, w, h);
  ctx.restore();
}

// ── AABB ──────────────────────────────────────────────────────────────
function ghostRect()  { return { x:gx-ghostW()/2, y:gy-ghostH()/2, w:ghostW(), h:ghostH() }; }
function swordRect() {
  if (!swordName) return null;
  const im = img(swordName); if (!im) return null;
  const sw = im.naturalWidth*1.2, sh = im.naturalHeight*1.2;
  const sx = swordName.startsWith('r_') ? gx + ghostW()*0.1 : gx - sw - ghostW()*0.1;
  return { x:sx, y:gy - sh/2, w:sw, h:sh };
}
function spRect(sp, name) {
  if (!sp) return null;
  const {w,h} = specSize(name);
  return { x:sp.world_x-w/2, y:sp.world_y-h/2, w, h };
}
function overlap(a, b) {
  return a && b && a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

// ── UPDATE ────────────────────────────────────────────────────────────
function update(dt) {
  if (gamePhase !== 'playing') return;

  const ml = !!K['ArrowLeft'];
  const mr = !!K['ArrowRight'];
  const now = performance.now();

  // Descendio
  if (descending) {
    descT++;
    if (descT >= DESC_SPEED) {
      descT = 0;
      if (!descRev) { descStage = Math.min(10, descStage+1); }
      else {
        descStage = Math.max(1, descStage-1);
        if (descStage === 1) { descending = false; descRev = false; }
      }
    }
    if (ml) { gx = Math.max(0, gx-MOVE_SPEED); gDir='left'; }
    if (mr) { gx = Math.min(WORLD_W, gx+MOVE_SPEED); gDir='right'; }
  } else {
    // Dash
    if (dashLeft > 0) {
      const dm = gSt.includes('right') ? 1 : -1;
      gx += DASH_SPEED * dm;
      dashLeft--;
    } else {
      if (ml) { gx=Math.max(0,gx-MOVE_SPEED); gDir='left'; gSt='left'; }
      else if (mr) { gx=Math.min(WORLD_W,gx+MOVE_SPEED); gDir='right'; gSt='right'; }
      else { gSt = gDir; }

      gvy += GRAVITY;
      gy  += gvy;

      // Ataque animación
      if (attacking) {
        atkTimer++;
        if (atkTimer >= ATTACK_SPEED) {
          atkFrame++; atkTimer = 0;
          if (atkFrame >= 3) { attacking=false; atkFrame=0; swordName=null; }
          else {
            const side = gDir==='right'?'r':'l';
            swordName = `${side}_sword${atkFrame+1}`;
          }
        }
      }
    }
    // Límites mundo
    const hw = ghostW()/2;
    gx = Math.max(hw, Math.min(WORLD_W-hw, gx));
  }

  // Suelo y cámara
  const floorY = GH - (FOOT_OFFSET * (GH/600));
  if (!descending && !descRev) {
    const minY = floorY - ghostH()/2;
    if (gy > minY) { gy = minY; gvy = 0; }
  } else {
    const r   = descStage > 0 ? DESC_REDUCTIONS[descStage-1] : 0;
    const oH  = ghostH();
    gy = floorY - (oH-r)/2;
  }

  cameraX = Math.min(Math.max(gx - GW/2, 0), WORLD_W - GW);

  // Parpadeo
  blinkT += dt/1000;
  if (!blinking && blinkT >= 3) { blinking=true; blinkT=0; }
  else if (blinking && blinkT >= 0.2) { blinking=false; blinkT=0; }

  // Spawn timers
  sp1timer += dt;
  sp2timer += dt;
  if (sp1timer >= SPAWN_MS && !sp1active) {
    sp1timer = 0;
    sp1 = { world_x: SCENARIO_IDX.indexOf(2)*GW + GW, world_y: GH/2 };
    sp1active = true; sp1phase = 0;
  }
  if (sp2timer >= SPAWN_MS && !sp2active) {
    sp2timer = 0;
    const {w} = specSize('espectro2');
    sp2 = { world_x: -w, world_y: gy };
    sp2active = true;
  }

  // Espectro 1
  if (sp1active && sp1) {
    sp1.world_x -= SPECTRO_SPD;
    sp1phase += WAVE_INC;
    sp1.world_y = GH/2 + (GH/6)*Math.sin(sp1phase);

    if (attacking && overlap(swordRect(), spRect(sp1,'espectro'))) {
      sp1active=false; defeated++; updateHUD(); checkWin();
    }
    if (overlap(ghostRect(), spRect(sp1,'espectro'))) {
      sp1active=false;
      if (!descending) { hp--; updateHUD(); checkDead(); }
    }
    if (sp1.world_x < -200) sp1active=false;
  }

  // Espectro 2
  if (sp2active && sp2) {
    sp2.world_x += SPECTRO2_SPD;
    sp2.world_y  = gy;

    if (attacking && overlap(swordRect(), spRect(sp2,'espectro2'))) {
      sp2active=false; defeated++; updateHUD(); checkWin();
    }
    if (overlap(ghostRect(), spRect(sp2,'espectro2'))) {
      sp2active=false;
      if (!descending) { hp--; updateHUD(); checkDead(); }
    }
    if (sp2.world_x > WORLD_W+200) sp2active=false;
  }
}

function checkWin()  { if (defeated >= WIN_COUNT) { gamePhase='win'; } }
function checkDead() { if (hp <= 0) { hp=0; gamePhase='over'; updateHUD(); } }

// ── DRAW ──────────────────────────────────────────────────────────────
function draw(ts) {
  ctx.clearRect(0,0,GW,GH);

  if (gamePhase === 'menu') { drawMenu(ts); return; }
  if (gamePhase === 'over')  { drawGameOver(ts); return; }
  if (gamePhase === 'win')   { drawWin(ts); return; }

  // 1) Fondos lontananza
  SCENARIO_IDX.forEach((idx, pos) => {
    const xOff = pos*GW - cameraX;
    const name = idx<0 ? `${Math.abs(idx)}_background_lontananza`
                : idx>0 ? `background_lontananza_${idx}`
                : 'background_lontananza';
    if (img(name)) ctx.drawImage(img(name), xOff, 0, GW, GH);
    else { ctx.fillStyle='#050518'; ctx.fillRect(xOff,0,GW,GH); }
  });

  // 2) Fondos medios
  SCENARIO_IDX.forEach((idx, pos) => {
    const xOff = pos*GW - cameraX;
    const name = idx<0 ? `${Math.abs(idx)}background`
                : idx>0 ? `background${idx}`
                : 'background';
    if (img(name)) ctx.drawImage(img(name), xOff, 0, GW, GH);
  });

  // 2.5) Polvo de dash
  if (dustPending) {
    const {wx, wy, dir} = dustPending;
    const dname = `another_one_bites_the_dust_${dir}`;
    const di = img(dname);
    if (di) {
      const sx = dir==='left' ? wx-cameraX : wx-cameraX-di.naturalWidth;
      ctx.drawImage(di, sx, wy-di.naturalHeight/2);
    }
    dustPending = null;
  }

  // 3) Ghostito
  drawGhost();

  // 4) Primer plano
  SCENARIO_IDX.forEach((idx, pos) => {
    const xOff = pos*GW - cameraX;
    const name = idx<0 ? `${Math.abs(idx)}_background_cercano`
                : idx>0 ? `background_cercano_${idx}`
                : 'background_cercano';
    if (img(name)) ctx.drawImage(img(name), xOff, 0, GW, GH);
  });

  // 5) Espectro 1
  if (sp1active && sp1) {
    const sname = sp1active && blinking ? 'espectro_parpadeo' : 'espectro';
    const {w,h} = specSize('espectro');
    const si = img(sname) || img('espectro');
    if (si) ctx.drawImage(si, sp1.world_x-cameraX-w/2, sp1.world_y-h/2, w, h);
  }

  // 6) Espectro 2 (volteado)
  if (sp2active && sp2) {
    const s2name = 'espectro2';
    const {w,h} = specSize('espectro2');
    const si = img(s2name);
    if (si) {
      ctx.save();
      ctx.translate(sp2.world_x-cameraX+w/2, sp2.world_y-h/2);
      ctx.scale(-1,1);
      ctx.drawImage(si, -w, 0, w, h);
      ctx.restore();
    }
  }
}

function drawGhost() {
  const screenX = gx - cameraX;

  // Espada detrás
  if (attacking && swordName && img(swordName)) {
    const si = img(swordName);
    const sw = si.naturalWidth*1.2, sh = si.naturalHeight*1.2;
    const sx = swordName.startsWith('r_') ? screenX+ghostW()*0.1 : screenX-sw-ghostW()*0.1;
    const sy = gy - sh/1.5;
    ctx.drawImage(si, sx, sy, sw, sh);
  }

  // Ghostito
  let imgName;
  if (descending || descRev) imgName = `descendio${descStage}`;
  else if (attacking)        imgName = gSt;
  else if (blinking)         imgName = ['left','right'].includes(gSt) ? `${gSt}_parpadeo` : 'ghostito_parpadeo';
  else                       imgName = gSt;

  const gi = img(imgName) || img('ghostito');
  if (gi) {
    const gw = gi.naturalWidth*GHOST_SCALE, gh = gi.naturalHeight*GHOST_SCALE;
    ctx.drawImage(gi, screenX-gw/2, gy-gh/2, gw, gh);
  }
}

// ── Pantallas ─────────────────────────────────────────────────────────
function drawMenu(ts) {
  // Fondo oscuro
  ctx.fillStyle = '#05040f';
  ctx.fillRect(0,0,GW,GH);

  // Ghostito decorativo centrado arriba
  const gi = img('ghostito');
  if (gi) {
    const scale = 1.4;
    const gw = gi.naturalWidth*scale*GHOST_SCALE;
    const gh = gi.naturalHeight*scale*GHOST_SCALE;
    ctx.globalAlpha = 0.18;
    ctx.drawImage(gi, GW/2-gw/2, GH/4-gh, gw, gh);
    ctx.globalAlpha = 1;
  }

  // Título con sombra glow
  ctx.textAlign = 'center';
  ctx.font = `bold ${GW*0.072}px 'Cinzel Decorative', serif`;
  ctx.shadowColor = '#7ecfff';
  ctx.shadowBlur  = 60;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText('GHOSTITO', GW/2, GH*0.22);
  ctx.shadowBlur  = 0;

  // Subtítulo
  ctx.font = `300 italic ${GW*0.022}px 'Crimson Pro', serif`;
  ctx.fillStyle = 'rgba(126,207,255,0.7)';
  ctx.fillText('Un espíritu en busca de la luz eterna', GW/2, GH*0.30);

  // Historia
  ctx.font = `300 ${GW*0.02}px 'Crimson Pro', serif`;
  ctx.fillStyle = 'rgba(220,220,255,0.75)';
  const story = [
    'Ghostito debe derrotar 20 espectros malignos',
    'para alcanzar la Luz Eterna.',
    '',
    "Su única arma: la 'Escarcha Espectral'."
  ];
  story.forEach((l,i) => ctx.fillText(l, GW/2, GH*0.42 + i*GH*0.055));

  // Controles (desktop)
  if (!isMobile) {
    ctx.font = `bold ${GW*0.019}px 'Cinzel Decorative', serif`;
    ctx.fillStyle = 'rgba(240,192,96,0.9)';
    ctx.fillText('CONTROLES', GW/2, GH*0.67);
    const ctrls = [
      '← →  Mover     ESPACIO  Saltar',
      'A  Dash     X  Atacar     D  Descendio'
    ];
    ctx.font = `300 ${GW*0.019}px 'Crimson Pro', serif`;
    ctx.fillStyle = 'rgba(200,200,255,0.7)';
    ctrls.forEach((l,i) => ctx.fillText(l, GW/2, GH*0.73 + i*GH*0.06));
  }

  // Parpadeo "comenzar"
  const pulse = 0.55 + 0.45 * Math.sin(ts/420);
  ctx.globalAlpha = pulse;
  ctx.font = `bold ${GW*0.026}px 'Cinzel Decorative', serif`;
  ctx.fillStyle = '#7ecfff';
  ctx.shadowColor = '#7ecfff'; ctx.shadowBlur = 24;
  const enterTxt = isMobile ? 'Toca para comenzar' : 'Presiona ENTER para comenzar';
  ctx.fillText(enterTxt, GW/2, GH*0.90);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign='left';
}

function drawGameOver(ts) {
  ctx.fillStyle = 'rgba(5,4,15,0.92)';
  ctx.fillRect(0,0,GW,GH);
  ctx.textAlign = 'center';

  ctx.font = `bold ${GW*0.075}px 'Cinzel Decorative', serif`;
  ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 50;
  ctx.fillStyle   = '#ff2244';
  ctx.fillText('GAME OVER', GW/2, GH/2-40);
  ctx.shadowBlur = 0;

  ctx.font = `300 ${GW*0.024}px 'Crimson Pro', serif`;
  ctx.fillStyle = 'rgba(200,200,255,0.7)';
  ctx.fillText(`Espectros derrotados: ${defeated}`, GW/2, GH/2+60);

  const p2 = 0.55+0.45*Math.sin(ts/420);
  ctx.globalAlpha=p2;
  ctx.font = `bold ${GW*0.022}px 'Cinzel Decorative', serif`;
  ctx.fillStyle='#7ecfff';
  ctx.shadowColor='#7ecfff'; ctx.shadowBlur=20;
  ctx.fillText(isMobile?'Toca para reiniciar':'Presiona ENTER para reiniciar', GW/2, GH*0.78);
  ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawWin(ts) {
  ctx.fillStyle='rgba(5,4,15,0.92)';
  ctx.fillRect(0,0,GW,GH);
  ctx.textAlign='center';

  // Destellos dorados
  const t = ts/1000;
  for (let i=0;i<12;i++) {
    const angle = (i/12)*Math.PI*2 + t;
    const r = 200 + Math.sin(t*2+i)*30;
    const sx = GW/2 + Math.cos(angle)*r;
    const sy = GH/2 + Math.sin(angle)*r*0.5;
    ctx.beginPath();
    ctx.arc(sx,sy,3,0,Math.PI*2);
    ctx.fillStyle=`rgba(240,192,96,${0.4+0.3*Math.sin(t*3+i)})`;
    ctx.fill();
  }

  ctx.font=`bold ${GW*0.038}px 'Cinzel Decorative', serif`;
  ctx.shadowColor='#f0c060'; ctx.shadowBlur=60;
  ctx.fillStyle='#f0c060';
  ctx.fillText('¡LUZ ETERNA ALCANZADA!', GW/2, GH/2-40);
  ctx.shadowBlur=0;

  ctx.font=`300 italic ${GW*0.026}px 'Crimson Pro', serif`;
  ctx.fillStyle='rgba(220,220,255,0.8)';
  ctx.fillText('Ghostito ha derrotado a todos los espectros malignos.', GW/2, GH/2+60);

  const p2=0.55+0.45*Math.sin(ts/420);
  ctx.globalAlpha=p2;
  ctx.font=`bold ${GW*0.02}px 'Cinzel Decorative', serif`;
  ctx.fillStyle='#7ecfff';
  ctx.shadowColor='#7ecfff'; ctx.shadowBlur=20;
  ctx.fillText(isMobile?'Toca para jugar de nuevo':'Presiona ENTER para jugar de nuevo', GW/2, GH*0.82);
  ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.textAlign='left';
}

// ── Inputs ────────────────────────────────────────────────────────────
function onKeyDown(code) {
  if (gamePhase === 'menu') {
    if (code === 'Enter') { gamePhase='playing'; tryMusic(); }
    return;
  }
  if (gamePhase === 'over' || gamePhase === 'win') {
    if (code === 'Enter') { initState(); gamePhase='playing'; }
    return;
  }
  if (gamePhase !== 'playing') return;

  if (code==='Space' && gvy===0 && !descending) {
    gvy = JUMP_SPEED;
    gSt = gDir;
  } else if (code==='KeyA' && dashLeft===0 && !descending) {
    dustPending = { wx:gx, wy:gy, dir:gDir };
    dashLeft = DASH_SPEED;
    gSt = `dash_${gDir}`;
  } else if (code==='KeyX' && !attacking && !descending) {
    if (gSt==='ghostito') gSt=gDir;
    attacking=true; atkFrame=0; atkTimer=0;
    swordName = `${gDir==='right'?'r':'l'}_sword1`;
  } else if (code==='KeyD' && !descending) {
    descending=true; descRev=false; descStage=1; descT=0;
  }
}

function onKeyUp(code) {
  if (code==='KeyD' && descending) descRev=true;
}

// ── Loop principal ────────────────────────────────────────────────────
let lastTs = 0;
function loop(ts) {
  const dt = Math.min(ts-lastTs, 50);
  lastTs = ts;
  update(dt);
  draw(ts);
  requestAnimationFrame(loop);
}

// ── Arranque ──────────────────────────────────────────────────────────
loadImages(() => {
  document.getElementById('loading').style.display = 'none';
  initState();
  requestAnimationFrame(ts => { lastTs=ts; requestAnimationFrame(loop); });
});

})();
