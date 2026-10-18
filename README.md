# oriol colomer — web

Portfolio de Oriol Colomer Delgado. <https://meowrhino.github.io/oriol-colomer/>

**Para Oriol: [GUIA.md](GUIA.md)** (qué tocar, cómo añadir un proyecto, cómo subirlo).

Lo de abajo es para nosotros. Sigue la receta de [meowrhino/JAMstack](https://github.com/meowrhino/JAMstack).

Sitio estático. **Lo que se sirve es HTML, CSS y JS y nada más**: cero framework,
cero librerías, cero JavaScript necesario para leer la página. Node aparece en
un único sitio: `build/build.mjs`, que lee los JSON y escribe los HTML en `dist/`
al publicar. Oriol no instala nada.

- **Publicar, uno en cada copia**: la nuestra, `.github/workflows/deploy.yml` a
  GitHub Pages (solo corre en `meowrhino`); la de Oriol, Workers Builds con
  `wrangler.jsonc`. El build mira dónde está: con `GITHUB_ACTIONS`, base
  `/oriol-colomer` y `noindex`; si no, la raíz y el `url` de `site.json` (con
  `url`, se indexa). Cómo pasarle la copia: [TRASPASO.md](TRASPASO.md).
- **og:image**: 1200×630 JPG con sharp (`npm ci`), en `.cache/og/` (fuera de
  git), copiadas a `dist/og/`. Sin sharp, avisa y comparte la foto tal cual.
- **Transición**: la de la casa (`js/transicion.js` + `css/transicion.css`, de
  almarbra, y el script del `<head>` en `paginas.mjs`), sin dibujo propio: un
  fundido al color del fondo. La portada (`js/welcome.js`) y el túnel entran por
  ella; el cambio túnel / lista es un fundido en la misma página (`.vista-cambia`).
- **Ocultos**: `{ "project": "x", "visible": false }` en una lista: su página con
  `noindex`, fuera del índice, del túnel, del anterior/siguiente y del sitemap.
- **Cache**: `_headers` (Cloudflare; en GitHub Pages no se puede).

## Para desarrollo

```bash
npm run build          # genera dist/ en la raíz, como en Cloudflare
GITHUB_ACTIONS=true npm run build   # como en GitHub: /oriol-colomer/ y noindex
npm run media          # convierte lo que haya en projects/*/img/ (necesita: brew install ffmpeg webp)
npm run media -- --mp4 # lo mismo, y deja un mp4 de respaldo de cada video
```

Para ver la web en local, lo mismo que Oriol: Live Server.

### Qué es `dist/`

La web ya hecha: un HTML por página y por idioma, más las fotos, el CSS y el
JS copiados. La escribe `build/build.mjs` a partir de los JSON.

**No está en GitHub** (`.gitignore`) y no hace falta guardarla: cada push la
vuelve a hacer la Action (o Cloudflare) desde cero y la publica, y se puede rehacer igual
desde cualquier commit. Si aparece en tu carpeta es porque alguien ha lanzado
`npm run build` para probar; se puede borrar.

En otras webs nuestras no hay `dist/` porque el navegador lee el JSON y pinta la
página al vuelo. Aquí las páginas se hacen antes para que cada proyecto tenga su
dirección, con su título, su descripción y su imagen: es lo que lee Google y lo
que sale al compartir el enlace por WhatsApp.

### Qué genera

Una página por proyecto y por idioma:

```
/                            /es/                /ca/
/work/                       /es/work/           /ca/work/
/work/<slug>/                /es/work/<slug>/    /ca/work/<slug>/
/lab/                        /es/lab/            /ca/lab/
/lab/<slug>/                 /es/lab/<slug>/     /ca/lab/<slug>/
/about/                      /es/about/          /ca/about/
sitemap.xml   robots.txt     og/ (las imágenes para compartir)
```

El catalán iba antes en `/cat/`: esas direcciones siguen existiendo y llevan a
las de `/ca/`.

Cada una con su `<title>`, su `meta description`, su `og:image`, sus `hreflang`
a los otros dos idiomas y su JSON-LD. Por eso hay un slug por proyecto: es la
única manera de que cada trabajo tenga una dirección propia que Google pueda
indexar y que un cliente pueda compartir.

### Los archivos

```
data/site.json         listas, redes, textos  <- lo que edita Oriol
data/about.json        el about               <- lo que edita Oriol
projects/<slug>/       un proyecto: project.json + img/  <- lo que edita Oriol
index.html             la vista previa para Live Server (no se publica)
GUIA.md                para Oriol
TRASPASO.md            la lista para pasarle su copia
build/paginas.mjs      las plantillas: todo el HTML sale de aqui
build/build.mjs        las escribe en dist/ (Node, en la Action o en Cloudflare)
build/preview.mjs      las pinta en el navegador (vista previa)
build/media.mjs        fotos a WebP, videos a WebM, posters y miniaturas
css/style.css          toda la hoja de estilo
js/util.js             lo poco que comparten los guiones
js/bg.js               el fondo de puntos
js/welcome.js          la portada: el ojo
js/work.js             vista, orden y filtro de la lista
js/tunnel.js           el tunel y la linea del tiempo
js/media.js            videos del proyecto al verlos, YouTube, bloque de texto
js/correo.js           el boton del correo
js/ajustes.js          los botones de wingdings y de claro / oscuro, y el desplegable del idioma
js/transicion.js       la transición entre páginas, la de la casa (con css/transicion.css)
assets/cursor/         los cursores (32 px y @2x de 64 px)
```

### Una sola plantilla, dos sitios

`build/paginas.mjs` no toca el disco: lo que necesita saber —si un fichero existe,
cuánto mide una foto— se lo pasa quien lo llama. `build.mjs` le pasa el disco de
verdad. `preview.mjs` pregunta al servidor con peticiones `HEAD`: pinta una vez en
seco apuntando qué ficheros se consultan, los pregunta todos de golpe y repite
hasta que no hay preguntas nuevas. Después escribe la página con
`document.write`, de modo que los guiones corren igual que en la web publicada.
Los enlaces internos van a `?p=/ruta/`, porque Live Server solo tiene un
`index.html`.

Los 404 que salen en la consola de la vista previa son esas preguntas: ficheros
que podrían estar (el mp4 de respaldo, un poster) y no están. No son errores.

### Los ficheros de un vídeo

De `1.webm` el generador busca solo, al lado:

- `1.poster.webp` (o `.jpg`) — el fotograma que se ve antes de que cargue
- `1.mp4` — respaldo para iPhones anteriores a iOS 17.4, que no leen WebM. No se
  sube ninguno (sin él, esos iPhones ven el fotograma quieto), pero si se pone,
  se usa. `npm run media -- --mp4` los hace.

y de una foto de portada, `1.thumb.webp`: 720 px, lo que pintan el túnel y la
lista. Todo lo hace `npm run media`; si falta algo, se usa lo que hay y nunca se
rompe nada, solo pesa más.

`npm run media` usa los mismos ajustes que imgToWeb y videoToWeb (WebP calidad
85 hasta 2000 px; vídeo 1280×720 como mucho, con techo de 1200 kbps y sin audio),
pero con VP9 en lugar de VP8: videoToWeb usa VP8 porque VP9 se queda sin memoria
dentro del navegador, y con ffmpeg de verdad eso no pasa.

---

## El túnel

`js/tunnel.js`. `prof` es la posición de la cámara en el eje z, medida en
proyectos: el proyecto `i` está delante cuando `prof === i`. El 0 es el más
reciente.

Es el movimiento de la v0, que es el que se lee como túnel:

- **Cada carta tiene una x/y fija** y solo cambia su z, así que la perspectiva la
  lleva en línea recta desde el centro hacia fuera. (En una versión intermedia la
  x dependía del tamaño con que se veía la carta: al acercarse se iba al centro,
  chocaba con las otras y cambiaba de camino.)
- **Espiral de ángulo áureo**, con un giro al azar en cada visita: dos cartas
  seguidas quedan a 137° y ninguna cae en el centro, que es por donde pasa la
  siguiente.
- **La que dejas atrás pasa volando**: crece, se desenfoca mucho y se va. Las de
  delante se ven todas, más borrosas y con menos color cuanto más lejos.

Sin sombra: la profundidad la dicen el tamaño, el desenfoque y el color.

Toda la pantalla mueve la cámara (rueda, arrastre, flechas, `Inicio`/`Fin`); en el
teléfono un gesto rápido sigue un poco al soltar. Clicar una carta del fondo te
lleva hasta ella; la de delante entra al proyecto. La línea del tiempo coloca
cada proyecto en su fecha real; su pomo avanza con la cámara y se arrastra.

| perilla | qué hace |
|---|---|
| `SALTO` | distancia en z entre proyectos: menos = se ven más a la vez |
| `FONDO` | cuántos se ven hacia atrás (todos, hasta diez) |
| `DESENFOQUE` / `ESTELA` | desenfoque al fondo / de la que pasa volando |
| `DESATURA` | cuánto color pierde lo que no miras |
| `PERSIGUE` / `ENCAJA` | lo suave que sigue la cámara y que encaja al soltar |
| `INERCIA` | cuánto sigue un gesto rápido del dedo |

Las portadas en vídeo no van en un `<video>` dentro del 3D —Chrome lo deja gris—
sino copiadas fotograma a fotograma a un `<canvas>`, y solo mientras se ven.

---

## El peso

Una web de fotos y vídeo se va de peso sola, así que hay varias cosas que lo
sujetan:

- **Los vídeos no se bajan hasta que se ven.** Salen parados y con
  `preload="none"`; `js/media.js` los arranca al entrar en pantalla y los para
  al salir.
- **El reproductor de YouTube no se carga hasta que le das al play**: antes solo
  hay su fotograma. Son medio mega de guiones que no baja nadie que no lo mire.
- **No hay ficheros de fuente.** Helvetica es la del sistema: en Mac e iPhone es
  Helvetica de verdad; en Windows y Android sale Arial.
- **Todo en WebP y WebM**, y las portadas con miniatura de 720 px.

---

web: [meowrhino estudio](https://meowrhino.estudio)
