import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  findAll(ownerId: string, estado?: string) {
    const where: any = { ownerId };
    if (estado) where.estado = estado;
    return this.prisma.lead.findMany({
      where,
      orderBy: { score: 'desc' },
      include: { propiedad: { select: { titulo: true } } },
    });
  }

  create(ownerId: string, dto: any) {
    const { nombre, email, propId, presupuesto, fuente, score } = dto;
    return this.prisma.lead.create({
      data: {
        nombre,
        email,
        propId,
        presupuesto: presupuesto || null,
        fuente:      fuente      || 'Portal',
        score:       score       || Math.floor(Math.random() * 40 + 30),
        ownerId,
      },
      include: { propiedad: { select: { titulo: true } } },
    });
  }

  async update(id: string, ownerId: string, dto: any) {
    const lead = await this.prisma.lead.findFirst({ where: { id, ownerId } });
    if (!lead) throw new ApiException(ErrorCode.LEAD_NOT_FOUND, 'Lead no encontrado', undefined, HttpStatus.NOT_FOUND);
    return this.prisma.lead.update({
      where: { id },
      data:  dto,
      include: { propiedad: { select: { titulo: true } } },
    });
  }

  async remove(id: string, ownerId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, ownerId } });
    if (!lead) throw new ApiException(ErrorCode.LEAD_NOT_FOUND, 'Lead no encontrado', undefined, HttpStatus.NOT_FOUND);
    await this.prisma.lead.delete({ where: { id } });
    return { ok: true };
  }
}
