import { NestFactory }         from '@nestjs/core';
import { ConfigService }       from '@nestjs/config';
import { AppModule }           from './app.module';
import { configureApp }        from './app.setup';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  const cfg = app.get(ConfigService);

  const port = cfg.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`\n🚀 INMOVISIÓN 360 API corriendo en: http://localhost:${port}/v1`);
  console.log(`   Base de datos: SQLite (prisma/inmovision.db)`);
  console.log(`   Docs rápidas:  GET /v1/suscripciones/planes\n`);
}

bootstrap();
