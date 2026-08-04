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
exports.PagosController = void 0;
const common_1 = require("@nestjs/common");
const pagos_service_1 = require("./pagos.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let PagosController = class PagosController {
    constructor(svc) {
        this.svc = svc;
    }
    findAll(u, e) { return this.svc.findAll(u.id, e); }
    findMios(u) { return this.svc.findMios(u.id); }
    create(u, b) { return this.svc.create(u.id, b); }
    iniciar(b) { return this.svc.iniciarWompi(b); }
    updateEstado(id, e) { return this.svc.updateEstado(id, e); }
};
exports.PagosController = PagosController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('arrendador'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('estado')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PagosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('mios'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PagosController.prototype, "findMios", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('arrendador'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PagosController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('wompi/iniciar'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PagosController.prototype, "iniciar", null);
__decorate([
    (0, common_1.Patch)(':id/estado'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('estado')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PagosController.prototype, "updateEstado", null);
exports.PagosController = PagosController = __decorate([
    (0, common_1.Controller)('pagos'),
    __metadata("design:paramtypes", [pagos_service_1.PagosService])
], PagosController);
//# sourceMappingURL=pagos.controller.js.map