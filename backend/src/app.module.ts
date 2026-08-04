import { Module }       from '@nestjs/common';
import { ConfigModule }  from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import { PrismaModule }         from './prisma/prisma.module';
import { EmailModule }          from './email/email.module';
import { AuthModule }           from './auth/auth.module';
import { UsuariosModule }       from './usuarios/usuarios.module';
import { PropiedadesModule }    from './propiedades/propiedades.module';
import { VisitasModule }        from './visitas/visitas.module';
import { MensajesModule }       from './mensajes/mensajes.module';
import { LeadsModule }          from './leads/leads.module';
import { PagosModule }          from './pagos/pagos.module';
import { FavoritosModule }      from './favoritos/favoritos.module';
import { EstadisticasModule }   from './estadisticas/estadisticas.module';
import { SuscripcionesModule }  from './suscripciones/suscripciones.module';
import { WebhooksModule }       from './webhooks/webhooks.module';
import { MediaModule }          from './media/media.module';

import { JwtAuthGuard, RolesGuard } from './auth/guards/jwt.guard';
import { ResponseInterceptor }      from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter }    from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, EmailModule, AuthModule,
    UsuariosModule, PropiedadesModule, VisitasModule, MensajesModule,
    LeadsModule, PagosModule, FavoritosModule, EstadisticasModule,
    SuscripcionesModule, WebhooksModule, MediaModule,
  ],
  providers: [
    { provide: APP_GUARD,       useClass: JwtAuthGuard },
    { provide: APP_GUARD,       useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER,      useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
