# oriol colomer — web

Sitio estático. **Lo que se sirve es HTML, CSS y JS y nada más**: cero framework,
cero librerías, cero JavaScript necesario para leer la página.

Node aparece en un único sitio: `build/build.mjs`, un script que lee los JSON y
escribe los HTML. No se ejecuta en el navegador de nadie — se ejecuta en GitHub
al hacer push. Oriol no instala nada.

---

## Para Oriol: cómo actualizar la web

Todo lo que cambia está en dos ficheros y una carpeta por proyecto:

```
data/site.json                 lo general: las listas de work y de lab (qué sale y
                               en qué orden), las redes, el correo, los textos
data/about.json                el texto del about, en los tres idiomas
projects/<slug>/project.json   un proyecto: su título, su texto, sus créditos…
projects/<slug>/img/           sus fotos y vídeos: 1.webp, 2.webm, 3.webp…
```

**Un proyecto, una carpeta**: todo lo de un proyecto está junto. Para copiarlo,
borrarlo o cambiarlo de nombre, se hace con su carpeta entera.

Se puede editar desde la web de GitHub (el lápiz) o con VS Code en tu ordenador.
En los dos casos, **al hacer commit en `main` la web se actualiza sola** en un par
de minutos. Con VS Code, además, lo ves antes de subirlo.

### La primera vez: preparar VS Code

Solo se hace una vez.

1. En VS Code: **Archivo → Nueva ventana**, y en la bienvenida, **Clonar repositorio
   Git…** → **Clonar desde GitHub**. Te pide entrar con tu cuenta de GitHub:
   acepta. Elige `oriol-colomer` y una carpeta de tu ordenador.
2. Al abrirla, VS Code te propone instalar **Live Server** (abajo a la derecha):
   **Instalar**. Si no sale, búscalo en la pestaña de extensiones (los cuatro
   cuadraditos de la izquierda).
3. Listo: abajo a la derecha aparece **Go Live**.

### Añadir un proyecto, paso a paso

1. **Elige el slug**: el nombre de la carpeta, que es también la dirección del
   proyecto, `/work/<slug>/`. Minúsculas, números y guiones, sin acentos ni
   espacios: `la-roda-ouineta`. **No lo cambies nunca** una vez publicado:
   rompe los enlaces que ya circulan.
2. **Copia la carpeta** de otro proyecto dentro de `projects/`, ponle el slug de
   nombre y vacía su `img/`.
3. **Prepara las fotos y los vídeos** (ver abajo) y mételos en `img/`: `1.webp`,
   `2.webm`, `2.poster.webp`… (ver "Qué va en la carpeta").
4. **Cambia los campos** de su `project.json` (ver la tabla).
5. **Ponlo en la lista**: en `data/site.json`, añade el slug a `lists` → `work`
   → `projects` (o a `lab`), donde quieras que salga: **el primero de la lista
   es el primero de la web**. Lo nuevo, arriba.
6. **Revísalo con la vista previa** (ver abajo) y **súbelo**.

Pasar un proyecto de lab a work es mover su slug de una lista a la otra (y su
dirección pasa de `/lab/<slug>/` a `/work/<slug>/`).

### Quitar un proyecto

- **Esconderlo** (se puede volver a sacar): quita su slug de la lista en
  `data/site.json`. Deja de salir en la web, pero su carpeta sigue ahí (y se
  puede ver en la vista previa). **No es privado**: el repositorio es público,
  así que el texto y las fotos se ven en GitHub, y las fotos también en la web
  si alguien adivina la dirección.
- **Quitarlo del todo**: quita su slug de la lista **y** borra su carpeta
  `projects/<slug>/`.

### Subir los cambios desde VS Code

Live Server solo enseña: no sube nada. Para publicar:

1. Pestaña **Control de código fuente**, a la izquierda (el icono de las tres
   bolitas unidas). Salen los ficheros que has tocado o añadido.
2. Escribe arriba qué has hecho (`proyecto nuevo: la roda`) y dale a **Confirmar**
   (*Commit*). Si pregunta si quieres añadir todos los cambios: **Sí**.
3. Dale a **Sincronizar cambios** (*Sync*). Eso lo sube a GitHub.
4. En un par de minutos está en la web. Si quieres verlo, en GitHub, pestaña
   **Actions**: la bolita amarilla es que está publicando y la verde que ya está.

**Antes de empezar a tocar**, dale también a **Sincronizar**: si has cambiado algo
desde la web de GitHub, así lo bajas y no se pisan.

### Los campos de un proyecto

El `project.json` de `projects/lechatelier-sala-apolo-2025/`:

```json
{
  "title": "LeChatelier @ Sala Apolo [2]",
  "date": "2025-10-23",
  "client": "LeChatelier",
  "tags": ["lx"],
  "subheader": { "en": "Lighting design & operation", "es": "…", "ca": "…" },
  "text": {
    "en": ["primer párrafo", "segundo párrafo"],
    "es": ["…"],
    "ca": ["…"]
  },
  "credits": [
    {"role": "lighting design", "name": "oriol colomer & clàudia aguiló"},
    {"role": "photography", "name": "@conamorirene"}
  ],
  "url": "https://youtu.be/…",
  "cover": ["thumb"],
  "photos": ["1", "2", "3"]
}
```

| campo | qué es |
|---|---|
| `title` | No se traduce. Sale tal cual. |
| `date` | `AAAA-MM-DD`. Sale en la ficha y coloca el proyecto en la línea del tiempo. El orden de la web lo da la lista de `site.json`. |
| `client` | Para quién. Se puede quitar. |
| `tags` | Las letras de siempre: `lx`, `vs`, `dc`, `xy`, `rs`. |
| `subheader` | La línea de debajo del título, en los tres idiomas. Si dejas `es` o `ca` vacíos, sale el inglés. |
| `text` | El texto, en los tres idiomas: una lista de párrafos, `["primero", "segundo"]`. |
| `credits` | Una línea por rol: `{"role": "…", "name": "…"}`. El rol sale en **negrita**. Los `@handle` se enlazan solos a Instagram. |
| `url` | Si es de **YouTube**, el vídeo sale embebido el primero, antes de las fotos. Si es otra cosa, sale como "Watch →". Se puede quitar. |
| `cover` | La portada del túnel y de la lista: `["thumb"]` si en `img/` hay un `thumb.webp` o `thumb.webm`. Puede ser una foto, un **webp animado** o un **vídeo**, y entonces se mueve. Sale con su proporción, sin recortar. Si no lo pones, se usa la primera de `photos`. |
| `photos` | Fotos y vídeos del proyecto, en orden, **por su número y sin extensión**: `"3"` es `img/3.webp` o `img/3.webm`, el que haya. También puede ir una **pieza interactiva** (ver abajo). |

Cuidado con las comas: entre campo y campo va una, y **después del último no**.
Si se te escapa una, la vista previa te dice en qué línea está.

### Preparar fotos y vídeos

Antes de subir nada, pásalo por los conversores. Funcionan en el navegador, no
suben nada a ningún sitio y dejan los ficheros con el peso justo para la web:

- **Fotos** → [imgToWeb](https://meowrhino.github.io/imgToWeb/), calidad **85 %**.
  Salen en WebP, ya numeradas (`1.webp`, `2.webp`…). Un GIF animado sale como
  WebP animado, que sirve de portada.
- **Vídeos** → [videoToWeb](https://meowrhino.github.io/videoToWeb/), preset **720p**,
  con las tres casillas marcadas: **fotograma**, **sin audio** y **numerar**. Ordena
  las tarjetas como quieras que salgan y dale a "descargar todo": el ZIP trae
  los vídeos numerados con su fotograma, listos para la carpeta. Se recuerdan,
  así que solo hay que marcarlas la primera vez.

**No subas GIF ni fotos de móvil sin convertir**: una foto de 5 MB tarda más en
cargar que todo el resto de la página y hunde el posicionamiento.

### Qué va en la carpeta de un proyecto, y con qué nombre

```
projects/la-roda-ouineta/
  project.json
  img/
    1.webm             un vídeo (de videoToWeb)
    1.poster.webp      su fotograma: el mismo número + .poster.webp
    2.webp             una foto (de imgToWeb)
    3.webp             otra foto
    thumb.webm         la portada, si quieres una distinta (opcional)
    thumb.poster.webp  su fotograma
```

- **Nombres**: `1`, `2`, `3`… sin cero delante, como salen de imgToWeb. En
  `photos` van sin la extensión: `["1", "2", "3"]`.
- **El fotograma de un vídeo** (`.poster.webp`) es lo que se ve mientras el vídeo
  carga, y lo que sale en el túnel si ese vídeo es la portada. Lo hace
  videoToWeb con la casilla "fotograma". Si no está, el vídeo funciona igual,
  pero hasta que carga hay un hueco.
- **Si numeras las fotos y los vídeos por separado** (imgToWeb y videoToWeb
  cuentan cada uno desde `1`), cambia el nombre a mano para que no se repita:
  un `1.webm` y un `1.webp` en la misma carpeta no pueden ir los dos en
  `photos` (el `"1"` sería la foto).
- **La portada** (`cover`) es opcional. Puede ser una foto (`thumb.webp`), un GIF
  pasado por imgToWeb (`thumb.webp`, animado) o un vídeo corto: 3–6 s en **480p**
  (`thumb.webm` y su `thumb.poster.webp`). En el túnel se ven todas las portadas a
  la vez y cada una pesa.
- **Los originales** (los `.mp4` y `.mov` de la cámara o de Premiere) **no van
  aquí**: se quedan en tu ordenador o en tu nube. La web solo usa el `.webm`.
- Los ficheros que acaban en `.thumb.webp` los hace meowrhino: son copias
  pequeñas para el túnel. No hace falta que los hagas tú; sin ellos se usa la
  imagen grande.

### Piezas interactivas (Unity, webs)

Una build de Unity WebGL o cualquier web hecha a mano se sube entera a una
subcarpeta de `img/` y se pone en `photos` la ruta de su `index.html`, esta vez
con la extensión. Suelen ir en la lista `lab` (`lab` sale en el menú en cuanto
hay uno). Ponle una portada (`cover`): la pieza no tiene fotograma, y sin ella
su carta sale gris.

```
projects/spacetime/img/web/index.html
projects/spacetime/img/web/Build/...
```
```json
"photos": ["web/index.html"]
```

En lab, la pieza arranca sola en un ordenador; en el móvil sale un play y solo
se carga al darle: una build de Unity son decenas de megas. Desde Unity, exporta con
*Publishing Settings → Compression Format: Brotli* y **"Decompression Fallback"
activado**: sin eso, GitHub Pages no sabe servir los `.br` y la build no arranca.

Cada vez que se sube una build nueva, la anterior se queda guardada para siempre
en el historial de git: unos 60 MB por versión. No pasa nada por unas pocas,
pero no la subas por cada cambio pequeño; junta varios.

### Ver los cambios antes de subirlos: Live Server

En VS Code, con la extensión **Live Server**: abre la carpeta del proyecto y dale
a **Go Live** (abajo a la derecha). Se abre la web entera, leyendo tus JSON tal
como están, y **se recarga sola cada vez que guardas**.

Si el JSON está roto (una coma, unas comillas), en vez de la web sale el error
con la línea donde mirar.

Para ver un borrador (una carpeta que aún no está en ninguna lista), entra en su dirección:
`http://127.0.0.1:5500/?p=/work/<slug>/`.

Lo que no cuadra (una foto que no está en su carpeta, una fecha mal escrita, un
slug de la lista sin carpeta, un proyecto en dos listas, **una foto de más de 1 MB o un
vídeo de más de 12 MB**, un GIF…) sale en GitHub, en la pestaña **Actions**, al
publicar.

### El resto: `data/site.json` y `data/about.json`

| campo | qué es |
|---|---|
| `lists` | Lo que sale en work y en lab, en este orden. Cada nombre es una carpeta de `projects/`. |
| `email` | El correo. En la web no va escrito: sale un botón "email" que lo enseña al clicarlo, para que no lo recojan los robots de spam. |
| `social` | Las redes del about, la dirección entera: `"https://github.com/…"`. El texto sale solo: `@usuario` en Instagram y el nombre de la web en las demás. |
| `autoEnter` | Segundos que espera la portada antes de entrar sola al túnel. `0` para que no entre sola. |
| `tagline` | La frase que sale en Google y al compartir el enlace. |
| `menu` | Los textos de los botones, en los tres idiomas. |

`data/about.json` es el texto del about: un párrafo por línea de la lista, en los tres idiomas.

### El fondo

Los puntos del fondo no son una imagen: se calculan. Cada punto lee la altura de
un terreno invisible —como un mapa de montañas— y crece o desaparece según ella.
El terreno se mueve: las cumbres nacen y se deshacen. Cada visita empieza en un
momento distinto, así que el paisaje nunca sale igual. Está en `js/bg.js`.

### Claro y oscuro

Junto a los idiomas (arriba a la derecha en work, al pie en el resto), el sol /
la luna cambia entre claro y oscuro, y se recuerda. Quien no la ha tocado nunca ve el que tenga puesto en su
ordenador o su móvil. Los colores de los dos están al principio de
`css/style.css` (`:root` el claro, `html.oscuro` el oscuro).

### Dominio propio

Cuando esté comprado (`oriolcolomerdelgado.com`, por ejemplo), en `site.json`:

```json
"url": "https://oriolcolomerdelgado.com",
"base": "",
"domain": "oriolcolomerdelgado.com"
```

y en el proveedor del dominio, los DNS apuntando a GitHub Pages (registros `A` a
`185.199.108.153`, `.109`, `.110` y `.111`, y `CNAME` de `www` a
`<tu-usuario>.github.io`). Después, en GitHub → Settings → Pages, el dominio y
"Enforce HTTPS". El build escribe el fichero `CNAME` solo.

### De quién es el repositorio

Todo lo que hace falta para que la web exista está dentro del repositorio: el
código, los JSON, las fotos y la receta para publicar
(`.github/workflows/deploy.yml`). No hay nada fuera. Quien tiene el repositorio
tiene la web. Cómo pasarle una copia a Oriol: [TRASPASO.md](TRASPASO.md).

---

## Para desarrollo

```bash
npm run build          # genera dist/ (lo mismo que hace GitHub al publicar)
npm run media          # convierte lo que haya en projects/*/img/ (necesita: brew install ffmpeg webp)
npm run media -- --mp4 # lo mismo, y deja un mp4 de respaldo de cada video
```

Para ver la web en local, lo mismo que Oriol: Live Server.

### Qué es `dist/`

La web ya hecha: un HTML por página y por idioma, más las fotos, el CSS y el
JS copiados. La escribe `build/build.mjs` a partir de los JSON.

**No está en GitHub** (`.gitignore`) y no hace falta guardarla: cada push la
vuelve a hacer GitHub Actions desde cero y la publica, y se puede rehacer igual
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
sitemap.xml   robots.txt     (CNAME si hay dominio)
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
build/paginas.mjs      las plantillas: todo el HTML sale de aqui
build/build.mjs        las escribe en dist/ (Node, en GitHub Actions)
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
