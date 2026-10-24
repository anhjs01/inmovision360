// Pruebas de utils.js con el runner nativo de Node (sin dependencias): npm test en frontend/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  youtubeId, youtubeEmbedUrl, videoEmbedUrl,
  cityKey, cityLabel, CIUDADES, CITY_LABELS, citiesDatalistHtml,
  waNumber, waLink, waMensajePropiedad, waPropiedad, WHATSAPP_SOPORTE, WA_PLANTILLA_DEFAULT,
  esVip,
} from '../js/utils.js';

const ID = 'dQw4w9WgXcQ';

// ── 4. YouTube ─────────────────────────────────────────────────
test('youtubeEmbedUrl: watch, youtu.be, shorts, live y embed → /embed/ID', () => {
  for (const u of [`https://www.youtube.com/watch?v=${ID}`, `https://youtu.be/${ID}`, `https://youtu.be/${ID}?si=x`,
                   `https://www.youtube.com/shorts/${ID}`, `https://www.youtube.com/live/${ID}`,
                   `https://m.youtube.com/watch?v=${ID}&feature=share`, `https://www.youtube.com/embed/${ID}`]) {
    assert.equal(youtubeEmbedUrl(u), `https://www.youtube.com/embed/${ID}`, u);
  }
  assert.equal(youtubeEmbedUrl(`https://youtu.be/${ID}?t=2m`), `https://www.youtube.com/embed/${ID}?start=120`);
});

test('videoEmbedUrl: otros proveedores http(s) tal cual; nada inseguro', () => {
  assert.equal(videoEmbedUrl('https://vimeo.com/123'), 'https://vimeo.com/123');
  assert.equal(videoEmbedUrl('javascript:alert(1)'), '');
  assert.equal(videoEmbedUrl(''), '');
  assert.equal(videoEmbedUrl(null), '');
  assert.equal(youtubeId('https://www.youtube.com/watch?v=malo'), null);
});

// ── 3. Ciudades LATAM ──────────────────────────────────────────
test('el catálogo incluye las principales ciudades de Latinoamérica', () => {
  for (const c of ['Bogotá', 'Medellín', 'Cali', 'Ciudad de México', 'Buenos Aires', 'Lima', 'Santiago', 'San José']) {
    assert.ok(CIUDADES.some(x => x.label === c), c);
  }
  assert.equal(CITY_LABELS['bogotá'], 'Bogotá');   // las claves existentes no cambian
});

test('cityKey: tolera tildes, mayúsculas, espacios y "Ciudad, País"', () => {
  assert.equal(cityKey('bogota'), 'bogotá');
  assert.equal(cityKey('  MEDELLIN '), 'medellín');
  assert.equal(cityKey('Lima, Perú'), 'lima');
  assert.equal(cityKey('ciudad de mexico'), 'ciudad de méxico');
  assert.equal(cityKey('Zipaquirá'), 'zipaquirá');          // municipio fuera de la lista
  assert.equal(cityKey('San   Andrés'), 'san andrés');
  assert.equal(cityKey(''), '');
});

test('cityLabel: conocidas con su nombre; escritas a mano en formato título', () => {
  assert.equal(cityLabel('ciudad de méxico'), 'Ciudad de México');
  assert.equal(cityLabel('zipaquirá'), 'Zipaquirá');
  assert.equal(cityLabel('san andrés'), 'San Andrés');
  assert.equal(cityLabel(''), '');
});

test('citiesDatalistHtml genera las opciones con el país', () => {
  const html = citiesDatalistHtml('x');
  assert.ok(html.startsWith('<datalist id="x">'));
  assert.ok(html.includes('<option value="Buenos Aires">Argentina</option>'));
});

// ── 5. WhatsApp ────────────────────────────────────────────────
test('waNumber: Colombia sin indicativo y LATAM con indicativo', () => {
  assert.equal(waNumber('310 555 0101'), '573105550101');
  assert.equal(waNumber('+52 55 1234 5678'), '525512345678');
  assert.equal(waNumber('0054 9 11 1234 5678'), '5491112345678');
  assert.equal(waNumber('12345'), '');
});

const PROP = { titulo: 'Loft Roma', ciudad: 'ciudad de méxico', precio: 2500000, listing: 'rent',
               contacto: { nombre: 'Ana Pérez', telefono: '+52 55 1234 5678', waMensaje: null } };

test('waPropiedad abre el chat del arrendador con el mensaje predeterminado', () => {
  const wa = waPropiedad(PROP);
  assert.equal(wa.directo, true);
  assert.ok(wa.href.startsWith('https://wa.me/525512345678?text='));
  const texto = decodeURIComponent(wa.href.split('text=')[1]);
  assert.match(texto, /^Hola Ana 👋, vi en INMOVISIÓN 360 la propiedad "Loft Roma" \(Ciudad de México, \$2\.500\.000 COP\/mes\)/);
});

test('waPropiedad usa la plantilla del arrendador y cae a soporte sin teléfono', () => {
  const conPlantilla = { ...PROP, contacto: { ...PROP.contacto, waMensaje: 'Buenas {arrendador}: ¿sigue libre {propiedad} ({precio})?' } };
  assert.equal(waMensajePropiedad(conPlantilla), 'Buenas Ana: ¿sigue libre Loft Roma ($2.500.000 COP/mes)?');

  const sinTel = waPropiedad({ ...PROP, contacto: { nombre: '', telefono: null } });
  assert.equal(sinTel.directo, false);
  assert.ok(sinTel.href.startsWith(`https://wa.me/${WHATSAPP_SOPORTE}?text=`));
  assert.ok(decodeURIComponent(sinTel.href).includes('Hola 👋, vi en'));   // sin nombre no queda "Hola  👋"
});

test('waMensajePropiedad: plantilla de prueba (botón "Probar mi enlace")', () => {
  assert.equal(waMensajePropiedad(PROP, '{propiedad} en {ciudad}'), 'Loft Roma en Ciudad de México');
  assert.ok(WA_PLANTILLA_DEFAULT.includes('{propiedad}'));
  assert.equal(waLink('', 'x'), '');
});

// ── 1. Pass VIP ────────────────────────────────────────────────
test('esVip solo aplica a inquilinos con el Pass', () => {
  assert.equal(esVip({ rol: 'inquilino', plan: 'inquilino_vip' }), true);
  assert.equal(esVip({ rol: 'inquilino', plan: 'free' }), false);
  assert.equal(esVip({ rol: 'arrendador', plan: 'inquilino_vip' }), false);
  assert.equal(esVip(null), false);
});
