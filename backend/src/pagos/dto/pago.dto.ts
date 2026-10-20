import { IsString, IsOptional, IsIn, IsInt, Min, Max, Matches, MinLength, MaxLength } from 'class-validator';

export const PAGO_ESTADOS = ['pendiente', 'pagado', 'vencido'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MONTO_MAX = 10_000_000_000; // 10.000 millones COP

export class CreatePagoDto {
  // Opcional: ID, email o nombre de un inquilino registrado. Sin él es un pago directo/general
  @IsOptional() @IsString() @MaxLength(120)                    inquilino?: string;
  @IsString()                                                  propId: string;
  @IsInt() @Min(1) @Max(MONTO_MAX)                             monto: number;
  @Matches(FECHA, { message: 'Fecha inválida (AAAA-MM-DD)' })   fecha: string;
  @IsOptional() @IsIn(PAGO_ESTADOS)                            estado?: string;
  @IsOptional() @IsString() @MaxLength(30)                     metodo?: string;
  @IsOptional() @IsString() @MaxLength(80)                     concepto?: string;
}

export class UpdatePagoDto {
  // null o '' desvincula al inquilino
  @IsOptional() @IsString() @MaxLength(120)                                  inquilino?: string | null;
  @IsOptional() @IsString()                                                  propId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(MONTO_MAX)                             monto?: number;
  @IsOptional() @Matches(FECHA, { message: 'Fecha inválida (AAAA-MM-DD)' })   fecha?: string;
  @IsOptional() @IsIn(PAGO_ESTADOS)                                          estado?: string;
  @IsOptional() @IsString() @MaxLength(30)                                   metodo?: string;
  @IsOptional() @IsString() @MaxLength(80)                                   concepto?: string | null;
}

export class UpdatePagoEstadoDto {
  @IsIn(PAGO_ESTADOS) estado: string;
}

export class IniciarWompiDto {
  @IsString() pago_id: string;
}

// Pago reportado por el inquilino: queda pendiente hasta que el arrendador lo confirme
export class ReportarPagoDto {
  @IsString()                                                  propId: string;
  @IsInt() @Min(1) @Max(MONTO_MAX)                             monto: number;
  @Matches(FECHA, { message: 'Fecha inválida (AAAA-MM-DD)' })   fecha: string;
  @IsOptional() @IsString() @MaxLength(30)                     metodo?: string;
  @IsOptional() @IsString() @MaxLength(80)                     concepto?: string;
}
