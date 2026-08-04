import { PrismaService } from '../prisma/prisma.service';
export declare class PropiedadesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: any): Promise<{
        ok: boolean;
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<any>;
    findMias(ownerId: string): Promise<any[]>;
    create(ownerId: string, plan: string, dto: any): Promise<any>;
    update(id: string, ownerId: string, dto: any): Promise<any>;
    remove(id: string, ownerId: string): Promise<{
        ok: boolean;
    }>;
}
