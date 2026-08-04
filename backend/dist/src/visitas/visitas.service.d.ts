import { PrismaService } from '../prisma/prisma.service';
export declare class VisitasService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string, rol: string, estado?: string): Promise<({
        inquilino: {
            titulo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    })[]>;
    create(dto: any): Promise<{
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    }>;
    updateEstado(id: string, estado: string, userId?: string): Promise<{
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
    findMias(userId: string): Promise<({
        inquilino: {
            titulo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    })[]>;
}
