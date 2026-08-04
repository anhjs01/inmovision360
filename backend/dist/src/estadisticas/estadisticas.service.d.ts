import { PrismaService } from '../prisma/prisma.service';
export declare class EstadisticasService {
    private prisma;
    constructor(prisma: PrismaService);
    kpis(ownerId: string): Promise<{
        props_activas: number;
        visitas_total: number;
        ingresos_mes: number;
        mensajes_nuevos: number;
        leads_activos: number;
    }>;
    porTipo(ownerId: string): Promise<Record<string, {
        count: number;
        sum: number;
    }>>;
    porCiudad(ownerId: string): Promise<any>;
    ingresosPorMes(ownerId: string, meses?: number): Promise<{
        mes: string;
        monto: number;
    }[]>;
}
