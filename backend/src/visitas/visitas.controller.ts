import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { VisitasService } from './visitas.service';
import { CurrentUser }    from '../common/decorators/current-user.decorator';
import { Roles }          from '../common/decorators/roles.decorator';
import { SolicitarVisitaDto, CreateVisitaManualDto, UpdateVisitaDto, UpdateVisitaEstadoDto } from './dto/visita.dto';

@Controller('visitas')
export class VisitasController {
  constructor(private svc: VisitasService) {}

  @Get()
  findAll(@CurrentUser() u: any, @Query('estado') estado?: string) { return this.svc.findAll(u.id, u.rol, estado); }

  @Get('mias')
  findMias(@CurrentUser() u: any) { return this.svc.findMias(u.id); }

  @Post()
  @Roles('inquilino')
  solicitar(@CurrentUser() u: any, @Body() dto: SolicitarVisitaDto) { return this.svc.solicitar(u, dto); }

  @Post('manual')
  @Roles('arrendador')
  createManual(@CurrentUser() u: any, @Body() dto: CreateVisitaManualDto) { return this.svc.createManual(u.id, dto); }

  @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @CurrentUser() u: any, @Body() dto: UpdateVisitaEstadoDto) {
    return this.svc.updateEstado(id, u.id, dto.estado);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() u: any, @Body() dto: UpdateVisitaDto) { return this.svc.update(id, u.id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.remove(id, u.id); }
}
