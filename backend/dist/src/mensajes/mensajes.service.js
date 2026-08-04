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
exports.MensajesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MensajesService = class MensajesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId) {
        return this.prisma.mensaje.findMany({
            where: { OR: [{ deId: userId }, { paraId: userId }] },
            orderBy: { createdAt: 'desc' },
            include: {
                propiedad: { select: { titulo: true } },
                de: { select: { nombre: true, apellido: true } },
            },
        });
    }
    async send(deId, dto) {
        return this.prisma.mensaje.create({
            data: { deId, paraId: dto.destinatario_id, propId: dto.prop_id, texto: dto.texto },
            include: {
                propiedad: { select: { titulo: true } },
                de: { select: { nombre: true, apellido: true } },
            },
        });
    }
    async markRead(id) {
        return this.prisma.mensaje.update({ where: { id }, data: { leido: true } });
    }
    async unreadCount(userId) {
        const count = await this.prisma.mensaje.count({ where: { paraId: userId, leido: false } });
        return { count };
    }
    async getHilo(propId, userId) {
        return this.prisma.mensaje.findMany({
            where: { propId, OR: [{ deId: userId }, { paraId: userId }] },
            orderBy: { createdAt: 'asc' },
            include: { de: { select: { nombre: true, apellido: true } } },
        });
    }
};
exports.MensajesService = MensajesService;
exports.MensajesService = MensajesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MensajesService);
//# sourceMappingURL=mensajes.service.js.map