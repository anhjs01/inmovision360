import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { FavoritosService } from './favoritos.service';
import { CurrentUser }      from '../common/decorators/current-user.decorator';

@Controller('favoritos')
export class FavoritosController {
  constructor(private svc: FavoritosService) {}
  @Get()              findAll(@CurrentUser() u: any)                         { return this.svc.findAll(u.id); }
  @Post()             toggle(@CurrentUser() u: any, @Body('prop_id') p: string) { return this.svc.toggle(u.id, p); }
  @Get(':propId/check') check(@CurrentUser() u: any, @Param('propId') p: string) { return this.svc.check(u.id, p); }
  @Delete(':propId')  remove(@CurrentUser() u: any, @Param('propId') p: string) { return this.svc.remove(u.id, p); }
}
