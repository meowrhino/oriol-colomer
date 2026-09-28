/* ============================================================
   Lo poco que comparten los cuatro guiones de la pagina.
   Existe porque sin el se repetia: la consulta de movimiento
   reducida estaba escrita cuatro veces, y la interpolacion dos.
   ============================================================ */

/** El sistema pide que no haya movimiento. Se mira una vez al cargar,
    igual que antes: un cambio de ajuste a media sesion no se recoge. */
export const seco = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Deja `v` dentro de [a, b]. */
export const lim = (v, a, b) => Math.min(b, Math.max(a, v));

/** Interpolacion lineal entre a y b. */
export const mez = (a, b, t) => a + (b - a) * t;

/** Smoothstep: 0 antes de a, 1 despues de b, y una S por el medio. Sirve
    para las caidas que no pueden tener esquinas —la sombra del tunel entra
    y sale con esto— porque una rampa lineal se nota al empezar y al acabar. */
export const suave = (a, b, x) => {
  const t = lim((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Una medida del CSS en milisegundos, para que los tiempos vivan en un
    sitio solo: `--parpadeo: 300ms` se escribe en la hoja y se lee aqui. */
export const ms = nombre => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return v.endsWith('ms') ? parseFloat(v) : (parseFloat(v) || 0) * 1000;
};

/** La portada de un proyecto, tal como la deja el generador en la lista:
    data-peek es la imagen fija y data-peek-video, si la portada se mueve,
    las fuentes del video separadas por |. Devuelve el elemento a pintar:
    un <video> mudo en bucle con la imagen de poster, o un <img>. */
export function portada(a) {
  const img = a.dataset.peek || '', video = a.dataset.peekVideo;
  if (video && !seco) {
    const v = document.createElement('video');
    v.muted = v.loop = v.playsInline = v.autoplay = true;
    v.setAttribute('muted', '');                   // Safari lo quiere tambien como atributo
    v.preload = 'auto';
    if (img) v.poster = img;
    for (const src of video.split('|')) {
      const s = document.createElement('source');
      s.src = src; s.type = src.endsWith('.webm') ? 'video/webm' : 'video/mp4';
      v.append(s);
    }
    return v;
  }
  if (!img) { const s = document.createElement('span'); s.className = 'sin'; return s; }
  const i = new Image();
  i.src = img; i.alt = ''; i.draggable = false; i.decoding = 'async';
  return i;
}

/** Un numero del CSS ya calculado, en px. Sirve para no repetir en el JS
    valores que el CSS ya declara —la perspectiva del tunel, por ejemplo—
    y que si se copian acaban discrepando. */
export const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]) || 0;
