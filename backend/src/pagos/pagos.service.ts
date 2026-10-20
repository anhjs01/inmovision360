import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';
import { CreatePagoDto, UpdatePagoDto, ReportarPagoDto } from './dto/pago.dto';
import { COMPROBANTE_DIR, COMPROBANTE_PREFIX, COMPROBANTE_MIME_EXT, COMPROBANTE_EXT_MIME,
         firmaCoincide, comprobantePath, deleteComprobante } from '../common/utils/uploads';
import * as fs   from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
      include: {
        inquilino: { select: { titulo: true } },
        owner:     { select: { nombre: true, apellido: true } },
      },
    });
  }

  // El inquilino reporta un pago que hizo por fuera (transferencia, efectivo…): queda pendiente
  // hasta que el arrendador de la propiedad lo revise y lo marque como pagado
  async reportar(inquilinoId: string, dto: ReportarPagoDto) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id: dto.propId, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', 'propId', HttpStatus.NOT_FOUND);
    if (prop.ownerId === inquilinoId)
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'No puedes reportar pagos de tu propia propiedad', 'propId');

    return this.prisma.pago.create({
      data: {
        propId: prop.id, ownerId: prop.ownerId, inquilinoId,
        monto: dto.monto, fecha: dto.fecha, metodo: dto.metodo || null,
        concepto: dto.concepto?.trim() || null,
        estado: 'pendiente', origen: 'inquilino',
      },
      include: { inquilino: { select: { titulo: true } }, owner: { select: { nombre: true, apellido: true } } },
    });
  }

  async create(ownerId: string, dto: CreatePagoDto) {
    await this.assertOwnProp(dto.propId, ownerId);
    // Sin inquilino el pago queda como directo/general
    const inquilinoId = dto.inquilino?.trim() ? await this.resolveInquilino(dto.inquilino) : null;
    const { inquilino: _texto, ...rest } = dto;
    return this.prisma.pago.create({
      data:    { ...rest, concepto: rest.concepto?.trim() || null, estado: rest.estado || 'pendiente', ownerId, inquilinoId },
      include: INCLUDE,
    });
  }

  async update(id: string, ownerId: string, dto: UpdatePagoDto) {
    await this.getOwnPago(id, ownerId);
    if (dto.propId) await this.assertOwnProp(dto.propId, ownerId);
    const { inquilino, ...rest } = dto;
    const data: any = { ...rest };
    if (inquilino !== undefined) data.inquilinoId = inquilino?.trim() ? await this.resolveInquilino(inquilino) : null;
    if (rest.concepto !== undefined) data.concepto = rest.concepto?.trim() || null;
    return this.prisma.pago.update({ where: { id }, data, include: INCLUDE });
  }

  // El arrendador borra cualquier pago suyo; el inquilino, solo los que reportó y siguen sin confirmar
  async remove(id: string, userId: string) {
    const pago = await this.getPagoAccesible(id, userId);
    if (pago.ownerId !== userId && (pago.origen !== 'inquilino' || pago.estado === 'pagado'))
      throw new ApiException(ErrorCode.FORBIDDEN, 'Solo puedes eliminar pagos que reportaste y aún no han sido confirmados', undefined, HttpStatus.FORBIDDEN);
    await this.prisma.pago.delete({ where: { id } });
    deleteComprobante(pago.comprobanteUrl);
    return { ok: true };
  }

  // ── Comprobantes ───────────────────────────────────────────
  async subirComprobante(id: string, userId: string, file?: Express.Multer.File) {
    const pago = await this.getPagoAccesible(id, userId);
    this.assertPuedeCambiarComprobante(pago, userId);
    if (!file) throw new ApiException(ErrorCode.UPLOAD_INVALID, 'No se recibió ningún archivo', 'comprobante');
    const ext = COMPROBANTE_MIME_EXT[file.mimetype];
    if (!ext || !firmaCoincide(file.buffer, file.mimetype))
      throw new ApiException(ErrorCode.UPLOAD_INVALID, 'El archivo no es una imagen JPG, PNG, WEBP o un PDF válido', 'comprobante');

    // Nombre generado en el servidor: nunca se usa el nombre original (evita path traversal)
    if (!fs.existsSync(COMPROBANTE_DIR)) fs.mkdirSync(COMPROBANTE_DIR, { recursive: true });
    const filename = uuidv4() + ext;
    fs.writeFileSync(path.join(COMPROBANTE_DIR, filename), file.buffer);

    const updated = await this.prisma.pago.update({ where: { id }, data: { comprobanteUrl: COMPROBANTE_PREFIX + filename } });
    deleteComprobante(pago.comprobanteUrl);   // reemplaza el anterior
    return { comprobanteUrl: updated.comprobanteUrl };
  }

  async quitarComprobante(id: string, userId: string) {
    const pago = await this.getPagoAccesible(id, userId);
    this.assertPuedeCambiarComprobante(pago, userId);
    await this.prisma.pago.update({ where: { id }, data: { comprobanteUrl: null } });
    deleteComprobante(pago.comprobanteUrl);
    return { comprobanteUrl: null };
  }

  async getComprobante(id: string, userId: string) {
    const pago     = await this.getPagoAccesible(id, userId);
    const filePath = comprobantePath(pago.comprobanteUrl);
    if (!filePath || !fs.existsSync(filePath))
      throw new ApiException(ErrorCode.PAGO_NOT_FOUND, 'Este pago no tiene comprobante', undefined, HttpStatus.NOT_FOUND);
    const ext = path.extname(filePath).toLowerCase();
    return {
      buffer:   fs.readFileSync(filePath),
      mime:     COMPROBANTE_EXT_MIME[ext] || 'application/octet-stream',
      filename: `comprobante-${pago.fecha}${ext}`,
    };
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
  // Pago visible para el usuario: es el arrendador o el inquilino asociado
  private async getPagoAccesible(id: string, userId: string) {
    const pago = await this.prisma.pago.findFirst({ where: { id, OR: [{ ownerId: userId }, { inquilinoId: userId }] } });
    if (!pago) throw new ApiException(ErrorCode.PAGO_NOT_FOUND, 'Pago no encontrado', undefined, HttpStatus.NOT_FOUND);
    return pago;
  }

  // Una vez confirmado (pagado), solo el arrendador puede cambiar el soporte
  private assertPuedeCambiarComprobante(pago: { ownerId: string | null; estado: string }, userId: string) {
    if (pago.ownerId !== userId && pago.estado === 'pagado')
      throw new ApiException(ErrorCode.FORBIDDEN, 'Este pago ya fue confirmado por el arrendador; el comprobante no se puede cambiar', undefined, HttpStatus.FORBIDDEN);
  }

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
