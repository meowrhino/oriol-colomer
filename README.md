# oriol colomer — home en profundidad

Prototipo estático. Sin build, sin dependencias.
Publicado en <https://meowrhino.github.io/oriol-colomer/>.

```bash
python3 -m http.server 4321
```

(hace falta servidor porque `main.js` carga `data/projects.json` con `fetch`; abriendo el
`index.html` a pelo desde el Finder no funciona)

## Qué hace

Los proyectos están en un túnel: `depth` es la posición de la cámara en el eje z, medida en
proyectos. El proyecto `i` está enfocado cuando `depth === i`. Scroll, arrastre, flechas,
`Home`/`End` y la barra de abajo mueven `depth`; al soltar, encaja solo en el más cercano.

- **Clic en una carta** la trae al centro y saca la ficha técnica. En escritorio la ficha sale
  por el lado y se centra el conjunto carta+ficha; en móvil sube desde abajo como panel.
- **Clic en el nombre** gira la página entera sobre su eje vertical, hacia la izquierda, y
  enseña el about por detrás.
- **`#slug` y `#about`** en la url abren directamente ese proyecto o el about.

## Cómo tocarlo

### `data/projects.json`

Todo el contenido. El orden del array es el orden en profundidad **y** tiene que ser
cronológico, del más antiguo al más reciente.

- `iso` (`AAAA-MM`) — lo único que decide dónde cae el marcador en la línea del tiempo. Dos
  proyectos del mismo mes salen pegados; un año sin nada deja un hueco vacío.
- `date` — sólo el texto que se enseña (puede ser un rango: `"nov 2025 — mar 2026"`).
- `year` — el que sale en el pie de la miniatura.
- Las posiciones `x`/`y` ya no están aquí: se sortean en cada carga (ver abajo).

**Las fechas, las fichas técnicas y el about son inventados.** Hay que sustituirlos.

### `js/main.js`, constantes de arriba

- `SPACING` — distancia en z entre proyectos (más grande = más recorrido entre uno y otro).
- `FAR` — cuántos proyectos ves hacia el fondo antes de que se disuelvan.
- `NEAR` — cuánto se te acerca uno antes de desaparecer.
- `FOCUS_Z` / `FOCUS_ZM` — cuánto crece la carta al abrirla, en escritorio y en móvil.
- `BLEED` — cuánto puede salirse una carta por los lados en móvil.
- En `tick()`, los dos bloques `if (tz <= 0) / else` son las curvas de opacidad y desenfoque:
  el primero es "aún no has llegado", el segundo "ya lo has pasado".

### `css/style.css`

- `--flip` es la duración del giro al about.
- `--halo` es la fuerza de la sombra (ver abajo).

## La sombra de cada proyecto

No es un `box-shadow`: es un **degradado radial en un pseudo-elemento** detrás de la imagen,
`.card::before`. Un `box-shadow` sigue el rectángulo de la foto y se lee como un borde; esto es
una mancha ovalada mucho más grande que la carta, así que lo que ves no es el contorno de la
imagen sino un hueco en el blanco del fondo. Al ir dentro de `.card`, hereda la opacidad, el
`blur` y la escala en z de la carta: se acerca, se difumina y se apaga con ella, gratis.

Los parámetros, todos en `.card::before` salvo el primero:

| qué | dónde | ahora | qué hace |
|---|---|---|---|
| **fuerza** | `--halo` en `:root` | `.9` | multiplica toda la sombra. `0` la quita, `1` es el máximo que da el degradado. Es la perilla del día a día. |
| **tamaño** | `inset:-95% -62%` | | cuánto desborda la carta: `-95%` arriba y abajo (casi el triple de alto que la foto), `-62%` a los lados. Más negativo = mancha más grande y más difusa. Si lo subes hacia `0` la sombra se pega al borde y parece suciedad. |
| **forma** | `border-radius:50%` | | la hace elipse. Quitándolo sale un rectángulo con las esquinas duras. |
| **caída** | las paradas del `radial-gradient` | `.26 → 0` | seis paradas de negro con alfa decreciente. Las primeras (0–34%) quedan **tapadas por la foto**, así que sólo tocan si cambias también el `inset`; las que se ven de verdad son las de 54% a 88%. Ahí es donde se ajusta si quieres la sombra más cerrada o más abierta. |
| **color** | `rgba(17,17,17,…)` | | el mismo negro que `--ink`. Con un color se tiñe el fondo en vez de oscurecerlo. |

`pointer-events:none` no es decorativo: la mancha ocupa casi tres veces la carta y, si fuese
clicable, abrirías proyectos apuntando al vacío y las sombras de unas cartas se robarían los
clicks de otras.

## Detalles que no son obvios

- **Las cartas cambian de sitio en cada carga.** `scatter()` reparte los ángulos con la espiral
  áurea y un giro inicial al azar: sale distinto cada vez, pero dos proyectos consecutivos nunca
  caen en la misma zona de la pantalla ni sobre el centro. Luego `measure()` convierte ese
  reparto normalizado a píxeles contra el hueco real que queda (`dvw`/`dvh` medidos con la sonda
  `#unit`, menos el tamaño de cada imagen), así que ninguna carta se sale en su momento de foco.
- **La barra no va a intervalos iguales.** El túnel avanza por índices pero la barra es una línea
  de tiempo de verdad. `posAt()` y `depthAt()` traducen entre los dos ejes en los dos sentidos.
- **La zona de toque de cada marcador se calcula sola** (`sizeHits()`): cada uno se queda con la
  mitad del hueco que tiene al lado, o dos proyectos del mismo mes se robarían el toque.
- **Abrir y cerrar van en dos tiempos encadenados, nunca a la vez.** Al abrir, primero la carta
  se centra y sólo cuando ha llegado sale la ficha; al cerrar, primero se recoge la ficha y
  cuando ha entrado del todo la carta vuelve a su sitio. El primer tiempo lo mide `tick()` con
  `focusT` (`SETTLED` es el umbral a partir del cual se da por centrada); el segundo lo dispara
  el `transitionend` de la propia ficha, para no repetir en el js la duración que está en el
  css. Hay un `setTimeout` de respaldo por si la transición no llega a correr.
- **Al cerrar, la animación es simétrica.** `state.shown` sobrevive al cierre: la carta sigue
  siendo "la abierta" hasta que `focusT` llega a 0. Sin eso caía de golpe a opacidad 0 y volvía
  a aparecer, que era un parpadeo feo.
- **Clicar un proyecto del fondo no lo abre: te lleva hasta él.** Más lejos de `REACH` el click
  sólo acerca la cámara; el segundo click, ya delante, saca la ficha. Lo que ya has pasado no es
  clicable.
- **El hit-test de las cartas está hecho a mano** (`cardAt()`). Metidas en dos contextos 3d
  anidados, Chrome no acierta con `elementFromPoint` en las cartas desplazadas en z: devuelve el
  túnel aunque la carta esté justo debajo del ratón. Como la proyección sólo escala y traslada,
  el rect proyectado es exacto y se puede comparar a mano; gana la de z-index más alto.
- **En móvil, con un proyecto abierto la barra se va** y los gestos dejan de mover el túnel: el
  único scroll que queda es el del panel. En escritorio el primer scroll cierra el proyecto.
- **Las cartas ya pasadas no son clicables.** Son enormes y están delante: si siguieran
  clicables se comerían el click de la que estás mirando.

## Estado

- Miniaturas: una por proyecto, sacada al azar del material (frames de vídeo con ffmpeg en
  AMORE y Ouineta). Provisionales.
- Fechas, fichas técnicas y about: **inventados**.
