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
exports.EstadisticasService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EstadisticasService = class EstadisticasService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async kpis(ownerId) {
        const myProps = await this.prisma.propiedad.findMany({ where: { ownerId, deletedAt: null } });
        const propIds = myProps.map(p => p.id);
        const [visitas, pagadoAgg, mensajes, leads] = await Promise.all([
            this.prisma.visitas.count({ where: { propId: { in: propIds } } }),
            this.prisma.pago.aggregate({ where: { ownerId, estado: 'pagado' }, _sum: { monto: true } }),
            this.prisma.mensaje.count({ where: { paraId: ownerId, leido: false } }),
            this.prisma.lead.count({ where: { ownerId } }),
        ]);
        return {
            props_activas: myProps.length,
            visitas_total: visitas,
            ingresos_mes: pagadoAgg._sum.monto ?? 0,
            mensajes_nuevos: mensajes,
            leads_activos: leads,
        };
    }
    async porTipo(ownerId) {
        const props = await this.prisma.propiedad.findMany({ where: { ownerId, deletedAt: null }, select: { tipo: true, precio: true } });
        const byType = {};
        props.forEach(p => {
            if (!byType[p.tipo])
                byType[p.tipo] = { count: 0, sum: 0 };
            byType[p.tipo].count++;
            byType[p.tipo].sum += p.precio;
        });
        return byType;
    }
    async porCiudad(ownerId) {
        const props = await this.prisma.propiedad.findMany({ where: { ownerId, deletedAt: null }, select: { ciudad: true } });
        return props.reduce((acc, p) => { acc[p.ciudad] = (acc[p.ciudad] ?? 0) + 1; return acc; }, {});
    }
    async ingresosPorMes(ownerId, meses = 6) {
        const pagos = await this.prisma.pago.findMany({
            where: { ownerId, estado: 'pagado' },
            orderBy: { fecha: 'asc' },
        });
        const byMonth = {};
        pagos.forEach(p => {
            const key = p.fecha.substring(0, 7);
            byMonth[key] = (byMonth[key] ?? 0) + p.monto;
        });
        return Object.entries(byMonth).slice(-meses).map(([mes, monto]) => ({ mes, monto }));
    }
};
exports.EstadisticasService = EstadisticasService;
exports.EstadisticasService = EstadisticasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EstadisticasService);
//# sourceMappingURL=estadisticas.service.js.map