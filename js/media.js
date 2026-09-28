/* ============================================================
   Los videos del proyecto, solo cuando se ven
   ------------------------------------------------------------
   Antes cada <video> llevaba `autoplay`, y `autoplay` gana a
   `preload`: los cuatro videos de una pagina se bajaban enteros
   antes de que nadie hiciera scroll. La de AMORE pesaba 9 MB, de
   los cuales 6 eran un clip que esta al final del carrete.

   Ahora salen del generador con preload="none" y sin autoplay: lo
   que se ve de entrada es el poster, que es un fotograma suyo y
   pesa 40 KB. Cuando uno entra en pantalla se le pide el video y
   se reproduce; cuando sale, se para. Igual de vivo, y solo se
   baja lo que de verdad se mira.

   Sin JavaScript queda el poster, que es la misma imagen: la
   pagina se lee entera, que es lo que importa.
   ============================================================ */
import { seco } from './util.js';

const videos = [...document.querySelectorAll('.media video')];

if (videos.length) {
  /* Con movimiento reducido no arranca nada solo. Pero el video sigue
     siendo parte del trabajo, asi que se le ponen los controles: se ve
     cuando se quiera ver, no cuando lo decida la pagina. */
  if (seco) {
    for (const v of videos) v.controls = true;
  } else if (!('IntersectionObserver' in window)) {
    // Sin observador (navegador muy viejo): como antes, todos a la vez.
    for (const v of videos) { v.preload = 'auto'; v.play().catch(() => {}); }
  } else {
    /* Los que ahora mismo tocaria estar viendo. Hace falta la lista aparte
       porque un play() puede no cuajar —ver mas abajo— y entonces hay que
       saber a cuales volver. */
    const enPantalla = new Set();

    /* play() devuelve una promesa, y el navegador la rechaza cuando decide
       que no toca. El caso que importa: en una pestana de fondo Chrome para
       el video sin sonido para ahorrar bateria ("video-only background media
       was paused to save power"). No es un error nuestro, pero si no se
       reintenta al volver, quien abre la pagina en otra pestana y viene
       despues se encuentra los videos congelados en el poster. */
    const arrancar = v => {
      if (document.hidden) return;
      if (v.preload !== 'auto') v.preload = 'auto';
      v.play().catch(() => {});
    };

    /* El margen adelanta la carga media pantalla antes de que asome, que
       es lo que hace que llegue reproduciendose y no en negro. */
    const ojo = new IntersectionObserver(entradas => {
      for (const e of entradas) {
        const v = e.target;
        if (e.isIntersecting) { enPantalla.add(v); arrancar(v); }
        else { enPantalla.delete(v); if (!v.paused) v.pause(); }
      }
    }, { rootMargin: '50% 0px' });

    for (const v of videos) ojo.observe(v);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) for (const v of enPantalla) arrancar(v);
    });
  }
}

/* ============================================================
   El video de YouTube del proyecto
   ------------------------------------------------------------
   Llega del generador como su fotograma con un boton de play, que
   es un enlace a YouTube. Al darle se cambia por el reproductor, y
   solo entonces: el de YouTube son medio mega de guiones, y en una
   pagina que se abre para ver fotos no tiene por que bajarse nadie.
   youtube-nocookie no deja cookies hasta que se reproduce.
   ============================================================ */
/* Una pieza interactiva (una build de Unity) va igual: marco con play y
   el iframe al darle. Lleva permiso de pantalla completa y de mando. */
for (const a of document.querySelectorAll('.media a.pieza[data-pieza]')) {
  a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const f = document.createElement('iframe');
    f.className = 'pieza';
    f.src = a.dataset.pieza;
    f.title = a.getAttribute('aria-label') || '';
    f.allow = 'fullscreen; autoplay; gamepad';
    f.allowFullscreen = true;
    a.replaceWith(f);
    f.focus();
  });
}

for (const a of document.querySelectorAll('.media a.yt[data-yt]')) {
  a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;   // abrir en YouTube, como un enlace
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
    f.title = a.getAttribute('aria-label') || 'YouTube';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    a.replaceWith(f);
  });
}

/* ============================================================
   El bloque del texto, siempre alcanzable
   ------------------------------------------------------------
   El texto se queda quieto mientras bajan las fotos (sticky), y
   lleva dentro anterior/siguiente y los idiomas. Si es mas alto
   que la pantalla —creditos largos, pantalla baja—, pegado arriba
   su final no se veria hasta acabar la pagina. Asi que se pega
   por abajo: el `top` pasa a ser negativo lo justo para que lo
   ultimo quede a la vista. En movil no es caja (display:contents)
   y no hay nada que hacer.
   ============================================================ */
const lado = document.querySelector('.project .side');
if (lado) {
  const ajustar = () => {
    if (getComputedStyle(lado).display === 'contents') return;
    // Pegado de forma que su pie quede donde esta ahora, a la distancia del
    // borde de abajo que marca el relleno de .project: si es corto, no se
    // mueve; si es mas alto que la pantalla, sube lo justo para que se vea.
    const abajo = parseFloat(getComputedStyle(lado.parentElement).paddingBottom) || 0;
    lado.style.setProperty('--side-top', `${Math.round(innerHeight - lado.offsetHeight - abajo)}px`);
  };
  ajustar();
  addEventListener('resize', ajustar);
  if ('ResizeObserver' in window) new ResizeObserver(ajustar).observe(lado);
}
