import { LeadsService } from './leads.service';
export declare class LeadsController {
    private svc;
    constructor(svc: LeadsService);
    findAll(u: any, e?: string): import(".prisma/client").Prisma.PrismaPromise<({
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
    create(u: any, b: any): import(".prisma/client").Prisma.Prisma__LeadClient<{
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
    update(id: string, u: any, b: any): Promise<{
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
    remove(id: string, u: any): Promise<{
        ok: boolean;
    }>;
}
