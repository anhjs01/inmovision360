import { PagosService } from './pagos.service';
export declare class PagosController {
    private svc;
    constructor(svc: PagosService);
    findAll(u: any, e?: string): Promise<({
        inquilino: {
            titulo: string;
        };
        inq: {
            nombre: string;
            apellido: string;
        };
    } & {
        id: string;
        createdAt: Date;
        ownerId: string;
        inquilinoId: string;
        wompiRef: string | null;
        propId: string;
        fecha: string;
        estado: string;
        monto: number;
        metodo: string | null;
    })[]>;
    findMios(u: any): Promise<({
        inquilino: {
            titulo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        ownerId: string;
        inquilinoId: string;
        wompiRef: string | null;
        propId: string;
        fecha: string;
        estado: string;
        monto: number;
        metodo: string | null;
    })[]>;
    create(u: any, b: any): Promise<{
        inquilino: {
            titulo: string;
        };
        inq: {
            nombre: string;
            apellido: string;
        };
    } & {
        id: string;
        createdAt: Date;
        ownerId: string;
        inquilinoId: string;
        wompiRef: string | null;
        propId: string;
        fecha: string;
        estado: string;
        monto: number;
        metodo: string | null;
    }>;
    iniciar(b: any): {
        wompi_checkout_url: string;
        reference: string;
    };
    updateEstado(id: string, e: string): Promise<{
        id: string;
        createdAt: Date;
        ownerId: string;
        inquilinoId: string;
        wompiRef: string | null;
        propId: string;
        fecha: string;
        estado: string;
        monto: number;
        metodo: string | null;
    }>;
}
