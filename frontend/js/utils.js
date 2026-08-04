/**
 * utils.js — Funciones utilitarias globales
 * Formateadores, helpers DOM, sanitizador XSS básico
 */

'use strict';

// ── Sanitizador XSS básico ───────────────────────────────────
// En producción: reemplazar con DOMPurify
export function sanitize(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

// ── Formateadores de moneda ──────────────────────────────────
export function formatCOP(amount) {
  return '$' + Number(amount).toLocaleString('es-CO');
}

export function formatShort(amount) {
  if (amount >= 1_000_000) {
    return '$' + (amount / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  }
  return '$' + (amount / 1_000).toFixed(0) + 'k';
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
  mascotas:   '🐾 Mascotas',
  amoblado:   '🛏️ Amoblado',
};

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
