"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropiedadesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const http_exception_filter_1 = require("../common/filters/http-exception.filter");
const error_codes_1 = require("../common/constants/error-codes");
const formatters_1 = require("../common/utils/formatters");
let PropiedadesService = class PropiedadesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { ciudad, tipo, listing, precio_min, precio_max, habitaciones, estrato, tour_virtual, mapa_2d, sort, q, page = 1, limit = 12 } = query;
        const where = { deletedAt: null };
        if (ciudad)
            where.ciudad = ciudad;
        if (tipo)
            where.tipo = tipo;
        if (listing)
            where.listing = listing;
        if (estrato)
            where.estrato = Number(estrato);
        if (tour_virtual === 'true')
            where.tourVirtual = true;
        if (mapa_2d === 'true')
            where.mapa2d = true;
        if (habitaciones)
            where.habitaciones = { gte: Number(habitaciones) };
        if (precio_min || precio_max) {
            where.precio = {};
            if (precio_min)
                where.precio.gte = Number(precio_min);
            if (precio_max)
                where.precio.lte = Number(precio_max);
        }
        if (q)
            where.OR = [
                { titulo: { contains: q } },
                { ciudad: { contains: q } },
                { barrio: { contains: q } },
            ];
        const sortMap = {
            'precio_asc': { precio: 'asc' },
            'precio_desc': { precio: 'desc' },
            'area_desc': { metros: 'desc' },
            'default': { destacado: 'desc' },
        };
        const orderBy = sortMap[sort] ?? sortMap.default;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const [items, total] = await Promise.all([
            this.prisma.propiedad.findMany({ where, orderBy, skip, take }),
            this.prisma.propiedad.count({ where }),
        ]);
        return {
            ok: true,
            data: items.map(formatters_1.parsePropArrays),
            meta: { page: Number(page), limit: take, total, pages: Math.ceil(total / take) },
        };
    }
    async findOne(id) {
        const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
        if (!prop)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, common_1.HttpStatus.NOT_FOUND);
        return (0, formatters_1.parsePropArrays)(prop);
    }
    async findMias(ownerId) {
        const items = await this.prisma.propiedad.findMany({
            where: { ownerId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
        return items.map(formatters_1.parsePropArrays);
    }
    async create(ownerId, plan, dto) {
        const planData = await this.prisma.plan.findUnique({ where: { id: plan } });
        if (planData?.propsMax != null) {
            const count = await this.prisma.propiedad.count({ where: { ownerId, deletedAt: null } });
            if (count >= planData.propsMax)
                throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.PROP_LIMIT_REACHED, `Plan ${plan} permite máx. ${planData.propsMax} propiedades`, undefined, common_1.HttpStatus.FORBIDDEN);
        }
        const { fotos, comodidades, ...rest } = dto;
        const prop = await this.prisma.propiedad.create({
            data: {
                ...rest,
                ownerId,
                fotos: JSON.stringify(fotos ?? []),
                comodidades: JSON.stringify(comodidades ?? []),
            },
        });
        return (0, formatters_1.parsePropArrays)(prop);
    }
    async update(id, ownerId, dto) {
        const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
        if (!prop)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, common_1.HttpStatus.NOT_FOUND);
        if (prop.ownerId !== ownerId)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.FORBIDDEN, 'No autorizado', undefined, common_1.HttpStatus.FORBIDDEN);
        const { fotos, comodidades, ...rest } = dto;
        const updated = await this.prisma.propiedad.update({
            where: { id },
            data: {
                ...rest,
                ...(fotos !== undefined ? { fotos: JSON.stringify(fotos) } : {}),
                ...(comodidades !== undefined ? { comodidades: JSON.stringify(comodidades) } : {}),
            },
        });
        return (0, formatters_1.parsePropArrays)(updated);
    }
    async remove(id, ownerId) {
        const prop = await this.prisma.propiedad.findFirst({ where: { id, deletedAt: null } });
        if (!prop)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', undefined, common_1.HttpStatus.NOT_FOUND);
        if (prop.ownerId !== ownerId)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.FORBIDDEN, 'No autorizado', undefined, common_1.HttpStatus.FORBIDDEN);
        await this.prisma.propiedad.update({ where: { id }, data: { deletedAt: new Date() } });
        return { ok: true };
    }
};
exports.PropiedadesService = PropiedadesService;
exports.PropiedadesService = PropiedadesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PropiedadesService);
//# sourceMappingURL=propiedades.service.js.map