import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CurrentUser }  from '../common/decorators/current-user.decorator';
import { Roles }        from '../common/decorators/roles.decorator';

@Controller('leads')
@Roles('arrendador')
export class LeadsController {
  constructor(private svc: LeadsService) {}
  @Get()         findAll(@CurrentUser() u: any, @Query('estado') e?: string) { return this.svc.findAll(u.id, e); }
  @Post()        create(@CurrentUser() u: any, @Body() b: any)               { return this.svc.create(u.id, b); }
  @Patch(':id')  update(@Param('id') id: string, @CurrentUser() u: any, @Body() b: any) { return this.svc.update(id, u.id, b); }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser() u: any)      { return this.svc.remove(id, u.id); }
}
