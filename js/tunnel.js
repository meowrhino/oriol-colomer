/* ============================================================
   TUNEL — la vista en profundidad de work
   ------------------------------------------------------------
   `prof` es la posicion de la camara sobre el eje z, medida en
   proyectos: el proyecto i esta en el plano de pantalla cuando
   prof === i. Los de indice mayor quedan al fondo.

   Se construye leyendo el <ul class="index"> que ya esta en el
   HTML, en su orden actual y saltandose lo oculto. Cuando el
   filtro o el orden cambian, work.js avisa y esto se rehace: no
   hay dos listas que puedan discrepar.
   ============================================================ */
import { seco, lim, mez, suave, px } from './util.js';

const zona   = document.getElementById('tunel');
const escena = document.getElementById('escena');
const lista  = document.getElementById('index');

if (zona && lista && escena) {
  // La perspectiva se lee del CSS en vez de repetirla aqui: estaba escrita
  // en los dos sitios con un comentario en cada uno avisando del otro, que
  // es justo la clase de pareja que acaba discrepando.
  const P       = px(escena, 'perspective') || 900;
  const SALTO   = 780;   // distancia en z entre proyectos
  const CERCA   = .62 * P;
  const FONDO   = 4.2;   // cuantos proyectos ves hacia atras
  const SNAP_MS = 380;   // quietud antes de encajar en el mas cercano
  const FUERA   = .4;    // cuanto te dejas pasar de los extremos
  const ARRASTRE= 9;     // px antes de considerar que arrastras
  const suavear = seco ? 1 : .16;

  /* ---- sombra y atmosfera ----------------------------------
     Lo que dice cual es el proyecto que estas mirando. Sin esto
     las cartas eran recortes planos, todas nitidas y a opacidad
     1: cinco imagenes de tamanos distintos amontonadas, sin nada
     que las separase del fondo ni entre si.

     La sombra es fuerte en el de delante, tenue en el del fondo,
     y se apaga en cuanto lo pasas: una carta pasada esta ampliada
     por la perspectiva y su sombra taparia media pantalla.        */
  const HALO_CERCA   = .74;   // fuerza en el proyecto de delante
  const HALO_FONDO   = .15;   // ...y en el ultimo que se ve
  const HALO_ALCANCE = 2.4;   // en cuantos proyectos baja de una a otra
  const HALO_PASADA  = .60;   // en cuantos se apaga al dejarla atras
  const DESENFOQUE   = 3.2;   // px de desenfoque en el fondo del tunel
  const DESATURA     = .28;   // cuanto color pierde lo que no miras
  const FOCO         = 1.15;  // radio del "esto es lo que miras", en proyectos

  /* Las cartas caen en sitio distinto cada vez que se abre el tunel: no hay
     semilla fija, se sortea en cada `construir()` (carga, cambio de vista,
     filtro u orden). Lo unico que no se deja al azar es que dos cartas
     seguidas no se tapen: si la nueva sale cerca de la anterior en el eje
     que sea, se manda al lado contrario. */
  const azar = () => Math.random() * 2 - 1;               // -1 .. 1
  const aparte = (v, previo) =>
    previo === null || Math.abs(v - previo) > .55 ? v : -v;

  const marcas = document.getElementById('marcas');
  const rotulo = document.getElementById('rotulo');
  const barra  = document.getElementById('barra');
  const dias = d => { const [y,m,x] = d.split('-').map(Number); return Date.UTC(y, m-1, x) / 864e5; };

  /* ---- estado ---------------------------------------------- */
  let datos = [], cartas = [], puntos = [], fechas = [], t0 = 0, span = 1, ultimo = 0;
  let prof = 0, meta = 0, quieto = 0, arrastrando = false, agarrado = false;
  let an = 0, al = 0, anchoCarta = 300;

  const enPct = i => (fechas[i] - t0) / span;      // 0..1 por fecha real

  /* ---- construir desde la lista ---------------------------- */
  function construir() {
    zona.replaceChildren();
    if (marcas) marcas.replaceChildren();

    datos = [...lista.children].filter(li => !li.hidden).map(li => {
      const a = li.querySelector('a');
      return {
        href: a.getAttribute('href'),
        img:  a.dataset.peek || '',
        fecha: li.dataset.date,
        rotulo: a.querySelector('.t').childNodes[0].textContent.trim(),
        pie: a.querySelector('.c').textContent.trim(),
      };
    });
    ultimo = datos.length - 1;
    if (!datos.length) return;

    fechas = datos.map(d => dias(d.fecha));
    t0 = Math.min(...fechas);
    span = Math.max(Math.max(...fechas) - t0, 1);

    let dx = null, dy = null;
    cartas = datos.map((d, i) => {
      const el = document.createElement('a');
      el.className = 'carta';
      el.href = d.href;                       // clic = ir al proyecto, siempre
      el.dataset.i = i;
      // Sin pie de foto: el rotulo de la linea del tiempo ya dice cual es
      // el proyecto de delante, y repetirlo aqui chocaba con las cartas
      // del fondo. El nombre accesible va en el propio enlace.
      el.innerHTML = d.img ? `<img src="${d.img}" alt="" draggable="false">`
                           : '<span class="sin"></span>';
      el.setAttribute('aria-label', `${d.rotulo}, ${d.pie}`);
      dx = aparte(azar(), dx); dy = aparte(azar(), dy);
      el.style.setProperty('--dx', dx.toFixed(3));
      el.style.setProperty('--dy', dy.toFixed(3));
      zona.append(el);
      return el;
    });

    // Linea del tiempo sin raya: solo los proyectos, cada uno en su fecha.
    puntos = datos.map((d, i) => {
      if (!marcas) return null;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'marca';
      b.style.left = (enPct(i) * 100).toFixed(3) + '%';
      b.title = `${d.rotulo} · ${d.pie}`;
      b.setAttribute('aria-label', `ir a ${d.rotulo}, ${d.pie}`);
      b.addEventListener('click', e => { e.preventDefault(); irA(i); });
      marcas.append(b);
      return b;
    });

    prof = meta = lim(meta, 0, ultimo);
    medir();
    pintar();
  }

  function medir() {
    an = innerWidth; al = innerHeight;
    anchoCarta = (cartas[0] && cartas[0].offsetWidth) || 300;
    situarRotulo();
  }

  /* El rotulo cuelga centrado sobre el punto en el que estas, recortado
     contra los extremos de la barra para que no se salga en el primero ni
     en el ultimo. Antes vivia pegado a la izquierda mientras el punto activo
     podia estar en la otra punta: las dos senales de "donde estoy" a media
     pantalla la una de la otra, sin nada que las relacionase. */
  function situarRotulo() {
    if (!rotulo || !barra || visto < 0) return;
    const ancho = barra.offsetWidth, propio = rotulo.offsetWidth;
    if (!ancho || !propio) return;
    rotulo.style.left =
      lim(enPct(visto) * ancho, propio / 2, ancho - propio / 2).toFixed(1) + 'px';
  }

  /* ---- pintar ---------------------------------------------- */
  let visto = -1;

  /** Coloca las cartas para el valor actual de `prof`. Se llama desde el
      bucle, pero tambien una vez al construir: requestAnimationFrame no
      corre en una pestana de fondo, y sin esto las cartas se quedarian
      sin colocar hasta que alguien mirase. */
  function pintar() {
    if (!cartas.length) return;
    for (let i = 0; i < cartas.length; i++) {
      const el = cartas[i];
      const z = (prof - i) * SALTO;
      const delante = i - prof;                    // <0 ya pasada, >0 al fondo

      if (z > CERCA || delante > FONDO) { el.style.visibility = 'hidden'; continue; }
      el.style.visibility = 'visible';

      const escala  = P / (P - z);
      const holgura = Math.max(0, (an - anchoCarta * escala) / 2 - 16) / Math.max(escala, .2);
      const dx = parseFloat(el.style.getPropertyValue('--dx')) * holgura * .62;
      const dy = parseFloat(el.style.getPropertyValue('--dy')) * Math.min(holgura * .5, al * .22);

      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, ${z.toFixed(1)}px)`;
      const entra = lim((FONDO - delante) / 1.1, 0, 1);   // asoma desde el fondo
      const sale  = lim((CERCA - z) / (CERCA * .55), 0, 1); // se va al pasar
      el.style.opacity = (entra * sale).toFixed(3);
      el.style.zIndex  = String(1000 - Math.round(delante * 10));
      el.classList.toggle('foco', Math.abs(delante) < .5);

      // La sombra: fuerte de cerca, tenue al fondo, apagada al pasarla.
      const atras  = suave(0, HALO_ALCANCE, Math.max(0, delante));
      const pasada = 1 - suave(0, HALO_PASADA, Math.max(0, -delante));
      el.style.setProperty('--halo', (mez(HALO_CERCA, HALO_FONDO, atras) * pasada).toFixed(3));

      // La atmosfera: lo que esta al fondo se desenfoca y pierde color. Es
      // lo que convierte cuatro imagenes sueltas en profundidad, y lo que
      // mas se nota en un telefono, donde solo cabe una carta entera.
      const cerca01 = 1 - suave(0, FOCO, Math.abs(delante));
      const borron  = suave(.7, FONDO, delante) * DESENFOQUE;
      el.style.filter = (borron > .12 ? `blur(${borron.toFixed(2)}px) ` : '')
                      + `saturate(${mez(1 - DESATURA, 1, cerca01).toFixed(3)})`;
    }

    const cerca = lim(Math.round(prof), 0, ultimo);
    if (cerca !== visto) {
      visto = cerca;
      puntos.forEach((b, i) => b && b.classList.toggle('aqui', i === cerca));
      if (rotulo) {
        rotulo.innerHTML = `<b>${datos[cerca].rotulo}</b><i>${datos[cerca].pie}</i>`;
        // La ficha es el proyecto de delante: tambien se puede entrar por ella.
        if (rotulo.tagName === 'A') rotulo.href = datos[cerca].href;
        situarRotulo();
      }
    }

  }

  function tick() {
    requestAnimationFrame(tick);
    if (document.body.dataset.vista !== 'tunel' || !cartas.length) return;

    prof = mez(prof, meta, suavear);
    pintar();

    if (!agarrado && quieto && performance.now() - quieto > SNAP_MS) {
      quieto = 0; meta = lim(Math.round(meta), 0, ultimo);
    }
  }

  const mover = d => { meta = lim(meta + d, -FUERA, ultimo + FUERA); quieto = performance.now(); };
  const irA   = i => { meta = lim(i, 0, ultimo); quieto = 0; };

  /* ---- entrada --------------------------------------------- */
  escena.addEventListener('wheel', e => {
    e.preventDefault();
    mover((Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * .0022);
  }, { passive: false });

  let x0 = 0, y0 = 0, p0 = 0, movido = 0, capturado = 0;
  escena.addEventListener('pointerdown', e => {
    if (e.button) return;
    agarrado = true; movido = 0; capturado = 0;
    x0 = e.clientX; y0 = e.clientY; p0 = meta;
  });
  escena.addEventListener('pointermove', e => {
    if (!agarrado) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    movido = Math.max(movido, Math.hypot(dx, dy));
    if (movido > ARRASTRE) {
      arrastrando = true;
      escena.classList.add('arrastrando');
      // Se captura aqui, no en pointerdown: con la captura puesta el click
      // se dispara sobre .escena y el enlace de la carta nunca se abre.
      if (!capturado) { capturado = 1; escena.setPointerCapture(e.pointerId); }
      meta = lim(p0 - (dx + dy) / 190, -FUERA, ultimo + FUERA);
    }
  });
  const soltar = () => {
    if (!agarrado) return;
    agarrado = false; escena.classList.remove('arrastrando');
    quieto = performance.now();
    setTimeout(() => { arrastrando = false; }, 0);
  };
  escena.addEventListener('pointerup', soltar);
  escena.addEventListener('pointercancel', soltar);
  // Si sueltas fuera de la escena antes de llegar al umbral no hay captura
  // y el pointerup no llega aqui: sin esto te quedarias agarrado.
  addEventListener('pointerup', soltar);

  // El clic entra al proyecto. Solo se anula si venias arrastrando, que
  // entonces no era un clic sino el final de un gesto.
  escena.addEventListener('click', e => {
    const carta = e.target.closest('.carta');
    if (!carta) return;
    if (arrastrando) { e.preventDefault(); return; }
    // Red de seguridad: si algo se comio la navegacion del enlace (captura
    // de puntero, un padre que traga el evento), la hacemos a mano.
    if (!e.defaultPrevented) { e.preventDefault(); location.href = carta.href; }
  });

  addEventListener('keydown', e => {
    if (document.body.dataset.vista !== 'tunel') return;
    if (e.target.closest('input, textarea, button, [role="menu"]')) return;
    const k = { ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1 }[e.key];
    if (k) { e.preventDefault(); irA(Math.round(meta) + k); return; }
    if (e.key === 'Home') { e.preventDefault(); irA(0); }        // mas reciente
    if (e.key === 'End')  { e.preventDefault(); irA(ultimo); }   // mas antiguo
    if (e.key === 'Enter' && datos.length) {
      location.href = datos[lim(Math.round(prof), 0, ultimo)].href;
    }
  });

  // arrastrar sobre la linea del tiempo: engancha al proyecto mas cercano
  if (barra) {
    const desdeX = e => {
      const r = barra.getBoundingClientRect();
      const p = lim((e.clientX - r.left) / r.width, 0, 1);
      let mejor = 0, dif = 9;
      for (let i = 0; i <= ultimo; i++) { const d = Math.abs(enPct(i) - p); if (d < dif) { dif = d; mejor = i; } }
      irA(mejor);
    };
    let raspando = false;
    barra.addEventListener('pointerdown', e => {
      if (e.target.closest('.marca')) return;
      raspando = true; barra.setPointerCapture(e.pointerId); desdeX(e);
    });
    barra.addEventListener('pointermove', e => { if (raspando) desdeX(e); });
    barra.addEventListener('pointerup',   () => { raspando = false; });
  }

  /* ---- arranque -------------------------------------------- */
  addEventListener('lista:cambia', () => { visto = -1; construir(); });
  addEventListener('resize', medir);

  construir();
  // La camara llega desde el fondo, encadenando con el parpadeo del ojo.
  if (!seco && sessionStorage.getItem('entrando') === '1') {
    sessionStorage.removeItem('entrando');
    prof = -2.6; pintar();
  }
  requestAnimationFrame(tick);
}
