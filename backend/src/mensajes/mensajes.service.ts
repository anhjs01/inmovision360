import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MensajesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.mensaje.findMany({
      where:   { OR: [{ deId: userId }, { paraId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        propiedad: { select: { titulo: true } },
        de:        { select: { nombre: true, apellido: true } },
      },
    });
  }

  async send(deId: string, dto: any) {
    return this.prisma.mensaje.create({
      data: { deId, paraId: dto.destinatario_id, propId: dto.prop_id, texto: dto.texto },
      include: {
        propiedad: { select: { titulo: true } },
        de:        { select: { nombre: true, apellido: true } },
      },
    });
  }

  async markRead(id: string) {
    return this.prisma.mensaje.update({ where: { id }, data: { leido: true } });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.mensaje.count({ where: { paraId: userId, leido: false } });
    return { count };
  }

  async getHilo(propId: string, userId: string) {
    return this.prisma.mensaje.findMany({
      where:   { propId, OR: [{ deId: userId }, { paraId: userId }] },
      orderBy: { createdAt: 'asc' },
      include: { de: { select: { nombre: true, apellido: true } } },
    });
  }
}
