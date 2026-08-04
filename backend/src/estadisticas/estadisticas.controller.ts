import { Controller, Get, Query } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';
import { CurrentUser }         from '../common/decorators/current-user.decorator';
import { Roles }               from '../common/decorators/roles.decorator';

@Controller('estadisticas')
@Roles('arrendador')
export class EstadisticasController {
  constructor(private svc: EstadisticasService) {}
  @Get('kpis')       kpis(@CurrentUser() u: any)                              { return this.svc.kpis(u.id); }
  @Get('por-tipo')   porTipo(@CurrentUser() u: any)                           { return this.svc.porTipo(u.id); }
  @Get('por-ciudad') porCiudad(@CurrentUser() u: any)                         { return this.svc.porCiudad(u.id); }
  @Get('ingresos')   ingresos(@CurrentUser() u: any, @Query('meses') m = '6') { return this.svc.ingresosPorMes(u.id, +m); }
}
