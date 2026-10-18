/* ============================================================
   paginas.mjs — las plantillas del sitio.
   ------------------------------------------------------------
   Todo el HTML sale de aqui, y lo usan dos sitios:

     build/build.mjs    en Node, al publicar: escribe dist/
     build/preview.mjs  en el navegador, con Live Server: pinta
                        la pagina al vuelo leyendo los JSON

   Por eso este fichero no importa nada ni toca el disco. Lo que
   necesita saber del disco —si un fichero existe, cuanto mide una
   foto— se lo pasa quien lo llama. Asi la vista previa es la web
   de verdad y no una copia que se pueda quedar atras.
   ============================================================ */

/* ---------- utilidades que no dependen del sitio ---------- */
export const esc = s => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export const esVideo = m => /\.(mp4|webm)$/i.test(m);
/** Una pieza interactiva (una build de Unity, una web): va en un iframe. */
export const esPieza = m => /\.html?$/i.test(m);

/** Lee un JSON y, si esta mal, dice donde. El error de JSON.parse da una
    posicion en caracteres ("at position 1432"), que para quien edita el
    fichero a mano no significa nada: se traduce a linea y columna. */
export function leerJSON(texto, nombre) {
  try { return JSON.parse(texto); }
  catch (e) {
    const m = /position (\d+)/.exec(e.message);
    let donde = '';
    const lc = /line (\d+) column (\d+)/.exec(e.message);
    if (lc) donde = ` (linea ${lc[1]}, columna ${lc[2]})`;
    else if (m) {
      const antes = texto.slice(0, +m[1]).split('\n');
      donde = ` (linea ${antes.length}, columna ${antes.at(-1).length + 1})`;
    } else {
      // una coma de mas ("Unexpected token ']'") no trae posicion: se busca la coma
      const coma = /,\s*[\]}]/.exec(texto);
      if (coma) donde = ` (linea ${texto.slice(0, coma.index).split('\n').length}: sobra la coma del final)`;
    }
    const err = new Error(`${nombre} no es un JSON valido${donde}. Suele ser una coma de mas `
      + `o de menos, o unas comillas sin cerrar. Detalle: ${e.message}`);
    err.json = true;
    throw err;
  }
}

/** Lo que dice schema/<tipo>.json, comprobado tambien aqui: lo que VS Code
    subraya en rojo, el build lo para y la vista previa lo ensena. Solo lo que
    usan esos esquemas (type, enum, pattern, required, properties,
    additionalProperties, items, maxItems, minimum, anyOf y $ref a sus $defs):
    cuarenta lineas en vez de una dependencia. Devuelve los errores, en
    castellano, o [] si esta bien. */
export function validar(dato, esquema, fichero) {
  const TIPO = { string: 'un texto entre comillas', number: 'un número', boolean: 'true o false',
                 array: 'una lista [ … ]', object: 'un bloque { … }', null: 'null' };
  const tipo = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  // un $ref lleva a su $defs; lo de al lado (la description) manda
  const def = s => (s.$ref ? { ...esquema.$defs[s.$ref.split('/').pop()], ...s, $ref: undefined } : s);
  const tipoOk = (v, s) => !s.type || [].concat(s.type).includes(tipo(v));
  function mirar(v, s, camino) {
    s = def(s);
    const donde = camino.length ? `"${camino.join(' → ')}"` : 'el fichero';
    const pista = s.description ? ` (${s.description})` : '';
    if (s.anyOf) {
      const opciones = s.anyOf.map(def);
      if (opciones.some(o => !mirar(v, o, camino).length)) return [];
      const suya = opciones.find(o => tipoOk(v, o));
      return suya ? mirar(v, suya, camino) : [`${donde} no vale así${pista}`];
    }
    if (!tipoOk(v, s)) return [`${donde} tiene que ser ${[].concat(s.type).map(t => TIPO[t]).join(' o ')}${pista}`];
    const e = [];
    if (s.enum && !s.enum.includes(v)) e.push(`${donde}: "${v}" no vale; tiene que ser ${s.enum.map(x => `"${x}"`).join(', ')}`);
    if (s.pattern && typeof v === 'string' && !new RegExp(s.pattern).test(v)) e.push(`${donde}: "${v}" no tiene la forma que toca${pista}`);
    if (s.minimum != null && typeof v === 'number' && v < s.minimum) e.push(`${donde} tiene que ser ${s.minimum} o más`);
    if (Array.isArray(v)) {
      if (s.maxItems != null && v.length > s.maxItems) e.push(`${donde}: como mucho ${s.maxItems}`);
      if (s.items) v.forEach((x, i) => e.push(...mirar(x, s.items, [...camino, String(i + 1)])));
    } else if (tipo(v) === 'object') {
      for (const r of s.required || []) if (!(r in v)) e.push(`falta "${r}"${camino.length ? ` en ${donde}` : ''}`);
      for (const [k, x] of Object.entries(v)) {
        if (s.properties?.[k]) e.push(...mirar(x, s.properties[k], [...camino, k]));
        else if (typeof s.additionalProperties === 'object') e.push(...mirar(x, s.additionalProperties, [...camino, k]));
        else if (s.additionalProperties === false) {
          const hay = Object.keys(s.properties || {}).filter(p => p !== '$schema' && p !== '_');
          e.push(`"${[...camino, k].join(' → ')}" no es un campo de aquí (¿mal escrito?). Los que hay: ${hay.join(', ')}`);
        }
      }
    }
    return e;
  }
  return mirar(dato, esquema, []).map(m => `${fichero}: ${m}`);
}

/** Las extensiones que puede tener un fichero que en el JSON va sin ella
    ("3" -> 3.webp, 3.webm...), en el orden en que se buscan. */
export const EXTS = ['webp', 'webm', 'mp4', 'jpg', 'jpeg', 'png', 'gif'];

/** En el JSON un fichero va por su nombre sin extension ("3", "thumb"), y se
    busca en projects/<slug>/img/: el primero de EXTS que exista, o .webp si no
    hay ninguno (y la revision avisa). Una pieza interactiva va con su ruta
    dentro de img/ ("web/index.html"). Lo usan las plantillas y build/media.mjs. */
export const enCarpeta = (p, m, existe) => {
  const s = `projects/${p.slug}/img/${String(m).trim().replace(/^\/+/, '')}`;
  if (/\.[a-z0-9]+$/i.test(s)) return s;
  return EXTS.map(e => `${s}.${e}`).find(existe) || `${s}.webp`;
};

/** Cada proyecto es el project.json de su carpeta, con el nombre de la
    carpeta como slug. Las listas de site.json dicen cuales salen y en que
    seccion: lo que esta en "lab" sale en /lab/, lo de "work" en /work/, y lo
    que no esta en ninguna es un borrador. Uno oculto,
    { "project": "slug", "visible": false }, tiene su pagina (para mandarla en
    privado), con noindex y fuera del indice, del tunel y del sitemap. */
export const entradas = lista => (Array.isArray(lista?.projects) ? lista.projects : []).map(e =>
  e && typeof e === 'object' ? { slug: e.project, visible: e.visible !== false } : { slug: e, visible: true });
export function juntar(site, proyectos) {
  const de = (n, slug) => entradas(site.lists?.[n]).find(e => e.slug === slug);
  return proyectos.map(p => {
    const e = de('work', p.slug) || de('lab', p.slug);
    return { ...p, lab: !!de('lab', p.slug), published: !!e, oculto: !!e && !e.visible };
  });
}

/** El id de un video de YouTube a partir de cualquiera de sus enlaces:
    youtu.be/ID, watch?v=ID, embed/ID, shorts/ID, live/ID. */
export const youtube = link => (/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/
  .exec(String(link || '')) || [])[1] || null;

/* ============================================================
   crearSitio — todo lo que depende de los datos
   ------------------------------------------------------------
   opciones:
     site, about       data/site.json y data/about.json
     proyectos         los de projects/, ya pasados por juntar()
     base              subcarpeta en la que se sirve ('' o '/oriol-colomer')
     origen            el dominio de las direcciones publicas (canonical, og),
                       sin barra final; '' si aun no hay
     indexar           si Google la puede indexar (no en github.io ni sin dominio)
     og(ruta)          la imagen para compartir (1200x630) hecha de esa foto,
                       o null: entonces se comparte la foto tal cual
     existe(ruta)      true si ese fichero esta en el repo
     medidas(ruta)     { w, h } de una imagen, o null
     peso(ruta)        bytes de un fichero, o null (para avisar de lo pesado)
     miniaturaYT(id)   la ruta de la miniatura de YouTube bajada al publicar,
                       o null: entonces se pide a YouTube
     preview           true en la vista previa: los enlaces internos van
                       a ?p=/ruta/ en vez de a /ruta/, porque Live Server
                       solo tiene un index.html y el resto lo pinta el js
   ============================================================ */
export function crearSitio({ site, about, proyectos, base = '', origen = '', indexar: INDEXAR = false,
                             existe = () => false, medidas = () => null, peso = () => null,
                             miniaturaYT = () => null, og = () => null, preview = false }) {
  const LANGS = site.langs;
  const DEF   = site.lang;
  const B     = String(base).replace(/\/$/, '');

  /* Dos secciones: work (tunel, lista y una pagina por proyecto) y lab
     (experimentos, piezas interactivas: lista y pagina, sin tunel). El orden
     de todo el sitio —indice, tunel, anterior/siguiente y sitemap— es el de
     su lista en site.json. */
  const enLista = (n, visible = true) => entradas(site.lists?.[n]).filter(e => e.visible === visible)
    .map(e => proyectos.find(p => p.slug === e.slug)).filter(Boolean);
  const live = enLista('work');
  const labs = enLista('lab');
  const ocultos = [...enLista('work', false), ...enLista('lab', false)];
  const de   = sec => (sec === 'lab' ? labs : live);
  /** La seccion de un proyecto y su direccion: work/<slug>/ o lab/<slug>/ */
  const secDe = p => (p.lab ? 'lab' : 'work');
  const dir   = p => `${secDe(p)}/${p.slug}/`;

  /* ---------- rutas ---------- */
  const raiz = p => B + (p.startsWith('/') ? p : '/' + p);
  // prefijo de idioma: el idioma por defecto vive en la raiz, los otros en /es/ y /cat/
  const pre  = l => (l === DEF ? '' : `/${l}`);
  /** La ruta limpia de una pagina: /es/work/slug/ */
  const ruta = (l, path = '') => `${pre(l)}/${path}`.replace(/\/{2,}/g, '/');
  /** A donde apuntan los enlaces. En la vista previa, al index con ?p= */
  const url  = (l, path = '') => preview ? `${B}/?p=${ruta(l, path)}` : B + ruta(l, path);
  /** La direccion publica, para canonical, hreflang, og, sitemap y robots. */
  const publica = p => origen + raiz(p);
  const abs  = (l, path = '') => publica(ruta(l, path));
  const absFichero = rel => publica('/' + rel);
  /** Un fichero del repo en un atributo: src, href, poster... */
  const src = f => raiz('/' + esc(f));

  /** Un fichero de un proyecto, con su extension. */
  const fichero = (p, m) => enCarpeta(p, m, existe);
  /** Un texto en un idioma, o en el del sitio si falta. Un texto que es
      igual en todos los idiomas puede ir sin ellos: "Make up & hair". */
  const t = (obj, l) => typeof obj === 'string' ? obj : (obj && (obj[l] || obj[DEF])) || '';

  /* ---------- formato ---------- */
  /* Mismo formato en los tres idiomas, como la ficha original. */
  const fmtDate = iso => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  /** El titulo lleva la @ en un span para poder darle su propio gris. */
  const titleHtml = tt => esc(tt).replace(/\s@\s/, ' <span class="at">@</span> ');
  /** 155 caracteres limpios para la meta description. */
  const metaDesc = txt => {
    const flat = String(txt).replace(/\s+/g, ' ').trim();
    return flat.length <= 155 ? flat : flat.slice(0, 152).replace(/\s+\S*$/, '') + '…';
  };
  const igUrl = h => `https://instagram.com/${h.replace(/^@/, '')}`;
  /** Los @handle del texto de creditos se enlazan solos a Instagram. */
  const linkHandles = txt => esc(txt).replace(/@[\w.\-_]+/g,
    h => `<a href="${igUrl(h)}" target="_blank" rel="noopener">${h}</a>`);

  /* ---------- media ---------- */
  /** Fotograma de un video, para el poster: webp si lo hay, si no jpg. */
  const sinExt = m => m.replace(/\.(mp4|webm)$/i, '');
  const poster = m => {
    const base = sinExt(m);
    return [`${base}.poster.webp`, `${base}.poster.jpg`].find(existe) || null;
  };
  /** El gemelo de un video en el otro formato, si esta. El webm va primero
      —pesa menos—, y el mp4 de respaldo para los navegadores sin webm. */
  const fuentes = m => {
    const base = sinExt(m);
    return [`${base}.webm`, `${base}.mp4`].filter(f => f === m || existe(f));
  };
  /** La version chica de una imagen, si la hay (la hace npm run media).
      Donde se usa la portada —la carta del tunel y la vista previa de la
      lista— se pinta a 360 px como mucho. Si no hay, el original. */
  const chica = m => {
    const th = m.replace(/\.(jpe?g|png|webp)$/i, '.thumb.webp');
    return th !== m && existe(th) ? th : m;
  };

  /** La portada de un proyecto en el tunel y en la lista:
      { img, video } — img es una imagen fija (puede ser un webp animado)
      y video, si la portada se mueve, la lista de fuentes.

      Si el JSON trae "cover", esa, sea foto, webp animado o video. Si no,
      el primer fichero de media; si es un video, su poster, que pesa poco:
      un video por carta en el tunel serian megas. Quien quiera que se
      mueva pone un "cover" corto y chico. */
  const cover = p => {
    if (p.cover?.length) {
      const th = fichero(p, p.cover[0]);
      if (!esVideo(th)) return { img: chica(th), video: null };
      const pj = poster(th);
      return { img: pj ? chica(pj) : '', video: fuentes(th) };
    }
    const todo = (p.photos || []).map(x => fichero(p, x)).filter(x => !esPieza(x));
    const m = todo[0];
    if (!m) return null;
    if (!esVideo(m)) return { img: chica(m), video: null };
    const pj = poster(m);
    if (pj) return { img: chica(pj), video: null };
    const foto = todo.find(x => !esVideo(x));
    return foto ? { img: chica(foto), video: null } : null;
  };
  /** La tarjeta del sitio (el ojo, 1200x630): la que sale al compartir la
      portada, el about y lo que no tiene imagen propia. */
  const OG = 'assets/og.jpg';
  /** La imagen con la que se comparte un proyecto: la primera foto, o el
      poster de un video, o su portada, pasada a 1200x630 por el build (og/,
      con sharp). Si no la ha hecho, la foto tal cual; WhatsApp se salta la
      vista previa si pesa mas de 300 KB: entonces va la version chica. */
  const ogImage = p => {
    if (!p) return OG;
    const m = (p.photos || []).map(x => fichero(p, x)).filter(x => !esPieza(x));
    const f = m.find(x => !esVideo(x)) || m.map(poster).find(Boolean) || cover(p)?.img;
    if (!f) return OG;
    return og(f) || (existe(f) && peso(f) > 300 * 1024 ? chica(f) : f);
  };

  /** Un item de media: imagen, o video en bucle mudo sin controles.
      El video sale parado y sin pedir nada: lo arranca js/media.js cuando
      entra en pantalla. Con autoplay se bajaban todos de golpe. */
  const mediaTag = (m, p, sub, i) => {
    const label = `${esc(p.title)} — ${esc(sub)}`;
    /* Una pieza interactiva no se carga sola: una build de Unity son decenas
       de megas. Sale un marco con un play, y el iframe llega al darle
       (js/media.js). Sin JavaScript, el play abre la pieza a pantalla entera. */
    if (esPieza(m)) {
      const fondo = cover(p)?.img;
      return `<a class="pieza" href="${src(m)}" target="_blank" rel="noopener"
        data-pieza="${src(m)}" aria-label="play: ${esc(p.title)}"${
        fondo ? ` style="background-image:url('${src(fondo)}')"` : ''}>
        <span class="play" aria-hidden="true"></span></a>`;
    }
    if (!esVideo(m)) {
      const d = medidas(m);
      return `<img src="${src(m)}" alt="${label}"
      ${d ? `width="${d.w}" height="${d.h}"` : ''}
      loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">`;
    }
    const pj = poster(m);
    // El video tambien deja hueco: sus medidas son las del poster.
    const d = pj ? medidas(pj) : null;
    return `<video muted loop playsinline preload="none"
      ${pj ? `poster="${src(pj)}"` : ''}
      ${d ? `width="${d.w}" height="${d.h}"` : ''}
      aria-label="${label}">`
      + fuentes(m).map(f =>
          `<source src="${src(f)}" type="video/${f.endsWith('.webm') ? 'webm' : 'mp4'}">`).join('')
      + `</video>`;
  };

  /* ---------- parciales ---------- */
  /* Velocidad del fondo dentro del sitio. La portada va a 1: es lo unico
     que hay en pantalla. Dentro, el fondo es el telon del trabajo. */
  const DENTRO = 0.38;

  /* El favicon es la bola: la misma pieza que la pupila y el pomo de la
     linea del tiempo, con su luz arriba a la izquierda. */
  const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs>`
    + `<radialGradient id='b' cx='.34' cy='.3' r='.8'><stop offset='0' stop-color='#fff'/>`
    + `<stop offset='.82' stop-color='#7d7d7d'/></radialGradient></defs>`
    + `<circle cx='32' cy='32' r='24' fill='url(#b)'/></svg>`);

  /** El correo no va escrito en el HTML: va del reves y en base64, y lo
      monta js/correo.js al clicar. Los robots que buscan correos leen el
      HTML, no lo ejecutan. */
  const cifrado = mail => btoa(String.fromCharCode(
    ...new TextEncoder().encode([...String(mail)].reverse().join(''))));
  const correo = (lang, clase = '') => site.email
    ? `<button type="button" class="correo ${clase}" data-c="${cifrado(site.email)}">${esc(t(site.menu.mail, lang))}</button>`
    + `<noscript>${esc(site.email.replace('@', ' [at] '))}</noscript>`
    : '';
  /** El texto de cada red sale de su direccion: @usuario en Instagram, y en
      las demas el nombre de la web (github, soundcloud...). */
  const etiqueta = u => {
    const { hostname, pathname } = new URL(u);
    const h = hostname.replace(/^www\./, '');
    return h === 'instagram.com' ? '@' + pathname.replace(/\//g, '') : h.split('.')[0];
  };
  const redes = () => (site.social || []).map(u =>
    `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(etiqueta(u))}</a>`).join('\n     ');

  /* La transicion entre paginas, la de la casa (JAMstack, patrones.md §6c),
     copiada tal cual de almarbra: js/transicion.js y css/transicion.css, y
     este script, que tapa la pagina antes de pintar si se llega desde otra de
     la web. Sin dibujo propio (window.dibujo): un fundido al color del fondo. */
  const headScript = `<script>{
const html = document.documentElement;
html.classList.add('js');
let back = false;
try {
  const d = JSON.parse(sessionStorage.getItem('transicion'));
  back = !d && performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (d?.carga) html.style.setProperty('--carga', d.carga);   // el color del loader, del dibujo
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && (back || d)) html.classList.add('tapada');
} catch {}
window.revelada = ${preview ? 'false' : "'onpagereveal' in window"} ? new Promise((done) => addEventListener('pagereveal', (e) => {
  const vt = e.viewTransition;
  if (vt && back && html.classList.contains('tapada')) { html.classList.add('tapando'); done(vt); }
  else { vt?.ready.catch(() => {}); vt?.skipTransition(); done(null); }   // saltarla rechaza ready: sin error en la consola
}, { once: true })) : Promise.resolve(null);
}</script>`;

  /* En github.io o sin dominio, noindex: la web aun es de prueba. Los
     proyectos ocultos, siempre. */
  function head({ lang, title, desc, path, image, jsonld, vel, entrar, vista, auto, indexar = INDEXAR }) {
    const alts = LANGS.map(l =>
      `<link rel="alternate" hreflang="${l}" href="${abs(l, path)}">`
    ).join('\n  ');
    // las medidas dejan pintar la vista previa sin esperar a bajar la imagen
    const dim = image?.startsWith('og/') ? { w: 1200, h: 630 } : image && medidas(image);
    return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">${indexar ? '' : '\n  <meta name="robots" content="noindex">'}
  <link rel="canonical" href="${abs(lang, path)}">
  ${alts}
  <link rel="alternate" hreflang="x-default" href="${abs(DEF, path)}">
  <meta property="og:type" content="${/^(work|lab)\/.+/.test(path) ? 'article' : 'website'}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${abs(lang, path)}">
  <meta property="og:site_name" content="${esc(site.short)}">
  <meta property="og:locale" content="${lang === 'ca' ? 'ca_ES' : lang === 'es' ? 'es_ES' : 'en_GB'}">
  ${image ? `<meta property="og:image" content="${absFichero(image)}">` : ''}
  ${dim ? `<meta property="og:image:width" content="${dim.w}">\n  <meta property="og:image:height" content="${dim.h}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#151515" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${FAVICON}">
  ${headScript}
  <link rel="stylesheet" href="${raiz('/css/transicion.css')}">
  <link rel="stylesheet" href="${raiz('/css/style.css')}">
  <script src="${raiz('/js/transicion.js')}" defer></script>
  <!-- La letra (normal o wingdings) y el tema (claro u oscuro) se aplican
       antes de pintar nada, para que no parpadee al cargar. El tema, si nunca
       se ha tocado el boton, es el del sistema. Los botones: js/ajustes.js. -->
  <script>try{var s=localStorage,h=document.documentElement.classList,t=s.getItem('tema');if(s.getItem('tipo')==='wingdings')h.add('wingdings');if(t?t==='oscuro':matchMedia('(prefers-color-scheme: dark)').matches)h.add('oscuro')}catch(e){}</script>
  ${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body${entrar ? ` data-entrar="${entrar}"` : ''}${auto ? ` data-auto="${auto}"` : ''}${vista ? ` data-vista="${vista}"` : ''}>
<!-- El fondo se mueve en todas las paginas; la velocidad es lo unico que
     cambia entre la portada y el resto. -->
<canvas class="dots" id="bg" data-vel="${vel ?? DENTRO}" aria-hidden="true"></canvas>
<script type="module" src="${raiz('/js/bg.js')}"></script>
<script type="module" src="${raiz('/js/ajustes.js')}"></script>`;
  }

  /** La barra de arriba. Dentro de un proyecto, su nombre ocupa el sitio
      de "work" —se ve donde estas— y al clicarlo vuelves a work. */
  /* Las secciones. Se llaman igual en los tres idiomas; lab solo sale
     cuando hay algo en la lista "lab" de site.json. */
  const SECCIONES = [['home', ''], ['work', 'work/'], ['about', 'about/'], ['lab', 'lab/']];
  function nav(lang, current, proyecto = null) {
    const item = ([id, path]) => {
      const href = url(lang, path);
      if (proyecto && id === current)
        return `<a class="aqui" href="${href}" aria-current="page" title="${id}">${esc(proyecto.title)}</a>`;
      return id === current
        ? `<a href="${href}" data-t="${id}" aria-current="page">${id}</a>`
        : `<a href="${href}" data-t="${id}">${id}</a>`;
    };
    return `<nav class="nav nav--inline">`
         + SECCIONES.filter(([id]) => id !== 'lab' || labs.length).map(item).join('<span class="sep">/</span>')
         + `</nav>`;
  }

  /** El video del enlace, primero del carrusel. No es el reproductor de
      YouTube todavia: es su fotograma con un boton de play. El reproductor
      (medio mega de guiones de Google) solo se carga al darle, y desde
      youtube-nocookie. Sin JavaScript el boton es un enlace a YouTube.
      El fotograma lo baja el build y se sirve desde aqui: abrir la pagina
      no le pide nada a Google. En la vista previa, de YouTube. */
  const embed = (id, p, lang) => `      <figure class="embed">
        <a class="yt" href="${esc(p.url)}" target="_blank" rel="noopener" data-yt="${id}"
           aria-label="${esc(t(site.menu.watch, lang))}: ${esc(p.title)}">
          ${miniaturaYT(id) ? `<img src="${src(miniaturaYT(id))}" alt="" decoding="async">`
          : `<img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt="" decoding="async"
               onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${id}/hqdefault.jpg'">`}
          <span class="play" aria-hidden="true"></span>
        </a>
      </figure>`;

  function langs(lang, path) {
    const sig = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
    return `<nav class="langs" aria-label="${esc(t(site.menu.aria.lang, lang))}">`
      // claro u oscuro: sol y luna, uno encima del otro. Escondido hasta que
      // hay JS que lo mueva
      + `<button type="button" class="tema" aria-pressed="false" title="${esc(t(site.menu.tema, lang))}" hidden>`
      + `<span class="ico sol" aria-hidden="true"></span><span class="ico luna" aria-hidden="true"></span>`
      + `<span class="sr">${esc(t(site.menu.tema, lang))}</span></button>`
      // letra normal o wingdings. Sale escondido: js/ajustes.js lo ensena solo si
      // el aparato tiene la fuente (Windows y Mac si, moviles no).
      // Apagado, un ojo; encendido, la mano
      + `<button type="button" class="tipo" aria-pressed="false" title="${esc(t(site.menu.tipo, lang))}" hidden>`
      + `<span class="ico ojo" aria-hidden="true"></span><span class="ico mano" aria-hidden="true"></span>`
      + `<span class="sr">${esc(t(site.menu.tipo, lang))}</span></button>`
      // el idioma: dice el actual y al pulsar pasa al siguiente de los tres
      + `<a class="idioma" href="${url(sig, path)}" hreflang="${sig}" title="${esc(t(site.menu.aria.lang, lang))}: ${sig}">${lang}</a>`
      + `</nav>`;
  }

  const sig = () =>
    `<p class="sig">${esc(site.credit.label)}: `
    + `<a href="${site.credit.url}" target="_blank" rel="noopener">${esc(site.credit.name)}</a></p>`;

  const foot = () => `</body>\n</html>\n`;

  /* ---------- paginas ---------- */
  function landing(lang) {
    return head({
      lang, path: '', vel: 1, entrar: url(lang, 'work/'), auto: site.autoEnter,
      title: `${site.title} — ${t(site.tagline, lang)}`,
      desc: t(site.tagline, lang),
      image: OG,
      jsonld: {
        '@context':'https://schema.org', '@type':'Person',
        name: site.title, url: abs(lang),
        jobTitle: t(site.tagline, lang),
        sameAs: (site.social || []),
        address: { '@type':'PostalAddress', addressLocality:'Barcelona', addressCountry:'ES' },
      },
    })
    + `<main class="landing">
  <!-- Un enlace de verdad: sin JavaScript tambien se entra, y Google y los
       lectores de pantalla tienen algo que seguir. El parpadeo: welcome.js -->
  <a class="hero" href="${url(lang, 'work/')}">
    <div class="eye" id="eye">
      <div class="lens">
        <span class="shape" aria-hidden="true"></span>
        <span class="pupil" id="pupil" aria-hidden="true"></span>
      </div>
      <h1 class="name">${esc(site.title)}</h1>
    </div>
  </a>
  ${langs(lang, '')}
</main>
<script type="module" src="${raiz('/js/welcome.js')}"></script>`
    + foot();
  }

  /** El indice de una seccion: el tunel y la lista (lab, solo la lista). */
  function indice(lang, sec) {
    const items = de(sec);
    /* Lab es un parque: todo a la vista y a mano, sin tunel. De momento,
       la lista con la portada de cada pieza al lado. */
    const tunel = sec !== 'lab';
    const tags = [...new Set(items.flatMap(p => p.tags || []))];

    // La lista va en el HTML siempre: es lo que lee Google y lo que queda si
    // no corre JavaScript. El tunel se construye leyendo esta misma lista.
    const rows = items.map(p => {
      const portada = cover(p);
      // la proporcion de la portada: el tunel y la miniatura la respetan
      const d = portada?.img ? medidas(portada.img) : null;
      return `      <li data-tags="${esc((p.tags || []).join(' '))}"
          data-date="${esc(p.date)}" data-client="${esc(String(p.client || '').toLowerCase())}" data-title="${esc(String(p.title).toLowerCase())}">
        <a href="${url(lang, dir(p))}"${portada?.img ? ` data-peek="${src(portada.img)}"` : ''}${
          d ? ` data-ratio="${(d.w / d.h).toFixed(4)}"` : ''}${
          portada?.video ? ` data-peek-video="${portada.video.map(src).join('|')}"` : ''}>
${tunel ? '' : `          <span class="mini">${portada?.img ? `<img src="${src(portada.img)}" alt=""${
            d ? ` width="${d.w}" height="${d.h}"` : ''} loading="lazy" decoding="async">` : ''}</span>\n`}          <span class="t">${titleHtml(p.title)}<small>${esc(t(p.subheader, lang))}</small></span>
          <span class="c">${esc(fmtDate(p.date))}</span>
          <span class="g">${esc((p.tags || []).join(' '))}</span>
        </a>
      </li>`;
    }).join('\n');

    /** Menu desplegable. El boton ensena el valor puesto; al abrirlo salen
        todas las opciones, incluida la activa, que va marcada. */
    const menu = (id, etiqueta, opciones) => `      <div class="menu" data-menu="${id}">
        <button type="button" class="cabeza" aria-expanded="false">
          <span class="et">${esc(etiqueta)}</span><span class="val"></span>
        </button>
        <div class="opciones" hidden>
${opciones.map(([v, l], i) => `          <button type="button" data-v="${esc(v)}"
            aria-pressed="${i === 0}">${esc(l)}</button>`).join('\n')}
        </div>
      </div>`;

    const orden  = [['date', t(site.menu.byDate, lang)], ['client', t(site.menu.byClient, lang)],
                    ['title', t(site.menu.byTitle, lang)]];
    const filtro = [['', t(site.menu.all, lang)], ...tags.map(g => [g, g])];

    return head({
      lang, path: `${sec}/`,
      // La vista por defecto ya viene puesta en el HTML: si la pusiera el
      // guion, la lista entera se pintaria y desapareceria al cargar.
      vista: tunel ? 'tunel' : 'lista',
      title: `${sec} — ${site.short}`,
      desc: t(site.tagline, lang),
      image: ogImage(items[0]),
      jsonld: {
        '@context':'https://schema.org', '@type':'CollectionPage',
        name: sec, url: abs(lang, `${sec}/`),
        hasPart: items.map(p => ({ '@type':'CreativeWork', name:p.title, url: abs(lang, dir(p)) })),
      },
    })
    + `<div class="topbar">
  ${nav(lang, sec)}
  <!-- Orden y filtro a la izquierda del cambio de vista: solo salen en la
       lista, y asi el boton tunel/lista no se mueve de sitio al cambiar. -->
  <div class="controles">
${menu('sort', t(site.menu.sort, lang), orden)}
${menu('tag', '', filtro)}
${tunel ? `    <div class="vistas" role="group" aria-label="${esc(t(site.menu.aria.view, lang))}">
      <!-- un solo boton: ensena el icono de la vista en la que estas y pulsado
           pasa a la otra. Los dos iconos en la misma casilla -->
      <button type="button" class="vista"><span class="ico" data-vista="tunel" aria-hidden="true"></span><span class="ico" data-vista="lista" aria-hidden="true"></span><span class="sr" data-vista="tunel">${esc(t(site.menu.tunnel, lang))}</span><span class="sr" data-vista="lista">${esc(t(site.menu.list, lang))}</span></button>
    </div>` : ''}
    <!-- idiomas, letra y tema a la derecha de tunel/lista: en el tunel la
         pagina no scrollea y el pie no se veria nunca -->
    ${langs(lang, `${sec}/`)}
  </div>
</div>

<main class="wrap">
  <h1 class="sr">${sec}</h1>

${tunel ? `  <!-- vista tunel -->
  <div class="escena" id="escena">
    <div class="tunel" id="tunel"></div>
  </div>
` : ''}
  <!-- vista lista -->
  <ul class="index${tunel ? '' : ' index--lab'}" id="index">
${rows}
  </ul>
  <!-- en el movil, en la lista, idioma, letra y tema van aqui, al final
       del scroll, y no arriba: la barra ya lleva orden y filtro -->
  <div class="pie-lista">${langs(lang, `${sec}/`)}</div>
</main>

${tunel ? `<!-- Linea del tiempo: una raya de lado a lado y cada proyecto en su fecha.
     El pomo avanza con el tunel y se puede arrastrar. -->
<footer class="tiempo" id="tiempo">
  <div class="barra" id="barra">
    <span class="linea" aria-hidden="true"></span>
    <span class="relleno" id="relleno" aria-hidden="true"></span>
    <div class="marcas" id="marcas"></div>
    <span class="pomo" id="pomo" aria-hidden="true"></span>
  </div>
  <a class="rotulo" id="rotulo" href=""></a>
</footer>

<div class="peek" id="peek" aria-hidden="true"></div>
<script type="module" src="${raiz('/js/tunnel.js')}"></script>
` : ''}<script type="module" src="${raiz('/js/work.js')}"></script>`
    + foot();
  }

  function projectPage(p, lang, prev, next) {
    const parrafos = [].concat(t(p.text, lang) || []);
    const desc = parrafos.join(' ');
    const sub  = t(p.subheader, lang);
    const archivos = (p.photos || []).map(m => fichero(p, m));

    const yt = youtube(p.url);
    /* En lab la pieza manda: va arriba a pantalla entera y el resto, texto
       y fotos, debajo. En work, la pieza (si la hay) es una foto mas. */
    const piezas = p.lab ? archivos.filter(esPieza) : [];
    const media = [
      ...(yt ? [embed(yt, p, lang)] : []),
      ...archivos.filter(m => !piezas.includes(m)).map((m, i) => `      <figure>${mediaTag(m, p, sub, i)}</figure>`),
    ].join('\n');
    /* Sale con su play, como en work. En un ordenador con raton js/media.js
       la arranca sola —es a lo que se viene a esta pagina—; en el movil
       espera al dedo: una build de Unity son decenas de megas de datos. */
    const escenario = piezas.length
      ? `  <div class="escenario">\n${piezas.map(m => `    ${mediaTag(m, p, sub, 0)}`).join('\n')}\n  </div>\n`
      : '';

    const credits = creditos(p, lang);

    const og = ogImage(p);
    return head({
      lang, path: dir(p), indexar: INDEXAR && !p.oculto,
      title: `${p.title} — ${sub} — ${site.short}`,
      desc: metaDesc(desc),
      image: og,
      jsonld: {
        '@context':'https://schema.org', '@type':'CreativeWork',
        name: p.title, headline: p.title, abstract: sub,
        description: metaDesc(desc),
        datePublished: p.date,
        url: abs(lang, dir(p)),
        inLanguage: lang,
        creator: { '@type':'Person', name: site.title, url: publica('/') },
        about: p.client,
        keywords: (p.tags || []).join(', '),
        ...(og ? { image: absFichero(og) } : {}),
        ...(p.url ? { sameAs: [p.url] } : {}),
        contributor: (p.credits || []).flatMap(({ name }) =>
          (String(name).match(/@[\w.\-_]+/g) || []).map(h =>
            ({ '@type':'Person', name: h, sameAs: igUrl(h) }))),
      },
    })
    + `${nav(lang, secDe(p), p)}
<main class="project${p.lab ? ' project--lab' : ''}">
${escenario}  <div class="side">
    <div class="info">
      <h1 class="title">${titleHtml(p.title)}</h1>
      <div class="meta">
        <span class="d">${esc(fmtDate(p.date))}</span>
        <span class="c">${esc(p.client)}</span>
        <span class="g">${esc((p.tags || []).join(' '))}</span>
      </div>
      <div class="body">
${parrafos.map(x => `        <p>${esc(x)}</p>`).join('\n')}
      </div>
      ${p.url && !yt ? `<a class="watch" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t(site.menu.watch, lang))} →</a>` : ''}
    </div>
${credits}
    <!-- Al pie del bloque del texto, en dos lineas: anterior y siguiente,
         y debajo, volver a work (bajo el anterior) y los idiomas (bajo el
         siguiente). -->
    <div class="navega">
      <nav class="pager" aria-label="${esc(t(site.menu.aria.projects, lang))}">
        ${prev ? `<a class="ant" href="${url(lang, dir(prev))}" title="${esc(prev.title)}"><span>←</span> <span class="tt">${esc(prev.title)}</span></a>` : '<span></span>'}
        ${next ? `<a class="sgte" href="${url(lang, dir(next))}" title="${esc(next.title)}"><span class="tt">${esc(next.title)}</span> <span>→</span></a>` : '<span></span>'}
      </nav>
      <div class="abajo">
        <a class="volver" href="${url(lang, secDe(p) + '/')}">${esc(t(site.menu.back, lang))}</a>
        ${langs(lang, dir(p))}
      </div>
    </div>
  </div>

  <div class="media">
${media || '      <!-- sin material grafico todavia -->'}
  </div>
</main>
<script type="module" src="${raiz('/js/media.js')}"></script>`
    + foot();
  }

  /** La ficha tecnica: una persona (o varias) por linea, con su rol y los @
      enlazados a Instagram. */
  function creditos(p, lang) {
    const roles = p.credits || [];
    return roles.length ? `    <section class="credits">
      <h2>${esc(t(site.menu.credits, lang))}</h2>
      <dl>
${roles.map(({ role, name }) =>
  `        <div class="row"><dt>${esc(t(role, lang))}</dt> <dd>${linkHandles(name)}</dd></div>`).join('\n')}
      </dl>
    </section>` : '';
  }

  function aboutPage(lang) {
    const ps = about[lang]?.length ? about[lang] : about[DEF];
    return head({
      lang, path: 'about/',
      title: `about — ${site.short}`,
      desc: metaDesc(ps[0]),
      image: OG,
      jsonld: {
        '@context':'https://schema.org', '@type':'AboutPage',
        url: abs(lang, 'about/'),
        mainEntity: { '@type':'Person', name: site.title, description: metaDesc(ps[0]),
                      url: publica('/'), sameAs: (site.social || []) },
      },
    })
    + `${nav(lang, 'about')}
<main class="about">
  <h1>${esc(site.title)}</h1>
${ps.map(x => `  <p>${esc(x)}</p>`).join('\n')}
  <p class="contact">${correo(lang)}</p>
  <p class="redes">
     ${redes()}
  </p>
</main>
<footer class="foot">${langs(lang, 'about/')}${sig()}</footer>
<script type="module" src="${raiz('/js/correo.js')}"></script>`
    + foot();
  }

  /** La 404. GitHub Pages sirve la misma para cualquier direccion que no
      existe, sea del idioma que sea: por eso el aviso va en los tres. */
  function noEncontrada() {
    return head({
      lang: DEF, path: '',
      title: `404 — ${site.short}`,
      desc: t(site.menu.notFound, DEF),
      image: OG,
    })
    + `${nav(DEF, null)}
<main class="about">
  <h1>404</h1>
${LANGS.map(l => `  <p lang="${l}">${esc(t(site.menu.notFound, l))}</p>`).join('\n')}
</main>`
    + foot();
  }

  /* ---------- el mapa del sitio ----------
     Cada pagina con su ruta y la funcion que la pinta. El build las escribe
     todas; la vista previa busca la que se ha pedido y pinta solo esa. */
  function rutas() {
    const r = [];
    for (const lang of LANGS) {
      r.push({ ruta: ruta(lang),          pintar: () => landing(lang) });
      r.push({ ruta: ruta(lang, 'about/'), pintar: () => aboutPage(lang) });
      for (const sec of ['work', 'lab']) {
        const items = de(sec);
        if (!items.length) continue;
        r.push({ ruta: ruta(lang, `${sec}/`), pintar: () => indice(lang, sec) });
        items.forEach((p, i) => r.push({
          ruta: ruta(lang, dir(p)), fecha: p.date,
          pintar: () => projectPage(p, lang, items[i - 1], items[i + 1]),
        }));
      }
      // los ocultos tienen su pagina (para mandarla), fuera del sitemap
      for (const p of ocultos) r.push({ ruta: ruta(lang, dir(p)), oculto: true, pintar: () => projectPage(p, lang) });
    }
    return r;
  }

  /* ---------- revision de los datos ----------
     Lo que se puede equivocar al editar a mano y el esquema no ve, porque
     hay que mirar el disco. Los graves (grave: true) son los que dejarian la
     web rota —una foto que no esta, un slug de la lista sin carpeta— y paran
     el build, como en polroig (la receta, regla 4). Los demas solo avisan:
     la web sale bien, pero quiza no como se queria (una foto que pesa
     demasiado, un GIF). La vista previa ensena los dos. */
  function revisar() {
    const avisos = [];
    const aviso = (quien, texto, grave = false) => avisos.push({ quien, texto, grave });
    const EXT = /\.(jpe?g|png|webp|gif|avif|mp4|webm|html?)$/i;

    for (const lang of LANGS) {
      if (!about?.[lang]?.length) aviso('about.json', `falta el about en "${lang}"`);
    }

    /* Las listas: cada nombre tiene que ser una carpeta de projects/, y cada
       proyecto, estar en una sola. */
    const vistos = new Set();
    for (const [nombre, l] of Object.entries(site.lists || {})) {
      for (const { slug } of entradas(l)) {
        if (typeof slug !== 'string') {
          aviso('site.json', `en la lista "${nombre}", cada proyecto es "slug" o, si esta oculto, { "project": "slug", "visible": false }`);
          continue;
        }
        if (!proyectos.some(p => p.slug === slug))
          aviso('site.json', `la lista "${nombre}" dice "${slug}", pero no hay ninguna carpeta projects/${slug}/`, true);
        if (vistos.has(slug)) aviso('site.json', `"${slug}" esta en dos listas, o dos veces en la misma`, true);
        vistos.add(slug);
      }
    }

    proyectos.forEach(p => {
      const quien = p.slug;
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug))
        aviso(quien, 'el nombre de la carpeta solo puede llevar minusculas, numeros y guiones (sin acentos ni espacios)', true);
      if (!p.title) aviso(quien, 'falta "title"');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) aviso(quien, `la fecha tiene que ser AAAA-MM-DD, y es "${p.date ?? ''}"`);
      if (p.tags && !Array.isArray(p.tags)) aviso(quien, '"tags" tiene que ser una lista: ["lx", "vs"]');
      if (p.photos && !Array.isArray(p.photos)) aviso(quien, '"photos" tiene que ser una lista: ["1", "2"]');
      if (p.credits && !Array.isArray(p.credits)) aviso(quien, '"credits" tiene que ser una lista: [{ "role": "…", "name": "…" }]');
      if (!p.published) return;             // los borradores no se revisan mas

      if (!t(p.text, DEF)?.length) aviso(quien, `falta el texto en "${DEF}"`);
      if (!p.photos?.length && !p.cover?.length) aviso(quien, 'no tiene ni photos ni cover: en el tunel saldra un hueco gris');
      const ficheros = [...(p.photos || []), ...(p.cover || [])];
      for (const m of ficheros) {
        const f = fichero(p, m);
        if (!EXT.test(f)) aviso(quien, `"${m}": formato que la web no sabe ensenar (usa webp, jpg, png, gif, webm, mp4 o una pieza .html)`, true);
        else if (!existe(f)) aviso(quien, `"${m}": no hay ningun ${m}.webp (ni .webm, .jpg...) en projects/${p.slug}/img/`, true);
        else if (/\.gif$/i.test(f)) aviso(quien, `${f} es un GIF: pasalo por imgToWeb, sale un webp animado que pesa mucho menos`);
        else {
          // Oriol no tiene npm run media: esto es lo que le avisa de una foto del movil sin convertir
          const mb = (peso(f) || 0) / 1048576, video = esVideo(f);
          if (mb > (video ? 12 : 1) && !esPieza(f))
            aviso(quien, `${f} pesa ${mb.toFixed(1)} MB: pasalo por ${video ? 'videoToWeb (720p)' : 'imgToWeb (85 %)'}`);
        }
      }
    });
    return avisos;
  }

  return { live, labs, rutas, noEncontrada, revisar, publica, LANGS };
}
