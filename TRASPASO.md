# Traspaso: la web a la cuenta de Oriol

Se le pasa una copia del repositorio a su cuenta de GitHub (`ics-de/web`), y
la publica su GitHub Pages con su dominio. El de meowrhino se queda como está,
de copia nuestra en `meowrhino.github.io/oriol-colomer/` (sin indexar). Desde
el traspaso son dos repositorios separados: los cambios, en el suyo.

Todo viaja dentro del repositorio: el código, los JSON, las fotos y cómo se
publica (la Action). Las dos copias publican con la misma Action, y el build
decide por el dueño del repo: en `meowrhino`, `/oriol-colomer/` y `noindex`; en
la suya, la raíz con el `url` de `site.json`. Si el build falla, abre un issue
que le llega por correo.

Tiempo: unos 20 minutos, más lo que tarden los DNS.

## Antes

- [ ] `main` está al día y sin cambios a medias (`git status` limpio).
- [ ] Oriol tiene cuenta de GitHub. Su usuario: `<su-usuario>`.
- [ ] El dominio, `oriolcolomerdelgado.com`, en su Cloudflare (solo el DNS).

## 1. Su copia

- [ ] En su cuenta, **New repository** → `oriol-colomer`, público y vacío (sin README ni licencia).
- [ ] La copia va **sin historial** (la nuestra lleva pruebas y rutas que ya no son). Desde esta carpeta:
      ```bash
      rm -rf /tmp/oriol && mkdir /tmp/oriol && git archive HEAD | tar -x -C /tmp/oriol
      cd /tmp/oriol && rm CLAUDE.md TRASPASO.md
      git init -b main && git add -A && git commit -m "La web de Oriol"
      git push https://github.com/<su-usuario>/oriol-colomer.git main
      ```
      (si pide permiso, que nos añada antes como colaboradores, paso 3). Nada de `push --mirror`.
- [ ] En su copia no van `CLAUDE.md` ni `TRASPASO.md` (son nuestros; se quedan en el repo de
      meowrhino). `GUIA.md` y `README.md` sí: el README le manda a la GUIA en la primera línea.

## 2. GitHub Pages, en su repo (necesita ser admin: él)

Las dos copias publican en GitHub Pages con la misma Action (no Workers: no sirve
ficheros de más de 25 MiB, y el `.wasm` de spacetime pesa 47). Su repo, **público**
(Pages gratis no publica privados).

- [ ] **Settings → Pages → Source: GitHub Actions** (sin elegir ningún workflow: ya lo lleva).
- [ ] **Custom domain**: `oriolcolomerdelgado.com`, y **Enforce HTTPS** cuando GitHub tenga el certificado.
- [ ] En su Cloudflare, **DNS** del dominio, en *DNS only* (nube gris) hasta que salga el certificado:
      cuatro `A` en `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`,
      y `CNAME` `www` → `ics-de.github.io`. Si había un Worker con el dominio, quitárselo antes.
- [ ] En su repo, pestaña **Actions**: `build & deploy` en verde.

## 3. Que nos deje entrar

- [ ] GitHub, en su repo: Settings → Collaborators → `meowrhino`, con **Write** (no hace falta admin).

## 4. Comprobar en su dominio

- [ ] La portada, `/work/`, un proyecto, `/lab/` y `/about/`, y los mismos en `/es/` y `/ca/`.
- [ ] Un vídeo se reproduce y la pieza de lab arranca (los `.br` de Unity).
- [ ] `view-source:`: `canonical` y `og:url` con su dominio, y **sin** `<meta name="robots" content="noindex">`.
- [ ] `/robots.txt` dice `Allow` y `/sitemap.xml` tiene las direcciones de su dominio.
- [ ] Compartir un proyecto por WhatsApp: sale su foto (la og).
- [ ] En `/about/`, la firma `web: meowrhino estudio` con su enlace.

## 5. Search Console, con su cuenta de Google

- [ ] Dar de alta el dominio (el registro TXT, en el DNS de Cloudflare) y enviar `sitemap.xml`.

## 6. Oriol en su ordenador

Con él delante, siguiendo [GUIA.md](GUIA.md) ("La primera vez: preparar VS Code"):

- [ ] Clona **su** repositorio, no el de meowrhino, en una carpeta **fuera de Google Drive** (ni iCloud ni Dropbox).
      El repo ya lleva `.vscode/settings.json`: *Sync* pone sus commits encima de los nuestros sin preguntar.
- [ ] Live Server: **Go Live** y ve la vista previa.
- [ ] Un cambio pequeño (una coma en el about), Confirmar → Sincronizar, y la bolita verde en GitHub.
- [ ] El aviso: quitar una coma a propósito, subirlo, y que le llegue el correo de GitHub
      "La web no se ha publicado". Ponerla, subirlo, y que el issue se cierre solo. Si el correo
      no llega: en GitHub, Settings → Notifications, que tenga el correo marcado en *Watching*.

## 7. Al acabar

- [ ] Fila de oriol en `JAMstack/inventario.md` con las dos direcciones (github.io y su dominio).
- [ ] La copia de meowrhino sigue en github.io con `noindex`: no compite en Google. Si molesta,
      Settings → Pages → **Unpublish site** (el repo se queda).
