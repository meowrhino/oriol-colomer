# -*- coding: utf-8 -*-
"""
Importa la ficha tecnica (CSV) a data/projects.json.
Se ejecuta UNA VEZ para arrancar, o cuando llegue un CSV nuevo.
El dia a dia es editar el JSON directamente.

    python3 build/import-csv.py "/ruta/al/fitxa.csv"

Conserva las traducciones es/cat que ya existan en el JSON: solo
rellena lo que venga vacio.
"""
import csv, json, os, re, sys, unicodedata

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CSV  = sys.argv[1] if len(sys.argv) > 1 else \
       "/Users/meowrhino/Desktop/WEB ORIOL/web-fitxa_tecnica - Sheet1.csv"
OUT  = os.path.join(ROOT, "data", "projects.json")

# slug (URL definitiva, no se toca nunca) -> carpeta en media/, portada
MAP = [
 ("liquid-latex-rmx-llum",        "liquid-latex-rmx-llum",        "vlcsnap-2026-07-06-13h55m44s139.jpg"),
 ("el-nino-bola-mori",            "el-nino-bola-mori",            "mori-bcn01.jpg"),
 ("la-roda-ouineta",              "la-roda-ouineta",              "trim02-ezgif-com-video-to-gif-converter.mp4"),
 ("listen-xicu-lighting",         None,                            None),
 ("listen-xicu-promo",            "listen-xicu-promo",            "thumbnail.jpg"),
 ("listen-xicu-visualizers",      "listen-xicu-visualizers",      "listenvisualizer-molly.jpg"),
 ("tristan-jazz-band-air-apolo",  None,                            None),
 ("sempre-per-instint-gavina",    None,                            None),
 ("lechatelier-sala-apolo-2025",  "lechatelier-sala-apolo-2025",  "image00001-e.jpg"),
 ("amore-razzmatazz-2",           "amore-razzmatazz-2",           "coreo01.mp4"),
 ("jimena-amarillo-razzmatazz-2", None,                            None),
 ("salvatge-tour-2025-ouineta",   None,                            None),
 ("radio-coral-cabiria",          None,                            None),
 ("u-n-me-bby-xicu",              "u-n-me-bby-xicu",              "u-n-me-bby-xicu-trim06a.mp4"),
 ("estat-dalarma-merce",          None,                            None),
 ("arxiu-archive",                None,                            None),
]

def credits(raw):
    """Texto libre -> {rol: gente}. El rol se pinta en negrita y la gente
    detras, sin 'by' en medio, que es como lo quiere Oriol."""
    out = {}
    for line in [l.strip() for l in raw.split("\n") if l.strip()]:
        m = (re.match(r"^(.*?)\s*:\s*(.+)$", line)          # 'edit: oriol'
             or re.match(r"^(.*?)\s+by\s+(.+)$", line)      # 'edit by oriol'
             or re.match(r"^([^@]+?)\s+(@.+)$", line))      # 'photography @irene'
        role, people = (m.group(1), m.group(2)) if m else (line, "")
        role = role.strip().lower()
        if role in out:                                      # rol repetido: se juntan
            out[role] = (out[role] + " " + people.strip()).strip()
        else:
            out[role] = people.strip()
    return out

def media_for(folder, cover):
    if not folder: return []
    d = os.path.join(ROOT, "media", folder)
    if not os.path.isdir(d): return []
    files = sorted(f for f in os.listdir(d) if not f.startswith("."))
    if cover in files:
        files.remove(cover); files.insert(0, cover)          # portada primero
    return ["media/%s/%s" % (folder, f) for f in files]

prev = {}
if os.path.exists(OUT):
    prev = {p["slug"]: p for p in json.load(open(OUT))}

rows = list(csv.reader(open(CSV)))
data = [r for r in rows[3:] if r[0].strip()]
if len(data) != len(MAP):
    sys.exit("El CSV trae %d filas y el mapa tiene %d. Actualiza MAP." % (len(data), len(MAP)))

projects = []
for r, (slug, folder, cover) in zip(data, MAP):
    title, sub, client, date, desc, cred, tags, _thumb, link, _folder, fet = r
    d, m, y = date.split("/")
    old = prev.get(slug, {})
    keep = lambda field, val: {
        "en": val,
        "es":  old.get(field, {}).get("es", ""),
        "cat": old.get(field, {}).get("cat", ""),
    }
    projects.append({
        "slug": slug,
        "title": title.strip(),
        "subheader": keep("subheader", sub.strip()),
        "client": client.strip(),
        "date": "%s-%s-%s" % (y, m, d),
        "tags": [t.strip() for t in tags.split(",") if t.strip()],
        "description": keep("description", desc.strip()),
        "credits": credits(cred),
        "link": link.strip(),
        "media": media_for(folder, cover),
        "published": fet.strip().upper() == "TRUE",
    })

projects.sort(key=lambda p: p["date"], reverse=True)
json.dump(projects, open(OUT, "w"), ensure_ascii=False, indent=2)

falta = [p["slug"] for p in projects
         if not all(p[f][l] for f in ("subheader", "description") for l in ("es", "cat"))]
print("%d proyectos, %d publicados, %d archivos"
      % (len(projects), sum(p["published"] for p in projects),
         sum(len(p["media"]) for p in projects)))
print("sin traducir:", ", ".join(falta) if falta else "ninguno")
