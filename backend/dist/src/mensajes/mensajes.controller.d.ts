import { MensajesService } from './mensajes.service';
export declare class MensajesController {
    private svc;
    constructor(svc: MensajesService);
    findAll(u: any): Promise<any[]>;
    unread(u: any): Promise<{
        count: number;
    }>;
    conversacion(userId: string, u: any): Promise<({
        propiedad: {
            id: string;
            titulo: string;
            precio: number;
            fotos: string;
        };
        de: {
            id: string;
            nombre: string;
            apellido: string;
        };
        para: {
            id: string;
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
    marcarConversacionLeida(userId: string, u: any): Promise<{
        count: number;
    }>;
    hilo(p: string, u: any): Promise<({
        de: {
            id: string;
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
            id: string;
            titulo: string;
            precio: number;
            fotos: string;
        };
        de: {
            id: string;
            nombre: string;
            apellido: string;
        };
        para: {
            id: string;
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
