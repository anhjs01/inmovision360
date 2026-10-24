-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "waMensaje" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_propiedades" (
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
    "administracion" INTEGER,
    "serviciosEst" INTEGER,
    "descripcion" TEXT,
    "fotos" TEXT NOT NULL DEFAULT '[]',
    "comodidades" TEXT NOT NULL DEFAULT '[]',
    "video" TEXT,
    "tourVirtual" BOOLEAN NOT NULL DEFAULT false,
    "tourUrl" TEXT,
    "tourTipo" TEXT,
    "mapa2d" BOOLEAN NOT NULL DEFAULT false,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "cierreTipo" TEXT,
    "inquilinoActualId" TEXT,
    "cerradaAt" DATETIME,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "propiedades_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "propiedades_inquilinoActualId_fkey" FOREIGN KEY ("inquilinoActualId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_propiedades" ("administracion", "banos", "ciudad", "comodidades", "createdAt", "deletedAt", "descripcion", "destacado", "estrato", "fotos", "habitaciones", "id", "listing", "mapa2d", "metros", "ownerId", "parqueaderos", "precio", "serviciosEst", "tipo", "titulo", "tourTipo", "tourUrl", "tourVirtual", "updatedAt", "video", "barrio") SELECT "administracion", "banos", "ciudad", "comodidades", "createdAt", "deletedAt", "descripcion", "destacado", "estrato", "fotos", "habitaciones", "id", "listing", "mapa2d", "metros", "ownerId", "parqueaderos", "precio", "serviciosEst", "tipo", "titulo", "tourTipo", "tourUrl", "tourVirtual", "updatedAt", "video", "barrio" FROM "propiedades";
DROP TABLE "propiedades";
ALTER TABLE "new_propiedades" RENAME TO "propiedades";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
