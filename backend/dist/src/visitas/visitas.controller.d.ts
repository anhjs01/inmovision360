import { VisitasService } from './visitas.service';
export declare class VisitasController {
    private svc;
    constructor(svc: VisitasService);
    findAll(u: any, estado?: string): Promise<({
        inquilino: {
            titulo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    })[]>;
    findMias(u: any): Promise<({
        inquilino: {
            titulo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    })[]>;
    create(u: any, body: any): Promise<{
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    }>;
    createManual(body: any): Promise<{
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    }>;
    updateEstado(id: string, u: any, estado: string): Promise<{
        id: string;
        createdAt: Date;
        inquilinoId: string | null;
        propId: string;
        cliente: string;
        fecha: string;
        hora: string;
        estado: string;
        nota: string | null;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
