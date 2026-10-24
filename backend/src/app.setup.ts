import { ValidationPipe }         from '@nestjs/common';
import { ConfigService }          from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { UPLOAD_DIR }             from './common/utils/uploads';

// Configuración común de la app: la usan main.ts y las pruebas e2e (así prueban lo mismo que corre)
export function configureApp(app: NestExpressApplication) {
  const cfg = app.get(ConfigService);

  // CORS — permite el frontend. En desarrollo se acepta cualquier puerto de localhost/127.0.0.1
  // (Live Server cambia de puerto si el 5500 está ocupado y el catálogo público no cargaba)
  const frontendUrl = cfg.get('FRONTEND_URL', 'http://127.0.0.1:5500');
  const devOrigin   = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.enableCors({
    origin: cfg.get('NODE_ENV') === 'production'
      ? [frontendUrl]
      : [frontendUrl, devOrigin],
    methods:     ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
    credentials: true,
  });

  // Prefijo global de rutas
  app.setGlobalPrefix('v1');

  // Los comprobantes de pago son privados: nunca se sirven como estáticos
  app.use('/uploads/comprobantes', (_req, res) => res.status(404).end());

  // Archivos subidos (fotos locales)
  app.useStaticAssets(UPLOAD_DIR, {
    prefix:     '/uploads',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });

  // Validación de DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
  return app;
}
