/**
 * ui.js — Renderizado de vistas conectadas al backend
 */
'use strict';

import { State, getMyProps, getAllProps, getMyVisitas, getMyPagos,
         getKPIs, getLeads, getMensajes, getUnreadCount, markMensajeRead,
         getFavProps, isFav, toggleFav, logout } from './store.js';
import { MensajesApi, EstadisticasApi, UsuariosApi } from '../api.js';
import { formatCOP, formatShort, sanitize, capitalize, getEl,
         CITY_LABELS, AMENITY_LABELS, LISTING_LABELS, PLAN_COLORS } from '../utils.js';

let currentView = '';
let selectedMsg  = null;

const RBAC = {
  arrendador: ['panel','catalogo','mis-props','visitas','mensajes','crm','estadisticas','pagos','suscripcion','configuracion'],
  inquilino:  ['catalogo','favoritos','mis-visitas','mis-pagos','mensajes','configuracion'],
};

const NAV_ARRENDADOR = [
  { sec:'Principal',    items:[{v:'panel',ico:'📊',lbl:'Mi Panel'},{v:'catalogo',ico:'🏘️',lbl:'Catálogo'}] },
  { sec:'Propiedades',  items:[{v:'mis-props',ico:'🏠',lbl:'Mis Propiedades'},{v:'visitas',ico:'📅',lbl:'Visitas',badge:'nb-v'}] },
  { sec:'Gestión',      items:[{v:'mensajes',ico:'💬',lbl:'Mensajes',badge:'nb-m'},{v:'crm',ico:'🎯',lbl:'CRM — Leads'},{v:'estadisticas',ico:'📈',lbl:'Estadísticas'},{v:'pagos',ico:'💳',lbl:'Pagos'}] },
  { sec:'Cuenta',       items:[{v:'suscripcion',ico:'⭐',lbl:'Suscripción'},{v:'configuracion',ico:'⚙️',lbl:'Configuración'}] },
];

const NAV_INQUILINO = [
  { sec:'Explorar',      items:[{v:'catalogo',ico:'🏘️',lbl:'Explorar'},{v:'favoritos',ico:'❤️',lbl:'Favoritos',badge:'nb-fav'}] },
  { sec:'Mis Arriendos', items:[{v:'mis-visitas',ico:'📅',lbl:'Mis Visitas'},{v:'mis-pagos',ico:'💳',lbl:'Mis Pagos'},{v:'mensajes',ico:'💬',lbl:'Mensajes',badge:'nb-m'}] },
  { sec:'Cuenta',        items:[{v:'configuracion',ico:'⚙️',lbl:'Configuración'}] },
];

// ── Toast ──────────────────────────────────────────────────────
export function showToast(msg, type='success', duration=3200) {
  const colors = { success:'#0f9d58', error:'#ef4444', info:'#1e3a8a', warning:'#f59e0b' };
  const icons  = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const wrap   = getEl('toast-wrap');
  if (!wrap) return;
  const toast  = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = colors[type] ?? colors.success;
  toast.innerHTML = '<span style="font-size:16px">' + (icons[type] ?? '') + '</span>' + sanitize(msg);
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity .3s,transform .3s';
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(14px)';
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

// ── Init ───────────────────────────────────────────────────────
export async function initApp(user) {
  buildSidebarNav(user.rol);
  updateSidebarProfile();
  await showView(user.rol === 'arrendador' ? 'panel' : 'catalogo');
  showToast('Bienvenido/a, ' + user.nombre + ' 👋', 'success');
}

function buildSidebarNav(rol) {
  const sections = rol === 'arrendador' ? NAV_ARRENDADOR : NAV_INQUILINO;
  const nav      = getEl('sb-nav');
  const rtag     = getEl('sb-rtag');
  if (!nav) return;
  if (rtag) rtag.textContent = rol === 'arrendador' ? 'Arrendador' : 'Inquilino';
  nav.innerHTML = sections.map(function(s) {
    return '<div class="sb-sec">' + s.sec + '</div>' +
      s.items.map(function(i) {
        return '<div class="ni" data-v="' + i.v + '">' +
          '<span class="ni-ico">' + i.ico + '</span>' +
          '<span>' + i.lbl + '</span>' +
          (i.badge ? '<span class="ni-badge" id="' + i.badge + '">0</span>' : '') +
          '</div>';
      }).join('');
  }).join('');
  nav.querySelectorAll('.ni').forEach(function(item) {
    item.addEventListener('click', function() { showView(item.dataset.v); });
  });
}

export function updateSidebarProfile() {
  const user = State.session;
  if (!user) return;
  const ini  = ((user.nombre ? user.nombre[0] : '') + (user.apellido ? user.apellido[0] : '')).toUpperCase() || 'U';
  const avEl = getEl('sp-av'); const nmEl = getEl('sp-name'); const rlEl = getEl('sp-role');
  if (avEl) avEl.textContent = ini;
  if (nmEl) nmEl.textContent = (user.nombre + ' ' + (user.apellido ?? '')).trim();
  if (rlEl) rlEl.textContent = user.rol === 'arrendador' ? 'Arrendador · ' + capitalize(user.plan ?? 'free') : 'Inquilino';
}

export async function showView(name) {
  const rol = State.session ? State.session.rol : null;
  if (!rol || !RBAC[rol] || !RBAC[rol].includes(name)) { showToast('Sin permiso', 'error'); return; }
  currentView = name;
  document.querySelectorAll('.ni').forEach(function(i) { i.classList.toggle('active', i.dataset.v === name); });
  const mainArea = getEl('main-area');
  if (!mainArea) return;
  mainArea.innerHTML = '<div class="view active" id="view-' + name + '" style="flex:1;overflow-y:auto;display:flex;flex-direction:column"></div>';
  const el = getEl('view-' + name);
  el.innerHTML = '<div style="display:grid;place-items:center;height:200px;color:var(--t3)"><div style="font-size:32px">⏳</div></div>';

  const renderers = {
    panel: renderPanel, 'mis-props': renderMisProps, catalogo: renderCatalogo,
    visitas: renderVisitas, mensajes: renderMensajes, estadisticas: renderEstadisticas,
    pagos: renderPagos, configuracion: renderConfiguracion, crm: renderCRM,
    suscripcion: renderSuscripcion, favoritos: renderFavoritos,
    'mis-visitas': renderMisVisitas, 'mis-pagos': renderMisPagos,
  };
  if (renderers[name]) await renderers[name](el);
  await updateBadges();
}

export async function refreshView() { await showView(currentView); }

export async function updateBadges() {
  const count   = await getUnreadCount();
  const visitas = State.visitas ? State.visitas.filter(function(v) { return v.estado === 'pendiente'; }).length : 0;
  const favs    = State.favIds ? State.favIds.length : 0;
  const vBadge  = getEl('nb-v'); const mBadge = getEl('nb-m'); const fBadge = getEl('nb-fav');
  if (vBadge) vBadge.textContent = visitas || '';
  if (mBadge) mBadge.textContent = count   || '';
  if (fBadge) fBadge.textContent = favs    || '';
}

function kpiCard(ico, bg, label, value, unit) {
  unit = unit || '';
  return '<div class="kpi"><div class="kpi-ico" style="background:' + bg + '">' + ico + '</div><div>' +
    '<span class="kpi-label">' + label + '</span>' +
    '<span class="kpi-val">' + value + '</span>' +
    (unit ? '<span class="kpi-unit"> ' + unit + '</span>' : '') +
    '</div></div>';
}

function emptyState(ico, title, msg, action) {
  action = action || '';
  return '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:70px 24px;text-align:center;grid-column:1/-1">' +
    '<div style="font-size:52px">' + ico + '</div>' +
    '<h3 style="font-size:20px;font-weight:700;color:var(--t1)">' + title + '</h3>' +
    '<p style="font-size:14px;color:var(--t2);max-width:280px">' + msg + '</p>' +
    action + '</div>';
}

function buildPropertyCard(p, mode) {
  mode = mode || 'public';
  const mainPhoto = (p.fotos && p.fotos.length) ? p.fotos[0] : '';
  const tags = (p.comodidades || []).slice(0,3).map(function(a) {
    return '<span class="pc-tg">' + (AMENITY_LABELS[a] || a) + '</span>';
  }).join('');

  const imgHtml = mainPhoto
    ? '<img src="' + sanitize(mainPhoto) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover">'
    : '<div style="display:grid;place-items:center;height:100%;font-size:36px;background:#e8edf7">🏠</div>';

  const actions = mode === 'owner'
    ? '<button style="flex:1;padding:8px;border-radius:9px;font-size:13px;font-weight:600;background:#eff3fb;color:var(--pr);border:1.5px solid #d0d9f0;cursor:pointer;font-family:var(--f)" onclick="event.stopPropagation();window.__openForm(\'' + p.id + '\')">✏️ Editar</button>' +
      '<button class="btn-d" onclick="event.stopPropagation();window.__confirmDel(\'' + p.id + '\')">🗑️</button>'
    : '<button style="padding:8px 12px;border-radius:9px;font-size:14px;background:#fff8ed;border:1.5px solid #fed7aa;cursor:pointer;font-family:var(--f)" onclick="event.stopPropagation();window.__toggleFavBtn(\'' + p.id + '\',this)">' + (isFav(p.id) ? '❤️' : '🤍') + '</button>' +
      '<button class="btn-a" style="flex:1;padding:8px;border-radius:9px;font-size:13px" onclick="event.stopPropagation();window.__openDetail(\'' + p.id + '\')">Ver detalles</button>';

  return '<article class="prop-card" onclick="window.__openDetail(\'' + p.id + '\')">' +
    '<div class="pc-img-d">' + imgHtml +
      '<span class="pc-type-d">' + sanitize(p.tipo) + '</span><span class="pc-dot-d"></span>' +
      (p.tourVirtual ? '<span style="position:absolute;top:9px;left:9px;padding:4px 10px;border-radius:99px;font-size:10px;font-weight:700;background:rgba(15,157,88,.92);color:#fff">🥽 ' + sanitize(p.tourTipo || 'Tour') + '</span>' : '') +
    '</div>' +
    '<div class="pc-bd">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
        (p.estrato ? '<span class="strato-badge">Estrato ' + p.estrato + '</span>' : '<span></span>') +
        '<span style="font-size:11px;color:var(--t3)">' + sanitize(p.barrio || '') + '</span>' +
      '</div>' +
      '<div class="pc-tit">' + sanitize(p.titulo) + '</div>' +
      '<div class="pc-lc">📍 ' + sanitize(CITY_LABELS[p.ciudad] || p.ciudad) + '</div>' +
      '<div class="pc-st"><span>🛏️ <strong>' + p.habitaciones + '</strong></span><span>🚿 <strong>' + p.banos + '</strong></span><span>📐 <strong>' + p.metros + '</strong> m²</span></div>' +
      '<div class="pc-tgs">' + tags + '</div>' +
      '<div class="pc-pr">' + formatCOP(p.precio) + '<span class="pc-pr-u"> COP/mes</span></div>' +
    '</div>' +
    '<div class="pc-acts">' + actions + '</div>' +
  '</article>';
}

// ── Panel ──────────────────────────────────────────────────────
async function renderPanel(el) {
  const kpis  = await getKPIs();
  const props = await getMyProps();
  const user  = State.session;
  el.innerHTML =
    '<div class="wb"><div class="wb-txt"><h2>Hola, ' + sanitize(user.nombre) + ' 👋</h2>' +
    '<p>' + (kpis.props_activas || 0) + ' propiedad' + ((kpis.props_activas !== 1) ? 'es' : '') + ' · Plan <strong style="color:#5eead4">' + capitalize(user.plan || 'free') + '</strong></p></div>' +
    '<div style="font-size:52px;opacity:.35">🏘️</div></div>' +
    '<div class="kpi-grid">' +
      kpiCard('🏠','#eff3fb','Propiedades', kpis.props_activas || 0) +
      kpiCard('💰','#f0fdf4','Ingresos', formatShort(kpis.ingresos_mes || 0), 'COP/mes') +
      kpiCard('📅','#fefce8','Visitas', kpis.visitas_total || 0) +
      kpiCard('🎯','#fff1f2','Leads', kpis.leads_activos || 0) +
    '</div>' +
    '<div style="padding:22px 28px 8px;display:flex;align-items:center;justify-content:space-between">' +
      '<span style="font-size:20px;font-weight:800;color:var(--pr)">Mis propiedades</span>' +
      '<button class="btn-a" style="font-size:12.5px;padding:8px 16px" onclick="window.__openForm(null)">+ Nueva</button>' +
    '</div>' +
    '<div class="prop-grid-d">' +
      (props.length ? props.map(function(p) { return buildPropertyCard(p,'owner'); }).join('') :
        emptyState('🏗️','Sin propiedades','Agrega tu primera propiedad.','<button class="btn-a" onclick="window.__openForm(null)" style="margin-top:8px">+ Agregar</button>')) +
    '</div>';
}

// ── Mis propiedades ────────────────────────────────────────────
async function renderMisProps(el) {
  const props = await getMyProps();
  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Mis Propiedades</h1><p class="pg-sub">' + props.length + ' publicadas</p></div>' +
    '<button class="btn-a" onclick="window.__openForm(null)">+ Nueva</button></div>' +
    '<div class="prop-grid-d">' +
      (props.length ? props.map(function(p) { return buildPropertyCard(p,'owner'); }).join('') :
        emptyState('🏗️','Sin propiedades','Crea tu primera propiedad.')) +
    '</div>';
}

// ── Catálogo ───────────────────────────────────────────────────
async function renderCatalogo(el) {
  var filters = {};
  var tourOnly = false;

  async function reloadCatalog() {
    var grid = getEl('cat-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--t3)">⏳ Cargando…</div>';
    var result = await getAllProps(filters);
    var data   = result.data || [];
    grid.innerHTML = data.length
      ? data.map(function(p) { return buildPropertyCard(p,'public'); }).join('')
      : emptyState('🔍','Sin resultados','Ajusta los filtros');
    var sub = el.querySelector('.pg-sub');
    if (sub) sub.textContent = data.length + ' propiedades';
  }

  const user = State.session;
  el.innerHTML =
    '<div class="topbar">' +
      '<div><h1 class="pg-title">' + (user.rol === 'arrendador' ? 'Catálogo' : 'Explorar') + '</h1><p class="pg-sub">Cargando…</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
        '<div class="srch-box"><span>🔍</span><input type="text" id="cat-q" placeholder="Buscar…"/></div>' +
        '<select class="srt-sel" id="cat-sort"><option value="default">Destacados</option><option value="precio_asc">Precio ↑</option><option value="precio_desc">Precio ↓</option><option value="area_desc">Área</option></select>' +
      '</div>' +
    '</div>' +
    '<div class="filter-bar-d">' +
      ['','apartamento','casa','villa','loft','estudio'].map(function(t) {
        return '<button class="fb-chip' + (!t ? ' active' : '') + '" data-ct="' + (t || 'all') + '">' + (t ? capitalize(t) : '🏘️ Todos') + '</button>';
      }).join('') +
      '<select class="srt-sel" id="cat-city"><option value="">Todas las ciudades</option>' +
        Object.entries(CITY_LABELS).map(function(entry) { return '<option value="' + entry[0] + '">' + entry[1] + '</option>'; }).join('') +
      '</select>' +
      '<button class="fb-chip" id="tour-chip-d">🥽 Solo Tour 3D</button>' +
    '</div>' +
    '<div class="prop-grid-d" id="cat-grid"><div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--t3)">⏳ Cargando…</div></div>';

  await reloadCatalog();

  el.querySelectorAll('[data-ct]').forEach(function(b) {
    b.addEventListener('click', function() {
      filters.tipo = b.dataset.ct === 'all' ? undefined : b.dataset.ct;
      el.querySelectorAll('[data-ct]').forEach(function(x) { x.classList.remove('active'); });
      b.classList.add('active');
      reloadCatalog();
    });
  });

  var qInput = getEl('cat-q');
  if (qInput) qInput.addEventListener('input', function(e) { filters.q = e.target.value; reloadCatalog(); });

  var sortSel = getEl('cat-sort');
  if (sortSel) sortSel.addEventListener('change', function(e) { filters.sort = e.target.value; reloadCatalog(); });

  var citySel = getEl('cat-city');
  if (citySel) citySel.addEventListener('change', function(e) { filters.ciudad = e.target.value || undefined; reloadCatalog(); });

  var tourChip = getEl('tour-chip-d');
  if (tourChip) tourChip.addEventListener('click', function() {
    tourOnly = !tourOnly;
    filters.tour_virtual = tourOnly ? 'true' : undefined;
    tourChip.classList.toggle('active', tourOnly);
    reloadCatalog();
  });
}

// ── Visitas ────────────────────────────────────────────────────
async function renderVisitas(el) {
  const visitas = await getMyVisitas();
  var rows = visitas.map(function(v, i) {
    var propTitulo = (v.inquilino && v.inquilino.titulo) ? v.inquilino.titulo : (v.prop || '—');
    return '<div class="t-row" style="grid-template-columns:1fr 1.4fr .9fr .8fr 1.2fr;background:' + (i % 2 ? '#f9fafb' : '#fff') + '">' +
      '<span style="font-size:13px;font-weight:600">' + sanitize(v.cliente) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + sanitize(propTitulo) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + v.fecha + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + v.hora + '</span>' +
      '<div style="display:flex;align-items:center;gap:7px">' +
        '<span class="badge ' + (v.estado === 'confirmada' ? 'b-ok' : 'b-w') + '">' + v.estado.toUpperCase() + '</span>' +
        '<button style="font-size:11px;color:var(--pr);border:1px solid #d0d9f0;border-radius:7px;padding:3px 8px;background:#eff3fb;cursor:pointer;font-family:var(--f)" onclick="window.__toggleVisita(\'' + v.id + '\')">' + (v.estado === 'pendiente' ? 'Confirmar' : 'Cancelar') + '</button>' +
      '</div></div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Visitas</h1><p class="pg-sub">' + visitas.length + ' programadas</p></div>' +
    '<button class="btn-a" onclick="window.__openVisitaForm()">+ Agendar</button></div>' +
    '<div class="tbl-wrap">' +
      '<div class="t-head" style="grid-template-columns:1fr 1.4fr .9fr .8fr 1.2fr">' +
        '<span>Cliente</span><span>Propiedad</span><span>Fecha</span><span>Hora</span><span>Estado</span>' +
      '</div>' +
      '<div id="vb">' + (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin visitas</div>') + '</div>' +
    '</div>';
}

// ── Mensajes ───────────────────────────────────────────────────
async function renderMensajes(el) {
  const msgs = await getMensajes();

  var inboxHtml = msgs.map(function(m) {
    var nombre = (m.de && m.de.nombre) ? (m.de.nombre + ' ' + (m.de.apellido || '')) : (m.de || '—');
    var inicial = nombre[0] ? nombre[0].toUpperCase() : 'U';
    var hora    = m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}) : '';
    var titulo  = (m.propiedad && m.propiedad.titulo) ? m.propiedad.titulo : '—';
    return '<div class="msg-row' + (selectedMsg === m.id ? ' sel' : '') + '" onclick="window.__selectMsg(\'' + m.id + '\')">' +
      '<div class="msg-av">' + inicial + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:2px">' +
          '<span style="font-size:13px;font-weight:' + (m.leido ? '400' : '700') + ';color:var(--t1)">' + sanitize(nombre) + '</span>' +
          '<span style="font-size:11px;color:var(--t3)">' + hora + '</span>' +
        '</div>' +
        '<p style="font-size:12px;color:var(--t2);margin:0 0 2px;font-weight:' + (m.leido ? '400' : '600') + '">' + sanitize(titulo) + '</p>' +
        '<p style="font-size:12px;color:var(--t3);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + sanitize(m.texto) + '</p>' +
      '</div>' +
      (!m.leido ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--ac);margin-top:5px;flex-shrink:0"></div>' : '') +
    '</div>';
  }).join('') || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin mensajes</div>';

  el.innerHTML =
    '<div class="topbar" style="padding-bottom:14px"><h1 class="pg-title">Mensajes</h1></div>' +
    '<div class="msg-layout">' +
      '<div class="msg-inbox" id="msg-inbox">' + inboxHtml + '</div>' +
      '<div id="msg-det" style="display:grid;place-items:center;color:var(--t3);font-size:14px">Selecciona un mensaje</div>' +
    '</div>';
}

export async function selectMessage(id) {
  const msgs = State.mensajes || [];
  const msg  = msgs.find(function(m) { return m.id === id; });
  if (!msg) return;
  await markMensajeRead(id);
  selectedMsg = id;

  var nombre = (msg.de && msg.de.nombre) ? (msg.de.nombre + ' ' + (msg.de.apellido || '')) : (msg.de || '—');
  var titulo = (msg.propiedad && msg.propiedad.titulo) ? msg.propiedad.titulo : '—';
  var inicial = nombre[0] ? nombre[0].toUpperCase() : 'U';

  var det = getEl('msg-det');
  if (!det) return;

  det.innerHTML =
    '<div style="padding:24px;display:flex;flex-direction:column;height:100%">' +
      '<div style="display:flex;align-items:center;gap:13px;margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid var(--bo)">' +
        '<div class="msg-av" style="width:44px;height:44px;font-size:14px">' + inicial + '</div>' +
        '<div><h3 style="font-size:15px;font-weight:700;color:var(--t1);margin:0 0 2px">' + sanitize(nombre) + '</h3>' +
             '<p style="font-size:12px;color:var(--t2);margin:0">📍 ' + sanitize(titulo) + '</p></div>' +
      '</div>' +
      '<div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:14px">' +
        '<p style="font-size:14px;color:var(--t1);line-height:1.7;margin:0">' + sanitize(msg.texto) + '</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<textarea id="reply-txt" placeholder="Escribe una respuesta…" style="flex:1;padding:9px 12px;border:1.5px solid var(--bo);border-radius:10px;font-size:13px;resize:none;height:46px;outline:none;font-family:var(--f)"></textarea>' +
        '<button class="btn-a" id="btn-reply" style="padding:9px 18px">Enviar</button>' +
      '</div>' +
    '</div>';

  var replyBtn = getEl('btn-reply');
  if (replyBtn) replyBtn.onclick = async function() {
    var text = getEl('reply-txt') ? getEl('reply-txt').value.trim() : '';
    if (!text) return;
    await MensajesApi.send({ destinatario_id: msg.deId, prop_id: msg.propId, texto: text });
    showToast('Respuesta enviada ✓','success');
    if (getEl('reply-txt')) getEl('reply-txt').value = '';
  };

  document.querySelectorAll('.msg-row').forEach(function(r) { r.classList.remove('sel'); });
  var activeRow = document.querySelector('.msg-row[onclick*="' + id + '"]');
  if (activeRow) activeRow.classList.add('sel');
  await updateBadges();
}

// ── CRM ────────────────────────────────────────────────────────
async function renderCRM(el) {
  const leads = await getLeads();
  const scoreAvg = leads.length ? Math.round(leads.reduce(function(s,l) { return s+l.score; }, 0) / leads.length) : 0;
  const stColors = { new:'#94a3b8', contactado:'#0ea5e9', interesado:'#f59e0b', visita_agendada:'#0f9d58', lost:'#ef4444' };

  var rows = leads.map(function(l, i) {
    var propTitulo = (l.propiedad && l.propiedad.titulo) ? l.propiedad.titulo : (l.prop || '—');
    var color = stColors[l.estado] || '#94a3b8';
    var scoreColor = l.score > 70 ? 'var(--ac)' : l.score > 40 ? 'var(--wa)' : 'var(--da)';
    return '<div class="t-row" style="grid-template-columns:.8fr 1.2fr .6fr .5fr 1fr .6fr;background:' + (i%2?'#f9fafb':'#fff') + '">' +
      '<span style="font-size:13px;font-weight:600">' + sanitize(l.nombre) + '</span>' +
      '<span style="font-size:12px;color:var(--t2)">' + sanitize(propTitulo) + '</span>' +
      '<span style="font-size:12px;color:var(--t2)">' + sanitize(l.presupuesto || '—') + '</span>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        '<div style="flex:1;background:#f3f4f6;border-radius:99px;height:6px;overflow:hidden">' +
          '<div style="width:' + l.score + '%;height:100%;border-radius:99px;background:' + scoreColor + '"></div>' +
        '</div>' +
        '<span style="font-size:12px;font-weight:600;min-width:26px">' + l.score + '</span>' +
      '</div>' +
      '<span class="badge" style="background:' + color + '22;color:' + color + '">' + sanitize(l.estado) + '</span>' +
      '<span style="font-size:12px;color:var(--t3)">' + sanitize(l.fuente) + '</span>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">CRM — Leads</h1><p class="pg-sub">' + leads.length + ' leads</p></div>' +
    '<button class="btn-a" onclick="window.__openLeadForm()">+ Nuevo</button></div>' +
    '<div class="kpi-grid">' +
      kpiCard('🎯','#f0f4ff','Total', leads.length) +
      kpiCard('🔥','#fff8ed','Score prom.', scoreAvg, '/100') +
      kpiCard('✅','#f0fdf4','Activos', leads.filter(function(l) { return l.estado !== 'lost'; }).length) +
    '</div>' +
    '<div class="tbl-wrap" style="margin-top:20px">' +
      '<div class="t-head" style="grid-template-columns:.8fr 1.2fr .6fr .5fr 1fr .6fr">' +
        '<span>Nombre</span><span>Propiedad</span><span>Presupuesto</span><span>Score</span><span>Estado</span><span>Fuente</span>' +
      '</div>' +
      (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin leads</div>') +
    '</div>';
}

// ── Estadísticas ───────────────────────────────────────────────
async function renderEstadisticas(el) {
  const kpisRes  = await EstadisticasApi.kpis();
  const typeRes  = await EstadisticasApi.porTipo();
  const cityRes  = await EstadisticasApi.porCiudad();
  const k = (kpisRes && kpisRes.data) ? kpisRes.data : {};

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Estadísticas</h1></div></div>' +
    '<div class="kpi-grid">' +
      kpiCard('💰','#f0fdf4','Ingreso total', formatCOP(k.ingresos_mes || 0), 'COP/mes') +
      kpiCard('🏠','#eff3fb','Propiedades', k.props_activas || 0) +
      kpiCard('📅','#fefce8','Visitas', k.visitas_total || 0) +
      kpiCard('🎯','#fff1f2','Leads', k.leads_activos || 0) +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:20px 28px 0">' +
      '<div class="pay-card"><h3 style="font-size:17px;font-weight:700;color:var(--pr);margin-bottom:18px">Por tipo</h3><div id="chart-tipo"></div></div>' +
      '<div class="pay-card"><h3 style="font-size:17px;font-weight:700;color:var(--pr);margin-bottom:18px">Por ciudad</h3><div id="chart-city"></div></div>' +
    '</div>';

  var colors = ['#1e3a8a','#0f9d58','#f59e0b','#ef4444','#8b5cf6'];
  function renderBar(containerId, data) {
    var c = getEl(containerId); if (!c) return;
    var entries = Object.entries(data || {});
    if (!entries.length) { c.innerHTML = '<p style="color:var(--t3);text-align:center;padding:18px 0">Sin datos</p>'; return; }
    var max = Math.max.apply(null, entries.map(function(e) { return typeof e[1]==='object' ? e[1].count : e[1]; }));
    c.innerHTML = entries.map(function(entry, i) {
      var val = typeof entry[1]==='object' ? entry[1].count : entry[1];
      return '<div class="bar-row">' +
        '<span class="bar-label">' + sanitize(entry[0]) + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + (max>0?Math.round(val/max*100):0) + '%;background:' + colors[i%colors.length] + '"></div></div>' +
        '<span class="bar-val">' + val + '</span>' +
      '</div>';
    }).join('');
  }
  renderBar('chart-tipo', typeRes && typeRes.data);
  renderBar('chart-city', cityRes && cityRes.data);
}

// ── Pagos ──────────────────────────────────────────────────────
async function renderPagos(el) {
  const pagos = await getMyPagos();
  var pagados   = pagos.filter(function(p){return p.estado==='pagado';}).reduce(function(s,p){return s+p.monto;},0);
  var pendiente = pagos.filter(function(p){return p.estado==='pendiente';}).reduce(function(s,p){return s+p.monto;},0);
  var vencidos  = pagos.filter(function(p){return p.estado==='vencido';}).reduce(function(s,p){return s+p.monto;},0);

  var rows = pagos.map(function(p, i) {
    var propTitulo  = (p.inquilino && p.inquilino.titulo) ? p.inquilino.titulo : (p.prop || '—');
    var inqNombre   = (p.inq && p.inq.nombre) ? (p.inq.nombre + ' ' + (p.inq.apellido||'')) : (p.inquilinoNombre || '—');
    var badgeClass  = p.estado==='pagado' ? 'b-ok' : p.estado==='pendiente' ? 'b-w' : 'b-d';
    return '<div class="t-row" style="grid-template-columns:1fr 1.2fr 1fr .7fr .8fr 1fr;background:' + (i%2?'#f9fafb':'#fff') + '">' +
      '<span style="font-size:13px;font-weight:600">' + sanitize(inqNombre) + '</span>' +
      '<span style="font-size:12px;color:var(--t2)">' + sanitize(propTitulo) + '</span>' +
      '<span style="font-size:15px;font-weight:800;color:var(--pr)">' + formatCOP(p.monto) + '</span>' +
      '<span style="font-size:12px;color:var(--t2)">' + p.fecha + '</span>' +
      '<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#f3f4f6;color:var(--t2)">' + (p.metodo||'—') + '</span>' +
      '<div style="display:flex;align-items:center;gap:7px">' +
        '<span class="badge ' + badgeClass + '">' + p.estado.toUpperCase() + '</span>' +
        (p.estado !== 'pagado' ? '<button style="font-size:11px;color:var(--ac);border:1px solid #a7f3d0;border-radius:7px;padding:3px 8px;background:#f0fdf4;cursor:pointer;font-family:var(--f);font-weight:600" onclick="window.__markPago(\'' + p.id + '\')">✓</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Pagos & Finanzas</h1></div>' +
    '<button class="btn-a" onclick="window.__openPagoForm()">+ Registrar</button></div>' +
    '<div class="kpi-grid">' +
      kpiCard('💰','#f0fdf4','Cobrado', formatShort(pagados), 'COP') +
      kpiCard('⏳','#fefce8','Por cobrar', formatShort(pendiente), 'COP') +
      kpiCard('🔴','#fff1f2','Vencidos', formatShort(vencidos), 'COP') +
      kpiCard('📊','#eff3fb','Total', pagos.length) +
    '</div>' +
    '<div class="tbl-wrap" style="margin-top:20px">' +
      '<div class="t-head" style="grid-template-columns:1fr 1.2fr 1fr .7fr .8fr 1fr">' +
        '<span>Inquilino</span><span>Propiedad</span><span>Monto</span><span>Fecha</span><span>Método</span><span>Estado</span>' +
      '</div>' +
      '<div id="pgb">' + (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin pagos</div>') + '</div>' +
    '</div>';
}

// ── Suscripción ────────────────────────────────────────────────
async function renderSuscripcion(el) {
  var res    = await fetch('http://localhost:3000/v1/suscripciones/planes').then(function(r){return r.json();}).catch(function(){return{data:[]};});
  var planes = (res && res.data) ? res.data : [];
  var user   = State.session;

  var cards = planes.map(function(p) {
    var isCurrent = user.plan === p.id;
    var color     = PLAN_COLORS[p.id] || '#94a3b8';
    return '<div class="plan-card' + (isCurrent ? ' rec' : '') + '">' +
      (isCurrent ? '<span style="font-size:10.5px;font-weight:700;color:var(--ac)">✓ Tu plan actual</span>' : '') +
      '<div style="font-size:18px;font-weight:800;color:' + color + '">' + p.nombre + '</div>' +
      '<div style="font-size:28px;font-weight:800;color:var(--pr)">' + (p.precio === 0 ? 'Gratis' : formatCOP(p.precio)) + '<span style="font-size:13px;font-weight:400;color:var(--t3)">' + (p.precio ? '/mes' : '') + '</span></div>' +
      '<div style="font-size:12px;color:var(--t2)">' + (p.propsMax ? 'Máx. ' + p.propsMax + ' propiedades' : 'Propiedades ilimitadas') + '</div>' +
      '<button class="' + (isCurrent ? 'btn-g' : 'btn-a') + '" style="margin-top:auto;font-size:13.5px;padding:11px;width:100%" onclick="' +
        (isCurrent ? 'window.__toast(\'Ya tienes este plan\',\'info\')' : 'window.__openWompi(\'' + p.nombre + '\',\'' + (p.precio === 0 ? 'Gratis' : formatCOP(p.precio)) + '\')') + '">' +
        (isCurrent ? 'Plan actual' : 'Contratar con Wompi') +
      '</button>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Suscripción</h1>' +
    '<p class="pg-sub">Plan actual: <strong style="color:var(--pr)">' + capitalize(user.plan || 'free') + '</strong></p></div></div>' +
    '<div style="padding:14px 28px 8px;font-size:13.5px;color:var(--t2)">Pagos seguros con Wompi · PSE · Nequi · Daviplata</div>' +
    '<div class="plan-grid">' + (cards || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin planes disponibles</div>') + '</div>';
}

// ── Configuración ──────────────────────────────────────────────
async function renderConfiguracion(el) {
  var user = State.session;
  var ini  = ((user.nombre ? user.nombre[0] : '') + (user.apellido ? user.apellido[0] : '')).toUpperCase() || 'U';
  el.innerHTML =
    '<div class="topbar"><h1 class="pg-title">Configuración</h1></div>' +
    '<div style="display:grid;grid-template-columns:290px 1fr;gap:22px;padding:22px 28px 40px">' +
      '<div class="pay-card" style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">' +
        '<div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#2d52b3,#0f9d58);color:#fff;font-size:24px;font-weight:700;display:grid;place-items:center">' + ini + '</div>' +
        '<h3 style="font-size:19px;font-weight:700;color:var(--t1)">' + sanitize(user.nombre) + ' ' + sanitize(user.apellido || '') + '</h3>' +
        '<span class="badge b-ok">' + (user.rol === 'arrendador' ? 'Arrendador' : 'Inquilino') + '</span>' +
        '<div style="width:100%;border-top:1px solid var(--bo);padding-top:13px;font-size:13px;display:flex;flex-direction:column;gap:8px">' +
          '<div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Email</span><span>' + sanitize(user.email) + '</span></div>' +
        '</div>' +
        '<button class="btn-d" style="width:100%" onclick="window.__logout()">🚪 Cerrar sesión</button>' +
      '</div>' +
      '<div class="pay-card">' +
        '<h3 style="font-size:18px;font-weight:700;color:var(--pr);margin-bottom:20px">Información personal</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px">' +
          '<div class="mf"><label>Nombre</label><input id="cfg-n" value="' + sanitize(user.nombre || '') + '"/></div>' +
          '<div class="mf"><label>Apellido</label><input id="cfg-a" value="' + sanitize(user.apellido || '') + '"/></div>' +
          '<div class="mf"><label>Email</label><input id="cfg-e" type="email" value="' + sanitize(user.email) + '"/></div>' +
          '<div class="mf"><label>Teléfono</label><input id="cfg-t" placeholder="+57 300 000 0000" value="' + sanitize(user.telefono || '') + '"/></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px">' +
          '<button class="btn-a" onclick="window.__saveConfig()">Guardar cambios</button>' +
          '<button class="btn-g">Cancelar</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

export async function saveConfig() {
  var data = {
    nombre:   getEl('cfg-n') ? getEl('cfg-n').value.trim() : undefined,
    apellido: getEl('cfg-a') ? getEl('cfg-a').value.trim() : undefined,
    telefono: getEl('cfg-t') ? getEl('cfg-t').value.trim() : undefined,
  };
  await UsuariosApi.updateMe(data);
  if (data.nombre)   State.session.nombre   = data.nombre;
  if (data.apellido) State.session.apellido = data.apellido;
  updateSidebarProfile();
  showToast('Perfil guardado ✓','success');
}

// ── Favoritos ──────────────────────────────────────────────────
async function renderFavoritos(el) {
  const props = await getFavProps();
  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Mis Favoritos</h1><p class="pg-sub">' + props.length + ' guardadas</p></div></div>' +
    '<div class="prop-grid-d">' +
      (props.length ? props.map(function(p){return buildPropertyCard(p,'public');}).join('') :
        emptyState('🤍','Sin favoritos','Explora el catálogo.')) +
    '</div>';
}

// ── Mis Visitas (inquilino) ────────────────────────────────────
async function renderMisVisitas(el) {
  const { VisitasApi } = await import('../api.js');
  var res = await VisitasApi.findMias();
  var visitas = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

  var rows = visitas.map(function(v, i) {
    var propTitulo = (v.inquilino && v.inquilino.titulo) ? v.inquilino.titulo : '—';
    return '<div class="t-row" style="grid-template-columns:2fr 1fr 1fr 1fr;background:' + (i%2?'#f9fafb':'#fff') + '">' +
      '<span style="font-size:13px;font-weight:600">' + sanitize(propTitulo) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + v.fecha + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + v.hora + '</span>' +
      '<span class="badge ' + (v.estado==='confirmada'?'b-ok':'b-w') + '">' + v.estado.toUpperCase() + '</span>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Mis Visitas</h1><p class="pg-sub">' + visitas.length + ' agendadas</p></div></div>' +
    '<div class="tbl-wrap">' +
      '<div class="t-head" style="grid-template-columns:2fr 1fr 1fr 1fr">' +
        '<span>Propiedad</span><span>Fecha</span><span>Hora</span><span>Estado</span>' +
      '</div>' +
      (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin visitas agendadas</div>') +
    '</div>';
}

// ── Mis Pagos (inquilino) ──────────────────────────────────────
async function renderMisPagos(el) {
  const pagos = await getMyPagos();
  var total   = pagos.reduce(function(s,p){return s+p.monto;},0);

  var rows = pagos.map(function(p, i) {
    var propTitulo = (p.inquilino && p.inquilino.titulo) ? p.inquilino.titulo : '—';
    return '<div class="t-row" style="grid-template-columns:1.5fr 1fr .7fr 1fr;background:' + (i%2?'#f9fafb':'#fff') + '">' +
      '<span style="font-size:13px;font-weight:600">' + sanitize(propTitulo) + '</span>' +
      '<span style="font-size:15px;font-weight:800;color:var(--pr)">' + formatCOP(p.monto) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + p.fecha + '</span>' +
      '<span class="badge ' + (p.estado==='pagado'?'b-ok':p.estado==='pendiente'?'b-w':'b-d') + '">' + p.estado.toUpperCase() + '</span>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Mis Pagos</h1></div></div>' +
    '<div class="kpi-grid">' +
      kpiCard('💰','#f0fdf4','Total pagado', formatShort(total), 'COP') +
      kpiCard('📋','#eff3fb','Transacciones', pagos.length) +
      kpiCard('⏳','#fefce8','Pendientes', pagos.filter(function(p){return p.estado==='pendiente';}).length) +
    '</div>' +
    '<div class="tbl-wrap" style="margin-top:20px">' +
      '<div class="t-head" style="grid-template-columns:1.5fr 1fr .7fr 1fr">' +
        '<span>Propiedad</span><span>Monto</span><span>Fecha</span><span>Estado</span>' +
      '</div>' +
      (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin pagos</div>') +
    '</div>';
}
