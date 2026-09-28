/* ============================================================
   El correo, a la vista solo al pedirlo
   ------------------------------------------------------------
   En el HTML no esta escrito: el boton guarda la direccion del
   reves y en base64 (data-c). Al clicarlo se monta y el boton se
   cambia por un enlace mailto normal. Los robots que rastrean
   correos leen el HTML, no lo ejecutan ni clican nada: con eso
   basta para quitarse casi todo el spam, sin captcha.
   ============================================================ */
for (const b of document.querySelectorAll('button.correo[data-c]')) {
  b.addEventListener('click', () => {
    const bytes = Uint8Array.from(atob(b.dataset.c), c => c.charCodeAt(0));
    const mail = [...new TextDecoder().decode(bytes)].reverse().join('');
    const a = document.createElement('a');
    a.href = `mailto:${mail}`;
    a.textContent = mail;
    a.className = b.className;
    b.replaceWith(a);
    a.focus();
  });
}
