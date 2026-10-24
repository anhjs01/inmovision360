/**
 * utils.js — Funciones utilitarias globales
 * Formateadores, helpers DOM, sanitizador XSS básico
 */

'use strict';

// ── Sanitizador XSS básico ───────────────────────────────────
// Escapa también comillas: el resultado se usa dentro de atributos (value="…", src="…")
export function sanitize(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Solo URLs http(s): evita javascript:… en iframes/enlaces
export function safeUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url.trim() : '';
}

// ── WhatsApp ─────────────────────────────────────────────────
// Número de atención al cliente en formato internacional, solo dígitos (57 + celular)
export const WHATSAPP_SOPORTE = '573105550101';

export const WA_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';

// "+57 310 555 0101", "3105550101" → "573105550101"; '' si no es un número válido.
// Fuera de Colombia el número debe traer el indicativo del país (+52, +54, +51…)
export function waNumber(phone) {
  const d = String(phone ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (/^3\d{9}$/.test(d)) return '57' + d;          // celular colombiano sin indicativo
  return d.length >= 11 && d.length <= 15 ? d : '';  // ya trae indicativo de país
}

export function waLink(phone, text) {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : '';
}

// Plantilla del mensaje con el que un cliente escribe al arrendador sobre una propiedad.
// El arrendador la personaliza en Configuración; las {variables} se reemplazan con los datos del inmueble
export const WA_VARIABLES = ['{arrendador}', '{propiedad}', '{ciudad}', '{precio}'];
export const WA_PLANTILLA_DEFAULT =
  'Hola {arrendador} 👋, vi en INMOVISIÓN 360 la propiedad "{propiedad}" ({ciudad}, {precio}) y me gustaría recibir más información.';

export function waMensajePropiedad(prop, plantilla) {
  const nombre = (prop?.contacto?.nombre || '').split(' ')[0];
  const precio = `${formatCOP(prop?.precio)} ${prop?.listing === 'sale' ? 'COP' : 'COP/mes'}`;
  const vars   = { arrendador: nombre, propiedad: prop?.titulo ?? '', ciudad: cityLabel(prop?.ciudad), precio };
  return String(plantilla || prop?.contacto?.waMensaje || WA_PLANTILLA_DEFAULT)
    .replace(/\{(arrendador|propiedad|ciudad|precio)\}/g, (_, k) => vars[k])
    .replace(/Hola\s+👋/, 'Hola 👋')   // sin nombre del arrendador no queda "Hola  👋"
    .trim();
}

// Chat directo con el arrendador de la propiedad; si no registró WhatsApp, con soporte.
// { href, directo } — directo=false indica que el enlace va a soporte
export function waPropiedad(prop) {
  const texto   = waMensajePropiedad(prop);
  const directo = waLink(prop?.contacto?.telefono, texto);
  return { href: directo || waLink(WHATSAPP_SOPORTE, texto), directo: !!directo };
}

// ── Videos (YouTube) ─────────────────────────────────────────
// Acepta watch?v=, youtu.be/, shorts/, live/, embed/ y youtube-nocookie; devuelve el ID o null
export function youtubeId(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  let u;
  try { u = new URL(url.trim()); } catch { return null; }
  const host  = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
  const parts = u.pathname.split('/').filter(Boolean);
  let id = null;
  if (host === 'youtu.be') id = parts[0] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch')                                    id = u.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1] ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

// "1m30s" | "90s" | "90" → 90
function segundos(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m ? (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) : 0;
}

// https://www.youtube.com/embed/ID[?start=N]; null si no es un enlace de YouTube
export function youtubeEmbedUrl(url) {
  const id = youtubeId(url);
  if (!id) return null;
  let start = 0;
  try { const u = new URL(url.trim()); start = segundos(u.searchParams.get('t') ?? u.searchParams.get('start')); } catch { /* sin inicio */ }
  return `https://www.youtube.com/embed/${id}` + (start ? `?start=${start}` : '');
}

// URL para el <iframe> del video: YouTube limpio o, si es otro proveedor, la URL http(s) tal cual
export function videoEmbedUrl(url) {
  return youtubeEmbedUrl(url) || safeUrl(url);
}

// ── Formateadores numéricos (es-CO: miles con punto, decimales con coma) ──
export function formatNum(value, decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

// $1.800.000 (los pesos no llevan decimales)
export function formatCOP(amount) {
  return '$' + formatNum(Math.round(Number(amount) || 0));
}

// $1,8 M · $950 mil · $1.250 M
export function formatShort(amount) {
  const n = Number(amount) || 0;
  if (Math.abs(n) >= 1_000_000) return '$' + formatNum(n / 1_000_000, 1) + ' M';
  if (Math.abs(n) >= 1_000)     return '$' + formatNum(n / 1_000) + ' mil';
  return formatCOP(n);
}

// Convierte "1.800.000" o "1800000" a número entero
export function parseCOP(text) {
  const n = parseInt(String(text ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : NaN;
}

// "2025-03-05" o ISO → "05 mar 2025"
export function formatFecha(value) {
  if (!value) return '';
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ de /g, ' ');
}

// ── Helpers de texto ─────────────────────────────────────────
export function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}

// ── Helper DOM: obtener elemento por ID ─────────────────────
export function getEl(id) {
  return document.getElementById(id);
}

// ── Scroll suave a sección ───────────────────────────────────
export function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ── Ciudades (Colombia + principales de Latinoamérica) ───────
// La clave es el nombre en minúsculas (así se guarda en el backend). Cualquier otra ciudad o
// municipio se puede escribir a mano: se guarda igual, en minúsculas.
export const CIUDADES = [
  ['Bogotá','Colombia'], ['Medellín','Colombia'], ['Cali','Colombia'], ['Barranquilla','Colombia'],
  ['Cartagena','Colombia'], ['Bucaramanga','Colombia'], ['Pereira','Colombia'], ['Manizales','Colombia'],
  ['Santa Marta','Colombia'], ['Cúcuta','Colombia'], ['Ibagué','Colombia'], ['Villavicencio','Colombia'],
  ['Pasto','Colombia'], ['Armenia','Colombia'], ['Chía','Colombia'], ['Envigado','Colombia'],
  ['Ciudad de México','México'], ['Guadalajara','México'], ['Monterrey','México'], ['Cancún','México'],
  ['Puebla','México'], ['Mérida','México'], ['Querétaro','México'], ['Tijuana','México'],
  ['Buenos Aires','Argentina'], ['Córdoba','Argentina'], ['Rosario','Argentina'], ['Mendoza','Argentina'],
  ['Lima','Perú'], ['Arequipa','Perú'], ['Cusco','Perú'], ['Trujillo','Perú'],
  ['Santiago','Chile'], ['Valparaíso','Chile'], ['Viña del Mar','Chile'], ['Concepción','Chile'],
  ['Quito','Ecuador'], ['Guayaquil','Ecuador'], ['Cuenca','Ecuador'],
  ['Caracas','Venezuela'], ['Maracaibo','Venezuela'], ['Valencia','Venezuela'],
  ['La Paz','Bolivia'], ['Santa Cruz de la Sierra','Bolivia'], ['Asunción','Paraguay'], ['Montevideo','Uruguay'],
  ['São Paulo','Brasil'], ['Río de Janeiro','Brasil'], ['Brasilia','Brasil'],
  ['San José','Costa Rica'], ['Ciudad de Panamá','Panamá'], ['San Salvador','El Salvador'],
  ['Ciudad de Guatemala','Guatemala'], ['Tegucigalpa','Honduras'], ['Managua','Nicaragua'],
  ['Santo Domingo','República Dominicana'], ['Punta Cana','República Dominicana'],
  ['San Juan','Puerto Rico'], ['La Habana','Cuba'],
].map(([label, pais]) => ({ key: label.toLocaleLowerCase('es'), label, pais }));

export const CITY_LABELS = Object.fromEntries(CIUDADES.map(c => [c.key, c.label]));

// Comparación sin tildes ni mayúsculas: "bogota" encuentra "Bogotá"
const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

// Texto escrito por el usuario → clave guardada. Si coincide con una ciudad conocida usa su clave
// (también si escribieron "Lima, Perú"); si no, la ciudad tal cual en minúsculas
export function cityKey(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const n = sinTildes(t);
  const c = CIUDADES.find(x => sinTildes(x.label) === n || sinTildes(`${x.label}, ${x.pais}`) === n);
  return c ? c.key : t.toLocaleLowerCase('es');
}

// Clave → nombre para mostrar ("ciudad de méxico" → "Ciudad de México"; desconocida → Cada Palabra)
export function cityLabel(key) {
  if (!key) return '';
  return CITY_LABELS[key] ?? String(key).replace(/(^|[\s-])(\p{L})/gu, (m, sep, l) => sep + l.toLocaleUpperCase('es'));
}

// <datalist> para autocompletar: sugiere las ciudades conocidas, pero se puede escribir cualquiera
export function citiesDatalistHtml(id) {
  return `<datalist id="${id}">${CIUDADES.map(c => `<option value="${sanitize(c.label)}">${sanitize(c.pais)}</option>`).join('')}</datalist>`;
}

export const AMENITY_LABELS = {
  piscina:    '🏊 Piscina',
  gimnasio:   '💪 Gimnasio',
  parqueadero:'🚗 Parqueadero',
  terraza:    '🌿 Terraza',
  balcon:     '🪟 Balcón',
  mascotas:   '🐾 Mascotas',
  amoblado:   '🛏️ Amoblado',
};

// Accesos rápidos de Explorar (?estilo=…; el backend define qué cuenta como cada uno)
export const ESTILOS_VIDA = [
  { id: 'mascotas',    ico: '🐾', lbl: 'Acepta mascotas',        sub: 'Perros y gatos bienvenidos' },
  { id: 'balcon',      ico: '🪟', lbl: 'Con balcón',             sub: 'Balcón o terraza propia' },
  { id: 'parqueadero', ico: '🚗', lbl: 'Parqueadero incluido',   sub: 'Al menos un cupo' },
  { id: 'amoblado',    ico: '🛋️', lbl: 'Amoblado',               sub: 'Listo para mudarse' },
];

// ── Costo mensual estimado (canon + administración + servicios) ──
// Servicios públicos (agua, energía, gas) de referencia para ~70 m², por estrato.
// Son valores orientativos: la ficha los muestra como "estimado" si el arrendador no los informó.
const SERVICIOS_POR_ESTRATO = { 1: 90000, 2: 130000, 3: 190000, 4: 260000, 5: 340000, 6: 420000 };

export function estimarServicios(estrato, metros) {
  const base   = SERVICIOS_POR_ESTRATO[estrato] || SERVICIOS_POR_ESTRATO[3];
  const factor = Math.min(1.6, Math.max(0.7, (Number(metros) || 70) / 70));
  return Math.round(base * factor / 10000) * 10000;
}

// null si no aplica (venta). admin null = no informada (no se inventa)
export function desgloseMensual(prop) {
  if (!prop || prop.listing === 'sale') return null;
  const canon     = Number(prop.precio) || 0;
  const admin     = prop.administracion ?? null;
  const servEst   = prop.serviciosEst == null;
  const servicios = servEst ? estimarServicios(prop.estrato, prop.metros) : prop.serviciosEst;
  return { canon, admin, servicios, servEst, total: canon + (admin || 0) + servicios };
}

export const LISTING_LABELS = {
  rent:      'Arriendo',
  sale:      'Venta',
  rent_sale: 'Arr/Venta',
  vacation:  'Vacacional',
};

export const PLAN_COLORS = {
  free:         '#94a3b8',
  starter:      '#0f9d58',
  professional: '#1e3a8a',
  enterprise:   '#7c3aed',
  inquilino_vip:'#b45309',
};

// ── Pass VIP del inquilino ───────────────────────────────────
export const PLAN_VIP = 'inquilino_vip';
export function esVip(user) { return user?.rol === 'inquilino' && user?.plan === PLAN_VIP; }

// Estado de la propiedad (cierre de arriendo / compra)
export const ESTADO_PROP = {
  disponible: { lbl: 'Disponible', cls: 'b-ok' },
  reservada:  { lbl: 'Cierre pendiente', cls: 'b-w' },
  arrendada:  { lbl: 'Arrendada', cls: 'b-i' },
  vendida:    { lbl: 'Vendida', cls: 'b-i' },
};
