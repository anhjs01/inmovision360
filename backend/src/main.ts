import { NestFactory }         from '@nestjs/core';
import { ValidationPipe }      from '@nestjs/common';
import { ConfigService }       from '@nestjs/config';
import { AppModule }           from './app.module';
import { join }                from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const cfg = app.get(ConfigService);

  // CORS — permite el frontend
  app.enableCors({
    origin:      [cfg.get('FRONTEND_URL', 'http://127.0.0.1:5500'), 'http://localhost:5500', 'http://127.0.0.1:5501', 'http://localhost:5501'],
    methods:     ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
    credentials: true,
  });

  // Prefijo global de rutas
  app.setGlobalPrefix('v1');

  // Archivos subidos (fotos locales)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Validación de DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));

  const port = cfg.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`\n🚀 INMOVISIÓN 360 API corriendo en: http://localhost:${port}/v1`);
  console.log(`   Base de datos: SQLite (prisma/inmovision.db)`);
  console.log(`   Docs rápidas:  GET /v1/suscripciones/planes\n`);
}

bootstrap();
