/* ============================================================
   media.mjs — deja las carpetas img/ de projects/ listas para la web
   ------------------------------------------------------------
   Los mismos ajustes que imgToWeb y videoToWeb, para que de igual
   si un fichero se convierte alli o aqui:

     fotos   jpg / png  ->  webp calidad 85, 2000 px como mucho
     gif                ->  video webm: pesa una fraccion
     video   mp4 / mov  ->  webm, preset 720p (1280x720 max, techo
                            1200 kbps), sin audio: en la web van mudos

   videoToWeb usa VP8 porque VP9 revienta la memoria del navegador;
   aqui, con ffmpeg de verdad, se usa VP9, que a igual techo se ve
   mejor. De cada video queda ademas:

     <nombre>.poster.webp  un fotograma, lo que se ve antes de que cargue

   El original (mp4, mov) se borra: la web usa solo el webm, que es lo
   mismo que sale de videoToWeb. Con --mp4 se deja ademas un mp4 de
   respaldo para iPhones anteriores a iOS 17.4, que no leen webm (sin el
   ven el poster quieto). La web lo usa solo si esta.

   En el JSON los ficheros van sin extension ("3"), asi que pasar
   3.jpg a 3.webp no obliga a tocar ningun project.json.

   Reejecutable: salta lo que ya esta hecho. Con --rehacer vuelve a
   codificar los webm desde el mp4.

   Necesita:  brew install ffmpeg webp
       npm run media
   ============================================================ */
import { existsSync, statSync, rmSync, readdirSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = join(ROOT, 'projects');
const REHACER = process.argv.includes('--rehacer');
const MP4 = process.argv.includes('--mp4');

/* ---- los ajustes (los de imgToWeb y videoToWeb) ---- */
const FOTO_CALIDAD  = 85;
const FOTO_MAX      = 2000;
const VIDEO_MAX_W   = 1280;
const VIDEO_MAX_H   = 720;
const VIDEO_TECHO   = '1200k';
const VIDEO_CRF     = 32;        // VP9: 0 (mejor) a 63
const POSTER_CALIDAD = 80;

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

const derivado = f => /\.(thumb|poster)\.[a-z0-9]+$/i.test(f);

const escala = `scale='min(${VIDEO_MAX_W},iw)':'min(${VIDEO_MAX_H},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;
/** El mp4 de respaldo: h264 mudo, al preset de 720p. */
const aMp4 = (de, a) => run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', de, '-an',
  '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', escala,
  '-c:v', 'libx264', '-crf', '26', '-maxrate', '1600k', '-bufsize', '3200k', '-preset', 'slow', a]);

/* ---------- 1. fotos -> webp ---------- */
for (const f of ficheros(PROJECTS).filter(f => /\/img\//.test(f)).filter(f => /\.(jpe?g|png)$/i.test(f) && !derivado(f))) {
  const out = f.replace(/\.(jpe?g|png)$/i, '.webp');
  if (!existsSync(out)) {
    const [w, h] = probe(f, 'stream=width,height').split(',').map(Number);
    const tam = Math.max(w, h) > FOTO_MAX
      ? (w >= h ? ['-resize', String(FOTO_MAX), '0'] : ['-resize', '0', String(FOTO_MAX)]) : [];
    run('cwebp', ['-q', String(FOTO_CALIDAD), ...tam, '-m', '6', '-mt', '-quiet', f, '-o', out]);
    log('foto', out, `${kb(f)} -> ${kb(out)}`);
  }
  rmSync(f);
}

/* ---------- 2. gif -> video ---------- */
for (const f of ficheros(PROJECTS).filter(f => /\/img\//.test(f)).filter(f => /\.gif$/i.test(f))) {
  const out = f.replace(/\.gif$/i, '.mp4');
  if (!existsSync(out)) {
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', f, '-an', '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p', '-vf', escala, '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', out]);
    log('gif', out, `${kb(f)} -> ${kb(out)}`);
  }
  rmSync(f);
}

/* ---------- 3. videos ---------- */
const bases = new Set(ficheros(PROJECTS).filter(f => /\/img\//.test(f))
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
    renameSync(tmp, webm);
    log('mudo', webm, kb(webm));
  }

  // mp4 de respaldo, solo con --mp4: desde el original si es otro formato, o desde el webm
  if (MP4 && (origen && origen !== mp4 && !existsSync(mp4) || !origen && !existsSync(mp4))) {
    aMp4(origen || webm, mp4);
    log('mp4', mp4, kb(mp4));
  } else if (MP4 && REHACER && origen === mp4) {
    // el respaldo tambien al preset, pero solo si de verdad baja
    const tmp = b + '.tmp.mp4';
    aMp4(mp4, tmp);
    if (statSync(tmp).size < statSync(mp4).size * .9) {
      log('mp4', mp4, `${kb(mp4)} -> ${kb(tmp)}`);
      renameSync(tmp, mp4);
    } else rmSync(tmp);
  }
  if (origen && (origen !== mp4 || !MP4)) rmSync(origen);   // el mp4 se queda solo con --mp4

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

/* Las miniaturas de las portadas (<nombre>.thumb.webp, 720 px) ya no van
   aqui: las hace el build con sharp, fuera del repo (build/build.mjs). */
console.log('listo');
