import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    config.get<string>('JWT_SECRET'),
    });
  }

  // Se lee el usuario de la BD en cada request: el rol y el plan quedan siempre al día
  // (tras completar perfil o cambiar de plan) y una cuenta eliminada pierde el acceso
  // aunque su token aún no haya expirado.
  async validate(payload: any) {
    const user = await this.prisma.usuario.findFirst({
      where:  { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, rol: true, plan: true, nombre: true, apellido: true, perfilCompleto: true },
    });
    return user ?? null;
  }
}
