import { PrismaService } from '../prisma/prisma.service';
export declare class WebhooksService {
    private prisma;
    constructor(prisma: PrismaService);
    handleWompi(body: any, signature: string): Promise<{
        ok: boolean;
    }>;
}
