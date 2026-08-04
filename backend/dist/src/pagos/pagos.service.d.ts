import { PrismaService } from '../prisma/prisma.service';
export declare class PagosService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(ownerId: string, estado?: string): Promise<({
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
    findMios(inquilinoId: string): Promise<({
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
    create(ownerId: string, dto: any): Promise<{
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
    updateEstado(id: string, estado: string): Promise<{
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
    iniciarWompi(dto: any): {
        wompi_checkout_url: string;
        reference: string;
    };
}
