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
exports.UsuariosService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
const http_exception_filter_1 = require("../common/filters/http-exception.filter");
const error_codes_1 = require("../common/constants/error-codes");
const formatters_1 = require("../common/utils/formatters");
let UsuariosService = class UsuariosService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async updateMe(userId, data) {
        const user = await this.prisma.usuario.update({ where: { id: userId }, data });
        return (0, formatters_1.formatUser)(user);
    }
    async changePassword(userId, actual, nuevo) {
        const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
        if (!user || !(await bcrypt.compare(actual, user.password)))
            throw new http_exception_filter_1.ApiException(error_codes_1.ErrorCode.INVALID_CREDENTIALS, 'Contraseña actual incorrecta', undefined, common_1.HttpStatus.UNAUTHORIZED);
        const hash = await bcrypt.hash(nuevo, 10);
        await this.prisma.usuario.update({ where: { id: userId }, data: { password: hash } });
        return { ok: true };
    }
    async deleteMe(userId) {
        await this.prisma.usuario.update({ where: { id: userId }, data: { deletedAt: new Date() } });
        return { ok: true };
    }
    async findAll(rol) {
        const where = { deletedAt: null };
        if (rol)
            where.rol = rol;
        const users = await this.prisma.usuario.findMany({ where });
        return users.map(formatters_1.formatUser);
    }
};
exports.UsuariosService = UsuariosService;
exports.UsuariosService = UsuariosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsuariosService);
//# sourceMappingURL=usuarios.service.js.map