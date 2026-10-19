import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';
import { CreatePagoDto, UpdatePagoDto } from './dto/pago.dto';

const INCLUDE = {
  inquilino: { select: { titulo: true } },
  inq:       { select: { nombre: true, apellido: true, email: true } },
};

@Injectable()
export class PagosService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async findAll(ownerId: string, estado?: string) {
    const where: any = { ownerId };
    if (estado) where.estado = estado;
    return this.prisma.pago.findMany({ where, orderBy: { createdAt: 'desc' }, include: INCLUDE });
  }

  async findMios(inquilinoId: string) {
    return this.prisma.pago.findMany({
      where:   { inquilinoId },
      orderBy: { createdAt: 'desc' },
      include: { inquilino: { select: { titulo: true } } },
    });
  }

  async create(ownerId: string, dto: CreatePagoDto) {
    await this.assertOwnProp(dto.propId, ownerId);
    const inquilinoId = await this.resolveInquilino(dto.inquilino);
    const { inquilino: _texto, ...rest } = dto;
    return this.prisma.pago.create({
      data:    { ...rest, estado: rest.estado || 'pendiente', ownerId, inquilinoId },
      include: INCLUDE,
    });
  }

  async update(id: string, ownerId: string, dto: UpdatePagoDto) {
    await this.getOwnPago(id, ownerId);
    if (dto.propId) await this.assertOwnProp(dto.propId, ownerId);
    const { inquilino, ...rest } = dto;
    const data: any = { ...rest };
    if (inquilino) data.inquilinoId = await this.resolveInquilino(inquilino);
    return this.prisma.pago.update({ where: { id }, data, include: INCLUDE });
  }

  async remove(id: string, ownerId: string) {
    await this.getOwnPago(id, ownerId);
    await this.prisma.pago.delete({ where: { id } });
    return { ok: true };
  }

  // El monto sale del pago guardado, nunca del cliente; solo el inquilino o el dueño pueden iniciarlo
  async iniciarWompi(userId: string, pagoId: string) {
    const pago = await this.prisma.pago.findUnique({ where: { id: pagoId } });
    if (!pago || (pago.inquilinoId !== userId && pago.ownerId !== userId))
      throw new ApiException(ErrorCode.PAGO_NOT_FOUND, 'Pago no encontrado', undefined, HttpStatus.NOT_FOUND);
    if (pago.estado === 'pagado')
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'Este pago ya fue realizado');

    const ref = `INM_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await this.prisma.pago.update({ where: { id: pagoId }, data: { wompiRef: ref } });

    const publicKey = this.config.get('WOMPI_PUBLIC_KEY', '');
    return {
      wompi_checkout_url: `https://checkout.wompi.co/p/?public-key=${encodeURIComponent(publicKey)}&reference=${ref}&amount-in-cents=${pago.monto * 100}&currency=COP`,
      reference: ref,
    };
  }

  // ── Helpers ────────────────────────────────────────────────
  private async getOwnPago(id: string, ownerId: string) {
    const pago = await this.prisma.pago.findFirst({ where: { id, ownerId } });
    if (!pago) throw new ApiException(ErrorCode.PAGO_NOT_FOUND, 'Pago no encontrado', undefined, HttpStatus.NOT_FOUND);
    return pago;
  }

  private async assertOwnProp(propId: string, ownerId: string) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', 'propId', HttpStatus.NOT_FOUND);
  }

  // Acepta el ID, el email exacto o el nombre/apellido de un inquilino registrado
  private async resolveInquilino(texto: string): Promise<string> {
    const q    = texto.trim();
    const base = { deletedAt: null, rol: 'inquilino' };

    const exacto = await this.prisma.usuario.findFirst({
      where: { ...base, OR: [{ id: q }, { email: q.toLowerCase() }] },
    });
    if (exacto) return exacto.id;

    const [nombre, ...resto] = q.split(/\s+/);
    const apellido = resto.join(' ');
    const coincidencias = await this.prisma.usuario.findMany({
      where: {
        ...base,
        OR: apellido
          ? [{ AND: [{ nombre: { contains: nombre } }, { apellido: { contains: apellido } }] }]
          : [{ nombre: { contains: q } }, { apellido: { contains: q } }],
      },
      take: 2,
    });

    if (coincidencias.length === 1) return coincidencias[0].id;
    if (coincidencias.length > 1)
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'Hay varios inquilinos con ese nombre; usa su email', 'inquilino');
    throw new ApiException(ErrorCode.USER_NOT_FOUND, 'Inquilino no encontrado. Usa el nombre o email de un inquilino registrado', 'inquilino', HttpStatus.NOT_FOUND);
  }
}
