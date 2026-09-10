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
build/gif2mp4.sh       GIF -> MP4
build/optimize-images.sh  PNG -> JPG
build/serve.mjs        servidor local
css/style.css          toda la hoja de estilo
js/eye.js              la pupila sigue al cursor
js/work.js             filtro, orden y miniatura del índice
media/<slug>/          fotos y vídeos
```

---

web: [meowrhino estudio](https://meowrhino.estudio)
