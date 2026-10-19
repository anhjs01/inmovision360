-- AlterTable
ALTER TABLE "propiedades" ADD COLUMN "descripcion" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_planes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "precio" INTEGER NOT NULL DEFAULT 0,
    "propsMax" INTEGER,
    "categoria" TEXT NOT NULL DEFAULT 'suscripcion',
    "descripcion" TEXT,
    "features" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_planes" ("id", "nombre", "precio", "propsMax") SELECT "id", "nombre", "precio", "propsMax" FROM "planes";
DROP TABLE "planes";
ALTER TABLE "new_planes" RENAME TO "planes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

