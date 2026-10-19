-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pagos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inquilinoId" TEXT,
    "propId" TEXT NOT NULL,
    "ownerId" TEXT,
    "monto" INTEGER NOT NULL,
    "fecha" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "metodo" TEXT,
    "concepto" TEXT,
    "wompiRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_propId_fkey" FOREIGN KEY ("propId") REFERENCES "propiedades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pagos_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pagos_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pagos" ("createdAt", "estado", "fecha", "id", "inquilinoId", "metodo", "monto", "ownerId", "propId", "wompiRef") SELECT "createdAt", "estado", "fecha", "id", "inquilinoId", "metodo", "monto", "ownerId", "propId", "wompiRef" FROM "pagos";
DROP TABLE "pagos";
ALTER TABLE "new_pagos" RENAME TO "pagos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

