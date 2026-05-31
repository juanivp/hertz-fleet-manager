import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  await prisma.registroActividad.deleteMany()
  await prisma.alerta.deleteMany()
  await prisma.reserva.deleteMany()
  await prisma.vehiculo.deleteMany()
  await prisma.configAlerta.deleteMany()
  await prisma.usuario.deleteMany()

  const adminHash = await bcrypt.hash('admin123', 10)
  const opHash = await bcrypt.hash('oper123', 10)

  const admin = await prisma.usuario.create({
    data: { nombre: 'Admin Usuario', email: 'admin@flota.com', passwordHash: adminHash, rol: 'admin', ultimoAcceso: new Date() },
  })
  const op1 = await prisma.usuario.create({
    data: { nombre: 'Carlos Mendez', email: 'carlos@flota.com', passwordHash: opHash, rol: 'operador', ultimoAcceso: new Date(Date.now() - 3600000) },
  })
  const op2 = await prisma.usuario.create({
    data: { nombre: 'Laura Gomez', email: 'laura@flota.com', passwordHash: opHash, rol: 'operador', ultimoAcceso: new Date(Date.now() - 86400000) },
  })
  await prisma.usuario.create({
    data: { nombre: 'Juan Perez', email: 'juan@flota.com', passwordHash: opHash, rol: 'visualizador', ultimoAcceso: new Date(Date.now() - 172800000) },
  })

  const hoy = new Date()
  const d = (offsetDays: number) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() + offsetDays)
    return d
  }

  const vehiculos = await Promise.all([
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'AB123CD', modelo: 'Corsa', marca: 'Chevrolet', anio: 2022, estado: 'disponible', ubicacion: 'Sucursal Centro', kmActuales: 34200 } }),
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'GH456IJ', modelo: 'Gol', marca: 'Volkswagen', anio: 2021, estado: 'alquilado', ubicacion: 'Sucursal Norte', kmActuales: 51800 } }),
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'KL789MN', modelo: 'Fiesta', marca: 'Ford', anio: 2023, estado: 'disponible', ubicacion: 'Sucursal Centro', kmActuales: 18400 } }),
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'OP012QR', modelo: 'Polo', marca: 'Volkswagen', anio: 2022, estado: 'reservado', ubicacion: 'Sucursal Sur', kmActuales: 28900 } }),
    prisma.vehiculo.create({ data: { categoria: 'H', patente: 'ST345UV', modelo: 'Prius', marca: 'Toyota', anio: 2023, estado: 'alquilado', ubicacion: 'Sucursal Norte', kmActuales: 22100 } }),
    prisma.vehiculo.create({ data: { categoria: 'H', patente: 'WX678YZ', modelo: 'Yaris Hybrid', marca: 'Toyota', anio: 2022, estado: 'disponible', ubicacion: 'Sucursal Centro', kmActuales: 41300 } }),
    prisma.vehiculo.create({ data: { categoria: 'H', patente: 'BC901DE', modelo: 'Civic e-HEV', marca: 'Honda', anio: 2023, estado: 'alquilado', ubicacion: 'Sucursal Sur', kmActuales: 15700 } }),
    prisma.vehiculo.create({ data: { categoria: 'H', patente: 'FG234HI', modelo: 'Niro Hybrid', marca: 'Kia', anio: 2022, estado: 'reservado', ubicacion: 'Sucursal Norte', kmActuales: 33500 } }),
    prisma.vehiculo.create({ data: { categoria: 'K', patente: 'JK567LM', modelo: 'Duster', marca: 'Renault', anio: 2021, estado: 'alquilado', ubicacion: 'Sucursal Centro', kmActuales: 68200, proximaVenta: true } }),
    prisma.vehiculo.create({ data: { categoria: 'K', patente: 'NO890PQ', modelo: 'Captur', marca: 'Renault', anio: 2022, estado: 'disponible', ubicacion: 'Sucursal Sur', kmActuales: 29800 } }),
    prisma.vehiculo.create({ data: { categoria: 'K', patente: 'RS123TU', modelo: 'T-Cross', marca: 'Volkswagen', anio: 2023, estado: 'alquilado', ubicacion: 'Sucursal Norte', kmActuales: 12300 } }),
    prisma.vehiculo.create({ data: { categoria: 'K', patente: 'VW456XY', modelo: 'Ecosport', marca: 'Ford', anio: 2021, estado: 'mantenimiento', ubicacion: 'Taller', kmActuales: 72100, proximaVenta: true } }),
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'ZA789BC', modelo: '208', marca: 'Peugeot', anio: 2023, estado: 'disponible', ubicacion: 'Sucursal Centro', kmActuales: 8900 } }),
    prisma.vehiculo.create({ data: { categoria: 'H', patente: 'DE012FG', modelo: 'Corolla Hybrid', marca: 'Toyota', anio: 2022, estado: 'alquilado', ubicacion: 'Sucursal Sur', kmActuales: 44600 } }),
    prisma.vehiculo.create({ data: { categoria: 'K', patente: 'HI345JK', modelo: 'Pulse', marca: 'Fiat', anio: 2023, estado: 'reservado', ubicacion: 'Sucursal Norte', kmActuales: 19200 } }),
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'LM678NO', modelo: 'Sandero', marca: 'Renault', anio: 2021, estado: 'disponible', ubicacion: 'Sucursal Sur', kmActuales: 55400 } }),
    prisma.vehiculo.create({ data: { categoria: 'H', patente: 'PQ901RS', modelo: 'Jazz e:HEV', marca: 'Honda', anio: 2023, estado: 'disponible', ubicacion: 'Sucursal Centro', kmActuales: 6100 } }),
    prisma.vehiculo.create({ data: { categoria: 'K', patente: 'TU234VW', modelo: 'Tracker', marca: 'Chevrolet', anio: 2022, estado: 'alquilado', ubicacion: 'Sucursal Norte', kmActuales: 36700 } }),
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'XY567ZA', modelo: 'Fastback', marca: 'Fiat', anio: 2023, estado: 'alquilado', ubicacion: 'Sucursal Centro', kmActuales: 24100 } }),
    prisma.vehiculo.create({ data: { categoria: 'K', patente: 'BC890DE', modelo: 'Cronos', marca: 'Fiat', anio: 2022, estado: 'disponible', ubicacion: 'Sucursal Sur', kmActuales: 31500 } }),
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'FG123HI', modelo: 'Clio', marca: 'Renault', anio: 2022, estado: 'reservado', ubicacion: 'Sucursal Norte', kmActuales: 47200 } }),
    prisma.vehiculo.create({ data: { categoria: 'H', patente: 'JK456LM', modelo: 'Ioniq Hybrid', marca: 'Hyundai', anio: 2023, estado: 'alquilado', ubicacion: 'Sucursal Centro', kmActuales: 11800 } }),
    prisma.vehiculo.create({ data: { categoria: 'K', patente: 'NO789PQ', modelo: 'HR-V', marca: 'Honda', anio: 2022, estado: 'disponible', ubicacion: 'Sucursal Sur', kmActuales: 28300 } }),
    prisma.vehiculo.create({ data: { categoria: 'C', patente: 'RS012TU', modelo: 'Argo', marca: 'Fiat', anio: 2021, estado: 'disponible', ubicacion: 'Sucursal Norte', kmActuales: 62800 } }),
  ])

  await Promise.all([
    prisma.reserva.create({ data: { vehiculoId: vehiculos[1].id, clienteNombre: 'Martín García', clienteEmail: 'martin@email.com', clienteTel: '011-4444-1111', fechaInicio: d(-10), fechaFin: d(5), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[3].id, clienteNombre: 'Ana Rodríguez', clienteEmail: 'ana@email.com', clienteTel: '011-5555-2222', fechaInicio: d(2), fechaFin: d(9), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[4].id, clienteNombre: 'Roberto Silva', clienteEmail: 'roberto@email.com', clienteTel: '011-6666-3333', fechaInicio: d(-5), fechaFin: d(3), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[6].id, clienteNombre: 'Claudia López', clienteEmail: 'claudia@email.com', clienteTel: '011-7777-4444', fechaInicio: d(-15), fechaFin: d(1), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[7].id, clienteNombre: 'Diego Fernández', clienteEmail: 'diego@email.com', clienteTel: '011-8888-5555', fechaInicio: d(4), fechaFin: d(11), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[8].id, clienteNombre: 'Sofía Martinez', clienteEmail: 'sofia@email.com', clienteTel: '011-9999-6666', fechaInicio: d(-20), fechaFin: d(-1), estado: 'finalizada' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[10].id, clienteNombre: 'Pablo Torres', clienteEmail: 'pablo@email.com', clienteTel: '011-1111-7777', fechaInicio: d(-8), fechaFin: d(6), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[13].id, clienteNombre: 'Valentina Cruz', clienteEmail: 'valentina@email.com', clienteTel: '011-2222-8888', fechaInicio: d(-3), fechaFin: d(7), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[14].id, clienteNombre: 'Hernán Díaz', clienteEmail: 'hernan@email.com', clienteTel: '011-3333-9999', fechaInicio: d(1), fechaFin: d(8), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[17].id, clienteNombre: 'Cecilia Ruiz', clienteEmail: 'cecilia@email.com', clienteTel: '011-4444-0000', fechaInicio: d(-12), fechaFin: d(2), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[18].id, clienteNombre: 'Federico Morales', clienteEmail: 'fede@email.com', clienteTel: '011-5555-1111', fechaInicio: d(-6), fechaFin: d(4), estado: 'activa' } }),
    prisma.reserva.create({ data: { vehiculoId: vehiculos[21].id, clienteNombre: 'Marina Castro', clienteEmail: 'marina@email.com', clienteTel: '011-6666-2222', fechaInicio: d(-1), fechaFin: d(10), estado: 'activa' } }),
  ])

  await Promise.all([
    prisma.alerta.create({ data: { vehiculoId: vehiculos[8].id, tipo: 'vencimiento', descripcion: 'Vehículo próximo a venta (11 meses en flota)', leida: false, enviada: true } }),
    prisma.alerta.create({ data: { vehiculoId: vehiculos[11].id, tipo: 'mantenimiento', descripcion: 'Mantenimiento programado vencido - Ecosport VW456XY', leida: false, enviada: true } }),
    prisma.alerta.create({ data: { vehiculoId: vehiculos[3].id, tipo: 'devolucion', descripcion: 'Recordatorio de devolución: reserva de Ana Rodríguez vence en 2 días', leida: false, enviada: false } }),
  ])

  await Promise.all([
    prisma.configAlerta.create({ data: { nombre: 'Ciclo de vida de vehículo', tipo: 'vencimiento', frecuencia: 'mensual', canal: 'email', destinatarios: JSON.stringify(['admin@flota.com', 'carlos@flota.com']), activa: true } }),
    prisma.configAlerta.create({ data: { nombre: 'Modificación de reservas', tipo: 'cambio_estado', frecuencia: 'inmediata', canal: 'email', destinatarios: JSON.stringify(['admin@flota.com']), activa: true } }),
    prisma.configAlerta.create({ data: { nombre: 'Recordatorio de devolución', tipo: 'devolucion', frecuencia: 'diaria', canal: 'email', destinatarios: JSON.stringify(['admin@flota.com', 'laura@flota.com']), activa: true } }),
    prisma.configAlerta.create({ data: { nombre: 'Mantenimiento programado', tipo: 'mantenimiento', frecuencia: 'semanal', canal: 'email', destinatarios: JSON.stringify(['carlos@flota.com']), activa: false } }),
  ])

  await Promise.all([
    prisma.registroActividad.create({ data: { usuarioId: admin.id, accion: 'LOGIN', detalle: 'Inicio de sesión exitoso', entidad: 'Usuario', entidadId: admin.id } }),
    prisma.registroActividad.create({ data: { usuarioId: op1.id, accion: 'CREAR_RESERVA', detalle: 'Reserva creada para Ana Rodríguez - Polo OP012QR', entidad: 'Reserva', entidadId: 2 } }),
    prisma.registroActividad.create({ data: { usuarioId: admin.id, accion: 'MODIFICAR_VEHICULO', detalle: 'Estado actualizado: Ecosport VW456XY → mantenimiento', entidad: 'Vehiculo', entidadId: vehiculos[11].id } }),
    prisma.registroActividad.create({ data: { usuarioId: op2.id, accion: 'ENVIAR_ALERTA', detalle: 'Alerta de devolución enviada por email', entidad: 'Alerta', entidadId: 3 } }),
    prisma.registroActividad.create({ data: { usuarioId: op1.id, accion: 'CREAR_RESERVA', detalle: 'Reserva creada para Diego Fernández - Niro Hybrid FG234HI', entidad: 'Reserva', entidadId: 5 } }),
    prisma.registroActividad.create({ data: { usuarioId: admin.id, accion: 'CREAR_VEHICULO', detalle: 'Vehículo agregado: Fiat Pulse HI345JK', entidad: 'Vehiculo', entidadId: vehiculos[14].id } }),
  ])

  console.log('✅ Seed completado: 24 vehículos, 12 reservas, 3 alertas, 4 usuarios')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
