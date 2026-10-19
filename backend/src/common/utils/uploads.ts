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
