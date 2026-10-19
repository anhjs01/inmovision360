import { IsString, IsOptional, IsIn, IsInt, Min, Max, MinLength, MaxLength,
         IsArray, ArrayMaxSize, Matches, IsBoolean, IsUrl } from 'class-validator';
import { MAX_FOTOS } from '../../common/utils/uploads';

export const TIPOS    = ['apartamento', 'casa', 'villa', 'loft', 'estudio'];
export const LISTINGS = ['rent', 'sale', 'rent_sale', 'vacation'];

// Foto válida: URL http(s) externa o archivo subido al servidor (/uploads/...)
const FOTO_REGEX = /^(https?:\/\/\S+|\/uploads\/[\w.-]+)$/;
const URL_OPTS   = { protocols: ['http', 'https'], require_protocol: true };

export class CreatePropiedadDto {
  @IsString() @MinLength(3) @MaxLength(80)  titulo: string;
  @IsString() @MinLength(2) @MaxLength(60)  ciudad: string;
  @IsOptional() @IsString() @MaxLength(80)  barrio?: string;
  @IsIn(TIPOS)                              tipo: string;
  @IsOptional() @IsIn(LISTINGS)             listing?: string;
  @IsInt() @Min(0)                          precio: number;
  @IsOptional() @IsInt() @Min(1) @Max(6)    estrato?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)   habitaciones?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)   banos?: number;
  @IsInt() @Min(1)                          metros: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)   parqueaderos?: number;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_FOTOS)
  @Matches(FOTO_REGEX, { each: true, message: 'Cada foto debe ser una URL http(s) o un archivo subido' })
  fotos?: string[];

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  comodidades?: string[];

  @IsOptional() @IsUrl(URL_OPTS, { message: 'El video debe ser una URL http(s)' })        video?: string;
  @IsOptional() @IsBoolean()                                                             tourVirtual?: boolean;
  @IsOptional() @IsUrl(URL_OPTS, { message: 'El tour virtual debe ser una URL http(s)' }) tourUrl?: string;
  @IsOptional() @IsString() @MaxLength(40)                                               tourTipo?: string;
  @IsOptional() @IsBoolean()                                                             mapa2d?: boolean;
}

export class UpdatePropiedadDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(80)  titulo?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60)  ciudad?: string;
  @IsOptional() @IsString() @MaxLength(80)                barrio?: string;
  @IsOptional() @IsIn(TIPOS)                              tipo?: string;
  @IsOptional() @IsIn(LISTINGS)                           listing?: string;
  @IsOptional() @IsInt() @Min(0)                          precio?: number;
  @IsOptional() @IsInt() @Min(1) @Max(6)                  estrato?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)                 habitaciones?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)                 banos?: number;
  @IsOptional() @IsInt() @Min(1)                          metros?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)                 parqueaderos?: number;
  @IsOptional() @IsString() @MaxLength(2000)              descripcion?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_FOTOS)
  @Matches(FOTO_REGEX, { each: true, message: 'Cada foto debe ser una URL http(s) o un archivo subido' })
  fotos?: string[];

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  comodidades?: string[];

  @IsOptional() @IsUrl(URL_OPTS, { message: 'El video debe ser una URL http(s)' })        video?: string;
  @IsOptional() @IsBoolean()                                                             tourVirtual?: boolean;
  @IsOptional() @IsUrl(URL_OPTS, { message: 'El tour virtual debe ser una URL http(s)' }) tourUrl?: string;
  @IsOptional() @IsString() @MaxLength(40)                                               tourTipo?: string;
  @IsOptional() @IsBoolean()                                                             mapa2d?: boolean;
}
