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
  **`Enter` abre el proyecto que tienes delante** (y lo cierra si ya está abierto): la ficha
  entera se puede leer sólo con teclado.
- **Clic en el nombre** gira la página entera sobre su eje vertical, hacia la izquierda, y
  enseña el about por detrás. La cara que no miras queda `inert`: ni clicks ni tabulador.
- **`#slug` y `#about`** en la url abren directamente ese proyecto o el about, también si el
  hash cambia con la página ya cargada. Los cambios internos van por `replaceState`, así que
  no ensucian el historial ni disparan el `hashchange` propio.
- Con `prefers-reduced-motion`, las interpolaciones de `tick()` saltan al destino y las
  transiciones css quedan en nada: mismo sitio, sin viaje.

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

### `stickers`, en el mismo json

**Apagados de momento**: `"stickers": []`. Los seis de ejemplo están aparcados en
`"stickersOff"`; para volver a encenderlos, mover ese contenido a `"stickers"`. El motor sigue
montado y los PNG siguen en `assets/stickers`.

Decorado. No son proyectos: no se abren, no se clican, no cuentan para la navegación y no
aparecen en el pie de foto. Sólo ocupan un sitio en el túnel —y una marquita fina en la barra—
según su `iso`, para que entre proyecto y proyecto haya algo que mirar.

```json
{ "id": "b1", "iso": "2023-07", "thumb": "assets/stickers/blob-01.png", "scale": 0.46 }
```

- `iso` — dónde cae. Al ser una fecha intermedia, el túnel lo coloca a una profundidad
  fraccionaria: `depthAt()` traduce la fecha al eje de índices, así que un sticker de junio de
  2024 aparece de verdad entre TRISTAN y Ouineta.
- `scale` — tamaño respecto a una carta de proyecto.

Añadir, quitar o mover stickers es sólo tocar este array. Los PNG actuales son **provisionales**:
formas abstractas de relleno casi plano (una rampa de unos 20 niveles, lo justo para que no
parezcan recortes de papel), en la misma banda de grises .30–.70 que el halo y por su mitad
clara, porque cada sticker se pinta dentro de su propia sombra y en oscuro se perdería. Se
generan con

```bash
python3 tools/blobs.py
```

(necesita `pillow`; cambiando las semillas del final del script salen formas distintas). Sirve
cualquier PNG transparente, así que se pueden sustituir por recortes, texturas o lo que sea.

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
| **fuerza** | `--halo` en `:root` | `.5` | multiplica toda la sombra. `0` la quita, `1` es todo lo que da el degradado. **Es la perilla del día a día**, y ahora está a la mitad. Para pasar de `1` hay que subir los alfas del degradado. |
| **tamaño** | `inset:-130% -85%` | | cuánto desborda la carta: `-130%` arriba y abajo (unas 3,6 veces el alto de la foto), `-85%` a los lados. Más negativo = mancha más grande y difusa. Si lo subes hacia `0` la sombra se pega al borde y parece un collar sucio en vez de un hueco. |
| **forma** | `border-radius:50%` | | la hace elipse. Quitándolo sale un rectángulo con las esquinas duras. |
| **caída** | las paradas del `radial-gradient` | `.70 → .30` | siete paradas. Las primeras quedan **tapadas por la foto** (con este `inset`, el borde de la imagen cae sobre el 28% del radio en vertical y el 37% en horizontal), así que las que se ven de verdad son de ahí para fuera. Ahí es donde se ajusta si la quieres más cerrada o más abierta. |
| **color** | los grises del `radial-gradient` | `.70 → .30` | **nunca negro.** Todas las paradas son grises dentro de la banda .30–.70 en la escala 0 = blanco, 1 = negro (o sea, entre `rgb(179)` y `rgb(77)`). El gris va aclarando hacia fuera a la vez que baja el alfa: la nube se apaga sin llegar a tinta en ningún punto. Cada parada lleva su valor apuntado al lado en el css. |

Un matiz: la banda vale para **cada** halo por separado. Donde se solapan dos o tres nubes el
resultado sí baja de .30 en la escala, porque son capas translúcidas apiladas. Si eso molesta,
`--halo` es otra vez el sitio: bajarlo aclara todos los solapes a la vez.

Los stickers llevan su propia versión, más cerrada y más oscura, en `.sticker::before`.

El nombre de arriba, los pies de foto y la nota al pie van con **`mix-blend-mode: difference` y
el texto en blanco**, igual que el menú de mokakopa: sobre el blanco del fondo salen negros, y
según se les pone debajo una nube oscura o una foto se van aclarando solos. Se leen siempre sin
necesidad de caja ni de halo blanco por detrás. Los grises de acompañamiento (`.hint`, el año,
la fecha) no usan `--muted`: en difference el gris sale de bajar el blanco, de ahí el `#757575`.

Para que eso funcione, `.face` lleva **`isolation: isolate`**, y no es opcional: al colgar de un
contenedor con `preserve-3d`, la cara entra en un contexto de render 3d y el blend se queda sin
fondo contra el que mezclar — el texto blanco salía blanco sobre blanco, o sea invisible.

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
- **Abrir y cerrar van en dos tiempos encadenados, nunca a la vez.** Son los dos
  interpoladores, y los encadena `tick()`:
  - `focusT` — la carta viene desde su sitio en la profundidad **hasta el centro de la
    pantalla**. `SETTLED` es el umbral a partir del cual se da por centrada.
  - `slideT` — sólo entonces la carta **se aparta** hacia la izquierda y, a la vez, la ficha
    sale de detrás de ella.

  Al cerrar es exactamente al revés: `slideT` mete la ficha y devuelve la carta al centro, y
  cuando llega a cero `tick()` suelta `focusT` para que la carta vuelva a su sitio.
  El `!state.closing` de la condición de `tick()` parece de más y no lo es: durante el primer
  tiempo del cierre `focus` sigue ≥ 0 y `focusT` sigue en 1, así que sin él, un frame después
  de cerrar la ficha volvía a salir sola y el proyecto no se cerraba nunca.
- **La ficha no tiene transiciones css: la mueve `tick()`.** No es capricho. Lo que la esconde
  "detrás" de la carta no es el z-index —la carta vive en el contexto 3d del túnel y no hay
  forma de intercalar la ficha entre ella y el resto— sino un **recorte** (`clip-path`) por la
  izquierda, justo en el canto derecho de la carta. Ese recorte hay que recalcularlo en el mismo
  frame en que se mueven las dos cosas, o se despega. Ventaja de propina: el recorte también
  recorta los clicks, así que la parte todavía escondida no los intercepta.
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
