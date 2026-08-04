"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropiedadesModule = void 0;
const common_1 = require("@nestjs/common");
const propiedades_service_1 = require("./propiedades.service");
const propiedades_controller_1 = require("./propiedades.controller");
let PropiedadesModule = class PropiedadesModule {
};
exports.PropiedadesModule = PropiedadesModule;
exports.PropiedadesModule = PropiedadesModule = __decorate([
    (0, common_1.Module)({ controllers: [propiedades_controller_1.PropiedadesController], providers: [propiedades_service_1.PropiedadesService] })
], PropiedadesModule);
//# sourceMappingURL=propiedades.module.js.map