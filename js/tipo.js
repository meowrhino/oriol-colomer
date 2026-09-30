/* ============================================================
   Letra normal o wingdings
   ------------------------------------------------------------
   Un boton junto a los idiomas cambia toda la web a Wingdings, en
   mayusculas (ver style.css), y se recuerda para la proxima visita. La clase la pone ya el
   <head> antes de pintar (ver paginas.mjs), para que no parpadee.

   Wingdings no se puede servir desde la web —es de Microsoft—, asi
   que se usa la del aparato: la traen Windows y macOS, pero no
   iPhone ni Android. Por eso el boton sale escondido y solo se
   ensena si la fuente esta: sin ella, cambiar no haria nada.
   ============================================================ */
const botones = [...document.querySelectorAll('.langs .tipo')];

/** ¿Esta Wingdings instalada? Se mide un texto con ella y con una letra
    de reserva: si miden igual, el navegador ha tenido que sustituirla. */
function hayWingdings() {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return false;
  const texto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const medir = f => { c.font = `32px ${f}`; return c.measureText(texto).width; };
  return ['monospace', 'serif'].some(res => medir(`Wingdings, ${res}`) !== medir(res));
}

if (botones.length && hayWingdings()) {
  const html = document.documentElement;
  const poner = activo => {
    html.classList.toggle('wingdings', activo);
    for (const b of botones) b.setAttribute('aria-pressed', String(activo));
    try { localStorage.setItem('tipo', activo ? 'wingdings' : 'normal'); } catch {}
  };
  for (const b of botones) {
    b.hidden = false;
    b.setAttribute('aria-pressed', String(html.classList.contains('wingdings')));
    b.addEventListener('click', () => poner(!html.classList.contains('wingdings')));
  }
} else {
  // sin la fuente no tiene sentido quedarse en wingdings de una visita anterior
  document.documentElement.classList.remove('wingdings');
}
