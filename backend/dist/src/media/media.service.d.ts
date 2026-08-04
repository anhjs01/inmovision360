import { PrismaService } from '../prisma/prisma.service';
export declare class MediaService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly uploadDir;
    private ensureUploadDir;
    addFotos(propId: string, ownerId: string, files: any[]): Promise<{
        fotos: any;
    }>;
    removeFoto(propId: string, ownerId: string, index: number): Promise<{
        fotos: any;
    }>;
    reordenarFotos(propId: string, ownerId: string, orden: number[]): Promise<{
        fotos: any;
    }>;
}
