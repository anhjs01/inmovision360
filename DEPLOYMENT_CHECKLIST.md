# INMOVISIÓN 360 SUITE — Preparación para despliegue

Este documento registra las verificaciones previas a publicar la aplicación. No significa que el despliegue esté completado.

## Bloqueos antes de producción

- [ ] Eliminar los archivos de entorno reales del repositorio y comprobar el historial Git. Borrar un archivo en un commit nuevo no elimina su contenido de commits anteriores.
- [ ] Rotar cualquier secreto o credencial real que haya sido publicado (JWT, proveedores de pago, SMTP u OAuth, según corresponda).
- [ ] Configurar secretos únicamente en el panel del proveedor de hosting.
- [ ] Para la demo se conserva SQLite y se crea/actualiza el esquema al arrancar. En hosting gratuito sin disco persistente, los datos pueden perderse al reiniciar o desplegar; no usar para datos que deban conservarse.
- [x] El frontend admite URL configurable y usa `/v1` en producción si se sirve desde el mismo dominio que la API.
- [x] CORS contempla `FRONTEND_URL` y la URL pública que Render expone al servicio.
- [ ] Las fotos se sirven desde `uploads`, pero el almacenamiento local en hosting efímero puede perderse; usar solo para demo o configurar almacenamiento persistente.
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


## Despliegue sencillo para la entrega universitaria

- Blueprint añadido en `render.yaml`: un único servicio web sirve el frontend y la API desde el mismo dominio.
- El servicio ejecuta `prisma db push` al arrancar para preparar SQLite para la demo.
- Para publicación: conectar el repositorio en Render, seleccionar la rama `deploy/preparacion-hosting` y crear el servicio desde el Blueprint.
- Activar Auto-Deploy en Render. Después de que el despliegue inicial funcione, cada push a la rama configurada puede iniciar un nuevo despliegue automáticamente.
- Limitación: esto no garantiza persistencia de datos ni de fotos en un plan sin disco persistente. El despliegue real todavía requiere crear el servicio desde la cuenta del usuario y probar la URL pública.
