# oriol colomer — web

Sitio estático. **Lo que se sirve es HTML, CSS y JS y nada más**: cero framework,
cero librerías, cero JavaScript necesario para leer la página.

Node aparece en un único sitio: `build/build.mjs`, un script que lee los JSON y
escribe los HTML. No se ejecuta en el navegador de nadie — se ejecuta en GitHub
al hacer push. Oriol no instala nada.

---

## Para Oriol: cómo actualizar la web

1. Entra en `data/projects.json` en GitHub y dale al lápiz.
2. Copia un bloque `{ ... }` entero, pégalo arriba del todo y cambia los campos.
3. Commit.

Dos minutos después la web está actualizada. Eso es todo.

### Los campos de un proyecto

```json
{
  "slug": "lechatelier-sala-apolo-2025",
  "title": "LeChatelier @ Sala Apolo [2]",
  "subheader": { "en": "Lighting design & operation", "es": "…", "cat": "…" },
  "client": "LeChatelier",
  "date": "2025-10-23",
  "tags": ["lx"],
  "description": { "en": "…", "es": "…", "cat": "…" },
  "credits": {
    "lighting design": "oriol colomer & clàudia aguiló",
    "photography": "@conamorirene"
  },
  "link": "https://youtu.be/…",
  "media": ["media/lechatelier-sala-apolo-2025/image00001-e.jpg"],
  "published": true
}
```

| campo | qué es |
|---|---|
| `slug` | La dirección: `/work/<slug>/`. **No lo cambies nunca** una vez publicado: rompe los enlaces que ya circulan y Google pierde la página. |
| `title` | No se traduce. Sale tal cual. |
| `subheader`, `description` | Los tres idiomas. Si dejas `es` o `cat` vacíos, sale el inglés. |
| `date` | `AAAA-MM-DD`. Ordena la web sola. |
| `tags` | Las letras de siempre: `lx`, `vs`, `dc`, `xy`, `rs`. |
| `credits` | `"rol": "quién"`. El rol sale en **negrita** y la gente detrás. Los `@handle` se enlazan solos a Instagram. |
| `media` | Fotos y vídeos, en orden. **El primero es la portada.** |
| `published` | `false` = escrito pero sin publicar. No genera página. |

### Añadir fotos o vídeos

Súbelas a `media/<slug>/` y añade la ruta a `media`. Antes, pásalas por:

```bash
npm run media
```

Convierte los GIF a MP4 y comprime los PNG. **No subas GIF**: un GIF de 60 MB
tarda más en cargar que el vídeo entero y hunde el posicionamiento.

### El resto del sitio

`data/site.json` tiene el about, el menú, el correo y los textos de la interfaz.
Mismo sistema: lo editas y ya está.

### El fondo

Los puntos del fondo no son una imagen: se calculan. Cada punto lee un campo
invisible y crece o desaparece según el valor, y el campo se mueve. Hay cinco,
y se elige en `data/site.json`:

```json
"fondo": "terreno"
```

| valor | qué se ve |
|---|---|
| `terreno` | relieve que nace y se deshace, como un mapa de montañas. **El que está puesto.** |
| `olas` | crestas que barren en diagonal |
| `remolino` | mármol, humo |
| `celular` | burbujas que se empujan |
| `gotas` | aros de varias fuentes que se cruzan |
| `aleatorio` | uno de los cinco al azar, distinto en cada visita |

Aunque el campo esté fijado, **el momento del que arranca se sortea siempre**:
dos visitas nunca empiezan en el mismo punto del paisaje.

Para verlos sin tocar nada: `?bg=remolino` al final de cualquier dirección, o
las teclas `1`…`5` con la página abierta.

Se mueve en todas las páginas, pero **dentro del sitio va más despacio** que en
la portada: ahí el fondo es el telón del trabajo y no tiene que competir con las
fotos ni con el túnel. Esa velocidad es la constante `DENTRO` en
`build/build.mjs`; `0` lo deja quieto. Con `prefers-reduced-motion` no se mueve
en ningún sitio.

---

## Para desarrollo

```bash
npm run dev      # genera dist/ y lo sirve en localhost:4321
npm run build    # solo genera dist/
npm run media    # GIF -> MP4 y PNG -> JPG en media/
npm run import   # reimporta la ficha técnica desde el CSV (solo al arrancar)
```

### Qué genera

Una página por proyecto y por idioma:

```
/                            /es/                /cat/
/work/                       /es/work/           /cat/work/
/work/<slug>/                /es/work/<slug>/    /cat/work/<slug>/
/about/                      /es/about/          /cat/about/
sitemap.xml   robots.txt
```

Cada una con su `<title>`, su `meta description`, su `og:image`, sus `hreflang`
a los otros dos idiomas y su JSON-LD (`CreativeWork` con los colaboradores
enlazados a Instagram). Por eso hay un slug por proyecto: es la única manera
de que cada trabajo tenga una dirección propia que Google pueda indexar y que
un cliente pueda compartir.

### Los archivos

```
data/projects.json     los proyectos          <- lo que edita Oriol
data/site.json         about, menú, textos    <- lo que edita Oriol
build/build.mjs        genera los HTML
build/import-csv.py    importa la ficha técnica (una vez)
build/video.sh         GIF -> MP4
build/optimize-images.sh  PNG -> JPG
build/serve.mjs        servidor local
css/style.css          toda la hoja de estilo
js/util.js             lo poco que comparten los guiones
js/bg.js               el fondo de puntos
js/welcome.js          la portada
js/work.js             filtro, orden y miniatura del índice
js/tunnel.js           la vista en profundidad de work
media/<slug>/          fotos y vídeos
```

---

## La sombra del túnel

En la vista de túnel las cartas son fotos recortadas sobre `#fafafa`. Sin nada más,
cinco imágenes de tamaños distintos amontonadas en el centro no dicen cuál estás
mirando: el tamaño es el único indicio de profundidad y no basta.

La sombra hace las dos cosas a la vez — separa la carta del fondo **y** te dice
cuál tienes delante. No es un `box-shadow` (eso sigue el rectángulo de la foto y
se lee como un borde) sino una mancha ovalada más grande que la carta: lo que ves
es un hueco en el fondo, con los puntos apagándose alrededor.

La fuerza no es fija. `js/tunnel.js` escribe `--halo` en cada carta, cada frame,
según lo cerca que esté del foco:

| perilla | dónde | qué hace |
|---|---|---|
| `HALO_CERCA` / `HALO_FONDO` | `js/tunnel.js` | fuerza en el proyecto de delante y en el del fondo |
| `HALO_ALCANCE` | `js/tunnel.js` | en cuántos proyectos baja de una a otra |
| `HALO_PASADA` | `js/tunnel.js` | en cuántos se apaga al dejar la carta atrás. Importa: una carta pasada está ampliada por la perspectiva y su sombra taparía media pantalla |
| `--halo-x` / `--halo-y` | `css/style.css`, en `:root` | cuánto desborda de la carta. Más grande = más difusa, y pasado cierto punto las nubes vecinas se funden en una niebla que ya no separa nada |
| `--halo-nucleo` | `css/style.css` | lo cerrado del centro. La carta con `.foco` lo lleva más apretado: no sólo más sombra, sino más pegada a la foto, que es lo que se lee como "ésta está encima" |

Van con ella `DESENFOQUE` y `DESATURA`, en el mismo `js/tunnel.js`: lo que está al
fondo se desenfoca y pierde color. Es lo que convierte cuatro imágenes sueltas en
profundidad, y lo que más se nota en un teléfono, donde sólo cabe una carta entera.

---

web: [meowrhino estudio](https://meowrhino.estudio)
