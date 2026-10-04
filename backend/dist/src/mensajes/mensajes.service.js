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
        const messages = await this.prisma.mensaje.findMany({
            where: {
                OR: [
                    { deId: userId },
                    { paraId: userId },
                ],
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                propiedad: {
                    select: {
                        id: true,
                        titulo: true,
                        precio: true,
                        fotos: true,
                    },
                },
                de: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                    },
                },
                para: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                    },
                },
            },
        });
        const conversations = new Map();
        for (const m of messages) {
            const otherId = m.deId === userId ? m.paraId : m.deId;
            if (conversations.has(otherId)) {
                const current = conversations.get(otherId);
                if (m.paraId === userId && !m.leido) {
                    current.unreadCount += 1;
                }
                continue;
            }
            const other = m.deId === userId ? m.para : m.de;
            conversations.set(otherId, {
                id: otherId,
                usuario: other,
                ultimoMensaje: {
                    id: m.id,
                    texto: m.texto,
                    createdAt: m.createdAt,
                    leido: m.leido,
                    deId: m.deId,
                    paraId: m.paraId,
                },
                propiedad: m.propiedad,
                unreadCount: m.paraId === userId && !m.leido
                    ? 1
                    : 0,
                createdAt: m.createdAt,
            });
        }
        return Array.from(conversations.values());
    }
    async getConversacion(userId, currentUserId) {
        return this.prisma.mensaje.findMany({
            where: {
                OR: [
                    {
                        deId: currentUserId,
                        paraId: userId,
                    },
                    {
                        deId: userId,
                        paraId: currentUserId,
                    },
                ],
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                propiedad: {
                    select: {
                        id: true,
                        titulo: true,
                        precio: true,
                        fotos: true,
                    },
                },
                de: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                    },
                },
                para: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                    },
                },
            },
        });
    }
    async send(deId, dto) {
        return this.prisma.mensaje.create({
            data: {
                deId,
                paraId: dto.destinatario_id,
                propId: dto.prop_id,
                texto: dto.texto,
            },
            include: {
                propiedad: {
                    select: {
                        id: true,
                        titulo: true,
                        precio: true,
                        fotos: true,
                    },
                },
                de: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                    },
                },
                para: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                    },
                },
            },
        });
    }
    async markRead(id) {
        return this.prisma.mensaje.update({
            where: {
                id,
            },
            data: {
                leido: true,
            },
        });
    }
    async markConversationRead(userId, currentUserId) {
        const result = await this.prisma.mensaje.updateMany({
            where: {
                deId: userId,
                paraId: currentUserId,
                leido: false,
            },
            data: {
                leido: true,
            },
        });
        return {
            count: result.count,
        };
    }
    async unreadCount(userId) {
        const count = await this.prisma.mensaje.count({
            where: {
                paraId: userId,
                leido: false,
            },
        });
        return {
            count,
        };
    }
    async getHilo(propId, userId) {
        return this.prisma.mensaje.findMany({
            where: {
                propId,
                OR: [
                    { deId: userId },
                    { paraId: userId },
                ],
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                de: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                    },
                },
            },
        });
    }
};
exports.MensajesService = MensajesService;
exports.MensajesService = MensajesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MensajesService);
//# sourceMappingURL=mensajes.service.js.map