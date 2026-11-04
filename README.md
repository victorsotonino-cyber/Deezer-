# DATASHOP — Discord Shop Bot

Base profesional para un bot de tienda con Node.js y discord.js v14.

## Incluye
- `/ping`: estado y latencia del bot.
- `/help`: lista de comandos disponibles.
- `/plantilla`: crea una estructura de tienda con categorías, canales y rangos; es idempotente y no duplica elementos existentes.
- Endpoint HTTP `/health` para supervisión del hosting.
- Variables sensibles en `.env`, nunca dentro del código.

## Requisitos
- Node.js 20.11 o superior.
- Aplicación y bot creados en Discord Developer Portal.
- Intents y permisos adecuados; invita el bot con `applications.commands` y `bot`.

## Instalación
1. Copia `.env.example` a `.env` y rellena `DISCORD_TOKEN` y `CLIENT_ID`.
2. Ejecuta `npm install`.
3. Ejecuta `npm start`.
4. En Discord, usa `/plantilla` con permisos de administrador para preparar el servidor.

Para registrar comandos inmediatamente en un servidor de pruebas, define `GUILD_ID`. Sin ella, los comandos se registran globalmente y pueden tardar en aparecer.

## Despliegue 24/7
Configura el hosting con build `npm install`, start `npm start` y las variables de entorno anteriores. No subas `.env` al repositorio. El endpoint de salud es `/health`.

## Rangos creados
Owner, Dirección, Administrador, Manager, Desarrollador, Diseñador, Moderador, Soporte, Trial Staff, Cliente VIP, Cliente y Miembro. Los rangos son una base inicial: revisa la jerarquía y permisos de Discord antes de abrir el servidor al público.
