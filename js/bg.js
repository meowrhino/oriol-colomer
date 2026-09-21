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

   Cual se usa lo decide `fondo` en data/site.json: el nombre de uno de
   los cinco, o "aleatorio" para que lo sortee cada visita. Para probar
   sin tocar nada: ?bg=remolino en la url, o las teclas 1..5.

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

  /* ---- los cinco campos ------------------------------------
     Cada uno recibe el punto, el tiempo y el tamano del lienzo
     y devuelve 0..1. El tamano lo usa solo `gotas`, pero se lo
     pasan todos: antes lo leia de una variable de mas arriba y
     era el unico de los cinco que no se podia probar suelto.  */
  const CAMPOS = {
    // Relieve que deriva. Cuatro octavas y frecuencia mas alta: mas
    // cumbres y mas juntas. La curva final separa cima de ladera, para
    // que las montanas tengan filo y no sean lomas.
    terreno: (x, y, t) => {
      // Deriva en diagonal y ademas se deforma. Antes casi todo el movimiento
      // era el arrastre lateral (105 px/s) y el relieve apenas cambiaba: se
      // leia como una cinta transportadora, siempre el mismo perfil pasando
      // de largo. Ahora traslada menos y el termino en z pesa el doble, que
      // es el que hace que las cumbres nazcan y se deshagan en su sitio.
      const h = fbm((x + t * 58) * .0052, (y + t * 23) * .0052, t * .44, 4);
      return h < .5 ? 2 * h * h : 1 - 2 * (1 - h) * (1 - h);   // contraste en S
    },

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
        // Cada celda tiene una semilla que orbita despacio. De que punto de
        // la orbita arranca lo decide SEMILLA: antes era un 7 fijo y las
        // burbujas se agrupaban siempre igual, por muy lejos que empezara t.
        const a = hash(gi, gj, SEMILLA) * 6.2832 + t * .5;
        const px = gi + .5 + Math.cos(a) * .38;
        const py = gj + .5 + Math.sin(a) * .38;
        const d = Math.hypot(cx - px, cy - py);
        if (d < mejor) mejor = d;
      }
      return 1 - Math.min(mejor, 1.1) / 1.1;
    },

    // varias fuentes emitiendo aros; donde coinciden, se suman
    gotas: (x, y, t, ancho, alto) => {
      let s = 0;
      for (let n = 0; n < 3; n++) {
        // Los tres focos salian de un hash constante, asi que brotaban
        // siempre de los mismos tres puntos de la pantalla y lo unico que
        // cambiaba entre visitas era la fase de los anillos. Ahora se mueven.
        const fx = (hash(n, 11, SEMILLA) * .8 + .1), fy = (hash(n, 23, SEMILLA + 1) * .8 + .1);
        const d = Math.hypot(x - fx * ancho, y - fy * alto);
        s += Math.sin(d * .028 - t * 2.1 - n * 2) / (1 + d * .0042);
      }
      return .5 + s * .34;
    },
  };

  const NIVEL = { terreno:.54, olas:.52, remolino:.47, celular:.55, gotas:.5 };

  /* ---- que cada visita se vea distinta ----------------------
     Antes el campo era siempre `terreno`: data-campo no lo escribia nadie
     y el ?bg= es solo para probar, asi que los otros cuatro no llegaron a
     verse nunca. Y como todas las paginas menos la portada pintan un solo
     fotograma en t=0, salia exactamente la misma imagen en cada carga,
     siempre la misma, hasta el ultimo punto.

     Ahora se sortean tres cosas: el campo, el momento del que se parte y
     una semilla entera. La semilla hace falta porque en dos de los cinco
     campos la geometria no depende del tiempo —las celdas de `celular` y
     los focos de `gotas`— y partir de otro instante no los cambiaba de
     sitio: solo les corria la fase.

     El sorteo se guarda en la sesion, no por pagina: el fondo es el mismo
     mientras navegas —el sitio se lee como una pieza y no da un salto al
     cambiar de pagina— y cambia cuando vuelves a entrar. Recargar tambien
     cuenta como entrar de nuevo, ver mas abajo. */
  const NOMBRES = Object.keys(CAMPOS);
  function sorteo() {
    const dado = () => ({
      campo: NOMBRES[Math.floor(Math.random() * NOMBRES.length)],
      t0: Math.random() * 900,        // de que momento del campo se parte
      sem: Math.floor(Math.random() * 1e6),   // y de donde cuelga su geometria
    });
    try {
      const guardado = sessionStorage.getItem('fondo');
      if (guardado) {
        const v = JSON.parse(guardado);
        // La semilla se comprueba como lo demas: una sesion abierta antes
        // de que existiera guarda un objeto sin ella, y sin esto saldria
        // un hash con undefined dentro.
        if (CAMPOS[v.campo] && typeof v.t0 === 'number' && Number.isInteger(v.sem)) return v;
      }
      const nuevo = dado();
      sessionStorage.setItem('fondo', JSON.stringify(nuevo));
      return nuevo;
    } catch {
      return dado();   // ventana privada o almacenamiento bloqueado: se sortea y ya
    }
  }

  /* Recargar es entrar otra vez. La sesion sobrevive al F5 —solo muere al
     cerrar la pestana—, asi que el sorteo guardado se releia igual y salia
     exactamente el mismo paisaje, hasta el ultimo punto. Un clic en un
     enlace del sitio si lo conserva: ahi la continuidad es la gracia.
     Volver atras es 'back_forward', no 'reload', y tampoco lo rompe. */
  try {
    if (performance.getEntriesByType('navigation')[0]?.type === 'reload')
      sessionStorage.removeItem('fondo');
  } catch { /* sin almacenamiento no hay nada que borrar */ }

  const elegido = sorteo();
  const pedido = cv.dataset.campo;     // lo que diga data/site.json
  // el ?bg= de la url manda sobre todo, que para eso esta
  let campo = new URLSearchParams(location.search).get('bg');
  if (!CAMPOS[campo]) campo = CAMPOS[pedido] ? pedido : elegido.campo;
  // El momento de partida se sortea siempre, tambien con el campo fijado:
  // asi dos visitas nunca empiezan en el mismo sitio del paisaje.
  const T0 = elegido.t0;
  // La leen `celular` y `gotas` al pintar, que es despues de esta linea.
  const SEMILLA = elegido.sem;

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
        let h = f(x, y, t, an, al);

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
  addEventListener('resize', () => { medir(); if (quieto) pintar(T0); });

  if (quieto) {
    // Un solo fotograma y a otra cosa: ni bucle ni escuchas de puntero. El
    // fotograma ya no es el de t=0, que era el que salia siempre igual.
    pintar(T0);
  } else {
    addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, { passive: true });
    addEventListener('pointerleave', () => { px = py = -9e9; });

    // 1..5 conmutan el campo, para poder compararlos sin recargar
    const orden = NOMBRES;
    addEventListener('keydown', e => {
      const n = +e.key;
      if (n >= 1 && n <= orden.length) { campo = orden[n - 1]; console.log('fondo:', campo); }
    });

    /* Un fotograma del campo cuesta 0,6ms a 1440x900 —medido—, asi que lo
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
