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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritosController = void 0;
const common_1 = require("@nestjs/common");
const favoritos_service_1 = require("./favoritos.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let FavoritosController = class FavoritosController {
    constructor(svc) {
        this.svc = svc;
    }
    findAll(u) { return this.svc.findAll(u.id); }
    toggle(u, p) { return this.svc.toggle(u.id, p); }
    check(u, p) { return this.svc.check(u.id, p); }
    remove(u, p) { return this.svc.remove(u.id, p); }
};
exports.FavoritosController = FavoritosController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FavoritosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('prop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FavoritosController.prototype, "toggle", null);
__decorate([
    (0, common_1.Get)(':propId/check'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('propId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FavoritosController.prototype, "check", null);
__decorate([
    (0, common_1.Delete)(':propId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('propId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FavoritosController.prototype, "remove", null);
exports.FavoritosController = FavoritosController = __decorate([
    (0, common_1.Controller)('favoritos'),
    __metadata("design:paramtypes", [favoritos_service_1.FavoritosService])
], FavoritosController);
//# sourceMappingURL=favoritos.controller.js.map