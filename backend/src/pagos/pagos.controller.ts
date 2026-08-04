import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CurrentUser }  from '../common/decorators/current-user.decorator';
import { Roles }        from '../common/decorators/roles.decorator';

@Controller('pagos')
export class PagosController {
  constructor(private svc: PagosService) {}

  @Get()         @Roles('arrendador') findAll(@CurrentUser() u: any, @Query('estado') e?: string) { return this.svc.findAll(u.id, e); }
  @Get('mios')                        findMios(@CurrentUser() u: any)                              { return this.svc.findMios(u.id); }
  @Post()        @Roles('arrendador') create(@CurrentUser() u: any, @Body() b: any)               { return this.svc.create(u.id, b); }
  @Post('wompi/iniciar')              iniciar(@Body() b: any)                                      { return this.svc.iniciarWompi(b); }
  @Patch(':id/estado')                updateEstado(@Param('id') id: string, @Body('estado') e: string) { return this.svc.updateEstado(id, e); }
}
