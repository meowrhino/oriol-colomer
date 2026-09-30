# Traspaso: la web a la cuenta de Oriol

Se copia el repositorio a su cuenta de GitHub. El de meowrhino se queda como
está, de copia nuestra. A partir del traspaso son dos repositorios separados:
lo que se toque en uno no pasa al otro.

Todo lo que hace falta viaja dentro del repositorio: el código, los JSON, las
fotos y la receta que publica (`.github/workflows/deploy.yml`). No hay nada
más que llevarse.

Tiempo: unos 20 minutos, más lo que tarden los DNS si hay dominio.

## Antes

- [ ] Oriol tiene cuenta de GitHub. Apunta su usuario: `<su-usuario>`.
- [ ] `main` está al día y sin cambios a medias (`git status` limpio).
- [ ] Decidido si va con dominio propio o en `https://<su-usuario>.github.io/oriol-colomer/`.

## 1. Crear su repositorio

En su cuenta (o en la nuestra, con Oriol dentro del navegador):
**New repository** → nombre `oriol-colomer`, **público**, y **vacío**: sin
README, sin `.gitignore`, sin licencia.

Si se llama distinto, hay que cambiar `base` en el paso 3.

## 2. Subirle todo, con el historial

Desde esta carpeta:

```bash
git push https://github.com/<su-usuario>/oriol-colomer.git main
```

Si pide permiso: Oriol nos añade como colaboradores (Settings →
Collaborators) y aceptamos la invitación, o lo hace él desde su ordenador.

## 3. Ajustar `data/site.json` en su repositorio

Sin dominio:

```json
"baseUrl": "https://<su-usuario>.github.io",
"base": "/oriol-colomer"
```

Con dominio (y `"domain"`, que hace que el build escriba el `CNAME`):

```json
"baseUrl": "https://oriolcolomerdelgado.com",
"base": "",
"domain": "oriolcolomerdelgado.com"
```

Commit y push **a su repositorio**. Ojo: no al de meowrhino, que tiene que
seguir apuntando a sí mismo.

## 4. Encender la publicación

En su repositorio: Settings → Pages → *Build and deployment* → *Source*:
**GitHub Actions**.

Después, pestaña **Actions** → *build & deploy* → **Run workflow** (o cualquier
push). En un par de minutos, bolita verde y la web está en la dirección del
paso 3.

## 5. Dominio (si lo hay)

En el proveedor del dominio:

- registros `A` a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y
  `185.199.111.153`
- `CNAME` de `www` a `<su-usuario>.github.io`

En su repositorio: Settings → Pages → *Custom domain* → el dominio, y cuando
lo acepte, **Enforce HTTPS**. Los DNS pueden tardar de minutos a un día.

## 6. Comprobar

- [ ] La portada, `/work/`, un proyecto, `/lab/` y `/about/` cargan.
- [ ] Los tres idiomas.
- [ ] Un vídeo se reproduce y una foto se ve (las rutas de `media/` van bien).
- [ ] Ver el código de la página (`view-source:`): el `canonical` y el
      `og:url` apuntan a la dirección nueva, no a meowrhino.
- [ ] `https://<la-dirección>/sitemap.xml` tiene las direcciones nuevas.

## 7. Oriol en su ordenador

Con él delante, siguiendo el README ("La primera vez: preparar VS Code"):

- [ ] Clona **su** repositorio, no el de meowrhino.
- [ ] Instala Live Server y ve la vista previa con **Go Live**.
- [ ] Hace un cambio pequeño (una coma en el about), Confirmar → Sincronizar, y
      lo ve publicado en Actions.

## 8. El de meowrhino

La copia de meowrhino sigue publicada en `meowrhino.github.io/oriol-colomer`.
Dos webs iguales en dos direcciones compiten en Google, así que cuando la suya
esté en marcha: en el repositorio de meowrhino, Settings → Pages → **Unpublish
site**. El repositorio se queda, con todo su historial.
