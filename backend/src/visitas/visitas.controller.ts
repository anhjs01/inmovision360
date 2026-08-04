import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { VisitasService } from './visitas.service';
import { CurrentUser }    from '../common/decorators/current-user.decorator';

@Controller('visitas')
export class VisitasController {
  constructor(private svc: VisitasService) {}

  @Get()
  findAll(@CurrentUser() u: any, @Query('estado') estado?: string) { return this.svc.findAll(u.id, u.rol, estado); }

  @Get('mias')
  findMias(@CurrentUser() u: any) { return this.svc.findMias(u.id); }

  @Post()
  create(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.create({ ...body, inquilinoId: u.rol === 'inquilino' ? u.id : undefined });
  }

  @Post('manual')
  createManual(@Body() body: any) { return this.svc.create(body); }

  @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @CurrentUser() u: any, @Body('estado') estado: string) {
    return this.svc.updateEstado(id, estado, u.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
