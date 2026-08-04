import { PrismaService } from '../prisma/prisma.service';
export declare class FavoritosService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string): Promise<any[]>;
    toggle(userId: string, propId: string): Promise<{
        is_fav: boolean;
    }>;
    check(userId: string, propId: string): Promise<{
        is_fav: boolean;
    }>;
    remove(userId: string, propId: string): Promise<{
        ok: boolean;
    }>;
}
