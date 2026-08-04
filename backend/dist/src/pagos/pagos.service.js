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
exports.PagosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PagosService = class PagosService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(ownerId, estado) {
        const where = { ownerId };
        if (estado)
            where.estado = estado;
        return this.prisma.pago.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                inquilino: { select: { titulo: true } },
                inq: { select: { nombre: true, apellido: true } },
            },
        });
    }
    async findMios(inquilinoId) {
        return this.prisma.pago.findMany({
            where: { inquilinoId },
            orderBy: { createdAt: 'desc' },
            include: { inquilino: { select: { titulo: true } } },
        });
    }
    async create(ownerId, dto) {
        let inquilinoId = dto.inquilinoId || '';
        if (!inquilinoId || inquilinoId.length < 20) {
            const usuario = await this.prisma.usuario.findFirst({
                where: {
                    AND: [
                        { deletedAt: null },
                        {
                            OR: [
                                { nombre: { contains: inquilinoId } },
                                { apellido: { contains: inquilinoId } },
                                { email: { contains: inquilinoId } },
                            ],
                        },
                    ],
                },
            });
            inquilinoId = usuario ? usuario.id : ownerId;
        }
        const { inquilinoId: _removed, ...rest } = dto;
        return this.prisma.pago.create({
            data: { ...rest, ownerId, inquilinoId },
            include: {
                inquilino: { select: { titulo: true } },
                inq: { select: { nombre: true, apellido: true } },
            },
        });
    }
    async updateEstado(id, estado) {
        return this.prisma.pago.update({ where: { id }, data: { estado } });
    }
    iniciarWompi(dto) {
        const ref = `INM_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        return {
            wompi_checkout_url: `https://checkout.wompi.co/p/?public-key=pub_stagtest_&reference=${ref}&amount-in-cents=${dto.monto * 100}&currency=COP`,
            reference: ref,
        };
    }
};
exports.PagosService = PagosService;
exports.PagosService = PagosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PagosService);
//# sourceMappingURL=pagos.service.js.map