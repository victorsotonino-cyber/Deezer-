# DATASHOP — Discord Store Management Bot

Bot modular para tiendas y comunidades. Utiliza Node.js 22, discord.js v14 y SQLite.

## Módulos disponibles

### Servidor y plantilla
- /plantilla: tienda completa, market o minimalista.
- Crea secciones WLC, OWNER, SERVER, SOCIAL, REFERENCES y TICKETS.
- Crea los roles Owner, Administrador, Staff, Soporte y Cliente.
- Opcionalmente crea rangos Básico, Premium y VIP.
- Es idempotente: al volver a ejecutarla, reutiliza recursos encontrados y no elimina canales.

### Tienda y pedidos
- /producto agregar, listar, stock y eliminar.
- /pedido crear, estado y listar.
- Estados de pedido: pendiente, pagado, completado y cancelado.
- Inventario: se descuenta cuando el staff completa el pedido y se restaura si un pedido completado se revierte.
- /stats muestra productos, pedidos y volumen completado.

### Tickets y comunidad
- /ticket panel, cerrar, reclamar y agregar.
- Apertura mediante botón y canales privados.
- Un ticket abierto por miembro; los cierres conservan el historial.
- /vouch registra valoraciones, /sugerencia publica ideas y /encuesta crea votaciones por reacciones.
- /userinfo muestra información pública del miembro.

### Staff y moderación
- /rango crear, listar, asignar y quitar.
- /moderacion ban, kick, timeout y limpiar.
- /anuncio y /say.
- /configuracion bienvenida y /configuracion autorol.
- Prefijo básico: !ping y !help.

## Requisitos

- Node.js 22 o superior.
- Aplicación de Discord creada en Developer Portal.
- Permisos recomendados para el bot: Manage Channels, Manage Roles, Manage Messages, View Channels, Send Messages, Read Message History, Embed Links, Add Reactions, Ban Members, Kick Members y Moderate Members.
- En Bot > Privileged Gateway Intents activa Server Members Intent y Message Content Intent.
- Coloca el rol del bot por encima de los roles que tendrá que asignar o gestionar.

## Instalación local

1. Instala Node.js 22.
2. Ejecuta npm install.
3. Copia .env.example a .env.
4. Configura DISCORD_TOKEN y CLIENT_ID. GUILD_ID es opcional y permite registrar comandos en un servidor de pruebas.
5. Invita el bot con los scopes bot y applications.commands.
6. Ejecuta npm run check para revisar sintaxis.
7. Ejecuta npm run deploy para registrar los comandos manualmente.
8. Ejecuta npm start para iniciar el bot.

El bot también registra los comandos al iniciar. No publiques nunca el archivo .env ni compartas tu token.

## Primer inicio en tu servidor

1. Ejecuta /plantilla tipo:tienda nombre:DATASHOP rangos:true desde una cuenta administradora.
2. Ejecuta /ticket panel en el canal donde quieres publicar el botón.
3. Añade el catálogo mediante /producto agregar.
4. Usa /ayuda para consultar los comandos.

## Render

El archivo render.yaml define un servicio web con endpoint /health y almacenamiento persistente para SQLite. En Render conecta este repositorio y define DISCORD_TOKEN, CLIENT_ID y, opcionalmente, GUILD_ID y OWNER_IDS. El servicio usa un plan de pago y un disco persistente; revisa los precios de Render antes de crear recursos.

## Importante sobre las compras

El bot registra pedidos e inventario, pero no procesa pagos reales, no verifica transferencias y no entrega productos automáticamente. El personal debe comprobar el pago con el proveedor correspondiente antes de marcar un pedido como completado. No almacenes contraseñas, tokens de acceso ni datos de tarjetas en el bot.
