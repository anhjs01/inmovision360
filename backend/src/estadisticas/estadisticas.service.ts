import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}

  async kpis(ownerId: string) {
    const myProps = await this.prisma.propiedad.findMany({ where: { ownerId, deletedAt: null } });
    const propIds = myProps.map(p => p.id);

    const [visitas, pagadoAgg, mensajes, leads] = await Promise.all([
      this.prisma.visitas.count({ where: { propId: { in: propIds } } }),
      this.prisma.pago.aggregate({ where: { ownerId, estado: 'pagado' }, _sum: { monto: true } }),
      this.prisma.mensaje.count({ where: { paraId: ownerId, leido: false } }),
      this.prisma.lead.count({ where: { ownerId } }),
    ]);

    return {
      props_activas:   myProps.length,
      visitas_total:   visitas,
      ingresos_mes:    pagadoAgg._sum.monto ?? 0,
      mensajes_nuevos: mensajes,
      leads_activos:   leads,
    };
  }

  async porTipo(ownerId: string) {
    const props = await this.prisma.propiedad.findMany({ where: { ownerId, deletedAt: null }, select: { tipo: true, precio: true } });
    const byType: Record<string, { count: number; sum: number }> = {};
    props.forEach(p => {
      if (!byType[p.tipo]) byType[p.tipo] = { count: 0, sum: 0 };
      byType[p.tipo].count++;
      byType[p.tipo].sum += p.precio;
    });
    return byType;
  }

  async porCiudad(ownerId: string) {
    const props = await this.prisma.propiedad.findMany({ where: { ownerId, deletedAt: null }, select: { ciudad: true } });
    return props.reduce((acc: any, p) => { acc[p.ciudad] = (acc[p.ciudad] ?? 0) + 1; return acc; }, {});
  }

  async ingresosPorMes(ownerId: string, meses = 6) {
    const pagos = await this.prisma.pago.findMany({
      where:   { ownerId, estado: 'pagado' },
      orderBy: { fecha: 'asc' },
    });
    const byMonth: Record<string, number> = {};
    pagos.forEach(p => {
      const key = p.fecha.substring(0, 7); // YYYY-MM
      byMonth[key] = (byMonth[key] ?? 0) + p.monto;
    });
    return Object.entries(byMonth).slice(-meses).map(([mes, monto]) => ({ mes, monto }));
  }
}
