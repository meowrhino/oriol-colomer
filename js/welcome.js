/* ============================================================
   La portada: la bola.
   ------------------------------------------------------------
   Clic en cualquier sitio y entras al tunel: la portada se funde.
   Si nadie hace nada, se entra sola a los pocos segundos
   (data-auto, que sale de "entradaAuto" en data/site.json).

   La bola gira hacia el cursor: su luz (el brillo y el sombreado del
   degradado) se desplaza hacia donde esta el raton, que es lo que se
   ve de una esfera al girar. No lo sigue en linea recta: va con un
   muelle, asi que arranca despacio, acelera y frena. En un telefono
   no hay cursor, y gira sola, de vez en cuando.
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

  // la luz, en reposo arriba a la izquierda (34 % 30 %, como en --bola);
  // hacia el cursor se va hasta el borde, sin salirse
  const pintar = () => {
    pupila.style.setProperty('--gx', (34 + pos.x * 30).toFixed(1) + '%');
    pupila.style.setProperty('--gy', (30 + pos.y * 30).toFixed(1) + '%');
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
      // cuanto mas lejos el cursor, mas gira la bola
      const k = Math.min(1, d / (r.width * 2.2));
      mirar(dx / d * k, dy / d * k);
    }, { passive: true });
  }

  /* En el telefono gira sola: cada pocos segundos hacia un sitio nuevo, y
     a veces vuelve al frente. */
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
  // idiomas, letra y tema: no entran. La bola (.hero) si, aunque sea un enlace
  const otroControl = e => e?.target?.closest?.('a:not(.hero), button');
  function entrar(e) {
    if (yendo || otroControl(e)) return;
    yendo = true;
    if (seco) { location.href = destino; return; }
    document.body.classList.add('entrando');          // la portada se funde
    // work llega tapada y se destapa, como al ir de una pagina a otra (js/transicion.js)
    try { sessionStorage.setItem('transicion', '{}'); } catch {}
    setTimeout(() => { location.href = destino; }, ms('--fundido'));
  }

  // solo el boton principal y sin teclas: el derecho abre el menu del
  // enlace y cmd/ctrl/shift lo abren aparte, sin irse de aqui
  const aparte = e => e.metaKey || e.ctrlKey || e.shiftKey;
  addEventListener('pointerdown', e => { if (!e.button && !aparte(e)) entrar(e); });
  // Enter o espacio sobre un idioma o un boton hacen lo suyo, no entrar
  addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !otroControl(e)) { e.preventDefault(); entrar(); }
  });
  // El enlace de la bola navegaria ya, sin fundido: lo hace entrar(). Con
  // cmd/ctrl/shift se abre aparte, como cualquier enlace.
  ojo.closest('a')?.addEventListener('click', e => { if (!aparte(e)) e.preventDefault(); });

  /* Sin "click anywhere": pasado un rato se entra sola. El reloj se para
     con la pestana en segundo plano y vuelve a empezar al volver, para que
     nadie se encuentre dentro de work sin haber visto la portada. */
  const espera = parseFloat(document.body.dataset.auto) * 1000;
  if (espera > 0) {
    let reloj = setTimeout(entrar, espera);
    document.addEventListener('visibilitychange', () => {
      clearTimeout(reloj);
      if (!document.hidden) reloj = setTimeout(entrar, espera);
    });
  }
}
