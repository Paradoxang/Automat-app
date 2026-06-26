<div align="center">

<img src="build/icon.png" alt="Automatizador" width="120" height="120" />

# Automatizador

**App de escritorio para automatizar la captación de clientes:**
campañas de correo desde Gmail/Workspace y mensajes asistidos de Instagram y WhatsApp — todo desde un solo panel, con tus datos cifrados en tu propio equipo.

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Platform](https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows&logoColor=white)
![Nodemailer](https://img.shields.io/badge/SMTP-Nodemailer-2c3e50)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

## ✨ ¿Qué hace?

Una herramienta de *outreach* (prospección comercial) empaquetada como aplicación de escritorio nativa. Centraliza dos canales de captación en un panel privado, protegido con contraseña:

| Módulo | Qué resuelve |
| --- | --- |
| 📧 **Correo** | Envía campañas personalizadas a posibles clientes desde tu Gmail / Google Workspace, con plantillas, listas de contactos, control de ritmo anti-spam e historial de envíos. |
| 📸 **Instagram** | Gestiona *leads* y plantillas; la app arma el mensaje personalizado, lo copia y abre el chat. Tú das *enviar*. **Cero riesgo de bloqueo de la cuenta.** |
| 💬 **WhatsApp** | Gestiona números y plantillas; abre el chat de WhatsApp con el **mensaje ya escrito** vía `wa.me`. Solo das *enviar*. **Cero riesgo de bloqueo de la línea.** |
| 🔐 **Seguridad** | Acceso con contraseña local, credenciales **cifradas por el sistema operativo** y datos guardados **solo en tu equipo**. Nada viaja a servidores de terceros. |

---

## 🚀 Características

### 📧 Módulo de Correo
- **Plantillas dinámicas** con variables `{{nombre}}` y `{{email}}` que se personalizan por destinatario.
- **Gestión de contactos** con importación masiva desde **CSV** (`nombre,email`).
- **Control de ritmo (anti-spam):** retardo configurable entre correos y tope por tanda, para cuidar la reputación de tu cuenta.
- **Lista de bajas (opt-out):** marca contactos como "dados de baja" para no volver a escribirles — alineado con buenas prácticas y la **Ley 1581 (Habeas Data)**.
- **Historial de envíos** con estado (enviado / error) y detalle del fallo.
- **Prueba de conexión** SMTP en un clic antes de lanzar la campaña.

### 📸 Módulo de Instagram (semi-manual por diseño)
- **Leads** con usuario, nombre y notas; importables por **CSV** (`usuario,nombre`).
- **Plantillas** con variables `{{nombre}}` y `{{usuario}}`.
- **Flujo asistido:** `Copiar mensaje` → `Abrir DM` (abre `ig.me`) → pegas y envías → `Marcar enviado`.
- **Seguimiento de estado** (pendiente / enviado) por cada lead.

> 💡 **¿Por qué semi-manual?** Automatizar DMs en frío viola los Términos de Instagram y puede causar el **bloqueo permanente** de la cuenta. Esta app te da toda la velocidad de la automatización (mensajes listos y personalizados) sin ese riesgo: el último clic siempre es tuyo.

### 💬 Módulo de WhatsApp (semi-manual por diseño)
- **Números** con nombre y notas; importables por **CSV** (`numero,nombre`).
- **Indicativo de país configurable** (por defecto **+57**, Colombia) que se antepone a todos los números automáticamente.
- **Plantillas** con variables `{{nombre}}` y `{{numero}}`.
- **Flujo ultra-rápido:** `Abrir WhatsApp` abre el chat (`wa.me`) con **el mensaje ya escrito** → das *Enviar* → `Marcar enviado`.
- **Normalización inteligente** de números: ignora espacios, guiones y ceros iniciales, y no duplica el indicativo si ya viene incluido.

### 🔐 Seguridad y privacidad
- **Acceso con contraseña** local, almacenada con hash **scrypt** (nunca en texto plano).
- **Contraseña de aplicación de Gmail cifrada** con `safeStorage` de Electron, que usa **DPAPI de Windows** (cifrado ligado a tu cuenta de usuario del SO).
- **Aislamiento de procesos:** `contextIsolation` activado, `nodeIntegration` desactivado y comunicación por un **puente IPC** controlado (`contextBridge`) — el estándar de seguridad de Electron.
- **Política de Seguridad de Contenido (CSP)** restrictiva en la interfaz.
- **100 % local:** los datos viven en `%APPDATA%/automatizador/data.json`. No hay backend ni telemetría.

---

## 🛠️ Stack técnico

| Capa | Tecnología |
| --- | --- |
| Runtime de escritorio | **Electron 33** |
| Proceso principal | **Node.js** (SMTP, almacenamiento, cifrado, IPC) |
| Interfaz | **HTML + CSS + JavaScript vanilla** (sin framework, sin paso de build) |
| Envío de correo | **Nodemailer** (SMTP de Gmail/Workspace sobre SSL) |
| Empaquetado | **electron-builder** (instalador NSIS + versión portable) |
| Ícono | Generado por código en **Node puro** (`tools/makeicon.js`) |

---

## 📂 Arquitectura

```
Automat-app/
├── src/
│   ├── main/                 # Proceso principal (Node)
│   │   ├── main.js           # Ventana, manejadores IPC, orquestación
│   │   ├── preload.js        # Puente seguro (contextBridge → window.api)
│   │   ├── store.js          # Persistencia JSON + auth (scrypt)
│   │   └── mailer.js         # Envío SMTP (Nodemailer)
│   └── renderer/             # Interfaz (sin framework)
│       ├── index.html        # Estructura + CSP
│       ├── styles.css        # Tema oscuro, diseño responsive
│       └── app.js            # Router de vistas, lógica de UI, modales
├── tools/
│   └── makeicon.js           # Generador del ícono (pixel art por código)
├── build/                    # Recursos de empaquetado (icon.ico / icon.png)
└── package.json              # Config de la app y de electron-builder
```

**Patrón de seguridad:** el *renderer* nunca toca Node directamente. Todo (enviar correo, leer/guardar datos, abrir un DM, copiar al portapapeles) pasa por canales IPC explícitos expuestos en `preload.js`. Esto mantiene la interfaz aislada y el acceso al sistema bajo control.

---

## 📦 Instalación

### Opción A — Usuario final (recomendada)
Descarga el instalador desde la sección [**Releases**](https://github.com/Paradoxang/Automat-app/releases) y ejecútalo. Crea accesos directos en Escritorio y menú Inicio.

> La app no está firmada digitalmente, así que la primera vez Windows SmartScreen mostrará un aviso → **"Más información" → "Ejecutar de todas formas"**. Solo ocurre una vez.

### Opción B — Desde el código (desarrollo)

```bash
# Requisitos: Node.js 18+ (probado con v24)
npm install
npm start
```

La primera vez te pedirá **crear una contraseña de acceso** para proteger la app.

---

## ⚙️ Configuración del correo (Gmail / Workspace)

1. Activa la **verificación en 2 pasos** en tu cuenta de Google.
2. Genera una **Contraseña de aplicación**: <https://myaccount.google.com/apppasswords>
3. En la app → **Ajustes**, completa:
   - **Usuario SMTP**: tu correo (el mismo desde el que envías).
   - **Contraseña de aplicación**: los 16 caracteres generados (los espacios se ignoran automáticamente).
4. Pulsa **Probar conexión**. Si ves *"Conexión correcta ✓"*, ¡listo!

> ⚠️ **Regla de oro:** el *Usuario SMTP*, la cuenta donde creaste la contraseña de aplicación y el *Remitente* deben ser **la misma cuenta**. La contraseña de aplicación **no** es tu contraseña normal de Gmail.

---

## 📨 Cómo se usa

<table>
<tr><th>Correo</th><th>Instagram</th><th>WhatsApp</th></tr>
<tr valign="top"><td>

1. **Plantillas** → crea tu mensaje con `{{nombre}}`.
2. **Contactos** → agrégalos o importa un CSV.
3. **Enviar** → elige plantilla, selecciona destinatarios y lanza. La app respeta el ritmo configurado y registra todo.

</td><td>

1. **Plantillas** → mensaje con `{{nombre}}` / `{{usuario}}`.
2. **Leads** → agrégalos o importa un CSV.
3. **Enviar DMs** → por cada lead: *Copiar* → *Abrir DM* → enviar → *Marcar enviado*.

</td><td>

1. **Plantillas** → mensaje con `{{nombre}}` / `{{numero}}`.
2. **Números** → agrégalos o importa un CSV.
3. **Enviar** → por cada número: *Abrir WhatsApp* (chat con mensaje listo) → enviar → *Marcar enviado*.

</td></tr>
</table>

---

## 🏗️ Empaquetar / generar el instalador

```bash
npm run makeicon   # (opcional) regenera el ícono a partir de tools/makeicon.js
npm run dist       # genera el instalador NSIS + versión portable en dist/
```

Resultado en `dist/`:
- `Automatizador Setup 1.0.0.exe` — instalador de Windows.
- `win-unpacked/Automatizador.exe` — versión portable (no requiere instalación).

---

## ⚖️ Uso responsable

Esta herramienta está pensada para **prospección legítima** hacia contactos con interés real:

- Incluye siempre una forma de **darse de baja** y respeta a quien lo pida (botón *Dar de baja*).
- Cumple la **Ley 1581 de 2012 (Habeas Data, Colombia)** y la normativa de protección de datos aplicable.
- Respeta los **Términos de Servicio** de Gmail, Instagram y WhatsApp. Los módulos de Instagram y WhatsApp son **semi-manuales a propósito** para no violarlos.

---

## 🗺️ Roadmap

- [ ] Adjuntos en los correos.
- [ ] Programación de envíos por fecha/hora.
- [ ] Variable global `{{whatsapp}}` y datos del remitente en Ajustes.
- [ ] Firma digital del ejecutable para evitar el aviso de SmartScreen.
- [ ] Exportar el historial a CSV.

---

## 👤 Autor

**Santiago Miranda** — Ingeniero Informático & Web Designer
🔗 [github.com/Paradoxang](https://github.com/Paradoxang)

<div align="center">

*Hecho con Electron · Licencia MIT*

</div>
