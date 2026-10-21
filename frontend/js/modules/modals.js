/**
 * modals.js — Modales conectados al backend API
 */
'use strict';

import { State, addProp, updateProp, deleteProp, getPropById,
         getMyProps, toggleFav, isFav, addVisita, updateVisita, updateVisitaEstado,
         deleteVisita, solicitarVisita, addLead, updateLead, deleteLead,
         addPago, updatePago, deletePago, markPagoAsPaid,
         reportarPago, subirComprobante, quitarComprobante, getPropsReportables,
         getPlanes, suscribirse, cancelarPlan } from './store.js';
import { showToast, showErrorAlert, refreshView, updateBadges, updateSidebarProfile, addPlanoSolicitado } from './ui.js';
import { sanitize, formatCOP, formatNum, formatFecha, parseCOP, capitalize, getEl, safeUrl, waLink, WHATSAPP_SOPORTE,
         CITY_LABELS, AMENITY_LABELS, LISTING_LABELS, desgloseMensual } from '../utils.js';
import { MensajesApi, PropiedadesApi, PagosApi, mediaUrl } from '../api.js';

const MAX_FOTOS      = 20;
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const FOTO_TYPES     = ['image/jpeg', 'image/png', 'image/webp'];
const COMPROBANTE_TYPES = [...FOTO_TYPES, 'application/pdf'];

// ── Helper: crear overlay ─────────────────────────────────────
function createOverlay() {
  const ov = document.createElement('div');
  ov.className = 'modal-bg';
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  return ov;
}

// ── Helper: diálogo de confirmación (devuelve Promise<boolean>) ──
// message puede traer HTML: quien llama debe pasar los datos por sanitize()
export function confirmDialog(title, message, okLabel = 'Eliminar') {
  if (window.Swal) {
    return window.Swal.fire({
      icon: 'warning', titleText: title, html: message,
      showCancelButton: true, confirmButtonText: okLabel, cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      reverseButtons: true, focusCancel: true,
    }).then(r => r.isConfirmed);
  }
  return new Promise(resolve => {
    const ov = createOverlay();
    ov.innerHTML = `
      <div class="modal-box" style="max-width:380px;text-align:center;padding:36px 32px 28px">
        <div style="font-size:40px;margin-bottom:14px">🗑️</div>
        <h3 style="font-size:20px;font-weight:700;color:var(--t1);margin-bottom:9px">${sanitize(title)}</h3>
        <p style="font-size:14px;color:var(--t2);margin-bottom:24px;line-height:1.6">${message}</p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn-g" data-act="no">Cancelar</button>
          <button class="btn-d" data-act="ok">${sanitize(okLabel)}</button>
        </div>
      </div>`;
    const done = (val) => { ov.remove(); resolve(val); };
    ov.querySelector('[data-act="no"]').onclick = () => done(false);
    ov.querySelector('[data-act="ok"]').onclick = () => done(true);
    ov.addEventListener('click', e => { if (e.target === ov) resolve(false); });
  });
}

// Botón en estado "cargando" mientras corre una acción async
async function withLoading(btn, fn) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳…';
  try { return await fn(); }
  finally { btn.disabled = false; btn.textContent = label; }
}

function propOptions(props, selectedId) {
  return props.map(p => `<option value="${p.id}"${p.id === selectedId ? ' selected' : ''}>${sanitize(p.titulo)}</option>`).join('');
}

// Fecha local AAAA-MM-DD (toISOString usa UTC: en Colombia después de las 7 p. m. daría el día siguiente)
function today() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

// ── Agendamiento: días y horarios ─────────────────────────────
const HORARIOS_VISITA = ['08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'];

function isoLocal(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

// [{ iso, etiqueta: 'Hoy'|'Mañana'|'mié', num: '23', mes: 'oct', largo: 'miércoles 23 de octubre' }]
function proximosDias(n) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy); d.setDate(hoy.getDate() + i);
    const dow = d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
    return {
      iso: isoLocal(d),
      etiqueta: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : capitalize(dow),
      num: String(d.getDate()),
      mes: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
      largo: d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  });
}

// Hoy solo se ofrecen horas con al menos 1 hora de anticipación
function horariosDisponibles(iso) {
  if (iso !== today()) return HORARIOS_VISITA;
  const limite = new Date(Date.now() + 60 * 60000);
  const min = String(limite.getHours()).padStart(2, '0') + ':' + String(limite.getMinutes()).padStart(2, '0');
  return limite.getDate() !== new Date().getDate() ? [] : HORARIOS_VISITA.filter(h => h >= min);
}

// "14:00" → "2:00 p. m."
function hora12(h) {
  const [hh, mm] = h.split(':').map(Number);
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
}

// Pasos explicativos cortos para procesos clave (pasos con HTML propio, sin datos del usuario)
function helpSteps(pasos) {
  return `<ol class="help-steps" aria-label="Cómo funciona">${pasos.map(p => `<li><span>${p}</span></li>`).join('')}</ol>`;
}

// Formatea un input de dinero con separador de miles mientras se escribe (1800000 → 1.800.000)
function bindMoneyInput(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    const n = parseCOP(input.value);
    input.value = Number.isFinite(n) ? formatNum(n) : '';
  });
}

// ── Soft Gate ─────────────────────────────────────────────────
export async function openSoftGate(propId) {
  const prop = await getPropById(propId);
  if (!prop) return;
  const ov = createOverlay();
  ov.className = 'gate-bg';
  ov.innerHTML = `
    <div class="gate-box">
      <span class="gate-ico">🏡</span>
      <div class="gate-title">¡Casi listo!</div>
      <div class="gate-sub">Crea tu cuenta gratuita para ver los detalles completos,
        galería de ${(prop.fotos??[]).length} fotos${prop.tourVirtual?', tour virtual 360°':''} y contactar al arrendador.</div>
      <div class="gate-perks">
        <div class="gate-perk"><div class="gp-ico">📸</div>${(prop.fotos??[]).length} fotos de alta calidad</div>
        ${prop.tourVirtual?`<div class="gate-perk"><div class="gp-ico">🥽</div>Tour virtual ${sanitize(prop.tourTipo??'360°')}</div>`:''}
        ${prop.mapa2d?'<div class="gate-perk"><div class="gp-ico">🗺</div>Mapa 2D interactivo</div>':''}
        <div class="gate-perk"><div class="gp-ico">❤️</div>Guarda favoritos</div>
        <div class="gate-perk"><div class="gp-ico">💬</div>Chat con el arrendador</div>
      </div>
      <button class="btn-auth" style="margin-bottom:10px"
        onclick="this.closest('.gate-bg').remove();window.__openAuth('r')">🚀 Crear cuenta gratis</button>
      <button class="btn-g" style="width:100%"
        onclick="this.closest('.gate-bg').remove();window.__openAuth('l')">Ya tengo cuenta — Iniciar sesión</button>
    </div>`;
}

// ── Detalle de propiedad ──────────────────────────────────────
export async function openDetail(propId) {
  // Se pide al backend para traer el contacto del arrendador (la caché del listado no lo incluye)
  const fresh = await PropiedadesApi.findOne(propId).catch(() => null);
  const prop  = fresh?.ok ? fresh.data : await getPropById(propId);
  if (!prop) { showToast('Propiedad no encontrada','error'); return; }

  const photos    = (prop.fotos ?? []).map(mediaUrl);
  const tourUrl   = safeUrl(prop.tourUrl);
  const videoUrl  = safeUrl(prop.video);
  const esPropia  = State.session?.id === prop.ownerId;
  const esInq     = State.session?.rol === 'inquilino';
  let   activeTab = 'fotos';
  let   activePhoto = 0;

  const tabs = [
    { k:'fotos',  label:`📸 Fotos (${photos.length})`, show: true },
    { k:'tour',   label:`🥽 Tour Virtual`,              show: prop.tourVirtual && !!tourUrl },
    { k:'mapa',   label:'🗺 Mapa 2D',                   show: prop.mapa2d },
    { k:'video',  label:'🎬 Video',                      show: !!videoUrl },
  ].filter(t => t.show);

  const ov = createOverlay();

  function buildHtml() {
    return `<div class="modal-box" style="max-width:920px">
      <button class="btn-mx" id="det-x" style="position:absolute;top:14px;right:14px;z-index:9">✕</button>
      <div style="padding:22px 28px 16px;border-bottom:1px solid var(--bo)">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <span class="badge b-i">${capitalize(sanitize(prop.tipo))}</span>
          ${prop.estrato?`<span style="padding:4px 10px;border-radius:99px;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:700">Estrato ${prop.estrato}</span>`:''}
          ${prop.destacado?'<span class="badge b-w">⭐ Destacado</span>':''}
          ${prop.tourVirtual?`<span class="badge b-ok">🥽 ${sanitize(prop.tourTipo??'Tour')}</span>`:''}
          ${prop.mapa2d?'<span class="badge b-ok">🗺 Mapa 2D</span>':''}
        </div>
        <h2 style="font-size:22px;font-weight:800;color:var(--t1);margin-bottom:5px">${sanitize(prop.titulo)}</h2>
        <p style="font-size:13px;color:var(--t2)">📍 ${sanitize(CITY_LABELS[prop.ciudad]??prop.ciudad)}${prop.barrio?` — ${sanitize(prop.barrio)}`:''}</p>
      </div>
      <div class="gal-tabs">
        ${tabs.map(t=>`<button class="gt${t.k===activeTab?' active':''}" data-tab="${t.k}">${t.label}</button>`).join('')}
      </div>

      <!-- Fotos -->
      <div class="gt-pane${activeTab==='fotos'?' active':''}" id="pane-fotos">
        ${photos.length?`
          <div class="foto-main-wrap">
            <img id="foto-main-img" class="foto-main" src="${sanitize(photos[activePhoto])}" alt="${sanitize(prop.titulo)}"/>
            <button style="position:absolute;top:50%;left:12px;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;font-size:18px;display:grid;place-items:center" onclick="window.__navFoto(-1)">‹</button>
            <button style="position:absolute;top:50%;right:12px;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;font-size:18px;display:grid;place-items:center" onclick="window.__navFoto(1)">›</button>
            <div id="foto-counter" style="position:absolute;bottom:14px;right:14px;padding:5px 12px;border-radius:99px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;font-weight:600">${activePhoto+1} / ${photos.length}</div>
          </div>
          <div class="foto-thumbs">
            ${photos.map((f,i)=>`<img class="foto-thumb${i===activePhoto?' active':''}" src="${sanitize(f)}" onclick="window.__setFoto(${i})" loading="lazy" onerror="this.style.display='none'">`).join('')}
          </div>`
        :'<div style="height:200px;display:grid;place-items:center;font-size:48px;color:var(--t3)">🏠</div>'}
      </div>

      ${prop.tourVirtual && tourUrl?`
        <div class="gt-pane${activeTab==='tour'?' active':''}" id="pane-tour" style="padding:16px 20px">
          ${tourFrameHtml(tourUrl, prop.titulo)}
        </div>`:''}

      ${prop.mapa2d?`
        <div class="gt-pane${activeTab==='mapa'?' active':''}" id="pane-mapa">
          <div style="padding:24px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center">
            <div style="font-size:48px">🗺️</div>
            <h3 style="font-size:17px;font-weight:700;color:var(--t1)">Mapa 2D del entorno</h3>
            <p style="font-size:14px;color:var(--t2);max-width:360px;line-height:1.6">Ubicación y entorno del barrio ${sanitize(prop.barrio??'')}.</p>
            <p style="font-size:12px;color:var(--t3)">En producción: Mapbox GL JS</p>
          </div>
        </div>`:''}

      ${videoUrl?`
        <div class="gt-pane${activeTab==='video'?' active':''}" id="pane-video" style="padding:16px 20px">
          <div style="width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000">
            <iframe src="${sanitize(videoUrl)}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>
          </div>
        </div>`:''}

      <div class="det-grid">
        <div>
          <div style="display:flex;gap:18px;flex-wrap:wrap;padding:14px 0;border-top:1px solid var(--bo);border-bottom:1px solid var(--bo);margin-bottom:16px">
            <span style="font-size:13px;color:var(--t2)">🛏️ <strong>${formatNum(prop.habitaciones)}</strong> dorm.</span>
            <span style="font-size:13px;color:var(--t2)">🚿 <strong>${formatNum(prop.banos)}</strong> baños</span>
            <span style="font-size:13px;color:var(--t2)">📐 <strong>${formatNum(prop.metros)}</strong> m²</span>
            ${prop.parqueaderos?`<span style="font-size:13px;color:var(--t2)">🚗 <strong>${formatNum(prop.parqueaderos)}</strong> parq.</span>`:''}
            ${prop.metros?`<span style="font-size:13px;color:var(--t2)">💲 <strong>${formatCOP(Math.round(prop.precio / prop.metros))}</strong> /m²</span>`:''}
          </div>
          ${prop.descripcion?`<p style="font-size:14px;color:var(--t2);line-height:1.7;margin-bottom:18px;white-space:pre-line">${sanitize(prop.descripcion)}</p>`:''}
          <h4 style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Comodidades</h4>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${(prop.comodidades??[]).map(a=>`<span class="pc-tg">${AMENITY_LABELS[a]??sanitize(a)}</span>`).join('')}
          </div>
        </div>
        <div class="det-side">
          <div style="font-size:28px;font-weight:800;color:var(--pr)">${formatCOP(prop.precio)}</div>
          <div style="font-size:12px;color:var(--t3);margin-top:-8px">${prop.listing === 'sale' ? 'COP · Venta' : 'COP / mes'}</div>
          ${desgloseHtml(prop)}
          ${esInq?`<button class="btn-a btn-xl" onclick="window.__solicitarVisita('${prop.id}')" aria-describedby="visita-hint">📅 Agendar visita</button>
            <p class="btn-hint" id="visita-hint">Elige día y hora en 2 toques; el arrendador te confirma.</p>`:''}
          ${!esPropia?`<button class="btn-p btn-xl" style="background:#0f172a" onclick="window.__sendMsg('${prop.id}','${prop.ownerId}')">💬 Contactar arrendador</button>`:''}
          ${!esPropia ? `<a class="btn-wa btn-xl" href="${sanitize(waPropiedad(prop))}" target="_blank" rel="noopener noreferrer" aria-describedby="wa-hint">${WA_ICON} Escribir por WhatsApp</a>
            <p class="btn-hint" id="wa-hint">Se abre WhatsApp con un mensaje listo sobre esta propiedad. Solo presiona <strong>Enviar</strong>.</p>` : ''}
          <button id="det-fav-btn" class="btn-xl" style="padding:10px;border-radius:10px;border:1.5px solid #fed7aa;background:#fff8ed;color:#b45309;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--f)"
            onclick="window.__toggleFavDetail('${prop.id}',this)">${isFav(prop.id)?'❤️ En favoritos':'🤍 Guardar'}</button>
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bo);font-size:12px;color:var(--t3);line-height:2">
            👤 ${sanitize(prop.contacto?.nombre || 'Arrendador')}<br>
            ${prop.contacto?.telefono ? `📞 ${sanitize(prop.contacto.telefono)}<br>` : '<span>📞 Contacto vía INMOVISIÓN 360</span><br>'}
            ${prop.contacto?.verified ? '<span style="color:var(--ac);font-weight:600">✅ Verificado</span>' : ''}
          </div>
        </div>
      </div>
      <div style="height:16px"></div>
    </div>`;
  }

  ov.innerHTML = buildHtml();
  bindDetail();

  function bindDetail() {
    const closeBtn = ov.querySelector('#det-x');
    if (closeBtn) closeBtn.onclick = () => ov.remove();

    ov.querySelectorAll('.gt').forEach(tab => tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      ov.innerHTML = buildHtml();
      bindDetail();
    }));
  }

  window.__navFoto = (dir) => {
    if (!photos.length) return;
    activePhoto = (activePhoto + dir + photos.length) % photos.length;
    updateFotoUI();
  };
  window.__setFoto = (idx) => { activePhoto = idx; updateFotoUI(); };

  function updateFotoUI() {
    const img = ov.querySelector('#foto-main-img');
    if (img) { img.style.opacity='0'; img.src=photos[activePhoto]; img.onload=()=>{img.style.transition='opacity .25s';img.style.opacity='1';}; }
    ov.querySelectorAll('.foto-thumb').forEach((t,i)=>t.classList.toggle('active',i===activePhoto));
    const ctr = ov.querySelector('#foto-counter');
    if (ctr) ctr.textContent=`${activePhoto+1} / ${photos.length}`;
  }
}

// ── Desglose mensual estimado (canon + administración + servicios) ──
function desgloseHtml(prop) {
  const d = desgloseMensual(prop);
  if (!d) return '';
  const fila = (lbl, val, nota = '') =>
    `<div class="dsg-row"><span>${lbl}${nota ? `<small>${nota}</small>` : ''}</span><strong>${val}</strong></div>`;
  return `
    <div class="dsg" role="group" aria-labelledby="dsg-tit">
      <div class="dsg-tit" id="dsg-tit">🧾 Desglose mensual estimado</div>
      ${fila('Canon de arriendo', formatCOP(d.canon))}
      ${d.admin != null
        ? fila('Administración', formatCOP(d.admin))
        : fila('Administración', '<span class="dsg-na">No informada</span>', 'Pregúntala al arrendador')}
      ${fila('Servicios públicos', (d.servEst ? '≈ ' : '') + formatCOP(d.servicios),
             d.servEst ? `Estimado para estrato ${sanitize(prop.estrato ?? '3')} y ${formatNum(prop.metros)} m²` : 'Valor informado por el arrendador')}
      <div class="dsg-total"><span>Total al mes</span><strong>${d.servEst || d.admin == null ? '≈ ' : ''}${formatCOP(d.total)}</strong></div>
      <p class="dsg-nota">Agua, energía y gas. Internet y otros consumos no incluidos.</p>
    </div>`;
}

// ── WhatsApp ──────────────────────────────────────────────────
export const WA_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';

// Chat con el arrendador (o con soporte si no registró teléfono), con el título de la propiedad
function waPropiedad(prop) {
  const ciudad  = CITY_LABELS[prop.ciudad] ?? prop.ciudad;
  const nombre  = (prop.contacto?.nombre || '').split(' ')[0];
  const texto   = `Hola${nombre ? ' ' + nombre : ''} 👋, vi en INMOVISIÓN 360 la propiedad "${prop.titulo}" ` +
                  `(${ciudad}, ${formatCOP(prop.precio)} ${prop.listing === 'sale' ? 'COP' : 'COP/mes'}) y me gustaría recibir más información.`;
  return waLink(prop.contacto?.telefono, texto) || waLink(WHATSAPP_SOPORTE, texto);
}

window.__toggleFavDetail = async (propId, btn) => {
  const added = await toggleFav(propId);
  btn.textContent = added ? '❤️ En favoritos' : '🤍 Guardar';
  if (added) showToast('Guardado en favoritos ❤️','success');
  await updateBadges();
};

window.__sendMsg = async (propId, ownerId) => {
  if (!ownerId) { showToast('No se pudo identificar al arrendador','error'); return; }
  const r = await MensajesApi.send({ prop_id: propId, destinatario_id: ownerId, texto: '¡Hola! Me interesa tu propiedad.' });
  if (!r?.ok) { showToast(r?.error?.message || 'No se pudo enviar el mensaje','error'); return; }
  showToast('Mensaje enviado al arrendador ✓','success');
};

// ── Visor de tours 360° ───────────────────────────────────────
function tourFrameHtml(url, titulo) {
  return `<div class="tour-frame">
      <iframe src="${sanitize(url)}" title="Tour virtual — ${sanitize(titulo ?? '')}" loading="lazy"
        allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer; vr" allowfullscreen></iframe>
      <div class="tour-tools">
        <button type="button" class="tour-btn" onclick="window.__tourFullscreen(this)" title="Pantalla completa (Esc para salir)">⛶ <span>Pantalla completa</span></button>
        <a class="tour-btn" href="${sanitize(url)}" target="_blank" rel="noopener noreferrer" title="Abrir en una pestaña nueva">↗</a>
      </div>
    </div>`;
}

// Usa la Fullscreen API; si el navegador no la permite (iOS), expande el visor sobre toda la ventana
window.__tourFullscreen = (btn) => {
  const frame = btn.closest('.tour-frame');
  if (!frame) return;
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl)                              return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  if (frame.classList.contains('tour-fs')) return setPseudoFs(frame, false);
  const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
  if (!req) return setPseudoFs(frame, true);
  try {
    const r = req.call(frame);
    if (r && r.catch) r.catch(() => setPseudoFs(frame, true));
  } catch { setPseudoFs(frame, true); }
};

function setPseudoFs(frame, on) {
  frame.classList.toggle('tour-fs', on);
  document.body.style.overflow = on ? 'hidden' : '';
  syncTourBtn(frame, on);
}

function syncTourBtn(frame, on) {
  const lbl = frame.querySelector('.tour-btn span');
  if (lbl) lbl.textContent = on ? 'Salir' : 'Pantalla completa';
}

['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  document.querySelectorAll('.tour-frame').forEach(f => syncTourBtn(f, f === fsEl));
}));

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.tour-frame.tour-fs').forEach(f => setPseudoFs(f, false));
});

// Vista rápida del tour desde la tarjeta, sin abrir todo el detalle
export async function openTourViewer(propId) {
  const prop = await getPropById(propId);
  const url  = safeUrl(prop?.tourUrl);
  if (!prop || !url) { showToast('Esta propiedad no tiene tour virtual','warning'); return; }
  const ov = createOverlay();
  ov.innerHTML = `
    <div class="modal-box" style="max-width:1100px;width:96vw">
      <div class="mh">
        <div><div class="mh-title">🥽 ${sanitize(prop.tourTipo || 'Tour virtual 360°')}</div>
             <div class="mh-sub">${sanitize(prop.titulo)} · ${formatCOP(prop.precio)} ${prop.listing === 'sale' ? 'COP' : 'COP/mes'}</div></div>
        <button class="btn-mx" data-x>✕</button>
      </div>
      <div style="padding:16px 20px 20px">${tourFrameHtml(url, prop.titulo)}</div>
      <div class="mf-foot">
        <button class="btn-g" data-x>Cerrar</button>
        <button class="btn-a" id="tv-det">Ver detalles de la propiedad</button>
      </div>
    </div>`;
  ov.querySelectorAll('[data-x]').forEach(b => b.onclick = () => ov.remove());
  ov.querySelector('#tv-det').onclick = () => { ov.remove(); openDetail(propId); };
}

// ── Wompi ─────────────────────────────────────────────────────
export async function openWompi(planName, priceLabel) {
  const ov = createOverlay();
  ov.style.zIndex = '600';
  const methods = ['🏦 PSE','📱 Nequi','💙 Daviplata','💳 Tarjeta'];
  ov.innerHTML = `
    <div class="wompi-box">
      <div style="font-size:22px;font-weight:800;color:var(--pr)">💳 INMOVISIÓN 360 × Wompi</div>
      <p style="font-size:13px;color:var(--t3);margin-bottom:16px">Pago seguro certificado</p>
      <div style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:20px;border:1px solid var(--bo)">
        <div style="font-size:20px;font-weight:700;color:var(--t1)">${sanitize(planName)}</div>
        <div style="font-size:34px;font-weight:800;color:var(--pr);margin-top:4px">${sanitize(priceLabel)}<span style="font-size:14px;font-weight:400;color:var(--t3)"> COP/mes</span></div>
      </div>
      <div style="font-size:11.5px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;text-align:left">Método de pago</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">
        ${methods.map(m=>`<button style="padding:11px;border:1.5px solid var(--bo);border-radius:12px;font-size:13.5px;cursor:pointer;background:#fff;font-family:var(--f);font-weight:500" onmouseover="this.style.borderColor='var(--pr)'" onmouseout="this.style.borderColor='var(--bo)'" onclick="window.__wompiPay('${sanitize(m)}','${sanitize(planName)}')">${m}</button>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:9px;padding:12px 14px;background:#f0fdf4;border-radius:12px;margin-bottom:20px">
        <span style="font-size:18px">🔒</span>
        <span style="font-size:12.5px;color:var(--t2)">Pago encriptado SSL · Cumple normativa SFC Colombia</span>
      </div>
      <button class="btn-g" style="width:100%" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
    </div>`;
}

window.__wompiPay = async (method, plan) => {
  document.querySelectorAll('.modal-bg').forEach(m=>m.remove());
  showToast(`✅ Procesando pago con ${method}…`,'info');
  // En producción: redirigir a wompi_checkout_url
  setTimeout(() => showToast(`Plan ${plan} activado ✓`,'success'), 1500);
};

// ── Planes: contratar / cancelar (usa /v1/suscripciones) ──────
export async function openPlanCheckout(planId) {
  const plan = (await getPlanes()).find(p => p.id === planId);
  if (!plan) { showToast('Plan no encontrado','error'); return; }
  if (plan.categoria === 'plano') return openPlanoCheckout(planId);
  const gratis  = plan.precio === 0;
  const methods = [['PSE','🏦 PSE'],['Nequi','📱 Nequi'],['Daviplata','💙 Daviplata'],['Tarjeta','💳 Tarjeta']];
  let metodo    = 'PSE';
  const ov = createOverlay();
  ov.style.zIndex = '600';
  ov.innerHTML = `
    <div class="wompi-box">
      <div style="font-size:22px;font-weight:800;color:var(--pr)">${gratis ? '⭐ Cambiar de plan' : '💳 INMOVISIÓN 360 × Wompi'}</div>
      <p style="font-size:13px;color:var(--t3);margin-bottom:16px">${gratis ? 'Sin costo' : 'Pago seguro certificado'}</p>
      <div style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:20px;border:1px solid var(--bo)">
        <div style="font-size:20px;font-weight:700;color:var(--t1)">Plan ${sanitize(plan.nombre)}</div>
        <div style="font-size:34px;font-weight:800;color:var(--pr);margin-top:4px">${gratis ? 'Gratis' : formatCOP(plan.precio)}${gratis ? '' : '<span style="font-size:14px;font-weight:400;color:var(--t3)"> COP/mes</span>'}</div>
        <div style="font-size:12.5px;color:var(--t2);margin-top:6px">${plan.propsMax ? `Hasta ${formatNum(plan.propsMax)} propiedades` : 'Propiedades ilimitadas'}</div>
      </div>
      ${gratis ? '' : `
      <div style="font-size:11.5px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;text-align:left">Método de pago</div>
      <div class="pay-methods" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">
        ${methods.map(([val,lbl]) => `<button type="button" class="pay-m${val===metodo?' active':''}" data-m="${val}">${lbl}</button>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:9px;padding:12px 14px;background:#f0fdf4;border-radius:12px;margin-bottom:20px">
        <span style="font-size:18px">🔒</span>
        <span style="font-size:12.5px;color:var(--t2)">Pago encriptado SSL · Cumple normativa SFC Colombia</span>
      </div>`}
      <div style="display:flex;gap:10px">
        <button class="btn-g" style="flex:1" data-x>Cancelar</button>
        <button class="btn-a" style="flex:1.4;justify-content:center" id="plan-ok">${gratis ? 'Confirmar cambio' : `Pagar ${formatCOP(plan.precio)}`}</button>
      </div>
    </div>`;

  ov.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    metodo = b.dataset.m;
    ov.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('active', x === b));
  });
  ov.querySelector('[data-x]').onclick = () => ov.remove();
  ov.querySelector('#plan-ok').onclick = async (e) => {
    try {
      await withLoading(e.currentTarget, () => suscribirse(plan.id, gratis ? undefined : metodo));
      ov.remove();
      showToast(`Plan ${plan.nombre} activado ✓`,'success');
      updateSidebarProfile();
      await refreshView();
    } catch(err) { showToast(err.message || 'No se pudo activar el plan','error'); }
  };
}

// Planos 2D/3D: contratación SOLO VISUAL. No llama a /suscripciones ni cambia el plan del usuario
export async function openPlanoCheckout(planId) {
  const plano = (await getPlanes()).find(p => p.id === planId && p.categoria === 'plano');
  if (!plano) { showToast('Oferta no disponible','error'); return; }
  const props = State.session?.rol === 'arrendador' ? await getMyProps() : [];
  const ov = createOverlay();
  ov.style.zIndex = '600';
  ov.innerHTML = `
    <div class="wompi-box">
      <div style="font-size:22px;font-weight:800;color:var(--pr)">${plano.id === 'plano_3d' ? '🧊' : '📐'} ${sanitize(plano.nombre)}</div>
      <p style="font-size:13px;color:var(--t3);margin-bottom:16px">${sanitize(plano.descripcion ?? '')}</p>
      <div style="background:#f9fafb;border-radius:16px;padding:18px 20px;margin-bottom:18px;border:1px solid var(--bo);text-align:left">
        <div style="font-size:30px;font-weight:800;color:var(--pr)">${formatCOP(plano.precio)}<span style="font-size:13px;font-weight:400;color:var(--t3)"> COP · pago único</span></div>
        <ul class="plan-feats" style="margin-top:10px">${(plano.features ?? []).map(f => `<li>${sanitize(f)}</li>`).join('')}</ul>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;text-align:left;margin-bottom:18px">
        ${props.length ? `<div class="mf"><label>Propiedad</label><select id="pl-prop">${propOptions(props)}</select></div>` : ''}
        <div class="mf"><label>Teléfono de contacto</label><input id="pl-tel" type="tel" placeholder="+57 300 000 0000" value="${sanitize(State.session?.telefono ?? '')}"/></div>
      </div>
      <div style="display:flex;align-items:center;gap:9px;padding:11px 14px;background:#eff3fb;border-radius:12px;margin-bottom:18px;text-align:left">
        <span style="font-size:18px">ℹ️</span>
        <span style="font-size:12.5px;color:var(--t2)">Demostración: no se realiza ningún cobro. Un asesor te contactaría para agendar la toma de medidas.</span>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-g" style="flex:1" data-x>Cancelar</button>
        <button class="btn-a" style="flex:1.4;justify-content:center" id="pl-ok">Solicitar ${sanitize(plano.nombre)}</button>
      </div>
    </div>`;
  ov.querySelector('[data-x]').onclick = () => ov.remove();
  ov.querySelector('#pl-ok').onclick = async () => {
    const tel = getEl('pl-tel').value.trim();
    if (tel.replace(/\D/g, '').length < 7) return showToast('Ingresa un teléfono de contacto válido','warning');
    addPlanoSolicitado(plano.id);
    ov.remove();
    showToast(`Solicitud de ${plano.nombre} recibida ✓ — te contactaremos pronto`,'success', 4500);
    await refreshView();
  };
}

export async function confirmCancelPlan() {
  const ok = await confirmDialog('¿Cancelar suscripción?', 'Tu cuenta volverá al plan <strong>Free</strong> y sus límites.', 'Cancelar plan');
  if (!ok) return;
  try {
    await cancelarPlan();
    showToast('Suscripción cancelada','info');
    updateSidebarProfile();
    await refreshView();
  } catch(e) { showToast(e.message || 'No se pudo cancelar','error'); }
}

// Inquilino: inicia el checkout de Wompi para un pago pendiente
export async function pagarPago(pagoId) {
  const r = await PagosApi.iniciarWompi(pagoId);
  if (!r?.ok) { showToast(r?.error?.message || 'No se pudo iniciar el pago','error'); return; }
  const url = r.data?.wompi_checkout_url;
  if (url && /^https:\/\//.test(url)) window.open(url, '_blank', 'noopener');
  showToast('Abriendo el checkout de Wompi… el pago se confirmará automáticamente','info', 4500);
}

// ── Wizard: Crear/Editar propiedad ────────────────────────────
export async function openPropertyForm(propId = null) {
  const prop = propId ? await getPropById(propId) : null;
  let habitaciones = prop?.habitaciones ?? 1;
  let banos        = prop?.banos        ?? 1;
  let currentStep  = 0;
  const ov = createOverlay();

  ov.innerHTML = `
    <div class="modal-box" style="max-width:700px">
      <div class="mh">
        <div><div class="mh-title">${propId?'✏️ Editar propiedad':'🏠 Nueva propiedad'}</div>
             <div class="mh-sub">${propId?'Actualiza los datos':'Completa paso a paso'}</div></div>
        <button class="btn-mx" id="fx">✕</button>
      </div>
      <div class="form-steps-nav">
        <button class="fstep-btn active" data-step="0"><span class="fstep-num">1</span>Básico</button>
        <button class="fstep-btn"        data-step="1"><span class="fstep-num">2</span>Detalles</button>
        <button class="fstep-btn"        data-step="2"><span class="fstep-num">3</span>Fotos y Tour</button>
        <button class="fstep-btn"        data-step="3"><span class="fstep-num">4</span>Comodidades</button>
      </div>

      <!-- Paso 1 -->
      <div class="fstep-pane active" id="fsp-0"><div class="mgrid">
        <div class="mf span2"><label>Título *</label><input id="ft" value="${sanitize(prop?.titulo??'')}" placeholder="Ej: Penthouse Rosales 360°" maxlength="80"/></div>
        <div class="mf"><label>Ciudad *</label><select id="fc"><option value="">Selecciona…</option>${Object.entries(CITY_LABELS).map(([v,l])=>`<option value="${v}"${prop?.ciudad===v?' selected':''}>${l}</option>`).join('')}</select></div>
        <div class="mf"><label>Barrio</label><input id="fb" value="${sanitize(prop?.barrio??'')}" placeholder="Ej: Rosales"/></div>
        <div class="mf"><label>Tipo *</label><select id="ftp"><option value="">Selecciona…</option>${['apartamento','casa','villa','loft','estudio'].map(t=>`<option value="${t}"${prop?.tipo===t?' selected':''}>${capitalize(t)}</option>`).join('')}</select></div>
        <div class="mf"><label>Modalidad</label><select id="fls">
          ${['rent','sale','rent_sale','vacation'].map(l=>`<option value="${l}"${prop?.listing===l?' selected':''}>${LISTING_LABELS[l]??l}</option>`).join('')}
        </select></div>
        <div class="mf"><label>Precio (COP) *</label><input id="fp" inputmode="numeric" autocomplete="off" value="${prop?.precio ? formatNum(prop.precio) : ''}" placeholder="1.800.000"/></div>
        <div class="mf"><label>Estrato</label><select id="fest"><option value="">Sin estrato</option>${[1,2,3,4,5,6].map(e=>`<option value="${e}"${prop?.estrato===e?' selected':''}>${e}</option>`).join('')}</select></div>
        <div class="mf"><label>Administración / mes <span style="font-weight:400;color:var(--t3)">— opcional</span></label><input id="fadm" inputmode="numeric" autocomplete="off" value="${prop?.administracion != null ? formatNum(prop.administracion) : ''}" placeholder="Ej: 350.000"/></div>
        <div class="mf"><label>Servicios / mes <span style="font-weight:400;color:var(--t3)">— opcional</span></label><input id="fserv" inputmode="numeric" autocomplete="off" value="${prop?.serviciosEst != null ? formatNum(prop.serviciosEst) : ''}" placeholder="Vacío = se estima"/></div>
        <p class="mf span2 form-hint">Con estos valores la ficha muestra a los interesados el costo total al mes. Si dejas los servicios vacíos, se estiman por estrato y área.</p>
      </div></div>

      <!-- Paso 2 -->
      <div class="fstep-pane" id="fsp-1"><div class="mgrid">
        <div class="mf"><label>Área m² *</label><input id="fm" type="number" value="${prop?.metros??''}" placeholder="90" min="10"/></div>
        <div class="mf"><label>Parqueaderos</label><input id="fpark" type="number" value="${prop?.parqueaderos??0}" min="0"/></div>
        <div class="mf"><label>Habitaciones</label><div class="stepper"><button type="button" class="step-b" id="hd">−</button><span class="step-v" id="hv">${habitaciones}</span><button type="button" class="step-b" id="hi">+</button></div></div>
        <div class="mf"><label>Baños</label><div class="stepper"><button type="button" class="step-b" id="bd">−</button><span class="step-v" id="bv">${banos}</span><button type="button" class="step-b" id="bi">+</button></div></div>
        <div class="mf span2"><label>Descripción</label><textarea id="fdesc" rows="3" maxlength="2000" style="resize:vertical" placeholder="Describe lo mejor del inmueble: vista, acabados, ubicación…">${sanitize(prop?.descripcion??'')}</textarea></div>
        <div class="mf span2"><label>🎬 Video YouTube embed</label><input id="fvideo" type="url" value="${sanitize(prop?.video??'')}" placeholder="https://www.youtube.com/embed/…"/></div>
      </div></div>

      <!-- Paso 3 — Fotos y Tour -->
      <div class="fstep-pane" id="fsp-2"><div class="mgrid">

        <div class="mf span2">
          <label>📸 Subir fotos desde tu computador</label>
          <div id="drop-zone"
            style="border:2px dashed var(--bo);border-radius:14px;padding:26px;text-align:center;cursor:pointer;background:#f9fafb;transition:.2s"
            onclick="document.getElementById('file-input').click()"
            ondragover="event.preventDefault();this.style.borderColor='var(--pr)';this.style.background='#eff3fb'"
            ondragleave="this.style.borderColor='var(--bo)';this.style.background='#f9fafb'"
            ondrop="event.preventDefault();this.style.borderColor='var(--bo)';this.style.background='#f9fafb';window.__handleDrop(event)">
            <div style="font-size:30px;margin-bottom:6px">📁</div>
            <div style="font-size:14px;font-weight:600;color:var(--t1)">Arrastra fotos aquí o haz clic para elegir</div>
            <div style="font-size:11.5px;color:var(--t3);margin-top:4px">JPG, PNG, WEBP · Máx. 5 MB por foto · Hasta ${MAX_FOTOS} fotos</div>
          </div>
          <input id="file-input" type="file" multiple accept="image/jpeg,image/png,image/webp" style="display:none"/>
          <div id="foto-preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        </div>

        <div class="mf span2">
          <label style="color:var(--t3);font-size:10px">O agrega URLs externas, una por línea (alternativa a subir archivos)</label>
          <textarea id="ffotos" rows="2" style="resize:none;font-size:12px" placeholder="https://foto1.jpg"></textarea>
        </div>

        <div class="mf span2">
          <label>🥽 URL Tour Virtual (Matterport, Floorfy, Kuula…)</label>
          <input id="ftour" type="url" value="${sanitize(prop?.tourUrl??'')}" placeholder="https://my.matterport.com/show/?m=…"/>
        </div>

      </div></div>

      <!-- Paso 4 -->
      <div class="fstep-pane" id="fsp-3"><div class="mgrid">
        <div class="mf span2"><label>Comodidades</label>
          <div class="am-grid">
            ${Object.entries(AMENITY_LABELS).map(([val,lbl])=>`
              <label class="am-opt"><input type="checkbox" class="am-cb" value="${val}"${(prop?.comodidades??[]).includes(val)?' checked':''}>
              <div class="am-box">${lbl}</div></label>`).join('')}
          </div></div>
      </div></div>

      <div class="mf-foot">
        <button class="btn-g" id="fc2">Cancelar</button>
        <button class="btn-g" id="fbk" style="display:none">← Anterior</button>
        <button class="btn-p" id="fnx">Siguiente →</button>
        <button class="btn-a" id="fok" style="display:none">${propId?'💾 Guardar':'🚀 Publicar'}</button>
      </div>
    </div>`;

  // Stepper
  const stepBtns  = ov.querySelectorAll('.fstep-btn');
  const stepPanes = ov.querySelectorAll('.fstep-pane');
  function goStep(s) {
    currentStep = s;
    stepBtns.forEach((b,i)=>{ b.classList.toggle('active',i===s); if(i<s)b.classList.add('done'); else b.classList.remove('done'); });
    stepPanes.forEach((p,i)=>p.classList.toggle('active',i===s));
    getEl('fbk').style.display = s>0?'':'none';
    getEl('fnx').style.display = s<3?'':'none';
    getEl('fok').style.display = s===3?'':'none';
  }
  // Valida los obligatorios del paso actual antes de avanzar
  function stepError(s) {
    if (s === 0) {
      if (!getEl('ft').value.trim())  return 'El título es obligatorio';
      if (!getEl('fc').value)         return 'Selecciona una ciudad';
      if (!getEl('ftp').value)        return 'Selecciona un tipo';
      const pr = parseCOP(getEl('fp').value);
      if (!pr || pr < 100000)         return 'Precio mínimo $100.000';
    }
    if (s === 1) {
      const m = parseInt(getEl('fm').value);
      if (!m || m < 10)               return 'Área mínima 10 m²';
    }
    return null;
  }
  getEl('fnx').onclick = () => {
    const err = stepError(currentStep);
    if (err) return showToast(err, 'warning');
    if (currentStep<3) goStep(currentStep+1);
  };
  bindMoneyInput(getEl('fp')); bindMoneyInput(getEl('fadm')); bindMoneyInput(getEl('fserv'));
  getEl('fbk').onclick = () => { if (currentStep>0) goStep(currentStep-1); };

  // ── Estado de fotos del wizard ──────────────────────────
  // _existingFotos: URLs ya guardadas (externas o /uploads/…)
  // _newFiles: archivos elegidos del PC, se suben al guardar
  let _existingFotos = [...(prop?.fotos ?? [])];
  let _newFiles      = [];
  let _previewUrls   = [];

  function _renderPreviews() {
    const container = getEl('foto-preview');
    if (!container) return;
    _previewUrls.forEach(u => URL.revokeObjectURL(u));
    _previewUrls = _newFiles.map(f => URL.createObjectURL(f));
    const all = [
      ..._existingFotos.map((url, i) => ({ type:'existing', src: mediaUrl(url), idx: i })),
      ..._newFiles.map((file, i)      => ({ type:'new',      src: _previewUrls[i], idx: i })),
    ];
    container.innerHTML = all.map((item, pos) => `
      <div style="position:relative;width:76px;height:76px;border-radius:10px;overflow:hidden;border:2px solid ${item.type==='new'?'var(--ac)':'var(--bo)'}">
        <img src="${sanitize(item.src)}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.background='#e8edf7'"/>
        <button type="button"
          onclick="window.__removeFotoPreview('${item.type}',${item.idx})"
          style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(239,68,68,.9);color:#fff;border:none;cursor:pointer;font-size:10px;display:grid;place-items:center">✕</button>
        ${pos===0?'<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(30,58,138,.8);color:#fff;font-size:9px;text-align:center;padding:2px">Portada</div>':''}
      </div>`).join('');
  }

  // Valida tipo, tamaño y cantidad antes de agregarlos a la vista previa
  function _addFiles(files) {
    const libres = MAX_FOTOS - _existingFotos.length - _newFiles.length;
    const validos = [];
    for (const f of files) {
      if (!FOTO_TYPES.includes(f.type))  { showToast(`"${f.name}" no es JPG, PNG o WEBP`, 'warning'); continue; }
      if (f.size > MAX_FOTO_BYTES)        { showToast(`"${f.name}" supera los 5 MB`, 'warning'); continue; }
      validos.push(f);
    }
    if (validos.length > libres) showToast(`Máximo ${MAX_FOTOS} fotos por propiedad`, 'warning');
    _newFiles = [..._newFiles, ...validos.slice(0, Math.max(0, libres))];
    _renderPreviews();
  }

  window.__removeFotoPreview = (type, idx) => {
    if (type === 'existing') _existingFotos.splice(idx, 1);
    else _newFiles.splice(idx, 1);
    _renderPreviews();
  };

  window.__handleDrop = (e) => _addFiles(Array.from(e.dataTransfer.files));

  const fileInput = getEl('file-input');
  fileInput.onchange = (e) => { _addFiles(Array.from(e.target.files || [])); fileInput.value = ''; };
  _renderPreviews();

  getEl('hd').onclick=()=>{if(habitaciones>1)habitaciones--;getEl('hv').textContent=habitaciones;};
  getEl('hi').onclick=()=>{habitaciones++;getEl('hv').textContent=habitaciones;};
  getEl('bd').onclick=()=>{if(banos>1)banos--;getEl('bv').textContent=banos;};
  getEl('bi').onclick=()=>{banos++;getEl('bv').textContent=banos;};

  // Guardar
  getEl('fok').onclick = async () => {
    const titulo  = getEl('ft').value.trim();
    const ciudad  = getEl('fc').value;
    const tipo    = getEl('ftp').value;
    const precio  = parseCOP(getEl('fp').value);
    const metros  = parseInt(getEl('fm').value);

    if (!titulo)               return showToast('El título es obligatorio','error');
    if (!ciudad)               return showToast('Selecciona una ciudad','warning');
    if (!tipo)                 return showToast('Selecciona un tipo','warning');
    if (!precio||precio<100000)return showToast('Precio mínimo $100.000','error');
    if (!metros||metros<10)    return showToast('Área mínima 10 m²','error');

    // Fotos: las que se conservaron + URLs externas nuevas (las del PC se suben después)
    const fotosRaw = getEl('ffotos')?.value?.trim() || '';
    const urlFotos = fotosRaw.split(/[\n,]+/).map(s=>s.trim()).filter(s=>/^https?:\/\//.test(s));
    const fotos    = [...new Set([..._existingFotos, ...urlFotos])];
    if (fotos.length + _newFiles.length > MAX_FOTOS) return showToast(`Máximo ${MAX_FOTOS} fotos por propiedad`,'error');

    const tourUrl = getEl('ftour').value.trim();
    const data = {
      titulo, ciudad, barrio: getEl('fb').value.trim(), tipo,
      listing: getEl('fls').value, precio, metros,
      estrato:      parseInt(getEl('fest').value)||null,
      parqueaderos: parseInt(getEl('fpark').value)||0,
      // Vacío = null: "no informada" (administración) o estimado (servicios)
      administracion: Number.isFinite(parseCOP(getEl('fadm').value)) ? parseCOP(getEl('fadm').value) : null,
      serviciosEst:   Number.isFinite(parseCOP(getEl('fserv').value)) ? parseCOP(getEl('fserv').value) : null,
      habitaciones, banos,
      fotos,
      descripcion: getEl('fdesc')?.value?.trim()||null,
      video:       getEl('fvideo')?.value?.trim()||null,
      tourUrl:     tourUrl||null,
      tourVirtual: !!tourUrl,
      comodidades: Array.from(ov.querySelectorAll('.am-cb:checked')).map(c=>c.value),
      mapa2d:      prop?.mapa2d ?? false,
    };

    const okBtn = getEl('fok');
    okBtn.disabled = true;
    okBtn.textContent = '⏳ Guardando…';

    try {
      const result = propId ? await updateProp(propId, data) : await addProp(data);

      // Subir las fotos del PC (multipart/form-data)
      if (_newFiles.length) {
        okBtn.textContent = `⏳ Subiendo ${_newFiles.length} foto(s)…`;
        const up = await PropiedadesApi.uploadFotos(result.id, _newFiles);
        if (up?.ok) showToast(`${_newFiles.length} foto(s) subida(s) ✓`, 'success');
        else        showToast('Propiedad guardada, pero falló la subida de fotos: ' + (up?.error?.message || ''), 'warning');
      }

      showToast(propId ? 'Propiedad actualizada ✓' : 'Propiedad publicada ✓', 'success');
      close();
      await refreshView();

    } catch(e) {
      showToast(e.message || 'Error al guardar', 'error');
      okBtn.disabled  = false;
      okBtn.textContent = propId ? '💾 Guardar' : '🚀 Publicar';
    }
  };

  const close = () => { _previewUrls.forEach(u => URL.revokeObjectURL(u)); ov.remove(); };
  getEl('fx').onclick=close; getEl('fc2').onclick=close;
}

// ── Confirmar eliminar propiedad ──────────────────────────────
export async function confirmDeleteProp(propId) {
  const prop = await getPropById(propId);
  if (!prop) return;
  const ok = await confirmDialog('¿Eliminar propiedad?', `¿Seguro que deseas eliminar <strong>${sanitize(prop.titulo)}</strong>?`);
  if (!ok) return;
  if (!(await deleteProp(propId))) return showToast('No se pudo eliminar la propiedad','error');
  showToast(`"${prop.titulo}" eliminada`,'error'); await refreshView();
}

// ── Visitas (arrendador): crear / editar ──────────────────────
export async function openVisitaForm(visitaId = null) {
  const v       = visitaId ? (State.visitas || []).find(x => x.id === visitaId) : null;
  const myProps = await getMyProps();
  const ov = createOverlay();

  ov.innerHTML = `
    <div class="modal-box" style="max-width:440px">
      <div class="mh"><div><div class="mh-title">${v ? '✏️ Editar visita' : 'Agendar visita'}</div></div><button class="btn-mx" id="vx">✕</button></div>
      <div style="padding:24px 28px;display:flex;flex-direction:column;gap:16px">
        <div class="mf"><label>Cliente *</label><input id="vfc" placeholder="Nombre del cliente" value="${sanitize(v?.cliente ?? '')}"/></div>
        <div class="mf"><label>Propiedad *</label><select id="vfp"><option value="">Selecciona…</option>${propOptions(myProps, v?.propId)}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Fecha *</label><input id="vff" type="date" value="${sanitize(v?.fecha ?? '')}"/></div>
          <div class="mf"><label>Hora *</label><input id="vfh" type="time" value="${sanitize(v?.hora ?? '')}"/></div>
        </div>
        ${v ? `<div class="mf"><label>Estado</label><select id="vfe">
          ${['pendiente','confirmada','cancelada'].map(e => `<option value="${e}"${v.estado===e?' selected':''}>${capitalize(e)}</option>`).join('')}
        </select></div>` : ''}
        <div class="mf"><label>Nota</label><input id="vfn" placeholder="Opcional" value="${sanitize(v?.nota ?? '')}"/></div>
      </div>
      <div class="mf-foot">
        <button class="btn-g" id="vca">Cancelar</button>
        <button class="btn-a" id="vok">${v ? '💾 Guardar' : 'Agendar'}</button>
      </div>
    </div>`;

  const close = () => ov.remove();
  getEl('vx').onclick  = close;
  getEl('vca').onclick = close;
  getEl('vok').onclick = async () => {
    const dto = {
      cliente: getEl('vfc').value.trim(),
      propId:  getEl('vfp').value,
      fecha:   getEl('vff').value,
      hora:    getEl('vfh').value,
      nota:    getEl('vfn').value.trim() || undefined,
    };
    if (!dto.cliente || !dto.propId || !dto.fecha || !dto.hora) return showToast('Completa todos los campos','warning');
    if (v) dto.estado = getEl('vfe').value;
    try {
      await withLoading(getEl('vok'), () => v ? updateVisita(v.id, dto) : addVisita(dto));
      close(); showToast(v ? 'Visita actualizada ✓' : 'Visita agendada ✓','success'); await refreshView();
    } catch(e) { showToast(e.message || 'Error','error'); }
  };
}

export async function confirmDeleteVisita(visitaId) {
  const ok = await confirmDialog('¿Eliminar visita?', 'Esta acción no se puede deshacer.');
  if (!ok) return;
  try { await deleteVisita(visitaId); showToast('Visita eliminada','error'); await refreshView(); }
  catch(e) { showToast(e.message || 'Error','error'); }
}

export async function toggleVisitaEstado(visitaId) {
  const v = (State.visitas || []).find(x => x.id === visitaId);
  if (!v) return;
  const nuevo = v.estado === 'pendiente' ? 'confirmada' : 'pendiente';
  try { await updateVisitaEstado(visitaId, nuevo); showToast('Visita ' + nuevo, 'success'); await refreshView(); }
  catch(e) { showToast(e.message || 'Error','error'); }
}

// ── Visitas (inquilino): solicitar / cancelar ─────────────────
export async function openSolicitarVisita(propId) {
  const prop = await getPropById(propId);
  if (!prop) return;
  const ov = createOverlay();
  ov.style.zIndex = '600';
  // Próximos 14 días; hoy solo si quedan horarios (con al menos 1 h de margen)
  const dias = proximosDias(14).filter(d => horariosDisponibles(d.iso).length);
  let fecha = dias[0]?.iso || '', hora = '';

  ov.innerHTML = `
    <div class="modal-box" style="max-width:520px">
      <div class="mh"><div><div class="mh-title">📅 Agendar visita</div><div class="mh-sub">${sanitize(prop.titulo)}</div></div><button class="btn-mx" id="svx" aria-label="Cerrar">✕</button></div>
      <div style="padding:20px 28px;display:flex;flex-direction:column;gap:18px">
        ${helpSteps(['Toca el <strong>día</strong>', 'Toca la <strong>hora</strong>', 'El arrendador la confirma y la verás en <strong>Mis Visitas</strong>'])}
        <div>
          <div class="sv-lbl" id="sv-dias-lbl">1. ¿Qué día?</div>
          <div class="sv-dias" role="radiogroup" aria-labelledby="sv-dias-lbl">
            ${dias.map(d => `<button type="button" class="sv-dia${d.iso === fecha ? ' active' : ''}" role="radio" aria-checked="${d.iso === fecha}" data-dia="${d.iso}">
              <span class="sv-dow">${d.etiqueta}</span><span class="sv-num">${d.num}</span><span class="sv-mes">${d.mes}</span></button>`).join('')}
          </div>
        </div>
        <div>
          <div class="sv-lbl" id="sv-horas-lbl">2. ¿A qué hora?</div>
          <div class="sv-horas" id="sv-horas" role="radiogroup" aria-labelledby="sv-horas-lbl"></div>
        </div>
        <div class="sv-resumen" id="sv-resumen" aria-live="polite"></div>
        <div class="mf"><label for="svn">Nota para el arrendador <span style="font-weight:400;color:var(--t3)">— opcional</span></label><input id="svn" placeholder="Ej: voy con mi pareja" maxlength="300"/></div>
      </div>
      <div class="mf-foot">
        <button class="btn-g btn-xl" id="svc">Cancelar</button>
        <button class="btn-a btn-xl" id="svok" disabled>Solicitar visita</button>
      </div>
    </div>`;

  const render = () => {
    const horas = horariosDisponibles(fecha);
    if (!horas.includes(hora)) hora = '';
    const bloques = [['☀️ Mañana', horas.filter(h => h < '12:00')], ['🌤️ Tarde', horas.filter(h => h >= '12:00')]];
    getEl('sv-horas').innerHTML = bloques.filter(b => b[1].length).map(([lbl, hs]) => `
      <div class="sv-bloque"><span>${lbl}</span><div>${hs.map(h =>
        `<button type="button" class="sv-hora${h === hora ? ' active' : ''}" role="radio" aria-checked="${h === hora}" data-hora="${h}">${hora12(h)}</button>`).join('')}</div></div>`).join('');
    ov.querySelectorAll('.sv-dia').forEach(b => { const on = b.dataset.dia === fecha; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); });
    const dia = dias.find(d => d.iso === fecha);
    getEl('sv-resumen').innerHTML = hora
      ? `✅ Tu visita: <strong>${dia.largo}</strong> a las <strong>${hora12(hora)}</strong>`
      : 'Elige una hora para continuar';
    getEl('svok').disabled = !hora;
  };
  ov.querySelector('.sv-dias').addEventListener('click', (e) => {
    const b = e.target.closest('.sv-dia'); if (!b) return;
    fecha = b.dataset.dia; render();
  });
  getEl('sv-horas').addEventListener('click', (e) => {
    const b = e.target.closest('.sv-hora'); if (!b) return;
    hora = b.dataset.hora; render();
    getEl('svok').focus({ preventScroll: true });
  });
  render();

  const close = () => ov.remove();
  getEl('svx').onclick = close; getEl('svc').onclick = close;
  getEl('svok').onclick = async () => {
    if (!fecha || !hora) return showToast('Elige el día y la hora','warning');
    try {
      await withLoading(getEl('svok'), () => solicitarVisita({ propId, fecha, hora, nota: getEl('svn').value.trim() || undefined }));
      close(); showToast('Visita solicitada ✓ — el arrendador debe confirmarla','success');
    } catch(e) { showToast(e.message || 'Error','error'); }
  };
}

export async function cancelarVisita(visitaId) {
  const ok = await confirmDialog('¿Cancelar visita?', 'El arrendador verá la visita como cancelada.', 'Cancelar visita');
  if (!ok) return;
  try { await updateVisitaEstado(visitaId, 'cancelada'); showToast('Visita cancelada','info'); await refreshView(); }
  catch(e) { showToast(e.message || 'Error','error'); }
}

// ── Leads (CRM): crear / editar ───────────────────────────────
export async function openLeadForm(leadId = null) {
  const l       = leadId ? (State.leads || []).find(x => x.id === leadId) : null;
  const myProps = await getMyProps();
  const fuentes = ['Portal','Referido','Orgánico','Redes'];
  if (l?.fuente && !fuentes.includes(l.fuente)) fuentes.push(l.fuente);
  const ov = createOverlay();

  ov.innerHTML = `
    <div class="modal-box" style="max-width:450px">
      <div class="mh"><div><div class="mh-title">${l ? '✏️ Editar lead' : 'Nuevo lead'}</div></div><button class="btn-mx" id="lx">✕</button></div>
      <div style="padding:24px 28px;display:flex;flex-direction:column;gap:16px">
        <div class="mf"><label>Nombre *</label><input id="lf-n" placeholder="Carlos Mejía" value="${sanitize(l?.nombre ?? '')}"/></div>
        <div class="mf"><label>Email *</label><input id="lf-e" type="email" placeholder="carlos@mail.co" value="${sanitize(l?.email ?? '')}"/></div>
        <div class="mf"><label>Propiedad *</label><select id="lf-p"><option value="">Selecciona…</option>${propOptions(myProps, l?.propId)}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Presupuesto</label><input id="lf-b" placeholder="$2M–$3M" value="${sanitize(l?.presupuesto ?? '')}"/></div>
          <div class="mf"><label>Fuente</label><select id="lf-f">${fuentes.map(f => `<option${l?.fuente===f?' selected':''}>${sanitize(f)}</option>`).join('')}</select></div>
        </div>
        ${l ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Estado</label><select id="lf-s">
            ${['new','contactado','interesado','visita_agendada','lost'].map(s => `<option value="${s}"${l.estado===s?' selected':''}>${s}</option>`).join('')}
          </select></div>
          <div class="mf"><label>Score (0–100)</label><input id="lf-sc" type="number" min="0" max="100" value="${l.score}"/></div>
        </div>` : ''}
      </div>
      <div class="mf-foot">
        <button class="btn-g" id="lc">Cancelar</button>
        <button class="btn-a" id="lok">${l ? '💾 Guardar' : 'Crear lead'}</button>
      </div>
    </div>`;

  const close = () => ov.remove();
  getEl('lx').onclick = close; getEl('lc').onclick = close;
  getEl('lok').onclick = async () => {
    const dto = {
      nombre:      getEl('lf-n').value.trim(),
      email:       getEl('lf-e').value.trim(),
      propId:      getEl('lf-p').value,
      presupuesto: getEl('lf-b').value.trim() || undefined,
      fuente:      getEl('lf-f').value,
    };
    if (!dto.nombre || !dto.email || !dto.propId) return showToast('Completa los campos requeridos','warning');
    if (l) {
      dto.estado = getEl('lf-s').value;
      const score = parseInt(getEl('lf-sc').value);
      if (isNaN(score) || score < 0 || score > 100) return showToast('El score debe estar entre 0 y 100','warning');
      dto.score = score;
    }
    try {
      await withLoading(getEl('lok'), () => l ? updateLead(l.id, dto) : addLead(dto));
      close(); showToast(l ? 'Lead actualizado ✓' : 'Lead creado ✓','success'); await refreshView();
    } catch(e) { showToast(e.message || 'Error','error'); }
  };
}

export async function confirmDeleteLead(leadId) {
  const l  = (State.leads || []).find(x => x.id === leadId);
  const ok = await confirmDialog('¿Eliminar lead?', l ? `Se eliminará el contacto <strong>${sanitize(l.nombre)}</strong>.` : 'Esta acción no se puede deshacer.');
  if (!ok) return;
  try { await deleteLead(leadId); showToast('Lead eliminado','error'); await refreshView(); }
  catch(e) { showToast(e.message || 'Error','error'); }
}

// ── Pagos: registrar / editar ─────────────────────────────────
export async function openPagoForm(pagoId = null) {
  const p       = pagoId ? (State.pagos || []).find(x => x.id === pagoId) : null;
  const myProps = await getMyProps();
  const ov = createOverlay();

  ov.innerHTML = `
    <div class="modal-box" style="max-width:450px">
      <div class="mh"><div><div class="mh-title">${p ? '✏️ Editar pago' : 'Registrar pago'}</div></div><button class="btn-mx" id="pgx">✕</button></div>
      <div style="padding:24px 28px;display:flex;flex-direction:column;gap:16px">
        <div class="mf"><label>Inquilino (nombre o email) <span style="font-weight:400;color:var(--t3)">— opcional</span></label><input id="pgi" placeholder="Vacío = pago directo / general" value="${sanitize(p?.inq?.email ?? '')}"/></div>
        <div class="mf"><label>Propiedad *</label>${propComboHtml('pgp')}</div>
        ${conceptoFieldHtml('pgcon', p?.concepto ?? '', true)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Monto (COP) *</label><input id="pgm" inputmode="numeric" autocomplete="off" placeholder="1.800.000" value="${p?.monto ? formatNum(p.monto) : ''}"/></div>
          <div class="mf"><label>Fecha *</label><input id="pgf" type="date" value="${sanitize(p?.fecha ?? today())}"/></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Método</label><select id="pgmet">${metodoOptions(p?.metodo)}</select></div>
          <div class="mf"><label>Estado</label><select id="pge">
            ${[['pagado','Pagado'],['pendiente','Pendiente'],['vencido','Vencido']].map(([val,lbl]) => `<option value="${val}"${p?.estado===val?' selected':''}>${lbl}</option>`).join('')}
          </select></div>
        </div>
        ${comprobanteFieldHtml()}
      </div>
      <div class="mf-foot">
        <button class="btn-g" id="pgc">Cancelar</button>
        <button class="btn-a" id="pgok">${p ? '💾 Guardar' : 'Registrar'}</button>
      </div>
    </div>`;

  const close = () => ov.remove();
  getEl('pgx').onclick = close; getEl('pgc').onclick = close;
  bindMoneyInput(getEl('pgm'));
  const comp     = bindComprobanteField(ov, p);
  const combo    = bindPropCombo(ov, 'pgp', { grupos: [{ label: 'Mis propiedades', items: myProps }], selected: p?.propId });
  const concepto = bindConceptoField(ov, 'pgcon');
  getEl('pgok').onclick = async () => {
    const dto = {
      inquilino: getEl('pgi').value.trim(),
      propId:    combo.value(),
      monto:     parseCOP(getEl('pgm').value),
      fecha:     getEl('pgf').value,
      estado:    getEl('pge').value,
      metodo:    getEl('pgmet').value,
      concepto:  concepto.value(),
    };
    if (p) {
      // Al editar: sin cambios no se reasigna; vacío desvincula al inquilino
      if (dto.inquilino === (p.inq?.email ?? '')) delete dto.inquilino;
      else if (!dto.inquilino) dto.inquilino = null;
      if (!dto.concepto) dto.concepto = p.concepto ? null : undefined;
    } else {
      if (!dto.inquilino) delete dto.inquilino;
      if (!dto.concepto)  delete dto.concepto;
    }
    if (!dto.propId) return showToast('Busca y elige la propiedad de la lista','warning');
    if (!Number.isFinite(dto.monto) || dto.monto < 1) return showToast('Ingresa un monto válido mayor a $0','warning');
    if (!dto.fecha) return showToast('Selecciona la fecha','warning');
    let guardado = null;
    try {
      await withLoading(getEl('pgok'), async () => {
        guardado = p ? await updatePago(p.id, dto) : await addPago(dto);
        await comp.guardar(guardado.id);
      });
      close(); showToast(p ? 'Pago actualizado ✓' : 'Pago registrado ✓','success'); await refreshView();
    } catch(e) {
      // El pago ya quedó guardado aunque falle el comprobante: se cierra para no duplicarlo
      if (guardado) { close(); await refreshView(); showErrorAlert('El pago se guardó, pero no el comprobante', e.message); }
      else showToast(e.message || 'Error','error');
    }
  };
}

// ── Pagos: conceptos y métodos ────────────────────────────────
export const CONCEPTOS = ['Canon de arrendamiento', 'Servicios públicos', 'Cuota de administración',
                          'Depósito de garantía', 'Mantenimiento / Reparaciones', 'Otros'];
// Textos que se usaban antes (texto libre) → concepto equivalente de la lista
const CONCEPTOS_ANTERIORES = {
  'canon': 'Canon de arrendamiento', 'canon de arriendo': 'Canon de arrendamiento',
  'administracion': 'Cuota de administración', 'deposito': 'Depósito de garantía',
  'reparaciones': 'Mantenimiento / Reparaciones', 'mantenimiento': 'Mantenimiento / Reparaciones',
  'servicios': 'Servicios públicos',
};
const METODOS = ['Transferencia', 'PSE', 'Nequi', 'Daviplata', 'Tarjeta', 'Efectivo'];

// Conserva un método guardado que no esté en la lista (si no, al editar se cambiaría sin querer)
function metodoOptions(actual) {
  const lista = actual && !METODOS.includes(actual) ? [...METODOS, actual] : METODOS;
  return lista.map(m => `<option${m === actual ? ' selected' : ''}>${sanitize(m)}</option>`).join('');
}

// Minúsculas y sin tildes, para buscar "bogota" y encontrar "Bogotá"
function normalizar(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// "Otros: lavado de tanques" → { sel: 'Otros', detalle: 'lavado de tanques' }
function parseConcepto(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { sel: '', detalle: '' };
  if (CONCEPTOS.includes(t)) return { sel: t, detalle: '' };
  const anterior = CONCEPTOS_ANTERIORES[normalizar(t)];
  if (anterior) return { sel: anterior, detalle: '' };
  const m = t.match(/^otros?\s*:?\s*(.*)$/i);
  return { sel: 'Otros', detalle: m ? m[1] : t };
}

function conceptoFieldHtml(id, actual, opcional) {
  const { sel, detalle } = parseConcepto(actual);
  return `
    <div class="mf"><label>Concepto ${opcional ? '<span style="font-weight:400;color:var(--t3)">— opcional</span>' : '*'}</label>
      <select id="${id}">
        ${opcional ? `<option value=""${sel ? '' : ' selected'}>Sin concepto</option>` : ''}
        ${CONCEPTOS.map(c => `<option${c === sel ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
      <input id="${id}-otro" maxlength="70" placeholder="¿Cuál? Ej: lavado de tanques (opcional)" value="${sanitize(detalle)}" style="margin-top:8px${sel === 'Otros' ? '' : ';display:none'}"/>
    </div>`;
}

function bindConceptoField(ov, id) {
  const sel  = ov.querySelector('#' + id);
  const otro = ov.querySelector('#' + id + '-otro');
  sel.addEventListener('change', () => {
    otro.style.display = sel.value === 'Otros' ? '' : 'none';
    if (sel.value === 'Otros') otro.focus();
  });
  return {
    value() {
      if (sel.value !== 'Otros') return sel.value;
      const d = otro.value.trim();
      return d ? `Otros: ${d}` : 'Otros';
    },
  };
}

// ── Buscador de propiedades (combo box con autocompletado) ─────
function propComboHtml(id) {
  return `
    <div class="pcombo">
      <input type="hidden" id="${id}"/>
      <input id="${id}-q" class="pc-input" type="text" autocomplete="off" role="combobox" aria-expanded="false"
             aria-autocomplete="list" aria-controls="${id}-list" placeholder="🔎 Busca por nombre, ciudad o barrio…"/>
      <button type="button" class="pc-clear" title="Quitar selección" hidden>✕</button>
      <ul class="pc-list" id="${id}-list" role="listbox" hidden></ul>
    </div>`;
}

// grupos: [{ label, items }] en orden de prioridad. buscarRemoto(q) agrega resultados del servidor.
function bindPropCombo(ov, id, { grupos, selected = null, buscarRemoto = null, onSelect = null }) {
  const hidden = ov.querySelector('#' + id);
  const input  = ov.querySelector('#' + id + '-q');
  const list   = ov.querySelector('#' + id + '-list');
  const clear  = ov.querySelector('#' + id + '-q ~ .pc-clear');
  const MAX_POR_GRUPO = 8;

  // Una propiedad aparece una sola vez, en el grupo de mayor prioridad
  const vistos = new Set();
  const base = grupos.map(g => ({
    label: g.label,
    items: (g.items || []).filter(p => p?.id && !vistos.has(p.id) && vistos.add(p.id)),
  })).filter(g => g.items.length);
  let remotos = [], remotoQ = '', visibles = [], activo = -1, timer = null, elegido = null;

  const texto = (p) => normalizar([p.titulo, p.ciudad, p.barrio].filter(Boolean).join(' '));
  const coincide = (p, tokens) => { const t = texto(p); return tokens.every(k => t.includes(k)); };
  const sub = (p) => [p.ciudad && capitalize(p.ciudad), p.barrio, p.precio && formatCOP(p.precio) + '/mes'].filter(Boolean).join(' · ');

  function render() {
    const q = normalizar(input.value === elegido?.titulo ? '' : input.value);
    const tokens = q.split(/\s+/).filter(Boolean);
    const res = base.map(g => ({ label: g.label, items: g.items.filter(p => coincide(p, tokens)).slice(0, MAX_POR_GRUPO) }));
    if (tokens.length && remotoQ === q) {
      const extra = remotos.filter(p => !vistos.has(p.id) && coincide(p, tokens));
      if (extra.length) res.push({ label: 'Más resultados', items: extra.slice(0, MAX_POR_GRUPO) });
    }
    visibles = [];
    const html = res.filter(g => g.items.length).map(g =>
      `<li class="pc-group" role="presentation">${sanitize(g.label)}</li>` +
      g.items.map(p => {
        const i = visibles.push(p) - 1;
        return `<li class="pc-opt${p.id === hidden.value ? ' sel' : ''}" role="option" id="${id}-o${i}" data-i="${i}" data-id="${sanitize(p.id)}" aria-selected="${p.id === hidden.value}">
          <div class="pc-tit">${sanitize(p.titulo)}</div>${sub(p) ? `<div class="pc-sub">${sanitize(sub(p))}</div>` : ''}</li>`;
      }).join('')
    ).join('');
    list.innerHTML = html || `<li class="pc-empty">${tokens.length ? 'Sin coincidencias para "' + sanitize(input.value.trim()) + '"' : 'No hay propiedades disponibles'}</li>`;
    activo = Math.min(activo, visibles.length - 1);
    marcarActivo();
  }

  function marcarActivo() {
    list.querySelectorAll('.pc-opt').forEach(li => li.classList.toggle('act', Number(li.dataset.i) === activo));
    const li = list.querySelector(`[data-i="${activo}"]`);
    if (li) { li.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', li.id); }
    else input.removeAttribute('aria-activedescendant');
  }

  const abrir  = () => { list.hidden = false; input.setAttribute('aria-expanded', 'true'); render(); };
  const cerrar = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); activo = -1; };

  function elegir(p) {
    elegido = p;
    hidden.value = p ? p.id : '';
    input.value  = p ? p.titulo : '';
    input.classList.toggle('pc-ok', !!p);
    clear.hidden = !p;
    cerrar();
    if (p && onSelect) onSelect(p);
  }

  input.addEventListener('focus', abrir);
  input.addEventListener('input', () => {
    // Al escribir se descarta la selección anterior hasta elegir otra
    if (elegido && input.value !== elegido.titulo) { elegido = null; hidden.value = ''; input.classList.remove('pc-ok'); clear.hidden = true; }
    activo = 0;
    abrir();
    if (!buscarRemoto) return;
    clearTimeout(timer);
    const q = normalizar(input.value);
    if (q.length < 2) return;
    timer = setTimeout(async () => {
      const r = await buscarRemoto(input.value.trim()).catch(() => []);
      if (normalizar(input.value) !== q) return;   // llegó tarde: el usuario siguió escribiendo
      remotos = r; remotoQ = q;
      if (!list.hidden) render();
    }, 250);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) return abrir();
      if (!visibles.length) return;
      activo = (activo + (e.key === 'ArrowDown' ? 1 : -1) + visibles.length) % visibles.length;
      marcarActivo();
    } else if (e.key === 'Enter') {
      if (!list.hidden && visibles[activo]) { e.preventDefault(); elegir(visibles[activo]); }
    } else if (e.key === 'Escape' && !list.hidden) {
      e.preventDefault(); e.stopPropagation(); cerrar();
    }
  });
  // mousedown (no click): se elige antes de que el input pierda el foco
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('.pc-opt');
    e.preventDefault();
    if (li) elegir(visibles[Number(li.dataset.i)]);
  });
  input.addEventListener('blur', () => {
    cerrar();
    // Texto suelto sin elegir: se restaura la selección (o se limpia)
    if (elegido) input.value = elegido.titulo;
  });
  clear.addEventListener('click', () => { elegir(null); input.focus(); });

  if (selected) {
    const p = base.flatMap(g => g.items).find(x => x.id === selected);
    if (p) { elegido = p; hidden.value = p.id; input.value = p.titulo; input.classList.add('pc-ok'); clear.hidden = false; }
  }
  return { value: () => hidden.value };
}

// ── Comprobante de pago: campo con previsualización ───────────
// Al editar muestra el comprobante actual; guardar() sube el nuevo o quita el anterior
function comprobanteFieldHtml() {
  return `
    <div class="mf">
      <label>Comprobante de pago <span style="font-weight:400;color:var(--t3)">— opcional · foto, pantallazo o PDF (máx. 5 MB)</span></label>
      <input type="file" class="comp-input" accept="${COMPROBANTE_TYPES.join(',')}" hidden/>
      <div class="comp-box"></div>
    </div>`;
}

function bindComprobanteField(ov, pago = null) {
  const input = ov.querySelector('.comp-input');
  const box   = ov.querySelector('.comp-box');
  let file = null, quitar = false, previewUrl = '';

  const render = () => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
    if (file) {
      const esPdf = file.type === 'application/pdf';
      if (!esPdf) previewUrl = URL.createObjectURL(file);
      box.innerHTML = `
        <div class="comp-prev">
          ${esPdf ? '<div class="comp-thumb comp-pdf">PDF</div>' : `<img class="comp-thumb" src="${previewUrl}" alt="Vista previa del comprobante"/>`}
          <div class="comp-info"><div class="comp-name">${sanitize(file.name)}</div><div class="comp-size">${formatBytes(file.size)}</div></div>
          <button type="button" class="btn-g comp-change">Cambiar</button>
          <button type="button" class="btn-mx comp-del" title="Quitar archivo">✕</button>
        </div>`;
    } else if (pago?.comprobanteUrl && !quitar) {
      box.innerHTML = `
        <div class="comp-prev">
          <div class="comp-thumb comp-pdf">${esPdfUrl(pago.comprobanteUrl) ? 'PDF' : '🖼️'}</div>
          <div class="comp-info"><div class="comp-name">Comprobante adjunto</div><button type="button" class="comp-link comp-ver">Ver comprobante</button></div>
          <button type="button" class="btn-g comp-change">Reemplazar</button>
          <button type="button" class="btn-mx comp-del" title="Quitar comprobante">✕</button>
        </div>`;
    } else {
      box.innerHTML = `<button type="button" class="comp-drop comp-change">📎 Adjuntar foto, pantallazo o PDF del comprobante</button>`;
    }
    box.querySelector('.comp-change').onclick = () => input.click();
    const del = box.querySelector('.comp-del');
    if (del) del.onclick = () => { if (file) file = null; else quitar = true; render(); };
    const ver = box.querySelector('.comp-ver');
    if (ver) ver.onclick = () => openComprobante(pago.id);
  };

  input.onchange = () => {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    const err = validarComprobante(f);
    if (err) return showToast(err, 'warning');
    file = f; render();
  };

  // Libera la vista previa cuando se cierra el modal
  onRemoved(ov, () => { if (previewUrl) URL.revokeObjectURL(previewUrl); });

  render();
  return {
    async guardar(pagoId) {
      if (file) await subirComprobante(pagoId, file);
      else if (quitar && pago?.comprobanteUrl) await quitarComprobante(pagoId);
    },
  };
}

function validarComprobante(f) {
  if (!COMPROBANTE_TYPES.includes(f.type)) return `"${f.name}" no es una imagen JPG, PNG, WEBP ni un PDF`;
  if (f.size > MAX_FOTO_BYTES) return `"${f.name}" pesa ${formatBytes(f.size)}; el máximo es 5 MB`;
  return '';
}

function esPdfUrl(url) { return /\.pdf$/i.test(url || ''); }

function formatBytes(n) {
  return n >= 1024 * 1024 ? formatNum(n / 1024 / 1024, 1) + ' MB' : formatNum(Math.max(1, Math.round(n / 1024))) + ' KB';
}

// Ejecuta fn cuando el overlay sale del DOM (cerrar con ✕, Cancelar o clic afuera)
function onRemoved(el, fn) {
  new MutationObserver((_, obs) => { if (!el.isConnected) { obs.disconnect(); fn(); } })
    .observe(document.body, { childList: true });
}

// ── Inquilino: reportar un pago hecho por fuera de la plataforma ──
export async function openReportarPago() {
  const props = await getPropsReportables();
  const ov = createOverlay();

  ov.innerHTML = `
    <div class="modal-box" style="max-width:470px">
      <div class="mh"><div><div class="mh-title">Reportar pago</div><div class="mh-sub">El arrendador lo revisará y lo confirmará</div></div><button class="btn-mx" id="rpx">✕</button></div>
      <div style="padding:24px 28px;display:flex;flex-direction:column;gap:16px">
        ${helpSteps(['Busca y elige la <strong>propiedad</strong> que arriendas', 'Escribe el <strong>monto</strong> y la fecha en que pagaste', 'Adjunta una <strong>foto del recibo</strong> o pantallazo (recomendado)'])}
        <div class="mf"><label>Propiedad de tu arriendo *</label>${propComboHtml('rpp')}</div>
        ${conceptoFieldHtml('rpcon', CONCEPTOS[0], false)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Monto pagado (COP) *</label><input id="rpm" inputmode="numeric" autocomplete="off" placeholder="1.800.000"/></div>
          <div class="mf"><label>Fecha del pago *</label><input id="rpf" type="date" value="${today()}" max="${today()}"/></div>
        </div>
        <div class="mf"><label>Método</label><select id="rpmet">${metodoOptions('Transferencia')}</select></div>
        ${comprobanteFieldHtml()}
      </div>
      <div class="mf-foot">
        <button class="btn-g btn-xl" id="rpc">Cancelar</button>
        <button class="btn-a btn-xl" id="rpok">Enviar reporte de pago</button>
      </div>
    </div>`;

  const close = () => ov.remove();
  getEl('rpx').onclick = close; getEl('rpc').onclick = close;
  bindMoneyInput(getEl('rpm'));
  const comp     = bindComprobanteField(ov);
  const concepto = bindConceptoField(ov, 'rpcon');
  // Primero lo que el inquilino realmente arrienda (tiene pagos), luego sus visitas, luego el resto;
  // al escribir también se busca en el servidor (el catálogo inicial trae solo 50)
  const combo = bindPropCombo(ov, 'rpp', {
    grupos: [
      { label: 'Mis arriendos', items: props.arriendos },
      { label: 'Propiedades que visité', items: props.visitas },
      { label: 'Otras propiedades publicadas', items: props.otras },
    ],
    buscarRemoto: async (q) => { const r = await PropiedadesApi.findAll({ q, limit: 20 }); return r?.ok ? r.data : []; },
    // Sugiere el canon de la propiedad elegida si el monto está vacío y el concepto es el canon
    onSelect: (prop) => {
      if (prop?.precio && !getEl('rpm').value && concepto.value() === CONCEPTOS[0]) getEl('rpm').value = formatNum(prop.precio);
    },
  });

  getEl('rpok').onclick = async () => {
    const dto = {
      propId:   combo.value(),
      concepto: concepto.value(),
      monto:    parseCOP(getEl('rpm').value),
      fecha:    getEl('rpf').value,
      metodo:   getEl('rpmet').value,
    };
    if (!dto.propId) return showToast('Busca y elige la propiedad de la lista','warning');
    if (!dto.concepto) return showToast('Selecciona el concepto del pago','warning');
    if (!Number.isFinite(dto.monto) || dto.monto < 1) return showToast('Ingresa un monto válido mayor a $0','warning');
    if (!dto.fecha) return showToast('Selecciona la fecha','warning');
    let guardado = null;
    try {
      await withLoading(getEl('rpok'), async () => {
        guardado = await reportarPago(dto);
        await comp.guardar(guardado.id);
      });
      close(); showToast('Pago reportado ✓ El arrendador lo revisará','success'); await refreshView();
    } catch(e) {
      if (guardado) { close(); await refreshView(); showErrorAlert('El pago se reportó, pero no el comprobante', e.message + '. Puedes adjuntarlo desde la tabla.'); }
      else showToast(e.message || 'Error','error');
    }
  };
}

// Adjunta un comprobante directo desde la tabla (abre el selector de archivos)
export function adjuntarComprobante(pagoId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = COMPROBANTE_TYPES.join(',');
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    const err = validarComprobante(f);
    if (err) return showToast(err, 'warning');
    try {
      await subirComprobante(pagoId, f);
      showToast('Comprobante adjuntado ✓','success'); await refreshView();
    } catch(e) { showErrorAlert('No se pudo adjuntar el comprobante', e.message); }
  };
  input.click();
}

// ── Visor del comprobante (imagen o PDF) ──────────────────────
// El archivo es privado: se descarga con el token y se muestra como blob
export async function openComprobante(pagoId) {
  const p = (State.pagos || []).find(x => x.id === pagoId);
  const r = await PagosApi.comprobante(pagoId);
  if (!r?.ok) return showErrorAlert('No se pudo abrir el comprobante', r?.error?.message);

  const url   = URL.createObjectURL(r.blob);
  const esPdf = r.blob.type === 'application/pdf';
  const ext   = esPdf ? 'pdf' : (r.blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const ov    = createOverlay();
  ov.innerHTML = `
    <div class="modal-box comp-viewer">
      <div class="mh"><div><div class="mh-title">🧾 Comprobante de pago</div>
        ${p ? `<div class="mh-sub">${formatCOP(p.monto)} · ${sanitize(formatFecha(p.fecha))}${p.concepto ? ' · ' + sanitize(p.concepto) : ''}</div>` : ''}</div>
        <button class="btn-mx" id="cvx">✕</button></div>
      <div class="comp-view-body">
        ${esPdf ? `<iframe src="${url}" title="Comprobante PDF"></iframe>` : `<img src="${url}" alt="Comprobante de pago"/>`}
      </div>
      <div class="mf-foot">
        <a class="btn-g" href="${url}" target="_blank" rel="noopener">↗ Abrir en otra pestaña</a>
        <a class="btn-a" href="${url}" download="comprobante-${sanitize(p?.fecha || 'pago')}.${ext}">⬇ Descargar</a>
      </div>
    </div>`;

  getEl('cvx').onclick = () => ov.remove();
  onRemoved(ov, () => URL.revokeObjectURL(url));
}

export async function confirmDeletePago(pagoId) {
  const p  = (State.pagos || []).find(x => x.id === pagoId);
  const ok = await confirmDialog('¿Eliminar pago?', p ? `Se eliminará el registro de <strong>${formatCOP(p.monto)}</strong> del ${sanitize(formatFecha(p.fecha))}.` : 'Esta acción no se puede deshacer.');
  if (!ok) return;
  try { await deletePago(pagoId); showToast('Pago eliminado','error'); await refreshView(); }
  catch(e) { showToast(e.message || 'Error','error'); }
}

// ── Completar perfil (primer login con Google) ────────────────
export function openCompleteProfileModal(user) {
  const ov = createOverlay();
  ov.id = 'complete-profile-modal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
  ov.innerHTML = `
    <div class="modal-box" style="max-width:420px;width:90%;padding:28px;background:#fff;border-radius:12px;">
      <h2 style="font-size:20px;font-weight:800;color:var(--t1);margin-bottom:4px">Termina de verificar tu perfil</h2>
      <p style="font-size:13px;color:var(--t2);margin-bottom:18px">Ya iniciaste sesión con Google. Confirma estos datos para continuar.</p>
      <div class="afl">
        <label>Nombre</label>
        <input id="cp-name" type="text" value="${sanitize(user.nombre ?? '')}"/>
      </div>
      <div class="afl">
        <label>Apellido</label>
        <input id="cp-apellido" type="text" value="${sanitize(user.apellido ?? '')}"/>
      </div>
      <div class="afl">
        <label>Correo</label>
        <input type="email" value="${sanitize(user.email ?? '')}" disabled/>
      </div>
      <div class="afl">
        <label>Teléfono</label>
        <input id="cp-phone" type="tel" placeholder="+57 300 000 0000"/>
      </div>
      <div class="afl">
        <label>Tu rol</label>
        <div class="role-grid">
          <label class="ro">
            <input type="radio" name="cp-rol" value="arrendador"/>
            <div class="rb">
              <div class="rb-ico">🏠</div>
              <div class="rb-name">Arrendador</div>
              <div class="rb-desc">Publico propiedades</div>
            </div>
          </label>
          <label class="ro">
            <input type="radio" name="cp-rol" value="inquilino"/>
            <div class="rb">
              <div class="rb-ico">🔑</div>
              <div class="rb-name">Inquilino</div>
              <div class="rb-desc">Busco propiedad</div>
            </div>
          </label>
        </div>
      </div>
      <button class="btn-auth" style="margin-top:8px" onclick="window.__completeProfile()">Continuar</button>
    </div>`;
}

export { markPagoAsPaid };
