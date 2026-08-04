import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService }          from '../prisma/prisma.service';
import { ApiException }           from '../common/filters/http-exception.filter';
import { ErrorCode }              from '../common/constants/error-codes';
import { parsePropArrays }        from '../common/utils/formatters';

@Injectable()
export class PropiedadesService {
  constructor(private prisma: PrismaService) {}

  // ── Catálogo público ───────────────────────────────────────
  async findAll(query: any) {
    const { ciudad, tipo, listing, precio_min, precio_max, habitaciones,
            estrato, tour_virtual, mapa_2d, sort, q, page = 1, limit = 12 } = query;

    const where: any = { deletedAt: null };
    if (ciudad)       where.ciudad       = ciudad;
    if (tipo)         where.tipo         = tipo;
    if (listing)      where.listing      = listing;
    if (estrato)      where.estrato      = Number(estrato);
    if (tour_virtual === 'true') where.tourVirtual = true;
    if (mapa_2d      === 'true') where.mapa2d      = true;
    if (habitaciones) where.habitaciones = { gte: Number(habitaciones) };
    if (precio_min || precio_max) {
      where.precio = {};
      if (precio_min) where.precio.gte = Number(precio_min);
      if (precio_max) where.precio.lte = Number(precio_max);
    }
    if (q) where.OR = [
      { titulo:  { contains: q } },
      { ciudad:  { contains: q } },
      { barrio:  { contains: q } },
    ];

    const sortMap: any = {
      'precio_asc':  { precio: 'asc' },
      'precio_desc': { precio: 'desc' },
      'area_desc':   { metros: 'desc' },
      'default':     { destacado: 'desc' },
    };
    const orderBy = sortMap[sort] ?? sortMap.default;
    const skip    = (Number(page) - 1) * Number(limit);
    const take    = Number(limit);

    const [items, total] = await Promise.all([
      this.prisma.propiedad.findMany({ where, orderBy, skip, take }),
      this.prisma.propiedad.count({ where }),
    ]);

    return {
      ok:   true,
      data: items.map(parsePropArrays),
      meta: { page: Number(page), limit: take, total, pages: Math.ceil(total / take) },
    };
  }

  // ── Una propiedad ──────────────────────────────────────────
  async findOne(id: string) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, HttpStatus.NOT_FOUND);
    return parsePropArrays(prop);
  }

  // ── Mis propiedades ────────────────────────────────────────
  async findMias(ownerId: string) {
    const items = await this.prisma.propiedad.findMany({
      where:   { ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(parsePropArrays);
  }

  // ── Crear ──────────────────────────────────────────────────
  async create(ownerId: string, plan: string, dto: any) {
    // Límite por plan
    const planData = await this.prisma.plan.findUnique({ where: { id: plan } });
    if (planData?.propsMax != null) {
      const count = await this.prisma.propiedad.count({ where: { ownerId, deletedAt: null } });
      if (count >= planData.propsMax)
        throw new ApiException(ErrorCode.PROP_LIMIT_REACHED, `Plan ${plan} permite máx. ${planData.propsMax} propiedades`, undefined, HttpStatus.FORBIDDEN);
    }

    const { fotos, comodidades, ...rest } = dto;
    const prop = await this.prisma.propiedad.create({
      data: {
        ...rest,
        ownerId,
        fotos:       JSON.stringify(fotos ?? []),
        comodidades: JSON.stringify(comodidades ?? []),
      },
    });
    return parsePropArrays(prop);
  }

  // ── Actualizar ─────────────────────────────────────────────
  async update(id: string, ownerId: string, dto: any) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
    if (!prop)             throw new ApiException(ErrorCode.PROP_NOT_FOUND,  'Propiedad no encontrada', undefined, HttpStatus.NOT_FOUND);
    if (prop.ownerId !== ownerId) throw new ApiException(ErrorCode.FORBIDDEN, 'No autorizado',          undefined, HttpStatus.FORBIDDEN);

    const { fotos, comodidades, ...rest } = dto;
    const updated = await this.prisma.propiedad.update({
      where: { id },
      data: {
        ...rest,
        ...(fotos       !== undefined ? { fotos:       JSON.stringify(fotos) }       : {}),
        ...(comodidades !== undefined ? { comodidades: JSON.stringify(comodidades) } : {}),
      },
    });
    return parsePropArrays(updated);
  }

  // ── Eliminar (soft delete) ─────────────────────────────────
  async remove(id: string, ownerId: string) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
    if (!prop)             throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, HttpStatus.NOT_FOUND);
    if (prop.ownerId !== ownerId) throw new ApiException(ErrorCode.FORBIDDEN,'No autorizado',          undefined, HttpStatus.FORBIDDEN);
    await this.prisma.propiedad.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
