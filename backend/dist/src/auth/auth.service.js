"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const uuid_1 = require("uuid");
const google_auth_library_1 = require("google-auth-library");
const prisma_service_1 = require("../prisma/prisma.service");
const http_exception_filter_1 = require("../common/filters/http-exception.filter");
const error_codes_1 = require("../common/constants/error-codes");
const formatters_1 = require("../common/utils/formatters");
let AuthService = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.googleClient = new google_auth_library_1.OAuth2Client(this.config.get('GOOGLE_CLIENT_ID'));
    }
    async register(dto) {
        const exists = await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (exists)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.EMAIL_ALREADY_EXISTS, 'Email ya registrado', 'email');
        const hash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.usuario.create({
            data: {
                nombre: dto.nombre,
                apellido: dto.apellido ?? '',
                email: dto.email.toLowerCase(),
                password: hash,
                rol: dto.rol,
                plan: 'free',
                verified: true,
            },
        });
        const tokens = await this.issueTokens(user.id, user.email, user.rol);
        return { user: (0, formatters_1.formatUser)(user), ...tokens };
    }
    async login(dto) {
        const user = await this.prisma.usuario.findFirst({
            where: { email: dto.email.toLowerCase(), deletedAt: null },
        });
        if (!user || !user.password || !(await bcrypt.compare(dto.password, user.password))) {
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.INVALID_CREDENTIALS, 'Email o contraseña incorrectos', undefined, common_1.HttpStatus.UNAUTHORIZED);
        }
        const tokens = await this.issueTokens(user.id, user.email, user.rol);
        return { user: (0, formatters_1.formatUser)(user), ...tokens };
    }
    async googleLogin(idToken, mode) {
        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: this.config.get('GOOGLE_CLIENT_ID'),
            });
            payload = ticket.getPayload();
        }
        catch {
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.TOKEN_INVALID, 'Token de Google inválido', undefined, common_1.HttpStatus.UNAUTHORIZED);
        }
        if (!payload?.email) {
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.TOKEN_INVALID, 'Google no devolvió un correo válido', undefined, common_1.HttpStatus.UNAUTHORIZED);
        }
        const email = payload.email.toLowerCase();
        let user = await this.prisma.usuario.findFirst({ where: { googleId: payload.sub } });
        if (user) {
            if (mode === 'register') {
                throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.EMAIL_ALREADY_EXISTS, 'Ya tienes una cuenta con este correo. Inicia sesión en su lugar.', 'email');
            }
        }
        else {
            user = await this.prisma.usuario.findUnique({ where: { email } });
            if (user) {
                if (mode === 'register') {
                    throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.EMAIL_ALREADY_EXISTS, 'Ya tienes una cuenta con este correo. Inicia sesión en su lugar.', 'email');
                }
                user = await this.prisma.usuario.update({
                    where: { id: user.id },
                    data: { googleId: payload.sub },
                });
            }
            else {
                user = await this.prisma.usuario.create({
                    data: {
                        nombre: payload.given_name ?? '',
                        apellido: payload.family_name ?? '',
                        email,
                        password: null,
                        googleId: payload.sub,
                        provider: 'google',
                        rol: 'inquilino',
                        plan: 'free',
                        verified: true,
                        perfilCompleto: false,
                    },
                });
            }
        }
        const tokens = await this.issueTokens(user.id, user.email, user.rol);
        return { user: (0, formatters_1.formatUser)(user), ...tokens, needsProfile: !user.perfilCompleto };
    }
    async completeProfile(userId, dto) {
        const user = await this.prisma.usuario.update({
            where: { id: userId },
            data: {
                nombre: dto.nombre,
                apellido: dto.apellido ?? '',
                telefono: dto.telefono,
                rol: dto.rol,
                perfilCompleto: true,
            },
        });
        return (0, formatters_1.formatUser)(user);
    }
    async refresh(dto) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: dto.refresh_token },
            include: { user: true },
        });
        if (!stored || stored.revoked || stored.expiresAt < new Date()) {
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.TOKEN_INVALID, 'Refresh token inválido o expirado', undefined, common_1.HttpStatus.UNAUTHORIZED);
        }
        await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
        return this.issueTokens(stored.user.id, stored.user.email, stored.user.rol);
    }
    async logout(userId, refreshToken) {
        const where = refreshToken
            ? { token: refreshToken, userId }
            : { userId, revoked: false };
        await this.prisma.refreshToken.updateMany({ where, data: { revoked: true } });
        return { ok: true };
    }
    async me(userId) {
        const user = await this.prisma.usuario.findFirst({ where: { id: userId, deletedAt: null } });
        if (!user)
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.USER_NOT_FOUND, 'Usuario no encontrado', undefined, common_1.HttpStatus.NOT_FOUND);
        return (0, formatters_1.formatUser)(user);
    }
    async forgotPassword(dto) {
        return { ok: true, message: 'Si el email existe, recibirás un enlace.' };
    }
    async issueTokens(userId, email, rol) {
        const payload = { sub: userId, email, rol };
        const access_token = this.jwt.sign(payload, {
            secret: this.config.get('JWT_SECRET'),
            expiresIn: this.config.get('JWT_EXPIRY', '15m'),
        });
        const refresh_token = (0, uuid_1.v4)();
        const days = parseInt(this.config.get('JWT_REFRESH_EXPIRY', '30'), 10) || 30;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({ data: { token: refresh_token, userId, expiresAt } });
        return { access_token, refresh_token };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map