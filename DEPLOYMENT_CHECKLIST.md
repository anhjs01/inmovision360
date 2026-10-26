# INMOVISIÓN 360 SUITE — Preparación para despliegue

Este documento registra las verificaciones previas a publicar la aplicación. No significa que el despliegue esté completado.

## Bloqueos antes de producción

- [ ] Eliminar los archivos de entorno reales del repositorio y comprobar el historial Git. Borrar un archivo en un commit nuevo no elimina su contenido de commits anteriores.
- [ ] Rotar cualquier secreto o credencial real que haya sido publicado (JWT, proveedores de pago, SMTP u OAuth, según corresponda).
- [ ] Configurar secretos únicamente en el panel del proveedor de hosting.
- [ ] Elegir la base de datos de producción y preparar una migración validada desde el esquema SQLite actual. No basta con cambiar `DATABASE_URL`.
- [ ] Configurar la URL pública de la API en el frontend; actualmente `frontend/js/api.js` utiliza `http://localhost:3000/v1`.
- [ ] Configurar CORS con el origen público exacto del frontend.
- [ ] Definir almacenamiento persistente para fotos y demás archivos subidos; el directorio local `uploads` no debe asumirse persistente en un hosting efímero.
- [ ] Verificar compilación, migraciones, autenticación, recuperación de sesión, propiedades, cargas de imágenes y pagos en un entorno de prueba.
- [ ] Confirmar copias de seguridad y un procedimiento de recuperación antes de migrar datos reales.

## Variables de entorno que se deben configurar en el proveedor

Como mínimo, revisar y establecer según el código y los módulos realmente usados:

- `NODE_ENV=production`
- `PORT` (lo proporciona habitualmente el hosting)
- `DATABASE_URL` (solo después de preparar y validar el motor elegido)
- `JWT_SECRET` (secreto nuevo, largo y aleatorio)
- `FRONTEND_URL` (origen público exacto)
- Credenciales OAuth, correo y pagos únicamente si esas funciones se van a habilitar.

No copiar valores de un archivo `.env` publicado. Los nombres anteriores son una lista de comprobación, no una confirmación de que todas las funciones estén listas para producción.

## Situación técnica verificada

- Backend: NestJS.
- ORM: Prisma.
- Esquema y migraciones actuales: SQLite.
- El backend sirve archivos locales desde `uploads`.
- El cliente frontend tiene una URL de API local codificada.

## Criterio para aprobar el despliegue

No publicar para usuarios reales hasta que la base de datos persistente, las cargas de archivos, las variables de entorno y las pruebas críticas estén verificadas. La retirada de secretos del último commit no borra automáticamente su historial.
