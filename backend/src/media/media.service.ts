import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs   from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async addFotos(propId: string, ownerId: string, files: any[]) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
    if (!prop) throw new Error('Propiedad no encontrada');

    this.ensureUploadDir();
    const existingFotos: string[] = JSON.parse(prop.fotos || '[]');
    const newUrls = (files || []).map((f: any) => {
      const filename = Date.now() + '_' + f.originalname;
      fs.writeFileSync(path.join(this.uploadDir, filename), f.buffer);
      return '/uploads/' + filename;
    });

    const updated = await this.prisma.propiedad.update({
      where: { id: propId },
      data:  { fotos: JSON.stringify([...existingFotos, ...newUrls]) },
    });
    return { fotos: JSON.parse(updated.fotos) };
  }

  async removeFoto(propId: string, ownerId: string, index: number) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
    if (!prop) throw new Error('Propiedad no encontrada');

    const fotos: string[] = JSON.parse(prop.fotos || '[]');
    const removed = fotos.splice(index, 1)[0];
    if (removed && removed.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), removed);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const updated = await this.prisma.propiedad.update({
      where: { id: propId },
      data:  { fotos: JSON.stringify(fotos) },
    });
    return { fotos: JSON.parse(updated.fotos) };
  }

  async reordenarFotos(propId: string, ownerId: string, orden: number[]) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
    if (!prop) throw new Error('Propiedad no encontrada');

    const fotos: string[] = JSON.parse(prop.fotos || '[]');
    const reordenadas = orden.map(i => fotos[i]).filter(Boolean);

    const updated = await this.prisma.propiedad.update({
      where: { id: propId },
      data:  { fotos: JSON.stringify(reordenadas) },
    });
    return { fotos: JSON.parse(updated.fotos) };
  }
}
