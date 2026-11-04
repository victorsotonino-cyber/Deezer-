# Deezer · Bot de tienda para Discord

Bot en español con slash commands: **tickets, tienda, ventas, rangos de clientes, sorteos, moderación, AutoMod, bienvenida, plantilla de servidor y un panel (`/panel`) que edita todo y se guarda.**

## Instalar
1. Instala Node.js 18+.
2. En el [Discord Developer Portal](https://discord.com/developers/applications) crea la app → *Bot* → copia el **token**.
   Activa en *Privileged Gateway Intents*: **Server Members Intent** y **Message Content Intent**.
3. Copia `.env.example` a `.env` y rellena `DISCORD_TOKEN` y `CLIENT_ID` (ID de la aplicación).
4. Invita al bot con permisos de **Administrador** (scopes: `bot` y `applications.commands`).
5. `npm install` y luego `npm start`.

Los comandos se registran solos en cada servidor al iniciar.

## Primeros pasos en tu servidor
1. Sube el rol del bot **al tope** de la lista de roles (para poder dar rangos).
2. `/plantilla` → crea roles, canales, contadores y publica los paneles.
3. `/panel` → pon nombre, color, banner y moneda; añade **productos**, **métodos de pago**, **tipos de ticket** y **rangos**.
4. Para vender: el cliente elige producto en `#tienda` (se abre un ticket) → tú cobras → `/venta` (suma gasto, baja stock, sube el rango y publica en `#ventas`).

## Datos
Todo se guarda en `data/db.json`. Haz copia de esa carpeta para respaldar tu configuración.
