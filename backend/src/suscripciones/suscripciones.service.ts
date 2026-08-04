import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuscripcionesService {
  constructor(private prisma: PrismaService) {}

  getPlanes() {
    return this.prisma.plan.findMany({ orderBy: { precio: 'asc' } });
  }

  async getMiPlan(userId: string) {
    const user  = await this.prisma.usuario.findUnique({ where: { id: userId } });
    const sus   = await this.prisma.suscripcion.findUnique({ where: { userId } });
    const plan  = await this.prisma.plan.findUnique({ where: { id: user?.plan ?? 'free' } });
    const props = await this.prisma.propiedad.count({ where: { ownerId: userId, deletedAt: null } });
    return { plan: user?.plan ?? 'free', nombre: plan?.nombre ?? 'Free', estado: sus?.estado ?? 'activo', vence: sus?.vence ?? null, props_activas: props, props_max: plan?.propsMax ?? null };
  }

  async suscribirse(userId: string, planId: string, metodo: string) {
    const ref   = `SUB_${planId}_${Date.now()}`;
    const url   = `https://checkout.wompi.co/p/?public-key=pub_stagtest_&reference=${ref}&currency=COP`;
    const vence = new Date(); vence.setDate(vence.getDate() + 30);
    await this.prisma.usuario.update({ where: { id: userId }, data: { plan: planId } });
    await this.prisma.suscripcion.upsert({ where: { userId }, update: { planId, estado: 'activo', vence, wompiRef: ref }, create: { userId, planId, estado: 'activo', vence, wompiRef: ref } });
    return { wompi_checkout_url: url, reference: ref, plan_activado: planId };
  }

  async cancelar(userId: string) {
    await this.prisma.suscripcion.upsert({ where: { userId }, update: { estado: 'cancelado' }, create: { userId, planId: 'free', estado: 'cancelado' } });
    await this.prisma.usuario.update({ where: { id: userId }, data: { plan: 'free' } });
    return { ok: true };
  }
}
