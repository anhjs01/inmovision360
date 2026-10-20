import * as fs   from 'fs';
import * as path from 'path';

// Carpeta de archivos subidos (servida en /uploads por main.ts)
export const UPLOAD_DIR    = path.join(process.cwd(), 'uploads');
export const UPLOAD_PREFIX = '/uploads/';

export const IMAGE_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FOTOS       = 20;

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Borra del disco las fotos locales (/uploads/...) indicadas; ignora URLs externas
export function deleteUploadedFiles(urls: string[]) {
  for (const url of urls) {
    if (!url?.startsWith(UPLOAD_PREFIX)) continue;
    const filePath = path.join(UPLOAD_DIR, path.basename(url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

// ── Comprobantes de pago ─────────────────────────────────────
// Se guardan en uploads/comprobantes/ pero NO se sirven como estáticos (main.ts
// bloquea la ruta): solo se descargan por GET /pagos/:id/comprobante con permisos.
export const COMPROBANTE_DIR    = path.join(UPLOAD_DIR, 'comprobantes');
export const COMPROBANTE_PREFIX = UPLOAD_PREFIX + 'comprobantes/';
export const COMPROBANTE_MIME_EXT: Record<string, string> = {
  ...IMAGE_MIME_EXT,
  'application/pdf': '.pdf',
};
export const COMPROBANTE_EXT_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(COMPROBANTE_MIME_EXT).map(([mime, ext]) => [ext, mime]),
);

// Verifica la firma real del archivo (el mimetype lo declara el cliente y se puede falsificar)
export function firmaCoincide(buf: Buffer, mime: string): boolean {
  if (!buf || buf.length < 12) return false;
  switch (mime) {
    case 'image/jpeg':      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'image/png':       return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':      return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
    case 'application/pdf': return buf.toString('ascii', 0, 5) === '%PDF-';
    default:                return false;
  }
}

// Ruta en disco de un comprobante guardado; null si la URL no es de comprobantes
export function comprobantePath(url?: string | null): string | null {
  if (!url?.startsWith(COMPROBANTE_PREFIX)) return null;
  return path.join(COMPROBANTE_DIR, path.basename(url));
}

export function deleteComprobante(url?: string | null) {
  const filePath = comprobantePath(url);
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
