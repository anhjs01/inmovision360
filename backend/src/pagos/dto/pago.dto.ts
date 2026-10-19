import { IsString, IsOptional, IsIn, IsInt, Min, Matches, MinLength, MaxLength } from 'class-validator';

export const PAGO_ESTADOS = ['pendiente', 'pagado', 'vencido'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePagoDto {
  // ID, email o nombre de un inquilino registrado
  @IsString() @MinLength(2) @MaxLength(120)                    inquilino: string;
  @IsString()                                                  propId: string;
  @IsInt() @Min(1)                                             monto: number;
  @Matches(FECHA, { message: 'Fecha inválida (AAAA-MM-DD)' })   fecha: string;
  @IsOptional() @IsIn(PAGO_ESTADOS)                            estado?: string;
  @IsOptional() @IsString() @MaxLength(30)                     metodo?: string;
}

export class UpdatePagoDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)                    inquilino?: string;
  @IsOptional() @IsString()                                                  propId?: string;
  @IsOptional() @IsInt() @Min(1)                                             monto?: number;
  @IsOptional() @Matches(FECHA, { message: 'Fecha inválida (AAAA-MM-DD)' })   fecha?: string;
  @IsOptional() @IsIn(PAGO_ESTADOS)                                          estado?: string;
  @IsOptional() @IsString() @MaxLength(30)                                   metodo?: string;
}

export class UpdatePagoEstadoDto {
  @IsIn(PAGO_ESTADOS) estado: string;
}

export class IniciarWompiDto {
  @IsString() pago_id: string;
}
