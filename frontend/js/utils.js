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

// "+57 310 555 0101", "3105550101" → "573105550101"; '' si no es un número válido
export function waNumber(phone) {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (/^3\d{9}$/.test(d)) return '57' + d;          // celular colombiano sin indicativo
  return d.length >= 11 && d.length <= 15 ? d : '';  // ya trae indicativo de país
}

export function waLink(phone, text) {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : '';
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

// ── Labels de datos ──────────────────────────────────────────
export const CITY_LABELS = {
  bogotá:      'Bogotá',
  medellín:    'Medellín',
  cali:        'Cali',
  barranquilla:'Barranquilla',
  cartagena:   'Cartagena',
};

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
};
