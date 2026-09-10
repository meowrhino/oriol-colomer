/* Servidor de desarrollo.
   Sirve dist/, vigila los fuentes, regenera al vuelo y recarga la pestana.
   Solo para trabajar: en produccion lo hace GitHub Actions.
       node build/serve.mjs                */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { execFile } from 'node:child_process';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = 4321;

const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.png':'image/png',
  '.jpg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.webp':'image/webp',
  '.mp4':'video/mp4', '.webm':'video/webm', '.ttf':'font/ttf', '.otf':'font/otf',
  '.xml':'application/xml', '.txt':'text/plain' };

/* --- recarga: la pagina abre un SSE y se refresca cuando le llega algo --- */
const clients = new Set();
const RELOAD = `<script>new EventSource('/__reload').onmessage=()=>location.reload()</script>`;

let building = false, pending = false;
const build = () => {
  if (building) { pending = true; return; }
  building = true;
  // En local se sirve en la raiz: sin subcarpeta, al reves que en Pages.
  execFile('node', [join(ROOT, 'build/build.mjs')], { env: { ...process.env, BASE: '' } },
    (err, out, errOut) => {
    building = false;
    console.log(err ? '✗ ' + (errOut || err.message).trim() : '· ' + out.trim().split('\n')[0]);
    for (const c of clients) c.write('data: go\n\n');
    if (pending) { pending = false; build(); }
  });
};

let timer;
for (const dir of ['data','css','js','build','assets']) {
  watch(join(ROOT, dir), { recursive: true }, (_e, f) => {
    if (f && (f.endsWith('.html') || f.startsWith('.'))) return;
    clearTimeout(timer); timer = setTimeout(build, 120);   // agrupa rafagas de guardado
  });
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);

  if (path === '/__reload') {
    res.writeHead(200, { 'content-type':'text/event-stream', 'cache-control':'no-cache',
                         'connection':'keep-alive' });
    res.write('\n'); clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let file = join(DIST, path);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); }
  catch { file = join(DIST, path, 'index.html'); }

  try {
    const ext = extname(file);
    let body = await readFile(file);
    if (ext === '.html') body = body.toString().replace('</body>', RELOAD + '</body>');
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream',
                         'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
    res.end('404 ' + path);
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}  (recarga automatica activa)`));
