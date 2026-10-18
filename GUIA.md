# Guía de la web

La web de Oriol Colomer Delgado: work, lab y about, en tres idiomas.

> **Regla de oro: solo tocas `data/` y `projects/`.**
> Lo demás (build, css, js) es la maquinaria: no hace falta abrirlo.


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
de minutos: no hay que instalar nada para publicar. Con VS Code, además, lo ves
antes de subirlo.

## La primera vez: preparar VS Code

Solo se hace una vez.

1. En VS Code: **Archivo → Nueva ventana**, y en la bienvenida, **Clonar repositorio
   Git…** → **Clonar desde GitHub**. Te pide entrar con tu cuenta de GitHub:
   acepta. Elige `oriol-colomer` y una carpeta de tu ordenador.
2. Al abrirla, VS Code te propone instalar **Live Server** (abajo a la derecha):
   **Instalar**. Si no sale, búscalo en la pestaña de extensiones (los cuatro
   cuadraditos de la izquierda).
3. Listo: abajo a la derecha aparece **Go Live**.

## Añadir un proyecto, paso a paso

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

## Quitar un proyecto

- **Esconderlo** (se puede volver a sacar): quita su slug de la lista en
  `data/site.json`. Deja de salir en la web, pero su carpeta sigue ahí (y se
  puede ver en la vista previa). **No es privado**: el repositorio es público,
  así que el texto y las fotos se ven en GitHub, y las fotos también en la web
  si alguien adivina la dirección.
- **Esconderlo, pero poder mandarlo** a alguien: en la lista, en vez del slug,
  `{ "project": "la-roda-ouineta", "visible": false }`. Tiene su página
  (`/work/la-roda-ouineta/`), pero no sale en la lista, ni en el túnel, ni en
  Google. Para publicarlo, se vuelve a dejar solo el slug, en el mismo sitio.
- **Quitarlo del todo**: quita su slug de la lista **y** borra su carpeta
  `projects/<slug>/`.

## Subir los cambios desde VS Code

Live Server solo enseña: no sube nada. Para publicar:

1. Pestaña **Control de código fuente**, a la izquierda (el icono de las tres
   bolitas unidas). Salen los ficheros que has tocado o añadido.
2. Escribe arriba qué has hecho (`proyecto nuevo: la roda`) y dale a **Confirmar**
   (*Commit*). Si pregunta si quieres añadir todos los cambios: **Sí**.
3. Dale a **Sincronizar cambios** (*Sync*). Eso lo sube a GitHub.
4. En un par de minutos está en la web. En GitHub, al lado del último cambio, sale
   una bolita: amarilla es que está publicando, verde que ya está, roja que algo
   no cuadra (ver "Si sale en rojo", al final).

**Antes de empezar a tocar**, dale también a **Sincronizar**: si has cambiado algo
desde la web de GitHub, así lo bajas y no se pisan.

## Los campos de un proyecto

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

**VS Code te ayuda**: la primera línea de cada JSON (`"$schema": …`) le dice qué
campos hay. Al escribir unas comillas te propone los campos que faltan, al pasar
el ratón por uno te explica qué es, y lo que está mal (un campo mal escrito, una
fecha que no es `AAAA-MM-DD`) sale **subrayado en rojo**. No borres esa línea.

## Preparar fotos y vídeos

Antes de subir nada, pásalo por los conversores. Funcionan en el navegador, no
suben nada a ningún sitio y dejan los ficheros con el peso justo para la web:

- **Fotos** → [imgToWeb](https://meowrhino.github.io/imgToWeb/), calidad **85 %**.
  Salen en WebP, ya numeradas (`1.webp`, `2.webp`…). Un GIF animado sale como
  WebP animado, que sirve de portada. Si un día esa dirección no funciona, la
  misma herramienta está dentro de la web: abre `tools/imgToWeb/index.html` con
  doble clic, en Chrome o Firefox (en Safari no sale bien el WebP).
- **Vídeos** → [videoToWeb](https://meowrhino.github.io/videoToWeb/), preset **720p**,
  con las tres casillas marcadas: **fotograma**, **sin audio** y **numerar**. Ordena
  las tarjetas como quieras que salgan y dale a "descargar todo": el ZIP trae
  los vídeos numerados con su fotograma, listos para la carpeta. Se recuerdan,
  así que solo hay que marcarlas la primera vez.

**No subas GIF ni fotos de móvil sin convertir**: una foto de 5 MB tarda más en
cargar que todo el resto de la página y hunde el posicionamiento.

## Qué va en la carpeta de un proyecto, y con qué nombre

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
- Las copias pequeñas para el túnel y la lista las hace la web sola al
  publicar: en la carpeta solo van las fotos.

## Piezas interactivas (Unity, webs)

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
activado**: sin eso, el servidor no sabe servir los `.br` y la build no arranca.

Cada vez que se sube una build nueva, la anterior se queda guardada para siempre
en el historial de git: unos 60 MB por versión. No pasa nada por unas pocas,
pero no la subas por cada cambio pequeño; junta varios.

## Ver los cambios antes de subirlos: Live Server

En VS Code, con la extensión **Live Server**: abre la carpeta del proyecto y dale
a **Go Live** (abajo a la derecha). Se abre la web entera, leyendo tus JSON tal
como están, y **se recarga sola cada vez que guardas**.

Si el JSON está roto (una coma, unas comillas), en vez de la web sale el error
con la línea donde mirar.

Para ver un borrador (una carpeta que aún no está en ninguna lista), entra en su dirección:
`http://127.0.0.1:5500/?p=/work/<slug>/`.

Lo que no cuadra también sale aquí, antes de subir:

- **Lo que dejaría la web rota** (una foto de `photos` que no está en `img/`, un
  slug de la lista sin carpeta, un proyecto en dos listas): en vez de la página
  sale el error, en rojo. Así tampoco se publicaría: arréglalo antes de subir.
- **Lo que solo conviene mirar** (**una foto de más de 1 MB o un vídeo de más de
  12 MB**, un GIF, un texto que falta en inglés): una franja amarilla arriba de
  la página. La web se publica igual.

## El resto: `data/site.json` y `data/about.json`

| campo | qué es |
|---|---|
| `lists` | Lo que sale en work y en lab, en este orden. Cada nombre es una carpeta de `projects/`. |
| `email` | El correo. En la web no va escrito: sale un botón "email" que lo enseña al clicarlo, para que no lo recojan los robots de spam. |
| `social` | Las redes del about, la dirección entera: `"https://github.com/…"`. El texto sale solo: `@usuario` en Instagram y el nombre de la web en las demás. |
| `autoEnter` | Segundos que espera la portada antes de entrar sola al túnel. `0` para que no entre sola. |
| `tagline` | La frase que sale en Google y al compartir el enlace. |
| `url` | El dominio, cuando lo haya: `"https://oriolcolomerdelgado.com"`. Hasta entonces, `null`, y Google no la indexa. |
| `menu` | Los textos de los botones, en los tres idiomas. |

`data/about.json` es el texto del about: un párrafo por línea de la lista, en los tres idiomas.

## Qué sale en Google y al compartir

| dónde | de qué campo |
|---|---|
| el título de la portada, el about | `title` de `site.json` |
| el título de un proyecto | su `title` y su `subheader` |
| la frase de debajo, en Google | la portada: `tagline`; el about: su primer párrafo; un proyecto: el principio de su `text` (155 letras) |
| la imagen al compartir | un proyecto: su primera foto de `photos` (o el fotograma de su primer vídeo), recortada a 1200×630 al publicar; el resto: el ojo (`assets/og.jpg`) |

## El fondo

Los puntos del fondo no son una imagen: se calculan. Cada punto lee la altura de
un terreno invisible —como un mapa de montañas— y crece o desaparece según ella.
El terreno se mueve: las cumbres nacen y se deshacen. Cada visita empieza en un
momento distinto, así que el paisaje nunca sale igual. Está en `js/bg.js`.

## Claro y oscuro

Junto a los idiomas (arriba a la derecha en work, al pie en el resto), el sol /
la luna cambia entre claro y oscuro, y se recuerda. Quien no la ha tocado nunca ve el que tenga puesto en su
ordenador o su móvil. Los colores de los dos están al principio de
`css/style.css` (`:root` el claro, `html.oscuro` el oscuro).

## Si sale en rojo

La web no se rompe: se queda como estaba hasta que se arregla. Clica la bolita
roja, luego **Details**, y lee el último mensaje, que dice el fichero y qué pasa:

- **"projects/la-roda-ouineta/project.json no es un JSON valido (linea 12, columna 5)"**
  → casi siempre **una coma** de más o de menos, o unas comillas sin cerrar, cerca
  de esa línea. Live Server te lo dice igual, antes de subir.
- **"projects/la-roda-ouineta/project.json: "cliente" no es un campo de aquí (¿mal
  escrito?)"**, **"falta "title""**, **""date": "23/10/2025" no tiene la forma que
  toca"** → lo mismo que VS Code subraya en rojo: un campo mal escrito, uno que
  falta o uno escrito de otra manera. Dice el campo y, entre paréntesis, cómo va.

- **"✗ la-roda-ouineta: "5": no hay ningun 5.webp … en projects/la-roda-ouineta/img/"**
  → en `photos` hay una foto que no está en `img/` (o con otro número). Ponla, o
  quítala de la lista.

Los avisos con ⚠ no paran nada: solo dicen que algo quizá no es como querías
(una foto que pesa demasiado, un GIF, un texto que falta en un idioma).
