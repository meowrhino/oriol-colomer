/* ============================================================
   Controles de work: vista, orden y filtro.
   ------------------------------------------------------------
   La unica fuente de verdad es el <ul class="index"> del HTML.
   Aqui se reordena y se ocultan elementos; el tunel escucha el
   evento 'lista:cambia' y se reconstruye desde ese mismo <ul>.
   Asi las dos vistas nunca pueden discrepar.
   ============================================================ */
(() => {
  const lista = document.getElementById('index');
  if (!lista) return;
  const items = [...lista.children];

  const avisar = () => dispatchEvent(new CustomEvent('lista:cambia'));

  /* ---- menus desplegables --------------------------------- */
  const menus = [...document.querySelectorAll('.menu')];
  const cerrarTodos = menos => menus.forEach(m => {
    if (m === menos) return;
    m.querySelector('.opciones').hidden = true;
    m.querySelector('.cabeza').setAttribute('aria-expanded', 'false');
  });

  /** Crea un menu: devuelve una funcion para leer el valor puesto. */
  function montar(m, alElegir) {
    const cabeza = m.querySelector('.cabeza');
    const caja   = m.querySelector('.opciones');
    const val    = m.querySelector('.val');
    const opts   = [...caja.querySelectorAll('button')];

    const poner = b => {
      opts.forEach(o => o.setAttribute('aria-checked', String(o === b)));
      val.textContent = b.textContent.trim();
      caja.hidden = true;
      cabeza.setAttribute('aria-expanded', 'false');
      alElegir(b.dataset.v);
    };

    cabeza.addEventListener('click', () => {
      const abierto = !caja.hidden;
      cerrarTodos(m);
      caja.hidden = abierto;
      cabeza.setAttribute('aria-expanded', String(!abierto));
      if (!abierto) opts.find(o => o.getAttribute('aria-checked') === 'true')?.focus();
    });
    opts.forEach(b => b.addEventListener('click', () => poner(b)));
    m.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      caja.hidden = true; cabeza.setAttribute('aria-expanded', 'false'); cabeza.focus();
    });

    // valor de arranque: el que viene marcado del generador
    val.textContent = opts.find(o => o.getAttribute('aria-checked') === 'true').textContent.trim();
    return v => opts.find(o => o.dataset.v === v);
  }

  addEventListener('pointerdown', e => { if (!e.target.closest('.menu')) cerrarTodos(null); });

  /* ---- orden ---------------------------------------------- */
  // fecha: de mas reciente a mas antiguo. cliente y titulo: alfabetico.
  const cmp = {
    date:   (a, b) => b.dataset.date.localeCompare(a.dataset.date),
    client: (a, b) => a.dataset.client.localeCompare(b.dataset.client, 'es'),
    title:  (a, b) => a.dataset.title.localeCompare(b.dataset.title, 'es'),
  };
  const mSort = document.querySelector('[data-menu="sort"]');
  if (mSort) montar(mSort, v => {
    [...items].sort(cmp[v]).forEach(li => lista.append(li));
    avisar();
  });

  /* ---- filtro --------------------------------------------- */
  const mTag = document.querySelector('[data-menu="tag"]');
  if (mTag) montar(mTag, v => {
    items.forEach(li => { li.hidden = !!v && !li.dataset.tags.split(' ').includes(v); });
    avisar();
  });

  /* ---- conmutar vista ------------------------------------- */
  const vistas = [...document.querySelectorAll('.vistas button')];
  const aplicar = v => {
    document.body.dataset.vista = v;
    vistas.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === v)));
    try { localStorage.setItem('vista', v); } catch {}
    avisar();
  };
  vistas.forEach(b => b.addEventListener('click', () => aplicar(b.dataset.vista)));
  let guardada = 'tunel';
  try { guardada = localStorage.getItem('vista') || 'tunel'; } catch {}
  aplicar(guardada);

  /* ---- miniatura al pasar por la lista -------------------- */
  const peek = document.getElementById('peek');
  if (!peek || matchMedia('(hover: none)').matches) return;
  const img = peek.querySelector('img');

  lista.addEventListener('pointerover', e => {
    const a = e.target.closest('a[data-peek]');
    if (!a) return;
    if (img.getAttribute('src') !== a.dataset.peek) img.src = a.dataset.peek;
    peek.classList.add('on');
  });
  lista.addEventListener('pointerout', e => {
    if (!e.relatedTarget || !lista.contains(e.relatedTarget)) peek.classList.remove('on');
  });
  addEventListener('pointermove', e => {
    if (!peek.classList.contains('on')) return;
    const x = Math.min(e.clientX + 24, innerWidth  - peek.offsetWidth  - 12);
    const y = Math.min(e.clientY + 24, innerHeight - peek.offsetHeight - 12);
    peek.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });
})();
