"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const path_1 = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const cfg = app.get(config_1.ConfigService);
    app.enableCors({
        origin: [cfg.get('FRONTEND_URL', 'http://127.0.0.1:5500'), 'http://localhost:5500', 'http://127.0.0.1:5501', 'http://localhost:5501'],
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
    });
    app.setGlobalPrefix('v1');
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads' });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
    const port = cfg.get('PORT', 3000);
    await app.listen(port);
    console.log(`\n🚀 INMOVISIÓN 360 API corriendo en: http://localhost:${port}/v1`);
    console.log(`   Base de datos: SQLite (prisma/inmovision.db)`);
    console.log(`   Docs rápidas:  GET /v1/suscripciones/planes\n`);
}
bootstrap();
//# sourceMappingURL=main.js.map