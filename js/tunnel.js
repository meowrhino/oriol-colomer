/* ============================================================
   TUNEL — la vista en profundidad de work
   ------------------------------------------------------------
   `prof` es la posicion de la camara sobre el eje z, medida en
   proyectos: el proyecto i esta en el plano de pantalla cuando
   prof === i. Los de indice mayor quedan al fondo.

   Se construye leyendo la lista <ul class="index"> que ya esta
   en el HTML. No hay datos duplicados: si JavaScript no corre,
   queda la lista, que es lo que lee Google.

   Click en una carta lejana: te acerca. En la de delante: entra.
   ============================================================ */
(() => {
  const zona  = document.getElementById('tunel');
  const lista = document.getElementById('index');
  if (!zona || !lista) return;

  const P       = 900;   // perspectiva, tiene que coincidir con el css
  const SALTO   = 780;   // distancia en z entre proyectos
  const CERCA   = .62 * P;
  const FONDO   = 4.2;   // cuantos proyectos ves hacia atras
  const SNAP_MS = 380;   // quietud antes de encajar en el mas cercano
  const FUERA   = .4;    // cuanto te dejas pasar de los extremos
  const ARRASTRE= 9;     // px antes de considerar que arrastras
  const ALCANCE = .45;   // mas lejos de esto, un click acerca en vez de entrar
  const suavear = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : .16;

  const lim = (v, a, b) => Math.min(b, Math.max(a, v));
  const mez = (a, b, t) => a + (b - a) * t;

  /* ---- semilla estable por slug: la misma carta cae siempre
          en el mismo sitio, entre cargas y entre visitas ---- */
  const semilla = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 10000) / 10000;
  };

  /* ---- construir las cartas desde la lista ---------------- */
  const datos = [...lista.children].map(li => {
    const a = li.querySelector('a');
    return {
      href:  a.getAttribute('href'),
      slug:  a.getAttribute('href').replace(/\/$/, '').split('/').pop(),
      img:   a.dataset.peek || '',
      titulo: li.dataset.title,
      fecha: li.dataset.date,
      tags:  li.dataset.tags,
      rotulo: a.querySelector('.t').childNodes[0].textContent.trim(),
      pie:   a.querySelector('.c').textContent.trim(),
    };
  });
  if (!datos.length) return;

  // La lista viene de mas reciente a mas antiguo, y ese es justo el orden
  // del tunel: el indice 0 esta delante y lo antiguo se pierde al fondo.

  const cartas = datos.map((d, i) => {
    const el = document.createElement('a');
    el.className = 'carta';
    el.href = d.href;
    el.dataset.i = i;
    el.innerHTML = (d.img ? `<img src="${d.img}" alt="" draggable="false">` : '<span class="sin"></span>')
                 + `<span class="pie"><b>${d.rotulo}</b><i>${d.pie}</i></span>`;
    // desvio lateral: deterministico, pero repartido
    const sx = semilla(d.slug), sy = semilla(d.slug + '·y');
    el.style.setProperty('--dx', (sx * 2 - 1).toFixed(3));
    el.style.setProperty('--dy', (sy * 2 - 1).toFixed(3));
    zona.append(el);
    return el;
  });

  const ultimo = datos.length - 1;

  /* ---- linea del tiempo ----------------------------------
     Los marcadores no van a intervalos iguales: cada uno cae
     donde le toca por fecha, asi que dos del mismo mes salen
     pegados y un ano vacio deja hueco.                      */
  const barra  = document.getElementById('barra');
  const marcas = document.getElementById('marcas');
  const pomo   = document.getElementById('pomo');
  const rotulo = document.getElementById('rotulo');
  const dias = d => { const [y,m,x] = d.split('-').map(Number); return Date.UTC(y, m-1, x) / 864e5; };
  const fechas = datos.map(d => dias(d.fecha));
  const t0 = Math.min(...fechas), t1 = Math.max(...fechas);   // izquierda = antiguo
  const span = Math.max(t1 - t0, 1);
  const enPct = i => (fechas[i] - t0) / span;                 // 0..1 por fecha

  if (marcas) datos.forEach((d, i) => {
    const m = document.createElement('button');
    m.type = 'button'; m.className = 'marca';
    m.style.left = (enPct(i) * 100).toFixed(3) + '%';
    m.title = `${d.rotulo} · ${d.pie}`;
    m.setAttribute('aria-label', `ir a ${d.rotulo}, ${d.pie}`);
    m.addEventListener('click', e => { e.preventDefault(); irA(i); });
    marcas.append(m);
  });

  /* ---- estado --------------------------------------------- */
  let prof = 0, meta = 0, quieto = 0, arrastrando = false, agarrado = false;
  let an = 0, al = 0, anchoCarta = 0;

  // Entrada: la camara arranca al fondo y avanza. Encadena con el
  // parpadeo del ojo del welcome: sales de ahi y entras aqui.
  if (sessionStorage.getItem('entrando') === '1') {
    sessionStorage.removeItem('entrando');
    prof = -2.6; meta = 0;   // la camara llega desde el fondo y se posa
  } else {
    prof = meta = 0;         // arranca en el mas reciente, que es el indice 0
  }

  function medir() {
    an = innerWidth; al = innerHeight;
    anchoCarta = cartas[0].offsetWidth || 300;
  }

  /* ---- pintar --------------------------------------------- */
  function tick() {
    requestAnimationFrame(tick);
    prof = mez(prof, meta, suavear);

    for (let i = 0; i < cartas.length; i++) {
      const el = cartas[i];
      const z = (prof - i) * SALTO;
      const delante = i - prof;                       // <0 ya pasada, >0 al fondo

      if (z > CERCA || delante > FONDO) { el.style.visibility = 'hidden'; continue; }
      el.style.visibility = 'visible';

      // margen lateral disponible: cuanto mas al fondo, mas se puede desviar
      const escala = P / (P - z);
      const holgura = Math.max(0, (an - anchoCarta * escala) / 2 - 16) / Math.max(escala, .2);
      const dx = parseFloat(el.style.getPropertyValue('--dx')) * holgura * .62;
      const dy = parseFloat(el.style.getPropertyValue('--dy')) * Math.min(holgura * .5, al * .22);

      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, ${z.toFixed(1)}px)`;
      // aparece desde el fondo y se desvanece al pasar de largo
      const entra = lim((FONDO - delante) / 1.1, 0, 1);
      const sale  = lim((CERCA - z) / (CERCA * .55), 0, 1);
      el.style.opacity = (entra * sale).toFixed(3);
      el.style.zIndex  = String(1000 - Math.round(delante * 10));
      el.classList.toggle('foco', Math.abs(delante) < .5);
    }

    // barra y rotulo
    const cerca = lim(Math.round(prof), 0, ultimo);
    if (pomo) {
      const p = mez(enPct(Math.floor(lim(prof,0,ultimo))),
                    enPct(Math.ceil(lim(prof,0,ultimo))),
                    lim(prof,0,ultimo) % 1);
      pomo.style.left = (p * 100).toFixed(3) + '%';
    }
    if (rotulo && rotulo.dataset.i !== String(cerca)) {
      rotulo.dataset.i = String(cerca);
      rotulo.innerHTML = `<b>${datos[cerca].rotulo}</b> <i>${datos[cerca].pie}</i>`;
    }

    // encajar en el mas cercano tras un rato quieto
    if (!agarrado && quieto && performance.now() - quieto > SNAP_MS) {
      quieto = 0; meta = lim(Math.round(meta), 0, ultimo);
    }
  }

  const mover = d => {
    meta = lim(meta + d, -FUERA, ultimo + FUERA);
    quieto = performance.now();
  };
  const irA = i => { meta = lim(i, 0, ultimo); quieto = 0; };

  /* ---- entrada -------------------------------------------- */
  zona.addEventListener('wheel', e => {
    e.preventDefault();
    mover((Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * .0022);
  }, { passive: false });

  let x0 = 0, y0 = 0, p0 = 0, movido = 0;
  zona.addEventListener('pointerdown', e => {
    if (e.button) return;
    agarrado = true; movido = 0;
    x0 = e.clientX; y0 = e.clientY; p0 = meta;
    zona.setPointerCapture(e.pointerId);
  });
  zona.addEventListener('pointermove', e => {
    if (!agarrado) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    movido = Math.max(movido, Math.hypot(dx, dy));
    if (movido > ARRASTRE) {
      arrastrando = true;
      zona.classList.add('arrastrando');
      meta = lim(p0 - (dx + dy) / 190, -FUERA, ultimo + FUERA);
    }
  });
  const soltar = () => {
    if (!agarrado) return;
    agarrado = false; zona.classList.remove('arrastrando');
    quieto = performance.now();
    setTimeout(() => { arrastrando = false; }, 0);
  };
  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);

  // click: si la carta esta lejos, acerca; si esta delante, entra
  zona.addEventListener('click', e => {
    const c = e.target.closest('.carta');
    if (!c) return;
    if (arrastrando) { e.preventDefault(); return; }
    const i = +c.dataset.i;
    if (Math.abs(i - prof) > ALCANCE) { e.preventDefault(); irA(i); }
  });

  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, button')) return;
    const k = { ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1 }[e.key];
    if (k) { e.preventDefault(); irA(Math.round(meta) + k); return; }
    if (e.key === 'Home') { e.preventDefault(); irA(0); }        // mas reciente
    if (e.key === 'End')  { e.preventDefault(); irA(ultimo); }   // mas antiguo
    if (e.key === 'Enter' && Math.abs(Math.round(prof) - prof) < .5) {
      const i = lim(Math.round(prof), 0, ultimo);
      location.href = datos[i].href;
    }
  });

  // arrastrar la barra del tiempo
  if (barra) {
    const desdeX = e => {
      const r = barra.getBoundingClientRect();
      const p = lim((e.clientX - r.left) / r.width, 0, 1);
      // buscar el proyecto cuya fecha cae mas cerca de esa posicion
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
    barra.addEventListener('pointerup', () => { raspando = false; });
  }

  /* ---- conmutar tunel / lista ----------------------------- */
  const vistas = [...document.querySelectorAll('.vistas button')];
  const aplicar = v => {
    document.body.dataset.vista = v;
    vistas.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === v)));
    try { localStorage.setItem('vista', v); } catch {}
    if (v === 'tunel') medir();
  };
  vistas.forEach(b => b.addEventListener('click', () => aplicar(b.dataset.vista)));
  let guardada = 'tunel';
  try { guardada = localStorage.getItem('vista') || 'tunel'; } catch {}
  aplicar(guardada);

  addEventListener('resize', medir);
  medir();
  requestAnimationFrame(tick);
})();
