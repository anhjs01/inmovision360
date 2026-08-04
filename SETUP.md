# INMOVISIÓN 360 SUITE — Guía de instalación y ejecución

> Stack: NestJS · SQLite · Prisma · JWT · Vanilla JS (ES Modules)  
> Sin Redis · Sin PostgreSQL · Sin Supabase · Funciona 100% local

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Configurar y arrancar el backend](#3-configurar-y-arrancar-el-backend)
4. [Configurar y arrancar el frontend](#4-configurar-y-arrancar-el-frontend)
5. [Usuarios demo](#5-usuarios-demo)
6. [Endpoints disponibles](#6-endpoints-disponibles)
7. [Flujo de uso completo](#7-flujo-de-uso-completo)
8. [Variables de entorno](#8-variables-de-entorno)
9. [Comandos útiles de base de datos](#9-comandos-útiles-de-base-de-datos)
10. [Solución de problemas frecuentes](#10-solución-de-problemas-frecuentes)
11. [Llevar a producción](#11-llevar-a-producción)

---

## 1. Requisitos previos

Antes de comenzar verifica que tienes instalado:

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| **Node.js** | 18.x o superior | `node --version` |
| **npm** | 9.x o superior | `npm --version` |
| **VS Code** | Cualquiera | — |
| **Live Server** (extensión VS Code) | Cualquiera | Buscar en extensiones |

> **SQLite no requiere instalación adicional.** Prisma lo maneja como un archivo local `.db`.

---

## 2. Estructura del proyecto

```
inmovision/
│
├── backend/                  ← API REST con NestJS
│   ├── prisma/
│   │   ├── schema.prisma     ← modelo de base de datos SQLite
│   │   ├── seed.ts           ← datos demo iniciales
│   │   └── inmovision.db     ← base de datos SQLite (se crea automáticamente)
│   ├── src/
│   │   ├── auth/             ← login, registro, JWT, refresh token
│   │   ├── usuarios/         ← perfil, contraseña
│   │   ├── propiedades/      ← CRUD propiedades
│   │   ├── visitas/          ← agendar y confirmar visitas
│   │   ├── mensajes/         ← chat entre usuarios
│   │   ├── leads/            ← CRM
│   │   ├── pagos/            ← gestión de pagos
│   │   ├── favoritos/        ← guardar propiedades
│   │   ├── estadisticas/     ← KPIs y gráficas
│   │   ├── suscripciones/    ← planes
│   │   ├── webhooks/         ← Wompi
│   │   ├── media/            ← gestión de fotos
│   │   ├── email/            ← stub de emails
│   │   ├── prisma/           ← PrismaService global
│   │   ├── common/           ← filtros, interceptors, decorators
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
└── frontend/                 ← UI Vanilla JS ES Modules
    ├── index.html
    ├── css/
    │   ├── base.css
    │   ├── landing.css
    │   └── app.css
    ├── js/
    │   ├── utils.js          ← apiFetch, helpers, formatters
    │   ├── main.js           ← entrada, landing, puentes globales
    │   └── modules/
    │       ├── store.js      ← CRUD → llamadas a la API
    │       ├── auth.js       ← login, registro, sesión
    │       ├── ui.js         ← vistas del dashboard
    │       └── modals.js     ← modales CRUD y detalle
    └── assets/images/
        └── logo.png
```

---

## 3. Configurar y arrancar el backend

### Paso 1 — Abrir terminal en la carpeta backend

```bash
cd inmovision/backend
```

### Paso 2 — Instalar dependencias

```bash
npm install
```

Esto instala NestJS, Prisma, bcrypt, JWT, y todo lo necesario.  
**No requiere Redis ni PostgreSQL.**

### Paso 3 — Revisar el archivo `.env`

El archivo `.env` ya viene preconfigurado. Verifica que luce así:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./prisma/inmovision.db"
JWT_SECRET=inmovision_super_secreto_2025
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30
FRONTEND_URL=http://127.0.0.1:5500
```

> ⚠️ Si usas Live Server en un puerto diferente al 5500, actualiza `FRONTEND_URL`.

### Paso 4 — Generar el cliente Prisma

```bash
npx prisma generate
```

Esto genera los tipos TypeScript a partir del `schema.prisma`.

### Paso 5 — Crear la base de datos y las tablas

```bash
npx prisma migrate dev --name init
```

Este comando:
- Crea el archivo `prisma/inmovision.db` (SQLite)
- Aplica todas las migraciones y crea las tablas
- **No requiere ningún servidor de base de datos**

### Paso 6 — Cargar los datos demo

```bash
npm run db:seed
```

Crea en la base de datos:
- 2 usuarios demo (arrendador e inquilino)
- 5 propiedades con fotos, tours y comodidades
- Visitas, pagos y leads de ejemplo

Al terminar verás:
```
✅ Seed completado.
   Demo arrendador: arrendador@demo.co / demo1234
   Demo inquilino:  inquilino@demo.co  / demo1234
```

### Paso 7 — Compilar el proyecto

```bash
npm run build
```

### Paso 8 — Iniciar el servidor

**Modo desarrollo** (con hot-reload):
```bash
npm run start:dev
```

**Modo producción** (más rápido):
```bash
npm start
```

Deberías ver:
```
🚀 INMOVISIÓN 360 SUITE — Backend corriendo en http://localhost:3000/v1
   SQLite: file:./prisma/inmovision.db
   CORS:   http://127.0.0.1:5500
```

> El backend queda escuchando en **http://localhost:3000/v1**

---

## 4. Configurar y arrancar el frontend

El frontend es HTML + CSS + Vanilla JS puro. No requiere build ni bundler.

### Opción A — Live Server (recomendado)

1. Abre VS Code
2. Abre la carpeta `inmovision/frontend`
3. Haz clic derecho en `index.html` → **"Open with Live Server"**
4. Se abrirá automáticamente en `http://127.0.0.1:5500`

### Opción B — npx serve (desde terminal)

```bash
cd inmovision/frontend
npx serve . -p 5500
```

Luego abre `http://localhost:5500` en el navegador.

### Opción C — Python (si ya lo tienes instalado)

```bash
cd inmovision/frontend
python3 -m http.server 5500
```

> ⚠️ **Importante:** No abras `index.html` directamente con doble clic.  
> El proyecto usa ES Modules (`type="module"`), que requieren un servidor HTTP.  
> Si abres el archivo directamente verás errores de CORS en la consola.

---

## 5. Usuarios demo

Una vez que el backend esté corriendo y el frontend abierto, puedes iniciar sesión con:

### Arrendador
| Campo | Valor |
|---|---|
| Email | `arrendador@demo.co` |
| Contraseña | `demo1234` |
| Acceso | Panel, propiedades, visitas, CRM, estadísticas, pagos, suscripción |

### Inquilino
| Campo | Valor |
|---|---|
| Email | `inquilino@demo.co` |
| Contraseña | `demo1234` |
| Acceso | Catálogo, favoritos, mis visitas, mis pagos, mensajes |

También puedes usar los botones **"Demo Arrendador"** y **"Demo Inquilino"** en la pantalla de login, que inician sesión automáticamente.

---

## 6. Endpoints disponibles

Con el backend corriendo, puedes probar los endpoints directamente.  
Todos tienen el prefijo `/v1`.

### Auth (sin token)
```
POST http://localhost:3000/v1/auth/register
POST http://localhost:3000/v1/auth/login
POST http://localhost:3000/v1/auth/refresh
POST http://localhost:3000/v1/auth/forgot-password
```

### Ejemplo de login con curl
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arrendador@demo.co","password":"demo1234"}'
```

Respuesta:
```json
{
  "ok": true,
  "data": {
    "user": { "id": "...", "nombre": "Felipe", "rol": "arrendador" },
    "access_token": "eyJ...",
    "refresh_token": "..."
  }
}
```

### Propiedades (público)
```
GET http://localhost:3000/v1/propiedades
GET http://localhost:3000/v1/propiedades?ciudad=bogotá&tipo=apartamento
GET http://localhost:3000/v1/propiedades?tour_virtual=true
GET http://localhost:3000/v1/propiedades/:id
```

### Endpoints protegidos (requieren Authorization: Bearer <token>)
```
GET    /v1/auth/me
GET    /v1/propiedades/mias
POST   /v1/propiedades
PATCH  /v1/propiedades/:id
DELETE /v1/propiedades/:id
GET    /v1/visitas
POST   /v1/visitas
GET    /v1/mensajes
POST   /v1/mensajes
GET    /v1/leads
POST   /v1/leads
GET    /v1/pagos
GET    /v1/favoritos
POST   /v1/favoritos
GET    /v1/estadisticas/kpis
GET    /v1/suscripciones/mi-plan
PATCH  /v1/usuarios/me
```

---

## 7. Flujo de uso completo

### Como arrendador

1. Abre el frontend en el navegador
2. Haz clic en **"Demo Arrendador"** o regístrate con un email nuevo
3. En el dashboard verás el **Panel** con KPIs en tiempo real desde la base de datos
4. Ve a **Mis Propiedades** → **Nueva propiedad** → completa el wizard de 4 pasos
5. La propiedad queda guardada en SQLite y aparece en el catálogo público
6. En **Visitas** puedes ver y confirmar las visitas recibidas
7. En **CRM** puedes gestionar tus leads con score automático
8. En **Estadísticas** verás las gráficas calculadas desde la base de datos real
9. En **Pagos** puedes registrar cobros y marcarlos como pagados

### Como inquilino

1. Haz clic en **"Demo Inquilino"**
2. El catálogo carga las propiedades desde la API
3. Filtra por ciudad, tipo o tour virtual
4. Haz clic en una propiedad → ver detalle con galería y tour 3D
5. Guarda en **Favoritos** con ❤️
6. Contacta al arrendador por **Mensajes**
7. Agenda una **Visita**

---

## 8. Variables de entorno

Todas las variables están en `backend/.env`:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | Entorno de ejecución |
| `PORT` | `3000` | Puerto del servidor |
| `DATABASE_URL` | `file:./prisma/inmovision.db` | Ruta del archivo SQLite |
| `JWT_SECRET` | `inmovision_super_secreto_2025` | Clave secreta JWT — **cambiar en producción** |
| `JWT_EXPIRY` | `15m` | Duración del access token |
| `JWT_REFRESH_EXPIRY` | `30` | Días de validez del refresh token |
| `FRONTEND_URL` | `http://127.0.0.1:5500` | Origen permitido en CORS |
| `WOMPI_PUBLIC_KEY` | `pub_stagtest_` | Clave pública Wompi |
| `SMTP_HOST` | vacío | Servidor email (opcional en dev) |

---

## 9. Comandos útiles de base de datos

```bash
# Ver el esquema y ejecutar queries en una UI visual
npx prisma studio

# Regenerar cliente Prisma tras cambios en schema.prisma
npx prisma generate

# Crear una nueva migración tras modificar el schema
npx prisma migrate dev --name nombre_del_cambio

# Borrar todo y volver a empezar (¡elimina todos los datos!)
npm run db:reset

# Ver el contenido de la DB desde terminal
npx prisma studio
```

### Agregar una nueva columna (ejemplo)

1. Edita `prisma/schema.prisma` y agrega el campo al modelo
2. Ejecuta:
   ```bash
   npx prisma migrate dev --name agregar_campo_descripcion
   npx prisma generate
   ```
3. El campo ya está disponible en la API y en el cliente TypeScript

---

## 10. Solución de problemas frecuentes

### ❌ "Cannot use import statement in a non-module"
**Causa:** Abriste `index.html` directamente con doble clic.  
**Solución:** Usa Live Server o `npx serve . -p 5500`.

---

### ❌ "Failed to fetch" o "Network Error" en el frontend
**Causa:** El backend no está corriendo.  
**Solución:**
```bash
cd inmovision/backend
npm run start:dev
```
Verifica que veas el mensaje `🚀 Backend corriendo en http://localhost:3000/v1`.

---

### ❌ CORS error en el navegador
**Causa:** El frontend está en un puerto diferente al configurado en `.env`.  
**Solución:** Abre `backend/.env` y actualiza `FRONTEND_URL`:
```env
# Si Live Server usa el puerto 5501:
FRONTEND_URL=http://127.0.0.1:5501
```
Reinicia el backend.

---

### ❌ "PrismaClientKnownRequestError: table does not exist"
**Causa:** No se aplicaron las migraciones.  
**Solución:**
```bash
cd inmovision/backend
npx prisma migrate dev --name init
npm run db:seed
```

---

### ❌ "Cannot find module '@prisma/client'"
**Causa:** Falta el cliente generado.  
**Solución:**
```bash
npx prisma generate
```

---

### ❌ Los botones Demo no funcionan
**Causa:** El seed no se ejecutó o el backend no está corriendo.  
**Solución:**
```bash
npm run db:seed
npm run start:dev
```

---

### ❌ "Error: JWT_SECRET is not defined"
**Causa:** El archivo `.env` no existe o está mal ubicado.  
**Solución:** Verifica que `backend/.env` existe con el contenido del paso 3.

---

## 11. Llevar a producción

Cuando quieras publicar el proyecto:

### Backend

1. Cambia estas variables en `.env`:
   ```env
   NODE_ENV=production
   JWT_SECRET=una_clave_muy_larga_y_aleatoria_de_64_caracteres
   DATABASE_URL="file:/var/data/inmovision.db"
   FRONTEND_URL=https://tudominio.com
   ```

2. Compila y ejecuta:
   ```bash
   npm run build
   npm start
   ```

3. Usa un proceso manager como PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/src/main.js --name inmovision-api
   pm2 save
   ```

### Frontend

El frontend es estático: copia la carpeta `frontend/` a cualquier hosting estático:
- **Netlify / Vercel**: arrastra y suelta la carpeta `frontend/`
- **Nginx**: configura un `server` block apuntando a la carpeta
- **GitHub Pages**: sube la carpeta `frontend/` al repositorio

Solo recuerda actualizar `API_URL` en `frontend/js/utils.js`:
```javascript
export const API_URL = 'https://api.tudominio.com/v1';
```

### Base de datos en producción

SQLite funciona perfectamente para proyectos pequeños y medianos.  
Para escalar a más usuarios, migra a PostgreSQL cambiando solo dos líneas en `schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"          // cambiar de "sqlite"
  url      = env("DATABASE_URL")   // esta línea queda igual
}
```

Y actualiza `DATABASE_URL` en `.env`:
```env
DATABASE_URL="postgresql://usuario:contraseña@host:5432/inmovision"
```

Luego ejecuta `npx prisma migrate dev` y todo lo demás funciona igual.

---

## Resumen de comandos

```bash
# ── Backend ──────────────────────────────────────────────────
cd inmovision/backend
npm install                              # instalar dependencias
npx prisma generate                      # generar cliente Prisma
npx prisma migrate dev --name init       # crear base de datos y tablas
npm run db:seed                          # cargar datos demo
npm run start:dev                        # iniciar en modo desarrollo
npm run build && npm start               # iniciar en modo producción

# ── Frontend ──────────────────────────────────────────────────
cd inmovision/frontend
npx serve . -p 5500                      # o usar Live Server en VS Code

# ── Base de datos ─────────────────────────────────────────────
npx prisma studio                        # interfaz visual de la DB
npm run db:reset                         # borrar todo y reiniciar
```

---

*INMOVISIÓN 360 SUITE Habitat · v12.0 · Colombia & Latinoamérica*
