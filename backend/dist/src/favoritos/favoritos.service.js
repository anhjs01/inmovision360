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
exports.FavoritosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const formatters_1 = require("../common/utils/formatters");
let FavoritosService = class FavoritosService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId) {
        const favs = await this.prisma.favorito.findMany({
            where: { userId },
            include: { propiedad: true },
        });
        return favs.map(f => (0, formatters_1.parsePropArrays)(f.propiedad));
    }
    async toggle(userId, propId) {
        const existing = await this.prisma.favorito.findUnique({
            where: { userId_propId: { userId, propId } },
        });
        if (existing) {
            await this.prisma.favorito.delete({ where: { userId_propId: { userId, propId } } });
            return { is_fav: false };
        }
        await this.prisma.favorito.create({ data: { userId, propId } });
        return { is_fav: true };
    }
    async check(userId, propId) {
        const fav = await this.prisma.favorito.findUnique({
            where: { userId_propId: { userId, propId } },
        });
        return { is_fav: !!fav };
    }
    async remove(userId, propId) {
        await this.prisma.favorito.deleteMany({ where: { userId, propId } });
        return { ok: true };
    }
};
exports.FavoritosService = FavoritosService;
exports.FavoritosService = FavoritosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FavoritosService);
//# sourceMappingURL=favoritos.service.js.map