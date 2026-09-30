/* ============================================================
   La portada: el ojo.
   ------------------------------------------------------------
   Clic en cualquier sitio y entras al tunel: la pupila parpadea y
   la portada se funde. Si nadie hace nada, se entra sola a los
   pocos segundos (data-auto, que sale de "entradaAuto" en
   data/site.json).

   La pupila mira al cursor, pero no lo sigue en linea recta: va
   con un muelle, asi que arranca despacio, acelera y frena. En un
   telefono no hay cursor, y el ojo mira solo, de vez en cuando.
   ============================================================ */
import { seco, ms } from './util.js';

const ojo     = document.getElementById('eye');
const lente   = ojo && ojo.querySelector('.lens');
const pupila  = document.getElementById('pupil');
const destino = document.body.dataset.entrar;

if (ojo && destino) {

  /* ---- la mirada -------------------------------------------
     `meta` es a donde quiere mirar, de -1 a 1 en cada eje, dentro de una
     elipse. `pos` y `vel` son el muelle que la persigue. */
  const RIGIDEZ = .045;     // cuanto tira el muelle
  const FRENO   = .80;      // cuanto se come la velocidad: menos = mas rebote
  let meta = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  let raf = 0;

  const pintar = () => {
    const r = lente.getBoundingClientRect();
    pupila.style.translate =
      `calc(-50% + ${(pos.x * r.width * .17).toFixed(2)}px) calc(-50% + ${(pos.y * r.height * .15).toFixed(2)}px)`;
  };
  const paso = () => {
    raf = 0;
    for (const k of ['x', 'y']) {
      vel[k] = (vel[k] + (meta[k] - pos[k]) * RIGIDEZ) * FRENO;
      pos[k] += vel[k];
    }
    pintar();
    const quieto = Math.abs(meta.x - pos.x) + Math.abs(meta.y - pos.y) + Math.abs(vel.x) + Math.abs(vel.y) < 1e-3;
    if (!quieto) raf = requestAnimationFrame(paso);
  };
  const mirar = (x, y) => {
    const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }          // dentro de la elipse
    meta = { x, y };
    if (!raf && !seco) raf = requestAnimationFrame(paso);
  };

  const tactil = matchMedia('(hover: none)').matches;

  if (!seco && pupila && !tactil) {
    addEventListener('pointermove', e => {
      const r = lente.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      // cuanto mas lejos el cursor, mas se va la pupila al borde
      const k = Math.min(1, d / (r.width * 2.2));
      mirar(dx / d * k, dy / d * k);
    }, { passive: true });
  }

  /* En el telefono mira solo: cada pocos segundos a un sitio nuevo, y a
     veces al frente, que un ojo siempre desviado parece bizco. */
  if (!seco && pupila && tactil) {
    (function vagar() {
      if (Math.random() < .3) mirar(0, 0);
      else {
        const a = Math.random() * Math.PI * 2, r = .45 + Math.random() * .55;
        mirar(Math.cos(a) * r, Math.sin(a) * r);
      }
      setTimeout(vagar, 1400 + Math.random() * 2600);
    })();
  }

  /* ---- entrar ---------------------------------------------- */
  let yendo = false;
  function entrar(e) {
    if (yendo) return;
    if (e && e.target && e.target.closest && e.target.closest('a, button')) return;   // idiomas: no entran
    yendo = true;
    try { sessionStorage.setItem('entrando', '1'); } catch {}            // lo lee el tunel
    if (seco) { location.href = destino; return; }
    document.body.classList.add('entrando');          // parpadea, y luego funde
    setTimeout(() => { location.href = destino; }, ms('--parpadeo') + ms('--fundido'));
  }

  addEventListener('pointerdown', entrar);
  addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrar(); }
  });

  /* Sin "click anywhere": pasado un rato se entra sola. El reloj se para
     con la pestana en segundo plano y vuelve a empezar al volver, para que
     nadie se encuentre dentro de work sin haber visto el ojo. */
  const espera = parseFloat(document.body.dataset.auto) * 1000;
  if (espera > 0) {
    let reloj = setTimeout(entrar, espera);
    document.addEventListener('visibilitychange', () => {
      clearTimeout(reloj);
      if (!document.hidden) reloj = setTimeout(entrar, espera);
    });
  }

  /* ---- parpadeo en reposo -----------------------------------
     Entre 4 y 9 segundos, irregular a proposito: a ritmo fijo se oye el
     metronomo. */
  if (!seco) {
    const cerrado = ms('--parpadeo');
    (function ciclo() {
      setTimeout(() => {
        if (!yendo) {
          ojo.classList.add('pestanea');
          setTimeout(() => ojo.classList.remove('pestanea'), cerrado + 40);
        }
        ciclo();
      }, 4000 + Math.random() * 5000);
    })();
  }
}
