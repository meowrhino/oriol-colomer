# Traspaso: la web a la cuenta de Oriol

Se le pasa una copia del repositorio a su cuenta de GitHub, y la publica su
Cloudflare con su dominio. El de meowrhino se queda como está, de copia
nuestra en `meowrhino.github.io/oriol-colomer/` (sin indexar). Desde el
traspaso son dos repositorios separados: los cambios, en el suyo.

Todo viaja dentro del repositorio: el código, los JSON, las fotos y cómo se
publica (`wrangler.jsonc`). En su copia la Action solo comprueba el build y,
si falla, abre un issue que le llega por correo; no publica en GitHub Pages
(eso lleva `if: github.repository_owner == 'meowrhino'`). Quien publica es
Cloudflare: el build, al no estar en GitHub, va a la raíz con el `url` de
`site.json`.

Tiempo: unos 20 minutos, más lo que tarden los DNS.

## Antes

- [ ] `main` está al día y sin cambios a medias (`git status` limpio).
- [ ] Oriol tiene cuenta de GitHub. Su usuario: `<su-usuario>`.
- [ ] Oriol tiene cuenta de Cloudflare, y el dominio (`oriolcolomerdelgado.com`, por ejemplo) a mano.

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

## 2. Cloudflare

- [ ] En su Cloudflare: **Workers & Pages → Create → Import a repository** → `<su-usuario>/oriol-colomer`.
      Lo demás lo lee de `wrangler.jsonc` (instala sharp con `npm install`, build `node build/build.mjs`, sale `dist/`).
- [ ] **Ojo, es la primera web de la receta que Workers Builds publica en vivo** (tatara va por
      SFTP). Mirar el primer build entero antes de seguir. Si falla por la versión de Node (Workers
      Builds no lee `engines` de `package.json`): **Settings → Build → Variables** →
      `NODE_VERSION` = `22`, y *Retry*. Si aun así no arranca, el respaldo es GitHub Pages en **su**
      cuenta: en su repo, Settings → Pages → Source *GitHub Actions*, y en `.github/workflows/deploy.yml`
      quitar la guarda `if: github.repository_owner == 'meowrhino'` del paso que publica. El dominio
      se apunta entonces a Pages (Settings → Pages → Custom domain) en vez de a Cloudflare.
- [ ] **Settings → Domains & Routes → Add → Custom domain**: su dominio (y `www`, si lo quiere).
- [ ] En **su** repo, `data/site.json` → `"url": "https://oriolcolomerdelgado.com"`. Commit y push
      a su repo (no al de meowrhino). Con eso deja de llevar `noindex`.

## 3. Que nos deje entrar

- [ ] GitHub, en su repo: Settings → Collaborators → `meowrhino`, con **Write** (no hace falta admin).
- [ ] Cloudflare: Manage account → Members → nos invita. Ahí se ve el error entero de un build que falla.

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
