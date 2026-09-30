/* ============================================================
   FONDO GENERATIVO
   ------------------------------------------------------------
   Una rejilla fija de puntos sobre blanco. Lo que cambia no es
   la posicion de los puntos, sino su TAMANO: cada punto lee un
   valor de un campo invisible y crece o desaparece segun ese
   valor. El campo se mueve; los puntos, no.

   Debajo de cierto umbral no se dibuja nada. Ese hueco es lo que
   hace que se lea como relieve y no como una alfombra.

   El campo es un terreno: ruido fractal, como un mapa de altura,
   con cumbres que nacen y se deshacen mientras deriva.

   Se mueve en todas las paginas. Dentro del sitio va despacio (data-vel
   lo pone el generador): el fondo es el telon del trabajo y no tiene que
   competir con las fotos ni con el tunel.
   ============================================================ */
import { seco, mez as mezcla } from './util.js';

const cv = document.getElementById('bg');

if (cv && cv.getContext) {
  const ctx = cv.getContext('2d', { alpha: true });
  /* Con movimiento reducido no se mueve nada, como siempre. El resto del
     tiempo la velocidad la pone el generador por pagina: 1 en la portada,
     bastante menos dentro. */
  const VEL = seco ? 0 : (parseFloat(cv.dataset.vel) || 0);
  const quieto = VEL <= 0;

  const PASO  = 21;    // separacion de la rejilla, px CSS
  const R_MAX = 2.7;   // radio del punto en la cima

  /* ---- ruido de valor 3D -----------------------------------
     Hash entero en cada vertice de la celda + interpolacion
     suave entre los ocho. Barato y sin dependencias.          */
  const hash = (i, j, k) => {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const suave  = t => t * t * t * (t * (t * 6 - 15) + 10);

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

  /* ---- el terreno -----------------------------------------
     Relieve que deriva. Cuatro octavas y frecuencia alta: muchas cumbres
     y juntas. La curva final separa cima de ladera, para que las montanas
     tengan filo y no sean lomas. Devuelve 0..1. */
  function terreno(x, y, t) {
    // Deriva en diagonal y ademas se deforma. Traslada poco y el termino en
    // z pesa mucho: es el que hace que las cumbres nazcan y se deshagan en
    // su sitio, en vez de pasar de largo como en una cinta transportadora.
    const h = fbm((x + t * 58) * .0052, (y + t * 23) * .0052, t * .44, 4);
    return h < .5 ? 2 * h * h : 1 - 2 * (1 - h) * (1 - h);   // contraste en S
  }
  const NIVEL = .54;   // por debajo no se dibuja punto: el hueco es lo que da relieve

  /* ---- que cada visita se vea distinta ----------------------
     Se sortea de que momento del terreno se parte: si no, todas las
     paginas menos la portada, que pintan un solo fotograma, saldrian
     identicas en cada carga, hasta el ultimo punto.

     El sorteo se guarda en la sesion, no por pagina: el fondo es el mismo
     mientras navegas —el sitio se lee como una pieza y no da un salto al
     cambiar de pagina— y cambia cuando vuelves a entrar. */
  function sorteo() {
    try {
      const guardado = parseFloat(sessionStorage.getItem('fondo'));
      if (guardado >= 0) return guardado;
      const nuevo = Math.random() * 900;
      sessionStorage.setItem('fondo', String(nuevo));
      return nuevo;
    } catch {
      return Math.random() * 900;   // ventana privada o almacenamiento bloqueado
    }
  }

  /* Recargar es entrar otra vez. La sesion sobrevive al F5 —solo muere al
     cerrar la pestana—, asi que sin esto saldria el mismo paisaje. Un clic
     en un enlace del sitio si lo conserva: ahi la continuidad es la gracia.
     Volver atras es 'back_forward', no 'reload', y tampoco lo rompe. */
  try {
    if (performance.getEntriesByType('navigation')[0]?.type === 'reload')
      sessionStorage.removeItem('fondo');
  } catch { /* sin almacenamiento no hay nada que borrar */ }

  const T0 = sorteo();

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
    const cols = Math.ceil(an / PASO) + 1, filas = Math.ceil(al / PASO) + 1;

    for (let fy = 0; fy < filas; fy++) {
      const y = fy * PASO;
      for (let fx = 0; fx < cols; fx++) {
        const x = fx * PASO;
        let h = terreno(x, y, t);

        if (px > -9e8) {
          const d = Math.hypot(x - px, y - py);
          if (d < ALCANCE) { const k = 1 - d / ALCANCE; h += k * k * .24; }
        }
        if (h <= NIVEL) continue;

        const a = Math.min((h - NIVEL) / (1 - NIVEL), 1);
        ctx.fillStyle = `rgba(${tinta},${(.32 + a * .68).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, .35 + a * R_MAX, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  /* ---- ciclo ------------------------------------------------ */
  medir();
  addEventListener('resize', () => { medir(); if (quieto) pintar(T0); });
  // al cambiar de tema cambia el color de los puntos (--dot-rgb): se relee
  new MutationObserver(() => { medir(); if (quieto) pintar(T0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  if (quieto) {
    // Un solo fotograma y a otra cosa: ni bucle ni escuchas de puntero. El
    // fotograma ya no es el de t=0, que era el que salia siempre igual.
    pintar(T0);
  } else {
    addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, { passive: true });
    addEventListener('pointerleave', () => { px = py = -9e9; });

    /* Un fotograma del terreno cuesta 0,6ms a 1440x900 —medido—, asi que lo
       que manda el ritmo no es el coste sino lo que se ve: a poca velocidad
       no hace falta refrescar tanto, y cada fotograma que no se pide es
       bateria que no se gasta. */
    const FPS = VEL >= .8 ? 30 : 18;

    let ultimo = 0;
    const inicio = performance.now();
    pintar(T0);  // un fotograma ya: en pestana de fondo el bucle no corre
    document.addEventListener('visibilitychange', () => { if (!document.hidden) ultimo = 0; });
    (function bucle(ahora) {
      requestAnimationFrame(bucle);
      if (document.hidden || ahora - ultimo < 1000 / FPS) return;
      ultimo = ahora;
      pintar(T0 + ((ahora - inicio) / 1000) * VEL);
    })(inicio);
  }
}
