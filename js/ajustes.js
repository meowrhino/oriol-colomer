/* ============================================================
   Los dos interruptores junto a los idiomas
   ------------------------------------------------------------
   - letra: toda la web en Wingdings y en mayusculas
   - tema:  claro u oscuro

   Cada uno pone una clase en <html> y se recuerda para la proxima
   visita. La clase la pone ya el <head> antes de pintar (ver
   paginas.mjs), para que no parpadee; aqui solo se conmuta.

   Wingdings no se puede servir desde la web —es de Microsoft—, asi
   que se usa la del aparato: la traen Windows y macOS, pero no
   iPhone ni Android. Por eso su boton sale escondido y solo se
   ensena si la fuente esta: sin ella, cambiar no haria nada.
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

/** ¿Esta Wingdings instalada? Se mide un texto con ella y con una letra
    de reserva: si miden igual, el navegador ha tenido que sustituirla. */
function hayWingdings() {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return false;
  const texto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const medir = f => { c.font = `32px ${f}`; return c.measureText(texto).width; };
  return ['monospace', 'serif'].some(res => medir(`Wingdings, ${res}`) !== medir(res));
}

if (hayWingdings()) interruptor('.langs .tipo', 'wingdings', 'tipo', 'wingdings', 'normal');
// sin la fuente no tiene sentido quedarse en wingdings de una visita anterior
else html.classList.remove('wingdings');

interruptor('.langs .tema', 'oscuro', 'tema', 'oscuro', 'claro');
// el del tema da una vuelta al pulsarlo, como en meowrhino.studio
for (const b of document.querySelectorAll('.langs .tema'))
  b.addEventListener('click', () =>
    b.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 500, easing: 'ease-in-out' }));

// el desplegable del idioma se cierra al pulsar fuera
addEventListener('pointerdown', e => {
  for (const d of document.querySelectorAll('.langs details[open]'))
    if (!d.contains(e.target)) d.open = false;
});
