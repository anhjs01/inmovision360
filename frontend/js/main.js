/**
 * main.js — Entrada principal. Landing pública + puentes globales.
 */
'use strict';

import { openAuth, closeAuth, switchAuthTab, togglePasswordVisibility,
         renderPasswordStrength, handleLogin, handleRegister,
         loginDemo, handleLogout } from './modules/auth.js';
import { showToast, showView, updateBadges, saveConfig,
         selectMessage }           from './modules/ui.js';
import { openSoftGate, openDetail, openWompi, openPropertyForm,
         confirmDeleteProp, openVisitaForm, toggleVisitaEstado,
         openLeadForm, openPagoForm }   from './modules/modals.js';
import { State, toggleFav, isFav, getAllProps,
         getPropById, markPagoAsPaid, loadMe, loadFavs } from './modules/store.js';
import { getEl, sanitize, formatCOP, CITY_LABELS, AMENITY_LABELS } from './utils.js';
import { PropiedadesApi } from './api.js';

// ── Puentes globales (window.__fn) ────────────────────────────
window.__openAuth        = openAuth;
window.__openForm        = openPropertyForm;
window.__confirmDel      = confirmDeleteProp;
window.__openDetail      = openDetail;
window.__openVisitaForm  = openVisitaForm;
window.__toggleVisita    = toggleVisitaEstado;
window.__openLeadForm    = openLeadForm;
window.__openPagoForm    = openPagoForm;
window.__markPago        = markPagoAsPaid;
window.__openWompi       = openWompi;
window.__toast           = showToast;
window.__logout          = handleLogout;
window.__saveConfig      = saveConfig;
window.__selectMsg       = selectMessage;
window.__showView        = showView;
window.__switchTab       = switchAuthTab;
window.__togglePass      = togglePasswordVisibility;
window.__checkStr        = renderPasswordStrength;
window.__doLogin         = handleLogin;
window.__doRegister      = handleRegister;
window.__quickLogin      = loginDemo;
window.__scrollTo        = (id) => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });

window.__toggleFavBtn = async (propId, btn) => {
  const added = await toggleFav(propId);
  btn.textContent = added ? '❤️' : '🤍';
  if (added) showToast('Guardado en favoritos ❤️','success');
  await updateBadges();
};

// ── Catálogo público (landing) ────────────────────────────────
const cardSlide = {};
let pubFilter   = { tipo:'', ciudad:'', q:'', tourOnly:false };
let pubSort     = 'default';

function renderPublicCard(p) {
  const photos = p.fotos ?? [];
  const sk     = 's' + p.id;
  if (!(sk in cardSlide)) cardSlide[sk] = 0;
  const cur    = cardSlide[sk];
  return `
    <div class="pub-card">
      <div class="pc-gallery" id="gal-${p.id}">
        <div class="pc-gallery-slides" id="slides-${p.id}" style="transform:translateX(-${cur*100}%)">
          ${photos.length
            ? photos.map(f=>`<div class="pc-slide"><img src="${sanitize(f)}" loading="lazy" alt="${sanitize(p.titulo)}" onerror="this.parentElement.innerHTML='<div style=\\'display:grid;place-items:center;height:100%;font-size:40px;background:#e8edf7\\'>🏠</div>'"></div>`).join('')
            : '<div class="pc-slide"><div class="pc-slide-placeholder">🏠</div></div>'}
        </div>
        <button class="pc-arrow pc-arrow-l" onclick="event.stopPropagation();window.__slideCard('${p.id}','${sk}',-1)">‹</button>
        <button class="pc-arrow pc-arrow-r" onclick="event.stopPropagation();window.__slideCard('${p.id}','${sk}',1)">›</button>
        ${photos.length>1?`
          <div class="pc-dots">${photos.map((_,i)=>`<div class="pc-dot-i${i===cur?' active':''}" onclick="event.stopPropagation();window.__goSlide('${p.id}','${sk}',${i})"></div>`).join('')}</div>
          <div class="pc-count">📷 ${cur+1}/${photos.length}</div>`:''
        }
        ${p.tourVirtual?`<span class="pc-badge-tour">🥽 ${sanitize(p.tourTipo??'Tour')}</span>`:''}
        ${p.destacado?'<span class="pc-badge-feat">⭐ Destacado</span>':''}
        <span class="pc-badge-tipo">${sanitize(p.tipo)}</span>
        <button class="pc-fav" onclick="event.stopPropagation();window.__toggleFavLanding('${p.id}',this)">${isFav(p.id)?'❤️':'🤍'}</button>
      </div>
      <div class="pc-body" onclick="window.__openPubDetail('${p.id}')">
        <div class="pc-meta">
          <span class="pc-estrato">${p.estrato?`Estrato ${p.estrato}`:''}</span>
          <span class="pc-barrio">${sanitize(p.barrio??'')}</span>
        </div>
        <div class="pc-title">${sanitize(p.titulo)}</div>
        <div class="pc-loc">📍 ${sanitize(CITY_LABELS[p.ciudad]??p.ciudad)}</div>
        <div class="pc-specs">
          <span>🛏️ <strong>${p.habitaciones}</strong></span>
          <span>🚿 <strong>${p.banos}</strong></span>
          <span>📐 <strong>${p.metros}</strong> m²</span>
        </div>
        <div class="pc-ams">
          ${(p.comodidades??[]).slice(0,3).map(a=>`<span class="pc-am">${AMENITY_LABELS[a]??a}</span>`).join('')}
          ${p.tourVirtual?'<span class="pc-am tour-am">🥽 Tour</span>':''}
          ${p.mapa2d?'<span class="pc-am mapa-am">🗺 Mapa</span>':''}
        </div>
      </div>
      <div class="pc-price-row">
        <div><span class="pc-price">${formatCOP(p.precio)}</span><span class="pc-price-u"> COP/mes</span></div>
        <button class="btn-ver" onclick="window.__openPubDetail('${p.id}')">Ver detalles</button>
      </div>
    </div>`;
}

async function renderPublicCatalog() {
  const grid    = getEl('pub-grid');
  const countEl = getEl('pub-count');
  if (!grid) return;

  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--t3)">⏳ Cargando propiedades…</div>`;

  const params = {};
  if (pubFilter.tipo)     params.tipo         = pubFilter.tipo;
  if (pubFilter.ciudad)   params.ciudad        = pubFilter.ciudad;
  if (pubFilter.q)        params.q             = pubFilter.q;
  if (pubFilter.tourOnly) params.tour_virtual  = 'true';
  if (pubSort !== 'default') params.sort       = pubSort;

  const { data: props, meta } = await getAllProps(params);
  Object.keys(cardSlide).forEach(k => delete cardSlide[k]);

  if (countEl) countEl.textContent = `${meta?.total ?? props.length} propiedad${props.length!==1?'es':''} disponibles`;
  grid.innerHTML = props.length
    ? props.map(renderPublicCard).join('')
    : `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--t3)"><div style="font-size:48px;margin-bottom:12px">🔍</div><h3 style="font-size:20px;font-weight:700;color:var(--t1);margin-bottom:8px">Sin resultados</h3><p>Ajusta los filtros</p></div>`;
}

// Slider controles
window.__slideCard = (propId, sk, dir) => {
  const p = { fotos: [] };
  const slides = getEl(`slides-${propId}`); if (!slides) return;
  const total  = slides.children.length; if (total<=1) return;
  cardSlide[sk] = ((cardSlide[sk]??0) + dir + total) % total;
  slides.style.transform = `translateX(-${cardSlide[sk]*100}%)`;
  _updateSliderUI(propId, sk, total);
};
window.__goSlide = (propId, sk, idx) => {
  const slides = getEl(`slides-${propId}`); if (!slides) return;
  cardSlide[sk] = idx; slides.style.transform = `translateX(-${idx*100}%)`;
  _updateSliderUI(propId, sk, slides.children.length);
};
function _updateSliderUI(propId, sk, total) {
  const gal = getEl(`gal-${propId}`); if (!gal) return;
  gal.querySelectorAll('.pc-dot-i').forEach((d,i)=>d.classList.toggle('active',i===cardSlide[sk]));
  const ctr = gal.querySelector('.pc-count');
  if (ctr) ctr.textContent = `📷 ${cardSlide[sk]+1}/${total}`;
}

window.__toggleFavLanding = async (propId, btn) => {
  const added = await toggleFav(propId);
  btn.textContent = added ? '❤️' : '🤍';
  showToast(added ? 'Guardado ❤️' : 'Eliminado de favoritos','info');
};

window.__openPubDetail = (propId) => {
  if (State.session) openDetail(propId);
  else openSoftGate(propId);
};

window.__heroSearch = () => {
  pubFilter.q      = getEl('hero-q')?.value ?? '';
  pubFilter.ciudad = getEl('hero-city')?.value ?? '';
  const t          = getEl('hero-tipo')?.value;
  if (t) pubFilter.tipo = t;
  renderPublicCatalog();
};

window.__toggleTour = (btn) => {
  pubFilter.tourOnly = !pubFilter.tourOnly;
  btn.classList.toggle('active', pubFilter.tourOnly);
  renderPublicCatalog();
};

// Pills tipo
document.addEventListener('click', e => {
  const pill = e.target.closest('[data-pt]');
  if (!pill) return;
  document.querySelectorAll('[data-pt]').forEach(p=>p.classList.remove('active'));
  pill.classList.add('active');
  pubFilter.tipo = pill.dataset.pt === 'all' ? '' : pill.dataset.pt;
  renderPublicCatalog();
});

// sort catálogo público
document.addEventListener('change', e => {
  if (e.target.id === 'pub-sort') { pubSort = e.target.value; renderPublicCatalog(); }
});

// ── Inicialización ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Restaurar sesión si hay token guardado
  const token = localStorage.getItem('access_token');
  if (token) {
    const user = await loadMe();
    if (user) {
      await loadFavs();
      getEl('landing').style.display = 'none';
      getEl('auth').style.display    = 'none';
      getEl('app').style.display     = 'flex';
      const { initApp } = await import('./modules/ui.js');
      initApp(user);
      return;
    }
  }

  // Landing normal
  renderPublicCatalog();

  // Contador animado hero
  const counterEl = getEl('stat-n');
  if (counterEl) {
    let cur = 0; const target = 247;
    const t = setInterval(() => { cur+=10; counterEl.textContent=Math.min(cur,target); if(cur>=target)clearInterval(t); }, 22);
  }
});

// Notificar que los módulos cargaron
document.dispatchEvent(new Event('app:modules:ready'));

// Marcar todas las funciones globales como listas
['__openAuth','__openForm','__confirmDel','__openDetail',
 '__openVisitaForm','__toggleVisita','__openLeadForm','__openPagoForm',
 '__markPago','__openWompi','__toast','__logout','__saveConfig',
 '__selectMsg','__showView','__switchTab','__togglePass','__checkStr',
 '__doLogin','__doRegister','__quickLogin','__scrollTo','__heroSearch',
 '__toggleTour','__toggleFavBtn','__toggleFavLanding','__openPubDetail',
 '__slideCard','__goSlide','__navFoto','__setFoto','__wompiPay'
].forEach(function(fn) {
  if (window[fn]) window[fn]._loaded = true;
});
