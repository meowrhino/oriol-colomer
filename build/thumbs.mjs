/* ============================================================
   thumbs.mjs — la miniatura de cada portada, en WebP
   ------------------------------------------------------------
   El tunel y la vista previa del raton pintan la portada a 360 px
   como mucho, y se estaban bajando los originales: ocho fotos de
   hasta 2048 px, 1,7 MB, en la pagina que mas se visita.

   Aqui sale un `<nombre>.thumb.webp` de 720 px de ancho (el doble,
   para pantalla retina) al lado del original. En WebP y no en JPEG
   porque a igual vista pesa la mitad larga: las ocho portadas son
   363 KB en JPEG de calidad 70 y 151 KB en WebP de calidad 82 —que
   ademas se ve mejor, no peor.

   El generador la prefiere si existe y si no usa el original, asi
   que esto nunca es obligatorio: es solo mas ligero.

   Necesita `cwebp`:  brew install webp
   Se ejecuta con `npm run media`, junto a lo demas. Reejecutable:
   salta lo que ya esta hecho.
       node build/thumbs.mjs
   ============================================================ */
import { readFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT   = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANCHO  = 720;
const CALIDAD = 82;

try {
  execFileSync('cwebp', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('falta cwebp. Instalalo con:  brew install webp');
  process.exit(1);
}

const isVideo = m => /\.(mp4|webm)$/i.test(m);
const poster  = m => m.replace(/\.mp4$/i, '.poster.jpg');

/* La misma regla que cover() en build.mjs: el primer fichero es la
   portada, y si es un video, su poster. */
const portada = p => {
  const m = p.media?.[0];
  if (!m) return null;
  if (!isVideo(m)) return m;
  const pj = poster(m);
  return existsSync(join(ROOT, pj)) ? pj : (p.media.find(x => !isVideo(x)) || null);
};

const proyectos = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8'));

/* Se hacen las de todos, tambien las de los borradores: el dia que uno se
   publica ya esta lista, sin acordarse de volver a pasar esto. */
const covers = [...new Set(proyectos.map(portada).filter(Boolean))];

const kb = f => Math.round(statSync(f).size / 1024) + ' KB';
let hechas = 0, saltadas = 0;

for (const rel of covers) {
  const src = join(ROOT, rel);
  if (!existsSync(src)) { console.log(`falta     ${rel}`); continue; }

  const out = src.replace(/\.(jpe?g|png|webp)$/i, '.thumb.webp');
  if (out === src) { console.log(`no es imagen  ${rel}`); continue; }
  if (existsSync(out)) { saltadas++; continue; }

  // -resize A 0 fija el ancho y deja que el alto salga solo, sin deformar.
  // Una imagen mas estrecha que ANCHO no se amplia: cwebp solo reduce.
  execFileSync('cwebp', ['-q', String(CALIDAD), '-resize', String(ANCHO), '0',
                         '-m', '6', '-quiet', src, '-o', out]);

  /* Un original ya muy comprimido puede no mejorar al reencodarlo. Si la
     miniatura no baja al menos un 15%, se tira: no ahorra y estorba. */
  if (statSync(out).size > statSync(src).size * .85) {
    rmSync(out);
    console.log(`${basename(rel).padEnd(50)} ${kb(src).padStart(8)} -> no compensa`);
    saltadas++;
    continue;
  }
  console.log(`${basename(rel).padEnd(50)} ${kb(src).padStart(8)} -> ${kb(out).padStart(7)}`);
  hechas++;
}
console.log(`${hechas} miniaturas nuevas, ${saltadas} ya estaban o no hacian falta`);
