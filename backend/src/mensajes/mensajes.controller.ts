import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { MensajesService } from './mensajes.service';
import { CurrentUser }     from '../common/decorators/current-user.decorator';

@Controller('mensajes')
export class MensajesController {
  constructor(private svc: MensajesService) {}
  @Get()               findAll(@CurrentUser() u: any)                { return this.svc.findAll(u.id); }
  @Get('unread-count') unread(@CurrentUser() u: any)                 { return this.svc.unreadCount(u.id); }
  @Get('hilo/:propId') hilo(@Param('propId') p: string, @CurrentUser() u: any) { return this.svc.getHilo(p, u.id); }
  @Post()              send(@CurrentUser() u: any, @Body() b: any)   { return this.svc.send(u.id, b); }
  @Patch(':id/leido')  markRead(@Param('id') id: string)             { return this.svc.markRead(id); }
}
