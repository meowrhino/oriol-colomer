/* ============================================================
   build.mjs — Jamstack sin dependencias.
   Lee data/*.json y projects/<slug>/project.json y escribe HTML plano,
   uno por proyecto e idioma.
   Las plantillas viven en paginas.mjs, que es el mismo fichero que
   usa la vista previa de Live Server: aqui solo se le dice como
   mirar el disco y se escribe lo que devuelve.
       node build/build.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearSitio, leerJSON, juntar, youtube } from './paginas.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = join(ROOT, 'dist');
const leer = f => leerJSON(readFileSync(join(ROOT, f), 'utf8'), f);

/* Un proyecto, una carpeta: cada carpeta de projects/ con su project.json */
const slugs = readdirSync(join(ROOT, 'projects'), { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(ROOT, 'projects', d.name, 'project.json')))
  .map(d => d.name);

let site, about, proyectos;
try {
  site = leer('data/site.json');
  about = leer('data/about.json');
  proyectos = juntar(site, slugs.map(slug => ({ ...leer(`projects/${slug}/project.json`), slug })));
} catch (e) {
  // En GitHub esto es lo que sale en rojo en la pestana Actions: que se
  // entienda sin saber programar.
  console.error('\n✗ ' + e.message + '\n');
  process.exit(1);
}

/* Donde se publica, segun donde se construye (JAMstack, patrones.md §5): en
   la Action de GitHub (nuestra copia), meowrhino.github.io/oriol-colomer/ y
   sin indexar; en cualquier otro sitio (Cloudflare, la copia de Oriol), la
   raiz y el dominio de site.json → "url", y se indexa si lo hay. */
const github = process.env.GITHUB_ACTIONS === 'true';
const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'meowrhino/oriol-colomer').split('/');
const base = github ? `/${repo}` : '';
const origen = github ? `https://${owner}.github.io` : String(site.url || '').replace(/\/$/, '');
const indexar = !github && !!site.url;

/** Ancho y alto reales de una imagen, leidos de la cabecera del fichero.
    Van al <img> para que el navegador reserve el hueco antes de que baje la
    imagen: sin ellos la columna de media crece de golpe con cada foto.
    Treinta lineas de leer bytes en vez de una dependencia. */
const medidasCache = new Map();
function medidas(rel) {
  if (medidasCache.has(rel)) return medidasCache.get(rel);
  let r = null;
  try {
    const b = readFileSync(join(ROOT, rel));
    if (b[0] === 0xFF && b[1] === 0xD8) {                 // jpeg
      let o = 2;
      while (o + 9 < b.length) {
        if (b[o] !== 0xFF) { o++; continue; }             // resincronizar
        const m = b[o + 1];
        if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { o += 2; continue; }
        const len = b.readUInt16BE(o + 2);
        // SOF de verdad: C4 es la tabla Huffman, C8 una extension y CC el
        // codificador aritmetico. Ninguno de los tres trae medidas.
        if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
          r = { w: b.readUInt16BE(o + 7), h: b.readUInt16BE(o + 5) };
          break;
        }
        o += 2 + len;
      }
    } else if (b.readUInt32BE(0) === 0x89504E47) {        // png
      r = { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    } else if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      // webp: tres variantes de cabecera, cada una guarda el tamano a su manera
      const tipo = b.toString('ascii', 12, 16);
      if (tipo === 'VP8X') r = { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
      else if (tipo === 'VP8 ') r = { w: b.readUInt16LE(26) & 0x3FFF, h: b.readUInt16LE(28) & 0x3FFF };
      else if (tipo === 'VP8L') {
        const v = b.readUInt32LE(21);
        r = { w: 1 + (v & 0x3FFF), h: 1 + ((v >> 14) & 0x3FFF) };
      }
    }
  } catch { /* fichero ausente o ilegible: se sigue sin medidas */ }
  medidasCache.set(rel, r);
  return r;
}

/* Los fotogramas de los videos de YouTube se bajan al publicar y se sirven
   desde la web: quien abre un proyecto no le pide nada a Google hasta que le
   da al play. maxresdefault no existe en todos los videos; hqdefault, si.
   Si no se puede bajar (sin red, YouTube caido), se pide a YouTube como antes. */
const miniaturas = new Map();   // id -> bytes del jpg
const ids = new Set(proyectos.filter(p => p?.published).map(p => youtube(p.url)).filter(Boolean));
await Promise.all([...ids].map(async id => {
  for (const q of ['maxresdefault', 'hqdefault']) {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${id}/${q}.jpg`, { signal: AbortSignal.timeout(15000) });
      if (r.ok) return miniaturas.set(id, Buffer.from(await r.arrayBuffer()));
    } catch { /* se prueba la siguiente, o se queda en YouTube */ }
  }
}));
const YT = id => `media/youtube/${id}.jpg`;

/* La imagen para compartir (og:image): 1200x630 en JPG, que es lo que
   esperan WhatsApp, Instagram y compania. Las fotos horizontales llenan el
   recuadro (recortando lo que sobra); las verticales caben enteras, sobre el
   fondo de la web. La hace el build con sharp (npm ci) en .cache/og/, con un
   nombre segun la foto, y solo la rehace si la foto cambia. Sin sharp se
   comparte la foto tal cual y se avisa. Las plantillas piden la og mientras
   pintan, y sharp va aparte: una primera pasada apunta cuales hacen falta,
   se hacen, y se pinta. */
const ogNom = rel => createHash('sha1').update(rel).digest('hex').slice(0, 12) + '.jpg';
const ogHechas = new Map();   // foto → og/<nom>.jpg, las que estan
async function hacerOgs(rels) {
  let sharp = null;
  for (const rel of rels) {
    if (!existsSync(join(ROOT, rel))) continue;
    const cache = join(ROOT, '.cache', 'og', ogNom(rel));
    if (!(existsSync(cache) && statSync(cache).mtimeMs >= statSync(join(ROOT, rel)).mtimeMs)) {
      try {
        sharp ??= (await import('sharp')).default;
        const m = medidas(rel);
        mkdirSync(dirname(cache), { recursive: true });
        await sharp(join(ROOT, rel))
          .resize(1200, 630, m && m.w / m.h >= 1.2 ? { fit: 'cover' } : { fit: 'contain', background: '#fafafa' })
          .flatten({ background: '#fafafa' }).jpeg({ quality: 85, mozjpeg: true }).toFile(cache);
      } catch (e) {
        console.warn(`⚠ sin sharp (${e.code || e.message}): al compartir sale la foto tal cual. Se arregla con: npm ci`);
        return;
      }
    }
    ogHechas.set(rel, `og/${ogNom(rel)}`);
  }
}

const opciones = {
  site, about, proyectos, base, origen, indexar, medidas,
  miniaturaYT: id => (miniaturas.has(id) ? YT(id) : null),
  existe: rel => existsSync(join(ROOT, rel)),
  peso: rel => statSync(join(ROOT, rel)).size,
};
const hacen = new Set();
const prueba = crearSitio({ ...opciones, og: rel => (hacen.add(rel), null) });
for (const r of prueba.rutas()) r.pintar();
await hacerOgs(hacen);
const sitio = crearSitio({ ...opciones, og: rel => ogHechas.get(rel) ?? null });

/* ---------- escribir ------------------------------------ */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const dir of ['css', 'js', 'assets']) {
  if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), join(OUT, dir), { recursive: true });
}
// las fotos y videos de cada proyecto, en el mismo sitio que en el repo; el
// project.json no, que ya va dentro del HTML
for (const slug of slugs) {
  const img = join(ROOT, 'projects', slug, 'img');
  if (existsSync(img)) cpSync(img, join(OUT, 'projects', slug, 'img'), { recursive: true });
}
cpSync(join(ROOT, '_headers'), join(OUT, '_headers'));   // la cache, en Cloudflare
mkdirSync(join(OUT, 'og'), { recursive: true });
for (const o of ogHechas.values()) cpSync(join(ROOT, '.cache', 'og', o.slice(3)), join(OUT, o), { recursive: true });
mkdirSync(join(OUT, 'media/youtube'), { recursive: true });
for (const [id, bytes] of miniaturas) writeFileSync(join(OUT, YT(id)), bytes);

const rutas = sitio.rutas();
for (const r of rutas) {
  const file = join(OUT, r.ruta, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, r.pintar());
}

/* sitemap + robots, del mismo JSON */
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
writeFileSync(join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${NS}">\n`
  + rutas.filter(r => !r.oculto).map(r =>
      `  <url><loc>${sitio.publica(r.ruta)}</loc>${r.fecha ? `<lastmod>${r.fecha}</lastmod>` : ''}</url>`).join('\n')
  + `\n</urlset>\n`);

// En github.io, o sin dominio en site.json, la web es de prueba: no se indexa.
writeFileSync(join(OUT, 'robots.txt'), indexar
  ? `User-agent: *\nAllow: /\nSitemap: ${sitio.publica('/sitemap.xml')}\n`
  : 'User-agent: *\nDisallow: /\n');
// GitHub Pages ensena esta en cualquier direccion que no existe
writeFileSync(join(OUT, '404.html'), sitio.noEncontrada());
writeFileSync(join(OUT, '.nojekyll'), '');
/* El catalan iba en /cat/ y ahora va en /ca/, el codigo de verdad: las
   direcciones viejas se quedan como paginas que llevan a las nuevas. */
for (const r of rutas.filter(r => r.ruta.startsWith('/ca/'))) {
  const nueva = sitio.publica(r.ruta);
  const file = join(OUT, 'cat' + r.ruta.slice(3), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex">`
    + `<link rel="canonical" href="${nueva}"><meta http-equiv="refresh" content="0; url=${nueva}">`
    + `<a href="${nueva}">${nueva}</a>\n`);
}

console.log(`${rutas.length} paginas · ${sitio.live.length} proyectos publicados de ${proyectos.length}`
  + `${sitio.labs.length ? ` · ${sitio.labs.length} en el lab` : ''} · ${sitio.LANGS.length} idiomas`);
const ocultos = proyectos.filter(p => p.oculto).map(p => p.slug);
if (ocultos.length) console.log(`ocultos (con pagina, sin salir en la web): ${ocultos.join(', ')}`);
const borradores = proyectos.filter(p => !p.published).map(p => p.slug);
if (borradores.length) console.log(`borradores (en projects/ pero en ninguna lista): ${borradores.join(', ')}`);

/* Los avisos no paran el build —una foto que falta no justifica dejar la
   web sin actualizar—, pero salen bien visibles en el log de Actions. */
const avisos = sitio.revisar();
for (const a of avisos) console.warn(`⚠ ${a.quien}: ${a.texto}`);
