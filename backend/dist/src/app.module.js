"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const prisma_module_1 = require("./prisma/prisma.module");
const email_module_1 = require("./email/email.module");
const auth_module_1 = require("./auth/auth.module");
const usuarios_module_1 = require("./usuarios/usuarios.module");
const propiedades_module_1 = require("./propiedades/propiedades.module");
const visitas_module_1 = require("./visitas/visitas.module");
const mensajes_module_1 = require("./mensajes/mensajes.module");
const leads_module_1 = require("./leads/leads.module");
const pagos_module_1 = require("./pagos/pagos.module");
const favoritos_module_1 = require("./favoritos/favoritos.module");
const estadisticas_module_1 = require("./estadisticas/estadisticas.module");
const suscripciones_module_1 = require("./suscripciones/suscripciones.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const media_module_1 = require("./media/media.module");
const jwt_guard_1 = require("./auth/guards/jwt.guard");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule, email_module_1.EmailModule, auth_module_1.AuthModule,
            usuarios_module_1.UsuariosModule, propiedades_module_1.PropiedadesModule, visitas_module_1.VisitasModule, mensajes_module_1.MensajesModule,
            leads_module_1.LeadsModule, pagos_module_1.PagosModule, favoritos_module_1.FavoritosModule, estadisticas_module_1.EstadisticasModule,
            suscripciones_module_1.SuscripcionesModule, webhooks_module_1.WebhooksModule, media_module_1.MediaModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_guard_1.RolesGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: response_interceptor_1.ResponseInterceptor },
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.GlobalExceptionFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map