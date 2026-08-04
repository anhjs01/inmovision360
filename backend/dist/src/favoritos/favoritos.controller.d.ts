import { FavoritosService } from './favoritos.service';
export declare class FavoritosController {
    private svc;
    constructor(svc: FavoritosService);
    findAll(u: any): Promise<any[]>;
    toggle(u: any, p: string): Promise<{
        is_fav: boolean;
    }>;
    check(u: any, p: string): Promise<{
        is_fav: boolean;
    }>;
    remove(u: any, p: string): Promise<{
        ok: boolean;
    }>;
}
