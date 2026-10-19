import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';

function parseJsonArray(value: string): string[] {
  try { const v = JSON.parse(value ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

@Injectable()
export class SuscripcionesService {
  constructor(private prisma: PrismaService) {}

  // Incluye los planes de suscripción y las ofertas visuales de planos (categoria = 'plano')
  async getPlanes() {
    const planes = await this.prisma.plan.findMany({ orderBy: [{ categoria: 'desc' }, { precio: 'asc' }] });
    return planes.map(p => ({ ...p, features: parseJsonArray(p.features) }));
  }

  async getMiPlan(userId: string) {
    const user  = await this.prisma.usuario.findUnique({ where: { id: userId } });
    const sus   = await this.prisma.suscripcion.findUnique({ where: { userId } });
    const plan  = await this.prisma.plan.findUnique({ where: { id: user?.plan ?? 'free' } });
    const props = await this.prisma.propiedad.count({ where: { ownerId: userId, deletedAt: null } });
    return { plan: user?.plan ?? 'free', nombre: plan?.nombre ?? 'Free', estado: sus?.estado ?? 'activo', vence: sus?.vence ?? null, props_activas: props, props_max: plan?.propsMax ?? null };
  }

  // Modo demo: el plan se activa de inmediato (el webhook de Wompi lo confirmaría en producción)
  async suscribirse(userId: string, planId: string, metodo: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new ApiException(ErrorCode.PLAN_NOT_FOUND, 'Plan no encontrado', 'plan_id', HttpStatus.NOT_FOUND);
    // Las ofertas de planos 2D/3D son solo visuales: no cambian el plan ni los límites del usuario
    if (plan.categoria !== 'suscripcion')
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'Este plan no es una suscripción', 'plan_id');

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
