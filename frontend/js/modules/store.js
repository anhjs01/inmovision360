/**
 * store.js — Estado en memoria (caché) + llamadas a la API
 */
'use strict';

import { AuthApi, PropiedadesApi, VisitasApi, MensajesApi, LeadsApi,
         PagosApi, FavoritosApi, EstadisticasApi, setTokens, clearTokens } from '../api.js';

export const State = { session: null, props: [], myProps: [], visitas: [], mensajes: [], leads: [], pagos: [], favIds: [] };

// Auth
export async function login(email, pass)  { const r = await AuthApi.login({ email, password: pass }); if (!r?.ok) return null; setTokens(r.data.access_token, r.data.refresh_token); State.session = r.data.user; return r.data.user; }
export async function register(data)      { const r = await AuthApi.register({ ...data, password: data.pass }); if (!r?.ok) return null; setTokens(r.data.access_token, r.data.refresh_token); State.session = r.data.user; return r.data.user; }
export async function logout()            { await AuthApi.logout(localStorage.getItem('refresh_token')).catch(()=>null); clearTokens(); State.session = null; State.props = []; State.myProps = []; State.favIds = []; }
export async function loadMe()            { const r = await AuthApi.me(); if (r?.ok) { State.session = r.data; return r.data; } return null; }

// Propiedades
export async function getAllProps(p={})   { const r = await PropiedadesApi.findAll(p); if (r?.ok) { State.props = r.data; return { data: r.data, meta: r.meta }; } return { data: [], meta: {} }; }
export async function getMyProps()       { const r = await PropiedadesApi.findMias(); if (r?.ok) { State.myProps = r.data; return r.data; } return []; }
export async function getPropById(id)    { const c = [...State.props,...State.myProps].find(p=>p.id===id); if (c) return c; const r = await PropiedadesApi.findOne(id); return r?.ok ? r.data : null; }
export async function addProp(dto)       { const r = await PropiedadesApi.create(dto); if (r?.ok) { State.myProps.unshift(r.data); return r.data; } throw new Error(r?.error?.message ?? 'Error'); }
export async function updateProp(id,dto) { const r = await PropiedadesApi.update(id,dto); if (r?.ok) { const i=State.myProps.findIndex(p=>p.id===id); if(i!==-1) State.myProps[i]=r.data; return r.data; } throw new Error(r?.error?.message ?? 'Error'); }
export async function deleteProp(id)     { const r = await PropiedadesApi.remove(id); if (r?.ok) State.myProps = State.myProps.filter(p=>p.id!==id); return r?.ok??false; }

// Favoritos
export async function loadFavs()         { const r = await FavoritosApi.findAll(); if (r?.ok) { State.favIds = r.data.map(p=>p.id); return r.data; } return []; }
export async function toggleFav(pid)     { const r = await FavoritosApi.toggle(pid); if (r?.ok) { if(r.data.is_fav){if(!State.favIds.includes(pid))State.favIds.push(pid);}else{State.favIds=State.favIds.filter(i=>i!==pid);} return r.data.is_fav; } return false; }
export function isFav(pid)               { return State.favIds.includes(pid); }
export async function getFavProps()      { const r = await FavoritosApi.findAll(); return r?.ok ? r.data : []; }

// Visitas
export async function getMyVisitas(e)    { const r = await VisitasApi.findAll(e); if (r?.ok) { State.visitas = r.data; return r.data; } return []; }
export async function addVisita(dto)     { const r = await VisitasApi.createManual(dto); if (r?.ok) { State.visitas.unshift(r.data); return r.data; } throw new Error(r?.error?.message??'Error'); }
export async function updateVisitaEstado(id,e){ const r = await VisitasApi.updateEstado(id,e); if(r?.ok){const v=State.visitas.find(v=>v.id===id);if(v)v.estado=e;} return r?.data??null; }

// Pagos
export async function getMyPagos()       { const r = State.session?.rol==='inquilino' ? await PagosApi.findMios() : await PagosApi.findAll(); if(r?.ok){State.pagos=r.data;return r.data;} return []; }
export async function markPagoAsPaid(id) { const r = await PagosApi.updateEstado(id,'pagado'); if(r?.ok){const p=State.pagos.find(p=>p.id===id);if(p)p.estado='pagado';} return r?.ok; }

// Mensajes
export async function getMensajes()      { const r = await MensajesApi.findAll(); if(r?.ok){State.mensajes=r.data;return r.data;} return []; }
export async function getUnreadCount()   { const r = await MensajesApi.unreadCount(); return r?.data?.count??0; }
export async function markMensajeRead(id){ await MensajesApi.markRead(id); const m=State.mensajes.find(m=>m.id===id); if(m)m.leido=true; }

// Leads
export async function getLeads()         { const r = await LeadsApi.findAll(); if(r?.ok){State.leads=r.data;return r.data;} return []; }
export async function addLead(dto)       { const r = await LeadsApi.create(dto); if(r?.ok){State.leads.unshift(r.data);return r.data;} throw new Error(r?.error?.message??'Error'); }

// KPIs
export async function getKPIs()          { const r = await EstadisticasApi.kpis(); return r?.data ?? { props_activas:0, visitas_total:0, ingresos_mes:0, mensajes_nuevos:0, leads_activos:0 }; }
