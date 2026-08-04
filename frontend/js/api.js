/**
 * api.js — Cliente HTTP centralizado
 * Conecta todos los módulos del frontend con el backend NestJS
 */

'use strict';

const BASE_URL = 'http://localhost:3000/v1';

// ── Token helpers ─────────────────────────────────────────────
export function getToken()              { return localStorage.getItem('access_token'); }
export function setTokens(at, rt)       { localStorage.setItem('access_token', at); if (rt) localStorage.setItem('refresh_token', rt); }
export function clearTokens()           { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); }

// ── Core fetch ────────────────────────────────────────────────
export async function apiFetch(method, path, body = null, retry = true) {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : null,
  });

  // Token expirado → intentar refresh automático una vez
  if (res.status === 401 && retry) {
    const refreshed = await doRefresh();
    if (refreshed) return apiFetch(method, path, body, false);
    clearTokens();
    window.location.reload();
    return null;
  }

  const json = await res.json().catch(() => ({ ok: false, error: { message: 'Error de red' } }));
  return json;
}

async function doRefresh() {
  const rt = localStorage.getItem('refresh_token');
  if (!rt) return false;
  try {
    const res  = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) });
    const json = await res.json();
    if (json?.data?.access_token) { setTokens(json.data.access_token, json.data.refresh_token); return true; }
    return false;
  } catch { return false; }
}

// ── Upload (multipart) ────────────────────────────────────────
export async function apiUpload(path, formData) {
  const token = getToken();
  const res   = await fetch(`${BASE_URL}${path}`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    formData,
  });
  return res.json();
}

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
export const AuthApi = {
  register: (dto)  => apiFetch('POST', '/auth/register', dto),
  login:    (dto)  => apiFetch('POST', '/auth/login',    dto),
  refresh:  (rt)   => apiFetch('POST', '/auth/refresh',  { refresh_token: rt }),
  logout:   (rt)   => apiFetch('POST', '/auth/logout',   { refresh_token: rt }),
  me:       ()     => apiFetch('GET',  '/auth/me'),
  forgot:   (email)=> apiFetch('POST', '/auth/forgot-password', { email }),
};

// ══════════════════════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════════════════════
export const UsuariosApi = {
  updateMe:        (data)             => apiFetch('PATCH',  '/usuarios/me',          data),
  changePassword:  (actual, nuevo)    => apiFetch('PATCH',  '/usuarios/me/password', { password_actual: actual, password_nuevo: nuevo }),
  deleteMe:        ()                 => apiFetch('DELETE', '/usuarios/me'),
};

// ══════════════════════════════════════════════════════════════
// PROPIEDADES
// ══════════════════════════════════════════════════════════════
export const PropiedadesApi = {
  findAll:  (params = {}) => apiFetch('GET', '/propiedades?' + new URLSearchParams(params).toString()),
  findOne:  (id)          => apiFetch('GET', `/propiedades/${id}`),
  findMias: ()            => apiFetch('GET', '/propiedades/mias'),
  create:   (dto)         => apiFetch('POST',   '/propiedades',    dto),
  update:   (id, dto)     => apiFetch('PATCH',  `/propiedades/${id}`, dto),
  remove:   (id)          => apiFetch('DELETE', `/propiedades/${id}`),

  // Fotos
  uploadFotos:    (id, files)  => { const fd = new FormData(); files.forEach(f => fd.append('fotos', f)); return apiUpload(`/propiedades/${id}/fotos`, fd); },
  removeFoto:     (id, index)  => apiFetch('DELETE', `/propiedades/${id}/fotos/${index}`),
  reorderFotos:   (id, orden)  => apiFetch('PATCH',  `/propiedades/${id}/fotos/orden`, { orden }),
};

// ══════════════════════════════════════════════════════════════
// VISITAS
// ══════════════════════════════════════════════════════════════
export const VisitasApi = {
  findAll:      (estado)       => apiFetch('GET',    '/visitas' + (estado ? `?estado=${estado}` : '')),
  findMias:     ()             => apiFetch('GET',    '/visitas/mias'),
  create:       (dto)          => apiFetch('POST',   '/visitas',              dto),
  createManual: (dto)          => apiFetch('POST',   '/visitas/manual',       dto),
  updateEstado: (id, estado)   => apiFetch('PATCH',  `/visitas/${id}/estado`, { estado }),
  remove:       (id)           => apiFetch('DELETE', `/visitas/${id}`),
};

// ══════════════════════════════════════════════════════════════
// MENSAJES
// ══════════════════════════════════════════════════════════════
export const MensajesApi = {
  findAll:     ()              => apiFetch('GET',   '/mensajes'),
  getHilo:     (propId)        => apiFetch('GET',   `/mensajes/hilo/${propId}`),
  send:        (dto)           => apiFetch('POST',  '/mensajes', dto),
  markRead:    (id)            => apiFetch('PATCH', `/mensajes/${id}/leido`),
  unreadCount: ()              => apiFetch('GET',   '/mensajes/unread-count'),
};

// ══════════════════════════════════════════════════════════════
// LEADS
// ══════════════════════════════════════════════════════════════
export const LeadsApi = {
  findAll: (estado)       => apiFetch('GET',    '/leads' + (estado ? `?estado=${estado}` : '')),
  create:  (dto)          => apiFetch('POST',   '/leads',       dto),
  update:  (id, dto)      => apiFetch('PATCH',  `/leads/${id}`, dto),
  remove:  (id)           => apiFetch('DELETE', `/leads/${id}`),
};

// ══════════════════════════════════════════════════════════════
// PAGOS
// ══════════════════════════════════════════════════════════════
export const PagosApi = {
  findAll:      (estado)   => apiFetch('GET',   '/pagos' + (estado ? `?estado=${estado}` : '')),
  findMios:     ()         => apiFetch('GET',   '/pagos/mios'),
  create:       (dto)      => apiFetch('POST',  '/pagos',              dto),
  updateEstado: (id, est)  => apiFetch('PATCH', `/pagos/${id}/estado`, { estado: est }),
  iniciarWompi: (dto)      => apiFetch('POST',  '/pagos/wompi/iniciar', dto),
};

// ══════════════════════════════════════════════════════════════
// FAVORITOS
// ══════════════════════════════════════════════════════════════
export const FavoritosApi = {
  findAll: ()       => apiFetch('GET',    '/favoritos'),
  toggle:  (propId) => apiFetch('POST',   '/favoritos',          { prop_id: propId }),
  check:   (propId) => apiFetch('GET',    `/favoritos/${propId}/check`),
  remove:  (propId) => apiFetch('DELETE', `/favoritos/${propId}`),
};

// ══════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════════════════════════════
export const EstadisticasApi = {
  kpis:      ()        => apiFetch('GET', '/estadisticas/kpis'),
  porTipo:   ()        => apiFetch('GET', '/estadisticas/por-tipo'),
  porCiudad: ()        => apiFetch('GET', '/estadisticas/por-ciudad'),
  ingresos:  (meses=6) => apiFetch('GET', `/estadisticas/ingresos?meses=${meses}`),
};

// ══════════════════════════════════════════════════════════════
// SUSCRIPCIONES
// ══════════════════════════════════════════════════════════════
export const SuscripcionesApi = {
  planes:       ()               => apiFetch('GET',    '/suscripciones/planes'),
  miPlan:       ()               => apiFetch('GET',    '/suscripciones/mi-plan'),
  suscribirse:  (planId, metodo) => apiFetch('POST',   '/suscripciones', { plan_id: planId, metodo }),
  cancelar:     ()               => apiFetch('DELETE', '/suscripciones/mi-plan'),
};
