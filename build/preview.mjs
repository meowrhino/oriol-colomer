/* ============================================================
   preview.mjs — la web entera sin build, para Live Server
   ------------------------------------------------------------
   Live Server (la extension de VS Code) sirve la carpeta tal cual,
   y la web de verdad no existe hasta que el build la escribe en
   dist/. Esto la pinta al vuelo: lee data/*.json, pregunta al
   servidor que ficheros hay en media/ y escribe la pagina pedida
   con las mismas plantillas que el build (paginas.mjs).

   Las paginas son una sola, el index.html de la raiz, y la ruta
   va en ?p=:   /?p=/es/work/la-roda-ouineta/

   Lo que no cuadra en los JSON (una foto que no esta, una fecha
   mal escrita...) lo dice el build: npm run build.
   ============================================================ */
import { crearSitio, leerJSON, unir, esc } from './paginas.mjs';

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
h1{font-weight:400;font-size:28px;margin:0 0 .6em;color:#b3261e}p{max-width:62ch}code{background:#eee;padding:.1em .3em}</style>
</head><body><h1>${esc(titulo)}</h1><p>${esc(texto)}</p>
<p>Arreglalo, guarda, y esta pagina se recarga sola.</p></body></html>`);
}

async function arrancar() {
  let site, proyectos;
  try {
    site      = leerJSON(await pedir('data/site.json'), 'data/site.json');
    proyectos = unir(leerJSON(await pedir('data/work.json'), 'data/work.json'),
                     leerJSON(await pedir('data/lab.json'), 'data/lab.json'));
  } catch (e) {
    pantallaDeError(e.json ? 'Hay un error en un JSON' : 'No puedo leer los datos', e.message);
    return;
  }

  let pedida = new URLSearchParams(location.search).get('p') || '/';
  if (!pedida.startsWith('/')) pedida = '/' + pedida;
  if (!pedida.endsWith('/')) pedida += '/';

  /* Un borrador (published:false) no tiene pagina en la web, pero aqui si
     se puede ver entrando a su direccion: sirve para repasarlo antes de
     publicarlo. Se pinta como si estuviera publicado y se avisa. */
  const slug = (/\/(?:work|lab)\/([^/]+)\/$/.exec(pedida) || [])[1];
  const borrador = slug && proyectos.find(p => p && p.slug === slug && p.published === false);
  const datos = borrador
    ? proyectos.map(p => (p === borrador ? { ...p, published: true } : p))
    : proyectos;

  /* Las plantillas preguntan "¿existe este fichero?" de forma sincrona, y
     al servidor solo se le puede preguntar de forma asincrona. Asi que se
     pinta en seco, apuntando lo que se pregunta; se pregunta todo de una
     vez al servidor, y se repite hasta que no quedan preguntas nuevas
     (una respuesta puede abrir otra: si hay poster, ¿hay miniatura?). */
  const montar = existe => crearSitio({ site, proyectos: datos, base: BASE, existe,
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

  escribir(pagina.pintar());
}

arrancar().catch(e => pantallaDeError('La vista previa ha fallado', e.message));
