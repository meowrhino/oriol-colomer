/* Indice de work: filtro por tag, orden, y miniatura que sigue al raton.
   Nada de esto toca la URL a proposito: es comodidad de lectura, no
   navegacion. Cada proyecto ya tiene su propia pagina indexable. */
(() => {
  const list = document.getElementById('index');
  if (!list) return;
  const items = [...list.children];

  const press = (group, on) =>
    group.forEach(b => b.setAttribute('aria-pressed', String(b === on)));

  /* ---- filtro por tag ---- */
  const fBtns = [...document.querySelectorAll('.filters button')];
  fBtns.forEach(b => b.addEventListener('click', () => {
    press(fBtns, b);
    const tag = b.dataset.tag;
    items.forEach(li => {
      li.hidden = !!tag && !li.dataset.tags.split(' ').includes(tag);
    });
  }));

  /* ---- orden ---- */
  // fecha: de mas reciente a mas antiguo. cliente y titulo: alfabetico.
  const cmp = {
    date:   (a, b) => b.dataset.date.localeCompare(a.dataset.date),
    client: (a, b) => a.dataset.client.localeCompare(b.dataset.client, 'es'),
    title:  (a, b) => a.dataset.title.localeCompare(b.dataset.title, 'es'),
  };
  const sBtns = [...document.querySelectorAll('.sorts button')];
  sBtns.forEach(b => b.addEventListener('click', () => {
    press(sBtns, b);
    [...items].sort(cmp[b.dataset.sort]).forEach(li => list.append(li));
  }));

  /* ---- miniatura al hover ---- */
  const peek = document.getElementById('peek');
  if (!peek || matchMedia('(hover: none)').matches) return;
  const img = peek.querySelector('img');

  list.addEventListener('pointerover', e => {
    const a = e.target.closest('a[data-peek]');
    if (!a) return;
    if (img.getAttribute('src') !== a.dataset.peek) img.src = a.dataset.peek;
    peek.classList.add('on');
  });
  list.addEventListener('pointerout', e => {
    if (!e.relatedTarget || !list.contains(e.relatedTarget)) peek.classList.remove('on');
  });
  addEventListener('pointermove', e => {
    if (!peek.classList.contains('on')) return;
    const x = Math.min(e.clientX + 24, innerWidth  - peek.offsetWidth  - 12);
    const y = Math.min(e.clientY + 24, innerHeight - peek.offsetHeight - 12);
    peek.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });
})();
