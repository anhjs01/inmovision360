/**
 * ui.js — Renderizado de vistas conectadas al backend
 */
'use strict';

import { State, getMyProps, getAllProps, getMyVisitas, getMyPagos,
         getKPIs, getLeads, getMensajes, getUnreadCount, updateLead,
         getFavProps, isFav, getPlanes, getMiPlan, getMiHogar } from './store.js';
import { MensajesApi, EstadisticasApi, UsuariosApi, VisitasApi, PropiedadesApi, mediaUrl } from '../api.js';
import { formatCOP, formatShort, formatNum, formatFecha, sanitize, capitalize, getEl,
         AMENITY_LABELS, LISTING_LABELS, PLAN_COLORS, ESTILOS_VIDA, WA_ICON, ESTADO_PROP,
         cityKey, cityLabel, citiesDatalistHtml, waPropiedad, waLink, waNumber, waMensajePropiedad,
         videoEmbedUrl, esVip, PLAN_VIP, WA_PLANTILLA_DEFAULT, WA_VARIABLES } from '../utils.js';

let currentView = '';
let selectedMsg  = null;

const RBAC = {
  arrendador: ['panel','catalogo','mis-props','visitas','mensajes','crm','estadisticas','pagos','suscripcion','configuracion'],
  inquilino:  ['catalogo','favoritos','mi-hogar','mis-visitas','mis-pagos','mensajes','suscripcion','configuracion'],
};

const NAV_ARRENDADOR = [
  { sec:'Principal',    items:[{v:'panel',ico:'📊',lbl:'Mi Panel'},{v:'catalogo',ico:'🏘️',lbl:'Catálogo'}] },
  { sec:'Propiedades',  items:[{v:'mis-props',ico:'🏠',lbl:'Mis Propiedades'},{v:'visitas',ico:'📅',lbl:'Visitas',badge:'nb-v'}] },
  { sec:'Gestión',      items:[{v:'mensajes',ico:'💬',lbl:'Mensajes',badge:'nb-m'},{v:'crm',ico:'🎯',lbl:'CRM — Leads'},{v:'estadisticas',ico:'📈',lbl:'Estadísticas'},{v:'pagos',ico:'💳',lbl:'Pagos'}] },
  { sec:'Cuenta',       items:[{v:'suscripcion',ico:'⭐',lbl:'Suscripción'},{v:'configuracion',ico:'⚙️',lbl:'Configuración'}] },
];

const NAV_INQUILINO = [
  { sec:'Explorar',      items:[{v:'catalogo',ico:'🏘️',lbl:'Explorar'},{v:'favoritos',ico:'❤️',lbl:'Favoritos',badge:'nb-fav'}] },
  { sec:'Mis Arriendos', items:[{v:'mi-hogar',ico:'🏠',lbl:'Mi Hogar'},{v:'mis-visitas',ico:'📅',lbl:'Mis Visitas'},{v:'mis-pagos',ico:'💳',lbl:'Mis Pagos'},{v:'mensajes',ico:'💬',lbl:'Mensajes',badge:'nb-m'}] },
  { sec:'Cuenta',        items:[{v:'suscripcion',ico:'⭐',lbl:'Inquilino VIP'},{v:'configuracion',ico:'⚙️',lbl:'Configuración'}] },
];

// ── Toast ──────────────────────────────────────────────────────
// Usa SweetAlert2 si cargó desde el CDN; si no, el toast propio
const SWAL_ICONS = { success:'success', error:'error', info:'info', warning:'warning' };
let swalToast = null;

export function showToast(msg, type='success', duration=3200) {
  if (window.Swal) {
    swalToast = swalToast || window.Swal.mixin({
      // El toast deja pasar los clics (.swal2-toast en app.css): no bloquea botones que tenga debajo
      toast: true, position: 'top-end', showConfirmButton: false, timerProgressBar: true,
    });
    swalToast.fire({ icon: SWAL_ICONS[type] || 'success', titleText: String(msg ?? ''), timer: duration });   // titleText = texto plano (sin HTML)
    return;
  }
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

// Modal de error (login, registro, fallos de red). Devuelve una promesa que se resuelve al cerrar
export function showErrorAlert(title, msg) {
  if (!window.Swal) { showToast(msg || title, 'error', 4500); return Promise.resolve(); }
  return window.Swal.fire({ icon: 'error', titleText: title, text: msg || '', confirmButtonText: 'Entendido', confirmButtonColor: '#1e3a8a' });
}

// ── Init ───────────────────────────────────────────────────────
export async function initApp(user) {
  buildSidebarNav(user.rol);
  updateSidebarProfile();
  await showView(user.rol === 'arrendador' ? 'panel' : 'catalogo');
  showToast('Bienvenido/a, ' + user.nombre + ' 👋', 'success');
  if (esVip(user)) setTimeout(revisarAlertasVip, 1500);   // después del saludo
}

// ── Alertas del Pass VIP ───────────────────────────────────────
// El inquilino VIP guarda sus filtros de Explorar; al entrar se le avisa de lo publicado
// desde su última revisión que cumpla esos filtros. Se guarda solo en este navegador.
function alertaKey() { return 'vip_alerta_' + (State.session ? State.session.id : ''); }

export function getAlertaVip() {
  try { return JSON.parse(localStorage.getItem(alertaKey()) || 'null'); } catch (e) { return null; }
}

function setAlertaVip(alerta) {
  try {
    if (alerta) localStorage.setItem(alertaKey(), JSON.stringify(alerta));
    else localStorage.removeItem(alertaKey());
    return true;
  } catch (e) { return false; }
}

export async function revisarAlertasVip() {
  var alerta = getAlertaVip();
  if (!alerta || !esVip(State.session)) return;
  var r = await PropiedadesApi.findAll(Object.assign({}, alerta.filtros, { desde: alerta.revisada, limit: 50 }));
  if (!r || !r.ok) return;
  setAlertaVip(Object.assign({}, alerta, { revisada: new Date().toISOString() }));
  var n = r.data.length;
  if (n) showToast('⭐ Alerta VIP: ' + n + ' inmueble' + (n === 1 ? ' nuevo cumple' : 's nuevos cumplen') + ' tus filtros', 'info', 6000);
}

function describirFiltros(f) {
  var partes = [];
  if (f.tipo)   partes.push(capitalize(f.tipo));
  if (f.ciudad) partes.push(cityLabel(f.ciudad));
  if (f.q)      partes.push('"' + f.q + '"');
  if (f.estilo) partes.push(f.estilo.split(',').map(function(e) { var x = ESTILOS_VIDA.find(function(s) { return s.id === e; }); return x ? x.lbl : e; }).join(', '));
  if (f.tour_virtual) partes.push('con tour 3D');
  return partes.join(' · ') || 'todas las propiedades';
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
  if (rlEl) rlEl.textContent = user.rol === 'arrendador'
    ? 'Arrendador · ' + capitalize(user.plan ?? 'free')
    : esVip(user) ? 'Inquilino VIP · ✔ Verificado' : 'Inquilino · Básico';
}

export async function showView(name) {
  const rol = State.session ? State.session.rol : null;
  if (!rol || !RBAC[rol] || !RBAC[rol].includes(name)) { showToast('Sin permiso', 'error'); return; }
  currentView = name;
  document.body.dataset.view = name;   // permite ocultar el widget de WhatsApp en el chat
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
    'mis-visitas': renderMisVisitas, 'mis-pagos': renderMisPagos, 'mi-hogar': renderMiHogar,
  };
  if (renderers[name]) await renderers[name](el);
  await updateBadges();
}

// Cambio rápido de estado desde el <select> de la tabla CRM
window.__updateLeadEstado = async function(leadId, nuevoEstado) {
  try {
    await updateLead(leadId, { estado: nuevoEstado });
    showToast('Lead actualizado ✓', 'success');
    await refreshView();
  } catch(e) { showToast(e.message || 'Error', 'error'); }
};

// Botón pequeño de acción para filas de tablas
function rowBtn(label, onclick, kind) {
  const styles = {
    edit: 'color:var(--pr);border:1px solid #d0d9f0;background:#eff3fb',
    del:  'color:var(--da);border:1px solid #fecaca;background:#fef2f2',
    ok:   'color:var(--ac);border:1px solid #a7f3d0;background:#f0fdf4;font-weight:600',
  };
  return '<button style="font-size:11px;border-radius:7px;padding:3px 8px;cursor:pointer;font-family:var(--f);' + styles[kind] + '" onclick="' + onclick + '">' + label + '</button>';
}

function estadoBadge(estado) {
  const cls = { confirmada:'b-ok', pagado:'b-ok', pendiente:'b-w', cancelada:'b-d', vencido:'b-d' }[estado] || 'b-w';
  return '<span class="badge ' + cls + '">' + sanitize(String(estado).toUpperCase()) + '</span>';
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

// Venta se muestra sin "/mes"
export function priceUnit(listing) { return listing === 'sale' ? 'COP' : 'COP/mes'; }

function buildPropertyCard(p, mode) {
  mode = mode || 'public';
  const id        = sanitize(p.id);
  const mainPhoto = (p.fotos && p.fotos.length) ? mediaUrl(p.fotos[0]) : '';
  const nFotos    = (p.fotos || []).length;
  const tags = (p.comodidades || []).slice(0,3).map(function(a) {
    return '<span class="pc-tg">' + sanitize(AMENITY_LABELS[a] || a) + '</span>';
  }).join('') + ((p.comodidades || []).length > 3 ? '<span class="pc-tg pc-tg-more">+' + ((p.comodidades || []).length - 3) + '</span>' : '');

  const imgHtml = mainPhoto
    ? '<img src="' + sanitize(mainPhoto) + '" loading="lazy" alt="' + sanitize(p.titulo) + '" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'pc-noimg\',textContent:\'🏠\'}))">'
    : '<div class="pc-noimg">🏠</div>';

  const estado   = p.estado || 'disponible';
  const user     = State.session;
  const esPropia = !!user && user.id === p.ownerId;
  const esInq    = !!user && user.rol === 'inquilino';

  let actions;
  if (mode === 'owner') {
    actions = ownerCierreActions(p, id) +
      '<button class="pc-btn pc-btn-soft" onclick="event.stopPropagation();window.__openForm(\'' + id + '\')">✏️ Editar</button>' +
      '<button class="pc-btn pc-btn-del" title="Eliminar" aria-label="Eliminar" onclick="event.stopPropagation();window.__confirmDel(\'' + id + '\')">🗑️</button>';
  } else {
    // Atajos sin entrar al detalle: agendar cita (inquilino) y WhatsApp directo con el arrendador
    const wa = waPropiedad(p);
    actions =
      (esInq && !esPropia && estado === 'disponible'
        ? '<button class="pc-btn pc-btn-agenda" onclick="event.stopPropagation();window.__solicitarVisita(\'' + id + '\')">📅 Agendar cita</button>'
        : '') +
      (!esPropia
        ? '<a class="pc-btn pc-btn-wa" href="' + sanitize(wa.href) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"' +
            ' title="' + (wa.directo ? 'Escribir al arrendador por WhatsApp' : 'El arrendador no registró WhatsApp: te atiende soporte') + '"' +
            ' aria-label="WhatsApp ' + (wa.directo ? 'del arrendador' : 'de soporte') + '">' + WA_ICON + '</a>'
        : '') +
      '<button class="pc-btn pc-btn-main" onclick="event.stopPropagation();window.__openDetail(\'' + id + '\')">Ver detalles</button>';
  }

  const fav = mode === 'owner' ? '' :
    '<button class="pc-fav-d" title="Guardar en favoritos" onclick="event.stopPropagation();window.__toggleFavBtn(\'' + id + '\',this)">' + (isFav(p.id) ? '❤️' : '🤍') + '</button>';

  const tour = p.tourVirtual && p.tourUrl
    ? '<button class="pc-tour-d" title="Ver tour virtual" onclick="event.stopPropagation();window.__openTour(\'' + id + '\')">🥽 ' + sanitize(p.tourTipo || 'Tour 360°') + ' <span>▶</span></button>'
    : '';
  const video = videoEmbedUrl(p.video)
    ? '<button class="pc-video-d' + (tour ? ' pc-video-low' : '') + '" title="Ver video" onclick="event.stopPropagation();window.__openVideo(\'' + id + '\')">🎬 Video <span>▶</span></button>'
    : '';
  const estadoBadgeHtml = estado !== 'disponible'
    ? '<span class="pc-estado-d ' + ((ESTADO_PROP[estado] || {}).cls || 'b-w') + '">' + sanitize((ESTADO_PROP[estado] || {}).lbl || estado) + '</span>'
    : '';

  return '<article class="prop-card" onclick="window.__openDetail(\'' + id + '\')">' +
    '<div class="pc-img-d">' + imgHtml +
      '<div class="pc-img-shade"></div>' +
      '<div class="pc-top-d">' +
        '<span class="pc-type-d">' + sanitize(p.tipo) + '</span>' +
        (p.destacado ? '<span class="pc-feat-d">⭐ Destacado</span>' : '') +
        estadoBadgeHtml +
      '</div>' +
      fav + tour + video +
      (nFotos > 1 ? '<span class="pc-nfotos-d">📷 ' + nFotos + '</span>' : '') +
      '<div class="pc-price-d">' + formatCOP(p.precio) + '<small> ' + priceUnit(p.listing) + '</small></div>' +
    '</div>' +
    '<div class="pc-bd">' +
      '<div class="pc-meta-d">' +
        (p.listing ? '<span class="pc-listing-d">' + sanitize(LISTING_LABELS[p.listing] || p.listing) + '</span>' : '') +
        (p.estrato ? '<span class="strato-badge">Estrato ' + sanitize(p.estrato) + '</span>' : '') +
      '</div>' +
      '<div class="pc-tit" title="' + sanitize(p.titulo) + '">' + sanitize(p.titulo) + '</div>' +
      '<div class="pc-lc">📍 ' + sanitize(cityLabel(p.ciudad)) + (p.barrio ? ' · ' + sanitize(p.barrio) : '') + '</div>' +
      (mode === 'owner' && p.inquilinoActual
        ? '<div class="pc-inq-d">👤 ' + sanitize([p.inquilinoActual.nombre, p.inquilinoActual.apellido].filter(Boolean).join(' ')) +
            (p.inquilinoActual.plan === PLAN_VIP ? ' <span class="vip-badge" title="Inquilino con Pass VIP">✔ Verificado VIP</span>' : '') +
            (estado === 'reservada' ? ' quiere ' + (p.cierreTipo === 'compra' ? 'comprarla' : 'arrendarla') : '') + '</div>'
        : '') +
      '<div class="pc-st">' +
        '<span title="Habitaciones">🛏️ <strong>' + formatNum(p.habitaciones) + '</strong> hab.</span>' +
        '<span title="Baños">🚿 <strong>' + formatNum(p.banos) + '</strong> baños</span>' +
        '<span title="Área">📐 <strong>' + formatNum(p.metros) + '</strong> m²</span>' +
        (p.metros ? '<span class="pc-m2-d" title="Precio por m²">' + formatShort(p.precio / p.metros) + '/m²</span>' : '') +
      '</div>' +
      (tags ? '<div class="pc-tgs">' + tags + '</div>' : '') +
    '</div>' +
    '<div class="pc-acts">' + actions + '</div>' +
  '</article>';
}

// Acciones del arrendador según el estado del cierre (reservada → confirmar/rechazar; cerrada → volver a publicar)
function ownerCierreActions(p, id) {
  var btn = function(accion, lbl, cls) {
    return '<button class="pc-btn ' + cls + '" onclick="event.stopPropagation();window.__resolverCierre(\'' + id + '\',\'' + accion + '\')">' + lbl + '</button>';
  };
  if (p.estado === 'reservada') return btn('confirmar', '✅ Confirmar', 'pc-btn-ok') + btn('rechazar', 'Rechazar', 'pc-btn-del');
  if (p.estado === 'arrendada' || p.estado === 'vendida') return btn('liberar', '↺ Publicar', 'pc-btn-soft');
  return '';
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
  var filters  = {};
  var tourOnly = false;
  var estilos  = [];  // accesos rápidos de estilo de vida activos (se combinan)
  var page     = 1;
  var reqSeq   = 0;   // descarta respuestas viejas si el usuario cambia de filtro antes de que lleguen
  var qTimer   = null;

  // append=true agrega la siguiente página ("Cargar más"); si no, reinicia la lista
  async function reloadCatalog(append) {
    var grid = getEl('cat-grid');
    if (!grid) return;
    var seq = ++reqSeq;
    page = append ? page + 1 : 1;
    var more = getEl('cat-more');
    if (append && more) { more.disabled = true; more.textContent = '⏳ Cargando…'; }
    if (!append) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--t3)">⏳ Cargando…</div>';

    var params = Object.assign({}, filters, { page: page });
    var result;
    try { result = await getAllProps(params); }
    catch (e) { result = { data: [], meta: {}, error: 'Error de conexión con el servidor' }; }
    // La vista cambió o llegó una petición más nueva: no tocar el DOM
    if (seq !== reqSeq || !document.body.contains(grid)) return;

    var data  = result.data || [];
    var total = (result.meta && result.meta.total != null) ? result.meta.total : data.length;
    var pages = (result.meta && result.meta.pages) || 1;

    if (result.error) {
      if (append) page--;
      if (!append) grid.innerHTML = emptyState('⚠️','No se pudo cargar el catálogo', sanitize(result.error),
        '<button class="btn-a" style="margin-top:8px" onclick="window.__reloadCatalog && window.__reloadCatalog()">Reintentar</button>');
      else showToast(result.error, 'error');
    } else if (append) {
      grid.insertAdjacentHTML('beforeend', data.map(function(p) { return buildPropertyCard(p,'public'); }).join(''));
    } else {
      grid.innerHTML = data.length
        ? data.map(function(p) { return buildPropertyCard(p,'public'); }).join('')
        : emptyState('🔍','Sin resultados','Ajusta o limpia los filtros para ver más propiedades.',
            hasFilters() ? '<button class="btn-g" style="margin-top:8px" onclick="window.__clearCatFilters()">Limpiar filtros</button>' : '');
    }

    var sub = el.querySelector('.pg-sub');
    if (sub && !result.error) sub.textContent = formatNum(total) + ' propiedad' + (total === 1 ? '' : 'es');
    if (more) {
      more.style.display = (!result.error || append) && page < pages ? '' : 'none';
      more.disabled = false; more.textContent = 'Cargar más';
    }
    var clr = getEl('cat-clear');
    if (clr) clr.style.display = hasFilters() ? '' : 'none';
  }

  function hasFilters() {
    return !!(filters.tipo || filters.ciudad || filters.q || filters.tour_virtual || filters.estilo || (filters.sort && filters.sort !== 'default'));
  }

  window.__reloadCatalog = function() { reloadCatalog(false); };
  window.__clearCatFilters = function() {
    filters = {}; tourOnly = false; estilos = [];
    el.querySelectorAll('[data-estilo]').forEach(function(x) { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
    el.querySelectorAll('[data-ct]').forEach(function(x) { x.classList.toggle('active', x.dataset.ct === 'all'); });
    var q = getEl('cat-q'); if (q) q.value = '';
    var s = getEl('cat-sort'); if (s) s.value = 'default';
    var c = getEl('cat-city'); if (c) c.value = '';
    var t = getEl('tour-chip-d'); if (t) t.classList.remove('active');
    reloadCatalog(false);
  };

  const user = State.session;
  el.innerHTML =
    '<div class="topbar">' +
      '<div><h1 class="pg-title">' + (user.rol === 'arrendador' ? 'Catálogo' : 'Explorar') + '</h1><p class="pg-sub">Cargando…</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
        '<div class="srch-box"><span>🔍</span><input type="text" id="cat-q" placeholder="Buscar…"/></div>' +
        '<select class="srt-sel" id="cat-sort"><option value="default">Destacados</option><option value="precio_asc">Precio ↑</option><option value="precio_desc">Precio ↓</option><option value="area_desc">Área</option></select>' +
      '</div>' +
    '</div>' +
    '<div class="estilo-sec" role="group" aria-label="Filtrar por estilo de vida">' +
      '<div class="estilo-tit">¿Qué necesitas en tu nuevo hogar? <span>Toca una o varias opciones</span></div>' +
      '<div class="estilo-grid">' + ESTILOS_VIDA.map(function(e) {
        return '<button type="button" class="estilo-btn" data-estilo="' + e.id + '" aria-pressed="false">' +
          '<span class="estilo-ico" aria-hidden="true">' + e.ico + '</span>' +
          '<span class="estilo-txt"><strong>' + sanitize(e.lbl) + '</strong><small>' + sanitize(e.sub) + '</small></span>' +
          '<span class="estilo-check" aria-hidden="true">✓</span>' +
        '</button>';
      }).join('') + '</div>' +
    '</div>' +
    '<div class="filter-bar-d">' +
      ['','apartamento','casa','villa','loft','estudio'].map(function(t) {
        return '<button class="fb-chip' + (!t ? ' active' : '') + '" data-ct="' + (t || 'all') + '">' + (t ? capitalize(t) : '🏘️ Todos') + '</button>';
      }).join('') +
      '<input class="srt-sel city-input" id="cat-city" list="cat-ciudades" autocomplete="off" maxlength="60" placeholder="📍 Cualquier ciudad de LATAM…" aria-label="Filtrar por ciudad"/>' +
      citiesDatalistHtml('cat-ciudades') +
      '<button class="fb-chip" id="tour-chip-d">🥽 Solo Tour 3D</button>' +
      '<button class="fb-chip fb-clear" id="cat-clear" style="display:none" onclick="window.__clearCatFilters()">✕ Limpiar</button>' +
      (user.rol === 'inquilino'
        ? '<button class="fb-chip fb-vip" id="cat-alerta" title="Pass VIP: te avisamos cuando se publique algo con estos filtros">🔔 ' + (getAlertaVip() ? 'Alerta activa' : 'Crear alerta') + '</button>'
        : '') +
    '</div>' +
    '<div class="prop-grid-d" id="cat-grid"><div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--t3)">⏳ Cargando…</div></div>' +
    '<div style="display:flex;justify-content:center;padding:0 28px 36px"><button class="btn-g" id="cat-more" style="display:none;min-width:200px">Cargar más</button></div>';

  // Listeners antes de la primera carga: así un clic temprano no se pierde
  el.querySelectorAll('[data-ct]').forEach(function(b) {
    b.addEventListener('click', function() {
      if (b.dataset.ct === 'all') delete filters.tipo; else filters.tipo = b.dataset.ct;
      el.querySelectorAll('[data-ct]').forEach(function(x) { x.classList.toggle('active', x === b); });
      reloadCatalog(false);
    });
  });

  // Estilo de vida: alterna sin recargar la página; varias opciones se combinan (todas deben cumplirse)
  el.querySelectorAll('[data-estilo]').forEach(function(b) {
    b.addEventListener('click', function() {
      var id = b.dataset.estilo, i = estilos.indexOf(id);
      if (i === -1) estilos.push(id); else estilos.splice(i, 1);
      b.classList.toggle('active', i === -1);
      b.setAttribute('aria-pressed', String(i === -1));
      if (estilos.length) filters.estilo = estilos.join(','); else delete filters.estilo;
      reloadCatalog(false);
    });
  });

  var qInput = getEl('cat-q');
  if (qInput) qInput.addEventListener('input', function(e) {
    var v = e.target.value.trim();
    if (v) filters.q = v; else delete filters.q;
    clearTimeout(qTimer);
    qTimer = setTimeout(function() { reloadCatalog(false); }, 300);   // evita una petición por tecla
  });

  var sortSel = getEl('cat-sort');
  if (sortSel) sortSel.addEventListener('change', function(e) {
    if (e.target.value && e.target.value !== 'default') filters.sort = e.target.value; else delete filters.sort;
    reloadCatalog(false);
  });

  // Ciudad: se puede elegir de la lista o escribir cualquier ciudad/municipio (búsqueda sin tildes)
  var citySel = getEl('cat-city');
  var cityTimer = null;
  if (citySel) citySel.addEventListener('input', function(e) {
    var key = cityKey(e.target.value);
    if (key) filters.ciudad = key; else delete filters.ciudad;
    clearTimeout(cityTimer);
    cityTimer = setTimeout(function() { reloadCatalog(false); }, 350);
  });

  // Pass VIP: guarda los filtros actuales como alerta de nuevos inmuebles
  var alertaBtn = getEl('cat-alerta');
  if (alertaBtn) alertaBtn.addEventListener('click', function() {
    if (!esVip(State.session)) {
      showToast('Las alertas inmediatas son parte del Pass Inquilino VIP ⭐', 'info', 4500);
      showView('suscripcion');
      return;
    }
    var f = {};
    ['tipo', 'ciudad', 'q', 'estilo', 'tour_virtual'].forEach(function(k) { if (filters[k]) f[k] = filters[k]; });
    if (!setAlertaVip({ filtros: f, revisada: new Date().toISOString() })) { showToast('Tu navegador no permite guardar la alerta', 'error'); return; }
    alertaBtn.textContent = '🔔 Alerta activa';
    showToast('Alerta guardada: ' + describirFiltros(f) + '. Te avisaremos de lo nuevo al entrar.', 'success', 5000);
  });

  var tourChip = getEl('tour-chip-d');
  if (tourChip) tourChip.addEventListener('click', function() {
    tourOnly = !tourOnly;
    if (tourOnly) filters.tour_virtual = 'true'; else delete filters.tour_virtual;
    tourChip.classList.toggle('active', tourOnly);
    reloadCatalog(false);
  });

  var moreBtn = getEl('cat-more');
  if (moreBtn) moreBtn.addEventListener('click', function() { reloadCatalog(true); });

  await reloadCatalog(false);
}

// ── Visitas ────────────────────────────────────────────────────
async function renderVisitas(el) {
  const visitas = await getMyVisitas();
  var cols = '1fr 1.3fr .8fr .6fr 1.8fr';
  // El backend ya pone primero las solicitudes de inquilinos VIP (postulación prioritaria)
  var rows = visitas.map(function(v, i) {
    var propTitulo = (v.inquilino && v.inquilino.titulo) ? v.inquilino.titulo : '—';
    var toggle = v.estado === 'pendiente' ? 'Confirmar' : v.estado === 'confirmada' ? 'Desconfirmar' : 'Reabrir';
    return '<div class="t-row' + (v.vip ? ' t-row-vip' : '') + '" style="grid-template-columns:' + cols + ';background:' + (v.vip ? '#fffbeb' : i % 2 ? '#f9fafb' : '#fff') + '">' +
      '<span style="font-size:13px;font-weight:600">' + sanitize(v.cliente) +
        (v.vip ? ' <span class="vip-badge" title="Inquilino con Pass VIP: perfil verificado y postulación prioritaria">✔ Verificado VIP</span>' : '') + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + sanitize(propTitulo) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + sanitize(v.fecha) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + sanitize(v.hora) + '</span>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        estadoBadge(v.estado) +
        rowBtn(toggle, 'window.__toggleVisita(\'' + v.id + '\')', 'ok') +
        rowBtn('✏️', 'window.__openVisitaForm(\'' + v.id + '\')', 'edit') +
        rowBtn('🗑', 'window.__delVisita(\'' + v.id + '\')', 'del') +
      '</div></div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Visitas</h1><p class="pg-sub">' + visitas.length + ' programadas</p></div>' +
    '<button class="btn-a" onclick="window.__openVisitaForm()">+ Agendar</button></div>' +
    '<div class="tbl-wrap">' +
      '<div class="t-head" style="grid-template-columns:' + cols + '">' +
        '<span>Cliente</span><span>Propiedad</span><span>Fecha</span><span>Hora</span><span>Estado / Acciones</span>' +
      '</div>' +
      '<div id="vb">' + (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin visitas</div>') + '</div>' +
    '</div>';
}

// ── Mensajes ───────────────────────────────────────────────────
// El backend agrupa los mensajes por interlocutor: cada elemento de State.mensajes
// es { id: otroUsuarioId, usuario, ultimoMensaje, propiedad, unreadCount }.
function conversationName(c) {
  const u = c && c.usuario;
  return (u ? ((u.nombre || '') + ' ' + (u.apellido || '')).trim() : '') || 'Usuario';
}

function horaCorta(fecha) {
  return fecha ? new Date(fecha).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' }) : '';
}

function firstFoto(propiedad) {
  try {
    const fotos = typeof propiedad?.fotos === 'string' ? JSON.parse(propiedad.fotos) : propiedad?.fotos;
    return Array.isArray(fotos) && fotos.length ? mediaUrl(fotos[0]) : '';
  } catch (_) { return ''; }
}

function renderConversationListHtml(convs) {
  return convs.map(function(c) {
    const nombre  = conversationName(c);
    const ultimo  = c.ultimoMensaje || {};
    const unread  = Number(c.unreadCount || 0);
    const titulo  = (c.propiedad && c.propiedad.titulo) || 'Conversación';
    return '<div class="msg-row' + (selectedMsg === c.id ? ' sel' : '') + '" data-conv="' + c.id + '" onclick="window.__selectMsg(\'' + c.id + '\')">' +
      '<div class="msg-av">' + sanitize(nombre.charAt(0).toUpperCase() || 'U') + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:2px">' +
          '<span style="font-size:13px;font-weight:' + (unread ? '700' : '500') + ';color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + sanitize(nombre) + '</span>' +
          '<span style="font-size:11px;color:var(--t3);flex-shrink:0">' + horaCorta(ultimo.createdAt) + '</span>' +
        '</div>' +
        '<p style="font-size:12px;color:var(--t2);margin:0 0 2px;font-weight:' + (unread ? '600' : '400') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + sanitize(titulo) + '</p>' +
        '<p style="font-size:12px;color:var(--t3);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + sanitize(ultimo.texto || '') + '</p>' +
      '</div>' +
      (unread ? '<div style="min-width:18px;height:18px;padding:0 5px;border-radius:10px;background:var(--ac);color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;align-self:center">' + unread + '</div>' : '') +
    '</div>';
  }).join('') || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin mensajes</div>';
}

async function renderMensajes(el) {
  const convs = await getMensajes();
  el.innerHTML =
    '<div class="topbar" style="padding-bottom:14px"><h1 class="pg-title">Mensajes</h1></div>' +
    '<div class="msg-layout" id="msg-layout">' +
      '<div class="msg-inbox" id="msg-inbox">' + renderConversationListHtml(convs) + '</div>' +
      '<div id="msg-det" class="msg-chat">' +
        '<div class="msg-empty"><div class="msg-empty-inner">' +
          '<div class="msg-empty-icon">💬</div>' +
          '<div style="font-size:15px;font-weight:600;color:var(--t1);margin-bottom:5px">Tus conversaciones</div>' +
          '<div style="font-size:13px;line-height:1.5">Selecciona una conversación para comenzar</div>' +
        '</div></div>' +
      '</div>' +
    '</div>';
}

function bubbleHtml(m) {
  const isMine = State.session && m.deId === State.session.id;
  const side   = isMine ? 'mine' : 'theirs';
  const prop   = m.propiedad;
  const img    = firstFoto(prop);
  const propHtml = prop
    ? '<div class="msg-property">' +
        (img ? '<img class="msg-property-image" src="' + sanitize(img) + '">' : '') +
        '<div class="msg-property-info">' +
          '<div class="msg-property-title">' + sanitize(prop.titulo || 'Propiedad') + '</div>' +
          (prop.precio ? '<div class="msg-property-price">' + formatCOP(prop.precio) + '</div>' : '') +
        '</div>' +
      '</div>'
    : '';
  return '<div class="msg-bubble-row ' + side + '"><div class="msg-bubble ' + side + '">' +
    propHtml +
    '<div class="msg-bubble-text">' + sanitize(m.texto || '') + '</div>' +
    '<div class="msg-bubble-time">' + horaCorta(m.createdAt) + '</div>' +
  '</div></div>';
}

export async function selectMessage(userId) {
  const conversation = (State.mensajes || []).find(function(c) { return c.id === userId; });
  if (!conversation) return;
  selectedMsg = userId;

  const res     = await MensajesApi.getConversacion(userId);
  const history = res && res.ok ? res.data : [];
  await MensajesApi.markConversationRead(userId);
  conversation.unreadCount = 0;
  const inboxEl = getEl('msg-inbox');
  if (inboxEl) inboxEl.innerHTML = renderConversationListHtml(State.mensajes || []);

  const det = getEl('msg-det');
  if (!det) return;
  const nombre    = conversationName(conversation);
  const propiedad = conversation.propiedad;

  det.innerHTML =
    '<div class="msg-chat-head">' +
      '<button class="msg-back" id="msg-back" type="button" aria-label="Volver">‹</button>' +
      '<div class="msg-av" style="width:44px;height:44px;min-width:44px;font-size:14px">' + sanitize(nombre.charAt(0).toUpperCase() || 'U') + '</div>' +
      '<div class="msg-chat-head-info">' +
        '<h3 class="msg-chat-head-name">' + sanitize(nombre) + '</h3>' +
        (propiedad ? '<p class="msg-chat-head-property">📍 ' + sanitize(propiedad.titulo || 'Propiedad') + '</p>' : '') +
      '</div>' +
    '</div>' +
    '<div id="conversation-messages" class="msg-chat-messages">' +
      (history.length ? history.map(bubbleHtml).join('') : '<div style="height:100%;display:grid;place-items:center;text-align:center;color:var(--t3);padding:30px">No hay mensajes todavía</div>') +
    '</div>' +
    '<div class="msg-composer">' +
      '<textarea id="reply-txt" placeholder="Escribe una respuesta…" rows="1" maxlength="2000"></textarea>' +
      '<button class="btn-a" id="btn-reply" type="button">Enviar</button>' +
    '</div>';

  const layout = getEl('msg-layout');
  if (layout) layout.classList.add('chat-open');

  const box = getEl('conversation-messages');
  if (box) box.scrollTop = box.scrollHeight;

  getEl('msg-back').onclick = function() {
    if (layout) layout.classList.remove('chat-open');
    selectedMsg = null;
    document.querySelectorAll('.msg-row').forEach(function(r) { r.classList.remove('sel'); });
  };

  const input    = getEl('reply-txt');
  const replyBtn = getEl('btn-reply');
  replyBtn.onclick = async function() {
    const text = input.value.trim();
    if (!text) return;
    // La respuesta va asociada a la propiedad más reciente de la conversación
    const ultimoConProp = history.slice().reverse().find(function(m) { return m.propId; });
    const propId = (ultimoConProp && ultimoConProp.propId) || (propiedad && propiedad.id);
    if (!propId) { showToast('No se encontró la propiedad asociada a esta conversación', 'error'); return; }

    replyBtn.disabled = true;
    try {
      const r = await MensajesApi.send({ destinatario_id: userId, prop_id: propId, texto: text });
      if (!r || !r.ok) { showToast((r && r.error && r.error.message) || 'No se pudo enviar el mensaje', 'error'); return; }
      input.value = '';
      await getMensajes();
      const inbox = getEl('msg-inbox');
      if (inbox) inbox.innerHTML = renderConversationListHtml(State.mensajes || []);
      if (selectedMsg === userId) await selectMessage(userId);
    } finally {
      replyBtn.disabled = false;
    }
  };

  // Enter envía, Shift+Enter hace salto de línea
  input.onkeydown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!replyBtn.disabled) replyBtn.click(); }
  };
  input.oninput = function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  };

  document.querySelectorAll('.msg-row').forEach(function(r) { r.classList.toggle('sel', r.dataset.conv === userId); });
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
    return '<div class="t-row" style="grid-template-columns:.8fr 1.2fr .6fr .5fr .9fr 1.1fr;background:' + (i%2?'#f9fafb':'#fff') + '">' +
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
      '<div style="display:flex;gap:4px;align-items:center">' +
        '<select style="font-size:10px;border:1px solid var(--bo);border-radius:6px;padding:2px 4px;cursor:pointer;font-family:var(--f);color:var(--t2);max-width:90px" onchange="window.__updateLeadEstado(\'' + l.id + '\',this.value)">' +
          ['new','contactado','interesado','visita_agendada','lost'].map(function(s){ return '<option value="' + s + '"' + (l.estado===s?' selected':'') + '>' + s + '</option>'; }).join('') +
        '</select>' +
        rowBtn('✏️', 'window.__openLeadForm(\'' + l.id + '\')', 'edit') +
        rowBtn('🗑', 'window.__delLead(\'' + l.id + '\')', 'del') +
      '</div>' +
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
      '<div class="t-head" style="grid-template-columns:.8fr 1.2fr .6fr .5fr .9fr 1.1fr">' +
        '<span>Nombre</span><span>Propiedad</span><span>Presupuesto</span><span>Score</span><span>Estado</span><span>Acciones</span>' +
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

// ── Pagos (arrendador e inquilino) + Planes ────────────────────
// Pestaña activa dentro del módulo de pagos: 'pagos' | 'planes'
var pagosTab    = 'pagos';
var pagosFiltro = '';

function pagosTabsHtml() {
  return '<div class="view-tabs">' +
    '<button class="vt' + (pagosTab === 'pagos'  ? ' active' : '') + '" onclick="window.__pagosTab(\'pagos\')">💳 Pagos</button>' +
    '<button class="vt' + (pagosTab === 'planes' ? ' active' : '') + '" onclick="window.__pagosTab(\'planes\')">⭐ ' + (State.session && State.session.rol === 'inquilino' ? 'Inquilino VIP' : 'Planes y suscripción') + '</button>' +
  '</div>';
}

window.__pagosTab = function(tab) { pagosTab = tab; refreshView(); };
window.__pagosFiltro = function(estado) { pagosFiltro = estado; refreshView(); };

function pagoConcepto(p) {
  return p.concepto ? '<div style="font-size:11px;color:var(--t3);margin-top:2px">' + sanitize(p.concepto) + '</div>' : '';
}

function pagoInquilino(p) {
  if (p.inq && p.inq.nombre) return '<span style="font-size:13px;font-weight:600">' + sanitize((p.inq.nombre + ' ' + (p.inq.apellido || '')).trim()) + '</span>';
  return '<span class="badge b-i" title="Pago sin inquilino asociado">Pago directo</span>';
}

function filtroChips(pagos) {
  var opts = [['', 'Todos'], ['pagado', 'Pagados'], ['pendiente', 'Pendientes'], ['vencido', 'Vencidos']];
  return '<div class="filter-bar-d" style="padding-top:18px">' + opts.map(function(o) {
    var n = o[0] ? pagos.filter(function(p) { return p.estado === o[0]; }).length : pagos.length;
    return '<button class="fb-chip' + (pagosFiltro === o[0] ? ' active' : '') + '" onclick="window.__pagosFiltro(\'' + o[0] + '\')">' + o[1] + ' <span style="opacity:.7">(' + formatNum(n) + ')</span></button>';
  }).join('') + '</div>';
}

// Columna "Comprobante": ver el adjunto, adjuntar uno nuevo o nada
function comprobanteCell(p, puedeAdjuntar) {
  if (p.comprobanteUrl) return rowBtn('🧾 Ver', 'window.__verComprobante(\'' + p.id + '\')', 'edit');
  if (puedeAdjuntar)    return rowBtn('📎 Adjuntar', 'window.__adjuntarComprobante(\'' + p.id + '\')', 'edit');
  return '<span style="font-size:12px;color:var(--t3)">—</span>';
}

// Reportado por el inquilino y aún sin confirmar por el arrendador
function enRevision(p) { return p.origen === 'inquilino' && p.estado !== 'pagado'; }
var REVISION_BADGE = '<span class="badge b-i" title="Reportado por el inquilino, pendiente de confirmar">🕓 En revisión</span>';

function sumMonto(pagos, estado) {
  return pagos.filter(function(p) { return p.estado === estado; }).reduce(function(s, p) { return s + p.monto; }, 0);
}

async function renderPagos(el) {
  if (pagosTab === 'planes') return renderPlanesTab(el, 'Pagos & Finanzas');
  const pagos = await getMyPagos();
  var visibles = pagosFiltro ? pagos.filter(function(p) { return p.estado === pagosFiltro; }) : pagos;

  var cols = '1.1fr 1.3fr .9fr .75fr .6fr .75fr 1.5fr';
  var rows = visibles.map(function(p, i) {
    var propTitulo = (p.inquilino && p.inquilino.titulo) ? p.inquilino.titulo : '—';
    return '<div class="t-row" style="grid-template-columns:' + cols + ';background:' + (i%2?'#f9fafb':'#fff') + '">' +
      '<div>' + pagoInquilino(p) + (p.origen === 'inquilino' ? '<div style="font-size:11px;color:var(--t3);margin-top:2px">Reportado por el inquilino</div>' : '') + '</div>' +
      '<div><span style="font-size:12px;color:var(--t2)">' + sanitize(propTitulo) + '</span>' + pagoConcepto(p) + '</div>' +
      '<span style="font-size:15px;font-weight:800;color:var(--pr)">' + formatCOP(p.monto) + '</span>' +
      '<span style="font-size:12px;color:var(--t2)">' + sanitize(formatFecha(p.fecha)) + '</span>' +
      '<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#f3f4f6;color:var(--t2);justify-self:start">' + sanitize(p.metodo||'—') + '</span>' +
      '<div>' + comprobanteCell(p, true) + '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        (enRevision(p) ? REVISION_BADGE : estadoBadge(p.estado)) +
        (p.estado !== 'pagado' ? rowBtn(enRevision(p) ? '✓ Confirmar' : '✓ Pagado', 'window.__markPago(\'' + p.id + '\')', 'ok') : '') +
        rowBtn('✏️', 'window.__openPagoForm(\'' + p.id + '\')', 'edit') +
        rowBtn('🗑', 'window.__delPago(\'' + p.id + '\')', 'del') +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Pagos & Finanzas</h1><p class="pg-sub">' + formatNum(pagos.length) + ' registro' + (pagos.length === 1 ? '' : 's') + '</p></div>' +
    '<button class="btn-a" onclick="window.__openPagoForm()">+ Registrar pago</button></div>' +
    pagosTabsHtml() +
    '<div class="kpi-grid">' +
      kpiCard('💰','#f0fdf4','Cobrado', formatShort(sumMonto(pagos,'pagado')), 'COP') +
      kpiCard('⏳','#fefce8','Por cobrar', formatShort(sumMonto(pagos,'pendiente')), 'COP') +
      kpiCard('🔴','#fff1f2','Vencidos', formatShort(sumMonto(pagos,'vencido')), 'COP') +
      kpiCard('📊','#eff3fb','Total', formatNum(pagos.length)) +
    '</div>' +
    filtroChips(pagos) +
    '<div class="tbl-wrap tbl-scroll">' +
      '<div class="t-head" style="grid-template-columns:' + cols + '">' +
        '<span>Inquilino</span><span>Propiedad / Concepto</span><span>Monto</span><span>Fecha</span><span>Método</span><span>Comprobante</span><span>Estado / Acciones</span>' +
      '</div>' +
      '<div id="pgb">' + (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">' + (pagos.length ? 'No hay pagos con este estado' : 'Sin pagos registrados') + '</div>') + '</div>' +
    '</div>';
}

// ── Mis Pagos (inquilino) ──────────────────────────────────────
async function renderMisPagos(el) {
  if (pagosTab === 'planes') return renderPlanesTab(el, 'Mis Pagos');
  const pagos = await getMyPagos();
  var visibles = pagosFiltro ? pagos.filter(function(p) { return p.estado === pagosFiltro; }) : pagos;
  var cols = '1.5fr 1fr .8fr .8fr 1.3fr';

  var rows = visibles.map(function(p, i) {
    var propTitulo = (p.inquilino && p.inquilino.titulo) ? p.inquilino.titulo : '—';
    // Un pago reportado ya se hizo por fuera: no se paga con Wompi y se puede borrar mientras esté en revisión
    var acciones = enRevision(p)
      ? REVISION_BADGE + rowBtn('🗑', 'window.__delPago(\'' + p.id + '\')', 'del')
      : estadoBadge(p.estado) + (p.estado !== 'pagado' ? rowBtn('💳 Pagar', 'window.__pagarPago(\'' + p.id + '\')', 'ok') : '');
    return '<div class="t-row" style="grid-template-columns:' + cols + ';background:' + (i%2?'#f9fafb':'#fff') + '">' +
      '<div><span style="font-size:13px;font-weight:600">' + sanitize(propTitulo) + '</span>' + pagoConcepto(p) + '</div>' +
      '<span style="font-size:15px;font-weight:800;color:var(--pr)">' + formatCOP(p.monto) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + sanitize(formatFecha(p.fecha)) + '</span>' +
      '<div>' + comprobanteCell(p, p.estado !== 'pagado') + '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' + acciones + '</div>' +
    '</div>';
  }).join('');
  var porPagar  = pagos.filter(function(p) { return p.estado !== 'pagado' && !enRevision(p); }).reduce(function(s, p) { return s + p.monto; }, 0);
  var revisionN = pagos.filter(enRevision).length;

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Mis Pagos</h1><p class="pg-sub">Historial de pagos y planes</p></div>' +
    '<div class="cta-hint"><button class="btn-a btn-xl" onclick="window.__reportarPago()" aria-describedby="rp-hint">🧾 Reportar pago</button>' +
      '<span id="rp-hint">¿Pagaste por transferencia o en efectivo? Avísale aquí a tu arrendador.</span></div></div>' +
    pagosTabsHtml() +
    '<div class="kpi-grid">' +
      kpiCard('💰','#f0fdf4','Total pagado', formatShort(sumMonto(pagos,'pagado')), 'COP') +
      kpiCard('⏳','#fefce8','Por pagar', formatShort(porPagar), 'COP') +
      kpiCard('🕓','#eff3fb','En revisión', formatNum(revisionN)) +
      kpiCard('📋','#eff3fb','Transacciones', formatNum(pagos.length)) +
    '</div>' +
    filtroChips(pagos) +
    '<div class="tbl-wrap tbl-scroll">' +
      '<div class="t-head" style="grid-template-columns:' + cols + '">' +
        '<span>Propiedad / Concepto</span><span>Monto</span><span>Fecha</span><span>Comprobante</span><span>Estado</span>' +
      '</div>' +
      (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">' + (pagos.length ? 'No hay pagos con este estado' : 'Aún no tienes pagos') + '</div>') +
    '</div>';
}

// ── Planes y suscripción (compartido por Pagos, Mis Pagos y Suscripción) ──
async function planesHtml() {
  var res    = await Promise.all([getPlanes(), getMiPlan()]);
  var planes = res[0];
  var mi     = res[1];
  var user   = State.session;
  var actual = (mi && mi.plan) || user.plan || 'free';

  // El inquilino solo ve su Pass VIP (los Planos 2D/3D y los planes de publicación son del arrendador)
  if (user.rol === 'inquilino') return vipHtml(planes.find(function(p) { return p.categoria === 'inquilino'; }), actual, mi);

  var suscripciones = planes.filter(function(p) { return (p.categoria || 'suscripcion') === 'suscripcion'; });
  var planos        = planes.filter(function(p) { return p.categoria === 'plano'; });

  var cards = suscripciones.map(function(p) {
    var isCurrent = actual === p.id;
    var color     = PLAN_COLORS[p.id] || '#94a3b8';
    var precio    = p.precio === 0 ? 'Gratis' : formatCOP(p.precio);
    return '<div class="plan-card' + (isCurrent ? ' rec' : '') + '" style="--plan:' + color + '">' +
      (isCurrent ? '<span class="plan-cur">✓ Tu plan actual</span>' : '') +
      '<div style="font-size:18px;font-weight:800;color:' + color + '">' + sanitize(p.nombre) + '</div>' +
      '<div style="font-size:28px;font-weight:800;color:var(--pr);letter-spacing:-.5px">' + precio + '<span style="font-size:13px;font-weight:400;color:var(--t3)">' + (p.precio ? ' COP/mes' : '') + '</span></div>' +
      '<div style="font-size:12.5px;color:var(--t2)">' + (p.propsMax ? 'Hasta ' + formatNum(p.propsMax) + ' propiedades publicadas' : 'Propiedades ilimitadas') + '</div>' +
      featuresHtml(p.features) +
      '<button class="' + (isCurrent ? 'btn-g' : 'btn-a') + '" style="margin-top:auto;font-size:13.5px;padding:11px;width:100%;justify-content:center"' +
        (isCurrent ? ' disabled' : ' onclick="window.__openPlan(\'' + sanitize(p.id) + '\')"') + '>' +
        (isCurrent ? 'Plan actual' : (p.precio === 0 ? 'Cambiar a ' + sanitize(p.nombre) : 'Contratar con Wompi')) +
      '</button>' +
    '</div>';
  }).join('');

  var resumen = '';
  if (mi) {
    var uso = mi.props_max ? Math.min(100, Math.round(mi.props_activas / mi.props_max * 100)) : 0;
    resumen =
      '<div class="pay-card plan-resumen">' +
        '<div><div class="kpi-label">Plan actual</div><div style="font-size:20px;font-weight:800;color:var(--pr)">' + sanitize(mi.nombre) + '</div>' +
          '<div style="font-size:12px;color:var(--t3)">Estado: ' + sanitize(mi.estado) + (mi.vence ? ' · Vence el ' + sanitize(formatFecha(mi.vence)) : '') + '</div></div>' +
        (user.rol === 'arrendador'
          ? '<div style="flex:1;min-width:180px"><div style="font-size:12px;color:var(--t2);margin-bottom:6px">' + formatNum(mi.props_activas) + ' de ' + (mi.props_max ? formatNum(mi.props_max) : '∞') + ' propiedades</div>' +
              '<div class="plan-bar"><div style="width:' + (mi.props_max ? uso : 8) + '%"></div></div></div>'
          : '') +
        (actual !== 'free' ? '<button class="btn-g" onclick="window.__cancelPlan()">Cancelar suscripción</button>' : '') +
      '</div>';
  }

  return resumen +
    '<div style="padding:14px 28px 4px;font-size:13.5px;color:var(--t2)">🔒 Pagos seguros con Wompi · PSE · Nequi · Daviplata · Tarjeta</div>' +
    '<div class="plan-grid">' + (cards || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin planes disponibles. Ejecuta <code>npm run db:seed</code> en el backend.</div>') + '</div>' +
    planosHtml(planos);
}

// ── Pass Inquilino VIP ─────────────────────────────────────────
var VIP_ICONOS = ['🚀', '✔️', '🔔', '📅'];

function vipHtml(vip, actual, mi) {
  if (!vip) return '<div style="padding:30px 28px;color:var(--t3)">El Pass VIP no está disponible. Ejecuta <code>npm run db:seed</code> en el backend.</div>';
  var activo = actual === vip.id;
  var alerta = getAlertaVip();
  return '<div class="vip-sec">' +
    '<div class="vip-hero">' +
      '<div><span class="vip-tag">⭐ Exclusivo para inquilinos</span>' +
        '<h2>' + sanitize(vip.nombre) + '</h2>' +
        '<p>' + sanitize(vip.descripcion || '') + '</p></div>' +
      '<div class="vip-price">' + formatCOP(vip.precio) + '<small> COP/mes</small>' +
        (activo
          ? '<span class="vip-on">✓ Tu Pass está activo' + (mi && mi.vence ? ' · vence el ' + sanitize(formatFecha(mi.vence)) : '') + '</span>'
          : '<button class="btn-a btn-xl" onclick="window.__openPlan(\'' + sanitize(vip.id) + '\')">Activar Pass VIP</button>') +
      '</div>' +
    '</div>' +
    '<div class="vip-grid">' + (vip.features || []).map(function(f, i) {
      return '<div class="vip-feat"><span class="vip-feat-ico" aria-hidden="true">' + (VIP_ICONOS[i] || '⭐') + '</span><span>' + sanitize(f) + '</span></div>';
    }).join('') + '</div>' +
    (activo
      ? '<div class="pay-card vip-estado">' +
          '<div><div class="kpi-label">Alertas de nuevos inmuebles</div>' +
            '<div style="font-size:14px;color:var(--t1);margin-top:4px">' + (alerta ? '🔔 ' + sanitize(describirFiltros(alerta.filtros)) : 'Aún no tienes una alerta. Ve a <strong>Explorar</strong>, aplica tus filtros y toca <strong>🔔 Crear alerta</strong>.') + '</div></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn-g" onclick="window.__showView(\'catalogo\')">Ir a Explorar</button>' +
            '<button class="btn-g" onclick="window.__cancelPlan()">Volver a Básico</button>' +
          '</div>' +
        '</div>'
      : '<p style="padding:0 28px 32px;font-size:13px;color:var(--t2)">Plan actual: <strong>Básico (gratis)</strong> — explorar, guardar favoritos, agendar visitas y reportar pagos.</p>') +
  '</div>';
}

function featuresHtml(features) {
  if (!features || !features.length) return '';
  return '<ul class="plan-feats">' + features.map(function(f) { return '<li>' + sanitize(f) + '</li>'; }).join('') + '</ul>';
}

// Ofertas de Planos 2D/3D: contratación solo visual (no cambia el plan del usuario)
function planosHtml(planos) {
  if (!planos.length) return '<div style="height:32px"></div>';
  var solicitados = getPlanosSolicitados();
  var icons = { plano_2d: '📐', plano_3d: '🧊' };
  return '<div class="planos-sec">' +
    '<div class="planos-head">' +
      '<div><h2>Planos 2D y 3D</h2><p>Muestra la distribución de tu inmueble con planos profesionales.</p></div>' +
      '<span class="badge b-i">Pago único</span>' +
    '</div>' +
    '<div class="planos-grid">' + planos.map(function(p) {
      var pedido = solicitados.indexOf(p.id) !== -1;
      return '<div class="plano-card">' +
        '<div class="plano-ico">' + (icons[p.id] || '🗺') + '</div>' +
        '<div class="plano-body">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="plano-name">' + sanitize(p.nombre) + '</span>' +
            (pedido ? '<span class="badge b-ok">✓ Solicitado</span>' : '') + '</div>' +
          (p.descripcion ? '<div class="plano-desc">' + sanitize(p.descripcion) + '</div>' : '') +
          featuresHtml(p.features) +
        '</div>' +
        '<div class="plano-buy">' +
          '<div class="plano-price">' + formatCOP(p.precio) + '<small> COP</small></div>' +
          '<button class="btn-a" style="justify-content:center;width:100%" onclick="window.__openPlano(\'' + sanitize(p.id) + '\')">' + (pedido ? 'Solicitar otro' : 'Contratar') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>' +
  '</div>';
}

// Solicitudes de planos guardadas solo en este navegador (es una oferta visual)
export function getPlanosSolicitados() {
  try { return JSON.parse(localStorage.getItem('planos_solicitados_' + (State.session ? State.session.id : '')) || '[]'); }
  catch (e) { return []; }
}
export function addPlanoSolicitado(id) {
  try {
    var key  = 'planos_solicitados_' + (State.session ? State.session.id : '');
    var list = getPlanosSolicitados();
    if (list.indexOf(id) === -1) list.push(id);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) { /* sin almacenamiento: solo no se recuerda la solicitud */ }
}

async function renderPlanesTab(el, titulo) {
  var body = await planesHtml();
  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">' + titulo + '</h1><p class="pg-sub">Planes y suscripción</p></div></div>' +
    pagosTabsHtml() + body;
}

// ── Suscripción ────────────────────────────────────────────────
async function renderSuscripcion(el) {
  var body = await planesHtml();
  var inq  = State.session.rol === 'inquilino';
  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">' + (inq ? 'Inquilino VIP' : 'Suscripción') + '</h1>' +
    '<p class="pg-sub">' + (inq ? 'Asegura tu próximo hogar antes que los demás' : 'Elige el plan que mejor se adapte a ti') + '</p></div></div>' + body;
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
          '<div class="mf"><label for="cfg-t">' + (user.rol === 'arrendador' ? 'WhatsApp de contacto' : 'Teléfono') + '</label><input id="cfg-t" type="tel" placeholder="+57 300 000 0000" value="' + sanitize(user.telefono || '') + '"' + (user.rol === 'arrendador' ? ' aria-describedby="cfg-t-hint"' : '') + '/>' +
            (user.rol === 'arrendador' ? '<small class="form-hint" id="cfg-t-hint">Fuera de Colombia incluye el indicativo del país (+52, +54, +51…).</small>' : '') + '</div>' +
        '</div>' +
        (user.rol === 'arrendador' ? waConfigHtml(user) : '') +
        '<div style="display:flex;gap:10px">' +
          '<button class="btn-a" onclick="window.__saveConfig()">Guardar cambios</button>' +
          '<button class="btn-g" onclick="window.__showView(\'configuracion\')">Cancelar</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  if (user.rol === 'arrendador') bindWaConfig();
}

// ── WhatsApp del arrendador: plantilla y prueba del enlace ─────
// Propiedad de ejemplo para la vista previa: la primera publicada o una ficticia
function waPropEjemplo() {
  var user = State.session;
  var p = (State.myProps && State.myProps[0]) || { titulo: 'Apartamento en Chapinero', ciudad: 'bogotá', precio: 1800000, listing: 'rent' };
  return Object.assign({}, p, { contacto: { nombre: [user.nombre, user.apellido].filter(Boolean).join(' '), telefono: getEl('cfg-t') ? getEl('cfg-t').value : user.telefono } });
}

function waConfigHtml(user) {
  return '<div class="wa-cfg">' +
    '<h3>' + WA_ICON + ' Así te contactarán por WhatsApp</h3>' +
    '<p class="form-hint">Este es el mensaje que llega listo cuando un interesado toca <strong>WhatsApp</strong> en una de tus propiedades. ' +
      'Puedes usar ' + WA_VARIABLES.map(function(v) { return '<code>' + v + '</code>'; }).join(' ') + '. Déjalo vacío para usar el predeterminado.</p>' +
    '<div class="mf"><label for="cfg-wa">Plantilla del mensaje de bienvenida</label>' +
      '<textarea id="cfg-wa" rows="3" maxlength="500" placeholder="' + sanitize(WA_PLANTILLA_DEFAULT) + '">' + sanitize(user.waMensaje || '') + '</textarea></div>' +
    '<div class="wa-preview" aria-live="polite"><span class="wa-preview-lbl">Vista previa</span><div class="wa-bubble" id="cfg-wa-prev"></div></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<a class="btn-wa" id="cfg-wa-test" href="#" target="_blank" rel="noopener noreferrer">' + WA_ICON + ' Probar mi enlace de WhatsApp</a>' +
      '<button type="button" class="btn-g" id="cfg-wa-copy">📋 Copiar enlace</button>' +
      '<span class="form-hint" id="cfg-wa-msg"></span>' +
    '</div>' +
    '<p class="form-hint" style="margin-top:8px">💡 Para responder automáticamente, activa el <em>mensaje de bienvenida</em> en WhatsApp Business (Herramientas para la empresa → Mensaje de bienvenida).</p>' +
  '</div>';
}

function bindWaConfig() {
  var tpl = getEl('cfg-wa'), tel = getEl('cfg-t'), prev = getEl('cfg-wa-prev'), test = getEl('cfg-wa-test'), msg = getEl('cfg-wa-msg');
  if (!tpl || !tel) return;
  var link = '';
  var update = function() {
    var texto = waMensajePropiedad(waPropEjemplo(), tpl.value.trim());
    link = waLink(tel.value, texto);
    prev.textContent = texto;
    test.href = link || '#';
    test.classList.toggle('is-disabled', !link);
    msg.textContent = link ? 'Se abrirá tu propio chat con el mensaje de ejemplo.' : (tel.value.trim() ? '⚠️ Número no válido para WhatsApp' : '⚠️ Escribe tu número de WhatsApp');
  };
  tpl.addEventListener('input', update);
  tel.addEventListener('input', update);
  test.addEventListener('click', function(e) {
    if (!link) { e.preventDefault(); showToast(waNumber(tel.value) ? 'Revisa la plantilla' : 'Escribe un número de WhatsApp válido', 'warning'); }
  });
  getEl('cfg-wa-copy').addEventListener('click', function() {
    if (!link) { showToast('Escribe un número de WhatsApp válido', 'warning'); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject())
      .then(function() { showToast('Enlace copiado ✓', 'success'); })
      .catch(function() { window.prompt('Copia tu enlace de WhatsApp:', link); });
  });
  update();
  // Con una propiedad real la vista previa es más fiel
  if (!State.myProps || !State.myProps.length) getMyProps().then(update).catch(function() {});
}

export async function saveConfig() {
  var data = {
    nombre:   getEl('cfg-n') ? getEl('cfg-n').value.trim() : undefined,
    apellido: getEl('cfg-a') ? getEl('cfg-a').value.trim() : undefined,
    telefono: getEl('cfg-t') ? getEl('cfg-t').value.trim() : undefined,
    waMensaje: getEl('cfg-wa') ? getEl('cfg-wa').value.trim() : undefined,
  };
  if (!data.nombre) { showToast('El nombre es obligatorio','warning'); return; }
  if (State.session.rol === 'arrendador' && data.telefono && !waNumber(data.telefono)) {
    showToast('Ese número no sirve para WhatsApp: incluye el indicativo del país (ej. +52 55 1234 5678)', 'warning', 4500); return;
  }
  const r = await UsuariosApi.updateMe(data);
  if (!r || !r.ok) { showToast((r && r.error && r.error.message) || 'No se pudo guardar el perfil','error'); return; }
  Object.assign(State.session, { nombre: r.data.nombre, apellido: r.data.apellido, telefono: r.data.telefono, waMensaje: r.data.waMensaje });
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
  var res = await VisitasApi.findMias();
  var visitas = (res && res.ok) ? res.data : [];
  State.visitas = visitas;

  var cols = '2fr 1fr .8fr 1.4fr';
  var rows = visitas.map(function(v, i) {
    var propTitulo = (v.inquilino && v.inquilino.titulo) ? v.inquilino.titulo : '—';
    return '<div class="t-row" style="grid-template-columns:' + cols + ';background:' + (i%2?'#f9fafb':'#fff') + '">' +
      '<span style="font-size:13px;font-weight:600">' + sanitize(propTitulo) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + sanitize(v.fecha) + '</span>' +
      '<span style="font-size:12.5px;color:var(--t2)">' + sanitize(v.hora) + '</span>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        estadoBadge(v.estado) +
        (v.estado !== 'cancelada' ? rowBtn('Cancelar', 'window.__cancelVisita(\'' + v.id + '\')', 'del') : '') +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Mis Visitas</h1><p class="pg-sub">' + visitas.length + ' agendadas · agéndalas con 📅 desde cualquier tarjeta de Explorar</p></div></div>' +
    '<div class="tbl-wrap">' +
      '<div class="t-head" style="grid-template-columns:' + cols + '">' +
        '<span>Propiedad</span><span>Fecha</span><span>Hora</span><span>Estado</span>' +
      '</div>' +
      (rows || '<div style="padding:30px;text-align:center;color:var(--t3)">Sin visitas agendadas</div>') +
    '</div>';
}

// ── Mi Hogar (inquilino): inmuebles activos ────────────────────
var HOGAR_ESTADO = {
  reservada: { ico: '⏳', lbl: 'Esperando confirmación del arrendador', cls: 'b-w' },
  arrendada: { ico: '🏠', lbl: 'Arrendada · Mi hogar actual',          cls: 'b-ok' },
  vendida:   { ico: '🔑', lbl: 'Comprada · Es tuya',                    cls: 'b-ok' },
};

async function renderMiHogar(el) {
  const props   = await getMiHogar();
  const activos = props.filter(function(p) { return p.estado !== 'reservada'; });
  const pend    = props.filter(function(p) { return p.estado === 'reservada'; });

  function card(p) {
    var est   = HOGAR_ESTADO[p.estado] || { ico: '🏠', lbl: p.estado, cls: 'b-i' };
    var foto  = (p.fotos && p.fotos.length) ? mediaUrl(p.fotos[0]) : '';
    var wa    = waPropiedad(p);
    return '<article class="hogar-card" onclick="window.__openDetail(\'' + sanitize(p.id) + '\')">' +
      '<div class="hogar-img">' + (foto ? '<img src="' + sanitize(foto) + '" alt="' + sanitize(p.titulo) + '" loading="lazy">' : '<div class="pc-noimg">🏠</div>') + '</div>' +
      '<div class="hogar-bd">' +
        '<span class="badge ' + est.cls + '">' + est.ico + ' ' + sanitize(est.lbl) + '</span>' +
        '<h3>' + sanitize(p.titulo) + '</h3>' +
        '<div class="pc-lc">📍 ' + sanitize(cityLabel(p.ciudad)) + (p.barrio ? ' · ' + sanitize(p.barrio) : '') + '</div>' +
        '<div class="hogar-meta"><strong>' + formatCOP(p.precio) + '</strong> ' + (p.listing === 'sale' || p.cierreTipo === 'compra' ? 'COP' : 'COP/mes') +
          (p.cerradaAt ? ' · desde el ' + sanitize(formatFecha(p.cerradaAt)) : '') + '</div>' +
        '<div class="hogar-meta">👤 ' + sanitize((p.contacto && p.contacto.nombre) || 'Arrendador') + '</div>' +
        '<div class="hogar-acts">' +
          '<a class="btn-wa" href="' + sanitize(wa.href) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">' + WA_ICON + ' WhatsApp</a>' +
          (p.estado === 'arrendada' ? '<button class="btn-g" onclick="event.stopPropagation();window.__showView(\'mis-pagos\')">💳 Mis pagos</button>' : '') +
        '</div>' +
      '</div>' +
    '</article>';
  }

  el.innerHTML =
    '<div class="topbar"><div><h1 class="pg-title">Mi Hogar</h1><p class="pg-sub">Mis inmuebles activos: lo que arriendas o compraste</p></div></div>' +
    (props.length
      ? (activos.length ? '<h2 class="hogar-sec">🏠 Mi hogar actual</h2><div class="hogar-grid">' + activos.map(card).join('') + '</div>' : '') +
        (pend.length ? '<h2 class="hogar-sec">⏳ Cierres pendientes</h2><div class="hogar-grid">' + pend.map(card).join('') + '</div>' : '')
      : '<div class="prop-grid-d">' + emptyState('🏡', 'Aún no tienes un hogar activo',
          'Cuando encuentres el inmueble ideal, abre su ficha y toca <strong>🤝 Cerrar arriendo</strong> o <strong>🏠 Comprar</strong>.',
          '<button class="btn-a" style="margin-top:8px" onclick="window.__showView(\'catalogo\')">Explorar propiedades</button>') + '</div>');
}
