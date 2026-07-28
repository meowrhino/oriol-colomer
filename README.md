# oriol colomer — home en profundidad

Prototipo estático. Sin build, sin dependencias.

```bash
cd /Users/meowrhino/Downloads/oriol/web && python3 -m http.server 4321
```

(hace falta servidor porque `main.js` carga `data/projects.json` con `fetch`)

## Cómo tocarlo

- **`data/projects.json`** — todo el contenido. Orden del array = orden cronológico = orden en
  profundidad. Cada proyecto tiene `x`/`y`: el desvío respecto al centro en la distancia focal.
  Es lo que hace que las cosas te pasen por los lados en vez de por el medio.
- **`js/main.js`**, constantes de arriba:
  - `SPACING` — distancia en z entre proyectos (más grande = más recorrido entre uno y otro).
  - `FAR` — cuántos proyectos ves hacia el fondo antes de que se disuelvan.
  - `NEAR` — cuánto se te acerca uno antes de desaparecer.
  - `FOCUS_Z` — cuánto crece la carta al abrirla.
  - En `tick()`, los dos bloques `if (tz <= 0) / else` son las curvas de opacidad y desenfoque:
    el primero es "aún no has llegado", el segundo "ya lo has pasado".

## Responsive

- La dispersión (`x`/`y` del json) **no** se usa tal cual: `measure()` calcula el factor
  mayor con el que todas las cartas siguen cabiendo enteras en su momento, contando el
  tamaño real de cada imagen. En 1280 sale ~0.90, en un móvil ~0.14. Si prefieres que en
  móvil se salgan por los lados (queda más agresivo), sube el mínimo del `clamp` final.
- Por debajo de 760px la ficha técnica deja de salir por el lado y sube desde abajo como
  panel, y la barra cambia las 7 etiquetas por el nombre del proyecto actual.
- Al abrir un proyecto se centra el conjunto **carta + ficha**, no sólo la carta: con la
  carta centrada la ficha se salía por la derecha en cualquier pantalla < ~1120px.
  Si lo quieres estrictamente centrado, pon `state.shift = 0` en `measure()`.

## Estado

- Miniaturas: una por proyecto, sacada al azar del material (frames de vídeo con ffmpeg en
  AMORE y Ouineta). Provisionales.
- Fechas y fichas técnicas: **placeholder**.
