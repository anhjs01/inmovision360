import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private config: ConfigService) {}

  async send(to: string, subject: string, html: string): Promise<void> {
    // En desarrollo: solo loguea. En producción: usar nodemailer/Resend.
    const host = this.config.get('SMTP_HOST');
    const user  = this.config.get('SMTP_USER');

    if (!host || !user) {
      console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
      return;
    }

    // Producción — descomentar y agregar nodemailer como dependencia:
    // const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
    // await transporter.sendMail({ from: this.config.get('EMAIL_FROM'), to, subject, html });
  }

  async sendVisitaConfirmada(email: string, prop: string, fecha: string, hora: string) {
    await this.send(email, '✅ Visita confirmada — INMOVISIÓN 360',
      `<p>Tu visita a <strong>${prop}</strong> fue confirmada para el <strong>${fecha} a las ${hora}</strong>.</p>`);
  }

  async sendMensajeNuevo(email: string, de: string, prop: string) {
    await this.send(email, '💬 Nuevo mensaje — INMOVISIÓN 360',
      `<p><strong>${de}</strong> te envió un mensaje sobre <strong>${prop}</strong>.</p>`);
  }

  async sendPagoRecibido(email: string, monto: number, prop: string) {
    await this.send(email, '💳 Pago recibido — INMOVISIÓN 360',
      `<p>Se recibió un pago de <strong>$${monto.toLocaleString('es-CO')}</strong> por <strong>${prop}</strong>.</p>`);
  }
}
