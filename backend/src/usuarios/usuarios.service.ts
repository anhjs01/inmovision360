import { Injectable, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException }  from '../common/filters/http-exception.filter';
import { ErrorCode }     from '../common/constants/error-codes';
import { formatUser }    from '../common/utils/formatters';
import { UpdateMeDto }   from './dto/usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async updateMe(userId: string, data: UpdateMeDto) {
    const user = await this.prisma.usuario.update({ where: { id: userId }, data });
    return formatUser(user);
  }

  async changePassword(userId: string, actual: string, nuevo: string) {
    const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (user && !user.password)
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'Tu cuenta usa Google y no tiene contraseña');
    if (!user || !(await bcrypt.compare(actual, user.password)))
      throw new ApiException(ErrorCode.INVALID_CREDENTIALS, 'Contraseña actual incorrecta', undefined, HttpStatus.UNAUTHORIZED);
    const hash = await bcrypt.hash(nuevo, 10);
    await this.prisma.usuario.update({ where: { id: userId }, data: { password: hash } });
    return { ok: true };
  }

  async deleteMe(userId: string) {
    await this.prisma.usuario.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
    return { ok: true };
  }

  async findAll(rol?: string) {
    const where: any = { deletedAt: null };
    if (rol) where.rol = rol;
    const users = await this.prisma.usuario.findMany({ where });
    return users.map(formatUser);
  }
}
