import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService }             from '@nestjs/jwt';
import { ConfigService }          from '@nestjs/config';
import * as bcrypt                from 'bcrypt';
import { v4 as uuidv4 }          from 'uuid';
import { PrismaService }          from '../prisma/prisma.service';
import { ApiException }           from '../common/filters/http-exception.filter';
import { ErrorCode }              from '../common/constants/error-codes';
import { formatUser }             from '../common/utils/formatters';
import { RegisterDto, LoginDto, RefreshDto, ForgotPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma:  PrismaService,
    private jwt:     JwtService,
    private config:  ConfigService,
  ) {}

  // ── Registro ───────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const exists = await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS, 'Email ya registrado', 'email');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.usuario.create({
      data: {
        nombre:   dto.nombre,
        apellido: dto.apellido ?? '',
        email:    dto.email.toLowerCase(),
        password: hash,
        rol:      dto.rol,
        plan:     'free',
        verified: true,  // auto-verificado (sin email en dev)
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.rol);
    return { user: formatUser(user), ...tokens };
  }

  // ── Login ──────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new ApiException(ErrorCode.INVALID_CREDENTIALS, 'Email o contraseña incorrectos', undefined, HttpStatus.UNAUTHORIZED);
    }

    const tokens = await this.issueTokens(user.id, user.email, user.rol);
    return { user: formatUser(user), ...tokens };
  }

  // ── Refresh token ──────────────────────────────────────────
  async refresh(dto: RefreshDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refresh_token },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new ApiException(ErrorCode.TOKEN_INVALID, 'Refresh token inválido o expirado', undefined, HttpStatus.UNAUTHORIZED);
    }

    // Rotar: revocar el anterior
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    return this.issueTokens(stored.user.id, stored.user.email, stored.user.rol);
  }

  // ── Logout ─────────────────────────────────────────────────
  async logout(userId: string, refreshToken?: string) {
    const where = refreshToken
      ? { token: refreshToken, userId }
      : { userId, revoked: false };

    await this.prisma.refreshToken.updateMany({ where, data: { revoked: true } });
    return { ok: true };
  }

  // ── Perfil autenticado ─────────────────────────────────────
  async me(userId: string) {
    const user = await this.prisma.usuario.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new ApiException(ErrorCode.USER_NOT_FOUND, 'Usuario no encontrado', undefined, HttpStatus.NOT_FOUND);
    return formatUser(user);
  }

  // ── Olvidé contraseña (stub) ───────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    // En producción: generar token y enviar email
    // En dev: siempre responde ok por seguridad
    return { ok: true, message: 'Si el email existe, recibirás un enlace.' };
  }

  // ── Emitir access + refresh token ─────────────────────────
  private async issueTokens(userId: string, email: string, rol: string) {
    const payload      = { sub: userId, email, rol };
    const access_token = this.jwt.sign(payload, {
      secret:    this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRY', '15m'),
    });

    const refresh_token = uuidv4();
    const days          = parseInt(this.config.get('JWT_REFRESH_EXPIRY', '30'), 10) || 30;
    const expiresAt     = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({ data: { token: refresh_token, userId, expiresAt } });
    return { access_token, refresh_token };
  }
}
