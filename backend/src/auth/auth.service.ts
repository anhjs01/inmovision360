import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService }             from '@nestjs/jwt';
import { ConfigService }          from '@nestjs/config';
import * as bcrypt                from 'bcrypt';
import { v4 as uuidv4 }          from 'uuid';
import { OAuth2Client }          from 'google-auth-library';
import { PrismaService }          from '../prisma/prisma.service';
import { ApiException }           from '../common/filters/http-exception.filter';
import { ErrorCode }              from '../common/constants/error-codes';
import { formatUser }             from '../common/utils/formatters';
import { RegisterDto, LoginDto, RefreshDto, ForgotPasswordDto,
         GoogleLoginDto, CompleteProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(this.config.get('GOOGLE_CLIENT_ID'));

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

    if (!user || !user.password || !(await bcrypt.compare(dto.password, user.password))) {
      throw new ApiException(ErrorCode.INVALID_CREDENTIALS, 'Email o contraseña incorrectos', undefined, HttpStatus.UNAUTHORIZED);
    }

    const tokens = await this.issueTokens(user.id, user.email, user.rol);
    return { user: formatUser(user), ...tokens };
  }

// ── login google ──
async googleLogin(idToken: string, mode?: string) {
  let payload;
  try {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.config.get('GOOGLE_CLIENT_ID'),
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiException(ErrorCode.TOKEN_INVALID, 'Token de Google inválido', undefined, HttpStatus.UNAUTHORIZED);
  }
 
  if (!payload?.email) {
    throw new ApiException(ErrorCode.TOKEN_INVALID, 'Google no devolvió un correo válido', undefined, HttpStatus.UNAUTHORIZED);
  }
 
  const email = payload.email.toLowerCase();
  let user = await this.prisma.usuario.findFirst({ where: { googleId: payload.sub } });
 
  if (user) {
    // Ya tenía cuenta vinculada a Google → si vino del formulario de REGISTRO, es un error
    if (mode === 'register') {
      throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS, 'Ya tienes una cuenta con este correo. Inicia sesión en su lugar.', 'email');
    }
  } else {
    user = await this.prisma.usuario.findUnique({ where: { email } });
 
    if (user) {
      // Tenía cuenta con contraseña normal, mismo correo → también es un "ya existe" para registro
      if (mode === 'register') {
        throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS, 'Ya tienes una cuenta con este correo. Inicia sesión en su lugar.', 'email');
      }
      // Viene del formulario de LOGIN → vinculamos Google a la cuenta existente
      user = await this.prisma.usuario.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    } else {
      // Usuario totalmente nuevo vía Google
      user = await this.prisma.usuario.create({
        data: {
          nombre:         payload.given_name  ?? '',
          apellido:       payload.family_name ?? '',
          email,
          password:       null,
          googleId:       payload.sub,
          provider:       'google',
          rol:            'inquilino',
          plan:           'free',
          verified:       true,
          perfilCompleto: false,
        },
      });
    }
  }
 
  const tokens = await this.issueTokens(user.id, user.email, user.rol);
  return { user: formatUser(user), ...tokens, needsProfile: !user.perfilCompleto };
}

  // ── Completar perfil tras login con Google ─────────────────
  async completeProfile(userId: string, dto: CompleteProfileDto) {
  const user = await this.prisma.usuario.update({
    where: { id: userId },
    data: {
      nombre:         dto.nombre,
      apellido:       dto.apellido ?? '',
      telefono:       dto.telefono,
      rol:            dto.rol,
      perfilCompleto: true,
    },
  });
  return formatUser(user);
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