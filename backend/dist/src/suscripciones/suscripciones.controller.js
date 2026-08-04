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
exports.SuscripcionesController = void 0;
const common_1 = require("@nestjs/common");
const suscripciones_service_1 = require("./suscripciones.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let SuscripcionesController = class SuscripcionesController {
    constructor(svc) {
        this.svc = svc;
    }
    planes() { return this.svc.getPlanes(); }
    miPlan(u) { return this.svc.getMiPlan(u.id); }
    suscribirse(u, b) { return this.svc.suscribirse(u.id, b.plan_id, b.metodo); }
    cancelar(u) { return this.svc.cancelar(u.id); }
};
exports.SuscripcionesController = SuscripcionesController;
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)('planes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuscripcionesController.prototype, "planes", null);
__decorate([
    (0, common_1.Get)('mi-plan'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SuscripcionesController.prototype, "miPlan", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('arrendador'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SuscripcionesController.prototype, "suscribirse", null);
__decorate([
    (0, common_1.Delete)('mi-plan'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SuscripcionesController.prototype, "cancelar", null);
exports.SuscripcionesController = SuscripcionesController = __decorate([
    (0, common_1.Controller)('suscripciones'),
    __metadata("design:paramtypes", [suscripciones_service_1.SuscripcionesService])
], SuscripcionesController);
//# sourceMappingURL=suscripciones.controller.js.map