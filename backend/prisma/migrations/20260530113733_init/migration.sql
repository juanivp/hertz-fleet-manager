-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'operador',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoria" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "ubicacion" TEXT NOT NULL DEFAULT '',
    "kmActuales" INTEGER NOT NULL DEFAULT 0,
    "fechaIncorporacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximaVenta" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT NOT NULL DEFAULT '',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehiculoId" INTEGER NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteEmail" TEXT NOT NULL DEFAULT '',
    "clienteTel" TEXT NOT NULL DEFAULT '',
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "notas" TEXT NOT NULL DEFAULT '',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Reserva_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehiculoId" INTEGER,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alerta_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfigAlerta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'email',
    "destinatarios" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegistroActividad" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER,
    "accion" TEXT NOT NULL,
    "detalle" TEXT NOT NULL DEFAULT '',
    "entidad" TEXT NOT NULL DEFAULT '',
    "entidadId" INTEGER,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroActividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_patente_key" ON "Vehiculo"("patente");
