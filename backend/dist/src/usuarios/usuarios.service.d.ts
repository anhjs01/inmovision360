import { PrismaService } from '../prisma/prisma.service';
export declare class UsuariosService {
    private prisma;
    constructor(prisma: PrismaService);
    updateMe(userId: string, data: any): Promise<any>;
    changePassword(userId: string, actual: string, nuevo: string): Promise<{
        ok: boolean;
    }>;
    deleteMe(userId: string): Promise<{
        ok: boolean;
    }>;
    findAll(rol?: string): Promise<any[]>;
}
