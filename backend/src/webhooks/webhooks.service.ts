import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  // Verifica el checksum de eventos de Wompi:
  // SHA256( valores de signature.properties (tomados de body.data) + timestamp + secreto de eventos )
  private verifyWompiSignature(body: any): boolean {
    const secret = this.config.get<string>('WOMPI_EVENTS_KEY');
    const sig    = body?.signature;
    if (!secret || !sig?.checksum || !Array.isArray(sig.properties) || body?.timestamp === undefined) return false;

    const values = sig.properties.map((prop: string) =>
      String(prop).split('.').reduce((obj: any, key: string) => obj?.[key], body.data) ?? '',
    );
    const expected = createHash('sha256').update(values.join('') + body.timestamp + secret).digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(String(sig.checksum).toLowerCase());
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async handleWompi(body: any, _signature: string) {
    // Sin firma válida no se toca ningún pago ni suscripción
    if (!this.verifyWompiSignature(body)) {
      throw new ApiException(ErrorCode.WOMPI_SIGNATURE_INVALID, 'Firma de Wompi inválida', undefined, HttpStatus.UNAUTHORIZED);
    }

    const event = body?.event;
    const tx    = body?.data?.transaction;
    if (!tx) return { ok: true };

    if (event === 'transaction.updated' && tx.status === 'APPROVED') {
      const ref = String(tx.reference ?? '');

      // Pago de arriendo
      if (ref.startsWith('INM_')) {
        await this.prisma.pago.updateMany({
          where: { wompiRef: ref },
          data:  { estado: 'pagado' },
        });
      }

      // Suscripción de plan
      if (ref.startsWith('SUB_')) {
        const sus = await this.prisma.suscripcion.findFirst({ where: { wompiRef: ref } });
        if (sus) {
          const vence = new Date(); vence.setDate(vence.getDate() + 30);
          await this.prisma.suscripcion.update({ where: { id: sus.id }, data: { estado: 'activo', vence } });
          await this.prisma.usuario.update({ where: { id: sus.userId }, data: { plan: sus.planId } });
        }
      }
    }

    return { ok: true };
  }
}
