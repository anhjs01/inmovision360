import { PrismaService } from '../prisma/prisma.service';
export declare class MensajesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string): Promise<({
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
    send(deId: string, dto: any): Promise<{
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
    unreadCount(userId: string): Promise<{
        count: number;
    }>;
    getHilo(propId: string, userId: string): Promise<({
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
}
