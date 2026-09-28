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
export const esImagen = m => /\.(jpe?g|png|webp|gif|avif)$/i.test(m);

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

/* ============================================================
   crearSitio — todo lo que depende de los datos
   ------------------------------------------------------------
   opciones:
     site, proyectos   el contenido de data/*.json
     base              subcarpeta en la que se sirve ('' o '/oriol-colomer')
     existe(ruta)      true si ese fichero esta en el repo
     medidas(ruta)     { w, h } de una imagen, o null
     preview           true en la vista previa: los enlaces internos van
                       a ?p=/ruta/ en vez de a /ruta/, porque Live Server
                       solo tiene un index.html y el resto lo pinta el js
   ============================================================ */
export function crearSitio({ site, proyectos, base = '', existe = () => false,
                             medidas = () => null, preview = false }) {
  const LANGS = site.langs;
  const DEF   = site.defaultLang;
  const B     = String(base).replace(/\/$/, '');

  /* El orden de todo el sitio —indice, tunel, anterior/siguiente y sitemap—
     es este, de mas reciente a mas antiguo. Un proyecto pegado en cualquier
     sitio del fichero sale donde le toca por fecha. */
  const live = proyectos.filter(p => p && p.published)
                        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  /* ---------- rutas ---------- */
  const raiz = p => B + (p.startsWith('/') ? p : '/' + p);
  // prefijo de idioma: el idioma por defecto vive en la raiz, los otros en /es/ y /cat/
  const pre  = l => (l === DEF ? '' : `/${l}`);
  /** La ruta limpia de una pagina: /es/work/slug/ */
  const ruta = (l, path = '') => `${pre(l)}/${path}`.replace(/\/{2,}/g, '/');
  /** A donde apuntan los enlaces. En la vista previa, al index con ?p= */
  const url  = (l, path = '') => preview ? `${B}/?p=${ruta(l, path)}` : B + ruta(l, path);
  /** La direccion publica, para canonical, hreflang, og y sitemap. */
  const abs  = (l, path = '') => site.baseUrl.replace(/\/$/, '') + B + ruta(l, path);
  const absFichero = rel => site.baseUrl.replace(/\/$/, '') + raiz('/' + rel);

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

  /* ---------- media ----------
     En el JSON un fichero se puede escribir entero ("media/slug/foto.webp")
     o solo con su nombre ("foto.webp"): entonces se busca en media/<slug>/,
     que es la carpeta que toca. Lo segundo es lo facil de escribir. */
  const enCarpeta = (p, m) => {
    const s = String(m).trim().replace(/^\/+/, '');
    return s.includes('/') ? s : `media/${p.slug}/${s}`;
  };
  /** Fotograma de un video, para el poster: webp si lo hay, si no jpg. */
  const poster = m => {
    const base = m.replace(/\.(mp4|webm)$/i, '');
    return [`${base}.poster.webp`, `${base}.poster.jpg`].find(existe) || null;
  };
  /** El gemelo de un video en el otro formato, si esta. El webm va primero
      —pesa menos—, y el mp4 de respaldo para los navegadores sin webm. */
  const fuentes = m => {
    const base = m.replace(/\.(mp4|webm)$/i, '');
    return [`${base}.webm`, `${base}.mp4`].filter(f => f === m || existe(f));
  };
  /** La version chica de una imagen, si la hay (la hace npm run media).
      Donde se usa la portada —la carta del tunel y la vista previa de la
      lista— se pinta a 360 px como mucho. Si no hay, el original. */
  const chica = m => {
    const th = m.replace(/\.(jpe?g|png|webp)$/i, '.thumb.webp');
    return th !== m && existe(th) ? th : m;
  };

  /** La portada de un proyecto en el tunel y en la lista.
      Si el JSON trae "thumb", esa, sea foto, webp animado o video. Si no,
      el primer fichero de media; y si es un video, su poster. */
  const cover = p => {
    if (p.thumb) {
      const th = enCarpeta(p, p.thumb);
      return { src: esVideo(th) ? th : chica(th), video: esVideo(th) ? fuentes(th) : null };
    }
    const m = p.media?.[0] && enCarpeta(p, p.media[0]);
    if (!m) return null;
    if (!esVideo(m)) return { src: chica(m), video: null };
    const pj = poster(m);
    if (pj) return { src: chica(pj), video: null };
    const foto = p.media.map(x => enCarpeta(p, x)).find(x => !esVideo(x));
    return foto ? { src: chica(foto), video: null } : null;
  };
  /** Para og:image hace falta una imagen de verdad, no un video. */
  const ogImage = p => {
    if (!p || !p.media) return null;
    const m = p.media.map(x => enCarpeta(p, x));
    return m.find(x => !esVideo(x)) || m.map(poster).find(Boolean) || null;
  };
  /** La imagen con la que se comparte la portada y el indice: la del
      proyecto mas reciente, si hay alguno publicado. */
  const ogSitio = () => ogImage(live[0]);

  /** Un item de media: imagen, o video en bucle mudo sin controles.
      El video sale parado y sin pedir nada: lo arranca js/media.js cuando
      entra en pantalla. Con autoplay se bajaban todos de golpe. */
  const mediaTag = (m, p, sub, i) => {
    const label = `${esc(p.title)} — ${esc(sub)}`;
    if (!esVideo(m)) {
      const d = medidas(m);
      return `<img src="${raiz('/' + esc(m))}" alt="${label}"
      ${d ? `width="${d.w}" height="${d.h}"` : ''}
      loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">`;
    }
    const pj = poster(m);
    // El video tambien deja hueco: sus medidas son las del poster.
    const d = pj ? medidas(pj) : null;
    return `<video muted loop playsinline preload="none"
      ${pj ? `poster="${raiz('/' + esc(pj))}"` : ''}
      ${d ? `width="${d.w}" height="${d.h}"` : ''}
      aria-label="${label}">`
      + fuentes(m).map(f =>
          `<source src="${raiz('/' + esc(f))}" type="video/${f.endsWith('.webm') ? 'webm' : 'mp4'}">`).join('')
      + `</video>`;
  };

  /* ---------- parciales ---------- */
  /* Velocidad del fondo dentro del sitio. La portada va a 1: es lo unico
     que hay en pantalla. Dentro, el fondo es el telon del trabajo. */
  const DENTRO = 0.38;

  function head({ lang, title, desc, path, image, jsonld, vel, entrar, vista }) {
    const alts = LANGS.map(l =>
      `<link rel="alternate" hreflang="${l === 'cat' ? 'ca' : l}" href="${abs(l, path)}">`
    ).join('\n  ');
    return `<!doctype html>
<html lang="${lang === 'cat' ? 'ca' : lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${abs(lang, path)}">
  ${alts}
  <link rel="alternate" hreflang="x-default" href="${abs(DEF, path)}">
  <meta property="og:type" content="${path.startsWith('work/') && path !== 'work/' ? 'article' : 'website'}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${abs(lang, path)}">
  <meta property="og:site_name" content="${esc(site.shortName)}">
  <meta property="og:locale" content="${lang === 'cat' ? 'ca_ES' : lang === 'es' ? 'es_ES' : 'en_GB'}">
  ${image ? `<meta property="og:image" content="${absFichero(image)}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="theme-color" content="#fafafa">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='16' fill='%23a6a6a6'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="${raiz('/css/style.css')}">
  ${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body${entrar ? ` data-entrar="${entrar}"` : ''}${vista ? ` data-vista="${vista}"` : ''}>
<!-- El fondo se mueve en todas las paginas; la velocidad es lo unico que
     cambia entre la portada y el resto. El campo sale de data/site.json. -->
<canvas class="dots" id="bg" data-vel="${vel ?? DENTRO}" data-campo="${esc(site.fondo || 'terreno')}" aria-hidden="true"></canvas>
<script type="module" src="${raiz('/js/bg.js')}"></script>`;
  }

  function nav(lang, current) {
    const item = n => {
      const label = esc(t(n.label, lang));
      // lab todavia no tiene destino: se ensena apagado y sin enlace
      if (!n.href) return `<span class="off" title="${esc(t(site.ui.aria.soon, lang))}">${label}</span>`;
      const href = url(lang, n.href.replace(/^\//, ''));
      return n.id === current
        ? `<a href="${href}" aria-current="page">${label}</a>`
        : `<a href="${href}">${label}</a>`;
    };
    return `<nav class="nav nav--inline">`
         + site.nav.map(item).join('<span class="sep">/</span>')
         + `</nav>`;
  }

  function langs(lang, path) {
    return `<nav class="langs" aria-label="${esc(t(site.ui.aria.lang, lang))}">`
      + LANGS.map(l => l === lang
          ? `<span aria-current="true">${l}</span>`
          : `<a href="${url(l, path)}" hreflang="${l === 'cat' ? 'ca' : l}">${l}</a>`
        ).join('')
      + `</nav>`;
  }

  const sig = () =>
    `<p class="sig">${esc(site.credit.label)}: `
    + `<a href="${site.credit.url}" target="_blank" rel="noopener">${esc(site.credit.name)}</a></p>`;

  /** Pie de las paginas que scrollean. La firma sale solo en about. */
  const pageFoot = (lang, path, { firma = false } = {}) =>
    `<footer class="foot">${firma ? sig() : ''}${langs(lang, path)}</footer>`;

  const foot = () => `</body>\n</html>\n`;

  /* ---------- paginas ---------- */
  function landing(lang) {
    return head({
      lang, path: '', vel: 1, entrar: url(lang, 'work/'),
      title: `${site.name} — ${t(site.tagline, lang)}`,
      desc: t(site.tagline, lang),
      image: ogSitio(),
      jsonld: {
        '@context':'https://schema.org', '@type':'Person',
        name: site.name, url: abs(lang),
        jobTitle: t(site.tagline, lang), email: `mailto:${site.email}`,
        address: { '@type':'PostalAddress', addressLocality:'Barcelona', addressCountry:'ES' },
      },
    })
    + `<main class="landing">
  <div class="hero">
    <div class="eye" id="eye">
      <div class="lens">
        <span class="shape" aria-hidden="true"></span>
        <span class="pupil" id="pupil" aria-hidden="true"></span>
      </div>
      <h1 class="name">${esc(site.name)}</h1>
    </div>
    <p class="pista">${esc(t(site.ui.enter, lang))}</p>
  </div>
  ${langs(lang, '')}
</main>
<script type="module" src="${raiz('/js/welcome.js')}"></script>`
    + foot();
  }

  function workIndex(lang) {
    const tags = [...new Set(live.flatMap(p => p.tags || []))];

    // La lista va en el HTML siempre: es lo que lee Google y lo que queda si
    // no corre JavaScript. El tunel se construye leyendo esta misma lista.
    const rows = live.map(p => {
      const portada = cover(p);
      return `      <li data-tags="${esc((p.tags || []).join(' '))}"
          data-date="${esc(p.date)}" data-client="${esc(String(p.client || '').toLowerCase())}" data-title="${esc(String(p.title).toLowerCase())}">
        <a href="${url(lang, 'work/' + p.slug + '/')}"${portada ? ` data-peek="${raiz('/' + esc(portada.src))}"` : ''}>
          <span class="t">${titleHtml(p.title)}<small>${esc(t(p.subheader, lang))}</small></span>
          <span class="c">${esc(fmtDate(p.date))}</span>
          <span class="g">${esc((p.tags || []).join(' '))}</span>
        </a>
      </li>`;
    }).join('\n');

    /** Menu desplegable. El boton ensena el valor puesto; al abrirlo salen
        todas las opciones, incluida la activa, que va marcada. */
    const menu = (id, etiqueta, opciones) => `      <div class="menu" data-menu="${id}">
        <button type="button" class="cabeza" aria-expanded="false" aria-haspopup="true">
          <span class="et">${esc(etiqueta)}</span><span class="val"></span>
        </button>
        <div class="opciones" role="menu" hidden>
${opciones.map(([v, l], i) => `          <button type="button" role="menuitemradio" data-v="${esc(v)}"
            aria-checked="${i === 0}">${esc(l)}</button>`).join('\n')}
        </div>
      </div>`;

    const orden  = [['date', t(site.ui.byDate, lang)], ['client', t(site.ui.byClient, lang)],
                    ['title', t(site.ui.byTitle, lang)]];
    const filtro = [['', t(site.ui.all, lang)], ...tags.map(g => [g, g])];

    return head({
      lang, path: 'work/',
      // La vista por defecto ya viene puesta en el HTML: si la pusiera el
      // guion, la lista entera se pintaria y desapareceria al cargar.
      vista: 'tunel',
      title: `work — ${site.shortName}`,
      desc: t(site.tagline, lang),
      image: ogSitio(),
      jsonld: {
        '@context':'https://schema.org', '@type':'CollectionPage',
        name:'work', url: abs(lang, 'work/'),
        hasPart: live.map(p => ({ '@type':'CreativeWork', name:p.title, url: abs(lang, 'work/' + p.slug + '/') })),
      },
    })
    + `<div class="topbar">
  ${nav(lang, 'work')}
  <div class="controles">
    <div class="vistas" role="group" aria-label="${esc(t(site.ui.aria.view, lang))}">
      <button type="button" data-vista="tunel" aria-pressed="true">${esc(t(site.ui.tunnel, lang))}</button>
      <button type="button" data-vista="lista" aria-pressed="false">${esc(t(site.ui.list, lang))}</button>
    </div>
${menu('sort', t(site.ui.sort, lang), orden)}
${menu('tag', '', filtro)}
  </div>
</div>

<main class="wrap">
  <h1 class="sr">${esc(t(site.nav[1].label, lang))}</h1>

  <!-- vista tunel -->
  <div class="escena" id="escena">
    <div class="tunel" id="tunel"></div>
  </div>

  <!-- vista lista -->
  <ul class="index" id="index">
${rows}
  </ul>
</main>

<footer class="tiempo" id="tiempo">
  <a class="rotulo" id="rotulo" href=""></a>
  <div class="barra" id="barra"><div class="marcas" id="marcas"></div></div>
</footer>

<div class="peek" id="peek" aria-hidden="true"><img src="" alt=""></div>
${pageFoot(lang, 'work/')}
<script type="module" src="${raiz('/js/work.js')}"></script>
<script type="module" src="${raiz('/js/tunnel.js')}"></script>`
    + foot();
  }

  function projectPage(p, lang, prev, next) {
    const desc = t(p.description, lang);
    const sub  = t(p.subheader, lang);
    const archivos = (p.media || []).map(m => enCarpeta(p, m));

    const media = archivos.map((m, i) =>
      `      <figure>${mediaTag(m, p, sub, i)}</figure>`).join('\n');

    const roles = Object.entries(p.credits || {});
    const credits = roles.length ? `    <section class="credits">
      <h2>${esc(t(site.ui.credits, lang))}</h2>
      <dl>
${roles.map(([role, people]) =>
  `        <div class="row"><dt>${esc(role)}</dt> <dd>${linkHandles(people)}</dd></div>`).join('\n')}
      </dl>
    </section>` : '';

    const og = ogImage(p);
    return head({
      lang, path: `work/${p.slug}/`,
      title: `${p.title} — ${sub} — ${site.shortName}`,
      desc: metaDesc(desc),
      image: og,
      jsonld: {
        '@context':'https://schema.org', '@type':'CreativeWork',
        name: p.title, headline: p.title, abstract: sub,
        description: metaDesc(desc),
        datePublished: p.date,
        url: abs(lang, `work/${p.slug}/`),
        inLanguage: lang === 'cat' ? 'ca' : lang,
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
    + `${nav(lang, 'work')}
<main class="project">
  <div class="side">
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
      ${p.link ? `<a class="watch" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(t(site.ui.watch, lang))} →</a>` : ''}
    </div>
${credits}
  </div>

  <div class="media">
${media || '      <!-- sin material grafico todavia -->'}
  </div>

  <nav class="pager" aria-label="${esc(t(site.ui.aria.projects, lang))}">
    ${prev ? `<a href="${url(lang, 'work/' + prev.slug + '/')}">← ${esc(prev.title)}</a>` : '<span></span>'}
    ${next ? `<a class="r" href="${url(lang, 'work/' + next.slug + '/')}">${esc(next.title)} →</a>` : '<span></span>'}
  </nav>
</main>
${pageFoot(lang, `work/${p.slug}/`)}
<script type="module" src="${raiz('/js/media.js')}"></script>`
    + foot();
  }

  function aboutPage(lang) {
    const ps = site.about[lang] || site.about[DEF];
    return head({
      lang, path: 'about/',
      title: `about — ${site.shortName}`,
      desc: metaDesc(ps[0]),
      jsonld: {
        '@context':'https://schema.org', '@type':'AboutPage',
        url: abs(lang, 'about/'),
        mainEntity: { '@type':'Person', name: site.name, description: metaDesc(ps[0]),
                      email:`mailto:${site.email}`, url: site.baseUrl },
      },
    })
    + `${nav(lang, 'about')}
<main class="about">
  <h1>${esc(site.name)}</h1>
${ps.map(x => `  <p>${esc(x)}</p>`).join('\n')}
  <p class="contact"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a> ·
     <a href="${igUrl(site.instagram)}" target="_blank" rel="noopener">${esc(site.instagram)}</a></p>
</main>
${pageFoot(lang, 'about/', { firma: true })}`
    + foot();
  }

  /* ---------- el mapa del sitio ----------
     Cada pagina con su ruta y la funcion que la pinta. El build las escribe
     todas; la vista previa busca la que se ha pedido y pinta solo esa. */
  function rutas() {
    const r = [];
    for (const lang of LANGS) {
      r.push({ ruta: ruta(lang),          pintar: () => landing(lang) });
      r.push({ ruta: ruta(lang, 'work/'), pintar: () => workIndex(lang) });
      r.push({ ruta: ruta(lang, 'about/'), pintar: () => aboutPage(lang) });
      live.forEach((p, i) => r.push({
        ruta: ruta(lang, `work/${p.slug}/`), fecha: p.date,
        pintar: () => projectPage(p, lang, live[i - 1], live[i + 1]),
      }));
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
    const EXT = /\.(jpe?g|png|webp|gif|avif|mp4|webm)$/i;

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
        if (!EXT.test(f)) aviso(quien, `"${m}": formato que la web no sabe ensenar (usa webp, jpg, png, gif, webm o mp4)`);
        else if (!existe(f)) aviso(quien, `no encuentro ${f}`);
      }
    });
    return avisos;
  }

  return { live, rutas, revisar, raiz, abs, LANGS, DEF, enCarpeta, poster, fuentes };
}
