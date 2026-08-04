import { PropiedadesService } from './propiedades.service';
export declare class PropiedadesController {
    private svc;
    constructor(svc: PropiedadesService);
    findAll(q: any): Promise<{
        ok: boolean;
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    findMias(u: any): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(u: any, body: any): Promise<any>;
    update(id: string, u: any, body: any): Promise<any>;
    remove(id: string, u: any): Promise<{
        ok: boolean;
    }>;
}
