import pgzrun
from pgzero.actor import Actor
from pgzero import music
from pgzero.keyboard import keys
import pygame
import time
import math
import sys
from pygame import Rect
from pgzero.loaders import images

# ─── Configuración de la ventana ───
WIDTH = 1600
HEIGHT = 900
TITLE = "Ghostito"
FPS = 60

pygame.init()
pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)

# ─── Estado del juego ───
game_state = 'menu'  # 'menu', 'playing'

# ─── Mundo y cámara ───
scenario_indices = [-1, 0, 1, 2]
world_width = len(scenario_indices) * WIDTH
camera_x = 0

# ─── Ghostito ───
foot_offset = 82.3972
start_index = scenario_indices.index(0)
ghost = Actor('ghostito', (start_index * WIDTH + WIDTH // 2, 0))
ghost.scale = 0.70
ghost.vy = 0
ghost.gravity = 0.5

# ─── Máscaras pixel-perfect escaladas para las espadas ───
attack_masks = {}
for frame in [1, 2, 3]:
    for side in ['r', 'l']:
        name = f"{side}_sword{frame}"
        if hasattr(images, name):
            orig = getattr(images, name)
            w = int(orig.get_width() * ghost.scale)
            h = int(orig.get_height() * ghost.scale)
            surf = pygame.transform.scale(orig, (w, h))
            attack_masks[name] = pygame.mask.from_surface(surf)

# ─── Máscara del espectro tipo 1 escalada ───
spec_orig = getattr(images, 'espectro')
spec_w = int(spec_orig.get_width() * 0.7)
spec_h = int(spec_orig.get_height() * 0.7)
spectro_mask = pygame.mask.from_surface(
    pygame.transform.scale(spec_orig, (spec_w, spec_h))
)

# ─── Máscara del espectro tipo 2 (sin espejo) escalada ───
# Usamos la imagen "espectro2" para crear la máscara. Al voltear no cambia la máscara.
if not hasattr(images, 'espectro2'):
    raise SystemExit("ERROR: No se encontró la imagen 'espectro2'. Asegúrate de que exista en /images.")
spec2_orig = getattr(images, 'espectro2')
spec2_w = int(spec2_orig.get_width() * 0.7)
spec2_h = int(spec2_orig.get_height() * 0.7)
spectro2_mask = pygame.mask.from_surface(
    pygame.transform.scale(spec2_orig, (spec2_w, spec2_h))
)

# ─── Vidas, contador y estados de fin ───
ghost_hp = 5
spectros_defeated = 0
game_over = False
game_win = False

# ─── Descendio ───
ORIGINAL_HEIGHT = images.ghostito.get_height() * ghost.scale
DESC_REDUCTIONS = [
    0, 5.1422, 18.9294, 25.8818, 41.7907,
    49.7708, 76.9557, 92.5294, 132.9139, 167.9932
]

# ─── Estados de Ghostito ───
state = 'ghostito'
last_direction = 'right'
last_move_time = time.time()

dash_remaining = 0

attacking = False
attack_frame = 0
attack_timer = 0
sword_name = None

descending = False
desc_reversing = False
desc_stage = 0
desc_timer = 0
DESC_SPEED = 3

MOVE_SPEED = 5
JUMP_SPEED = -14
DASH_SPEED = 15
ATTACK_SPEED = 2

blink_timer = 0
is_blinking = False

# ─── Polvo de dash horizontal ───
dust_x0 = dust_y0 = None
dust_dir = None

# ─── Espectro enemigo tipo 1 ───
spectro = None
spectro_timer = 0
spectro_active = False
spectro_phase = 0.0
SPAWN_INTERVAL = 5
SPECTRO_SPEED = 2
WAVE_PERIOD = 2
wave_increment = 2 * math.pi / (WAVE_PERIOD * FPS)
spectro_blink_timer = 0
spectro_is_blinking = False

# ─── Espectro enemigo tipo 2 ───
spectro2 = None
spectro2_timer = 0
spectro2_active = False
SPECTRO2_SPEED = 2
spectro2_blink_timer = 0
spectro2_is_blinking = False

# ─── Coordenadas mundo de Ghostito ───
ghost_world_x = start_index * WIDTH + WIDTH // 2
ghost_world_y = 0

def draw_menu():
    """Dibuja la pantalla de menú principal"""
    screen.clear()
    screen.fill((10, 10, 30))

    # Título principal
    screen.draw.text(
        "GHOSTITO",
        center=(WIDTH // 2, HEIGHT // 4),
        fontsize=80,
        color="white"
    )

    # Historia del juego
    story_lines = [
        "Ghostito es un espíritu que busca alcanzar la luz de la eternidad.",
        "Para lograrlo, debe derrotar a 20 espectros malignos que quieren",
        "arrastrarlo hacia la oscuridad eterna.",
        "",
        "Su única defensa es su fiel espada 'Escarcha Espectral'.",
        "",
        "¿Podrás ayudar a Ghostito en su travesía hacia la luz?"
    ]
    start_y = HEIGHT // 2 - 80
    for i, line in enumerate(story_lines):
        screen.draw.text(
            line,
            center=(WIDTH // 2, start_y + i * 40),
            fontsize=35,
            color="lightblue"
        )

    # Controles
    screen.draw.text(
        "CONTROLES:",
        center=(WIDTH // 2, HEIGHT // 2 + 120),
        fontsize=40,
        color="yellow"
    )
    controls = [
        "Flechas ← → : Mover",
        "ESPACIO : Saltar",
        "A : Dash",
        "X : Atacar con Escarcha Espectral",
        "D : Descendio (mantener presionado)"
    ]
    start_y = HEIGHT // 2 + 170
    for i, control in enumerate(controls):
        screen.draw.text(
            control,
            center=(WIDTH // 2, start_y + i * 30),
            fontsize=25,
            color="white"
        )

    # Instrucción para empezar
    screen.draw.text(
        "Presiona ENTER para comenzar tu aventura",
        center=(WIDTH // 2, HEIGHT - 100),
        fontsize=45,
        color="green"
    )

def draw():
    global camera_x, game_over, dust_x0

    if game_state == 'menu':
        draw_menu()
        return

    screen.clear()

    # Si el juego terminó
    if game_over:
        if game_win:
            screen.draw.text(
                "Ghostito ha derrotado a los espectros suficientes para alcanzar la LUZ ETERNA",
                center=(WIDTH // 2, HEIGHT // 2),
                fontsize=50,
                color="gold"
            )
        else:
            screen.draw.text(
                "GAME OVER",
                center=(WIDTH // 2, HEIGHT // 2),
                fontsize=100,
                color="red"
            )
            screen.draw.text(
                "Presiona ENTER para reiniciar",
                center=(WIDTH // 2, HEIGHT // 2 + 100),
                fontsize=50,
                color="white"
            )
        return

    # 1) fondos lejanos
    for idx in scenario_indices:
        x_off = scenario_indices.index(idx) * WIDTH - camera_x
        name = (
            f"{abs(idx)}_background_lontananza" if idx < 0 else
            f"background_lontananza_{idx}" if idx > 0 else
            "background_lontananza"
        )
        if hasattr(images, name):
            bg = pygame.transform.scale(getattr(images, name), (WIDTH, HEIGHT))
            screen.surface.blit(bg, (x_off, 0))

    # 2) fondos medios
    for idx in scenario_indices:
        x_off = scenario_indices.index(idx) * WIDTH - camera_x
        name = (
            f"{abs(idx)}background" if idx < 0 else
            f"background{idx}" if idx > 0 else
            "background"
        )
        bg = pygame.transform.scale(getattr(images, name), (WIDTH, HEIGHT))
        screen.surface.blit(bg, (x_off, 0))

    # 2.5) polvo de dash
    if dust_x0 is not None:
        img = f"another_one_bites_the_dust_{dust_dir}"
        if hasattr(images, img):
            surf = getattr(images, img)
            if dust_dir == 'left':
                sx = dust_x0 - camera_x
            else:
                sx = dust_x0 - camera_x - surf.get_width()
            sy = dust_y0
            screen.surface.blit(surf, (sx, sy))
        dust_x0 = None

    # 3) Ghostito y su espada (con _draw_ghost())
    _draw_ghost()

    # 4) fondos cercanos
    for idx in scenario_indices:
        x_off = scenario_indices.index(idx) * WIDTH - camera_x
        name = (
            f"{abs(idx)}_background_cercano" if idx < 0 else
            f"background_cercano_{idx}" if idx > 0 else
            "background_cercano"
        )
        if hasattr(images, name):
            bg = pygame.transform.scale(getattr(images, name), (WIDTH, HEIGHT))
            screen.surface.blit(bg, (x_off, 0))

    # 5) Dibujo del espectro tipo 1 (normal, aparece desde la derecha)
    if spectro_active and spectro:
        spectro_screen_x = spectro.world_x - camera_x
        spectro_screen_y = spectro.world_y
        temp_spectro = Actor('espectro_parpadeo' if spectro_is_blinking else 'espectro')
        temp_spectro.scale = 0.7
        temp_spectro.x = spectro_screen_x
        temp_spectro.y = spectro_screen_y
        temp_spectro.draw()

    # 6) Dibujo del espectro tipo 2 (aparece desde la izquierda, moviéndose horizontalmente al nivel de Ghostito)
    if spectro2_active and spectro2:
        # Tomamos la imagen base de "espectro2" o "espectro2_parpadeo" y la volteamos horizontalmente.
        if spectro2_is_blinking and hasattr(images, 'espectro2_parpadeo'):
            base_surf = getattr(images, 'espectro2_parpadeo')
        else:
            base_surf = getattr(images, 'espectro2')  # asumo que existe siempre

        # Escalamos al 70% y volteamos en X
        scaled = pygame.transform.scale(base_surf, (spec2_w, spec2_h))
        flipped = pygame.transform.flip(scaled, True, False)

        # Coordenadas en pantalla
        s2_screen_x = spectro2.world_x - camera_x - (spec2_w // 2)
        s2_screen_y = spectro2.world_y - (spec2_h // 2)
        screen.surface.blit(flipped, (s2_screen_x, s2_screen_y))

    # 7) HUD: Vida y contador
    screen.draw.text(f"Vida: {ghost_hp}", (10, 10), fontsize=40, color="white")
    screen.draw.text(f"Espectros derrotados: {spectros_defeated}/20", (10, 60), fontsize=40, color="white")


def _draw_ghost():
    """Dibuja a Ghostito (incluyendo espada si ataca)"""
    global ghost_world_x, ghost_world_y

    scale_y = HEIGHT / 600
    floor_y = HEIGHT - (foot_offset * scale_y)

    # Si no estamos en descendio, aplicar gravedad y chequeo de suelo
    if not descending and not desc_reversing:
        min_y = floor_y - (ghost.height * ghost.scale) / 2
        if ghost_world_y > min_y:
            ghost_world_y = min_y
            ghost.vy = 0
            if state.startswith('jump'):
                reset_state()
    else:
        # En descendio, reducir altura progresivamente
        r = DESC_REDUCTIONS[desc_stage - 1] if desc_stage > 0 else 0
        new_h = ORIGINAL_HEIGHT - r
        ghost_world_y = floor_y - new_h / 2

    # Convertir a coordenadas de pantalla
    screen_x = ghost_world_x - camera_x
    ghost.x = screen_x
    ghost.y = ghost_world_y
    ghost.image = get_current_image()

    # Si estamos atacando, dibujar espada DETRÁS de Ghostito
    if attacking and sword_name and hasattr(images, sword_name):
        surf = getattr(images, sword_name)
        sword_scale = 1.2
        sword_w = int(surf.get_width() * sword_scale)
        sword_h = int(surf.get_height() * sword_scale)
        scaled_sword = pygame.transform.scale(surf, (sword_w, sword_h))

        if sword_name.startswith('r_'):
            sx = screen_x + (ghost.width * ghost.scale * 0.1)
        else:
            sx = screen_x - sword_w - (ghost.width * ghost.scale * 0.1)
        sy = ghost_world_y - sword_h // 1.5
        screen.surface.blit(scaled_sword, (sx, sy))

    # Finalmente, dibujar a Ghostito encima de la espada
    ghost.draw()


def update():
    global spectro_timer, spectro_active, spectro, spectro_phase
    global spectro_blink_timer, spectro_is_blinking, camera_x
    global ghost_hp, game_over, ghost_world_x, ghost_world_y
    global spectro2_timer, spectro2_active, spectro2
    global spectro2_blink_timer, spectro2_is_blinking
    global spectros_defeated, game_win

    if game_state != 'playing':
        return
    if game_over:
        return

    now = time.time()
    _update_ghost(now)

    # Cámara centrada en Ghostito dentro del mundo
    camera_x = min(max(ghost_world_x - WIDTH / 2, 0), world_width - WIDTH)

    # Parpadeos
    _blink_ghost()
    _blink_spectro()
    _blink_spectro2()

    # ─── Lógica de spawn para espectros ───

    # Espectro tipo 1 (aparece desde la derecha)
    spectro_timer += 1 / FPS
    if spectro_timer >= SPAWN_INTERVAL and not spectro_active:
        spectro_timer = 0
        _spawn_spectro()

    # Espectro tipo 2 (aparece desde la izquierda)
    spectro2_timer += 1 / FPS
    if spectro2_timer >= SPAWN_INTERVAL and not spectro2_active:
        spectro2_timer = 0
        _spawn_spectro2()

    # ─── Movimiento y colisiones del espectro tipo 1 ───
    if spectro_active and spectro:
        # Se mueve hacia la izquierda con trayectoria ondulatoria
        spectro.world_x -= SPECTRO_SPEED
        mid_y = HEIGHT / 2
        amp = mid_y / 3
        spectro_phase += wave_increment
        spectro.world_y = mid_y + amp * math.sin(spectro_phase)

        # Colisión espada → espectro tipo 1 (pixel-perfect)
        if attacking and sword_name and sword_name in attack_masks:
            surf = getattr(images, sword_name)
            sword_scale = 1.2
            sw = int(surf.get_width() * sword_scale)
            sh = int(surf.get_height() * sword_scale)
            scaled_sword_surf = pygame.transform.scale(surf, (sw, sh))
            mask_atk = pygame.mask.from_surface(scaled_sword_surf)

            if sword_name.startswith('r_'):
                sword_world_x = ghost_world_x + (ghost.width * ghost.scale * 0.1)
            else:
                sword_world_x = ghost_world_x - sw - (ghost.width * ghost.scale * 0.1)
            sword_world_y = ghost_world_y - sh // 2

            spectro_world_x = spectro.world_x - spec_w // 2
            spectro_world_y = spectro.world_y - spec_h // 2
            offset_x = int(spectro_world_x - sword_world_x)
            offset_y = int(spectro_world_y - sword_world_y)

            if (offset_x >= -spec_w and offset_x <= sw and
                offset_y >= -spec_h and offset_y <= sh):
                overlap = mask_atk.overlap(spectro_mask, (offset_x, offset_y))
                if overlap:
                    spectro_active = False
                    spectros_defeated += 1
                    if spectros_defeated >= 20:
                        game_win = True
                        game_over = True

        # Colisión espectro tipo 1 → Ghostito (hitbox aproximada)
        ghost_rect = Rect(
            ghost_world_x - ghost.width * ghost.scale // 2,
            ghost_world_y - ghost.height * ghost.scale // 2,
            ghost.width * ghost.scale,
            ghost.height * ghost.scale
        )
        spectro_rect = Rect(
            spectro.world_x - spec_w // 2,
            spectro.world_y - spec_h // 2,
            spec_w,
            spec_h
        )
        if ghost_rect.colliderect(spectro_rect):
            spectro_active = False
            if not descending:
                ghost_hp -= 1
                if ghost_hp <= 0:
                    game_over = True

        # Si sale de pantalla a la izquierda, desactivar
        if spectro.world_x < -100:
            spectro_active = False

    # ─── Movimiento y colisiones del espectro tipo 2 ───
    if spectro2_active and spectro2:
        # Se mueve hacia la derecha a la altura de Ghostito
        spectro2.world_x += SPECTRO2_SPEED
        spectro2.world_y = ghost_world_y

        # Colisión espada → espectro tipo 2 (pixel-perfect)
        if attacking and sword_name and sword_name in attack_masks:
            surf = getattr(images, sword_name)
            sword_scale = 1.2
            sw = int(surf.get_width() * sword_scale)
            sh = int(surf.get_height() * sword_scale)
            scaled_sword_surf = pygame.transform.scale(surf, (sw, sh))
            mask_atk = pygame.mask.from_surface(scaled_sword_surf)

            if sword_name.startswith('r_'):
                sword_world_x = ghost_world_x + (ghost.width * ghost.scale * 0.1)
            else:
                sword_world_x = ghost_world_x - sw - (ghost.width * ghost.scale * 0.1)
            sword_world_y = ghost_world_y - sh // 2

            spectro2_world_x = spectro2.world_x - spec2_w // 2
            spectro2_world_y = spectro2.world_y - spec2_h // 2
            offset_x2 = int(spectro2_world_x - sword_world_x)
            offset_y2 = int(spectro2_world_y - sword_world_y)

            if (offset_x2 >= -spec2_w and offset_x2 <= sw and
                offset_y2 >= -spec2_h and offset_y2 <= sh):
                overlap2 = mask_atk.overlap(spectro2_mask, (offset_x2, offset_y2))
                if overlap2:
                    spectro2_active = False
                    spectros_defeated += 1
                    if spectros_defeated >= 20:
                        game_win = True
                        game_over = True

        # Colisión espectro tipo 2 → Ghostito (hitbox aproximada)
        ghost_rect2 = Rect(
            ghost_world_x - ghost.width * ghost.scale // 2,
            ghost_world_y - ghost.height * ghost.scale // 2,
            ghost.width * ghost.scale,
            ghost.height * ghost.scale
        )
        spectro2_rect = Rect(
            spectro2.world_x - spec2_w // 2,
            spectro2.world_y - spec2_h // 2,
            spec2_w,
            spec2_h
        )
        if ghost_rect2.colliderect(spectro2_rect):
            spectro2_active = False
            if not descending:
                ghost_hp -= 1
                if ghost_hp <= 0:
                    game_over = True

        # Si se sale de pantalla por la derecha, desactivar
        if spectro2.world_x > world_width + 100:
            spectro2_active = False


def get_current_image():
    if descending or desc_reversing:
        return f'descendio{desc_stage}'
    if attacking:
        return state
    if is_blinking:
        return f'{state}_parpadeo' if state in ['left', 'right'] else 'ghostito_parpadeo'
    return state


def reset_state():
    global state
    state = 'ghostito'


def _update_ghost(now):
    global state, dash_remaining, attacking, attack_frame, attack_timer
    global sword_name, last_direction, last_move_time
    global descending, desc_stage, desc_reversing, desc_timer
    global dust_x0, dust_y0, dust_dir, ghost_world_x, ghost_world_y

    keys_pressed = pygame.key.get_pressed()
    move_left = keys_pressed[pygame.K_LEFT]
    move_right = keys_pressed[pygame.K_RIGHT]

    # Si estamos en descendio
    if descending:
        desc_timer += 1
        if desc_timer >= DESC_SPEED:
            desc_timer = 0
            if not desc_reversing:
                desc_stage = min(10, desc_stage + 1)
            else:
                desc_stage = max(1, desc_stage - 1)
                if desc_stage == 1:
                    descending = False
                    desc_reversing = False
        if move_left:
            ghost_world_x = max(0, ghost_world_x - MOVE_SPEED)
            last_direction = 'left'
        elif move_right:
            ghost_world_x = min(world_width, ghost_world_x + MOVE_SPEED)
            last_direction = 'right'
        ghost.x = ghost_world_x
        return

    # Dash horizontal
    if dash_remaining > 0:
        direction_multiplier = 1 if 'right' in state else -1
        ghost_world_x += DASH_SPEED * direction_multiplier
        dash_remaining -= 1
    else:
        if move_left:
            ghost_world_x = max(0, ghost_world_x - MOVE_SPEED)
            last_direction = 'left'
            last_move_time = now
            state = 'left'
        elif move_right:
            ghost_world_x = min(world_width, ghost_world_x + MOVE_SPEED)
            last_direction = 'right'
            last_move_time = now
            state = 'right'
        else:
            state = last_direction if now - last_move_time < 10 else 'ghostito'

        # Gravedad
        ghost.vy += ghost.gravity
        ghost_world_y += ghost.vy

        # Animación de ataque
        if attacking:
            attack_timer += 1
            if attack_timer >= ATTACK_SPEED:
                attack_frame += 1
                attack_timer = 0
                if attack_frame >= 3:
                    attacking = False
                    attack_frame = 0
                    sword_name = None
            if attacking:
                sword_name = f"{'r' if last_direction == 'right' else 'l'}_sword{attack_frame + 1}"

    # Límites del mundo
    half_width = (ghost.width * ghost.scale) / 2
    ghost_world_x = max(half_width, min(world_width - half_width, ghost_world_x))

    ghost.x = ghost_world_x
    ghost.y = ghost_world_y


def _blink_ghost():
    global blink_timer, is_blinking
    blink_timer += 1 / FPS
    if not is_blinking and blink_timer >= 3 and state in ['ghostito', 'left', 'right']:
        is_blinking = True
        blink_timer = 0
    elif is_blinking and blink_timer >= 0.2:
        is_blinking = False
        blink_timer = 0


def _blink_spectro():
    global spectro_blink_timer, spectro_is_blinking
    spectro_blink_timer += 1 / FPS
    if not spectro_is_blinking and spectro_blink_timer >= SPAWN_INTERVAL:
        spectro_is_blinking = True
        spectro_blink_timer = 0
    elif spectro_is_blinking and spectro_blink_timer >= 0.2:
        spectro_is_blinking = False
        spectro_blink_timer = 0


def _blink_spectro2():
    global spectro2_blink_timer, spectro2_is_blinking
    spectro2_blink_timer += 1 / FPS
    if not spectro2_is_blinking and spectro2_blink_timer >= SPAWN_INTERVAL:
        spectro2_is_blinking = True
        spectro2_blink_timer = 0
    elif spectro2_is_blinking and spectro2_blink_timer >= 0.2:
        spectro2_is_blinking = False
        spectro2_blink_timer = 0


def _spawn_spectro():
    """Crea el espectro tipo 1 en la esquina derecha del último escenario."""
    global spectro, spectro_active, spectro_phase
    spawn_x = scenario_indices.index(2) * WIDTH + WIDTH
    spawn_y = HEIGHT / 2
    class WorldSpectro:
        def __init__(self, world_x, world_y):
            self.world_x = world_x
            self.world_y = world_y
    spectro = WorldSpectro(spawn_x, spawn_y)
    spectro_phase = 0.0
    spectro_active = True


def _spawn_spectro2():
    """Crea el espectro tipo 2 en la izquierda, a la misma altura que Ghostito."""
    global spectro2, spectro2_active
    spawn_x = -spec2_w
    spawn_y = ghost_world_y
    class WorldSpectro2:
        def __init__(self, world_x, world_y):
            self.world_x = world_x
            self.world_y = world_y
    spectro2 = WorldSpectro2(spawn_x, spawn_y)
    spectro2_active = True


def on_key_down(key):
    global state, dash_remaining, attacking, attack_frame, attack_timer
    global descending, desc_reversing, desc_stage
    global dust_x0, dust_y0, dust_dir, game_over, ghost_hp
    global ghost_world_x, ghost_world_y, game_state
    global spectros_defeated, game_win

    # Menú principal
    if game_state == 'menu':
        if key == keys.RETURN:
            game_state = 'playing'
        return

    if game_state != 'playing':
        return

    # Reiniciar juego si está en game_over
    if game_over and key == keys.RETURN:
        ghost_world_x = start_index * WIDTH + WIDTH // 2
        ghost_world_y = 0
        ghost.x = ghost_world_x
        ghost.y = ghost_world_y
        ghost.vy = 0
        ghost_hp = 5
        spectros_defeated = 0
        game_over = False
        game_win = False
        return

    if game_over:
        return

    # Saltar
    if key == keys.SPACE and ghost.vy == 0 and not descending:
        ghost.vy = JUMP_SPEED
        state = last_direction

    # Dash horizontal
    elif key == keys.A and dash_remaining == 0 and not descending:
        dust_x0, dust_y0, dust_dir = ghost_world_x, ghost_world_y, last_direction
        dash_remaining = DASH_SPEED
        state = f'dash_{last_direction}'

    # Ataque con espada
    elif key == keys.X and not attacking and not descending:
        if state == 'ghostito':
            state = last_direction
        attacking = True
        attack_frame = 0
        attack_timer = 0
        sword_name = f"{'r' if last_direction == 'right' else 'l'}_sword1"

    # Descendio
    elif key == keys.D and not descending:
        descending = True
        desc_reversing = False
        desc_stage = 1
        desc_timer = 0


def on_key_up(key):
    global desc_reversing

    if game_state != 'playing':
        return

    if key == keys.D and descending:
        desc_reversing = True


# Música de fondo
music.set_volume(0.5)
music.play('musicether_oar_the_whole_other')

pgzrun.go()























