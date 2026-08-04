import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(ctx: ExecutionContext) { return super.canActivate(ctx); }
  handleRequest(_err: any, user: any) { return user || null; }
}
