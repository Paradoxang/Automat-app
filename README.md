# Automatizador

App de escritorio (Electron) para:

- **Correo**: enviar campañas a posibles clientes desde tu Gmail / Google Workspace, con plantillas, lista de contactos, control de ritmo y registro de envíos.
- **Instagram (semi-manual)**: gestionar leads y plantillas; la app arma el mensaje, lo copia y abre el chat (`ig.me`). Tú das enviar. Sin riesgo de bloqueo de la cuenta.

Todo se guarda **localmente** en tu equipo. La contraseña de aplicación de Gmail se cifra con el sistema operativo (DPAPI en Windows).

## Requisitos

- Node.js 18+ (probado con v24).

## Instalación y uso (desarrollo)

```bash
npm install
npm start
```

La primera vez te pedirá **crear una contraseña de acceso** para la app. Después, esa contraseña protege la entrada.

## Configurar el correo

1. Ve a **Ajustes**.
2. Activa la **verificación en 2 pasos** en tu cuenta de Google.
3. Crea una **Contraseña de aplicación**: <https://myaccount.google.com/apppasswords>
4. Pega tu correo en "Usuario SMTP" y la contraseña de aplicación (16 caracteres).
5. Pulsa **Probar conexión**. Si sale "Conexión correcta ✓", ya puedes enviar.

> La contraseña de aplicación **no** es tu contraseña normal de Gmail.

## Enviar correos

1. **Correo → Plantillas**: crea una plantilla. Usa variables `{{nombre}}` y `{{email}}`.
2. **Correo → Contactos**: agrega contactos o importa un CSV (`nombre,email`).
3. **Correo → Enviar**: elige plantilla, selecciona destinatarios y envía. Se respeta el ritmo de Ajustes.

## Instagram (semi-manual)

1. **Instagram → Plantillas**: crea el mensaje con `{{nombre}}` y `{{usuario}}`.
2. **Instagram → Leads**: agrega usuarios o importa CSV (`usuario,nombre`).
3. **Instagram → Enviar DMs**: por cada lead → **Copiar mensaje** → **Abrir DM** → pega y envía en Instagram → **Marcar enviado**.

## Empaquetar como instalador de Windows

```bash
npm run dist
```

Genera un instalador en `dist/`.

## Buenas prácticas / legal

- Escribe solo a contactos con interés real e incluye forma de darse de baja (botón "Dar de baja").
- Respeta la Ley 1581 de Colombia (Habeas Data) y los Términos de Instagram.
- El envío de IG es semi-manual a propósito: automatizar DMs en frío viola los Términos de Instagram y arriesga el bloqueo de la cuenta.

## Dónde se guardan los datos

`%APPDATA%/automatizador/data.json` (Windows). Borrar ese archivo reinicia la app (incluida la contraseña de acceso).
