import { ExecutionContext } from '@nestjs/common';
declare const OptionalJwtGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class OptionalJwtGuard extends OptionalJwtGuard_base {
    canActivate(ctx: ExecutionContext): boolean | Promise<boolean> | import("rxjs").Observable<boolean>;
    handleRequest(_err: any, user: any): any;
}
export {};
