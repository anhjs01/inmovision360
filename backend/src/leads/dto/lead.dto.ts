import { IsString, IsOptional, IsIn, IsEmail, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

export const LEAD_ESTADOS = ['new', 'contactado', 'interesado', 'visita_agendada', 'lost'];

export class CreateLeadDto {
  @IsString() @MinLength(2) @MaxLength(80)        nombre: string;
  @IsEmail({}, { message: 'Email inválido' })     email: string;
  @IsString()                                     propId: string;
  @IsOptional() @IsString() @MaxLength(40)        presupuesto?: string;
  @IsOptional() @IsString() @MaxLength(30)        fuente?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100)        score?: number;
  @IsOptional() @IsIn(LEAD_ESTADOS)               estado?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)     nombre?: string;
  @IsOptional() @IsEmail({}, { message: 'Email inválido' })  email?: string;
  @IsOptional() @IsString()                                  propId?: string;
  @IsOptional() @IsString() @MaxLength(40)                   presupuesto?: string;
  @IsOptional() @IsString() @MaxLength(30)                   fuente?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100)                   score?: number;
  @IsOptional() @IsIn(LEAD_ESTADOS)                          estado?: string;
}
