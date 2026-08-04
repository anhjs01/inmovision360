import { PrismaService } from '../prisma/prisma.service';
export declare class SuscripcionesService {
    private prisma;
    constructor(prisma: PrismaService);
    getPlanes(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        nombre: string;
        precio: number;
        propsMax: number | null;
    }[]>;
    getMiPlan(userId: string): Promise<{
        plan: string;
        nombre: string;
        estado: string;
        vence: Date;
        props_activas: number;
        props_max: number;
    }>;
    suscribirse(userId: string, planId: string, metodo: string): Promise<{
        wompi_checkout_url: string;
        reference: string;
        plan_activado: string;
    }>;
    cancelar(userId: string): Promise<{
        ok: boolean;
    }>;
}
