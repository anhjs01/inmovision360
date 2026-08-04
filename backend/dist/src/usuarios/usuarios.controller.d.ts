import { UsuariosService } from './usuarios.service';
export declare class UsuariosController {
    private svc;
    constructor(svc: UsuariosService);
    updateMe(u: any, body: any): Promise<any>;
    changePassword(u: any, b: any): Promise<{
        ok: boolean;
    }>;
    deleteMe(u: any): Promise<{
        ok: boolean;
    }>;
    findAll(rol?: string): Promise<any[]>;
}
