/* ============================================================
   preview.mjs — la web entera sin build, para Live Server
   ------------------------------------------------------------
   Live Server (la extension de VS Code) sirve la carpeta tal cual,
   y la web de verdad no existe hasta que el build la escribe en
   dist/. Esto la pinta al vuelo: lee data/*.json y los project.json,
   pregunta al servidor que ficheros hay en projects/ y escribe la pagina pedida
   con las mismas plantillas que el build (paginas.mjs).

   Las paginas son una sola, el index.html de la raiz, y la ruta
   va en ?p=:   /?p=/es/work/la-roda-ouineta/

   Lo que no cuadra en los JSON (una foto que no esta, una fecha
   mal escrita...) lo dice el build: npm run build.
   ============================================================ */
import { crearSitio, leerJSON, juntar, entradas, validar, esc } from './paginas.mjs';

/* La carpeta en la que esta el index.html: normalmente la raiz, pero si
   Live Server se abre desde una carpeta de mas arriba, sera una subcarpeta. */
const BASE = location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');

const pedir = async ruta => {
  const r = await fetch(`${BASE}/${ruta}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`no encuentro ${ruta}`);
  return r.text();
};

/* ¿Existe este fichero? Se pregunta al servidor con HEAD, que no baja el
   fichero, y se recuerda la respuesta. De paso, cuanto pesa. */
const hay = new Map(), pesos = new Map();
const preguntar = rutas => Promise.all([...rutas].filter(r => !hay.has(r)).map(async r => {
  try {
    const res = await fetch(`${BASE}/${encodeURI(r)}`, { method: 'HEAD', cache: 'no-store' });
    hay.set(r, res.ok);
    pesos.set(r, +res.headers.get('content-length') || null);
  } catch { hay.set(r, false); }
}));

function escribir(html) {
  document.open();
  document.write(html);
  document.close();
}

function pantallaDeError(titulo, texto) {
  escribir(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>vista previa — error</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:clamp(24px,6vw,80px);font:16px/1.5 Helvetica,Arial,sans-serif;background:#fafafa;color:#4f4f4f}
h1{font-weight:400;font-size:28px;margin:0 0 .6em;color:#b3261e}p{max-width:62ch;white-space:pre-line}code{background:#eee;padding:.1em .3em}</style>
</head><body><h1>${esc(titulo)}</h1><p>${esc(texto)}</p>
<p>Arreglalo, guarda, y esta pagina se recarga sola.</p></body></html>`);
}

async function arrancar() {
  let pedida = new URLSearchParams(location.search).get('p') || '/';
  if (!pedida.startsWith('/')) pedida = '/' + pedida;
  if (!pedida.endsWith('/')) pedida += '/';

  let site, about, datos;
  try {
    site  = leerJSON(await pedir('data/site.json'), 'data/site.json');
    about = leerJSON(await pedir('data/about.json'), 'data/about.json');
    /* El navegador no puede listar la carpeta projects/: se leen los de las
       listas. Un borrador (en projects/ pero en ninguna lista) no tiene
       pagina en la web, pero aqui si se puede ver entrando a su direccion:
       sirve para repasarlo antes de publicarlo. Se pinta como si estuviera
       en la lista de su seccion. */
    const [, sec, slug] = /\/(work|lab)\/([^/]+)\/$/.exec(pedida) || [];
    const listas = Object.values(site.lists || {}).flatMap(l => entradas(l).map(e => e.slug));
    if (slug && !listas.includes(slug)) {
      const l = site.lists?.[sec] || { name: sec, projects: [] };
      site = { ...site, lists: { ...site.lists, [sec]: { ...l, projects: [...l.projects, slug] } } };
    }
    const slugs = [...new Set(Object.values(site.lists || {}).flatMap(l => entradas(l).map(e => e.slug)))]
      .filter(s => typeof s === 'string');
    const proyectos = await Promise.all(slugs.map(async s => {
      const f = `projects/${s}/project.json`;
      try { return { ...leerJSON(await pedir(f), f), slug: s }; }
      catch (e) { if (e.json) throw e; return null; }   // sin carpeta: lo dice el build
    }));
    datos = juntar(site, proyectos.filter(Boolean));

    /* Lo mismo que comprueba el build con schema/: un campo mal escrito o del
       tipo que no es (en VS Code, subrayado en rojo). */
    const esquemas = {};
    for (const t of ['site', 'about', 'project']) {
      try { esquemas[t] = JSON.parse(await pedir(`schema/${t}.json`)); } catch { /* sin esquema, sin mirar */ }
    }
    const mirar = (d, t, f) => (esquemas[t] ? validar(d, esquemas[t], f) : []);
    const errores = [...mirar(site, 'site', 'data/site.json'), ...mirar(about, 'about', 'data/about.json'),
      ...proyectos.filter(Boolean).flatMap(({ slug, ...p }) => mirar(p, 'project', `projects/${slug}/project.json`))];
    if (errores.length) {
      pantallaDeError('Hay algo mal en un JSON', errores.join('\n'));
      return;
    }
  } catch (e) {
    pantallaDeError(e.json ? 'Hay un error en un JSON' : 'No puedo leer los datos', e.message);
    return;
  }

  /* Las plantillas preguntan "¿existe este fichero?" de forma sincrona, y
     al servidor solo se le puede preguntar de forma asincrona. Asi que se
     pinta en seco, apuntando lo que se pregunta; se pregunta todo de una
     vez al servidor, y se repite hasta que no quedan preguntas nuevas
     (una respuesta puede abrir otra: si hay poster, ¿hay miniatura?). */
  const montar = existe => crearSitio({ site, about, proyectos: datos, base: BASE, existe,
    peso: r => pesos.get(r), preview: true });
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const nuevas = new Set();
    const sitio = montar(r => (hay.has(r) ? hay.get(r) : (nuevas.add(r), false)));
    sitio.revisar();
    sitio.rutas().find(r => r.ruta === pedida)?.pintar();
    if (!nuevas.size) break;
    await preguntar(nuevas);
  }

  const sitio = montar(r => hay.get(r) === true);
  const pagina = sitio.rutas().find(r => r.ruta === pedida);

  if (!pagina) {
    pantallaDeError('Esta pagina no existe',
      `No hay ninguna pagina en ${pedida}. Si es un proyecto, mira que el slug este bien escrito.`);
    return;
  }

  /* Lo mismo que mira el build: lo grave (una foto que no esta…) no se
     publicaria, asi que aqui sale en vez de la pagina; los avisos, en una
     franja arriba, para verlos antes de subir. */
  const avisos = sitio.revisar();
  const graves = avisos.filter(a => a.grave);
  if (graves.length) {
    pantallaDeError('Esto no se publicaria', graves.map(a => `${a.quien}: ${a.texto}`).join('\n'));
    return;
  }
  escribir(pagina.pintar());
  // la pagina recien escrita aun se esta montando: la franja, cuando haya <body>
  const franja = html => (document.body ? document.body.insertAdjacentHTML('afterbegin', html)
    : document.addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('afterbegin', html), { once: true }));
  if (avisos.length) franja(
    `<div style="position:fixed;inset:0 0 auto;z-index:20;padding:8px 12px;background:#fff3c4;color:#5c4400;`
    + `font:13px/1.4 Helvetica,Arial,sans-serif;max-height:30vh;overflow:auto">`
    + avisos.map(a => `⚠ ${esc(a.quien)}: ${esc(a.texto)}`).join('<br>')
    + ` <button onclick="this.parentNode.remove()" style="font:inherit">cerrar</button></div>`);
}

arrancar().catch(e => pantallaDeError('La vista previa ha fallado', e.message));
