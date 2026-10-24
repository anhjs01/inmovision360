import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

// Solo datos personales: rol, plan, email y contraseña NO se cambian por aquí
export class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)   nombre?: string;
  @IsOptional() @IsString() @MaxLength(60)                 apellido?: string;
  @IsOptional() @Matches(/^[+\d\s()-]{0,20}$/, { message: 'Teléfono inválido' }) telefono?: string;
  // Plantilla del mensaje con el que los clientes escriben por WhatsApp (vacía = la predeterminada)
  @IsOptional() @IsString() @MaxLength(500)                waMensaje?: string;
}

export class ChangePasswordDto {
  @IsString()                password_actual: string;
  @IsString() @MinLength(6)  password_nuevo: string;
}
