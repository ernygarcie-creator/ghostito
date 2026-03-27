# 👻 Ghostito — Videojuego Web

Juego de plataformas en HTML5 Canvas. Funciona directamente en el navegador, sin instalar nada.

---

## 📁 Estructura de carpetas requerida

```
ghostito/
├── index.html
├── game.js
├── README.md
├── images/
│   ├── ghostito.png
│   ├── ghostito_parpadeo.png
│   ├── left.png
│   ├── left_parpadeo.png
│   ├── right.png
│   ├── right_parpadeo.png
│   ├── dash_left.png
│   ├── dash_right.png
│   ├── descendio1.png  ...  descendio10.png
│   ├── attack1_right.png  attack2_right.png  attack3_right.png
│   ├── attack1_left.png   attack2_left.png   attack3_left.png
│   ├── r_sword1.png  r_sword2.png  r_sword3.png
│   ├── l_sword1.png  l_sword2.png  l_sword3.png
│   ├── espectro.png  espectro_parpadeo.png
│   ├── espectro2.png  espectro2_parpadeo.png
│   ├── another_one_bites_the_dust_left.png
│   ├── another_one_bites_the_dust_right.png
│   ├── background.png            (escenario 0 — medio)
│   ├── background_lontananza.png (escenario 0 — lejano)
│   ├── background_cercano.png    (escenario 0 — cercano)
│   ├── background1.png  background_lontananza_1.png  background_cercano_1.png
│   ├── background2.png  background_lontananza_2.png  background_cercano_2.png
│   ├── 1background.png  1_background_lontananza.png  1_background_cercano.png
└── music/
    └── musicether_oar_the_whole_other.mp3
```

> ⚠️ Los nombres de archivo deben coincidir exactamente (minúsculas, sin espacios).

---

## 🖥️ Ver en VS Code con Live Server

1. Instala la extensión **Live Server** en VS Code  
   (busca "Live Server" por Ritwick Dey en el panel de extensiones)

2. Abre la carpeta `ghostito/` en VS Code:
   ```
   Archivo → Abrir Carpeta → selecciona la carpeta ghostito
   ```

3. Haz clic derecho sobre `index.html` → **"Open with Live Server"**

4. El juego se abre en tu navegador en `http://127.0.0.1:5500`

---

## 🌐 Publicar en GitHub Pages (gratis, online)

### Paso 1 — Crea un repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Clic en **"New repository"** (botón verde)
3. Nombre: `ghostito` (o el que prefieras)
4. Marca **"Public"**
5. Clic en **"Create repository"**

### Paso 2 — Sube los archivos

**Opción A: desde el navegador (más fácil)**

1. En la página de tu repositorio, clic en **"uploading an existing file"**
2. Arrastra TODOS los archivos y carpetas (`index.html`, `game.js`, carpeta `images/`, carpeta `music/`)
3. Escribe un mensaje como "Subir juego Ghostito"
4. Clic en **"Commit changes"**

**Opción B: desde la terminal (si tienes Git instalado)**
```bash
cd ghostito
git init
git add .
git commit -m "Ghostito web game"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ghostito.git
git push -u origin main
```

### Paso 3 — Activar GitHub Pages

1. En tu repositorio, ve a **Settings** (pestaña de arriba)
2. En el menú izquierdo, clic en **"Pages"**
3. En "Source", selecciona: **"Deploy from a branch"**
4. Branch: **main** / Folder: **/ (root)**
5. Clic en **"Save"**

⏳ Espera 1-2 minutos. Tu juego estará disponible en:
```
https://TU_USUARIO.github.io/ghostito/
```

---

## 🎮 Controles

| Tecla | Acción |
|-------|--------|
| ← → | Mover |
| ESPACIO | Saltar |
| A | Dash |
| X | Atacar (Escarcha Espectral) |
| D (mantener) | Descendio |
| ENTER | Iniciar / Reiniciar |

---

## ⚠️ Notas importantes

- **La música** se activa al presionar ENTER (los navegadores requieren interacción del usuario antes de reproducir audio).
- Si algún sprite no carga, el juego **no se rompe** — simplemente ese elemento no se dibuja.
- Para probar localmente, **siempre usa Live Server** (abrir `index.html` directo con doble clic no funcionará por restricciones de seguridad del navegador con archivos locales).

---

## 🛠️ ¿Quieres modificar el juego?

Todo el código del juego está en **`game.js`**. Las constantes principales están al inicio:

```javascript
const MOVE_SPEED  = 5;   // velocidad de movimiento
const JUMP_SPEED  = -14; // fuerza del salto (negativo = arriba)
const DASH_SPEED  = 15;  // velocidad del dash
const SPAWN_INTERVAL = 5000; // ms entre aparición de espectros
```
