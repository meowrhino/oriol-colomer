/* ============================================================
   Los dos interruptores junto a los idiomas
   ------------------------------------------------------------
   - letra: toda la web en orioldings (la fuente de simbolos de Oriol) y en mayusculas
   - tema:  claro u oscuro

   Cada uno pone una clase en <html> y se recuerda para la proxima
   visita. La clase la pone ya el <head> antes de pintar (ver
   paginas.mjs), para que no parpadee; aqui solo se conmuta.

   Hasta el 2026-11-03 era Wingdings, que no se puede servir (es de
   Microsoft) y solo funcionaba donde estaba instalada. orioldings
   va en assets/fonts/ y funciona en todos los aparatos.
   ============================================================ */
const html = document.documentElement;

/** Engancha los botones `sel`: conmutan la clase `clase` de <html> y
    guardan `clave` = si / no en el navegador. */
function interruptor(sel, clase, clave, si, no) {
  const botones = [...document.querySelectorAll(sel)];
  const poner = activo => {
    html.classList.toggle(clase, activo);
    for (const b of botones) b.setAttribute('aria-pressed', String(activo));
    try { localStorage.setItem(clave, activo ? si : no); } catch {}
  };
  for (const b of botones) {
    b.hidden = false;
    b.setAttribute('aria-pressed', String(html.classList.contains(clase)));
    b.addEventListener('click', () => poner(!html.classList.contains(clase)));
  }
}

// la clase y la clave siguen llamandose wingdings: lo guardado de antes sigue valiendo
interruptor('.langs .tipo', 'wingdings', 'tipo', 'wingdings', 'normal');

interruptor('.langs .tema', 'oscuro', 'tema', 'oscuro', 'claro');
// el del tema da una vuelta al pulsarlo, como en meowrhino.studio
for (const b of document.querySelectorAll('.langs .tema'))
  b.addEventListener('click', () =>
    b.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 500, easing: 'ease-in-out' }));

