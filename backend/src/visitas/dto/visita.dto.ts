import { IsString, IsOptional, IsIn, Matches, MinLength, MaxLength } from 'class-validator';

export const VISITA_ESTADOS = ['pendiente', 'confirmada', 'cancelada'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA  = /^([01]\d|2[0-3]):[0-5]\d$/;

// Inquilino solicita una visita desde el detalle de la propiedad
export class SolicitarVisitaDto {
  @IsString()                                                   propId: string;
  @Matches(FECHA, { message: 'Fecha inválida (AAAA-MM-DD)' })    fecha: string;
  @Matches(HORA,  { message: 'Hora inválida (HH:MM)' })          hora: string;
  @IsOptional() @IsString() @MaxLength(300)                     nota?: string;
}

// Arrendador agenda una visita manual en una de sus propiedades
export class CreateVisitaManualDto {
  @IsString() @MinLength(2) @MaxLength(80)                      cliente: string;
  @IsString()                                                   propId: string;
  @Matches(FECHA, { message: 'Fecha inválida (AAAA-MM-DD)' })    fecha: string;
  @Matches(HORA,  { message: 'Hora inválida (HH:MM)' })          hora: string;
  @IsOptional() @IsIn(VISITA_ESTADOS)                           estado?: string;
  @IsOptional() @IsString() @MaxLength(300)                     nota?: string;
}

export class UpdateVisitaDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)                    cliente?: string;
  @IsOptional() @IsString()                                                 propId?: string;
  @IsOptional() @Matches(FECHA, { message: 'Fecha inválida (AAAA-MM-DD)' })  fecha?: string;
  @IsOptional() @Matches(HORA,  { message: 'Hora inválida (HH:MM)' })        hora?: string;
  @IsOptional() @IsIn(VISITA_ESTADOS)                                       estado?: string;
  @IsOptional() @IsString() @MaxLength(300)                                 nota?: string;
}

export class UpdateVisitaEstadoDto {
  @IsIn(VISITA_ESTADOS) estado: string;
}
