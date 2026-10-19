import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';

const INCLUDE = { propiedad: { select: { titulo: true } } };

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  findAll(ownerId: string, estado?: string) {
    const where: any = { ownerId };
    if (estado) where.estado = estado;
    return this.prisma.lead.findMany({ where, orderBy: { score: 'desc' }, include: INCLUDE });
  }

  async create(ownerId: string, dto: CreateLeadDto) {
    await this.assertOwnProp(dto.propId, ownerId);
    const { nombre, email, propId, presupuesto, fuente, score, estado } = dto;
    return this.prisma.lead.create({
      data: {
        nombre,
        email:       email.toLowerCase(),
        propId,
        presupuesto: presupuesto || null,
        fuente:      fuente      || 'Portal',
        score:       score       ?? Math.floor(Math.random() * 40 + 30),
        estado:      estado      || 'new',
        ownerId,
      },
      include: INCLUDE,
    });
  }

  async update(id: string, ownerId: string, dto: UpdateLeadDto) {
    await this.getOwnLead(id, ownerId);
    if (dto.propId) await this.assertOwnProp(dto.propId, ownerId);
    const data = { ...dto, ...(dto.email ? { email: dto.email.toLowerCase() } : {}) };
    return this.prisma.lead.update({ where: { id }, data, include: INCLUDE });
  }

  async remove(id: string, ownerId: string) {
    await this.getOwnLead(id, ownerId);
    await this.prisma.lead.delete({ where: { id } });
    return { ok: true };
  }

  private async getOwnLead(id: string, ownerId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, ownerId } });
    if (!lead) throw new ApiException(ErrorCode.LEAD_NOT_FOUND, 'Lead no encontrado', undefined, HttpStatus.NOT_FOUND);
    return lead;
  }

  private async assertOwnProp(propId: string, ownerId: string) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', 'propId', HttpStatus.NOT_FOUND);
  }
}
