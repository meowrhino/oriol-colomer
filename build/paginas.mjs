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
    }
    const err = new Error(`${nombre} no es un JSON valido${donde}. Suele ser una coma de mas `
      + `o de menos, o unas comillas sin cerrar. Detalle: ${e.message}`);
    err.json = true;
    throw err;
  }
}

/** En el JSON un fichero se escribe con su nombre ("foto.webp", o
    "web/index.html" si esta en una subcarpeta) y se busca en media/<slug>/,
    que es la carpeta que toca. Si empieza por "media/" es la ruta entera.
    Lo usan las plantillas y build/media.mjs. */
export const enCarpeta = (p, m) => {
  const s = String(m).trim().replace(/^\/+/, '');
  return s.startsWith('media/') ? s : `media/${p.slug}/${s}`;
};

/** Junta data/work.json y data/lab.json en una sola lista. El fichero
    decide la seccion: lo que esta en lab.json sale en /lab/, lo demas en
    work. La carpeta media/<slug>/ es de los dos, asi que se revisan juntos:
    un slug no se puede repetir aunque este en ficheros distintos. */
export function unir(work, lab) {
  for (const [lista, f] of [[work, 'data/work.json'], [lab, 'data/lab.json']])
    if (!Array.isArray(lista)) throw new Error(`${f} tiene que ser una lista: empieza por [ y acaba por ]`);
  const marcar = esLab => p => (p && typeof p === 'object' ? { ...p, lab: esLab } : p);
  return [...work.map(marcar(false)), ...lab.map(marcar(true))];
}

/** El id de un video de YouTube a partir de cualquiera de sus enlaces:
    youtu.be/ID, watch?v=ID, embed/ID, shorts/ID, live/ID. */
export const youtube = link => (/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/
  .exec(String(link || '')) || [])[1] || null;

/* ============================================================
   crearSitio — todo lo que depende de los datos
   ------------------------------------------------------------
   opciones:
     site, proyectos   el contenido de data/*.json
     base              subcarpeta en la que se sirve ('' o '/oriol-colomer')
     existe(ruta)      true si ese fichero esta en el repo
     medidas(ruta)     { w, h } de una imagen, o null
     peso(ruta)        bytes de un fichero, o null (para avisar de lo pesado)
     miniaturaYT(id)   la ruta de la miniatura de YouTube bajada al publicar,
                       o null: entonces se pide a YouTube
     preview           true en la vista previa: los enlaces internos van
                       a ?p=/ruta/ en vez de a /ruta/, porque Live Server
                       solo tiene un index.html y el resto lo pinta el js
   ============================================================ */
export function crearSitio({ site, proyectos, base = '', existe = () => false,
                             medidas = () => null, peso = () => null, miniaturaYT = () => null,
                             preview = false }) {
  const LANGS = site.langs;
  const DEF   = site.defaultLang;
  const B     = String(base).replace(/\/$/, '');

  /* El orden de todo el sitio —indice, tunel, anterior/siguiente y sitemap—
     es este, de mas reciente a mas antiguo. Un proyecto pegado en cualquier
     sitio del fichero sale donde le toca por fecha. */
  const porFecha = (a, b) => String(b.date).localeCompare(String(a.date));
  /* Dos secciones: work (tunel, lista y una pagina por proyecto) y lab
     (experimentos, piezas interactivas: lista y pagina, sin tunel). Cada
     proyecto va en la suya segun el fichero del que viene (ver unir()). */
  const live = proyectos.filter(p => p && p.published && !p.lab).sort(porFecha);
  const labs = proyectos.filter(p => p && p.published && p.lab).sort(porFecha);
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
  const publica = p => site.baseUrl.replace(/\/$/, '') + raiz(p);
  const abs  = (l, path = '') => publica(ruta(l, path));
  const absFichero = rel => publica('/' + rel);
  /** Un fichero del repo en un atributo: src, href, poster... */
  const src = f => raiz('/' + esc(f));
  /** El codigo de idioma de verdad: catalan es "ca", no "cat". */
  const iso = l => (l === 'cat' ? 'ca' : l);

  const t = (obj, l) => (obj && (obj[l] || obj[DEF])) || '';

  /* ---------- formato ---------- */
  /* Mismo formato en los tres idiomas, como la ficha original. */
  const fmtDate = iso => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  /** Corta el texto en parrafos por linea en blanco. */
  const paras = txt => String(txt).split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
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

      Si el JSON trae "thumb", esa, sea foto, webp animado o video. Si no,
      el primer fichero de media; si es un video, su poster, que pesa poco:
      un video por carta en el tunel serian megas. Quien quiera que se
      mueva pone un "thumb" corto y chico. */
  const cover = p => {
    if (p.thumb) {
      const th = enCarpeta(p, p.thumb);
      if (!esVideo(th)) return { img: chica(th), video: null };
      const pj = poster(th);
      return { img: pj ? chica(pj) : '', video: fuentes(th) };
    }
    const todo = (p.media || []).map(x => enCarpeta(p, x)).filter(x => !esPieza(x));
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
      poster de un video, o su portada. WhatsApp se salta la vista previa
      si pesa mas de 300 KB: entonces va la version chica. */
  const ogImage = p => {
    if (!p) return OG;
    const m = (p.media || []).map(x => enCarpeta(p, x)).filter(x => !esPieza(x));
    const f = m.find(x => !esVideo(x)) || m.map(poster).find(Boolean) || cover(p)?.img;
    if (!f) return OG;
    return existe(f) && peso(f) > 300 * 1024 ? chica(f) : f;
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
    ? `<button type="button" class="correo ${clase}" data-c="${cifrado(site.email)}">${esc(t(site.ui.mail, lang))}</button>`
    + `<noscript>${esc(site.email.replace('@', ' [at] '))}</noscript>`
    : '';
  const redes = () => (site.redes || []).map(r =>
    `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.texto)}</a>`).join('\n     ');

  function head({ lang, title, desc, path, image, jsonld, vel, entrar, vista, auto }) {
    const alts = LANGS.map(l =>
      `<link rel="alternate" hreflang="${iso(l)}" href="${abs(l, path)}">`
    ).join('\n  ');
    // las medidas dejan pintar la vista previa sin esperar a bajar la imagen
    const dim = image && medidas(image);
    return `<!doctype html>
<html lang="${iso(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${abs(lang, path)}">
  ${alts}
  <link rel="alternate" hreflang="x-default" href="${abs(DEF, path)}">
  <meta property="og:type" content="${/^(work|lab)\/.+/.test(path) ? 'article' : 'website'}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${abs(lang, path)}">
  <meta property="og:site_name" content="${esc(site.shortName)}">
  <meta property="og:locale" content="${lang === 'cat' ? 'ca_ES' : lang === 'es' ? 'es_ES' : 'en_GB'}">
  ${image ? `<meta property="og:image" content="${absFichero(image)}">` : ''}
  ${dim ? `<meta property="og:image:width" content="${dim.w}">\n  <meta property="og:image:height" content="${dim.h}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#151515" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="${raiz('/css/style.css')}">
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
     cuando hay algo publicado en data/lab.json. */
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
        <a class="yt" href="${esc(p.link)}" target="_blank" rel="noopener" data-yt="${id}"
           aria-label="${esc(t(site.ui.watch, lang))}: ${esc(p.title)}">
          ${miniaturaYT(id) ? `<img src="${src(miniaturaYT(id))}" alt="" decoding="async">`
          : `<img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt="" decoding="async"
               onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${id}/hqdefault.jpg'">`}
          <span class="play" aria-hidden="true"></span>
        </a>
      </figure>`;

  function langs(lang, path) {
    const sig = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
    return `<nav class="langs" aria-label="${esc(t(site.ui.aria.lang, lang))}">`
      // claro u oscuro: sol y luna, uno encima del otro. Escondido hasta que
      // hay JS que lo mueva
      + `<button type="button" class="tema" aria-pressed="false" title="${esc(t(site.ui.tema, lang))}" hidden>`
      + `<span class="ico sol" aria-hidden="true"></span><span class="ico luna" aria-hidden="true"></span>`
      + `<span class="sr">${esc(t(site.ui.tema, lang))}</span></button>`
      // letra normal o wingdings. Sale escondido: js/ajustes.js lo ensena solo si
      // el aparato tiene la fuente (Windows y Mac si, moviles no).
      // Apagado, un ojo; encendido, la mano
      + `<button type="button" class="tipo" aria-pressed="false" title="${esc(t(site.ui.tipo, lang))}" hidden>`
      + `<span class="ico ojo" aria-hidden="true"></span><span class="ico mano" aria-hidden="true"></span>`
      + `<span class="sr">${esc(t(site.ui.tipo, lang))}</span></button>`
      // el idioma: dice el actual y al pulsar pasa al siguiente de los tres
      + `<a class="idioma" href="${url(sig, path)}" hreflang="${iso(sig)}" title="${esc(t(site.ui.aria.lang, lang))}: ${sig}">${lang}</a>`
      + `</nav>`;
  }

  const sig = () =>
    `<p class="sig">${esc(site.credit.label)}: `
    + `<a href="${site.credit.url}" target="_blank" rel="noopener">${esc(site.credit.name)}</a></p>`;

  const foot = () => `</body>\n</html>\n`;

  /* ---------- paginas ---------- */
  function landing(lang) {
    return head({
      lang, path: '', vel: 1, entrar: url(lang, 'work/'), auto: site.entradaAuto,
      title: `${site.name} — ${t(site.tagline, lang)}`,
      desc: t(site.tagline, lang),
      image: OG,
      jsonld: {
        '@context':'https://schema.org', '@type':'Person',
        name: site.name, url: abs(lang),
        jobTitle: t(site.tagline, lang),
        sameAs: (site.redes || []).map(r => r.url),
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
      <h1 class="name">${esc(site.name)}</h1>
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

    const orden  = [['date', t(site.ui.byDate, lang)], ['client', t(site.ui.byClient, lang)],
                    ['title', t(site.ui.byTitle, lang)]];
    const filtro = [['', t(site.ui.all, lang)], ...tags.map(g => [g, g])];

    return head({
      lang, path: `${sec}/`,
      // La vista por defecto ya viene puesta en el HTML: si la pusiera el
      // guion, la lista entera se pintaria y desapareceria al cargar.
      vista: tunel ? 'tunel' : 'lista',
      title: `${sec} — ${site.shortName}`,
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
${menu('sort', t(site.ui.sort, lang), orden)}
${menu('tag', '', filtro)}
${tunel ? `    <div class="vistas" role="group" aria-label="${esc(t(site.ui.aria.view, lang))}">
      <!-- un solo boton: ensena el icono de la vista en la que estas y pulsado
           pasa a la otra. Los dos iconos en la misma casilla -->
      <button type="button" class="vista"><span class="ico" data-vista="tunel" aria-hidden="true"></span><span class="ico" data-vista="lista" aria-hidden="true"></span><span class="sr" data-vista="tunel">${esc(t(site.ui.tunnel, lang))}</span><span class="sr" data-vista="lista">${esc(t(site.ui.list, lang))}</span></button>
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
    const desc = t(p.description, lang);
    const sub  = t(p.subheader, lang);
    const archivos = (p.media || []).map(m => enCarpeta(p, m));

    const yt = youtube(p.link);
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

    const roles = Object.entries(p.credits || {});
    const credits = creditos(p, lang);

    const og = ogImage(p);
    return head({
      lang, path: dir(p),
      title: `${p.title} — ${sub} — ${site.shortName}`,
      desc: metaDesc(desc),
      image: og,
      jsonld: {
        '@context':'https://schema.org', '@type':'CreativeWork',
        name: p.title, headline: p.title, abstract: sub,
        description: metaDesc(desc),
        datePublished: p.date,
        url: abs(lang, dir(p)),
        inLanguage: iso(lang),
        creator: { '@type':'Person', name: site.name, url: site.baseUrl },
        about: p.client,
        keywords: (p.tags || []).join(', '),
        ...(og ? { image: absFichero(og) } : {}),
        ...(p.link ? { sameAs: [p.link] } : {}),
        contributor: roles.flatMap(([, people]) =>
          (String(people).match(/@[\w.\-_]+/g) || []).map(h =>
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
${paras(desc).map(x => `        <p>${esc(x)}</p>`).join('\n')}
      </div>
      ${p.link && !yt ? `<a class="watch" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(t(site.ui.watch, lang))} →</a>` : ''}
    </div>
${credits}
    <!-- Al pie del bloque del texto, en dos lineas: anterior y siguiente,
         y debajo, volver a work (bajo el anterior) y los idiomas (bajo el
         siguiente). -->
    <div class="navega">
      <nav class="pager" aria-label="${esc(t(site.ui.aria.projects, lang))}">
        ${prev ? `<a class="ant" href="${url(lang, dir(prev))}" title="${esc(prev.title)}"><span>←</span> <span class="tt">${esc(prev.title)}</span></a>` : '<span></span>'}
        ${next ? `<a class="sgte" href="${url(lang, dir(next))}" title="${esc(next.title)}"><span class="tt">${esc(next.title)}</span> <span>→</span></a>` : '<span></span>'}
      </nav>
      <div class="abajo">
        <a class="volver" href="${url(lang, secDe(p) + '/')}">${esc(t(site.ui.back, lang))}</a>
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

  /** La ficha tecnica: "rol": "quien", con los @ enlazados a Instagram. */
  function creditos(p, lang) {
    const roles = Object.entries(p.credits || {});
    return roles.length ? `    <section class="credits">
      <h2>${esc(t(site.ui.credits, lang))}</h2>
      <dl>
${roles.map(([role, people]) =>
  `        <div class="row"><dt>${esc(role)}</dt> <dd>${linkHandles(people)}</dd></div>`).join('\n')}
      </dl>
    </section>` : '';
  }

  function aboutPage(lang) {
    const ps = site.about[lang] || site.about[DEF];
    return head({
      lang, path: 'about/',
      title: `about — ${site.shortName}`,
      desc: metaDesc(ps[0]),
      image: OG,
      jsonld: {
        '@context':'https://schema.org', '@type':'AboutPage',
        url: abs(lang, 'about/'),
        mainEntity: { '@type':'Person', name: site.name, description: metaDesc(ps[0]),
                      url: site.baseUrl, sameAs: (site.redes || []).map(r => r.url) },
      },
    })
    + `${nav(lang, 'about')}
<main class="about">
  <h1>${esc(site.name)}</h1>
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
      title: `404 — ${site.shortName}`,
      desc: t(site.ui.notFound, DEF),
      image: OG,
    })
    + `${nav(DEF, null)}
<main class="about">
  <h1>404</h1>
${LANGS.map(l => `  <p lang="${iso(l)}">${esc(t(site.ui.notFound, l))}</p>`).join('\n')}
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
    }
    return r;
  }

  /* ---------- revision de los datos ----------
     Lo que se puede equivocar al editar el JSON a mano. Devuelve avisos,
     no rompe nada: el build los escribe en el log y la vista previa los
     ensena encima de la pagina. */
  function revisar() {
    const avisos = [];
    const aviso = (quien, texto) => avisos.push({ quien, texto });
    const vistos = new Set();
    const EXT = /\.(jpe?g|png|webp|gif|avif|mp4|webm|html?)$/i;

    for (const lang of LANGS) {
      if (!site.about?.[lang]) aviso('site.json', `falta el about en "${lang}"`);
    }

    proyectos.forEach((p, n) => {
      if (!p || typeof p !== 'object') { aviso(`proyecto ${n + 1}`, 'no es un bloque { ... }'); return; }
      const quien = p.slug || `proyecto ${n + 1}`;
      if (!p.slug) aviso(quien, 'falta "slug"');
      else {
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug))
          aviso(quien, 'el slug solo puede llevar minusculas, numeros y guiones (sin acentos ni espacios)');
        if (vistos.has(p.slug)) aviso(quien, 'hay dos proyectos con el mismo slug');
        vistos.add(p.slug);
      }
      if (!p.title) aviso(quien, 'falta "title"');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) aviso(quien, `la fecha tiene que ser AAAA-MM-DD, y es "${p.date ?? ''}"`);
      if (typeof p.published !== 'boolean') aviso(quien, '"published" tiene que ser true o false, sin comillas');
      if (p.tags && !Array.isArray(p.tags)) aviso(quien, '"tags" tiene que ser una lista: ["lx", "vs"]');
      if (p.media && !Array.isArray(p.media)) aviso(quien, '"media" tiene que ser una lista: ["1.webp", "2.webp"]');
      if (!p.published) return;             // los borradores no se revisan mas

      if (!t(p.description, DEF)) aviso(quien, `falta la descripcion en "${DEF}"`);
      if (!p.media?.length && !p.thumb) aviso(quien, 'no tiene ni media ni thumb: en el tunel saldra un hueco gris');
      const ficheros = [...(p.media || [])];
      if (p.thumb) ficheros.push(p.thumb);
      for (const m of ficheros) {
        const f = enCarpeta(p, m);
        if (!EXT.test(f)) aviso(quien, `"${m}": formato que la web no sabe ensenar (usa webp, jpg, png, gif, webm, mp4 o una pieza .html)`);
        else if (!existe(f)) aviso(quien, `no encuentro ${f}`);
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
