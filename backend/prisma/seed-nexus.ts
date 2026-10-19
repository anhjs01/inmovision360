/**
 * seed-nexus.ts — Carga las propiedades de ejemplo del proyecto Nexus Habitat
 * a nombre de arrendador@demo.com, con sus fotos.
 *
 * Uso (desde backend/):
 *   npm run db:seed:nexus                 → descarga las fotos a uploads/ (quedan locales)
 *   npm run db:seed:nexus -- --sin-descarga → guarda las URLs externas de Unsplash
 *
 * Es idempotente: si la propiedad ya existe para ese usuario, no la duplica.
 * También crea/actualiza el catálogo de planes (incluye Planos 2D/3D).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs     from 'fs';
import * as path   from 'path';
import { randomUUID } from 'crypto';
import { upsertPlanes } from './planes';

const prisma        = new PrismaClient();
const EMAIL         = 'arrendador@demo.com';
const UPLOAD_DIR    = path.join(process.cwd(), 'uploads');   // igual que src/common/utils/uploads.ts
const SIN_DESCARGA  = process.argv.includes('--sin-descarga');
const MIME_EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_BYTES     = 5 * 1024 * 1024;

type NexusProp = {
  titulo: string; ciudad: string; barrio: string; tipo: string; listing: string;
  precio: number; estrato: number | null; habitaciones: number; banos: number; metros: number;
  parqueaderos: number; descripcion: string; fotos: string[]; comodidades: string[];
  video: string | null; tourVirtual: boolean; tourUrl: string | null; tourTipo: string | null;
  mapa2d: boolean; destacado: boolean;
};

// Descarga una foto a uploads/ y devuelve /uploads/<uuid>.<ext>.
// Si la foto ya no existe (404, no es imagen) se descarta; si falla la red, se conserva la URL externa.
async function guardarFoto(url: string): Promise<string | null> {
  if (SIN_DESCARGA) return url;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (e: any) {
    console.warn(`   ⚠️  Sin conexión para ${url.slice(0, 60)}… (${e.message}); se usa la URL externa`);
    return url;
  }
  const ext = MIME_EXT[(res.headers.get('content-type') ?? '').split(';')[0].trim()];
  const buf = res.ok && ext ? Buffer.from(await res.arrayBuffer()) : null;
  if (!buf || buf.length > MAX_BYTES) {
    console.warn(`   🗑️  Foto descartada ${url.slice(0, 60)}… (HTTP ${res.status}${buf ? ', supera 5 MB' : ''})`);
    return null;
  }
  const nombre = randomUUID() + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, nombre), buf);
  return `/uploads/${nombre}`;
}

async function obtenerArrendador() {
  const existente = await prisma.usuario.findUnique({ where: { email: EMAIL } });
  if (existente) {
    if (existente.deletedAt)              throw new Error(`${EMAIL} está eliminado`);
    if (existente.rol !== 'arrendador')   throw new Error(`${EMAIL} tiene rol "${existente.rol}", se necesita "arrendador"`);
    return existente;
  }
  console.log(`👤 ${EMAIL} no existe: se crea con contraseña demo1234`);
  return prisma.usuario.create({
    data: { nombre: 'Arrendador', apellido: 'Demo', email: EMAIL, password: await bcrypt.hash('demo1234', 10),
            rol: 'arrendador', plan: 'professional', verified: true },
  });
}

async function main() {
  await upsertPlanes(prisma);
  console.log('⭐ Planes listos (incluye Planos 2D y 3D)');

  const owner = await obtenerArrendador();
  const data: NexusProp[] = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'nexus-propiedades.json'), 'utf8'));
  if (!SIN_DESCARGA) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // El plan Free permite 5 propiedades: se sube a Professional para que quepan las de ejemplo
  const plan = await prisma.plan.findUnique({ where: { id: owner.plan } });
  const activas = await prisma.propiedad.count({ where: { ownerId: owner.id, deletedAt: null } });
  if (plan?.propsMax != null && activas + data.length > plan.propsMax) {
    await prisma.usuario.update({ where: { id: owner.id }, data: { plan: 'professional' } });
    console.log(`📈 ${EMAIL} pasa de "${owner.plan}" a "professional" para no superar el límite de propiedades`);
  }

  let creadas = 0;
  for (const p of data) {
    const ya = await prisma.propiedad.findFirst({ where: { titulo: p.titulo, ownerId: owner.id, deletedAt: null } });
    if (ya) { console.log(`⏭️  Ya existe: ${p.titulo}`); continue; }

    const fotos: string[] = [];
    for (const url of p.fotos) { const f = await guardarFoto(url); if (f) fotos.push(f); }
    const { fotos: _f, comodidades, ...rest } = p;
    await prisma.propiedad.create({
      data: { ...rest, ownerId: owner.id, fotos: JSON.stringify(fotos), comodidades: JSON.stringify(comodidades) },
    });
    creadas++;
    console.log(`✅ ${p.titulo} (${fotos.filter(f => f.startsWith('/uploads/')).length}/${fotos.length} fotos locales)`);
  }
  console.log(`\n🏁 ${creadas} propiedad(es) nuevas para ${EMAIL}`);
}

main()
  .catch(e => { console.error('❌', e.message ?? e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
