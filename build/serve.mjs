/* Servidor estatico minimo para previsualizar dist/ en local.
   Resuelve /ruta/ -> /ruta/index.html, como hace cualquier host Jamstack. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = 4321;
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml',
  '.ttf':'font/ttf', '.otf':'font/otf', '.xml':'application/xml', '.txt':'text/plain' };

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(DIST, p);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch { file = join(DIST, p, 'index.html'); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404 ' + p);
  }
}).listen(PORT, () => console.log('http://localhost:' + PORT));
