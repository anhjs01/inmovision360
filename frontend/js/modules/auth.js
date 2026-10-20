/**
 * auth.js — Autenticación conectada al backend API
 */
'use strict';

import { login, register, logout, loadMe, loginGoogle, completeProfile, State } from './store.js';
import { showToast, showErrorAlert } from './ui.js';
import { getEl, sanitize } from '../utils.js';
import { AuthApi }     from '../api.js';

export function openAuth(tab='l') {
  getEl('auth').style.display    = 'flex';
  getEl('landing').style.display = 'none';
  switchAuthTab(tab === 'r' ? 'register' : 'login');
}

export function closeAuth() {
  getEl('auth').style.display    = 'none';
  getEl('landing').style.display = 'block';
}

export function switchAuthTab(tab) {
  document.querySelectorAll('.atab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  getEl('form-login').style.display    = tab === 'login'    ? 'flex' : 'none';
  getEl('form-register').style.display = tab === 'register' ? 'flex' : 'none';
  initGoogleButtons();
}

export function togglePasswordVisibility(inputId, iconEl) {
  const input = getEl(inputId);
  if (!input) return;
  input.type         = input.type === 'password' ? 'text' : 'password';
  iconEl.textContent = input.type === 'password' ? '👁' : '🙈';
}

export function renderPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)          score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { pct:'0%',   color:'#e5e7eb', label:'' },
    { pct:'25%',  color:'#ef4444', label:'😬 Muy débil' },
    { pct:'50%',  color:'#f59e0b', label:'😐 Débil' },
    { pct:'75%',  color:'#3b82f6', label:'🙂 Buena' },
    { pct:'100%', color:'#0f9d58', label:'💪 Fuerte' },
  ];
  const lv  = levels[score];
  const bar = getEl('str-fill'); const lbl = getEl('str-lbl');
  if (bar) { bar.style.width = lv.pct; bar.style.background = lv.color; }
  if (lbl) { lbl.textContent = lv.label; lbl.style.color = lv.color; }
}

export async function handleLogin() {
  const email = getEl('l-email')?.value.trim();
  const pass  = getEl('l-pass')?.value;
  const errEl = getEl('l-gerr');
  const btn   = getEl('btn-login');

  if (!email || !pass) { showError(errEl, 'Completa todos los campos'); return; }

  // El botón siempre se restaura: si no, tras cerrar sesión quedaba deshabilitado
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳ Ingresando...';
  try {
    const user = await login(email, pass);
    if (!user) { showError(errEl, 'Email o contraseña incorrectos'); showErrorAlert('No pudimos iniciar sesión', 'Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.'); return; }
    errEl.style.display = 'none';
    getEl('l-pass').value = '';
    launchApp(user);
  } catch (e) {
    showError(errEl, 'Error de conexión con el servidor');
    showErrorAlert('Sin conexión', 'No se pudo conectar con el servidor. ¿El backend está corriendo?');
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

export async function handleRegister() {
  const nombre = getEl('r-name')?.value.trim();
  const email  = getEl('r-email')?.value.trim();
  const pass   = getEl('r-pass')?.value;
  const rolEl  = document.querySelector('input[name="rol"]:checked');
  const errEl  = getEl('r-gerr');
  const btn    = getEl('btn-reg');

  if (!nombre || !email || !pass || !rolEl) { showError(errEl, 'Completa todos los campos'); return; }
  if (pass.length < 6) { showError(errEl, 'Contraseña mínimo 6 caracteres'); return; }

  const label = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳ Creando cuenta...';
  try {
    const [primerNombre, ...resto] = nombre.split(' ');
    const r = await register({ nombre: primerNombre, apellido: resto.join(' ') || '', email, pass, rol: rolEl.value });
    // Se muestra el mensaje real del backend (email repetido, email inválido, etc.)
    if (r.error) { showError(errEl, r.error); showErrorAlert('No pudimos crear tu cuenta', r.error); return; }
    errEl.style.display = 'none';
    getEl('r-pass').value = '';
    launchApp(r.user);
  } catch (e) {
    showError(errEl, 'Error de conexión con el servidor');
    showErrorAlert('Sin conexión', 'No se pudo conectar con el servidor. ¿El backend está corriendo?');
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

export async function loginDemo(rol) {
  const creds = { arrendador: { email: 'arrendador@demo.co', pass: 'demo1234' }, inquilino: { email: 'inquilino@demo.co', pass: 'demo1234' } };
  const c = creds[rol];
  showToast(`Iniciando demo ${rol}…`, 'info');
  const user = await login(c.email, c.pass);
  if (user) launchApp(user);
  else showErrorAlert('No se pudo iniciar la demo', '¿El backend está corriendo y la base tiene los datos demo (npm run db:seed)?');
}

export async function handleLogout() {
  await logout();
  getEl('app').style.display     = 'none';
  getEl('landing').style.display = 'block';
  showToast('Sesión cerrada', 'info');
}

function showError(el, msg) {
  if (!el) return;
  el.style.display  = 'flex';
  el.innerHTML      = `⚠️ ${sanitize(msg)}`;
}

function launchApp(user) {
  getEl('complete-profile-modal')?.remove();
  import('./ui.js').then(({ initApp }) => {
    getEl('auth').style.display    = 'none';
    getEl('landing').style.display = 'none';
    getEl('app').style.display     = 'flex';
    initApp(user);
  });
}

// ── modules/auth.js: reemplaza handleGoogleCredential  ──
export async function handleGoogleCredential(response) {
  const mode = getEl('form-register')?.style.display === 'flex' ? 'register' : 'login';
  try {
    const result = await loginGoogle(response.credential, mode);
    if (result.error) { showErrorAlert('Error con Google', result.error); return; }
    if (result.needsProfile) {
      const { openCompleteProfileModal } = await import('./modals.js');
      openCompleteProfileModal(result.user);
    } else {
      launchApp(result.user);
    }
  } catch (e) {
    showErrorAlert('Error de conexión con Google', 'Intenta de nuevo en unos segundos.');
  }
}

export async function handleCompleteProfile(nombre, apellido, telefono, rol) {
  if (!nombre || !telefono || !rol) { showToast('Completa nombre, teléfono y rol', 'error'); return; }
  const user = await completeProfile({ nombre, apellido, telefono, rol });
  if (!user) { showToast('No se pudo guardar tu perfil', 'error'); return; }
  launchApp(user);
}

export function initGoogleButtons() {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id: '455077627745-magboajj5j5nbiv09e5ebsuai8ju2g13.apps.googleusercontent.com',
    callback:  handleGoogleCredential,
  });
  ['g_btn_login', 'g_btn_register'].forEach(id => {
    const el = getEl(id);
    if (el) window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
  });
}