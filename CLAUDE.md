# oriol-colomer, para Claude

La web de Oriol Colomer Delgado, hecha por meowrhino con la receta del estudio
([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)). Se habla en
castellano. Cómo está hecha: [README.md](README.md); lo que edita Oriol:
[GUIA.md](GUIA.md).

## Si el build falla (la web no se ha publicado)

Cuando falla, la web se queda como estaba. Para arreglarlo:

1. **El error**, en uno de estos sitios:
   - En las dos copias (la nuestra, `meowrhino/oriol-colomer`, y la de Oriol),
     la Action abre un issue con la etiqueta `build` y el mensaje dentro:
     `gh issue list --label build` y `gh issue view <n>` (en la suya, con
     `-R ics-de/web`). El registro entero: `gh run list -L 3` y
     `gh run view <id> --log-failed`.
2. **Reprodúcelo aquí**: `npm ci && node build/build.mjs`. Es el mismo build que
   en la nube y dice lo mismo: cada línea con ✗ trae el fichero y qué pasa.
3. **Arréglalo donde dice**, casi siempre en `data/*.json` o en
   `projects/<slug>/project.json`:
   - "no es un JSON valido (linea 12…)": una coma de más o de menos, o unas
     comillas sin cerrar, cerca de esa línea.
   - "no es un campo de aquí", "falta…", "no tiene la forma que toca": lo dice
     el esquema (`schema/<tipo>.json`); el mensaje lleva cómo va el campo.
   - "no hay ningun 3.webp … en projects/<slug>/img/": una foto de `photos`
     que no está en `img/`. Pregunta si falta subirla; si no, quítala de
     `photos` y dilo.
   - "la lista … dice …, pero no hay ninguna carpeta": el slug de
     `data/site.json` → `lists` y el nombre de la carpeta no son iguales.
4. **Comprueba**: `node build/build.mjs` sin ✗ (los ⚠ no paran nada).

No cambies el build, las plantillas ni el esquema para que pase: si el dato
está bien y el build se queja, es un fallo del build, y hay que decírselo a
manu. No borres fotos ni proyectos.

Commit y push solo cuando te lo pidan: mensaje en castellano diciendo qué se
arregla. Cuando el build vuelve a pasar, la Action cierra el issue sola.

## Lo que nuestra copia tiene distinto de la de Oriol

Las dos copias son iguales salvo esto. Al traer sus cambios a la nuestra
(«Al día con la copia de Oriol»), no lo pises:

- **Solo nuestros**: `CLAUDE.md`, `TRASPASO.md` y el `README.md` (el suyo es
  otro).
- **7 animaciones en webm** (2026-11-10, una prueba nuestra): en la suya son
  webp animados (181 MB entre las siete); en la nuestra, `N.webm` +
  `N.poster.webp` (18 MB): `ballet-electronic/img/1`,
  `liquid-latex-rmx-llum/img/1, 3, 4, 5, 6` y `el-nino-bola-mori/img/2`. Si en
  la suya cambian esas carpetas, trae lo demás pero no vuelvas a meter esos
  `N.webp` (con un `N.webm` y un `N.webp` a la vez, solo sale la foto). Si
  Oriol cambia una de esas animaciones, conviértela otra vez (sharp saca los
  fotogramas, ffmpeg a VP9 `-crf 30`, el primer fotograma de póster). Si
  decidimos pasárselo, esta sección sobra.
