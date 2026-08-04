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
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs = require("fs");
const path = require("path");
let MediaService = class MediaService {
    constructor(prisma) {
        this.prisma = prisma;
        this.uploadDir = path.join(process.cwd(), 'uploads');
    }
    ensureUploadDir() {
        if (!fs.existsSync(this.uploadDir))
            fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    async addFotos(propId, ownerId, files) {
        const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
        if (!prop)
            throw new Error('Propiedad no encontrada');
        this.ensureUploadDir();
        const existingFotos = JSON.parse(prop.fotos || '[]');
        const newUrls = (files || []).map((f) => {
            const filename = Date.now() + '_' + f.originalname;
            fs.writeFileSync(path.join(this.uploadDir, filename), f.buffer);
            return '/uploads/' + filename;
        });
        const updated = await this.prisma.propiedad.update({
            where: { id: propId },
            data: { fotos: JSON.stringify([...existingFotos, ...newUrls]) },
        });
        return { fotos: JSON.parse(updated.fotos) };
    }
    async removeFoto(propId, ownerId, index) {
        const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
        if (!prop)
            throw new Error('Propiedad no encontrada');
        const fotos = JSON.parse(prop.fotos || '[]');
        const removed = fotos.splice(index, 1)[0];
        if (removed && removed.startsWith('/uploads/')) {
            const filePath = path.join(process.cwd(), removed);
            if (fs.existsSync(filePath))
                fs.unlinkSync(filePath);
        }
        const updated = await this.prisma.propiedad.update({
            where: { id: propId },
            data: { fotos: JSON.stringify(fotos) },
        });
        return { fotos: JSON.parse(updated.fotos) };
    }
    async reordenarFotos(propId, ownerId, orden) {
        const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, ownerId, deletedAt: null } });
        if (!prop)
            throw new Error('Propiedad no encontrada');
        const fotos = JSON.parse(prop.fotos || '[]');
        const reordenadas = orden.map(i => fotos[i]).filter(Boolean);
        const updated = await this.prisma.propiedad.update({
            where: { id: propId },
            data: { fotos: JSON.stringify(reordenadas) },
        });
        return { fotos: JSON.parse(updated.fotos) };
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MediaService);
//# sourceMappingURL=media.service.js.map