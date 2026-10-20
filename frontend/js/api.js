/**
 * api.js — Cliente HTTP centralizado
 * Conecta todos los módulos del frontend con el backend NestJS
 */

'use strict';

const BASE_URL = 'http://localhost:3000/v1';

// ── Token helpers ─────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem('access_token');
}

export function setTokens(at, rt) {
  localStorage.setItem('access_token', at);

  if (rt) {
    localStorage.setItem('refresh_token', rt);
  }
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// ── Core fetch ────────────────────────────────────────────────
export async function apiFetch(
  method,
  path,
  body = null,
  retry = true
) {
  const token = getToken();

  const isAuthCall =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/google');

  const res = await fetch(
    `${BASE_URL}${path}`,
    {
      method,

      headers: {
        'Content-Type': 'application/json',

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },

      body: body
        ? JSON.stringify(body)
        : null,
    }
  );

  if (
    res.status === 401 &&
    retry &&
    !isAuthCall
  ) {
    const refreshed = await doRefresh();

    if (refreshed) {
      return apiFetch(
        method,
        path,
        body,
        false
      );
    }

    clearTokens();

    window.location.reload();

    return null;
  }

  const json = await res
    .json()
    .catch(() => ({
      ok: false,
      error: {
        message: 'Error de red',
      },
    }));

  return json;
}

async function doRefresh() {
  const rt =
    localStorage.getItem('refresh_token');

  if (!rt) {
    return false;
  }

  try {
    const res = await fetch(
      `${BASE_URL}/auth/refresh`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          refresh_token: rt,
        }),
      }
    );

    const json = await res.json();

    if (
      json?.data?.access_token
    ) {
      setTokens(
        json.data.access_token,
        json.data.refresh_token
      );

      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ── Upload (multipart) ────────────────────────────────────────
// No se fija Content-Type: el navegador agrega el boundary de multipart/form-data
export async function apiUpload(
  path,
  formData,
  retry = true
) {
  const token = getToken();

  const res = await fetch(
    `${BASE_URL}${path}`,
    {
      method: 'POST',

      headers: token
        ? {
            Authorization:
              `Bearer ${token}`,
          }
        : {},

      body: formData,
    }
  );

  if (res.status === 401 && retry && await doRefresh()) {
    return apiUpload(path, formData, false);
  }

  return res
    .json()
    .catch(() => ({
      ok: false,
      error: {
        message: 'Error de red',
      },
    }));
}

// ── Descarga de archivos privados (comprobantes) ──────────────
// Devuelve { ok, blob } o { ok:false, error }; los archivos privados necesitan el token
export async function apiBlob(path, retry = true) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401 && retry && await doRefresh()) {
    return apiBlob(path, false);
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    return { ok: false, error: json?.error || { message: 'No se pudo descargar el archivo' } };
  }

  return { ok: true, blob: await res.blob() };
}

// ── URLs de archivos subidos ──────────────────────────────────
// El backend guarda rutas relativas (/uploads/…); el frontend corre en otro
// origen (Live Server :5500), así que hay que anteponer el origen de la API.
const API_ORIGIN = new URL(BASE_URL).origin;

export function mediaUrl(src) {
  if (!src) return '';
  return src.startsWith('/uploads/') ? API_ORIGIN + src : src;
}

// AUTH
export const AuthApi = {
  register: (dto) =>
    apiFetch(
      'POST',
      '/auth/register',
      dto
    ),

  login: (dto) =>
    apiFetch(
      'POST',
      '/auth/login',
      dto
    ),

  google: (idToken, mode) =>
    apiFetch(
      'POST',
      '/auth/google',
      {
        idToken,
        mode,
      }
    ),

  completeProfile: (dto) =>
    apiFetch(
      'PATCH',
      '/auth/complete-profile',
      dto
    ),

  refresh: (rt) =>
    apiFetch(
      'POST',
      '/auth/refresh',
      {
        refresh_token: rt,
      }
    ),

  logout: (rt) =>
    apiFetch(
      'POST',
      '/auth/logout',
      {
        refresh_token: rt,
      }
    ),

  me: () =>
    apiFetch(
      'GET',
      '/auth/me'
    ),

  forgot: (email) =>
    apiFetch(
      'POST',
      '/auth/forgot-password',
      {
        email,
      }
    ),
};

// USUARIOS
export const UsuariosApi = {
  updateMe: (data) =>
    apiFetch(
      'PATCH',
      '/usuarios/me',
      data
    ),

  changePassword: (
    actual,
    nuevo
  ) =>
    apiFetch(
      'PATCH',
      '/usuarios/me/password',
      {
        password_actual: actual,
        password_nuevo: nuevo,
      }
    ),

  deleteMe: () =>
    apiFetch(
      'DELETE',
      '/usuarios/me'
    ),
};

// Query string sin claves vacías: URLSearchParams convierte undefined/null en "undefined"/"null"
export function toQuery(params = {}) {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return new URLSearchParams(clean).toString();
}

// PROPIEDADES
export const PropiedadesApi = {
  findAll: (params = {}) =>
    apiFetch(
      'GET',
      '/propiedades?' + toQuery(params)
    ),

  findOne: (id) =>
    apiFetch(
      'GET',
      `/propiedades/${id}`
    ),

  findMias: () =>
    apiFetch(
      'GET',
      '/propiedades/mias'
    ),

  create: (dto) =>
    apiFetch(
      'POST',
      '/propiedades',
      dto
    ),

  update: (id, dto) =>
    apiFetch(
      'PATCH',
      `/propiedades/${id}`,
      dto
    ),

  remove: (id) =>
    apiFetch(
      'DELETE',
      `/propiedades/${id}`
    ),

  uploadFotos: (id, files) => {
    const fd = new FormData();

    files.forEach((f) =>
      fd.append('fotos', f)
    );

    return apiUpload(
      `/propiedades/${id}/fotos`,
      fd
    );
  },

  removeFoto: (id, index) =>
    apiFetch(
      'DELETE',
      `/propiedades/${id}/fotos/${index}`
    ),

  reorderFotos: (id, orden) =>
    apiFetch(
      'PATCH',
      `/propiedades/${id}/fotos/orden`,
      {
        orden,
      }
    ),
};

// VISITAS
export const VisitasApi = {
  findAll: (estado) =>
    apiFetch(
      'GET',
      '/visitas' +
        (estado
          ? `?estado=${estado}`
          : '')
    ),

  findMias: () =>
    apiFetch(
      'GET',
      '/visitas/mias'
    ),

  create: (dto) =>
    apiFetch(
      'POST',
      '/visitas',
      dto
    ),

  createManual: (dto) =>
    apiFetch(
      'POST',
      '/visitas/manual',
      dto
    ),

  updateEstado: (
    id,
    estado
  ) =>
    apiFetch(
      'PATCH',
      `/visitas/${id}/estado`,
      {
        estado,
      }
    ),

  update: (id, dto) =>
    apiFetch(
      'PATCH',
      `/visitas/${id}`,
      dto
    ),

  remove: (id) =>
    apiFetch(
      'DELETE',
      `/visitas/${id}`
    ),
};

// MENSAJES
export const MensajesApi = {
  findAll: () =>
    apiFetch(
      'GET',
      '/mensajes'
    ),

  getHilo: (propId) =>
    apiFetch(
      'GET',
      `/mensajes/hilo/${propId}`
    ),

  getConversacion: (userId) =>
    apiFetch(
      'GET',
      `/mensajes/conversacion/${userId}`
    ),

  send: (dto) =>
    apiFetch(
      'POST',
      '/mensajes',
      dto
    ),

  markRead: (id) =>
    apiFetch(
      'PATCH',
      `/mensajes/${id}/leido`
    ),

  markConversationRead: (userId) =>
    apiFetch(
      'PATCH',
      `/mensajes/conversacion/${userId}/leidos`
    ),

  unreadCount: () =>
    apiFetch(
      'GET',
      '/mensajes/unread-count'
    ),
};

// LEADS
export const LeadsApi = {
  findAll: (estado) =>
    apiFetch(
      'GET',
      '/leads' +
        (estado
          ? `?estado=${estado}`
          : '')
    ),

  create: (dto) =>
    apiFetch(
      'POST',
      '/leads',
      dto
    ),

  update: (id, dto) =>
    apiFetch(
      'PATCH',
      `/leads/${id}`,
      dto
    ),

  remove: (id) =>
    apiFetch(
      'DELETE',
      `/leads/${id}`
    ),
};

// PAGOS
export const PagosApi = {
  findAll: (estado) =>
    apiFetch(
      'GET',
      '/pagos' +
        (estado
          ? `?estado=${estado}`
          : '')
    ),

  findMios: () =>
    apiFetch(
      'GET',
      '/pagos/mios'
    ),

  create: (dto) =>
    apiFetch(
      'POST',
      '/pagos',
      dto
    ),

  updateEstado: (
    id,
    est
  ) =>
    apiFetch(
      'PATCH',
      `/pagos/${id}/estado`,
      {
        estado: est,
      }
    ),

  update: (id, dto) =>
    apiFetch(
      'PATCH',
      `/pagos/${id}`,
      dto
    ),

  remove: (id) =>
    apiFetch(
      'DELETE',
      `/pagos/${id}`
    ),

  // Inquilino: reporta un pago hecho por fuera de la plataforma
  reportar: (dto) =>
    apiFetch(
      'POST',
      '/pagos/reportar',
      dto
    ),

  subirComprobante: (id, file) => {
    const fd = new FormData();
    fd.append('comprobante', file);
    return apiUpload(`/pagos/${id}/comprobante`, fd);
  },

  quitarComprobante: (id) =>
    apiFetch(
      'DELETE',
      `/pagos/${id}/comprobante`
    ),

  comprobante: (id) =>
    apiBlob(`/pagos/${id}/comprobante`),

  iniciarWompi: (pagoId) =>
    apiFetch(
      'POST',
      '/pagos/wompi/iniciar',
      {
        pago_id: pagoId,
      }
    ),
};

// FAVORITOS
export const FavoritosApi = {
  findAll: () =>
    apiFetch(
      'GET',
      '/favoritos'
    ),

  toggle: (propId) =>
    apiFetch(
      'POST',
      '/favoritos',
      {
        prop_id: propId,
      }
    ),

  check: (propId) =>
    apiFetch(
      'GET',
      `/favoritos/${propId}/check`
    ),

  remove: (propId) =>
    apiFetch(
      'DELETE',
      `/favoritos/${propId}`
    ),
};

// ESTADÍSTICAS
export const EstadisticasApi = {
  kpis: () =>
    apiFetch(
      'GET',
      '/estadisticas/kpis'
    ),

  porTipo: () =>
    apiFetch(
      'GET',
      '/estadisticas/por-tipo'
    ),

  porCiudad: () =>
    apiFetch(
      'GET',
      '/estadisticas/por-ciudad'
    ),

  ingresos: (meses = 6) =>
    apiFetch(
      'GET',
      `/estadisticas/ingresos?meses=${meses}`
    ),
};

// SUSCRIPCIONES
export const SuscripcionesApi = {
  planes: () =>
    apiFetch(
      'GET',
      '/suscripciones/planes'
    ),

  miPlan: () =>
    apiFetch(
      'GET',
      '/suscripciones/mi-plan'
    ),

  suscribirse: (
    planId,
    metodo
  ) =>
    apiFetch(
      'POST',
      '/suscripciones',
      {
        plan_id: planId,
        metodo,
      }
    ),

  cancelar: () =>
    apiFetch(
      'DELETE',
      '/suscripciones/mi-plan'
    ),
};