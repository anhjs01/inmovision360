import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';
import { UPLOAD_DIR, UPLOAD_PREFIX, IMAGE_MIME_EXT, MAX_FOTOS,
         ensureUploadDir, deleteUploadedFiles } from '../common/utils/uploads';
import * as fs   from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  private async getOwnProp(propId: string, ownerId: string) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, HttpStatus.NOT_FOUND);
    return { prop, fotos: JSON.parse(prop.fotos || '[]') as string[] };
  }

  private async saveFotos(propId: string, fotos: string[]) {
    const updated = await this.prisma.propiedad.update({ where: { id: propId }, data: { fotos: JSON.stringify(fotos) } });
    return { fotos: JSON.parse(updated.fotos) };
  }

  async addFotos(propId: string, ownerId: string, files: Express.Multer.File[]) {
    const { fotos } = await this.getOwnProp(propId, ownerId);
    if (!files.length) throw new ApiException(ErrorCode.UPLOAD_INVALID, 'No se recibió ninguna imagen', 'fotos');
    if (fotos.length + files.length > MAX_FOTOS)
      throw new ApiException(ErrorCode.UPLOAD_INVALID, `Máximo ${MAX_FOTOS} fotos por propiedad (ya tiene ${fotos.length})`, 'fotos');

    ensureUploadDir();
    // El nombre se genera en el servidor: nunca se usa el nombre original (evita path traversal)
    const newUrls = files.map(f => {
      const filename = uuidv4() + IMAGE_MIME_EXT[f.mimetype];
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), f.buffer);
      return UPLOAD_PREFIX + filename;
    });

    return this.saveFotos(propId, [...fotos, ...newUrls]);
  }

  async removeFoto(propId: string, ownerId: string, index: number) {
    const { fotos } = await this.getOwnProp(propId, ownerId);
    if (index < 0 || index >= fotos.length)
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'Índice de foto inválido', 'index');

    const [removed] = fotos.splice(index, 1);
    deleteUploadedFiles([removed]);
    return this.saveFotos(propId, fotos);
  }

  async reordenarFotos(propId: string, ownerId: string, orden: number[]) {
    const { fotos } = await this.getOwnProp(propId, ownerId);
    // Debe ser una permutación completa de los índices actuales
    const valido = orden.length === fotos.length && new Set(orden).size === fotos.length && orden.every(i => i < fotos.length);
    if (!valido) throw new ApiException(ErrorCode.VALIDATION_ERROR, 'El orden debe incluir cada foto una sola vez', 'orden');

    return this.saveFotos(propId, orden.map(i => fotos[i]));
  }
}
