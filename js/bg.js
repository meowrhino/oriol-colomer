/* ============================================================
   FONDO GENERATIVO
   ------------------------------------------------------------
   Una rejilla fija de puntos sobre blanco. Lo que cambia no es
   la posicion de los puntos, sino su TAMANO: cada punto lee un
   valor de un campo invisible y crece o desaparece segun ese
   valor. El campo se mueve; los puntos, no.

   Debajo de cierto umbral no se dibuja nada. Ese hueco es lo que
   hace que se lea como relieve y no como una alfombra.

   Cinco campos distintos, conmutables:
     terreno   ruido fractal, como generar un mapa de altura
     olas      crestas que barren en diagonal, deformadas por ruido
     remolino  el ruido se consulta a si mismo: marmol, humo
     celular   distancia al punto sembrado mas cercano: burbujas
     gotas     ondas circulares de varias fuentes, interfiriendo

   Para probar: ?bg=remolino en la url, o las teclas 1..5.
   ============================================================ */
(() => {
  const cv = document.getElementById('bg');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d', { alpha: true });

  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches
              || cv.dataset.anim !== '1';

  const PASO  = 21;    // separacion de la rejilla, px CSS
  const R_MAX = 2.7;   // radio del punto en la cima
  const FPS   = 30;

  /* ---- ruido de valor 3D -----------------------------------
     Hash entero en cada vertice de la celda + interpolacion
     suave entre los ocho. Barato y sin dependencias.          */
  const hash = (i, j, k) => {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const suave  = t => t * t * t * (t * (t * 6 - 15) + 10);
  const mezcla = (a, b, t) => a + (b - a) * t;

  function ruido(x, y, z) {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
    const u = suave(x - i), v = suave(y - j), w = suave(z - k);
    const c = (a, b, d) => hash(i + a, j + b, k + d);
    return mezcla(
      mezcla(mezcla(c(0,0,0), c(1,0,0), u), mezcla(c(0,1,0), c(1,1,0), u), v),
      mezcla(mezcla(c(0,0,1), c(1,0,1), u), mezcla(c(0,1,1), c(1,1,1), u), v), w);
  }
  /* fractal: octavas cada vez mas finas y con menos peso */
  function fbm(x, y, z, oct = 3) {
    let s = 0, amp = .5, f = 1, norm = 0;
    for (let o = 0; o < oct; o++) {
      s += ruido(x * f, y * f, z * f) * amp;
      norm += amp; amp *= .5; f *= 2.1;
    }
    return s / norm;
  }

  /* ---- los cinco campos ------------------------------------
     Cada uno recibe el punto y el tiempo y devuelve 0..1.     */
  const CAMPOS = {
    // relieve que deriva: montanas que entran por un lado
    terreno: (x, y, t) => fbm((x + t * 90) * .0032, y * .0032, t * .16, 3),

    // crestas diagonales; el ruido curva la ola para que no sea una regla
    olas: (x, y, t) => {
      const w = fbm(x * .0016, y * .0016, t * .1, 2) - .5;
      const fase = (x * .68 + y * .73) * .009 + w * 3.4 - t * 1.15;
      return .5 + Math.sin(fase) * .5 * (.55 + fbm(x * .004, y * .004, t * .2, 2) * .55);
    },

    // dominio deformado: se pregunta al ruido donde mirar el ruido
    remolino: (x, y, t) => {
      const qx = fbm(x * .0021, y * .0021, t * .13, 2) - .5;
      const qy = fbm(x * .0021 + 5.2, y * .0021 + 1.3, t * .13, 2) - .5;
      return fbm((x + qx * 420) * .0026, (y + qy * 420) * .0026, t * .09, 2);
    },

    // celdas: distancia al punto sembrado mas cercano de la vecindad
    celular: (x, y, t) => {
      const S = 132, cx = x / S, cy = y / S;
      const i = Math.floor(cx), j = Math.floor(cy);
      let mejor = 9;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const gi = i + di, gj = j + dj;
        // cada celda tiene una semilla que orbita despacio
        const a = hash(gi, gj, 7) * 6.2832 + t * .5;
        const px = gi + .5 + Math.cos(a) * .38;
        const py = gj + .5 + Math.sin(a) * .38;
        const d = Math.hypot(cx - px, cy - py);
        if (d < mejor) mejor = d;
      }
      return 1 - Math.min(mejor, 1.1) / 1.1;
    },

    // varias fuentes emitiendo aros; donde coinciden, se suman
    gotas: (x, y, t) => {
      let s = 0;
      for (let n = 0; n < 3; n++) {
        const fx = (hash(n, 11, 3) * .8 + .1), fy = (hash(n, 23, 5) * .8 + .1);
        const d = Math.hypot(x - fx * an, y - fy * al);
        s += Math.sin(d * .028 - t * 2.1 - n * 2) / (1 + d * .0042);
      }
      return .5 + s * .34;
    },
  };

  const NIVEL = { terreno:.46, olas:.52, remolino:.47, celular:.55, gotas:.5 };

  let campo = new URLSearchParams(location.search).get('bg');
  if (!CAMPOS[campo]) campo = cv.dataset.campo || 'terreno';

  /* ---- lienzo ---------------------------------------------- */
  let an = 0, al = 0, tinta = '226,226,226';
  function medir() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    an = innerWidth; al = innerHeight;
    cv.width = Math.round(an * dpr); cv.height = Math.round(al * dpr);
    cv.style.width = an + 'px'; cv.style.height = al + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = getComputedStyle(cv).getPropertyValue('--dot-rgb').trim();
    if (c) tinta = c;
  }

  // el puntero levanta el campo a su alrededor: el fondo mira donde miras
  let px = -9e9, py = -9e9;
  const ALCANCE = 240;

  function pintar(t) {
    ctx.clearRect(0, 0, an, al);
    const f = CAMPOS[campo], nivel = NIVEL[campo];
    const cols = Math.ceil(an / PASO) + 1, filas = Math.ceil(al / PASO) + 1;

    for (let fy = 0; fy < filas; fy++) {
      const y = fy * PASO;
      for (let fx = 0; fx < cols; fx++) {
        const x = fx * PASO;
        let h = f(x, y, t);

        if (px > -9e8) {
          const d = Math.hypot(x - px, y - py);
          if (d < ALCANCE) { const k = 1 - d / ALCANCE; h += k * k * .24; }
        }
        if (h <= nivel) continue;

        const a = Math.min((h - nivel) / (1 - nivel), 1);
        ctx.fillStyle = `rgba(${tinta},${(.32 + a * .68).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, .35 + a * R_MAX, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  /* ---- ciclo ------------------------------------------------ */
  medir();
  addEventListener('resize', () => { medir(); if (quieto) pintar(0); });
  if (quieto) { pintar(0); return; }

  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { px = py = -9e9; });

  // 1..5 conmutan el campo, para poder compararlos sin recargar
  const orden = Object.keys(CAMPOS);
  addEventListener('keydown', e => {
    const n = +e.key;
    if (n >= 1 && n <= orden.length) { campo = orden[n - 1]; console.log('fondo:', campo); }
  });

  let ultimo = 0;
  const inicio = performance.now();
  pintar(0);   // un fotograma ya: en pestana de fondo el bucle no corre
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ultimo = 0; });
  (function bucle(ahora) {
    requestAnimationFrame(bucle);
    if (document.hidden || ahora - ultimo < 1000 / FPS) return;
    ultimo = ahora;
    pintar((ahora - inicio) / 1000);
  })(inicio);
})();
