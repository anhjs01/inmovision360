import { MediaService } from './media.service';
export declare class MediaController {
    private svc;
    constructor(svc: MediaService);
    upload(propId: string, u: any, files: any[]): Promise<{
        fotos: any;
    }>;
    remove(propId: string, index: string, u: any): Promise<{
        fotos: any;
    }>;
    reorder(propId: string, u: any, orden: number[]): Promise<{
        fotos: any;
    }>;
}
