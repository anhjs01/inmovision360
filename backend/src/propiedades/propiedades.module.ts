import { Module } from '@nestjs/common';
import { PropiedadesService }    from './propiedades.service';
import { PropiedadesController } from './propiedades.controller';

@Module({ controllers: [PropiedadesController], providers: [PropiedadesService] })
export class PropiedadesModule {}
