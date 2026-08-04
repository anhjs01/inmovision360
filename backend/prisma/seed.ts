import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('demo1234', 10);

  // ── Planes ────────────────────────────────────────────────
  await prisma.plan.createMany({
    data: [
      { id: 'free',         nombre: 'Free',         precio: 0,      propsMax: 5    },
      { id: 'starter',      nombre: 'Starter',      precio: 49000,  propsMax: 20   },
      { id: 'professional', nombre: 'Professional', precio: 149000, propsMax: null },
      { id: 'enterprise',   nombre: 'Enterprise',   precio: 399000, propsMax: null },
    ],
    
  });

  // ── Usuarios demo ─────────────────────────────────────────
  const arrendador = await prisma.usuario.upsert({
    where:  { email: 'arrendador@demo.co' },
    update: {},
    create: {
      nombre:   'Felipe',
      apellido: 'Fonseca',
      email:    'arrendador@demo.co',
      password: hash,
      rol:      'arrendador',
      plan:     'professional',
      verified: true,
    },
  });

  const inquilino = await prisma.usuario.upsert({
    where:  { email: 'inquilino@demo.co' },
    update: {},
    create: {
      nombre:   'Valentina',
      apellido: 'Torres',
      email:    'inquilino@demo.co',
      password: hash,
      rol:      'inquilino',
      plan:     'free',
      verified: true,
    },
  });

  // ── Propiedades demo ──────────────────────────────────────
  const propsData = [
    {
      titulo: 'Penthouse Rosales 360°', ciudad: 'bogotá', barrio: 'Rosales',
      tipo: 'apartamento', listing: 'rent', precio: 4800000, estrato: 6,
      habitaciones: 4, banos: 3, metros: 220, parqueaderos: 2,
      fotos: JSON.stringify([
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
        'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
      ]),
      comodidades: JSON.stringify(['piscina', 'gimnasio', 'parqueadero', 'terraza']),
      tourVirtual: true, tourUrl: 'https://kuula.co/share/7vBk7', tourTipo: 'Kuula',
      mapa2d: true, destacado: true, ownerId: arrendador.id,
    },
    {
      titulo: 'Loft Industrial Laureles', ciudad: 'medellín', barrio: 'Laureles',
      tipo: 'loft', listing: 'rent', precio: 1850000, estrato: 4,
      habitaciones: 1, banos: 1, metros: 72, parqueaderos: 0,
      fotos: JSON.stringify(['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80']),
      comodidades: JSON.stringify(['gimnasio', 'amoblado']),
      video: 'https://www.youtube.com/embed/ysz5S6PUM-U',
      ownerId: arrendador.id,
    },
    {
      titulo: 'Casa Campestre La Calera', ciudad: 'bogotá', barrio: 'La Calera',
      tipo: 'casa', listing: 'rent_sale', precio: 5500000, estrato: 5,
      habitaciones: 6, banos: 5, metros: 550, parqueaderos: 3,
      fotos: JSON.stringify(['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80']),
      comodidades: JSON.stringify(['piscina', 'parqueadero', 'terraza', 'mascotas']),
      mapa2d: true, destacado: true, ownerId: arrendador.id,
    },
    {
      titulo: 'Ático Cartagena Bay View', ciudad: 'cartagena', barrio: 'Bocagrande',
      tipo: 'apartamento', listing: 'rent', precio: 4200000, estrato: 6,
      habitaciones: 3, banos: 3, metros: 185, parqueaderos: 2,
      fotos: JSON.stringify(['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80']),
      comodidades: JSON.stringify(['piscina', 'gimnasio', 'parqueadero', 'terraza']),
      tourVirtual: true, tourUrl: 'https://my.matterport.com/show/?m=aSx1MpRRqif', tourTipo: 'Matterport',
      mapa2d: true, destacado: true, ownerId: arrendador.id,
    },
    {
      titulo: 'Estudio Chapinero Alto', ciudad: 'bogotá', barrio: 'Chapinero',
      tipo: 'estudio', listing: 'rent', precio: 900000, estrato: 3,
      habitaciones: 1, banos: 1, metros: 38, parqueaderos: 0,
      fotos: JSON.stringify(['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80']),
      comodidades: JSON.stringify(['amoblado', 'mascotas']),
      ownerId: arrendador.id,
    },
  ];

  for (const p of propsData) {
    const existing = await prisma.propiedad.findFirst({ where: { titulo: p.titulo } });
    if (!existing) await prisma.propiedad.create({ data: p });
  }

  const penthouse = await prisma.propiedad.findFirst({ where: { titulo: 'Penthouse Rosales 360°' } });

  if (penthouse) {
    await prisma.visitas.createMany({
      data: [
        { cliente: 'Valentina Torres', inquilinoId: inquilino.id, propId: penthouse.id, fecha: '2025-03-10', hora: '10:00', estado: 'confirmada' },
        { cliente: 'Andrés Moreno',    propId: penthouse.id, fecha: '2025-03-12', hora: '15:30', estado: 'pendiente' },
      ],
      
    });

    await prisma.pago.createMany({
      data: [
        { inquilinoId: inquilino.id, propId: penthouse.id, ownerId: arrendador.id, monto: 4800000, fecha: '2025-01-05', estado: 'pagado',   metodo: 'PSE',   wompiRef: 'WMP_demo001' },
        { inquilinoId: inquilino.id, propId: penthouse.id, ownerId: arrendador.id, monto: 4800000, fecha: '2025-02-05', estado: 'pagado',   metodo: 'Nequi', wompiRef: 'WMP_demo002' },
        { inquilinoId: inquilino.id, propId: penthouse.id, ownerId: arrendador.id, monto: 4800000, fecha: '2025-03-05', estado: 'pendiente',metodo: 'PSE'  },
      ],
      
    });

    await prisma.lead.createMany({
      data: [
        { nombre: 'Carlos Mejía',    email: 'cmejia@mail.co', propId: penthouse.id, presupuesto: '$4M–$5M', estado: 'interesado',     score: 82, fuente: 'Portal',   ownerId: arrendador.id },
        { nombre: 'María Fernández', email: 'mfer@mail.co',   propId: penthouse.id, presupuesto: '$5M–$6M', estado: 'visita_agendada',score: 71, fuente: 'Referido', ownerId: arrendador.id },
      ],
      
    });

    // Mensaje demo
    await prisma.mensaje.create({
      data: {
        propId: penthouse.id,
        deId:   inquilino.id,
        paraId: arrendador.id,
        texto:  '¡Hola! Me interesa el penthouse. ¿Disponible este fin de semana?',
      },
    }).catch(() => null);
  }

  console.log('✅ Seed completado.');
  console.log('   Demo arrendador: arrendador@demo.co / demo1234');
  console.log('   Demo inquilino:  inquilino@demo.co  / demo1234');
}

main().catch(console.error).finally(() => prisma.$disconnect());
