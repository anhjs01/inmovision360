import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';
import { SolicitarVisitaDto, CreateVisitaManualDto, UpdateVisitaDto } from './dto/visita.dto';

const INCLUDE = { inquilino: { select: { titulo: true } } };

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

    return this.prisma.visitas.findMany({ where, orderBy: { createdAt: 'desc' }, include: INCLUDE });
  }

  async findMias(userId: string) {
    return this.prisma.visitas.findMany({
      where:   { inquilinoId: userId },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }

  // ── Inquilino solicita visita ──────────────────────────────
  async solicitar(user: any, dto: SolicitarVisitaDto) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: dto.propId, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', 'propId', HttpStatus.NOT_FOUND);
    // Fecha de Colombia (el servidor puede estar en UTC): no se agendan visitas en días pasados
    const hoyCO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    if (dto.fecha < hoyCO)
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'La fecha de la visita ya pasó; elige hoy o un día futuro', 'fecha');

    return this.prisma.visitas.create({
      data: {
        cliente:     `${user.nombre} ${user.apellido ?? ''}`.trim(),
        propId:      dto.propId,
        fecha:       dto.fecha,
        hora:        dto.hora,
        estado:      'pendiente',
        nota:        dto.nota || null,
        inquilinoId: user.id,
      },
      include: INCLUDE,
    });
  }

  // ── Arrendador agenda visita manual ────────────────────────
  async createManual(ownerId: string, dto: CreateVisitaManualDto) {
    await this.assertOwnProp(dto.propId, ownerId);
    return this.prisma.visitas.create({
      data: {
        cliente: dto.cliente,
        propId:  dto.propId,
        fecha:   dto.fecha,
        hora:    dto.hora,
        estado:  dto.estado || 'pendiente',
        nota:    dto.nota   || null,
      },
      include: INCLUDE,
    });
  }

  // ── Editar ─────────────────────────────────────────────────
  // Arrendador dueño: puede editar todo. Inquilino que la solicitó: solo fecha, hora y nota
  // (al reprogramar vuelve a quedar pendiente de confirmación).
  async update(id: string, userId: string, dto: UpdateVisitaDto) {
    const { esOwner } = await this.getAutorizada(id, userId);

    let data: any;
    if (esOwner) {
      if (dto.propId) await this.assertOwnProp(dto.propId, userId);
      data = dto;
    } else {
      const { fecha, hora, nota } = dto;
      data = { fecha, hora, nota };
      if (fecha || hora) data.estado = 'pendiente';
    }

    return this.prisma.visitas.update({ where: { id }, data, include: INCLUDE });
  }

  async updateEstado(id: string, userId: string, estado: string) {
    const { esOwner } = await this.getAutorizada(id, userId);
    if (!esOwner && estado !== 'cancelada')
      throw new ApiException(ErrorCode.FORBIDDEN, 'Solo puedes cancelar tu visita', 'estado', HttpStatus.FORBIDDEN);
    return this.prisma.visitas.update({ where: { id }, data: { estado }, include: INCLUDE });
  }

  async remove(id: string, userId: string) {
    await this.getAutorizada(id, userId);
    await this.prisma.visitas.delete({ where: { id } });
    return { ok: true };
  }

  // ── Helpers de pertenencia ─────────────────────────────────
  private async assertOwnProp(propId: string, ownerId: string) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', 'propId', HttpStatus.NOT_FOUND);
  }

  // La visita es accesible para el dueño de la propiedad o el inquilino que la solicitó
  private async getAutorizada(id: string, userId: string) {
    const visita = await this.prisma.visitas.findUnique({ where: { id }, include: { inquilino: { select: { ownerId: true } } } });
    const esOwner     = visita?.inquilino.ownerId === userId;
    const esInquilino = !!visita?.inquilinoId && visita.inquilinoId === userId;
    if (!visita || (!esOwner && !esInquilino))
      throw new ApiException(ErrorCode.VISITA_NOT_FOUND, 'Visita no encontrada', undefined, HttpStatus.NOT_FOUND);
    return { visita, esOwner };
  }
}
