// Pruebas e2e: levantan la API real (misma configuración que main.ts) sobre una base SQLite
// temporal con todas las migraciones aplicadas. La base de desarrollo no se toca.
import { test, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { execSync } from 'child_process';
import * as fs   from 'fs';
import * as os   from 'os';
import * as path from 'path';

const ROOT   = path.join(__dirname, '..');
const TMP    = fs.mkdtempSync(path.join(os.tmpdir(), 'inmovision-e2e-'));
const DB_URL = 'file:' + path.join(TMP, 'test.db').replace(/\\/g, '/');

// Antes de cargar Prisma/Nest: la base temporal reemplaza a la del .env
process.env.DATABASE_URL = DB_URL;
process.env.NODE_ENV     = 'test';
process.env.JWT_SECRET   = process.env.JWT_SECRET || 'test_secret';

const ID = 'dQw4w9WgXcQ';
let app: any;
let base = '';
let prisma: any;

type Res = { status: number; body: any; headers: Headers };
async function api(method: string, p: string, body?: any, token?: string, headers: Record<string, string> = {}): Promise<Res> {
  const r = await fetch(base + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null), headers: r.headers };
}

async function registrar(rol: 'arrendador' | 'inquilino', nombre: string) {
  const email = `${nombre.toLowerCase()}.${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.co`;
  const r = await api('POST', '/v1/auth/register', { nombre, apellido: 'Prueba', email, password: 'secreto123', rol });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { token: r.body.data.access_token as string, user: r.body.data.user };
}

let owner: { token: string; user: any };
let inq: { token: string; user: any };
let inq2: { token: string; user: any };
let propId = '';

const PROP = {
  titulo: 'Loft Roma Norte', ciudad: '  Ciudad de   México ', barrio: 'Roma Norte', tipo: 'loft',
  listing: 'rent', precio: 2500000, metros: 60, habitaciones: 1, banos: 1,
  video: `https://www.youtube.com/watch?v=${ID}&t=10s`,
};

before(async () => {
  execSync('npx prisma migrate deploy', { cwd: ROOT, env: process.env, stdio: 'pipe' });

  // Carga diferida: así Prisma lee la DATABASE_URL temporal
  const { NestFactory }  = require('@nestjs/core');
  const { AppModule }    = require('../src/app.module');
  const { configureApp } = require('../src/app.setup');
  const { PrismaService } = require('../src/prisma/prisma.service');
  const { upsertPlanes } = require('../prisma/planes');

  app = configureApp(await NestFactory.create(AppModule, { logger: false }));
  await app.listen(0, '127.0.0.1');
  base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  prisma = app.get(PrismaService);
  await upsertPlanes(prisma);

  owner = await registrar('arrendador', 'Ana');
  inq   = await registrar('inquilino', 'Beto');
  inq2  = await registrar('inquilino', 'Caro');
});

after(async () => {
  await app?.close();
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* Windows puede retener el .db un momento */ }
});

// ── 2. Catálogo público ────────────────────────────────────────
test('GET /propiedades responde sin token (catálogo de la landing)', async () => {
  const r = await api('GET', '/v1/propiedades');
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.ok(Array.isArray(r.body.data));
  assert.ok(r.body.meta);
});

test('GET /propiedades con un token vencido/inválido sigue siendo público', async () => {
  const r = await api('GET', '/v1/propiedades', undefined, 'token.invalido.xx');
  assert.equal(r.status, 200);
});

test('CORS acepta el frontend aunque Live Server use otro puerto', async () => {
  const r = await api('GET', '/v1/propiedades', undefined, undefined, { Origin: 'http://127.0.0.1:5502' });
  assert.equal(r.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5502');
  const otro = await api('GET', '/v1/propiedades', undefined, undefined, { Origin: 'https://sitio-ajeno.com' });
  assert.equal(otro.headers.get('access-control-allow-origin'), null);
});

// ── 3 y 4. Ciudades LATAM y videos de YouTube ──────────────────
test('crear propiedad: ciudad LATAM normalizada y video de YouTube convertido a /embed/', async () => {
  const r = await api('POST', '/v1/propiedades', PROP, owner.token);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  propId = r.body.data.id;
  assert.equal(r.body.data.ciudad, 'ciudad de méxico');
  assert.equal(r.body.data.video, `https://www.youtube.com/embed/${ID}?start=10`);
  assert.equal(r.body.data.estado, 'disponible');
});

test('editar con enlace youtu.be también lo normaliza', async () => {
  const r = await api('PATCH', `/v1/propiedades/${propId}`, { video: `https://youtu.be/${ID}` }, owner.token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.video, `https://www.youtube.com/embed/${ID}`);
});

test('la ciudad se busca sin importar mayúsculas ni espacios', async () => {
  const r = await api('GET', '/v1/propiedades?ciudad=' + encodeURIComponent('CIUDAD DE MÉXICO'));
  assert.ok(r.body.data.some((p: any) => p.id === propId));
});

test('ciudades con caracteres inválidos se rechazan', async () => {
  const r = await api('POST', '/v1/propiedades', { ...PROP, ciudad: '<script>' }, owner.token);
  assert.equal(r.status, 400);
});

// ── 5. WhatsApp del arrendador ─────────────────────────────────
test('el arrendador guarda su WhatsApp y plantilla; las tarjetas los traen solo con sesión', async () => {
  const plantilla = 'Hola {arrendador}, me interesa {propiedad} en {ciudad}';
  const u = await api('PATCH', '/v1/usuarios/me', { telefono: '+52 55 1234 5678', waMensaje: plantilla }, owner.token);
  assert.equal(u.status, 200, JSON.stringify(u.body));
  assert.equal(u.body.data.waMensaje, plantilla);

  const anon = await api('GET', '/v1/propiedades');
  const pa   = anon.body.data.find((p: any) => p.id === propId);
  assert.equal(pa.contacto.telefono, null);
  assert.equal(pa.contacto.waMensaje, null);

  const conSesion = await api('GET', '/v1/propiedades', undefined, inq.token);
  const pc = conSesion.body.data.find((p: any) => p.id === propId);
  assert.equal(pc.contacto.telefono, '+52 55 1234 5678');
  assert.equal(pc.contacto.waMensaje, plantilla);

  const det = await api('GET', `/v1/propiedades/${propId}`, undefined, inq.token);
  assert.equal(det.body.data.contacto.telefono, '+52 55 1234 5678');
});

// ── 1. Pass Inquilino VIP ──────────────────────────────────────
test('el inquilino ve solo el Pass VIP (sin Planos 2D/3D); el arrendador no lo ve', async () => {
  const inqPlanes = await api('GET', '/v1/suscripciones/planes?rol=inquilino');
  assert.deepEqual(inqPlanes.body.data.map((p: any) => p.id), ['inquilino_vip']);
  const arrPlanes = await api('GET', '/v1/suscripciones/planes?rol=arrendador');
  const ids = arrPlanes.body.data.map((p: any) => p.id);
  assert.ok(ids.includes('plano_2d') && ids.includes('starter'));
  assert.ok(!ids.includes('inquilino_vip'));
});

test('suscripciones por rol: el inquilino no puede contratar planes de arrendador', async () => {
  assert.equal((await api('POST', '/v1/suscripciones', { plan_id: 'plano_3d' }, inq.token)).status, 400);
  assert.equal((await api('POST', '/v1/suscripciones', { plan_id: 'starter' }, inq.token)).status, 403);
  assert.equal((await api('POST', '/v1/suscripciones', { plan_id: 'inquilino_vip' }, owner.token)).status, 403);

  const ok = await api('POST', '/v1/suscripciones', { plan_id: 'inquilino_vip', metodo: 'PSE' }, inq.token);
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const me = await api('GET', '/v1/auth/me', undefined, inq.token);
  assert.equal(me.body.data.plan, 'inquilino_vip');
});

test('postulación prioritaria: la visita del inquilino VIP aparece primero y marcada', async () => {
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  // Primero pide el inquilino normal, después el VIP: aun así el VIP queda arriba
  assert.equal((await api('POST', '/v1/visitas', { propId, fecha: manana, hora: '10:00' }, inq2.token)).status, 201);
  assert.equal((await api('POST', '/v1/visitas', { propId, fecha: manana, hora: '11:00' }, inq.token)).status, 201);
  const r = await api('GET', '/v1/visitas', undefined, owner.token);
  assert.equal(r.status, 200);
  assert.equal(r.body.data[0].vip, true);
  assert.equal(r.body.data[0].inquilinoId, inq.user.id);
  assert.equal(r.body.data[1].vip, false);
});

test('las alertas VIP filtran por fecha de publicación (?desde=)', async () => {
  const futuro = new Date(Date.now() + 60000).toISOString();
  const r = await api('GET', '/v1/propiedades?desde=' + encodeURIComponent(futuro));
  assert.equal(r.body.data.length, 0);
  const pasado = new Date(Date.now() - 3600000).toISOString();
  const r2 = await api('GET', '/v1/propiedades?desde=' + encodeURIComponent(pasado));
  assert.ok(r2.body.data.some((p: any) => p.id === propId));
});

// ── 7. Cierre de arriendo / compra ─────────────────────────────
test('un arriendo no se puede "comprar"', async () => {
  const r = await api('POST', `/v1/propiedades/${propId}/cierre`, { tipo: 'compra' }, inq.token);
  assert.equal(r.status, 400);
});

test('el inquilino pide cerrar el arriendo: queda reservada y sale del catálogo', async () => {
  const r = await api('POST', `/v1/propiedades/${propId}/cierre`, { tipo: 'arriendo' }, inq.token);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.estado, 'reservada');
  assert.equal(r.body.data.esMiHogar, true);

  const cat = await api('GET', '/v1/propiedades');
  assert.ok(!cat.body.data.some((p: any) => p.id === propId));

  // El arrendador recibe el aviso en su bandeja
  const msgs = await prisma.mensaje.count({ where: { paraId: owner.user.id, propId } });
  assert.ok(msgs >= 1);
});

test('otro inquilino ya no puede reservarla (409)', async () => {
  const r = await api('POST', `/v1/propiedades/${propId}/cierre`, { tipo: 'arriendo' }, inq2.token);
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'PROP_NOT_AVAILABLE');
});

test('solo el dueño resuelve el cierre; el arrendador lo confirma → Arrendada', async () => {
  assert.equal((await api('PATCH', `/v1/propiedades/${propId}/cierre`, { accion: 'confirmar' }, inq.token)).status, 403);
  const r = await api('PATCH', `/v1/propiedades/${propId}/cierre`, { accion: 'confirmar' }, owner.token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.estado, 'arrendada');
  assert.ok(r.body.data.cerradaAt);

  const mias = await api('GET', '/v1/propiedades/mias', undefined, owner.token);
  const p = mias.body.data.find((x: any) => x.id === propId);
  assert.equal(p.inquilinoActual.nombre, 'Beto');
});

test('Mi Hogar del inquilino muestra la propiedad arrendada (y no la de otros)', async () => {
  const r = await api('GET', '/v1/propiedades/mi-hogar', undefined, inq.token);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.map((p: any) => [p.id, p.estado]), [[propId, 'arrendada']]);
  const otro = await api('GET', '/v1/propiedades/mi-hogar', undefined, inq2.token);
  assert.equal(otro.body.data.length, 0);
  assert.equal((await api('GET', '/v1/propiedades/mi-hogar', undefined, owner.token)).status, 403);
});

test('venta: el cierre de compra termina en Vendida', async () => {
  const c = await api('POST', '/v1/propiedades', { ...PROP, titulo: 'Casa en Lima', ciudad: 'Lima', listing: 'sale', video: undefined }, owner.token);
  assert.equal(c.status, 201);
  const id = c.body.data.id;
  assert.equal((await api('POST', `/v1/propiedades/${id}/cierre`, { tipo: 'compra' }, inq2.token)).status, 201);
  const r = await api('PATCH', `/v1/propiedades/${id}/cierre`, { accion: 'confirmar' }, owner.token);
  assert.equal(r.body.data.estado, 'vendida');
});

test('rechazar y volver a publicar devuelven la propiedad al catálogo', async () => {
  const lib = await api('PATCH', `/v1/propiedades/${propId}/cierre`, { accion: 'liberar' }, owner.token);
  assert.equal(lib.body.data.estado, 'disponible');
  assert.equal(lib.body.data.inquilinoActualId, null);

  assert.equal((await api('POST', `/v1/propiedades/${propId}/cierre`, { tipo: 'arriendo' }, inq2.token)).status, 201);
  const rech = await api('PATCH', `/v1/propiedades/${propId}/cierre`, { accion: 'rechazar' }, owner.token);
  assert.equal(rech.body.data.estado, 'disponible');
  const cat = await api('GET', '/v1/propiedades');
  assert.ok(cat.body.data.some((p: any) => p.id === propId));
});

// ── Regresión: endpoints existentes ────────────────────────────
test('endpoints existentes siguen respondiendo', async () => {
  assert.equal((await api('GET', '/v1/propiedades/mias', undefined, owner.token)).status, 200);
  assert.equal((await api('GET', '/v1/favoritos', undefined, inq.token)).status, 200);
  assert.equal((await api('GET', '/v1/pagos/mios', undefined, inq.token)).status, 200);
  assert.equal((await api('GET', '/v1/estadisticas/kpis', undefined, owner.token)).status, 200);
  assert.equal((await api('GET', '/v1/suscripciones/mi-plan', undefined, owner.token)).status, 200);
  assert.equal((await api('GET', '/v1/mensajes', undefined, owner.token)).status, 200);
  assert.equal((await api('GET', '/v1/propiedades/mias')).status, 401);
});
