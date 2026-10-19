import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { SuscripcionesService } from './suscripciones.service';
import { CurrentUser }          from '../common/decorators/current-user.decorator';
import { Public, Roles }        from '../common/decorators/roles.decorator';

class SuscribirseDto {
  @IsString()                              plan_id: string;
  @IsOptional() @IsString() @MaxLength(30) metodo?: string;
}

@Controller('suscripciones')
export class SuscripcionesController {
  constructor(private svc: SuscripcionesService) {}
  @Public() @Get('planes')   planes()                                        { return this.svc.getPlanes(); }
  @Get('mi-plan')            miPlan(@CurrentUser() u: any)                   { return this.svc.getMiPlan(u.id); }
  @Post()   @Roles('arrendador', 'inquilino') suscribirse(@CurrentUser() u: any, @Body() b: SuscribirseDto) { return this.svc.suscribirse(u.id, b.plan_id, b.metodo); }
  @Delete('mi-plan')         cancelar(@CurrentUser() u: any)                 { return this.svc.cancelar(u.id); }
}
