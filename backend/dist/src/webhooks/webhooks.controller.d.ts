import { WebhooksService } from './webhooks.service';
export declare class WebhooksController {
    private svc;
    constructor(svc: WebhooksService);
    wompi(body: any, sig: string): Promise<{
        ok: boolean;
    }>;
}
