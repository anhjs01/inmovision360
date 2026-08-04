import { EstadisticasService } from './estadisticas.service';
export declare class EstadisticasController {
    private svc;
    constructor(svc: EstadisticasService);
    kpis(u: any): Promise<{
        props_activas: number;
        visitas_total: number;
        ingresos_mes: number;
        mensajes_nuevos: number;
        leads_activos: number;
    }>;
    porTipo(u: any): Promise<Record<string, {
        count: number;
        sum: number;
    }>>;
    porCiudad(u: any): Promise<any>;
    ingresos(u: any, m?: string): Promise<{
        mes: string;
        monto: number;
    }[]>;
}
