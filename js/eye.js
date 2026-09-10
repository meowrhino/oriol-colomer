/* La pupila mira al cursor. Se mueve dentro de una elipse, no de un
   cuadrado, para que nunca se salga del contorno del ojo. */
(() => {
  const lens = document.querySelector('.lens');
  const pupil = document.getElementById('pupil');
  if (!lens || !pupil) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let raf = 0, mx = 0, my = 0;

  const move = () => {
    raf = 0;
    const r = lens.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const a = r.width * 0.17, b = r.height * 0.15;   // radios del recorrido
    let dx = mx - cx, dy = my - cy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / (r.width * 2.2));      // lejos = tope, cerca = suave
    pupil.style.translate = `calc(-50% + ${(dx / d) * a * k}px) calc(-50% + ${(dy / d) * b * k}px)`;
  };

  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    if (!raf) raf = requestAnimationFrame(move);
  }, { passive: true });
})();
