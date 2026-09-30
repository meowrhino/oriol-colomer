/* ============================================================
   build.mjs — Jamstack sin dependencias.
   Lee data/*.json y escribe HTML plano, uno por proyecto e idioma.
   Las plantillas viven en paginas.mjs, que es el mismo fichero que
   usa la vista previa de Live Server: aqui solo se le dice como
   mirar el disco y se escribe lo que devuelve.
       node build/build.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearSitio, leerJSON } from './paginas.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = join(ROOT, 'dist');
const leer = f => leerJSON(readFileSync(join(ROOT, f), 'utf8'), f);

let site, proyectos;
try {
  site = leer('data/site.json');
  proyectos = leer('data/projects.json');
} catch (e) {
  // En GitHub esto es lo que sale en rojo en la pestana Actions: que se
  // entienda sin saber programar.
  console.error('\n✗ ' + e.message + '\n');
  process.exit(1);
}

/* Subcarpeta en la que se sirve el sitio. En GitHub Pages es el nombre del
   repo; en un dominio propio, cadena vacia. Se puede forzar con BASE=... */
const base = process.env.BASE ?? site.base ?? '';

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

const sitio = crearSitio({
  site, proyectos, base, medidas,
  existe: rel => existsSync(join(ROOT, rel)),
  peso: rel => statSync(join(ROOT, rel)).size,
});

/* ---------- escribir ------------------------------------ */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const dir of ['css', 'js', 'assets', 'media']) {
  if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), join(OUT, dir), { recursive: true });
}

const rutas = sitio.rutas();
for (const r of rutas) {
  const file = join(OUT, r.ruta, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, r.pintar());
}

/* sitemap + robots, del mismo JSON */
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const publica = r => site.baseUrl.replace(/\/$/, '') + base.replace(/\/$/, '') + r.ruta;
writeFileSync(join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${NS}">\n`
  + rutas.map(r =>
      `  <url><loc>${publica(r)}</loc>${r.fecha ? `<lastmod>${r.fecha}</lastmod>` : ''}</url>`).join('\n')
  + `\n</urlset>\n`);

writeFileSync(join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl.replace(/\/$/, '')}${sitio.raiz('/sitemap.xml')}\n`);
writeFileSync(join(OUT, '.nojekyll'), '');
if (site.domain) writeFileSync(join(OUT, 'CNAME'), site.domain + '\n');

console.log(`${rutas.length} paginas · ${sitio.live.length} proyectos publicados de ${proyectos.length}`
  + `${sitio.labs.length ? ` · ${sitio.labs.length} en el lab` : ''} · ${sitio.LANGS.length} idiomas`);
const borradores = proyectos.filter(p => !p.published).map(p => p.slug);
if (borradores.length) console.log(`borradores (published:false): ${borradores.join(', ')}`);

/* Los avisos no paran el build —una foto que falta no justifica dejar la
   web sin actualizar—, pero salen bien visibles en el log de Actions. */
const avisos = sitio.revisar();
for (const a of avisos) console.warn(`⚠ ${a.quien}: ${a.texto}`);
