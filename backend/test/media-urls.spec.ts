// Pruebas unitarias: parser de YouTube y normalización de ciudades (node:test, sin dependencias extra)
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { youtubeId, youtubeEmbedUrl, normalizarVideo, normalizarCiudad } from '../src/common/utils/media-urls';

const ID = 'dQw4w9WgXcQ';

test('youtubeId reconoce todos los formatos de enlace', () => {
  const urls = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc123`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=share`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `  https://youtu.be/${ID}  `,
  ];
  for (const u of urls) assert.equal(youtubeId(u), ID, u);
});

test('youtubeId rechaza enlaces que no son de un video de YouTube', () => {
  for (const u of ['', null, undefined, 'no es url', 'https://vimeo.com/123456',
                   'https://www.youtube.com/channel/UC123', 'https://www.youtube.com/watch?v=corto',
                   'https://evil.com/watch?v=' + ID, 'javascript:alert(1)']) {
    assert.equal(youtubeId(u as any), null, String(u));
  }
});

test('youtubeEmbedUrl genera la URL limpia de incrustado (con inicio si viene t=)', () => {
  assert.equal(youtubeEmbedUrl(`https://www.youtube.com/watch?v=${ID}`), `https://www.youtube.com/embed/${ID}`);
  assert.equal(youtubeEmbedUrl(`https://youtu.be/${ID}?t=90`), `https://www.youtube.com/embed/${ID}?start=90`);
  assert.equal(youtubeEmbedUrl(`https://youtu.be/${ID}?t=1m30s`), `https://www.youtube.com/embed/${ID}?start=90`);
  assert.equal(youtubeEmbedUrl('https://vimeo.com/123'), null);
});

test('normalizarVideo convierte YouTube y deja otros proveedores tal cual', () => {
  assert.equal(normalizarVideo(`https://youtu.be/${ID}`), `https://www.youtube.com/embed/${ID}`);
  assert.equal(normalizarVideo(' https://vimeo.com/123 '), 'https://vimeo.com/123');
  assert.equal(normalizarVideo(null), null);
  assert.equal(normalizarVideo(undefined), undefined);
});

test('normalizarCiudad guarda en minúsculas y sin espacios repetidos', () => {
  assert.equal(normalizarCiudad('  Ciudad de   México '), 'ciudad de méxico');
  assert.equal(normalizarCiudad('BOGOTÁ'), 'bogotá');
  assert.equal(normalizarCiudad('San José'), 'san josé');
  assert.equal(normalizarCiudad(42 as any), 42);
});
