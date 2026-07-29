/* oriol colomer — home en profundidad
   depth = posicion de la camara en el eje z, en unidades de proyecto.
   el proyecto i esta enfocado cuando depth === i.                          */

/* ---------- constantes ---------- */
const P        = 900;        // perspective; tiene que coincidir con el css
const SPACING  = 620;        // distancia en z entre proyectos
const NEAR     = 0.70 * P;   // mas cerca que esto ya ha salido de cuadro
const FAR      = 3.4;        // cuantos proyectos ves hacia el fondo
const FOCUS_Z  = 150;        // z de la carta abierta (escritorio)
const FOCUS_ZM = 40;         // z de la carta abierta (movil)
const GAP      = 8;          // aire entre la carta abierta y la ficha
const CAP_H    = 26;         // hueco del pie de foto bajo la carta
const EDGE     = 14;         // margen minimo contra el borde de pantalla
const BLEED    = .07;        // en movil la carta puede salirse este % de dvw:
                             // sin esto no cabe casi nada de desvio horizontal
                             // y el tunel se convierte en una columna
const SNAP_MS  = 420;        // quietud antes de encajar en el proyecto cercano
const OVER     = 0.35;       // cuanto te puedes pasar de los extremos
const SLOP     = 10;         // px antes de considerar que arrastras
const REACH    = .4;         // mas lejos de esto en unidades de proyecto, un
                             // click te acerca en vez de abrir la ficha
const EASE     = .14;        // suavizado del centrado al abrir/cerrar
const SETTLED  = .97;        // a partir de aqui el centrado se da por acabado
                             // y empieza el segundo tiempo (sale la ficha)

/* ---------- dom ---------- */
const $ = id => document.getElementById(id);
const dom = {
  unit:$('unit'),
  stage:$('stage'), tunnel:$('tunnel'), veil:$('veil'),
  sheet:$('sheet'), sTitle:$('sheet-title'), sDate:$('sheet-date'),
  sCredits:$('sheet-credits'), sText:$('sheet-text'), close:$('close'),
  scrubber:$('scrubber'), track:$('track'), fill:$('fill'),
  marks:$('marks'), knob:$('knob'),
  endA:$('end-a'), endB:$('end-b'), current:$('current'),
  author:$('author'), authorBack:$('author-back'),
  about:$('about'), aboutBody:$('about-body')
};

/* ---------- estado ---------- */
const state = {
  depth:0,        // camara, interpolada
  target:0,       // camara, pedida
  focus:-1,       // proyecto pedido (-1 = cerrado)
  shown:-1,       // proyecto que se esta pintando abierto; sobrevive al cierre
  focusT:0,       // 0 en su sitio → 1 centrado, interpolado
  sheetOn:false,  // segundo tiempo: la ficha esta fuera
  max:0,
  shift:0,        // desplazamiento para centrar carta+ficha
  lastInput:0,
  // Todo lo que vive en el tunel, proyectos y stickers, ordenado por
  // profundidad: { el, d, p, pos:{x,y}, scatter:{nx,ny} }. `d` es la
  // profundidad en unidades de proyecto (fraccionaria en los stickers) y `p`
  // el indice del proyecto, o -1 si es un sticker.
  items:[],
  cards:[],       // solo los proyectos, por indice de proyecto
  marks:[],       // botones de la barra, por indice de proyecto
  data:[]
};

/* ---------- helpers ---------- */
const clamp  = (v,a,b) => Math.min(b, Math.max(a, v));
const lerp   = (a,b,t) => a + (b - a) * t;
const smooth = (e0,e1,x) => { const t = clamp((x - e0)/(e1 - e0), 0, 1); return t*t*(3 - 2*t); };
const mobile = () => innerWidth <= 760;
const flipped = () => document.body.classList.contains('flipped');
const focusZ = () => mobile() ? FOCUS_ZM : FOCUS_Z;
const dvw = () => dom.unit.offsetWidth  || innerWidth;
const dvh = () => dom.unit.offsetHeight || innerHeight;
const hash = h => history.replaceState(null, '', h || location.pathname + location.search);

/* ---------- linea del tiempo ----------
   El tunel avanza de proyecto en proyecto (indices), pero la barra es una
   linea de tiempo de verdad: cada marcador cae segun su fecha, asi que dos
   proyectos del mismo mes salen pegados y un ano en blanco deja un hueco.
   state.t[i] = donde cae el proyecto i, 0..1. Las dos funciones de abajo
   traducen entre los dos ejes en los dos sentidos. */
const months = iso => {
  const [y, mo] = String(iso).split('-').map(Number);
  return y * 12 + ((mo || 1) - 1);
};

function timeline(){
  const m = state.data.map(p => months(p.iso || p.year));
  state.t0 = m[0];
  state.span = m[state.max] - state.t0;
  state.t = state.span > 0
    ? m.map(v => (v - state.t0) / state.span)
    : m.map((_, i) => (state.max ? i / state.max : 0));
}

// una fecha cualquiera -> su sitio en la barra, 0..1
const when = iso => state.span > 0
  ? clamp((months(iso) - state.t0) / state.span, 0, 1) : 0;

// indice (fraccionario) -> posicion 0..1 en la barra
function posAt(d){
  if (!state.max) return 0;
  const i = clamp(Math.floor(d), 0, state.max - 1);
  return clamp(lerp(state.t[i], state.t[i + 1], d - i), 0, 1);
}

// posicion 0..1 en la barra -> indice (fraccionario)
function depthAt(t){
  t = clamp(t, 0, 1);
  let i = 0;
  while (i < state.max - 1 && state.t[i + 1] < t) i++;
  const a = state.t[i], b = state.t[i + 1];
  return b > a ? i + (t - a) / (b - a) : i;
}

/* Reparto en espiral de angulo aureo con un giro inicial al azar: cada carga
   coloca las cosas en sitios distintos, pero dos consecutivas en profundidad
   nunca caen en la misma zona de la pantalla (137.5° de separacion) ni sobre
   el centro. Los stickers se van mas afuera, que son decorado y no molestan. */
function scatter(items){
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const a0 = Math.random() * Math.PI * 2;
  items.forEach((it, i) => {
    const a = a0 + i * GOLDEN + (Math.random() - .5) * .5;
    const r = it.p < 0 ? .80 + .45 * Math.random() : .55 + .45 * Math.random();
    it.scatter = { nx: Math.cos(a) * r, ny: Math.sin(a) * r };
  });
}

/* ---------- carga ---------- */
fetch('data/projects.json')
  .then(r => r.json())
  .then(build)
  .catch(() => {
    dom.author.textContent = 'sirve la carpeta con un servidor local (python3 -m http.server)';
  });

function build(json){
  state.data = json.projects;
  state.max = state.data.length - 1;
  timeline();
  dom.author.textContent = dom.authorBack.textContent = json.author;

  state.data.forEach((p, i) => {
    const el = document.createElement('figure');
    el.className = 'card';
    el.innerHTML =
      `<img src="${p.thumb}" alt="${p.title}" draggable="false">` +
      `<figcaption class="cap">${p.title}<span class="yr">${p.year}</span></figcaption>`;
    dom.tunnel.appendChild(el);
    state.cards.push(el);
    state.items.push({ el, d: i, p: i });

    const m = document.createElement('button');
    m.className = 'mark';
    m.type = 'button';
    m.style.left = state.t[i] * 100 + '%';
    m.title = `${p.title} · ${p.date}`;
    m.setAttribute('aria-label', `ir a ${p.title}, ${p.date}`);
    // sin esto el pointerdown llega al track y empieza a arrastrar la barra
    m.addEventListener('pointerdown', e => e.stopPropagation());
    m.addEventListener('click', () => goTo(i));
    dom.marks.appendChild(m);
    state.marks.push(m);
  });

  buildStickers(json.stickers);

  // el tunel se recorre en profundidad: ordenar aqui hace que el reparto en
  // espiral separe lo que vas a ver seguido, no lo que esta seguido en el json
  state.items.sort((a, b) => a.d - b.d);
  scatter(state.items);

  // extremos de la linea del tiempo: solo la primera y la ultima fecha
  dom.endA.textContent = state.data[0].date;
  dom.endB.textContent = state.data[state.max].date;

  buildAbout(json.about);

  // las imagenes llegan tarde y la medida depende de su alto real
  state.items.forEach(it => it.el.querySelector('img').addEventListener('load', measure));
  addEventListener('load', measure);
  measure();
  route();
  requestAnimationFrame(tick);
}

/* Los stickers son decorado: no se abren, no se clican y no cuentan como
   proyecto. Sólo ocupan un sitio en el túnel —y una marquita en la barra—
   segun su fecha, para que entre proyecto y proyecto haya algo que mirar. */
function buildStickers(list){
  (list || []).forEach(s => {
    const t = when(s.iso);
    const el = document.createElement('figure');
    el.className = 'card sticker';
    el.style.width = `calc(var(--card-w) * ${s.scale || .4})`;
    el.innerHTML = `<img src="${s.thumb}" alt="" draggable="false">`;
    dom.tunnel.appendChild(el);
    state.items.push({ el, d: depthAt(t), p: -1 });

    const m = document.createElement('i');
    m.className = 'stick';
    m.style.left = t * 100 + '%';
    dom.marks.appendChild(m);
  });
}

function buildAbout(a){
  if (!a) return;
  dom.aboutBody.innerHTML =
    `<h1>${a.title}</h1>` +
    `<p class="lead">${a.lead}</p>` +
    a.paragraphs.map(t => `<p>${t}</p>`).join('') +
    `<dl class="credits">` +
      Object.entries(a.facts).map(([k,v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') +
    `</dl>` +
    `<ul class="links">` +
      a.links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('') +
    `</ul>` +
    (a.note ? `<p class="note">${a.note}</p>` : '');
}

/* abrir con #slug o #about en la url */
function route(){
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return;
  if (h === 'about') return flip(true);
  const i = state.data.findIndex(p => p.slug === h);
  if (i >= 0){ state.depth = state.target = i; open(i); }
}

/* ---------- medida ----------
   Los x/y ya no vienen del json: se sortean normalizados y aqui se convierten
   a px contra el hueco real que queda en pantalla (dvw/dvh menos el tamano de
   cada carta), asi que ninguna carta puede salirse en su momento de foco. */
function measure(){
  const w = dvw(), h = dvh();
  const cy = 0.46 * h;                                   // centro optico (= css)
  const band = Math.min(cy, h - dom.scrubber.offsetHeight - cy);  // media altura util
  const bleed = mobile() ? BLEED * w : 0;

  state.items.forEach(it => {
    const cw = it.el.offsetWidth, ch = it.el.offsetHeight || cw * .6;
    const s = it.scatter;
    const cap = it.p < 0 ? 0 : CAP_H;     // los stickers no llevan pie de foto
    it.pos = {
      x: s.nx * Math.max(0, w / 2 - cw / 2 - EDGE + bleed),
      y: s.ny * Math.max(0, band - ch / 2 - cap - EDGE)
    };
  });

  // al abrir se centra el conjunto carta+ficha, no solo la carta: si no,
  // la ficha se sale por la derecha en cualquier pantalla < ~1120px
  state.shift = mobile() ? 0 : (dom.sheet.offsetWidth + GAP) / 2;
  if (state.shown >= 0) sheetOffset(state.shown);
  placeCurrent();
  sizeHits();
}

/* Los marcadores van por fecha, asi que pueden caer a pocos pixeles unos de
   otros. Cada uno se queda con la mitad del hueco que tiene al lado: sin esto
   el de al lado se come el toque y siempre abres el mismo proyecto. */
function sizeHits(){
  const tw = dom.track.offsetWidth;
  state.marks.forEach((m, i) => {
    const l = i > 0 ? state.t[i] - state.t[i-1] : 1;
    const r = i < state.max ? state.t[i+1] - state.t[i] : 1;
    m.style.setProperty('--hit', clamp(Math.min(l, r) * tw / 2, 5, 16) + 'px');
  });
}
addEventListener('resize', measure);
addEventListener('orientationchange', measure);

/* ---------- render ---------- */
function tick(now){
  // snap suave al proyecto mas cercano cuando dejas de tocar
  if (state.focus < 0 && now - state.lastInput > SNAP_MS){
    state.target = lerp(state.target, Math.round(state.target), .08);
  }
  state.depth  = lerp(state.depth,  state.target, .10);
  state.focusT = lerp(state.focusT, state.focus >= 0 ? 1 : 0, EASE);

  // la carta que se cierra sigue siendo "la abierta" hasta terminar de volver;
  // si no, cae al else de abajo con focusT aun alto y pega un parpadeo
  if (state.focus < 0 && state.shown >= 0 && state.focusT < .002){
    state.focusT = 0;
    state.shown = -1;
  }

  // Segundo tiempo de la apertura: la ficha no sale hasta que la carta ha
  // terminado de centrarse (al cerrar es al reves, lo lleva close()).
  // El `!pending` no es un detalle: durante el primer tiempo del cierre focus
  // sigue siendo >= 0 y focusT sigue en 1, asi que sin el, un frame despues de
  // cerrar la ficha volvia a salir sola y el proyecto no se cerraba nunca.
  if (state.focus >= 0 && !state.sheetOn && !pending && state.focusT > SETTLED) showSheet();

  const f = state.focusT;

  state.items.forEach(it => {
    const el = it.el;
    const rel = state.depth - it.d;          // >0 = ya lo has pasado
    let tz = clamp(rel * SPACING, -FAR * SPACING - 400, NEAR);

    let op, bl;
    if (tz <= 0){
      // por delante: aparece desde el fondo
      const d = -tz / SPACING;
      op = 1 - smooth(FAR - 1.4, FAR, d);
      bl = smooth(.6, FAR, d) * 5;
    } else {
      // ya pasado: se acerca, crece, se difumina y se va
      op = 1 - smooth(.10 * P, .66 * P, tz);
      bl = smooth(0, .66 * P, tz) * 22;
    }

    let { x, y } = it.pos || { x:0, y:0 };
    let capOp = 1 - Math.min(1, Math.abs(rel) * 1.6);

    if (it.p >= 0 && it.p === state.shown && f > .001){
      // carta abierta (o cerrandose): al centro, nitida, delante de todo
      const fz = focusZ();
      // la perspectiva magnifica x/y igual que el tamano: hay que dividir por
      // el aumento para que el desplazamiento en pantalla sea el pedido
      const mag = P / (P - fz);
      x     = lerp(x, -state.shift / mag, f);
      y     = lerp(y, mobile() ? -0.10 * dvh() / mag : 0, f);
      tz    = lerp(tz, fz, f);
      op    = lerp(op, 1, f);
      bl    = lerp(bl, 0, f);
      capOp = lerp(capOp, 0, f);
    } else {
      op *= 1 - f;
    }

    el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${tz}px)`;
    el.style.opacity = op.toFixed(3);
    el.style.filter = bl > .15 ? `blur(${bl.toFixed(2)}px)` : 'none';
    el.style.zIndex = Math.round(1000 + tz) + (it.p >= 0 && it.p === state.shown ? 5000 : 0);
    // Lo que tienes delante se puede clicar aunque este lejos y borroso: te
    // acerca hasta el. Lo que ya has pasado no: es enorme y esta encima, si
    // fuese clicable se comeria el click de la que estas mirando. Los stickers
    // son decorado y no se clican nunca.
    el.style.pointerEvents =
      it.p >= 0 && (tz <= 0 ? op > .12 : op > .5 && bl < 3) ? 'auto' : 'none';
    if (it.p >= 0) el.querySelector('.cap').style.opacity = (capOp * op).toFixed(3);
  });

  paintScrubber();
  requestAnimationFrame(tick);
}

let painted = -1;
function paintScrubber(){
  dom.knob.style.left = dom.fill.style.width = (posAt(state.depth) * 100) + '%';

  const near = clamp(Math.round(state.depth), 0, state.max);
  if (near === painted) return;
  painted = near;
  state.marks.forEach((m, i) => m.classList.toggle('now', i === near));
  const p = state.data[near];
  dom.current.innerHTML = `${p.title}<span class="cd">${p.date}</span>`;
  placeCurrent();
}

// la nota al pie va centrada sobre su marcador, pero recortada contra los
// extremos de la barra: si no, en el primer y el ultimo proyecto se sale
function placeCurrent(){
  if (painted < 0) return;
  const tw = dom.track.offsetWidth, w = dom.current.offsetWidth;
  dom.current.style.left = clamp(state.t[painted] * tw, w / 2, tw - w / 2) + 'px';
}

/* ---------- input ---------- */
const clampT = v => clamp(v, -OVER, state.max + OVER);

/* Con un proyecto abierto el gesto no mueve el tunel. En escritorio el primer
   scroll cierra; en movil no cierra nada, porque ahi el unico scroll que tiene
   sentido es el del propio panel del proyecto (que va por su cuenta, el .sheet
   tiene su overflow) y la barra de abajo se ha ido. */
function busy(){
  if (flipped()) return true;
  if (state.focus < 0) return false;
  if (!mobile()) close();
  return true;
}

function nudge(d){
  if (busy()) return;
  state.target = clampT(state.target + d);
  state.lastInput = performance.now();
}

function goTo(i){
  if (state.focus >= 0) close();
  state.target = clamp(i, 0, state.max);
  state.lastInput = 0;                        // encaja ya, sin esperar
}

dom.stage.addEventListener('wheel', e => {
  e.preventDefault();
  nudge(e.deltaY * .0022);
}, { passive:false });

/* Seleccion y arrastre van juntos en pointerdown/pointerup, sin usar el evento
   click y sin setPointerCapture (la captura retargetea el click al stage y las
   cartas dejan de recibirlo). Un click de trackpad se mueve unos pixeles:
   hasta SLOP no es un arrastre. */
/* El impacto se calcula a mano en vez de con elementFromPoint. Metidas en dos
   contextos 3d anidados (.book preserve-3d > .stage perspective > .tunnel
   preserve-3d), Chrome no acierta a hacer hit-test de las cartas desplazadas
   en z: devuelve el tunel aunque la carta este justo debajo del raton, y sin
   esto no se podria clicar nada del fondo. Como la proyeccion solo escala y
   traslada —no gira— el rect proyectado es exacto. Gana la mas cercana. */
function cardAt(x, y){
  let hit = null, best = -Infinity;
  state.items.forEach(it => {
    if (it.el.style.pointerEvents === 'none') return;   // stickers incluidos
    const r = it.el.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
    const z = +it.el.style.zIndex || 0;
    if (z > best){ best = z; hit = it.el; }
  });
  return hit;
}

let drag = null, dragging = false;
dom.stage.addEventListener('pointerdown', e => {
  if (e.button) return;
  dragging = false;
  drag = { x:e.clientX, y:e.clientY, t:state.target, card:cardAt(e.clientX, e.clientY) };
  dom.stage.classList.add('dragging');
});

addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!dragging && Math.hypot(dx, dy) < SLOP) return;
  if (!dragging && busy()){ drag = null; return; }
  dragging = true;
  state.target = clampT(drag.t + (-dy - dx * .4) * .006);
  state.lastInput = performance.now();
});

addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag;
  drag = null;
  dom.stage.classList.remove('dragging');
  if (dragging) return;                       // era un arrastre

  const up = cardAt(e.clientX, e.clientY);
  if (up && up === d.card){                   // abajo y arriba en la misma carta
    const i = state.cards.indexOf(up);
    // clicar algo que esta al fondo no lo abre: te lleva hasta el. Una vez
    // delante, el segundo click ya saca la ficha
    if (state.focus === i) close();
    else if (Math.abs(state.depth - i) > REACH) goTo(i);
    else open(i);
  } else if (state.focus >= 0){
    close();                                  // click en el fondo
  }
});

addEventListener('pointercancel', () => {
  drag = null;
  dom.stage.classList.remove('dragging');
});

addEventListener('keydown', e => {
  if (e.key === 'Escape') return flipped() ? flip(false) : close();
  if (flipped()) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(Math.round(state.target) + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(Math.round(state.target) - 1);
  if (e.key === 'Home') goTo(0);
  if (e.key === 'End')  goTo(state.max);
});

/* linea del tiempo: arrastrar la barra */
let scrubbing = false;
const scrubTo = clientX => {
  const r = dom.track.getBoundingClientRect();
  state.target = depthAt((clientX - r.left) / r.width);
  state.lastInput = performance.now();
};
dom.track.addEventListener('pointerdown', e => {
  if (state.focus >= 0) close();
  scrubbing = true;
  dom.track.setPointerCapture(e.pointerId);
  scrubTo(e.clientX);
});
dom.track.addEventListener('pointermove', e => { if (scrubbing) scrubTo(e.clientX); });
const endScrub = () => { if (!scrubbing) return; scrubbing = false; state.lastInput = 0; };
dom.track.addEventListener('pointerup', endScrub);
dom.track.addEventListener('pointercancel', endScrub);

/* ---------- ficha tecnica ---------- */
// la ficha sale por el lado justo del borde de la carta ampliada.
// En movil no aplica: el css la convierte en panel inferior.
function sheetOffset(i){
  const w = state.cards[i].offsetWidth * (P / (P - focusZ()));
  dom.sheet.style.setProperty('--sheet-x', (w / 2 + GAP - state.shift) + 'px');
}

/* Abrir y cerrar van en dos tiempos encadenados, nunca a la vez:
     abrir  → 1) la carta se centra   2) cuando ha llegado, sale la ficha
     cerrar → 1) la ficha se recoge   2) cuando ha entrado, la carta vuelve
   El primer tiempo lo mide tick() con focusT; el segundo, el transitionend de
   la propia ficha, para no tener que repetir aqui la duracion que hay en css.
   `pending` es un cierre a medias: hay que poder cancelarlo si vuelves a
   abrir antes de que termine. */
let pending = null;

function cancelPending(){
  if (!pending) return;
  clearTimeout(pending.timer);
  dom.sheet.removeEventListener('transitionend', pending.done);
  pending = null;
}

function open(i){
  if (flipped()) return;
  cancelPending();
  state.focus = state.shown = i;
  state.target = i;
  const p = state.data[i];

  dom.sTitle.textContent = p.title;
  dom.sDate.textContent  = p.date;
  dom.sText.textContent  = p.text;
  dom.sCredits.innerHTML = Object.entries(p.credits)
    .map(([k,v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

  sheetOffset(i);
  document.body.classList.add('open');
  dom.veil.classList.add('on');     // el velo acompana al centrado
  hash('#' + p.slug);
}

function showSheet(){
  state.sheetOn = true;
  dom.sheet.classList.add('on');
  dom.sheet.setAttribute('aria-hidden', 'false');
}

function close(){
  if (state.focus < 0 || pending) return;
  if (!state.sheetOn) return release();   // aun se estaba centrando: vuelve ya

  state.sheetOn = false;
  dom.sheet.classList.remove('on');
  dom.sheet.setAttribute('aria-hidden', 'true');

  // Solo vale el transform de la propia ficha: es el que dura lo que dura el
  // recogido. La opacidad acaba antes, y engancharse a ella soltaba la carta
  // con la ficha todavia a medio entrar.
  const done = e => {
    if (e && (e.target !== dom.sheet || e.propertyName !== 'transform')) return;
    cancelPending();
    release();
  };
  // el timeout es el plan b: si la transicion no llega a correr (pestana
  // oculta, motion reducido) la carta se quedaria centrada para siempre
  pending = { done, timer: setTimeout(done, 900) };
  dom.sheet.addEventListener('transitionend', done);
}

function release(){
  state.focus = -1;                 // shown se mantiene hasta que focusT llega a 0
  document.body.classList.remove('open');
  dom.veil.classList.remove('on');
  hash('');
}

dom.veil.addEventListener('click', close);
dom.close.addEventListener('click', close);

/* ---------- giro al about ---------- */
function flip(on){
  const to = on === undefined ? !flipped() : on;
  if (to) close();
  document.body.classList.toggle('flipped', to);
  dom.author.setAttribute('aria-expanded', String(to));
  dom.about.setAttribute('aria-hidden', String(!to));
  hash(to ? '#about' : '');
}

dom.author.addEventListener('click', () => flip(true));
dom.authorBack.addEventListener('click', () => flip(false));
