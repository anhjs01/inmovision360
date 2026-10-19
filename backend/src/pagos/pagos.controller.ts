import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CurrentUser }  from '../common/decorators/current-user.decorator';
import { Roles }        from '../common/decorators/roles.decorator';
import { CreatePagoDto, UpdatePagoDto, UpdatePagoEstadoDto, IniciarWompiDto } from './dto/pago.dto';

@Controller('pagos')
export class PagosController {
  constructor(private svc: PagosService) {}

  @Get()         @Roles('arrendador') findAll(@CurrentUser() u: any, @Query('estado') e?: string)  { return this.svc.findAll(u.id, e); }
  @Get('mios')                        findMios(@CurrentUser() u: any)                               { return this.svc.findMios(u.id); }
  @Post()        @Roles('arrendador') create(@CurrentUser() u: any, @Body() b: CreatePagoDto)        { return this.svc.create(u.id, b); }
  @Post('wompi/iniciar')              iniciar(@CurrentUser() u: any, @Body() b: IniciarWompiDto)    { return this.svc.iniciarWompi(u.id, b.pago_id); }
  @Patch(':id/estado') @Roles('arrendador')
  updateEstado(@Param('id') id: string, @CurrentUser() u: any, @Body() b: UpdatePagoEstadoDto)       { return this.svc.update(id, u.id, { estado: b.estado }); }
  @Patch(':id')  @Roles('arrendador') update(@Param('id') id: string, @CurrentUser() u: any, @Body() b: UpdatePagoDto) { return this.svc.update(id, u.id, b); }
  @Delete(':id') @Roles('arrendador') remove(@Param('id') id: string, @CurrentUser() u: any)       { return this.svc.remove(id, u.id); }
}
