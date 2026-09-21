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

/** Un numero del CSS ya calculado, en px. Sirve para no repetir en el JS
    valores que el CSS ya declara —la perspectiva del tunel, por ejemplo—
    y que si se copian acaban discrepando. */
export const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]) || 0;
