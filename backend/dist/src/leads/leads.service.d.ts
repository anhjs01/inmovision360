import { PrismaService } from '../prisma/prisma.service';
export declare class LeadsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(ownerId: string, estado?: string): import(".prisma/client").Prisma.PrismaPromise<({
        propiedad: {
            titulo: string;
        };
    } & {
        id: string;
        email: string;
        nombre: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        propId: string;
        estado: string;
        presupuesto: string | null;
        score: number;
        fuente: string;
    })[]>;
    create(ownerId: string, dto: any): import(".prisma/client").Prisma.Prisma__LeadClient<{
        propiedad: {
            titulo: string;
        };
    } & {
        id: string;
        email: string;
        nombre: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        propId: string;
        estado: string;
        presupuesto: string | null;
        score: number;
        fuente: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, ownerId: string, dto: any): Promise<{
        propiedad: {
            titulo: string;
        };
    } & {
        id: string;
        email: string;
        nombre: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        propId: string;
        estado: string;
        presupuesto: string | null;
        score: number;
        fuente: string;
    }>;
    remove(id: string, ownerId: string): Promise<{
        ok: boolean;
    }>;
}
