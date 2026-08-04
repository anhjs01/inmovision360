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
exports.VisitasService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const http_exception_filter_1 = require("../common/filters/http-exception.filter");
const error_codes_1 = require("../common/constants/error-codes");
let VisitasService = class VisitasService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId, rol, estado) {
        const where = {};
        if (estado)
            where.estado = estado;
        if (rol === 'arrendador') {
            const myProps = await this.prisma.propiedad.findMany({
                where: { ownerId: userId, deletedAt: null },
                select: { id: true },
            });
            where.propId = { in: myProps.map(p => p.id) };
        }
        else {
            where.inquilinoId = userId;
        }
        return this.prisma.visitas.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { inquilino: { select: { titulo: true } } },
        });
    }
    async create(dto) {
        const { cliente, propId, fecha, hora, estado, nota, inquilinoId } = dto;
        return this.prisma.visitas.create({
            data: {
                cliente,
                propId,
                fecha,
                hora,
                estado: estado || 'pendiente',
                nota: nota || null,
                inquilinoId: inquilinoId || null,
            },
        });
    }
    async updateEstado(id, estado, userId) {
        const v = await this.prisma.visitas.findUnique({ where: { id } });
        if (!v)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.VISITA_NOT_FOUND, 'Visita no encontrada', undefined, common_1.HttpStatus.NOT_FOUND);
        return this.prisma.visitas.update({ where: { id }, data: { estado } });
    }
    async remove(id) {
        await this.prisma.visitas.delete({ where: { id } });
        return { ok: true };
    }
    async findMias(userId) {
        return this.prisma.visitas.findMany({
            where: { inquilinoId: userId },
            orderBy: { createdAt: 'desc' },
            include: { inquilino: { select: { titulo: true } } },
        });
    }
};
exports.VisitasService = VisitasService;
exports.VisitasService = VisitasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VisitasService);
//# sourceMappingURL=visitas.service.js.map