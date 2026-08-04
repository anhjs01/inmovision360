import { SuscripcionesService } from './suscripciones.service';
export declare class SuscripcionesController {
    private svc;
    constructor(svc: SuscripcionesService);
    planes(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        nombre: string;
        precio: number;
        propsMax: number | null;
    }[]>;
    miPlan(u: any): Promise<{
        plan: string;
        nombre: string;
        estado: string;
        vence: Date;
        props_activas: number;
        props_max: number;
    }>;
    suscribirse(u: any, b: any): Promise<{
        wompi_checkout_url: string;
        reference: string;
        plan_activado: string;
    }>;
    cancelar(u: any): Promise<{
        ok: boolean;
    }>;
}
