/* ============================================================
   TUNEL — la vista en profundidad de work
   ------------------------------------------------------------
   `prof` es la posicion de la camara sobre el eje z, medida en
   proyectos: el proyecto i esta en el plano de pantalla cuando
   prof === i. El 0 es el mas reciente; los demas quedan detras,
   cada uno SALTO mas lejos.

   El movimiento es el de la v0, que es el que se lee como un
   tunel de verdad:

   - Cada carta tiene una x/y FIJA en el espacio y lo unico que
     cambia es su z. La perspectiva la lleva sola en linea recta
     desde el centro hacia fuera, como lo que pasa por tu lado.
     Antes la x dependia del tamano con que se veia la carta, y
     al acercarse se iba hacia el centro, chocaba con las otras y
     luego cambiaba de camino.
   - Se reparten en espiral de angulo aureo: dos seguidas quedan
     a 137 grados una de otra y ninguna cae en el centro, que es
     por donde pasa la siguiente.
   - La que dejas atras crece, se desenfoca mucho y se va: pasa
     volando. Las de delante se ven todas, cada vez mas lejos,
     mas borrosas y con menos color.

   Se construye leyendo el <ul class="index"> del HTML, pero en
   orden de fecha y con todos los proyectos: el orden y el filtro
   son cosa de la lista, el tunel es siempre la linea del tiempo.
   ============================================================ */
import { seco, lim, mez, suave, px, portada } from './util.js';

const zona   = document.getElementById('tunel');
const escena = document.getElementById('escena');
const lista  = document.getElementById('index');

if (zona && lista && escena) {
  // La perspectiva se lee del CSS en vez de repetirla aqui.
  const P        = px(escena, 'perspective') || 900;
  const SALTO    = 620;        // distancia en z entre proyectos
  const CERCA    = .70 * P;    // mas cerca que esto ya ha salido de cuadro
  // Hasta cuantos proyectos hacia atras se ven: todos, para que ninguno
  // desaparezca, con un tope para cuando haya muchos (a partir de diez
  // quedarian como sellos en el centro). Lo ajusta construir().
  let FONDO = 6;
  const PASADA_A = .06 * P;    // una carta que dejas atras empieza a irse aqui
  const PASADA_B = .52 * P;    // ...y ha desaparecido aqui
  const OPTICO   = .46;        // centro optico vertical (= top de .carta)
  const BORDE    = 14;         // margen minimo contra el borde de pantalla
  const DESBORDE = .07;        // en movil la carta puede salirse este % del ancho
  const ALCANCE  = .4;         // mas lejos de esto, un clic te acerca en vez de entrar

  /* La atmosfera: lo que esta al fondo se desenfoca y pierde color. Es lo
     que convierte las imagenes sueltas en profundidad. */
  const DESENFOQUE = 5;        // px de desenfoque al fondo del tunel
  const ESTELA     = 22;       // px de desenfoque de la que pasa volando
  const DESATURA   = .34;      // cuanto color pierde lo que no miras
  const FOCO       = .55;      // a esta distancia ya no es "la que miras"

  /* El ritmo. La camara persigue a `meta` y, cuando dejas de tocar, `meta`
     se acerca sola al proyecto mas cercano. Los dos suaves: el encaje de
     antes tiraba en seco y se notaba el tiron. */
  const SNAP_MS  = 420;        // quietud antes de encajar
  const PERSIGUE = seco ? 1 : .10;
  const ENCAJA   = seco ? 1 : .08;
  const FUERA    = .35;        // cuanto te dejas pasar de los extremos
  const ARRASTRE = 9;          // px antes de considerar que arrastras
  const INERCIA  = 220;        // ms de impulso que se anaden al soltar un gesto rapido
  const EPS      = 5e-4;

  const marcas = document.getElementById('marcas');
  const rotulo = document.getElementById('rotulo');
  const barra  = document.getElementById('barra');
  const pomo   = document.getElementById('pomo');
  const relleno= document.getElementById('relleno');

  /* ---- estado ---------------------------------------------- */
  let datos = [], cartas = [], puntos = [], pos = [], T = [];
  let ultimo = 0, prof = 0, meta = 0, ultimaMano = 0;
  let agarrado = false, raspando = false;
  let an = 0, al = 0;

  const acercar = (a, b, k) => { const v = a + (b - a) * k; return Math.abs(b - v) < EPS ? b : v; };
  const dias = d => { const [y, m, x] = d.split('-').map(Number); return Date.UTC(y, m - 1, x) / 864e5; };
  const movil = () => innerWidth <= 820;

  /* ---- la linea del tiempo ----------------------------------
     T[i] = donde cae el proyecto i en la barra, de 0 (el mas antiguo, a
     la izquierda) a 1 (el mas reciente).

     En pantalla ancha, por fecha real: dos del mismo mes salen pegados y un
     ano sin nada deja hueco. En el movil no: con el dedo, dos bolas a medio
     centimetro son imposibles de acertar, asi que van todas a la misma
     distancia. */
  let porFecha = null;
  const igual = () => datos.map((_, i) => (ultimo ? 1 - i / ultimo : .5));
  function repartir() {
    porFecha = !movil();
    const f = datos.map(d => dias(d.fecha));
    const t0 = Math.min(...f), span = Math.max(...f) - t0;
    T = porFecha && span > 0 ? f.map(v => (v - t0) / span) : igual();
    puntos.forEach((b, i) => b && (b.style.left = (T[i] * 100).toFixed(3) + '%'));
  }
  /** profundidad (fraccionaria) -> sitio en la barra, 0..1 */
  function enBarra(d) {
    if (!ultimo) return T[0] ?? .5;
    const i = lim(Math.floor(d), 0, ultimo - 1);
    return lim(mez(T[i], T[i + 1], d - i), 0, 1);
  }
  /** sitio en la barra -> profundidad (fraccionaria). Si dos proyectos
      caen en el mismo dia, gana el primero. */
  function enTunel(t) {
    if (!ultimo) return 0;
    if (t >= T[0]) return 0;
    if (t <= T[ultimo]) return ultimo;
    for (let i = 0; i < ultimo; i++) {
      const a = T[i], b = T[i + 1];
      if (t <= a && t >= b) return a === b ? i : i + (a - t) / (a - b);
    }
    return 0;
  }

  /* ---- construir desde la lista ---------------------------- */
  function construir() {
    zona.replaceChildren();
    if (marcas) marcas.replaceChildren();

    datos = [...lista.children]
      .sort((a, b) => b.dataset.date.localeCompare(a.dataset.date))
      .map(li => {
        const a = li.querySelector('a');
        return {
          a, href: a.getAttribute('href'), fecha: li.dataset.date,
          rotulo: a.querySelector('.t').childNodes[0].textContent.trim(),
          pie: a.querySelector('.c').textContent.trim(),
        };
      });
    ultimo = datos.length - 1;
    if (!datos.length) return;
    FONDO = lim(ultimo + 1.4, 4, 10);
    repartir();

    // espiral aurea con un giro inicial al azar: cada visita coloca las
    // cartas en sitios distintos, pero nunca dos seguidas en la misma zona
    const AUREO = Math.PI * (3 - Math.sqrt(5));
    const a0 = Math.random() * Math.PI * 2;

    cartas = datos.map((d, i) => {
      const el = document.createElement('a');
      el.className = 'carta';
      el.href = d.href;
      el.draggable = false;
      el.setAttribute('aria-label', `${d.rotulo}, ${d.pie}`);
      // su proporcion va en la carta; si llega tarde (vista previa), se recoloca
      const pintura = portada(d.a, r => {
        el.style.aspectRatio = r;
        if (cartas.includes(el)) { medir(); pintar(); }
      });
      el._video = pintura.tagName === 'VIDEO' ? pintura : null;
      el.append(el._video ? lienzo(el._video) : pintura);
      const ang = a0 + i * AUREO + (Math.random() - .5) * .5;
      const r = .55 + .45 * Math.random();
      el._n = { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
      zona.append(el);
      return el;
    });

    puntos = datos.map((d, i) => {
      if (!marcas) return null;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'marca';
      b.style.left = (T[i] * 100).toFixed(3) + '%';
      b.title = `${d.rotulo} · ${d.pie}`;
      b.setAttribute('aria-label', `${d.rotulo}, ${d.pie}`);
      // solo el teclado llega aqui: los toques los resuelve la barra entera
      b.addEventListener('click', () => irA(i));
      marcas.append(b);
      return b;
    });

    medir();
    pintar();
  }

  /* Un video dentro de un espacio 3D con perspectiva no siempre se pinta:
     hay Chrome que deja el hueco gris aunque el video este reproduciendo.
     Asi que el video no entra en la carta: se reproduce fuera y cada
     fotograma se copia a un <canvas>, que el 3D compone siempre. Se copia
     solo mientras suena, que es solo mientras la carta se ve (pintar()). */
  function lienzo(video) {
    const cv = document.createElement('canvas');
    cv.width = 480; cv.height = 270;
    if (video.poster) cv.style.backgroundImage = `url("${video.poster}")`;
    const g = cv.getContext('2d');
    const rvfc = 'requestVideoFrameCallback' in video;
    let enCurso = false;
    const copiar = () => {
      if (video.paused) { enCurso = false; return; }
      if (video.videoWidth) {
        if (cv.width !== video.videoWidth) { cv.width = video.videoWidth; cv.height = video.videoHeight; }
        g.drawImage(video, 0, 0, cv.width, cv.height);
      }
      rvfc ? video.requestVideoFrameCallback(copiar) : requestAnimationFrame(copiar);
    };
    video.addEventListener('playing', () => { if (!enCurso) { enCurso = true; copiar(); } });
    return cv;
  }

  /* Las x/y se sortean normalizadas y se resuelven aqui contra el hueco
     real que queda, asi que ninguna carta se sale en su momento de foco
     por estrecha que sea la ventana. */
  function medir() {
    an = innerWidth; al = innerHeight;
    if (datos.length && porFecha !== !movil()) repartir();   // se ha cruzado el corte movil
    if (!cartas.length) return;
    const arriba = (document.querySelector('.topbar')?.offsetHeight || 0) + 8;
    const abajo  = (document.getElementById('tiempo')?.offsetHeight || 0) + 24;
    const cy = OPTICO * al;
    const banda = Math.max(0, Math.min(cy - arriba, al - abajo - cy));
    const desborde = movil() ? DESBORDE * an : 0;
    pos = cartas.map(el => {
      const cw = el.offsetWidth || 300, ch = el.offsetHeight || cw * .5625;
      return {
        x: el._n.x * Math.max(0, an / 2 - cw / 2 - BORDE + desborde),
        y: el._n.y * Math.max(0, banda - ch / 2),
      };
    });
    situarRotulo();
  }

  /* ---- pintar ---------------------------------------------- */
  let visto = -1;

  function pintar() {
    if (!cartas.length) return;
    for (let i = 0; i < cartas.length; i++) {
      const el = cartas[i];
      const rel = prof - i;                            // >0 ya la has pasado
      const z = lim(rel * SALTO, -FONDO * SALTO, CERCA);

      let op, bl;
      if (z <= 0) {                                    // por delante: asoma del fondo
        const d = -z / SALTO;
        op = 1 - suave(FONDO - 1.4, FONDO, d);
        bl = suave(.6, FONDO, d) * DESENFOQUE;
      } else {                                         // pasada: crece, se borra y se va
        op = 1 - suave(PASADA_A, PASADA_B, z);
        bl = suave(0, .66 * P, z) * ESTELA;
      }

      const visible = op > .003;
      el.style.visibility = visible ? 'visible' : 'hidden';
      if (el._video) { if (visible && el._video.paused) el._video.play().catch(() => {});
                       else if (!visible && !el._video.paused) el._video.pause(); }
      if (!visible) continue;

      const { x, y } = pos[i] || { x: 0, y: 0 };
      el.style.transform =
        `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), ${z.toFixed(1)}px)`;
      el.style.opacity = op.toFixed(3);
      const cerca = 1 - suave(0, FOCO, Math.abs(rel));
      const sat = mez(1 - DESATURA, 1, cerca);
      el.style.filter = ((bl > .15 ? `blur(${bl.toFixed(2)}px) ` : '')
                      + (sat < .995 ? `saturate(${sat.toFixed(3)})` : '')) || 'none';
      el.style.zIndex = String(Math.round(1000 + z));
      el.classList.toggle('foco', Math.abs(rel) < .5);
      // Lo de delante se puede clicar aunque este lejos: te acerca. Lo que ya
      // has pasado no, que es enorme y esta encima: se comeria el clic.
      el.style.pointerEvents = (z <= 0 ? op > .12 : op > .5 && bl < 3) ? 'auto' : 'none';
    }

    // el pomo avanza a la vez que la camara, no a saltos de bola en bola
    const donde = (enBarra(prof) * 100).toFixed(3) + '%';
    if (pomo) pomo.style.left = donde;
    // la raya empieza en el borde de la pantalla, no en el de la barra
    if (relleno) relleno.style.width = `calc(var(--pad) + ${donde})`;
    situarRotulo();

    const cerca = lim(Math.round(prof), 0, ultimo);
    if (cerca !== visto) {
      visto = cerca;
      puntos.forEach((b, i) => b && b.classList.toggle('aqui', i === cerca));
      if (rotulo) {
        rotulo.replaceChildren();
        const b = document.createElement('b'); b.textContent = datos[cerca].rotulo;
        const it = document.createElement('i'); it.textContent = datos[cerca].pie;
        rotulo.append(b, it);
        rotulo.href = datos[cerca].href;             // la ficha tambien entra al proyecto
        rotulo.setAttribute('aria-label', `${datos[cerca].rotulo}, ${datos[cerca].pie}`);
      }
    }
  }

  /* El rotulo cuelga sobre el pomo, recortado contra los extremos de la
     barra para que no se salga en el primero ni en el ultimo. */
  function situarRotulo() {
    if (!rotulo || !barra || !datos.length) return;
    const ancho = barra.offsetWidth, propio = rotulo.offsetWidth;
    if (!ancho || !propio) return;
    const x = enBarra(prof) * ancho;
    rotulo.style.left = lim(x, propio / 2 - 8, ancho - propio / 2 + 8).toFixed(1) + 'px';
  }

  /* ---- el ciclo, que duerme ---------------------------------
     Pinta mientras quede algo que mover y para; cualquier gesto lo
     despierta. Los interpoladores se clavan en su destino (acercar), asi
     que "ya no queda nada" es una igualdad exacta y el bucle puede parar. */
  let frame = 0;
  const despertar = () => { if (!frame) frame = requestAnimationFrame(tick); };

  function tick() {
    frame = 0;
    if (document.body.dataset.vista !== 'tunel' || !cartas.length) return;

    const suelto = !agarrado && !raspando && performance.now() - ultimaMano > SNAP_MS;
    if (suelto) meta = acercar(meta, lim(Math.round(meta), 0, ultimo), ENCAJA);
    prof = acercar(prof, meta, PERSIGUE);
    pintar();

    const quieto = prof === meta && meta === Math.round(meta) && suelto;
    if (!quieto || agarrado || raspando) despertar();
  }

  const mover = d => {
    meta = lim(meta + d, -FUERA, ultimo + FUERA);
    ultimaMano = performance.now(); despertar();
  };
  const irA = i => { meta = lim(i, 0, ultimo); ultimaMano = 0; despertar(); };

  /* ---- entrada ----------------------------------------------
     Toda la pantalla mueve el tunel, no solo la franja del centro: en el
     telefono, tocar por encima o por debajo de las cartas hacia rebotar
     la pagina. Se escucha en window y se deja pasar lo que va a los
     controles (menu de arriba, barra del tiempo, idiomas). */
  const enTunelActivo = () => document.body.dataset.vista === 'tunel';
  const esControl = t => t.closest('.topbar, .tiempo, .langs');

  addEventListener('wheel', e => {
    if (!enTunelActivo() || esControl(e.target)) return;
    e.preventDefault();
    const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    // deltaMode 1 son lineas (Firefox con rueda de raton), no pixeles
    mover(d * (e.deltaMode === 1 ? 16 : 1) * .0022);
  }, { passive: false });

  /* Arrastre y clic van juntos en pointerdown/pointerup, sin captura: la
     captura redirige el clic a la escena y las cartas dejaban de recibirlo.
     Un clic de trackpad se mueve unos pixeles: hasta ARRASTRE no es arrastre. */
  let gesto = null;
  addEventListener('pointerdown', e => {
    if (!enTunelActivo() || e.button || esControl(e.target)) return;
    gesto = { x: e.clientX, y: e.clientY, meta, carta: cartaEn(e.clientX, e.clientY), movido: false,
              aparte: e.metaKey || e.ctrlKey || e.shiftKey, rastro: [] };
  });
  addEventListener('pointermove', e => {
    if (!gesto) return;
    const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y;
    if (!gesto.movido && Math.hypot(dx, dy) < ARRASTRE) return;
    gesto.movido = agarrado = true;
    escena.classList.add('arrastrando');
    // hacia arriba avanza; de lado cuenta menos, para que un gesto vertical
    // algo torcido no se anule a si mismo
    meta = lim(gesto.meta + (-dy - dx * .4) * .006, -FUERA, ultimo + FUERA);
    ultimaMano = performance.now(); despertar();
    // los ultimos 100 ms del gesto, para saber a que velocidad se suelta
    gesto.rastro.push([ultimaMano, meta]);
    while (gesto.rastro.length > 2 && ultimaMano - gesto.rastro[0][0] > 100) gesto.rastro.shift();
  });
  const soltar = e => {
    if (!gesto) return;
    const g = gesto; gesto = null;
    agarrado = false; escena.classList.remove('arrastrando');
    ultimaMano = performance.now();
    /* Inercia: un gesto rapido con el dedo sigue un poco despues de soltar,
       como cualquier scroll del telefono, y un gesto lento se queda donde
       lo dejas. Sin esto, para pasar tres proyectos habia que arrastrar tres
       veces. Se queda en uno y medio como mucho, para no pasarse. */
    const r = g.rastro;
    if (g.movido && r.length > 1) {
      const [t0, m0] = r[0], [t1, m1] = r[r.length - 1];
      if (t1 - t0 > 0 && ultimaMano - t1 < 60) {
        const empuje = lim((m1 - m0) / (t1 - t0) * INERCIA, -1.5, 1.5);
        meta = lim(meta + empuje, -FUERA, ultimo + FUERA);
      }
    }
    despertar();
    if (g.movido || g.aparte || e.type === 'pointercancel') return;
    const c = cartaEn(e.clientX, e.clientY);
    if (c < 0 || c !== g.carta) return;
    // clicar algo que esta al fondo te lleva hasta el; lo de delante, entra
    if (Math.abs(prof - c) > ALCANCE) irA(c);
    else location.href = datos[c].href;
  };
  addEventListener('pointerup', soltar);
  addEventListener('pointercancel', soltar);

  // Del raton se encarga soltar(). El clic del enlace se deja pasar con
  // teclado (Enter sobre una carta enfocada) y con cmd/ctrl, que abre el
  // proyecto en otra pestana como cualquier enlace.
  escena.addEventListener('click', e => {
    if (e.detail && !(e.metaKey || e.ctrlKey || e.shiftKey)) e.preventDefault();
  });

  /* Se calcula a mano en vez de mirar e.target: dentro de un espacio 3D con
     perspectiva, Chrome no siempre acierta que carta hay bajo el dedo. La
     proyeccion solo escala y traslada, asi que el rectangulo es exacto. Gana
     la mas cercana. */
  function cartaEn(x, y) {
    let mejor = -1, zmax = -Infinity;
    cartas.forEach((el, i) => {
      if (el.style.pointerEvents === 'none' || el.style.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
      const z = +el.style.zIndex || 0;
      if (z > zmax) { zmax = z; mejor = i; }
    });
    return mejor;
  }

  addEventListener('keydown', e => {
    if (!enTunelActivo()) return;
    if (e.target.closest('input, textarea, button, [role="menu"]')) return;
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (k) { e.preventDefault(); irA(Math.round(meta) + k); return; }
    if (e.key === 'Home') { e.preventDefault(); irA(0); }        // mas reciente
    if (e.key === 'End')  { e.preventDefault(); irA(ultimo); }   // mas antiguo
    if (e.key === 'Enter' && datos.length && !e.target.closest('a')) {
      location.href = datos[lim(Math.round(prof), 0, ultimo)].href;
    }
  });

  /* ---- la barra del tiempo ----------------------------------
     La zona util es la barra entera, pomo incluido. Mientras arrastras el
     tunel te sigue sin encajar; al soltar, encaja en el mas cercano. */
  if (barra) {
    const desdeX = e => {
      const r = barra.getBoundingClientRect();
      if (!r.width) return;
      meta = enTunel(lim((e.clientX - r.left) / r.width, 0, 1));
      despertar();
    };
    barra.addEventListener('pointerdown', e => {
      if (e.button) return;
      raspando = true; barra.classList.add('raspando');
      barra.setPointerCapture(e.pointerId); desdeX(e);
    });
    barra.addEventListener('pointermove', e => { if (raspando) desdeX(e); });
    const fin = e => {
      if (!raspando) return;
      if (e.type === 'pointerup') desdeX(e);             // donde se suelta, manda
      raspando = false; barra.classList.remove('raspando');
      ultimaMano = 0; despertar();                       // encaja ya
    };
    barra.addEventListener('pointerup', fin);
    barra.addEventListener('pointercancel', fin);
  }

  // Con el tabulador se va de carta en carta: la camara la trae delante.
  zona.addEventListener('focusin', e => {
    // solo con teclado: con el raton, pulsar ya enfoca, y la camara saltaria
    // antes de que empezaras a arrastrar
    const c = e.target.closest('.carta');
    if (c && c.matches(':focus-visible')) irA(cartas.indexOf(c));
  });

  /* Los videos de las portadas no estan en la pagina y nadie los para solos:
     fuera del tunel —en la lista o en otra pestana— se paran a mano. Al
     volver los arranca pintar(). */
  const pararVideos = () => cartas.forEach(el => el._video && !el._video.paused && el._video.pause());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pararVideos(); else if (enTunelActivo()) pintar();
  });

  /* ---- arranque -------------------------------------------- */
  // Al volver a la vista de tunel hay que medir otra vez: mientras estaba
  // escondida todo medía cero.
  addEventListener('lista:cambia', () => {
    if (enTunelActivo()) { medir(); pintar(); despertar(); } else pararVideos();
  });
  addEventListener('resize', () => { medir(); pintar(); despertar(); });

  construir();
  // Desde la portada no se entra volando: el tunel aparece fundido.
  if (sessionStorage.getItem('entrando') === '1') {
    sessionStorage.removeItem('entrando');
    if (!seco) escena.classList.add('aparece');
  }
  despertar();
}
