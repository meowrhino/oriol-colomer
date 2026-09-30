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

   Encima de la pagina sale un recuadro con lo que no cuadra en
   los JSON: una foto que no esta, una fecha mal escrita... Es lo
   que hay que mirar antes de subir nada.
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

/** El recuadro de la vista previa: dice que esto no es la web publicada y
    lista los avisos de los JSON. Va dentro de un shadow root para que ni
    el CSS de la web le afecte ni el suyo se escape a la web. */
function recuadro(avisos, extra) {
  const lista = avisos.map(a => `<li><b>${esc(a.quien)}</b> ${esc(a.texto)}</li>`).join('');
  const estado = avisos.length
    ? `${avisos.length} aviso${avisos.length > 1 ? 's' : ''} en los JSON`
    : 'los JSON estan bien';
  const contenido = `<style>
  :host{all:initial}
  .caja{position:fixed;left:12px;bottom:12px;z-index:2147483647;max-width:min(560px,calc(100vw - 24px));
    font:12px/1.45 Helvetica,Arial,sans-serif;color:#4f4f4f;background:#fff;border:1px solid #e2e2e2;
    box-shadow:0 6px 20px rgba(0,0,0,.08)}
  summary{cursor:pointer;padding:6px 10px;list-style:none;display:flex;gap:8px;align-items:center}
  summary::-webkit-details-marker{display:none}
  .p{width:8px;height:8px;border-radius:50%;background:${avisos.length ? '#e0a100' : '#3a9d5d'}}
  ul{margin:0;padding:4px 10px 10px 26px;max-height:40vh;overflow:auto}
  li{margin:.2em 0} b{font-weight:600} .x{padding:0 10px 8px;color:#8a8a8a}
</style>
<details class="caja"${avisos.length || extra ? ' open' : ''}>
  <summary><span class="p"></span>vista previa local · ${estado}</summary>
  ${extra ? `<div class="x">${extra}</div>` : ''}
  ${lista ? `<ul>${lista}</ul>` : ''}
</details>`;
  return `<div id="vista-previa"></div><script>
  (function(){var h=document.getElementById('vista-previa').attachShadow({mode:'open'});
  h.innerHTML=${JSON.stringify(contenido)};})();
</script>`;
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
  // Con el borrador que se esta viendo dentro: asi tambien se revisan sus
  // ficheros, que es justo lo que se quiere mirar antes de publicarlo
  const avisos = sitio.revisar();

  if (!pagina) {
    pantallaDeError('Esta pagina no existe',
      `No hay ninguna pagina en ${pedida}. Si es un proyecto, mira que el slug este bien escrito.`);
    return;
  }

  const extra = borrador
    ? `Este proyecto es un borrador ("published": false): aqui se ve, pero en la web no sale hasta ponerlo a true.`
    : '';
  escribir(pagina.pintar().replace('</body>', recuadro(avisos, extra) + '</body>'));
}

arrancar().catch(e => pantallaDeError('La vista previa ha fallado', e.message));
