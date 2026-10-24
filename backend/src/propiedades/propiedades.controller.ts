import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PropiedadesService } from './propiedades.service';
import { CurrentUser }        from '../common/decorators/current-user.decorator';
import { Public, Roles }      from '../common/decorators/roles.decorator';
import { CreatePropiedadDto, UpdatePropiedadDto, SolicitarCierreDto, ResolverCierreDto } from './dto/propiedad.dto';
import { OptionalJwtGuard }   from '../auth/guards/optional-jwt.guard';

@Controller('propiedades')
export class PropiedadesController {
  constructor(private svc: PropiedadesService) {}

  // Pública: catálogo de la landing sin token. Con sesión, las tarjetas traen el WhatsApp del arrendador
  @Public() @UseGuards(OptionalJwtGuard) @Get()
  findAll(@Query() q: any, @CurrentUser() u: any) { return this.svc.findAll(q, !!u); }

  @Get('mias')
  @Roles('arrendador')
  findMias(@CurrentUser() u: any) { return this.svc.findMias(u.id); }

  // Inquilino: inmuebles activos (reservados, arrendados o comprados)
  @Get('mi-hogar')
  @Roles('inquilino')
  findMiHogar(@CurrentUser() u: any) { return this.svc.findMiHogar(u.id); }

  // Pública, pero si llega un token se incluye el teléfono del arrendador (contacto por WhatsApp)
  @Public() @UseGuards(OptionalJwtGuard) @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.findOne(id, u?.id ?? null); }

  @Post(':id/cierre')
  @Roles('inquilino')
  solicitarCierre(@Param('id') id: string, @CurrentUser() u: any, @Body() b: SolicitarCierreDto) { return this.svc.solicitarCierre(id, u, b.tipo); }

  @Patch(':id/cierre')
  @Roles('arrendador')
  resolverCierre(@Param('id') id: string, @CurrentUser() u: any, @Body() b: ResolverCierreDto) { return this.svc.resolverCierre(id, u.id, b.accion); }

  @Post()
  @Roles('arrendador')
  create(@CurrentUser() u: any, @Body() body: CreatePropiedadDto) { return this.svc.create(u.id, u.plan ?? 'free', body); }

  @Patch(':id')
  @Roles('arrendador')
  update(@Param('id') id: string, @CurrentUser() u: any, @Body() body: UpdatePropiedadDto) { return this.svc.update(id, u.id, body); }

  @Delete(':id')
  @Roles('arrendador')
  remove(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.remove(id, u.id); }
}
