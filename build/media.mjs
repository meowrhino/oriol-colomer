/* ============================================================
   media.mjs — deja media/ lista para la web
   ------------------------------------------------------------
   Los mismos ajustes que imgToWeb y videoToWeb, para que de igual
   si un fichero se convierte alli o aqui:

     fotos   jpg / png  ->  webp calidad 85, 2000 px como mucho
     gif                ->  video (webm + mp4): pesa una fraccion
     video   mp4 / mov  ->  webm, preset 720p (1280x720 max, techo
                            1200 kbps), sin audio: en la web van mudos

   videoToWeb usa VP8 porque VP9 revienta la memoria del navegador;
   aqui, con ffmpeg de verdad, se usa VP9, que a igual techo se ve
   mejor. De cada video queda ademas:

     <nombre>.mp4          respaldo para iPhones antiguos sin webm
     <nombre>.poster.webp  un fotograma, lo que se ve antes de que cargue

   Y de la portada de cada proyecto, una miniatura:

     <nombre>.thumb.webp   720 px, lo que pintan el tunel y la lista

   Si un fichero cambia de nombre (foto.jpg -> foto.webp), se
   corrige tambien en data/projects.json.

   Reejecutable: salta lo que ya esta hecho. Con --rehacer vuelve a
   codificar los webm desde el mp4.

   Necesita:  brew install ffmpeg webp
       npm run media
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, statSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = join(ROOT, 'media');
const REHACER = process.argv.includes('--rehacer');

/* ---- los ajustes (los de imgToWeb y videoToWeb) ---- */
const FOTO_CALIDAD  = 85;
const FOTO_MAX      = 2000;
const VIDEO_MAX_W   = 1280;
const VIDEO_MAX_H   = 720;
const VIDEO_TECHO   = '1200k';
const VIDEO_CRF     = 32;        // VP9: 0 (mejor) a 63
const POSTER_CALIDAD = 80;
const THUMB_ANCHO   = 720;       // el doble de lo que se ve, por las pantallas retina
const THUMB_CALIDAD = 82;

for (const [bin, arg] of [['ffmpeg', '-version'], ['ffprobe', '-version'], ['cwebp', '-version']]) {
  try { execFileSync(bin, [arg], { stdio: 'ignore' }); }
  catch { console.error(`falta ${bin}. Instalalo con:  brew install ffmpeg webp`); process.exit(1); }
}

const run = (bin, args) => execFileSync(bin, args, { stdio: ['ignore', 'ignore', 'inherit'] });
const kb  = f => Math.round(statSync(f).size / 1024) + ' KB';
const rel = f => relative(ROOT, f);
const log = (que, f, extra = '') => console.log(`${que.padEnd(8)} ${rel(f).padEnd(72)} ${extra}`);

const probe = (f, campos) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
  '-show_entries', campos, '-of', 'csv=p=0', f]).toString().trim();
const tieneAudio = f => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a',
  '-show_entries', 'stream=index', '-of', 'csv=p=0', f]).toString().trim() !== '';

const ficheros = dir => readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.name.startsWith('.') ? [] : d.isDirectory() ? ficheros(join(dir, d.name)) : [join(dir, d.name)]);

/** Lo que cambia de nombre, para corregir el JSON al final. */
const renombres = new Map();
const derivado = f => /\.(thumb|poster)\.[a-z0-9]+$/i.test(f);

const escala = `scale='min(${VIDEO_MAX_W},iw)':'min(${VIDEO_MAX_H},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;

/* ---------- 1. fotos -> webp ---------- */
for (const f of ficheros(MEDIA).filter(f => /\.(jpe?g|png)$/i.test(f) && !derivado(f))) {
  const out = f.replace(/\.(jpe?g|png)$/i, '.webp');
  if (!existsSync(out)) {
    const [w, h] = probe(f, 'stream=width,height').split(',').map(Number);
    const tam = Math.max(w, h) > FOTO_MAX
      ? (w >= h ? ['-resize', String(FOTO_MAX), '0'] : ['-resize', '0', String(FOTO_MAX)]) : [];
    run('cwebp', ['-q', String(FOTO_CALIDAD), ...tam, '-m', '6', '-mt', '-quiet', f, '-o', out]);
    log('foto', out, `${kb(f)} -> ${kb(out)}`);
  }
  rmSync(f);
  renombres.set(rel(f), rel(out));
}

/* ---------- 2. gif -> video ---------- */
for (const f of ficheros(MEDIA).filter(f => /\.gif$/i.test(f))) {
  const out = f.replace(/\.gif$/i, '.mp4');
  if (!existsSync(out)) {
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', f, '-an', '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p', '-vf', escala, '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', out]);
    log('gif', out, `${kb(f)} -> ${kb(out)}`);
  }
  rmSync(f);
  renombres.set(rel(f), rel(f).replace(/\.gif$/i, '.webm'));   // el webm sale en el paso 3
}

/* ---------- 3. videos ---------- */
const bases = new Set(ficheros(MEDIA)
  .filter(f => /\.(mp4|mov|m4v|webm)$/i.test(f) && !derivado(f))
  .map(f => f.replace(/\.(mp4|mov|m4v|webm)$/i, '')));

for (const b of bases) {
  const origen = ['.mp4', '.mov', '.m4v'].map(e => b + e).find(existsSync);
  const webm = b + '.webm', mp4 = b + '.mp4';

  // webm desde el original. Un webm que ya venia (de videoToWeb, por
  // ejemplo) no se toca, salvo para quitarle el audio: en la web no suena.
  if (origen && (REHACER || !existsSync(webm))) {
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', origen, '-an', '-vf', escala,
      '-c:v', 'libvpx-vp9', '-crf', String(VIDEO_CRF), '-b:v', VIDEO_TECHO,
      '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', webm]);
    log('webm', webm, `${kb(origen)} -> ${kb(webm)}`);
  } else if (existsSync(webm) && tieneAudio(webm)) {
    const tmp = b + '.sin-audio.webm';
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', webm, '-an', '-c', 'copy', tmp]);
    rmSync(webm); run('mv', [tmp, webm]);
    log('mudo', webm, kb(webm));
  }

  // mp4 de respaldo: desde el original si es otro formato, o desde el webm
  if (origen && origen !== mp4 && !existsSync(mp4) || !origen && !existsSync(mp4)) {
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', origen || webm, '-an',
      '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', escala,
      '-c:v', 'libx264', '-crf', '26', '-maxrate', '1600k', '-bufsize', '3200k', '-preset', 'slow', mp4]);
    log('mp4', mp4, kb(mp4));
  } else if (REHACER && origen === mp4) {
    // el respaldo tambien al preset, pero solo si de verdad baja
    const tmp = b + '.tmp.mp4';
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', mp4, '-an',
      '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', escala,
      '-c:v', 'libx264', '-crf', '26', '-maxrate', '1600k', '-bufsize', '3200k', '-preset', 'slow', tmp]);
    if (statSync(tmp).size < statSync(mp4).size * .9) {
      log('mp4', mp4, `${kb(mp4)} -> ${kb(tmp)}`);
      rmSync(mp4); run('mv', [tmp, mp4]);
    } else rmSync(tmp);
  }
  if (origen && origen !== mp4) { rmSync(origen); renombres.set(rel(origen), rel(webm)); }
  if (origen === mp4) renombres.set(rel(mp4), rel(webm));      // el JSON apunta al webm

  // poster: un fotograma, en webp. El de medio segundo y no el primero,
  // que en los clips cortados suele salir negro o a medio fundido.
  const poster = b + '.poster.webp';
  if (!existsSync(poster)) {
    const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'csv=p=0', webm]).toString()) || 0;
    const tmp = b + '.poster.tmp.png';
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-ss', String(Math.min(.5, dur / 2)),
      '-i', webm, '-frames:v', '1', tmp]);
    run('cwebp', ['-q', String(POSTER_CALIDAD), '-m', '6', '-quiet', tmp, '-o', poster]);
    rmSync(tmp);
    log('poster', poster, kb(poster));
  }
  if (existsSync(b + '.poster.jpg')) rmSync(b + '.poster.jpg');
}

/* ---------- 4. el JSON ---------- */
const JSON_F = join(ROOT, 'data/projects.json');
const proyectos = JSON.parse(readFileSync(JSON_F, 'utf8'));
const enCarpeta = (p, m) => {
  const s = m.trim().replace(/^\/+/, '');
  return s.startsWith('media/') ? s : `media/${p.slug}/${s}`;
};
let tocados = 0;
for (const p of proyectos) {
  const arreglar = m => {
    const nuevo = renombres.get(enCarpeta(p, m));
    if (!nuevo) return m;
    tocados++;
    // se respeta como estaba escrito: con la ruta entera, o relativo a la carpeta
    return m.trim().replace(/^\/+/, '').startsWith('media/') ? nuevo : nuevo.slice(`media/${p.slug}/`.length);
  };
  if (p.media) p.media = p.media.map(arreglar);
  if (p.thumb) p.thumb = arreglar(p.thumb);
}
if (tocados) {
  writeFileSync(JSON_F, JSON.stringify(proyectos, null, 2) + '\n');
  console.log(`projects.json: ${tocados} rutas corregidas`);
}

/* ---------- 5. miniaturas de las portadas ----------
   La misma regla que cover() en paginas.mjs: "thumb" si lo hay, y si no
   el primer fichero; si es un video, su poster. Se hacen tambien las de
   los borradores: el dia que se publican ya estan. */
const portada = p => {
  const m = p.thumb || p.media?.[0];
  if (!m) return null;
  const f = enCarpeta(p, m);
  if (!/\.(mp4|webm)$/i.test(f)) return f;
  const pj = f.replace(/\.(mp4|webm)$/i, '.poster.webp');
  return existsSync(join(ROOT, pj)) ? pj : null;
};
for (const f of [...new Set(proyectos.map(portada).filter(Boolean))]) {
  const src = join(ROOT, f);
  const out = src.replace(/\.(jpe?g|png|webp|gif)$/i, '.thumb.webp');
  if (!existsSync(src) || out === src || existsSync(out)) continue;
  run('cwebp', ['-q', String(THUMB_CALIDAD), '-resize', String(THUMB_ANCHO), '0', '-m', '6', '-quiet', src, '-o', out]);
  // Si no baja al menos un 15%, no compensa: se usa el original
  if (statSync(out).size > statSync(src).size * .85) { rmSync(out); continue; }
  log('thumb', out, `${kb(src)} -> ${kb(out)}`);
}
console.log('listo');
