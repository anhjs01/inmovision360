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
exports.WebhooksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WebhooksService = class WebhooksService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleWompi(body, signature) {
        const event = body?.event;
        const tx = body?.data?.transaction;
        if (!tx)
            return { ok: true };
        if (event === 'transaction.updated' && tx.status === 'APPROVED') {
            const ref = tx.reference;
            if (ref.startsWith('INM_')) {
                await this.prisma.pago.updateMany({
                    where: { wompiRef: ref },
                    data: { estado: 'pagado' },
                });
            }
            if (ref.startsWith('SUB_')) {
                const planId = ref.split('_')[1];
                const sus = await this.prisma.suscripcion.findFirst({ where: { wompiRef: ref } });
                if (sus) {
                    const vence = new Date();
                    vence.setDate(vence.getDate() + 30);
                    await this.prisma.suscripcion.update({ where: { id: sus.id }, data: { estado: 'activo', vence } });
                    await this.prisma.usuario.update({ where: { id: sus.userId }, data: { plan: planId } });
                }
            }
        }
        return { ok: true };
    }
};
exports.WebhooksService = WebhooksService;
exports.WebhooksService = WebhooksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WebhooksService);
//# sourceMappingURL=webhooks.service.js.map