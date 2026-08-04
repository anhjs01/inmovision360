-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'inquilino',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "telefono" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "planes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "precio" INTEGER NOT NULL DEFAULT 0,
    "propsMax" INTEGER
);

-- CreateTable
CREATE TABLE "propiedades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "barrio" TEXT NOT NULL DEFAULT '',
    "tipo" TEXT NOT NULL,
    "listing" TEXT NOT NULL DEFAULT 'rent',
    "precio" INTEGER NOT NULL,
    "estrato" INTEGER,
    "habitaciones" INTEGER NOT NULL DEFAULT 1,
    "banos" INTEGER NOT NULL DEFAULT 1,
    "metros" INTEGER NOT NULL,
    "parqueaderos" INTEGER NOT NULL DEFAULT 0,
    "fotos" TEXT NOT NULL DEFAULT '[]',
    "comodidades" TEXT NOT NULL DEFAULT '[]',
    "video" TEXT,
    "tourVirtual" BOOLEAN NOT NULL DEFAULT false,
    "tourUrl" TEXT,
    "tourTipo" TEXT,
    "mapa2d" BOOLEAN NOT NULL DEFAULT false,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "propiedades_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visitas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente" TEXT NOT NULL,
    "inquilinoId" TEXT,
    "propId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "nota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "visitas_propId_fkey" FOREIGN KEY ("propId") REFERENCES "propiedades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "visitas_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propId" TEXT NOT NULL,
    "deId" TEXT NOT NULL,
    "paraId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mensajes_propId_fkey" FOREIGN KEY ("propId") REFERENCES "propiedades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mensajes_deId_fkey" FOREIGN KEY ("deId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mensajes_paraId_fkey" FOREIGN KEY ("paraId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "propId" TEXT NOT NULL,
    "presupuesto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'new',
    "score" INTEGER NOT NULL DEFAULT 50,
    "fuente" TEXT NOT NULL DEFAULT 'Portal',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "leads_propId_fkey" FOREIGN KEY ("propId") REFERENCES "propiedades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "leads_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inquilinoId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "fecha" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "metodo" TEXT,
    "wompiRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_propId_fkey" FOREIGN KEY ("propId") REFERENCES "propiedades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pagos_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pagos_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "favoritos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,
    CONSTRAINT "favoritos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favoritos_propId_fkey" FOREIGN KEY ("propId") REFERENCES "propiedades" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL DEFAULT 'free',
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "vence" DATETIME,
    "wompiRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "suscripciones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "favoritos_userId_propId_key" ON "favoritos"("userId", "propId");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_userId_key" ON "suscripciones"("userId");
