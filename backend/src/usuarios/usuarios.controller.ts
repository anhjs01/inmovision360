import { Controller, Get, Patch, Delete, Body, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CurrentUser }     from '../common/decorators/current-user.decorator';
import { Roles }           from '../common/decorators/roles.decorator';
import { UpdateMeDto, ChangePasswordDto } from './dto/usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private svc: UsuariosService) {}

  @Patch('me')
  updateMe(@CurrentUser() u: any, @Body() body: UpdateMeDto) { return this.svc.updateMe(u.id, body); }

  @Patch('me/password')
  changePassword(@CurrentUser() u: any, @Body() b: ChangePasswordDto) {
    return this.svc.changePassword(u.id, b.password_actual, b.password_nuevo);
  }

  @Delete('me')
  deleteMe(@CurrentUser() u: any) { return this.svc.deleteMe(u.id); }

  @Get()
  @Roles('admin')
  findAll(@Query('rol') rol?: string) { return this.svc.findAll(rol); }
}
