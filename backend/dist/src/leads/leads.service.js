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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const http_exception_filter_1 = require("../common/filters/http-exception.filter");
const error_codes_1 = require("../common/constants/error-codes");
let LeadsService = class LeadsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(ownerId, estado) {
        const where = { ownerId };
        if (estado)
            where.estado = estado;
        return this.prisma.lead.findMany({
            where,
            orderBy: { score: 'desc' },
            include: { propiedad: { select: { titulo: true } } },
        });
    }
    create(ownerId, dto) {
        const { nombre, email, propId, presupuesto, fuente, score } = dto;
        return this.prisma.lead.create({
            data: {
                nombre,
                email,
                propId,
                presupuesto: presupuesto || null,
                fuente: fuente || 'Portal',
                score: score || Math.floor(Math.random() * 40 + 30),
                ownerId,
            },
            include: { propiedad: { select: { titulo: true } } },
        });
    }
    async update(id, ownerId, dto) {
        const lead = await this.prisma.lead.findFirst({ where: { id, ownerId } });
        if (!lead)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.LEAD_NOT_FOUND, 'Lead no encontrado', undefined, common_1.HttpStatus.NOT_FOUND);
        return this.prisma.lead.update({
            where: { id },
            data: dto,
            include: { propiedad: { select: { titulo: true } } },
        });
    }
    async remove(id, ownerId) {
        const lead = await this.prisma.lead.findFirst({ where: { id, ownerId } });
        if (!lead)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.LEAD_NOT_FOUND, 'Lead no encontrado', undefined, common_1.HttpStatus.NOT_FOUND);
        await this.prisma.lead.delete({ where: { id } });
        return { ok: true };
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map