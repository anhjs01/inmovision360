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
exports.EstadisticasController = void 0;
const common_1 = require("@nestjs/common");
const estadisticas_service_1 = require("./estadisticas.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let EstadisticasController = class EstadisticasController {
    constructor(svc) {
        this.svc = svc;
    }
    kpis(u) { return this.svc.kpis(u.id); }
    porTipo(u) { return this.svc.porTipo(u.id); }
    porCiudad(u) { return this.svc.porCiudad(u.id); }
    ingresos(u, m = '6') { return this.svc.ingresosPorMes(u.id, +m); }
};
exports.EstadisticasController = EstadisticasController;
__decorate([
    (0, common_1.Get)('kpis'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EstadisticasController.prototype, "kpis", null);
__decorate([
    (0, common_1.Get)('por-tipo'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EstadisticasController.prototype, "porTipo", null);
__decorate([
    (0, common_1.Get)('por-ciudad'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EstadisticasController.prototype, "porCiudad", null);
__decorate([
    (0, common_1.Get)('ingresos'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('meses')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EstadisticasController.prototype, "ingresos", null);
exports.EstadisticasController = EstadisticasController = __decorate([
    (0, common_1.Controller)('estadisticas'),
    (0, roles_decorator_1.Roles)('arrendador'),
    __metadata("design:paramtypes", [estadisticas_service_1.EstadisticasService])
], EstadisticasController);
//# sourceMappingURL=estadisticas.controller.js.map