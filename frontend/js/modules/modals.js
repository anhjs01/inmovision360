/**
 * modals.js — Modales conectados al backend API
 */
'use strict';

import { State, addProp, updateProp, deleteProp, getPropById,
         getMyProps, toggleFav, isFav, addVisita, updateVisita, updateVisitaEstado,
         deleteVisita, solicitarVisita, addLead, updateLead, deleteLead,
         addPago, updatePago, deletePago, markPagoAsPaid } from './store.js';
import { showToast, refreshView, updateBadges } from './ui.js';
import { sanitize, formatCOP, capitalize, getEl, safeUrl,
         CITY_LABELS, AMENITY_LABELS, LISTING_LABELS } from '../utils.js';
import { MensajesApi, PropiedadesApi, mediaUrl } from '../api.js';

const MAX_FOTOS      = 20;
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const FOTO_TYPES     = ['image/jpeg', 'image/png', 'image/webp'];

// ── Helper: crear overlay ─────────────────────────────────────
function createOverlay() {
  const ov = document.createElement('div');
  ov.className = 'modal-bg';
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  return ov;
}

// ── Helper: diálogo de confirmación (devuelve Promise<boolean>) ──
export function confirmDialog(title, message, okLabel = 'Eliminar') {
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

function today() { return new Date().toISOString().slice(0, 10); }

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
  const prop = await getPropById(propId);
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
          <div style="width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000">
            <iframe src="${sanitize(tourUrl)}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>
          </div>
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

      <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;padding:20px">
        <div>
          <div style="display:flex;gap:18px;flex-wrap:wrap;padding:14px 0;border-top:1px solid var(--bo);border-bottom:1px solid var(--bo);margin-bottom:16px">
            <span style="font-size:13px;color:var(--t2)">🛏️ <strong>${prop.habitaciones}</strong> dorm.</span>
            <span style="font-size:13px;color:var(--t2)">🚿 <strong>${prop.banos}</strong> baños</span>
            <span style="font-size:13px;color:var(--t2)">📐 <strong>${prop.metros}</strong> m²</span>
            ${prop.parqueaderos?`<span style="font-size:13px;color:var(--t2)">🚗 <strong>${prop.parqueaderos}</strong> parq.</span>`:''}
          </div>
          <h4 style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Comodidades</h4>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${(prop.comodidades??[]).map(a=>`<span class="pc-tg">${AMENITY_LABELS[a]??sanitize(a)}</span>`).join('')}
          </div>
        </div>
        <div style="background:#f9fafb;border:1px solid var(--bo);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px;align-self:start">
          <div style="font-size:28px;font-weight:800;color:var(--pr)">${formatCOP(prop.precio)}</div>
          <div style="font-size:12px;color:var(--t3);margin-top:-8px">COP / mes</div>
          ${esInq?`<button class="btn-a" onclick="window.__solicitarVisita('${prop.id}')">📅 Agendar visita</button>`:''}
          ${!esPropia?`<button class="btn-p" style="background:#0f172a" onclick="window.__sendMsg('${prop.id}','${prop.ownerId}')">💬 Contactar arrendador</button>`:''}
          <button id="det-fav-btn" style="padding:10px;border-radius:10px;border:1.5px solid #fed7aa;background:#fff8ed;color:var(--wa);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--f)"
            onclick="window.__toggleFavDetail('${prop.id}',this)">${isFav(prop.id)?'❤️ En favoritos':'🤍 Guardar'}</button>
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bo);font-size:12px;color:var(--t3);line-height:2">
            📞 +57 310 555 0101<br>📧 arrendador@inmovision360.co<br><span style="color:var(--ac);font-weight:600">✅ Verificado</span>
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
        <div class="mf"><label>Precio COP/mes *</label><input id="fp" type="number" value="${prop?.precio??''}" placeholder="1800000" min="100000"/></div>
        <div class="mf"><label>Estrato</label><select id="fest"><option value="">Sin estrato</option>${[1,2,3,4,5,6].map(e=>`<option value="${e}"${prop?.estrato===e?' selected':''}>${e}</option>`).join('')}</select></div>
      </div></div>

      <!-- Paso 2 -->
      <div class="fstep-pane" id="fsp-1"><div class="mgrid">
        <div class="mf"><label>Área m² *</label><input id="fm" type="number" value="${prop?.metros??''}" placeholder="90" min="10"/></div>
        <div class="mf"><label>Parqueaderos</label><input id="fpark" type="number" value="${prop?.parqueaderos??0}" min="0"/></div>
        <div class="mf"><label>Habitaciones</label><div class="stepper"><button type="button" class="step-b" id="hd">−</button><span class="step-v" id="hv">${habitaciones}</span><button type="button" class="step-b" id="hi">+</button></div></div>
        <div class="mf"><label>Baños</label><div class="stepper"><button type="button" class="step-b" id="bd">−</button><span class="step-v" id="bv">${banos}</span><button type="button" class="step-b" id="bi">+</button></div></div>
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
  getEl('fnx').onclick = () => { if (currentStep<3) goStep(currentStep+1); };
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
    const precio  = parseInt(getEl('fp').value);
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
      habitaciones, banos,
      fotos,
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
  ov.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="mh"><div><div class="mh-title">📅 Agendar visita</div><div class="mh-sub">${sanitize(prop.titulo)}</div></div><button class="btn-mx" id="svx">✕</button></div>
      <div style="padding:24px 28px;display:flex;flex-direction:column;gap:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Fecha *</label><input id="svf" type="date" min="${today()}"/></div>
          <div class="mf"><label>Hora *</label><input id="svh" type="time"/></div>
        </div>
        <div class="mf"><label>Nota para el arrendador</label><input id="svn" placeholder="Opcional" maxlength="300"/></div>
      </div>
      <div class="mf-foot">
        <button class="btn-g" id="svc">Cancelar</button>
        <button class="btn-a" id="svok">Solicitar visita</button>
      </div>
    </div>`;

  const close = () => ov.remove();
  getEl('svx').onclick = close; getEl('svc').onclick = close;
  getEl('svok').onclick = async () => {
    const fecha = getEl('svf').value, hora = getEl('svh').value;
    if (!fecha || !hora) return showToast('Elige fecha y hora','warning');
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
  const metodos = ['PSE','Nequi','Daviplata','Tarjeta','Efectivo'];
  const ov = createOverlay();

  ov.innerHTML = `
    <div class="modal-box" style="max-width:450px">
      <div class="mh"><div><div class="mh-title">${p ? '✏️ Editar pago' : 'Registrar pago'}</div></div><button class="btn-mx" id="pgx">✕</button></div>
      <div style="padding:24px 28px;display:flex;flex-direction:column;gap:16px">
        <div class="mf"><label>Inquilino (nombre o email) *</label><input id="pgi" placeholder="Ej: Valentina Torres o inquilino@demo.co" value="${sanitize(p?.inq?.email ?? '')}"/></div>
        <div class="mf"><label>Propiedad *</label><select id="pgp"><option value="">Selecciona…</option>${propOptions(myProps, p?.propId)}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Monto (COP) *</label><input id="pgm" type="number" min="1" placeholder="1800000" value="${p?.monto ?? ''}"/></div>
          <div class="mf"><label>Fecha *</label><input id="pgf" type="date" value="${sanitize(p?.fecha ?? today())}"/></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="mf"><label>Método</label><select id="pgmet">${metodos.map(m => `<option${p?.metodo===m?' selected':''}>${m}</option>`).join('')}</select></div>
          <div class="mf"><label>Estado</label><select id="pge">
            ${[['pagado','Pagado'],['pendiente','Pendiente'],['vencido','Vencido']].map(([val,lbl]) => `<option value="${val}"${p?.estado===val?' selected':''}>${lbl}</option>`).join('')}
          </select></div>
        </div>
      </div>
      <div class="mf-foot">
        <button class="btn-g" id="pgc">Cancelar</button>
        <button class="btn-a" id="pgok">${p ? '💾 Guardar' : 'Registrar'}</button>
      </div>
    </div>`;

  const close = () => ov.remove();
  getEl('pgx').onclick = close; getEl('pgc').onclick = close;
  getEl('pgok').onclick = async () => {
    const dto = {
      inquilino: getEl('pgi').value.trim(),
      propId:    getEl('pgp').value,
      monto:     parseInt(getEl('pgm').value),
      fecha:     getEl('pgf').value,
      estado:    getEl('pge').value,
      metodo:    getEl('pgmet').value,
    };
    // Al editar, no se reasigna el inquilino si no se cambió
    if (p && (!dto.inquilino || dto.inquilino === (p.inq?.email ?? ''))) delete dto.inquilino;
    if ((!p && !dto.inquilino) || !dto.propId || !dto.monto || !dto.fecha) return showToast('Completa todos los campos','warning');
    if (dto.monto < 1) return showToast('El monto debe ser mayor a 0','warning');
    try {
      await withLoading(getEl('pgok'), () => p ? updatePago(p.id, dto) : addPago(dto));
      close(); showToast(p ? 'Pago actualizado ✓' : 'Pago registrado ✓','success'); await refreshView();
    } catch(e) { showToast(e.message || 'Error','error'); }
  };
}

export async function confirmDeletePago(pagoId) {
  const p  = (State.pagos || []).find(x => x.id === pagoId);
  const ok = await confirmDialog('¿Eliminar pago?', p ? `Se eliminará el registro de <strong>${formatCOP(p.monto)}</strong> del ${sanitize(p.fecha)}.` : 'Esta acción no se puede deshacer.');
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
