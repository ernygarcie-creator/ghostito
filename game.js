// ─── GHOSTITO — HTML5 Canvas port ───────────────────────────────────────────
// Traducido de main.py (Pygame Zero) a JavaScript puro (Canvas 2D)
// ─────────────────────────────────────────────────────────────────────────────

const GAME_WIDTH  = 1600;
const GAME_HEIGHT = 900;
const FPS         = 60;

// ─── Canvas y escala ─────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

canvas.width  = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Escalar el canvas para que ocupe la pantalla manteniendo proporción 16:9
function resizeCanvas() {
  const scaleX = window.innerWidth  / GAME_WIDTH;
  const scaleY = window.innerHeight / GAME_HEIGHT;
  const scale  = Math.min(scaleX, scaleY);
  canvas.style.width  = (GAME_WIDTH  * scale) + 'px';
  canvas.style.height = (GAME_HEIGHT * scale) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ─── Carga de imágenes ───────────────────────────────────────────────────────
// Todos los sprites que aparecen en el código original de main.py
const IMAGE_NAMES = [
  // Ghostito principal
  'ghostito', 'ghostito_parpadeo',
  // Movimiento
  'left', 'left_parpadeo',
  'right', 'right_parpadeo',
  // Dash
  'dash_left', 'dash_right',
  // Descendio (frames 1..10 + frame 0 = ghostito normal)
  'descendio1','descendio2','descendio3','descendio4','descendio5',
  'descendio6','descendio7','descendio8','descendio9','descendio10',
  // Ataque derecha
  'attack1_right','attack2_right','attack3_right',
  // Ataque izquierda (si existen; si no, se voltean las de derecha en runtime)
  'attack1_left','attack2_left','attack3_left',
  // Espadas derecha
  'r_sword1','r_sword2','r_sword3',
  // Espadas izquierda
  'l_sword1','l_sword2','l_sword3',
  // Espectros
  'espectro','espectro_parpadeo',
  'espectro2','espectro2_parpadeo',
  // Polvo de dash
  'another_one_bites_the_dust_left',
  'another_one_bites_the_dust_right',
  // Fondos — escenario -1
  '1_background_lontananza','1background','1_background_cercano',
  // Fondos — escenario 0
  'background_lontananza','background','background_cercano',
  // Fondos — escenario 1
  'background_lontananza_1','background1','background_cercano_1',
  // Fondos — escenario 2
  'background_lontananza_2','background2','background_cercano_2',
];

const images = {};   // nombre → HTMLImageElement (o null si no cargó)
let loadedCount = 0;

function loadAllImages(callback) {
  const total = IMAGE_NAMES.length;
  IMAGE_NAMES.forEach(name => {
    const img = new Image();
    img.onload  = () => { images[name] = img; tick(); };
    img.onerror = () => { images[name] = null;  tick(); }; // no rompe si falta
    img.src = `images/${name}.png`;
  });
  function tick() {
    loadedCount++;
    const pct = Math.round((loadedCount / total) * 100);
    document.getElementById('loadFill').style.width = pct + '%';
    document.getElementById('loadText').textContent  = `Cargando... ${pct}%`;
    if (loadedCount === total) callback();
  }
}

// ─── Música ───────────────────────────────────────────────────────────────────
const bgMusic = new Audio('music/musicether_oar_the_whole_other.mp3');
bgMusic.loop   = true;
bgMusic.volume = 0.5;

function startMusic() {
  bgMusic.play().catch(() => {
    // Navegadores requieren interacción del usuario; intentamos en el primer click
    document.addEventListener('keydown', () => bgMusic.play(), { once: true });
    document.addEventListener('click',   () => bgMusic.play(), { once: true });
  });
}

// ─── Estado del juego ─────────────────────────────────────────────────────────
let game_state = 'menu';   // 'menu' | 'playing'

// ─── Mundo y cámara ───────────────────────────────────────────────────────────
const scenario_indices = [-1, 0, 1, 2];
const world_width = scenario_indices.length * GAME_WIDTH;
let camera_x = 0;

// ─── Ghostito ─────────────────────────────────────────────────────────────────
const GHOST_SCALE   = 0.70;
const foot_offset   = 82.3972;
const start_index   = scenario_indices.indexOf(0);  // índice 1

// Posición mundo inicial (centro del escenario 0)
let ghost_world_x = start_index * GAME_WIDTH + GAME_WIDTH / 2;
let ghost_world_y = 0;
let ghost_vy      = 0;
const GRAVITY     = 0.5;

// Tamaño del sprite de Ghostito (se leerá tras carga)
function ghostW() { return images['ghostito'] ? images['ghostito'].naturalWidth  * GHOST_SCALE : 80; }
function ghostH() { return images['ghostito'] ? images['ghostito'].naturalHeight * GHOST_SCALE : 100; }

// ─── Constantes de movimiento ─────────────────────────────────────────────────
const MOVE_SPEED   = 5;
const JUMP_SPEED   = -14;
const DASH_SPEED   = 15;
const ATTACK_SPEED = 2;   // frames entre avance de animación de ataque
const DESC_SPEED   = 3;   // frames entre stages de descendio

const DESC_REDUCTIONS = [
  0, 5.1422, 18.9294, 25.8818, 41.7907,
  49.7708, 76.9557, 92.5294, 132.9139, 167.9932
];

// ─── Estado de Ghostito ───────────────────────────────────────────────────────
let ghost_state      = 'ghostito';
let last_direction   = 'right';
let last_move_time   = performance.now();

let dash_remaining  = 0;
let attacking       = false;
let attack_frame    = 0;
let attack_timer    = 0;
let sword_name      = null;

let descending      = false;
let desc_reversing  = false;
let desc_stage      = 0;
let desc_timer      = 0;

let blink_timer     = 0;
let is_blinking     = false;

let dust_pending    = null;   // { world_x, world_y, dir } — se dibuja 1 frame

// ─── Vidas y contador ─────────────────────────────────────────────────────────
let ghost_hp          = 5;
let spectros_defeated = 0;
let game_over         = false;
let game_win          = false;

// ─── Espectro tipo 1 ──────────────────────────────────────────────────────────
const SPAWN_INTERVAL  = 5000; // ms
const SPECTRO_SPEED   = 2;
const WAVE_PERIOD     = 2;    // segundos
const wave_increment  = (2 * Math.PI) / (WAVE_PERIOD * FPS);

let spectro         = null;
let spectro_timer   = 0;      // ms acumulados desde último spawn
let spectro_active  = false;
let spectro_phase   = 0.0;
let spectro_blink_timer   = 0;
let spectro_is_blinking   = false;

// ─── Espectro tipo 2 ──────────────────────────────────────────────────────────
const SPECTRO2_SPEED = 2;

let spectro2        = null;
let spectro2_timer  = 0;
let spectro2_active = false;
let spectro2_blink_timer  = 0;
let spectro2_is_blinking  = false;

// ─── Teclado ──────────────────────────────────────────────────────────────────
const keys_down = {};
document.addEventListener('keydown', e => {
  if (!keys_down[e.code]) {
    keys_down[e.code] = true;
    onKeyDown(e.code);
  }
  // Prevenir scroll con flechas y espacio
  if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))
    e.preventDefault();
});
document.addEventListener('keyup', e => {
  keys_down[e.code] = false;
  onKeyUp(e.code);
});

// ─── Helpers de dibujo ────────────────────────────────────────────────────────
function drawImage(name, x, y, w, h, flipX = false) {
  const img = images[name];
  if (!img) return;
  const dw = w !== undefined ? w : img.naturalWidth;
  const dh = h !== undefined ? h : img.naturalHeight;
  ctx.save();
  if (flipX) {
    ctx.translate(x + dw, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, x, y, dw, dh);
  }
  ctx.restore();
}

/** Dibuja imagen centrada en (cx, cy) con escala opcional */
function drawImageCentered(name, cx, cy, scale = 1.0, flipX = false) {
  const img = images[name];
  if (!img) return;
  const w = img.naturalWidth  * scale;
  const h = img.naturalHeight * scale;
  drawImage(name, cx - w / 2, cy - h / 2, w, h, flipX);
}

// ─── Nombre de imagen actual de Ghostito ─────────────────────────────────────
function getCurrentImage() {
  if (descending || desc_reversing) return `descendio${desc_stage}`;
  if (attacking) return ghost_state;
  if (is_blinking) {
    if (['left','right'].includes(ghost_state)) return `${ghost_state}_parpadeo`;
    return 'ghostito_parpadeo';
  }
  return ghost_state;
}

// ─── Spawns ───────────────────────────────────────────────────────────────────
function spawnSpectro() {
  const spawn_x = scenario_indices.indexOf(2) * GAME_WIDTH + GAME_WIDTH;
  spectro = { world_x: spawn_x, world_y: GAME_HEIGHT / 2 };
  spectro_phase  = 0.0;
  spectro_active = true;
}

function spawnSpectro2() {
  const img2  = images['espectro2'];
  const s2w   = img2 ? img2.naturalWidth  * 0.7 : 80;
  spectro2 = { world_x: -s2w, world_y: ghost_world_y };
  spectro2_active = true;
}

// ─── Lógica de parpadeo ───────────────────────────────────────────────────────
function blinkGhost(dt) {
  blink_timer += dt / 1000;
  if (!is_blinking && blink_timer >= 3 && ['ghostito','left','right'].includes(ghost_state)) {
    is_blinking  = true;
    blink_timer  = 0;
  } else if (is_blinking && blink_timer >= 0.2) {
    is_blinking  = false;
    blink_timer  = 0;
  }
}
function blinkSpectro(dt) {
  spectro_blink_timer += dt / 1000;
  if (!spectro_is_blinking && spectro_blink_timer >= SPAWN_INTERVAL / 1000) {
    spectro_is_blinking  = true;
    spectro_blink_timer  = 0;
  } else if (spectro_is_blinking && spectro_blink_timer >= 0.2) {
    spectro_is_blinking  = false;
    spectro_blink_timer  = 0;
  }
}
function blinkSpectro2(dt) {
  spectro2_blink_timer += dt / 1000;
  if (!spectro2_is_blinking && spectro2_blink_timer >= SPAWN_INTERVAL / 1000) {
    spectro2_is_blinking  = true;
    spectro2_blink_timer  = 0;
  } else if (spectro2_is_blinking && spectro2_blink_timer >= 0.2) {
    spectro2_is_blinking  = false;
    spectro2_blink_timer  = 0;
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
function update(dt, now) {
  if (game_state !== 'playing' || game_over) return;

  updateGhost(dt, now);

  // Cámara centrada en Ghostito
  camera_x = Math.min(Math.max(ghost_world_x - GAME_WIDTH / 2, 0), world_width - GAME_WIDTH);

  blinkGhost(dt);
  blinkSpectro(dt);
  blinkSpectro2(dt);

  // ─── Spawn timers ────────────────────────────────────────────────────────
  spectro_timer  += dt;
  spectro2_timer += dt;

  if (spectro_timer >= SPAWN_INTERVAL && !spectro_active) {
    spectro_timer = 0;
    spawnSpectro();
  }
  if (spectro2_timer >= SPAWN_INTERVAL && !spectro2_active) {
    spectro2_timer = 0;
    spawnSpectro2();
  }

  // ─── Espectro tipo 1 ─────────────────────────────────────────────────────
  if (spectro_active && spectro) {
    spectro.world_x -= SPECTRO_SPEED;
    const mid_y = GAME_HEIGHT / 2;
    const amp   = mid_y / 3;
    spectro_phase += wave_increment;
    spectro.world_y = mid_y + amp * Math.sin(spectro_phase);

    // Colisión espada → espectro1 (AABB simplificada)
    if (attacking && sword_name) {
      const sRect = getSwordRect();
      const s1    = getSpectroRect(spectro, 'espectro');
      if (sRect && s1 && rectsOverlap(sRect, s1)) {
        spectro_active = false;
        spectros_defeated++;
        checkWin();
      }
    }
    // Colisión espectro1 → Ghostito
    const g1 = getGhostRect();
    const s1 = getSpectroRect(spectro, 'espectro');
    if (s1 && rectsOverlap(g1, s1)) {
      spectro_active = false;
      if (!descending) { ghost_hp--; checkDead(); }
    }
    if (spectro.world_x < -200) spectro_active = false;
  }

  // ─── Espectro tipo 2 ─────────────────────────────────────────────────────
  if (spectro2_active && spectro2) {
    spectro2.world_x += SPECTRO2_SPEED;
    spectro2.world_y  = ghost_world_y;

    if (attacking && sword_name) {
      const sRect = getSwordRect();
      const s2    = getSpectroRect(spectro2, 'espectro2');
      if (sRect && s2 && rectsOverlap(sRect, s2)) {
        spectro2_active = false;
        spectros_defeated++;
        checkWin();
      }
    }
    const g2  = getGhostRect();
    const s2r = getSpectroRect(spectro2, 'espectro2');
    if (s2r && rectsOverlap(g2, s2r)) {
      spectro2_active = false;
      if (!descending) { ghost_hp--; checkDead(); }
    }
    if (spectro2.world_x > world_width + 200) spectro2_active = false;
  }
}

function checkWin()  { if (spectros_defeated >= 20) { game_win = true; game_over = true; } }
function checkDead() { if (ghost_hp <= 0) game_over = true; }

// ─── AABB helpers ─────────────────────────────────────────────────────────────
function getGhostRect() {
  const w = ghostW(), h = ghostH();
  return { x: ghost_world_x - w/2, y: ghost_world_y - h/2, w, h };
}
function getSpectroRect(sp, imgName) {
  const img = images[imgName];
  if (!img) return null;
  const sw = img.naturalWidth  * 0.7;
  const sh = img.naturalHeight * 0.7;
  return { x: sp.world_x - sw/2, y: sp.world_y - sh/2, w: sw, h: sh };
}
function getSwordRect() {
  if (!sword_name) return null;
  const img = images[sword_name];
  if (!img) return null;
  const sw = img.naturalWidth  * 1.2;
  const sh = img.naturalHeight * 1.2;
  let sx;
  if (sword_name.startsWith('r_')) {
    sx = ghost_world_x + ghostW() * 0.1;
  } else {
    sx = ghost_world_x - sw - ghostW() * 0.1;
  }
  const sy = ghost_world_y - sh / 2;
  return { x: sx, y: sy, w: sw, h: sh };
}
function rectsOverlap(a, b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

// ─── Update Ghostito ──────────────────────────────────────────────────────────
function updateGhost(dt, now) {
  const move_left  = !!keys_down['ArrowLeft'];
  const move_right = !!keys_down['ArrowRight'];

  // Descendio
  if (descending) {
    desc_timer++;
    if (desc_timer >= DESC_SPEED) {
      desc_timer = 0;
      if (!desc_reversing) {
        desc_stage = Math.min(10, desc_stage + 1);
      } else {
        desc_stage = Math.max(1, desc_stage - 1);
        if (desc_stage === 1) { descending = false; desc_reversing = false; }
      }
    }
    if (move_left)  { ghost_world_x = Math.max(0, ghost_world_x - MOVE_SPEED); last_direction = 'left'; }
    if (move_right) { ghost_world_x = Math.min(world_width, ghost_world_x + MOVE_SPEED); last_direction = 'right'; }
    return;
  }

  // Dash
  if (dash_remaining > 0) {
    const dir = ghost_state.includes('right') ? 1 : -1;
    ghost_world_x += DASH_SPEED * dir;
    dash_remaining--;
  } else {
    if (move_left) {
      ghost_world_x = Math.max(0, ghost_world_x - MOVE_SPEED);
      last_direction  = 'left';
      last_move_time  = now;
      ghost_state     = 'left';
    } else if (move_right) {
      ghost_world_x = Math.min(world_width, ghost_world_x + MOVE_SPEED);
      last_direction  = 'right';
      last_move_time  = now;
      ghost_state     = 'right';
    } else {
      ghost_state = (now - last_move_time < 10000) ? last_direction : 'ghostito';
    }

    // Gravedad
    ghost_vy       += GRAVITY;
    ghost_world_y  += ghost_vy;

    // Animación de ataque
    if (attacking) {
      attack_timer++;
      if (attack_timer >= ATTACK_SPEED) {
        attack_frame++;
        attack_timer = 0;
        if (attack_frame >= 3) { attacking = false; attack_frame = 0; sword_name = null; }
      }
      if (attacking) {
        const side = last_direction === 'right' ? 'r' : 'l';
        sword_name = `${side}_sword${attack_frame + 1}`;
      }
    }
  }

  // Límites
  const hw = ghostW() / 2;
  ghost_world_x = Math.max(hw, Math.min(world_width - hw, ghost_world_x));
}

// ─── DRAW ─────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (game_state === 'menu') { drawMenu(); return; }

  if (game_over) { drawGameOver(); return; }

  // 1) Fondos lontananza
  scenario_indices.forEach((idx, pos) => {
    const x_off = pos * GAME_WIDTH - camera_x;
    let name;
    if (idx < 0)      name = `${Math.abs(idx)}_background_lontananza`;
    else if (idx > 0) name = `background_lontananza_${idx}`;
    else              name = 'background_lontananza';
    if (images[name]) ctx.drawImage(images[name], x_off, 0, GAME_WIDTH, GAME_HEIGHT);
  });

  // 2) Fondos medios
  scenario_indices.forEach((idx, pos) => {
    const x_off = pos * GAME_WIDTH - camera_x;
    let name;
    if (idx < 0)      name = `${Math.abs(idx)}background`;
    else if (idx > 0) name = `background${idx}`;
    else              name = 'background';
    if (images[name]) ctx.drawImage(images[name], x_off, 0, GAME_WIDTH, GAME_HEIGHT);
    else {
      // Fallback: fondo de color para que no quede negro
      ctx.fillStyle = '#0a0a2e';
      ctx.fillRect(x_off, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  });

  // 2.5) Polvo de dash (se muestra 1 frame)
  if (dust_pending) {
    const { world_x, world_y, dir } = dust_pending;
    const dname = `another_one_bites_the_dust_${dir}`;
    if (images[dname]) {
      const di = images[dname];
      const sx = dir === 'left'
        ? world_x - camera_x
        : world_x - camera_x - di.naturalWidth;
      ctx.drawImage(di, sx, world_y - di.naturalHeight / 2);
    }
    dust_pending = null;
  }

  // 3) Ghostito + espada
  drawGhost();

  // 4) Fondos cercanos (primer plano, encima del personaje)
  scenario_indices.forEach((idx, pos) => {
    const x_off = pos * GAME_WIDTH - camera_x;
    let name;
    if (idx < 0)      name = `${Math.abs(idx)}_background_cercano`;
    else if (idx > 0) name = `background_cercano_${idx}`;
    else              name = 'background_cercano';
    if (images[name]) ctx.drawImage(images[name], x_off, 0, GAME_WIDTH, GAME_HEIGHT);
  });

  // 5) Espectro tipo 1
  if (spectro_active && spectro) {
    const sname = spectro_is_blinking ? 'espectro_parpadeo' : 'espectro';
    drawImageCentered(sname, spectro.world_x - camera_x, spectro.world_y, 0.7);
  }

  // 6) Espectro tipo 2 (volteado horizontalmente)
  if (spectro2_active && spectro2) {
    const s2name = spectro2_is_blinking ? 'espectro2_parpadeo' : 'espectro2';
    const img2   = images[s2name] || images['espectro2'];
    if (img2) {
      const sw2 = img2.naturalWidth  * 0.7;
      const sh2 = img2.naturalHeight * 0.7;
      const sx2 = spectro2.world_x - camera_x - sw2 / 2;
      const sy2 = spectro2.world_y - sh2 / 2;
      // Flip horizontal
      ctx.save();
      ctx.translate(sx2 + sw2, sy2);
      ctx.scale(-1, 1);
      ctx.drawImage(img2, 0, 0, sw2, sh2);
      ctx.restore();
    }
  }

  // 7) HUD
  drawHUD();
}

function drawGhost() {
  const scale_y = GAME_HEIGHT / 600;
  const floor_y = GAME_HEIGHT - (foot_offset * scale_y);

  if (!descending && !desc_reversing) {
    const min_y = floor_y - ghostH() / 2;
    if (ghost_world_y > min_y) {
      ghost_world_y = min_y;
      ghost_vy      = 0;
    }
  } else {
    const r     = desc_stage > 0 ? DESC_REDUCTIONS[desc_stage - 1] : 0;
    const origH = images['ghostito'] ? images['ghostito'].naturalHeight * GHOST_SCALE : 100;
    const new_h = origH - r;
    ghost_world_y = floor_y - new_h / 2;
  }

  const screen_x = ghost_world_x - camera_x;

  // Espada DETRÁS de Ghostito
  if (attacking && sword_name && images[sword_name]) {
    const simg  = images[sword_name];
    const sw    = simg.naturalWidth  * 1.2;
    const sh    = simg.naturalHeight * 1.2;
    let   sx;
    if (sword_name.startsWith('r_')) {
      sx = screen_x + ghostW() * 0.1;
    } else {
      sx = screen_x - sw - ghostW() * 0.1;
    }
    const sy = ghost_world_y - sh / 1.5;
    ctx.drawImage(simg, sx, sy, sw, sh);
  }

  // Ghostito encima
  const imgName = getCurrentImage();
  const img     = images[imgName] || images['ghostito'];
  if (img) {
    const gw = img.naturalWidth  * GHOST_SCALE;
    const gh = img.naturalHeight * GHOST_SCALE;
    ctx.drawImage(img, screen_x - gw / 2, ghost_world_y - gh / 2, gw, gh);
  }
}

function drawHUD() {
  ctx.font      = 'bold 36px "Segoe UI", sans-serif';
  ctx.fillStyle = 'white';
  ctx.shadowColor   = 'black';
  ctx.shadowBlur    = 4;
  ctx.fillText(`Vida: ${ghost_hp}`, 14, 44);
  ctx.fillText(`Espectros derrotados: ${spectros_defeated}/20`, 14, 90);
  ctx.shadowBlur = 0;
}

// ─── Menú ─────────────────────────────────────────────────────────────────────
function drawMenu() {
  // Fondo degradado oscuro
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  grad.addColorStop(0, '#050510');
  grad.addColorStop(1, '#0a0a30');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Título
  ctx.textAlign    = 'center';
  ctx.font         = 'bold 90px "Segoe UI", sans-serif';
  ctx.fillStyle    = '#ffffff';
  ctx.shadowColor  = '#7ecfff';
  ctx.shadowBlur   = 30;
  ctx.fillText('GHOSTITO', GAME_WIDTH / 2, GAME_HEIGHT / 4);
  ctx.shadowBlur   = 0;

  // Historia
  ctx.font      = '32px "Segoe UI", sans-serif';
  ctx.fillStyle = '#add8e6';
  const story = [
    'Ghostito es un espíritu que busca alcanzar la luz de la eternidad.',
    'Para lograrlo, debe derrotar a 20 espectros malignos que quieren',
    'arrastrarlo hacia la oscuridad eterna.',
    '',
    "Su única defensa es su fiel espada 'Escarcha Espectral'.",
    '',
    '¿Podrás ayudar a Ghostito en su travesía hacia la luz?'
  ];
  const startY = GAME_HEIGHT / 2 - 80;
  story.forEach((line, i) => ctx.fillText(line, GAME_WIDTH / 2, startY + i * 42));

  // Controles
  ctx.font      = 'bold 38px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffff00';
  ctx.fillText('CONTROLES:', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130);

  ctx.font      = '26px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  const controls = [
    'Flechas ← → : Mover',
    'ESPACIO : Saltar',
    'A : Dash',
    'X : Atacar con Escarcha Espectral',
    'D : Descendio (mantener presionado)'
  ];
  controls.forEach((c, i) => ctx.fillText(c, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 178 + i * 34));

  // Instrucción inicio
  const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 400);
  ctx.globalAlpha = pulse;
  ctx.font        = 'bold 44px "Segoe UI", sans-serif';
  ctx.fillStyle   = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur  = 20;
  ctx.fillText('Presiona ENTER para comenzar tu aventura', GAME_WIDTH / 2, GAME_HEIGHT - 80);
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;

  ctx.textAlign = 'left';
}

// ─── Game Over / Win ──────────────────────────────────────────────────────────
function drawGameOver() {
  ctx.fillStyle = '#000010';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.textAlign = 'center';

  if (game_win) {
    ctx.font      = 'bold 52px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
    ctx.fillText(
      'Ghostito ha derrotado a los espectros suficientes para alcanzar la LUZ ETERNA',
      GAME_WIDTH / 2, GAME_HEIGHT / 2
    );
  } else {
    ctx.font      = 'bold 110px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ff2222';
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 30;
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.shadowBlur = 0;
    ctx.font      = 'bold 50px "Segoe UI", sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText('Presiona ENTER para reiniciar', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110);
  }
  ctx.shadowBlur = 0;
  ctx.textAlign  = 'left';
}

// ─── Eventos de teclado ───────────────────────────────────────────────────────
function onKeyDown(code) {
  // Menú → comenzar
  if (game_state === 'menu') {
    if (code === 'Enter') { game_state = 'playing'; startMusic(); }
    return;
  }
  if (game_state !== 'playing') return;

  // Reiniciar desde Game Over
  if (game_over && code === 'Enter') {
    resetGame();
    return;
  }
  if (game_over) return;

  // Saltar
  if (code === 'Space' && ghost_vy === 0 && !descending) {
    ghost_vy    = JUMP_SPEED;
    ghost_state = last_direction;
  }
  // Dash
  else if (code === 'KeyA' && dash_remaining === 0 && !descending) {
    dust_pending  = { world_x: ghost_world_x, world_y: ghost_world_y, dir: last_direction };
    dash_remaining = DASH_SPEED;
    ghost_state    = `dash_${last_direction}`;
  }
  // Ataque
  else if (code === 'KeyX' && !attacking && !descending) {
    if (ghost_state === 'ghostito') ghost_state = last_direction;
    attacking    = true;
    attack_frame = 0;
    attack_timer = 0;
    const side   = last_direction === 'right' ? 'r' : 'l';
    sword_name   = `${side}_sword1`;
  }
  // Descendio
  else if (code === 'KeyD' && !descending) {
    descending     = true;
    desc_reversing = false;
    desc_stage     = 1;
    desc_timer     = 0;
  }
}

function onKeyUp(code) {
  if (game_state !== 'playing') return;
  if (code === 'KeyD' && descending) desc_reversing = true;
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetGame() {
  ghost_world_x    = start_index * GAME_WIDTH + GAME_WIDTH / 2;
  ghost_world_y    = 0;
  ghost_vy         = 0;
  ghost_hp         = 5;
  spectros_defeated = 0;
  game_over        = false;
  game_win         = false;
  ghost_state      = 'ghostito';
  last_direction   = 'right';
  attacking        = false;
  descending       = false;
  desc_reversing   = false;
  dash_remaining   = 0;
  spectro_active   = false;
  spectro2_active  = false;
  spectro_timer    = 0;
  spectro2_timer   = 0;
  camera_x         = 0;
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  update(dt, timestamp);
  draw();

  requestAnimationFrame(gameLoop);
}

// ─── Inicio: cargar todo y arrancar ──────────────────────────────────────────
loadAllImages(() => {
  // Ocultar pantalla de carga
  document.getElementById('loadingScreen').style.display = 'none';
  // Música se activa al pulsar ENTER (por política de navegadores)
  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
});
