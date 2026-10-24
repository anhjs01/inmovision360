import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService }          from '../prisma/prisma.service';
import { ApiException }           from '../common/filters/http-exception.filter';
import { ErrorCode }              from '../common/constants/error-codes';
import { parsePropArrays }        from '../common/utils/formatters';
import { deleteUploadedFiles }    from '../common/utils/uploads';
import { normalizarCiudad }       from '../common/utils/media-urls';
import { CreatePropiedadDto, UpdatePropiedadDto } from './dto/propiedad.dto';

// Convierte un parámetro de query a número; devuelve undefined si no es válido
function num(value: any): number | undefined {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : undefined;
}

// comodidades es un JSON serializado ('["mascotas","piscina"]'): se busca la cadena con comillas
const tieneComodidad = (c: string) => ({ comodidades: { contains: `"${c}"` } });
const ESTILOS: Record<string, any> = {
  mascotas:    tieneComodidad('mascotas'),
  amoblado:    tieneComodidad('amoblado'),
  // Parqueadero incluido: marcado como comodidad o con al menos un cupo registrado
  parqueadero: { OR: [tieneComodidad('parqueadero'), { parqueaderos: { gte: 1 } }] },
  // Balcón: también cuentan las terrazas privadas
  balcon:      { OR: [tieneComodidad('balcon'), tieneComodidad('terraza')] },
};

// Datos del arrendador que se muestran en fichas y tarjetas (teléfono y plantilla solo con sesión)
const OWNER_CONTACTO = { select: { nombre: true, apellido: true, telefono: true, verified: true, waMensaje: true } };

function contactoDe(owner: any, conContacto: boolean) {
  return {
    nombre:    [owner?.nombre, owner?.apellido].filter(Boolean).join(' '),
    verified:  !!owner?.verified,
    telefono:  conContacto ? owner?.telefono ?? null : null,
    waMensaje: conContacto ? owner?.waMensaje ?? null : null,
  };
}

// Estado final de la propiedad según lo que pidió el inquilino
const ESTADO_CIERRE: Record<string, string> = { arriendo: 'arrendada', compra: 'vendida' };
// Qué cierres admite cada modalidad de publicación
const CIERRES_POR_LISTING: Record<string, string[]> = {
  rent: ['arriendo'], vacation: ['arriendo'], sale: ['compra'], rent_sale: ['arriendo', 'compra'],
};

@Injectable()
export class PropiedadesService {
  constructor(private prisma: PrismaService) {}

  // ── Catálogo público ───────────────────────────────────────
  // Solo propiedades disponibles: las reservadas, arrendadas o vendidas no se ofrecen.
  // conContacto: con sesión, cada tarjeta trae el WhatsApp del arrendador
  async findAll(query: any, conContacto = false) {
    const { ciudad, tipo, listing, precio_min, precio_max, habitaciones,
            estrato, tour_virtual, mapa_2d, sort, q, estilo, desde } = query;

    const where: any = { deletedAt: null, estado: 'disponible' };
    if (typeof ciudad  === 'string' && ciudad.trim()) where.ciudad = normalizarCiudad(ciudad);
    if (typeof tipo    === 'string' && tipo)    where.tipo    = tipo;
    if (typeof listing === 'string' && listing) where.listing = listing;
    if (num(estrato) !== undefined)      where.estrato      = num(estrato);
    if (tour_virtual === 'true') where.tourVirtual = true;
    if (mapa_2d      === 'true') where.mapa2d      = true;
    if (num(habitaciones) !== undefined) where.habitaciones = { gte: num(habitaciones) };
    if (num(precio_min) !== undefined || num(precio_max) !== undefined) {
      where.precio = {};
      if (num(precio_min) !== undefined) where.precio.gte = num(precio_min);
      if (num(precio_max) !== undefined) where.precio.lte = num(precio_max);
    }
    // Alertas: solo lo publicado después de cierta fecha (?desde=ISO)
    if (typeof desde === 'string' && !Number.isNaN(Date.parse(desde))) where.createdAt = { gt: new Date(desde) };
    if (typeof q === 'string' && q) where.OR = [
      { titulo:  { contains: q } },
      { ciudad:  { contains: q } },
      { barrio:  { contains: q } },
    ];
    // Filtros de estilo de vida (?estilo=mascotas,balcon): deben cumplirse todos
    if (typeof estilo === 'string' && estilo) {
      const conds = estilo.split(',').map(e => ESTILOS[e.trim()]).filter(Boolean);
      if (conds.length) where.AND = conds;
    }

    const sortMap: any = {
      'precio_asc':  { precio: 'asc' },
      'precio_desc': { precio: 'desc' },
      'area_desc':   { metros: 'desc' },
      'default':     { destacado: 'desc' },
    };
    const orderBy = Object.prototype.hasOwnProperty.call(sortMap, sort) ? sortMap[sort] : sortMap.default;
    const page    = Math.max(1, Math.floor(num(query.page) ?? 1));
    const take    = Math.min(50, Math.max(1, Math.floor(num(query.limit) ?? 12)));
    const skip    = (page - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.propiedad.findMany({ where, orderBy, skip, take, include: { owner: OWNER_CONTACTO } }),
      this.prisma.propiedad.count({ where }),
    ]);

    return {
      ok:   true,
      data: items.map(({ owner, inquilinoActualId, ...p }) => ({ ...parsePropArrays(p), contacto: contactoDe(owner, conContacto) })),
      meta: { page, limit: take, total, pages: Math.ceil(total / take) },
    };
  }

  // ── Una propiedad ──────────────────────────────────────────
  // userId: solo usuarios con sesión reciben el teléfono del arrendador; quién la reservó
  // solo lo ven el dueño y ese inquilino (esMiHogar)
  async findOne(id: string, userId: string | null = null) {
    const prop = await this.prisma.propiedad.findFirst({
      where:   { id, deletedAt: null },
      include: { owner: OWNER_CONTACTO },
    });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, HttpStatus.NOT_FOUND);
    const { owner, inquilinoActualId, ...rest } = prop;
    const esMiHogar = !!userId && inquilinoActualId === userId;
    return {
      ...parsePropArrays(rest),
      ...(userId && (userId === prop.ownerId || esMiHogar) ? { inquilinoActualId } : {}),
      esMiHogar,
      contacto: contactoDe(owner, !!userId),
    };
  }

  // ── Mis propiedades ────────────────────────────────────────
  async findMias(ownerId: string) {
    const items = await this.prisma.propiedad.findMany({
      where:   { ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { inquilinoActual: { select: { nombre: true, apellido: true, email: true, telefono: true, plan: true } } },
    });
    return items.map(parsePropArrays);
  }

  // ── Mi Hogar (inquilino): propiedades que reservó, arrienda o compró ──
  async findMiHogar(userId: string) {
    const items = await this.prisma.propiedad.findMany({
      where:   { inquilinoActualId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: { owner: OWNER_CONTACTO },
    });
    return items.map(({ owner, ...p }) => ({ ...parsePropArrays(p), contacto: contactoDe(owner, true) }));
  }

  // ── Cierre: el inquilino pide arrendar / comprar ───────────
  // La propiedad queda "reservada" (sale del catálogo) hasta que el arrendador confirme o rechace
  async solicitarCierre(id: string, user: any, tipo: string) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, HttpStatus.NOT_FOUND);
    if (prop.ownerId === user.id)
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'No puedes cerrar un trato sobre tu propia propiedad');
    if (!(CIERRES_POR_LISTING[prop.listing] ?? []).includes(tipo))
      throw new ApiException(ErrorCode.VALIDATION_ERROR,
        tipo === 'compra' ? 'Esta propiedad no está a la venta' : 'Esta propiedad no se ofrece en arriendo', 'tipo');

    // Actualización condicionada al estado: si dos inquilinos lo piden a la vez, solo uno la reserva
    const { count } = await this.prisma.propiedad.updateMany({
      where: { id, deletedAt: null, estado: 'disponible' },
      data:  { estado: 'reservada', cierreTipo: tipo, inquilinoActualId: user.id },
    });
    if (!count) throw new ApiException(ErrorCode.PROP_NOT_AVAILABLE, 'Esta propiedad ya no está disponible', undefined, HttpStatus.CONFLICT);

    // Aviso al arrendador en su bandeja de mensajes
    const nombre = `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || 'Un inquilino';
    await this.prisma.mensaje.create({
      data: {
        propId: id, deId: user.id, paraId: prop.ownerId,
        texto: `🤝 ${nombre} quiere ${tipo === 'compra' ? 'comprar' : 'tomar en arriendo'} "${prop.titulo}". ` +
               'Confírmalo o recházalo desde Mis Propiedades.',
      },
    });
    return this.findOne(id, user.id);
  }

  // ── Cierre: el arrendador confirma, rechaza o vuelve a publicar ──
  async resolverCierre(id: string, ownerId: string, accion: string) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
    if (!prop)                    throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, HttpStatus.NOT_FOUND);
    if (prop.ownerId !== ownerId) throw new ApiException(ErrorCode.FORBIDDEN,      'No autorizado',           undefined, HttpStatus.FORBIDDEN);

    let data: any;
    if (accion === 'confirmar') {
      if (prop.estado !== 'reservada')
        throw new ApiException(ErrorCode.VALIDATION_ERROR, 'No hay una solicitud de cierre pendiente');
      data = { estado: ESTADO_CIERRE[prop.cierreTipo ?? 'arriendo'], cerradaAt: new Date() };
    } else {
      // rechazar (reservada) o liberar (arrendada/vendida): vuelve al catálogo
      if (accion === 'rechazar' && prop.estado !== 'reservada')
        throw new ApiException(ErrorCode.VALIDATION_ERROR, 'No hay una solicitud de cierre pendiente');
      if (accion === 'liberar' && prop.estado === 'disponible')
        throw new ApiException(ErrorCode.VALIDATION_ERROR, 'La propiedad ya está disponible');
      data = { estado: 'disponible', cierreTipo: null, inquilinoActualId: null, cerradaAt: null };
    }

    // Aviso al inquilino en su bandeja de mensajes
    if (prop.inquilinoActualId && accion !== 'liberar') {
      const texto = accion === 'confirmar'
        ? `✅ Tu ${prop.cierreTipo === 'compra' ? 'compra' : 'arriendo'} de "${prop.titulo}" fue confirmado. ¡Ya aparece en Mi Hogar!`
        : `La solicitud sobre "${prop.titulo}" no fue aceptada. La propiedad vuelve a estar disponible.`;
      await this.prisma.mensaje.create({ data: { propId: id, deId: ownerId, paraId: prop.inquilinoActualId, texto } });
    }
    const updated = await this.prisma.propiedad.update({ where: { id }, data });
    return parsePropArrays(updated);
  }

  // ── Crear ──────────────────────────────────────────────────
  async create(ownerId: string, plan: string, dto: CreatePropiedadDto) {
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
  async update(id: string, ownerId: string, dto: UpdatePropiedadDto) {
    const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
    if (!prop)             throw new ApiException(ErrorCode.PROP_NOT_FOUND,  'Propiedad no encontrada', undefined, HttpStatus.NOT_FOUND);
    if (prop.ownerId !== ownerId) throw new ApiException(ErrorCode.FORBIDDEN, 'No autorizado',          undefined, HttpStatus.FORBIDDEN);

    const { fotos, comodidades, ...rest } = dto;

    // Fotos subidas que el usuario quitó en el formulario → se borran del disco
    if (fotos !== undefined) {
      const anteriores: string[] = parsePropArrays(prop).fotos;
      deleteUploadedFiles(anteriores.filter(f => !fotos.includes(f)));
    }
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
