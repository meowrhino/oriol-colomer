/* Welcome. Clic en cualquier sitio: el ojo parpadea y entras al tunel.
   El viaje no acaba aqui — al llegar a work la camara arranca al fondo
   y avanza, asi que los dos movimientos se leen como uno solo. */
import { seco, ms } from './util.js';

const ojo     = document.getElementById('eye');
const lente   = ojo && ojo.querySelector('.lens');
const pupila  = document.getElementById('pupil');
const destino = document.body.dataset.entrar;

if (ojo && destino) {

  /* la pupila mira al cursor, dentro de una elipse para no salirse */
  if (!seco && pupila) {
    let raf = 0, mx = 0, my = 0;
    const mirar = () => {
      raf = 0;
      const r = lente.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / (r.width * 2.2));
      pupila.style.translate =
        `calc(-50% + ${(dx / d) * r.width * .17 * k}px) calc(-50% + ${(dy / d) * r.height * .15 * k}px)`;
    };
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(mirar);
    }, { passive: true });
  }

  /* Los tiempos viven en el CSS (--parpadeo, --zoom): aqui solo se leen,
     para que la navegacion caiga justo al final del zoom y no antes. */
  let yendo = false;
  function entrar(e) {
    if (yendo) return;
    if (e && e.target.closest('a, button')) return;   // idiomas: no entran
    yendo = true;
    sessionStorage.setItem('entrando', '1');          // lo lee el tunel
    if (seco) { location.href = destino; return; }
    document.body.classList.add('entrando');          // primero cierra, luego zoom
    setTimeout(() => { location.href = destino; }, ms('--parpadeo') + ms('--zoom') - 40);
  }

  addEventListener('pointerdown', entrar);
  addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrar(); }
  });

  /* Parpadeo en reposo. Un ojo que no parpadea nunca esta muerto, y los dos
     parpados ya existian para la entrada: aqui solo se les da un motivo.
     Los intervalos son irregulares a proposito —entre 4 y 9 segundos— porque
     a ritmo fijo se oye el metronomo. */
  if (!seco) {
    const cerrado = ms('--parpadeo');
    (function ciclo() {
      setTimeout(() => {
        if (!yendo) {
          ojo.classList.add('pestanea');
          setTimeout(() => ojo.classList.remove('pestanea'), cerrado + 60);
        }
        ciclo();
      }, 4000 + Math.random() * 5000);
    })();
  }
}
