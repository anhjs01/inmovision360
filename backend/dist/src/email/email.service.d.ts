import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private config;
    constructor(config: ConfigService);
    send(to: string, subject: string, html: string): Promise<void>;
    sendVisitaConfirmada(email: string, prop: string, fecha: string, hora: string): Promise<void>;
    sendMensajeNuevo(email: string, de: string, prop: string): Promise<void>;
    sendPagoRecibido(email: string, monto: number, prop: string): Promise<void>;
}
