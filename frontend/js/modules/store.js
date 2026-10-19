/**
 * store.js — Estado en memoria (caché) + llamadas a la API
 */
'use strict';

import {
    AuthApi, PropiedadesApi, VisitasApi, MensajesApi, LeadsApi,
    PagosApi, FavoritosApi, EstadisticasApi, SuscripcionesApi, setTokens, clearTokens
} from '../api.js';

export const State = { session: null, props: [], myProps: [], visitas: [], mensajes: [], leads: [], pagos: [], favIds: [] };

// Auth
export async function login(email, pass) { const r = await AuthApi.login({ email, password: pass }); if (!r?.ok) return null; setTokens(r.data.access_token, r.data.refresh_token); State.session = r.data.user; return r.data.user; }
export async function register(data) { const { pass, ...rest } = data; const r = await AuthApi.register({ ...rest, password: pass }); if (!r?.ok) return { error: r?.error?.message || 'No se pudo crear la cuenta' }; setTokens(r.data.access_token, r.data.refresh_token); State.session = r.data.user; return { user: r.data.user }; }
export async function logout() { await AuthApi.logout(localStorage.getItem('refresh_token')).catch(() => null); clearTokens(); State.session = null; State.props = []; State.myProps = []; State.favIds = []; }
export async function loadMe() { const r = await AuthApi.me(); if (r?.ok) { State.session = r.data; return r.data; } return null; }
export async function loginGoogle(idToken, mode) {
    const r = await AuthApi.google(idToken, mode);
    if (!r?.ok) return { error: r?.error?.message || 'No se pudo iniciar sesión con Google' };
    setTokens(r.data.access_token, r.data.refresh_token);
    State.session = r.data.user;
    return { user: r.data.user, needsProfile: r.data.needsProfile };
} export async function completeProfile(dto) { const r = await AuthApi.completeProfile(dto); if (!r?.ok) return null; State.session = r.data; return r.data; }
// Propiedades
// page > 1 agrega a la caché ("Cargar más"); error distingue un fallo de la API de "sin resultados"
export async function getAllProps(p = {}) {
    const r = await PropiedadesApi.findAll(p);
    if (!r?.ok) return { data: [], meta: {}, error: r?.error?.message || 'No se pudieron cargar las propiedades' };
    State.props = Number(p.page) > 1 ? [...State.props, ...r.data] : r.data;
    return { data: r.data, meta: r.meta ?? {} };
}
export async function getMyProps() { const r = await PropiedadesApi.findMias(); if (r?.ok) { State.myProps = r.data; return r.data; } return []; }
export async function getPropById(id) { const c = [...State.props, ...State.myProps].find(p => p.id === id); if (c) return c; const r = await PropiedadesApi.findOne(id); return r?.ok ? r.data : null; }
export async function addProp(dto) { const r = await PropiedadesApi.create(dto); if (r?.ok) { State.myProps.unshift(r.data); return r.data; } throw new Error(r?.error?.message ?? 'Error'); }
export async function updateProp(id, dto) { const r = await PropiedadesApi.update(id, dto); if (r?.ok) { const i = State.myProps.findIndex(p => p.id === id); if (i !== -1) State.myProps[i] = r.data; return r.data; } throw new Error(r?.error?.message ?? 'Error'); }
export async function deleteProp(id) { const r = await PropiedadesApi.remove(id); if (r?.ok) State.myProps = State.myProps.filter(p => p.id !== id); return r?.ok ?? false; }

// Favoritos
export async function loadFavs() { const r = await FavoritosApi.findAll(); if (r?.ok) { State.favIds = r.data.map(p => p.id); return r.data; } return []; }
export async function toggleFav(pid) { const r = await FavoritosApi.toggle(pid); if (r?.ok) { if (r.data.is_fav) { if (!State.favIds.includes(pid)) State.favIds.push(pid); } else { State.favIds = State.favIds.filter(i => i !== pid); } return r.data.is_fav; } return false; }
export function isFav(pid) { return State.favIds.includes(pid); }
export async function getFavProps() { const r = await FavoritosApi.findAll(); return r?.ok ? r.data : []; }

// Devuelve r.data o lanza el mensaje de error del backend
function unwrap(r) { if (r?.ok) return r.data; throw new Error(r?.error?.message ?? 'Error'); }
function replaceIn(list, item) { const i = list.findIndex(x => x.id === item.id); if (i !== -1) list[i] = item; }

// Visitas
export async function getMyVisitas(e) { const r = await VisitasApi.findAll(e); if (r?.ok) { State.visitas = r.data; return r.data; } return []; }
export async function addVisita(dto) { const v = unwrap(await VisitasApi.createManual(dto)); State.visitas.unshift(v); return v; }
export async function solicitarVisita(dto) { return unwrap(await VisitasApi.create(dto)); }
export async function updateVisita(id, dto) { const v = unwrap(await VisitasApi.update(id, dto)); replaceIn(State.visitas, v); return v; }
export async function updateVisitaEstado(id, e) { const v = unwrap(await VisitasApi.updateEstado(id, e)); replaceIn(State.visitas, v); return v; }
export async function deleteVisita(id) { unwrap(await VisitasApi.remove(id)); State.visitas = State.visitas.filter(v => v.id !== id); }

// Pagos
export async function getMyPagos() { const r = State.session?.rol === 'inquilino' ? await PagosApi.findMios() : await PagosApi.findAll(); if (r?.ok) { State.pagos = r.data; return r.data; } return []; }
export async function addPago(dto) { const p = unwrap(await PagosApi.create(dto)); State.pagos.unshift(p); return p; }
export async function updatePago(id, dto) { const p = unwrap(await PagosApi.update(id, dto)); replaceIn(State.pagos, p); return p; }
export async function deletePago(id) { unwrap(await PagosApi.remove(id)); State.pagos = State.pagos.filter(p => p.id !== id); }
export async function markPagoAsPaid(id) { const r = await PagosApi.updateEstado(id, 'pagado'); if (r?.ok) { const p = State.pagos.find(p => p.id === id); if (p) p.estado = 'pagado'; } return r?.ok; }

// Mensajes (conversaciones agrupadas por usuario)
export async function getMensajes() { const r = await MensajesApi.findAll(); if (r?.ok) { State.mensajes = r.data; return r.data; } return []; }
export async function getUnreadCount() { const r = await MensajesApi.unreadCount(); return r?.data?.count ?? 0; }

// Leads
export async function getLeads() { const r = await LeadsApi.findAll(); if (r?.ok) { State.leads = r.data; return r.data; } return []; }
export async function addLead(dto) { const l = unwrap(await LeadsApi.create(dto)); State.leads.unshift(l); return l; }
export async function updateLead(id, dto) { const l = unwrap(await LeadsApi.update(id, dto)); replaceIn(State.leads, l); return l; }
export async function deleteLead(id) { unwrap(await LeadsApi.remove(id)); State.leads = State.leads.filter(l => l.id !== id); }

// KPIs
export async function getKPIs() { const r = await EstadisticasApi.kpis(); return r?.data ?? { props_activas: 0, visitas_total: 0, ingresos_mes: 0, mensajes_nuevos: 0, leads_activos: 0 }; }

// Suscripciones / planes
export async function getPlanes() { const r = await SuscripcionesApi.planes(); return r?.ok ? r.data : []; }
export async function getMiPlan() { const r = await SuscripcionesApi.miPlan(); return r?.ok ? r.data : null; }
export async function suscribirse(planId, metodo) { const d = unwrap(await SuscripcionesApi.suscribirse(planId, metodo)); if (State.session) State.session.plan = d.plan_activado ?? planId; return d; }
export async function cancelarPlan() { unwrap(await SuscripcionesApi.cancelar()); if (State.session) State.session.plan = 'free'; }
