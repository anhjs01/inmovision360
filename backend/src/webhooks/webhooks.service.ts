import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async handleWompi(body: any, signature: string) {
    // En producción: verificar firma HMAC con WOMPI_INTEGRITY_KEY
    const event = body?.event;
    const tx    = body?.data?.transaction;
    if (!tx) return { ok: true };

    if (event === 'transaction.updated' && tx.status === 'APPROVED') {
      const ref = tx.reference as string;

      // Pago de arriendo
      if (ref.startsWith('INM_')) {
        await this.prisma.pago.updateMany({
          where: { wompiRef: ref },
          data:  { estado: 'pagado' },
        });
      }

      // Suscripción de plan
      if (ref.startsWith('SUB_')) {
        const planId = ref.split('_')[1];
        const sus    = await this.prisma.suscripcion.findFirst({ where: { wompiRef: ref } });
        if (sus) {
          const vence = new Date(); vence.setDate(vence.getDate() + 30);
          await this.prisma.suscripcion.update({ where: { id: sus.id }, data: { estado: 'activo', vence } });
          await this.prisma.usuario.update({ where: { id: sus.userId }, data: { plan: planId } });
        }
      }
    }

    return { ok: true };
  }
}
