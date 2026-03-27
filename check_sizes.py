from PIL import Image

# Lista de sprites a medir (asegúrate de que coincidan con tus PNG)
sprites = [
    "images/ghostito.png",
    "images/attack1_right.png",
    "images/attack2_right.png",
    "images/attack3_right.png",
    # agrega aquí otros nombres de archivo que quieras medir
]

for name in sprites:
    im = Image.open(name)
    w, h = im.size
    print(f"{name}: ancho={w}px, alto={h}px")
