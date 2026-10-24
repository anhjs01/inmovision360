// ── Videos de YouTube ─────────────────────────────────────────
// Acepta watch?v=, youtu.be/, shorts/, live/, embed/ y youtube-nocookie; devuelve el ID de 11 caracteres o null
const YT_ID = /^[\w-]{11}$/;

export function youtubeId(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = u.pathname.split('/')[1] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch')                                   id = u.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1] ?? null;
  }
  return id && YT_ID.test(id) ? id : null;
}

// "1m30s" | "90s" | "90" → 90
function segundos(t: string | null): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m ? (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) : 0;
}

// URL limpia de incrustado (https://www.youtube.com/embed/ID[?start=N]); null si no es de YouTube
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  if (!id) return null;
  let start = 0;
  try { const u = new URL(String(url).trim()); start = segundos(u.searchParams.get('t') ?? u.searchParams.get('start')); } catch { /* sin inicio */ }
  return `https://www.youtube.com/embed/${id}` + (start ? `?start=${start}` : '');
}

// Videos de YouTube se guardan como URL de incrustado; otros enlaces se dejan tal cual
export function normalizarVideo(url: any): any {
  if (typeof url !== 'string') return url;
  const t = url.trim();
  return youtubeEmbedUrl(t) ?? t;
}

// ── Ciudades ──────────────────────────────────────────────────
// Se guardan en minúsculas y sin espacios repetidos ("Ciudad de  México " → "ciudad de méxico")
export function normalizarCiudad(ciudad: any): any {
  return typeof ciudad === 'string' ? ciudad.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es') : ciudad;
}
