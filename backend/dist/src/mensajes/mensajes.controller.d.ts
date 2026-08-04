import { MensajesService } from './mensajes.service';
export declare class MensajesController {
    private svc;
    constructor(svc: MensajesService);
    findAll(u: any): Promise<({
        propiedad: {
            titulo: string;
        };
        de: {
            nombre: string;
            apellido: string;
        };
    } & {
        id: string;
        createdAt: Date;
        texto: string;
        leido: boolean;
        propId: string;
        deId: string;
        paraId: string;
    })[]>;
    unread(u: any): Promise<{
        count: number;
    }>;
    hilo(p: string, u: any): Promise<({
        de: {
            nombre: string;
            apellido: string;
        };
    } & {
        id: string;
        createdAt: Date;
        texto: string;
        leido: boolean;
        propId: string;
        deId: string;
        paraId: string;
    })[]>;
    send(u: any, b: any): Promise<{
        propiedad: {
            titulo: string;
        };
        de: {
            nombre: string;
            apellido: string;
        };
    } & {
        id: string;
        createdAt: Date;
        texto: string;
        leido: boolean;
        propId: string;
        deId: string;
        paraId: string;
    }>;
    markRead(id: string): Promise<{
        id: string;
        createdAt: Date;
        texto: string;
        leido: boolean;
        propId: string;
        deId: string;
        paraId: string;
    }>;
}
