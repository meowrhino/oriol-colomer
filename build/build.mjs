/* ============================================================
   build.mjs — Jamstack sin dependencias.
   Lee data/*.json y escribe HTML plano, uno por proyecto e idioma.
   El cliente solo toca los JSON: esto no se abre nunca.
       node build/build.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = join(ROOT, 'dist');
const read = f => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));

const site = read('data/site.json');
const all  = read('data/projects.json');
const live = all.filter(p => p.published);          // FET? = FALSE no se publica
const LANGS = site.langs;
const DEF   = site.defaultLang;

/* Subcarpeta en la que se sirve el sitio. En GitHub Pages es el nombre del
   repo; en un dominio propio, cadena vacia. Se puede forzar con BASE=... */
const B = (process.env.BASE ?? site.base ?? '').replace(/\/$/, '');
/** Prefija una ruta absoluta del sitio con esa subcarpeta. */
const raiz = p => (B + (p.startsWith('/') ? p : '/' + p));

/* ---------- utilidades ---------------------------------- */
const esc = s => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const t  = (obj, l) => (obj && (obj[l] || obj[DEF])) || '';
// prefijo de idioma: el idioma por defecto vive en la raiz, los otros en /es/ y /cat/
const pre = l => (l === DEF ? '' : `/${l}`);
const url = (l, path='') => B + `${pre(l)}/${path}`.replace(/\/{2,}/g,'/');
const abs = p => site.baseUrl.replace(/\/$/,'') + p;   // p ya trae la subcarpeta

const fmtDate = (iso, l) => {
  const [y,m,d] = iso.split('-');
  return l === 'en' ? `${d}/${m}/${y}` : `${d}/${m}/${y}`;   // mismo formato que la ficha original
};

/** Corta el texto en parrafos por linea en blanco. */
const paras = txt => String(txt).split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

/** El titulo lleva la @ en un span para poder darle su propio gris. */
const titleHtml = tt => esc(tt).replace(/\s@\s/, ' <span class="at">@</span> ');

/** 155 caracteres limpios para la meta description. */
const metaDesc = txt => {
  const flat = String(txt).replace(/\s+/g,' ').trim();
  return flat.length <= 155 ? flat : flat.slice(0, 152).replace(/\s+\S*$/,'') + '…';
};

const igUrl = h => `https://instagram.com/${h.replace(/^@/,'')}`;

const isVideo = m => /\.(mp4|webm)$/i.test(m);
/** Fotograma de un video, generado por build/video.sh. */
const poster  = m => m.replace(/\.mp4$/i, '.poster.jpg');
/** Primer fichero del proyecto: es la portada, sin campo aparte.
    Si es un video se usa su poster, que es lo que cabe en un <img>. */
const cover   = p => {
  const m = p.media[0];
  if (!m) return null;
  if (!isVideo(m)) return m;
  const pj = poster(m);
  return existsSync(join(ROOT, pj)) ? pj : (p.media.find(x => !isVideo(x)) || null);
};
/** Para og:image hace falta una imagen de verdad, no un mp4. */
const ogImage = p => p.media.find(m => !isVideo(m)) || null;

/** Los @handle del texto de creditos se enlazan solos a Instagram. */
const linkHandles = txt => esc(txt).replace(/@[\w.\-_]+/g,
  h => `<a href="${igUrl(h)}" target="_blank" rel="noopener">${h}</a>`);

/** Un item de media: imagen, o video en bucle mudo sin controles.
    Del video se ofrecen los dos formatos y elige el navegador: primero
    el webm, que casi siempre pesa menos, y el mp4 como respaldo. El JSON
    solo guarda el mp4 — el webm se detecta aqui si el fichero existe. */
const mediaTag = (m, p, sub, i) => {
  const label = `${esc(p.title)} — ${esc(sub)}`;
  if (!isVideo(m)) {
    return `<img src="${raiz('/' + esc(m))}" alt="${label}"
      loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">`;
  }
  const webm = m.replace(/\.mp4$/i, '.webm');
  const has  = existsSync(join(ROOT, webm));
  const pj = poster(m);
  return `<video autoplay muted loop playsinline
      ${existsSync(join(ROOT, pj)) ? `poster="${raiz('/' + esc(pj))}"` : ''}
      preload="${i < 2 ? 'auto' : 'none'}" aria-label="${label}">`
    + (has ? `<source src="${raiz('/' + esc(webm))}" type="video/webm">` : '')
    + `<source src="${raiz('/' + esc(m))}" type="video/mp4"></video>`;
};

/* ---------- parciales ----------------------------------- */
function head({ lang, title, desc, path, image, jsonld, anim, entrar }) {
  const alts = LANGS.map(l =>
    `<link rel="alternate" hreflang="${l === 'cat' ? 'ca' : l}" href="${abs(url(l, path))}">`
  ).join('\n  ');
  return `<!doctype html>
<html lang="${lang === 'cat' ? 'ca' : lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${abs(url(lang, path))}">
  ${alts}
  <link rel="alternate" hreflang="x-default" href="${abs(url(DEF, path))}">
  <meta property="og:type" content="${path.startsWith('work/') && path !== 'work/' ? 'article' : 'website'}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${abs(url(lang, path))}">
  <meta property="og:site_name" content="${esc(site.shortName)}">
  <meta property="og:locale" content="${lang === 'cat' ? 'ca_ES' : lang === 'es' ? 'es_ES' : 'en_GB'}">
  ${image ? `<meta property="og:image" content="${abs(raiz('/' + image))}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="theme-color" content="#fafafa">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='16' fill='%23a6a6a6'/%3E%3C/svg%3E">
  <link rel="preload" as="font" type="font/ttf" href="${raiz('/assets/fonts/helvetica.ttf')}" crossorigin>
  <link rel="stylesheet" href="${raiz('/css/style.css')}">
  ${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body${entrar ? ` data-entrar="${entrar}"` : ''}>
<canvas class="dots" id="bg" data-anim="${anim ? 1 : 0}" aria-hidden="true"></canvas>
<script src="${raiz('/js/bg.js')}"></script>`;
}

function nav(lang, current, variant = 'inline') {
  const item = n => {
    const label = esc(t(n.label, lang));
    if (!n.href) return `<span class="off" title="soon">${label}</span>`;      // lab
    const href = url(lang, n.href.replace(/^\//,''));
    return n.id === current
      ? `<a href="${href}" aria-current="page">${label}</a>`
      : `<a href="${href}">${label}</a>`;
  };
  // En la landing solo van los tres destinos; 'home' es la propia pagina.
  if (variant === 'spread') {
    const [, w, a, l] = site.nav;
    return `<nav class="nav nav--spread">${item(w)}<span class="mid">${item(a)}</span>${item(l)}</nav>`;
  }
  return `<nav class="nav nav--inline">`
       + site.nav.map(item).join('<span class="sep">/</span>')
       + `</nav>`;
}

function langs(lang, path) {
  // Sin separadores y sin adornos: los separa el espacio y el activo se
  // distingue por peso. El dingbat de la referencia se cae — en el png
  // se lee como un icono, pero como texto sale como un simbolo suelto.
  return `<nav class="langs" aria-label="idioma">`
    + LANGS.map(l => l === lang
        ? `<span aria-current="true">${l}</span>`
        : `<a href="${url(l, path)}" hreflang="${l === 'cat' ? 'ca' : l}">${l}</a>`
      ).join('')
    + `</nav>`;
}

const sig = () =>
  `<p class="sig">${esc(site.credit.label)}: `
  + `<a href="${site.credit.url}" target="_blank" rel="noopener">${esc(site.credit.name)}</a></p>`;

/** Pie de pagina: idiomas y firma.
    En la landing van anclados a las esquinas, que la pagina cabe entera.
    En las que scrollean van al final, o se comen el contenido. */
const pageFoot = (lang, path, fixed = false) => fixed
  ? langs(lang, path) + sig()
  : `<footer class="foot">${sig()}${langs(lang, path)}</footer>`;

const foot = () => `</body>\n</html>\n`;

/* ---------- paginas ------------------------------------- */
function landing(lang) {
  return head({
    lang, path: '', anim: true, entrar: url(lang, 'work/'),
    title: `${site.name} — ${t(site.tagline, lang)}`,
    desc: t(site.tagline, lang),
    image: ogImage(live[0]),
    jsonld: {
      '@context':'https://schema.org', '@type':'Person',
      name: site.name, url: abs(url(lang)),
      jobTitle: t(site.tagline, lang), email: `mailto:${site.email}`,
      address: { '@type':'PostalAddress', addressLocality:'Barcelona', addressCountry:'ES' },
    },
  })
  + `<main class="landing">
  <div class="hero">
    <div class="eye" id="eye">
      <div class="lens">
        <!-- El contorno viene en blanco sobre transparente, asi que va de
             mascara y el color lo pone el CSS. -->
        <span class="shape" aria-hidden="true"></span>
        <img class="pupil" id="pupil" src="${raiz('/assets/eye_pupil.png')}" alt="" width="70" height="70">
      </div>
      <h1 class="name">${esc(site.name)}</h1>
    </div>
    <p class="pista">${esc(t(site.ui.enter, lang))}</p>
  </div>
  ${langs(lang, '')}
</main>
<script src="${raiz('/js/welcome.js')}" defer></script>`
  + foot();
}

function workIndex(lang) {
  const tags = [...new Set(live.flatMap(p => p.tags))];

  // La lista va en el HTML siempre: es lo que lee Google y lo que queda si
  // no corre JavaScript. El tunel se construye leyendo esta misma lista,
  // asi que filtro y orden valen igual en las dos vistas.
  const rows = live.map(p => `      <li data-tags="${esc(p.tags.join(' '))}"
          data-date="${p.date}" data-client="${esc(p.client.toLowerCase())}" data-title="${esc(p.title.toLowerCase())}">
        <a href="${url(lang, 'work/' + p.slug + '/')}"${cover(p) ? ` data-peek="${raiz('/' + esc(cover(p)))}"` : ''}>
          <span class="t">${titleHtml(p.title)}<small>${esc(t(p.subheader, lang))}</small></span>
          <span class="c">${esc(fmtDate(p.date, lang))}</span>
          <span class="g">${esc(p.tags.join(' '))}</span>
        </a>
      </li>`).join('\n');

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
    lang, path: 'work/', anim: false,
    title: `work — ${site.shortName}`,
    desc: t(site.tagline, lang),
    image: ogImage(live[0]),
    jsonld: {
      '@context':'https://schema.org', '@type':'CollectionPage',
      name:'work', url: abs(url(lang,'work/')),
      hasPart: live.map(p => ({ '@type':'CreativeWork', name:p.title, url: abs(url(lang,'work/'+p.slug+'/')) })),
    },
  })
  + `<div class="topbar">
  ${nav(lang, 'work')}
  <!-- Los mismos controles en las dos vistas: solo cambia como se pinta
       la lista debajo, no como se manda sobre ella. -->
  <div class="controles">
    <div class="vistas" role="group" aria-label="vista">
      <button type="button" data-vista="tunel" aria-pressed="true">${esc(t(site.ui.tunnel, lang))}</button>
      <button type="button" data-vista="lista" aria-pressed="false">${esc(t(site.ui.list, lang))}</button>
    </div>
${menu('sort', t(site.ui.sort, lang), orden)}
${menu('tag', '', filtro)}
  </div>
</div>

<main class="wrap">
  <!-- vista tunel -->
  <div class="escena" id="escena">
    <div class="tunel" id="tunel"></div>
  </div>

  <!-- vista lista -->
  <ul class="index" id="index">
${rows}
  </ul>
</main>

<!-- Linea del tiempo: sin raya, solo los proyectos. Cada uno cae donde
     le toca por fecha, no a intervalos iguales. -->
<footer class="tiempo" id="tiempo">
  <span class="rotulo" id="rotulo"></span>
  <div class="barra" id="barra"><div class="marcas" id="marcas"></div></div>
</footer>

<div class="peek" id="peek" aria-hidden="true"><img src="" alt=""></div>
${pageFoot(lang, 'work/')}
<script src="${raiz('/js/work.js')}" defer></script>
<script src="${raiz('/js/tunnel.js')}" defer></script>`
  + foot();
}

function projectPage(p, lang, prev, next) {
  const desc = t(p.description, lang);
  const sub  = t(p.subheader, lang);

  const media = p.media.map((m, i) =>
    `      <figure>${mediaTag(m, p, sub, i)}</figure>`).join('\n');

  const roles = Object.entries(p.credits);
  const credits = roles.length ? `    <section class="credits">
      <h2>${esc(t(site.ui.credits, lang))}</h2>
      <dl>
${roles.map(([role, people]) =>
  `        <div class="row"><dt>${esc(role)}</dt> <dd>${linkHandles(people)}</dd></div>`).join('\n')}
      </dl>
    </section>` : '';

  return head({
    lang, path: `work/${p.slug}/`,
    title: `${p.title} — ${sub} — ${site.shortName}`,
    desc: metaDesc(desc),
    image: ogImage(p),
    jsonld: {
      '@context':'https://schema.org', '@type':'CreativeWork',
      name: p.title, headline: p.title, abstract: sub,
      description: metaDesc(desc),
      datePublished: p.date,
      url: abs(url(lang, `work/${p.slug}/`)),
      inLanguage: lang === 'cat' ? 'ca' : lang,
      creator: { '@type':'Person', name: site.name, url: site.baseUrl },
      about: p.client,
      keywords: p.tags.join(', '),
      ...(ogImage(p) ? { image: abs(raiz('/' + ogImage(p))) } : {}),
      ...(p.link  ? { sameAs: [p.link] } : {}),
      contributor: roles.flatMap(([, people]) =>
        (people.match(/@[\w.\-_]+/g) || []).map(h =>
          ({ '@type':'Person', name: h, sameAs: igUrl(h) }))),
    },
  })
  + `${nav(lang, 'work')}
<main class="project">
  <!-- El orden del DOM es el de movil: titulo, media, creditos.
       En escritorio .side vuelve a ser columna y la media sube al lado. -->
  <div class="side">
    <div class="info">
      <h1 class="title">${titleHtml(p.title)}</h1>
      <div class="meta">
        <span class="d">${esc(fmtDate(p.date, lang))}</span>
        <span class="c">${esc(p.client)}</span>
        <span class="g">${esc(p.tags.join(' '))}</span>
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

  <nav class="pager" aria-label="proyectos">
    ${prev ? `<a href="${url(lang,'work/'+prev.slug+'/')}">← ${esc(prev.title)}</a>` : '<span></span>'}
    ${next ? `<a class="r" href="${url(lang,'work/'+next.slug+'/')}">${esc(next.title)} →</a>` : '<span></span>'}
  </nav>
</main>
${pageFoot(lang, `work/${p.slug}/`)}`
  + foot();
}

function aboutPage(lang) {
  const ps = site.about[lang] || site.about[DEF];
  return head({
    lang, path: 'about/',
    title: `about — ${site.shortName}`,
    desc: metaDesc(ps[0]),
    jsonld: {
      '@context':'https://schema.org','@type':'AboutPage',
      url: abs(url(lang,'about/')),
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
${pageFoot(lang, 'about/')}`
  + foot();
}

/* ---------- escribir ------------------------------------ */
const write = (path, html) => {
  const file = join(OUT, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const dir of ['css','js','assets','media']) {
  if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), join(OUT, dir), { recursive: true });
}

let n = 0;
for (const lang of LANGS) {
  const base = lang === DEF ? '' : lang;
  write(join(base),          landing(lang));   n++;
  write(join(base,'work'),   workIndex(lang)); n++;
  write(join(base,'about'),  aboutPage(lang)); n++;
  live.forEach((p, i) => {
    write(join(base,'work',p.slug), projectPage(p, lang, live[i-1], live[i+1]));
    n++;
  });
}

/* sitemap + robots, del mismo JSON */
const urls = [];
for (const lang of LANGS) {
  urls.push([url(lang), null]);
  urls.push([url(lang,'work/'), null]);
  urls.push([url(lang,'about/'), null]);
  for (const p of live) urls.push([url(lang,`work/${p.slug}/`), p.date]);
}
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
writeFileSync(join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${NS}">\n`
  + urls.map(([u, d]) =>
      `  <url><loc>${abs(u)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')
  + `\n</urlset>\n`);

writeFileSync(join(OUT,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${abs(raiz('/sitemap.xml'))}\n`);
writeFileSync(join(OUT,'.nojekyll'), '');

console.log(`${n} paginas · ${live.length} proyectos publicados de ${all.length} · ${LANGS.length} idiomas`);
console.log(`borradores (published:false): ${all.filter(p=>!p.published).map(p=>p.slug).join(', ')}`);
