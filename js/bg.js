/* Fondo generativo.
   Una trama de puntos sobre blanco, como el halftone de la referencia,
   pero con el radio de cada punto sacado de un mapa de altura: ruido
   fractal, el mismo procedimiento con el que se generan terrenos.
   El mapa se desplaza, asi que por la pantalla cruzan olas de relieve.

   Debajo de cierta altura no se dibuja nada: eso da los claros vacios
   que tiene la imagen original, y hace que el relieve se lea como islas
   apareciendo y deshaciendose.

   En la landing se anima. En el resto de paginas se pinta un fotograma
   y se para: mientras se lee, el fondo no debe moverse.              */
(() => {
  const cv = document.getElementById('bg');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d', { alpha: true });

  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches
              || cv.dataset.anim !== '1';

  const PASO   = 21;     // separacion de la rejilla, en px CSS
  const R_MAX  = 2.7;    // radio del punto mas alto
  const NIVEL  = .46;    // por debajo de esta altura no hay punto
  const ESCALA = .0034;  // cuanto se estira el relieve: mas bajo, olas mas largas
  const DERIVA = 26;     // px/s que avanza el mapa hacia la izquierda
  const SUBIDA = .045;   // cuanto muta el relieve por segundo
  const FPS    = 30;

  /* ---- ruido de valor en 3D --------------------------------------
     Hash entero -> interpolacion suave entre los ocho vertices de la
     celda. Sumando dos octavas sale el relieve con detalle.          */
  const hash = (i, j, k) => {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const suave = t => t * t * t * (t * (t * 6 - 15) + 10);
  const mezcla = (a, b, t) => a + (b - a) * t;

  function ruido(x, y, z) {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
    const u = suave(x - i), v = suave(y - j), w = suave(z - k);
    const c = (di, dj, dk) => hash(i + di, j + dj, k + dk);
    return mezcla(
      mezcla(mezcla(c(0,0,0), c(1,0,0), u), mezcla(c(0,1,0), c(1,1,0), u), v),
      mezcla(mezcla(c(0,0,1), c(1,0,1), u), mezcla(c(0,1,1), c(1,1,1), u), v), w);
  }
  /* dos octavas: la primera pone las montanas, la segunda las arruga */
  const relieve = (x, y, z) => ruido(x, y, z) * .68 + ruido(x * 2.3, y * 2.3, z * 1.7) * .32;

  /* ---- dibujo ---------------------------------------------------- */
  let an = 0, al = 0, dpr = 1, tinta = '226,226,226';

  function medir() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    an = innerWidth; al = innerHeight;
    cv.width = Math.round(an * dpr); cv.height = Math.round(al * dpr);
    cv.style.width = an + 'px'; cv.style.height = al + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = getComputedStyle(cv).getPropertyValue('--dot-rgb').trim();
    if (c) tinta = c;
  }

  // el puntero levanta el terreno a su alrededor, como el ojo que mira
  let px = -9e9, py = -9e9;
  const ALCANCE = 230;

  function pintar(t) {
    ctx.clearRect(0, 0, an, al);
    const desliz = t * DERIVA;
    const z = t * SUBIDA;
    const cols = Math.ceil(an / PASO) + 1, filas = Math.ceil(al / PASO) + 1;

    for (let fy = 0; fy < filas; fy++) {
      const y = fy * PASO;
      for (let fx = 0; fx < cols; fx++) {
        const x = fx * PASO;
        let h = relieve((x + desliz) * ESCALA, y * ESCALA, z);

        if (px > -9e8) {
          const d = Math.hypot(x - px, y - py);
          if (d < ALCANCE) { const k = 1 - d / ALCANCE; h += k * k * .22; }
        }
        if (h <= NIVEL) continue;

        const a = (h - NIVEL) / (1 - NIVEL);       // 0 en la orilla, 1 en la cima
        ctx.fillStyle = `rgba(${tinta},${(.35 + a * .65).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, .35 + a * R_MAX, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  /* ---- ciclo ----------------------------------------------------- */
  medir();
  addEventListener('resize', () => { medir(); if (quieto) pintar(0); });

  if (quieto) { pintar(0); return; }

  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { px = py = -9e9; });

  // Un primer fotograma ya: si la pestana nace en segundo plano el bucle
  // no corre, y la pagina no puede quedarse en blanco esperandolo.
  let ultimo = 0;
  const inicio = performance.now();

  // Un primer fotograma ya: si la pestana nace en segundo plano el bucle
  // no corre, y la pagina no puede quedarse en blanco esperandolo.
  pintar(0);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ultimo = 0; });
  (function bucle(ahora) {
    requestAnimationFrame(bucle);
    if (document.hidden || ahora - ultimo < 1000 / FPS) return;
    ultimo = ahora;
    pintar((ahora - inicio) / 1000);
  })(inicio);
})();
