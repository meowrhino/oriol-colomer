# UX / UI — pendientes

Revisión de usabilidad del 30/09/2026 (portada, túnel, lista, proyecto, about y
lab; escritorio y móvil). Cada punto: el problema, las opciones y la
recomendada (★). Cuando se decida uno, se tacha o se borra.

## Prioridad alta

### ~~1. El gris se lee poco~~ — hecho 1A (`--ink` #737373, 4,5; `--ink-soft` #919191, 3,0)
Contraste sobre el fondo `#fafafa`. Para texto normal el mínimo es 4,5:1
(WCAG AA) y para iconos, 3:1.

| color | dónde | contraste |
|---|---|---|
| `--ink` `#7d7d7d` | textos largos | 3,9 |
| `--ink-soft` `#a6a6a6` | nav, fechas, subtítulos | 2,3 |
| `--ink-faint` `#c4c4c4` | etiquetas, subtítulos de la lista, firma | 1,7 |
| `--btn-subtle` | tema, wingdings, idioma | 2,1 |
| `--ink-hard` `#646464` | activo | 5,7 ✓ |

- ★ A) Oscurecer solo lo que se lee (`--ink` y `--ink-soft`); el faint, para lo decorativo. ~20 min.
- B) Oscurecer toda la escala un paso. Cambia el aire de la web.
- C) Dejarlo así por estética, asumiendo que al sol o en móvil cuesta leer.

### 2. El idioma como toggle esconde las opciones
`EN` no dice que existen ES y CAT, y para ir de EN a ES hay que pulsar dos veces.
- ★ A) Los tres a la vista, `EN ES CAT`, con el actual en negrita. Un clic y nada escondido.
- B) Mantener el toggle, pero enseñar el siguiente: `→ CAT`.
- C) Dejarlo así.

### 3. No queda claro qué hace el botón `tunnel`
La mayoría lee la palabra de un botón como lo que va a pasar al pulsarlo, no como
lo que ya está activo.
- ★ A) Que diga la otra vista (`list` estando en el túnel).
- B) Volver a `tunnel / list` con la activa en negrita.
- C) Dejarlo así.

### 4. Las etiquetas `lx vs dc` no se explican
Salen en cada fila, y el filtro `all ▾` ofrece esas mismas abreviaturas.
- ★ A) Nombres completos en el filtro (lighting, visuals, direction…) y las abreviaturas solo en las filas.
- B) Nombres completos en todas partes.
- C) Quitarlas de las filas y dejarlas solo en el filtro.

### 5. La portada entra sola a los 8 s sin avisar
No hay nada que diga "clic para entrar", y quien está mirando el nombre se
encuentra de golpe en otra página (`entradaAuto` en `data/site.json`).
- ★ A) Un `enter` discreto que aparece bajo el nombre a los 2 s.
- B) Quitar la entrada automática (`"entradaAuto": 0`).
- C) Una línea fina que se llena mientras cuenta.

## Prioridad media

### 6. La miga de pan pierde "work" dentro de un proyecto
Sale `home / La Roda - Ouineta / about / lab`, y el proyecto parece una sección más.
- ★ A) `home / work / about / lab` fijo; el título ya está en grande en la página.
- B) `work › La Roda`.

### ~~7. Lab: un solo proyecto y sin portada~~ — hecho 7A (captura de la pieza en `media/spacetime/thumb.webp`)
En el túnel sale una carta gris vacía y una línea del tiempo de una sola bola.
- ★ A) Ponerle portada a spacetime (vale una captura). Hace falta pase lo que pase.
- B) Que lab abra en lista mientras tenga menos de 3 proyectos.

### 8. Los iconos no se entienden sin pasar el ratón por encima
El ojo de "wingdings" no se adivina, y en móvil no hay tooltip.
- ★ A) Aceptarlo: es un guiño, y el cambio se ve al instante al pulsarlo.
- B) Cambiar el ojo por un icono más claro.

### ~~9. Probablemente hay tres fundidos al entrar desde la portada~~ — hecho (fuera el `aparece`)
Parpadeo y fundido de la portada, luego el fundido entre páginas y luego el
`aparece` del túnel. Falta comprobarlo a la vista.
- ★ Quitar el `aparece` del túnel: el fundido entre páginas ya lo cubre. ~5 min.

### 10. Proyecto: idioma, letra y tema no están centrados
En el resto de pies van centrados; en proyecto, a la derecha de `back`.
- ¿Centrarlos también aquí o dejarlos junto a anterior/siguiente?

## Prioridad baja

### 11. Sin el recuadro, la vista previa no avisa de nada
Oriol ya no ve las fotos que faltan mientras previsualiza; solo se entera en
Actions, después de publicar.
- A) Que el recuadro vuelva solo cuando haya avisos, plegado.
- B) Dejarlo así.

## Ya está bien
- El foco del teclado se ve (no hay `outline:none`).
- El túnel se maneja con flechas, Home, End y Enter.
- Las zonas táctiles miden 44 px.
- Con "reducir movimiento" no hay animaciones ni fundidos.
