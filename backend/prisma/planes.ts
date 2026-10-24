import { PrismaClient } from '@prisma/client';

// Catálogo de planes compartido por seed.ts y seed-nexus.ts.
// categoria 'suscripcion' = planes del arrendador (límite de propiedades).
// categoria 'plano' = oferta visual de Planos 2D/3D para arrendadores: se muestra y "contrata"
// en el frontend, pero no cambia el plan ni los límites del usuario.
// categoria 'inquilino' = Pass VIP del inquilino (prioridad, insignia, alertas y soporte).
export const PLANES = [
  { id: 'free',         nombre: 'Free',         precio: 0,      propsMax: 5,    categoria: 'suscripcion',
    descripcion: 'Para empezar a publicar',
    features: ['Hasta 5 propiedades', 'Galería de fotos', 'Chat con interesados'] },
  { id: 'starter',      nombre: 'Starter',      precio: 49000,  propsMax: 20,   categoria: 'suscripcion',
    descripcion: 'Para arrendadores en crecimiento',
    features: ['Hasta 20 propiedades', 'CRM de leads', 'Estadísticas básicas'] },
  { id: 'professional', nombre: 'Professional', precio: 149000, propsMax: null, categoria: 'suscripcion',
    descripcion: 'Para inmobiliarias y agentes',
    features: ['Propiedades ilimitadas', 'Tours virtuales 360°', 'Estadísticas avanzadas'] },
  { id: 'enterprise',   nombre: 'Enterprise',   precio: 399000, propsMax: null, categoria: 'suscripcion',
    descripcion: 'Para equipos grandes',
    features: ['Todo lo de Professional', 'Soporte prioritario', 'Múltiples usuarios'] },
  { id: 'plano_2d',     nombre: 'Planos 2D',    precio: 59000,  propsMax: null, categoria: 'plano',
    descripcion: 'Plano arquitectónico a escala de tu inmueble',
    features: ['Plano a escala con medidas', 'Áreas por espacio en m²', 'Entrega en PDF y PNG', 'Distintivo "Plano 2D" en el catálogo'] },
  { id: 'plano_3d',     nombre: 'Planos 3D',    precio: 129000, propsMax: null, categoria: 'plano',
    descripcion: 'Modelo 3D amoblado para mostrar cada ambiente',
    features: ['Modelo 3D amoblado', 'Vistas isométricas por ambiente', 'Recorrido renderizado', 'Entrega en 5 días hábiles'] },
  { id: 'inquilino_vip', nombre: 'Inquilino VIP · Pass Express', precio: 29000, propsMax: null, categoria: 'inquilino',
    descripcion: 'Encuentra y asegura tu próximo hogar antes que los demás',
    features: ['Postulación prioritaria: tus solicitudes aparecen primero al arrendador',
               'Insignia de "Perfil verificado" visible para los arrendadores',
               'Alertas inmediatas de nuevos inmuebles según tus filtros',
               'Soporte preferencial para agendar tus citas'] },
];

// Idempotente: crea o actualiza cada plan
export async function upsertPlanes(prisma: PrismaClient) {
  for (const { features, ...p } of PLANES) {
    const data = { ...p, features: JSON.stringify(features) };
    await prisma.plan.upsert({ where: { id: p.id }, update: data, create: data });
  }
}
