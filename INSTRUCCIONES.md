# INMOVISIÓN 360 SUITE — Guía de instalación y ejecución

> **Motor de base de datos:** SQLite (archivo local, sin servidor)  
> **Backend:** NestJS + Prisma  
> **Frontend:** HTML/CSS/JS puro (ES Modules)  
> **Sin Redis · Sin Supabase · Sin PostgreSQL**

---

## Requisitos previos

Antes de comenzar verifica que tienes instalado:

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 18.x o superior | `node --version` |
| npm | 9.x o superior | `npm --version` |
| VS Code (opcional) | Cualquiera | Para Live Server |

Si no tienes Node.js: descárgalo en https://nodejs.org (recomendado LTS).

---

## Estructura del proyecto

```
inmovision-proyecto/
├── backend/          ← API NestJS + SQLite
│   ├── src/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── .env
│   └── package.json
│
└── frontend/         ← Interfaz de usuario
    ├── index.html
    ├── css/
    ├── js/
    │   ├── api.js
    │   ├── utils.js
    │   └── modules/
    └── assets/
```

---

## Paso 1 — Instalar dependencias del backend

Abre una terminal en la carpeta `backend/`:

```bash
cd backend
npm install
```

Esto instala NestJS, Prisma, bcrypt, passport-jwt y todas las dependencias.  
**No instala Redis ni Supabase** porque el proyecto ya no los usa.

---

## Paso 2 — Configurar el archivo .env

El archivo `.env` ya viene preconfigurado para desarrollo local.  
Solo necesitas revisarlo si quieres cambiar el puerto o la ruta de la base de datos.

```env
# backend/.env

NODE_ENV=development
PORT=3000

# SQLite — el archivo se crea automáticamente en prisma/inmovision.db
DATABASE_URL="file:./prisma/inmovision.db"

# JWT
JWT_SECRET=inmovision_super_secreto_2025
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30

# Frontend (CORS)
FRONTEND_URL=http://127.0.0.1:5500
```

> **No necesitas** cambiar nada para ejecutar el proyecto localmente.

---

## Paso 3 — Crear la base de datos y tablas

Desde la carpeta `backend/`, ejecuta:

```bash
# Generar el cliente de Prisma
npx prisma generate

# Crear las tablas en SQLite (crea prisma/inmovision.db automáticamente)
npx prisma migrate dev --name init
```

Verás una salida similar a:

```
✔ Generated Prisma Client
✔ Applied migration `init`
```

> El archivo `prisma/inmovision.db` se crea automáticamente. No necesitas instalar ningún servidor de base de datos.

---

## Paso 4 — Cargar datos de prueba (seed)

```bash
npm run db:seed
```

Salida esperada:

```
✅ Seed completado.
   Demo arrendador: arrendador@demo.co / demo1234
   Demo inquilino:  inquilino@demo.co  / demo1234
```

Esto crea:
- **2 usuarios demo** (arrendador e inquilino)
- **5 propiedades** con fotos reales de Unsplash
- **2 visitas**, **3 pagos**, **2 leads** y **1 mensaje** de ejemplo
- **4 planes** de suscripción (Free, Starter, Professional, Enterprise)

---

## Paso 5 — Iniciar el backend

```bash
npm run start:dev
```

Verás:

```
🚀 INMOVISIÓN 360 API corriendo en: http://localhost:3000/v1
   Base de datos: SQLite (prisma/inmovision.db)
   Docs rápidas:  GET /v1/suscripciones/planes
```

> Deja esta terminal abierta. El backend queda escuchando en el puerto 3000.

---

## Paso 6 — Iniciar el frontend

Tienes dos opciones:

### Opción A — VS Code Live Server (recomendado)

1. Abre VS Code
2. Instala la extensión **Live Server** (ritwickdey.LiveServer) si no la tienes
3. Abre la carpeta `frontend/`
4. Haz clic derecho en `index.html` → **Open with Live Server**
5. Se abre automáticamente en `http://127.0.0.1:5500`

### Opción B — npx serve (sin VS Code)

```bash
cd frontend
npx serve . -p 5500
```

Luego abre `http://localhost:5500` en tu navegador.

### Opción C — Python (si lo tienes instalado)

```bash
cd frontend
python -m http.server 5500
```

> **Importante:** el frontend **no se puede abrir directamente** con doble clic en el archivo HTML porque usa ES Modules, que el navegador requiere que se sirvan por HTTP.

---

## Paso 7 — Probar la aplicación

### Acceso de demostración rápida

En la pantalla de login, haz clic en los botones demo:

| Botón | Email | Contraseña | Acceso |
|---|---|---|---|
| **Demo Arrendador** | arrendador@demo.co | demo1234 | Panel completo + gestión de propiedades |
| **Demo Inquilino** | inquilino@demo.co  | demo1234 | Catálogo + favoritos + visitas + pagos |

### Flujo completo de prueba

**Como arrendador:**
1. Inicia sesión con Demo Arrendador
2. Desde **Mi Panel** → clic en **+ Nueva propiedad**
3. Completa el wizard en 4 pasos y publica
4. Ve a **Visitas** → agenda una visita manual
5. Ve a **Mensajes** → responde al inquilino
6. Ve a **Estadísticas** → revisa KPIs y gráficas
7. Ve a **Suscripción** → simula cambio de plan

**Como inquilino:**
1. Inicia sesión con Demo Inquilino
2. Desde **Explorar** → filtra por ciudad o tipo
3. Haz clic en **Ver detalles** de una propiedad
4. Guarda en favoritos con el corazón ❤️
5. Ve a **Favoritos** para ver tus guardados
6. Ve a **Mis Pagos** para revisar el historial

---

## Comandos útiles

```bash
# Desde la carpeta backend/

# Ver la base de datos con interfaz visual
npx prisma studio

# Reiniciar la DB y volver a cargar los datos demo
npm run db:reset

# Compilar para producción
npm run build

# Correr en producción (después de npm run build)
npm start
```

---

## Endpoints principales de la API

Una vez el backend esté corriendo puedes probarlos directamente:

```
# Verificar que la API funciona
GET  http://localhost:3000/v1/suscripciones/planes

# Ver catálogo público (sin token)
GET  http://localhost:3000/v1/propiedades

# Filtrar propiedades
GET  http://localhost:3000/v1/propiedades?ciudad=bogotá&tipo=apartamento&sort=precio_asc

# Login
POST http://localhost:3000/v1/auth/login
Body: { "email": "arrendador@demo.co", "password": "demo1234" }
```

Para probar endpoints protegidos, usa **Postman** o **Insomnia**:

1. Haz login → copia el `access_token` de la respuesta
2. En los siguientes requests agrega el header:  
   `Authorization: Bearer <tu_access_token>`

---

## Solución de problemas frecuentes

### Error: "Cannot find module" al iniciar el backend

```bash
# Solución: regenerar Prisma Client
cd backend
npx prisma generate
npm run start:dev
```

### Error: "Database file not found"

```bash
# Solución: ejecutar migrations
cd backend
npx prisma migrate dev --name init
```

### Error CORS en el frontend

Verifica que en `backend/.env` el valor de `FRONTEND_URL` coincida exactamente con la URL donde sirves el frontend:

```env
# Si usas Live Server en el puerto por defecto:
FRONTEND_URL=http://127.0.0.1:5500

# Si usas localhost:
FRONTEND_URL=http://localhost:5500
```

Reinicia el backend después de cambiar el `.env`.

### El botón "Demo Arrendador" no hace nada

El backend no está corriendo. Verifica que en la terminal del backend ves el mensaje:
```
🚀 INMOVISIÓN 360 API corriendo en: http://localhost:3000/v1
```

### La base de datos se corrompió o quiero empezar de cero

```bash
cd backend
npm run db:reset
```

Esto borra y recrea la BD con los datos demo.

---

## Variables de entorno para producción

Si deseas desplegar el proyecto en producción, actualiza el `.env` con:

```env
NODE_ENV=production
PORT=3000

# Mantener SQLite o cambiar a PostgreSQL/MySQL (cambiar schema.prisma provider)
DATABASE_URL="file:./prisma/inmovision.db"

# JWT — usar un secreto largo y aleatorio
JWT_SECRET=cambia_esto_por_un_secreto_seguro_de_al_menos_64_caracteres

# Email — configurar SMTP real
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password

# URL real del frontend
FRONTEND_URL=https://tudominio.com

# Wompi — credenciales de producción
WOMPI_PUBLIC_KEY=pub_prod_...
WOMPI_PRIVATE_KEY=prv_prod_...
WOMPI_INTEGRITY_KEY=prod_integrity_...
```

---

## Tecnologías utilizadas

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 18+ |
| Framework backend | NestJS | 10.x |
| ORM | Prisma | 5.x |
| Base de datos | SQLite | Incluido en Prisma |
| Autenticación | JWT + Passport | — |
| Hash de contraseñas | bcrypt | 5.x |
| Frontend | HTML + CSS + JS | ES Modules nativos |
| Fuentes | Plus Jakarta Sans | Google Fonts |

---

*INMOVISIÓN 360 SUITE Habitat — Colombia & Latinoamérica · 2025*
