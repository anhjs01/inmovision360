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
exports.SuscripcionesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SuscripcionesService = class SuscripcionesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getPlanes() {
        return this.prisma.plan.findMany({ orderBy: { precio: 'asc' } });
    }
    async getMiPlan(userId) {
        const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
        const sus = await this.prisma.suscripcion.findUnique({ where: { userId } });
        const plan = await this.prisma.plan.findUnique({ where: { id: user?.plan ?? 'free' } });
        const props = await this.prisma.propiedad.count({ where: { ownerId: userId, deletedAt: null } });
        return { plan: user?.plan ?? 'free', nombre: plan?.nombre ?? 'Free', estado: sus?.estado ?? 'activo', vence: sus?.vence ?? null, props_activas: props, props_max: plan?.propsMax ?? null };
    }
    async suscribirse(userId, planId, metodo) {
        const ref = `SUB_${planId}_${Date.now()}`;
        const url = `https://checkout.wompi.co/p/?public-key=pub_stagtest_&reference=${ref}&currency=COP`;
        const vence = new Date();
        vence.setDate(vence.getDate() + 30);
        await this.prisma.usuario.update({ where: { id: userId }, data: { plan: planId } });
        await this.prisma.suscripcion.upsert({ where: { userId }, update: { planId, estado: 'activo', vence, wompiRef: ref }, create: { userId, planId, estado: 'activo', vence, wompiRef: ref } });
        return { wompi_checkout_url: url, reference: ref, plan_activado: planId };
    }
    async cancelar(userId) {
        await this.prisma.suscripcion.upsert({ where: { userId }, update: { estado: 'cancelado' }, create: { userId, planId: 'free', estado: 'cancelado' } });
        await this.prisma.usuario.update({ where: { id: userId }, data: { plan: 'free' } });
        return { ok: true };
    }
};
exports.SuscripcionesService = SuscripcionesService;
exports.SuscripcionesService = SuscripcionesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuscripcionesService);
//# sourceMappingURL=suscripciones.service.js.map