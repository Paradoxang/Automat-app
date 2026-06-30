# Automatizador — versión móvil (PWA / Android)

Versión móvil de Automatizador con **solo Instagram y WhatsApp** (el correo se queda en la app de escritorio). En el teléfono funciona incluso mejor: los botones abren **directamente las apps nativas** de Instagram y WhatsApp.

- 📸 **Instagram**: leads, plantillas, copiar mensaje y abrir el chat (`ig.me`).
- 💬 **WhatsApp**: números, plantillas, y "Abrir WhatsApp" abre el chat con el **mensaje ya escrito** (`wa.me`). Indicativo **+57** por defecto (configurable).
- 🔎 Buscador en vivo, estados pendiente/enviado, y **respaldo/importación** de datos.
- 📦 Es una **PWA**: se puede instalar como app y funciona sin conexión. Tus datos viven **solo en el teléfono** (`localStorage`).

> Compatibilidad de datos: el botón **Importar** acepta el `data.json` de la app de escritorio, así llevas tus leads y plantillas al móvil.

---

## Probar en local (desde tu PC)

```bash
npm run mobile:serve     # sirve la carpeta en http://localhost:5173
```

- Ábrelo en el navegador del PC, o
- En el móvil (misma red Wi‑Fi): `http://<IP-de-tu-PC>:5173`. *(En red local por http el modo "instalar/offline" no se activa — para eso usa el hosting con HTTPS de abajo.)*

---

## Publicarla con HTTPS (GitHub Pages)

Una PWA necesita HTTPS para instalarse. GitHub Pages lo da gratis:

1. En el repo → **Settings → Pages**.
2. **Source: Deploy from a branch** → rama `main` → carpeta `/ (root)` → **Save**.
3. Tras unos minutos, tu PWA estará en:
   ```
   https://paradoxang.github.io/Automat-app/mobile/
   ```
   (Ábrela en Chrome del móvil → menú → **Instalar app / Añadir a pantalla de inicio**.)

---

## Generar el APK (para descargar desde GitHub)

Con la PWA ya publicada en HTTPS, usa **PWABuilder** (gratis, de Microsoft) — no necesitas instalar el SDK de Android:

1. Entra a <https://www.pwabuilder.com/>.
2. Pega la URL: `https://paradoxang.github.io/Automat-app/mobile/`.
3. Pulsa **Package For Stores → Android → Generate**.
4. Descarga el `.apk` (firmado, listo para instalar) y el `.aab` (para Play Store si algún día quieres).
5. Sube el `.apk` a un **Release** de GitHub para descargarlo e instalarlo en el teléfono.

> Al instalar un APK fuera de Play Store, Android pedirá permitir **"instalar apps de fuentes desconocidas"** la primera vez.

---

## Estructura

```
mobile/
├── index.html              # shell de la PWA
├── styles.css              # tema oscuro, mobile-first, barra inferior
├── app.js                  # lógica IG + WhatsApp (localStorage)
├── manifest.webmanifest    # metadatos de instalación
├── sw.js                   # service worker (offline / instalable)
├── icons/                  # icon-192.png, icon-512.png
└── tools/
    ├── make-mobile-icons.js  # regenera los íconos (npm run mobile:icons)
    └── serve.js              # servidor local de prueba (npm run mobile:serve)
```
