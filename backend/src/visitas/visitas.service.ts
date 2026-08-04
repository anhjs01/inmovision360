import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';

@Injectable()
export class VisitasService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, rol: string, estado?: string) {
    const where: any = {};
    if (estado) where.estado = estado;

    if (rol === 'arrendador') {
      const myProps = await this.prisma.propiedad.findMany({
        where: { ownerId: userId, deletedAt: null },
        select: { id: true },
      });
      where.propId = { in: myProps.map(p => p.id) };
    } else {
      where.inquilinoId = userId;
    }

    return this.prisma.visitas.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { inquilino: { select: { titulo: true } } },
    });
  }

  async create(dto: any) {
    // Extraer solo los campos válidos del modelo
    const { cliente, propId, fecha, hora, estado, nota, inquilinoId } = dto;
    return this.prisma.visitas.create({
      data: {
        cliente,
        propId,
        fecha,
        hora,
        estado:      estado      || 'pendiente',
        nota:        nota        || null,
        inquilinoId: inquilinoId || null,
      },
    });
  }

  async updateEstado(id: string, estado: string, userId?: string) {
    const v = await this.prisma.visitas.findUnique({ where: { id } });
    if (!v) throw new ApiException(ErrorCode.VISITA_NOT_FOUND, 'Visita no encontrada', undefined, HttpStatus.NOT_FOUND);
    return this.prisma.visitas.update({ where: { id }, data: { estado } });
  }

  async remove(id: string) {
    await this.prisma.visitas.delete({ where: { id } });
    return { ok: true };
  }

  async findMias(userId: string) {
    return this.prisma.visitas.findMany({
      where:   { inquilinoId: userId },
      orderBy: { createdAt: 'desc' },
      include: { inquilino: { select: { titulo: true } } },
    });
  }
}
