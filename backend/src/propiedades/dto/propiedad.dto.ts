import { IsString, IsOptional, IsIn, IsInt, Min, Max, MinLength, MaxLength,
         IsArray, ArrayMaxSize, Matches, IsBoolean, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_FOTOS } from '../../common/utils/uploads';
import { normalizarCiudad, normalizarVideo } from '../../common/utils/media-urls';

export const TIPOS    = ['apartamento', 'casa', 'villa', 'loft', 'estudio'];
export const LISTINGS = ['rent', 'sale', 'rent_sale', 'vacation'];

// Foto válida: URL http(s) externa o archivo subido al servidor (/uploads/...)
const FOTO_REGEX = /^(https?:\/\/\S+|\/uploads\/[\w.-]+)$/;
const URL_OPTS   = { protocols: ['http', 'https'], require_protocol: true };
const COSTO_MAX  = 50_000_000;   // tope de administración / servicios mensuales (COP)
// Cualquier ciudad o municipio de LATAM: letras (con tildes/ñ), espacios y . , ' ( ) -
const CIUDAD_REGEX = /^[\p{L}][\p{L}\s.,'’()-]*$/u;
const CIUDAD_MSG   = { message: 'Ciudad inválida: usa solo letras y espacios' };

export const CIERRE_TIPOS    = ['arriendo', 'compra'];
export const CIERRE_ACCIONES = ['confirmar', 'rechazar', 'liberar'];

// Inquilino: pide cerrar el arriendo o la compra de una propiedad
export class SolicitarCierreDto {
  @IsIn(CIERRE_TIPOS) tipo: string;
}

// Arrendador: confirma o rechaza la solicitud, o vuelve a publicar una propiedad cerrada
export class ResolverCierreDto {
  @IsIn(CIERRE_ACCIONES) accion: string;
}

export class CreatePropiedadDto {
  @IsString() @MinLength(3) @MaxLength(80)  titulo: string;
  @Transform(({ value }) => normalizarCiudad(value))
  @IsString() @MinLength(2) @MaxLength(60) @Matches(CIUDAD_REGEX, CIUDAD_MSG) ciudad: string;
  @IsOptional() @IsString() @MaxLength(80)  barrio?: string;
  @IsIn(TIPOS)                              tipo: string;
  @IsOptional() @IsIn(LISTINGS)             listing?: string;
  @IsInt() @Min(0)                          precio: number;
  @IsOptional() @IsInt() @Min(1) @Max(6)    estrato?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)   habitaciones?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)   banos?: number;
  @IsInt() @Min(1)                          metros: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)   parqueaderos?: number;
  @IsOptional() @IsInt() @Min(0) @Max(COSTO_MAX) administracion?: number;
  @IsOptional() @IsInt() @Min(0) @Max(COSTO_MAX) serviciosEst?: number;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_FOTOS)
  @Matches(FOTO_REGEX, { each: true, message: 'Cada foto debe ser una URL http(s) o un archivo subido' })
  fotos?: string[];

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  comodidades?: string[];

  // Enlaces de YouTube (watch, youtu.be, shorts…) se guardan como https://www.youtube.com/embed/ID
  @Transform(({ value }) => normalizarVideo(value))
  @IsOptional() @IsUrl(URL_OPTS, { message: 'El video debe ser una URL http(s)' })        video?: string;
  @IsOptional() @IsBoolean()                                                             tourVirtual?: boolean;
  @IsOptional() @IsUrl(URL_OPTS, { message: 'El tour virtual debe ser una URL http(s)' }) tourUrl?: string;
  @IsOptional() @IsString() @MaxLength(40)                                               tourTipo?: string;
  @IsOptional() @IsBoolean()                                                             mapa2d?: boolean;
}

export class UpdatePropiedadDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(80)  titulo?: string;
  @Transform(({ value }) => normalizarCiudad(value))
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) @Matches(CIUDAD_REGEX, CIUDAD_MSG) ciudad?: string;
  @IsOptional() @IsString() @MaxLength(80)                barrio?: string;
  @IsOptional() @IsIn(TIPOS)                              tipo?: string;
  @IsOptional() @IsIn(LISTINGS)                           listing?: string;
  @IsOptional() @IsInt() @Min(0)                          precio?: number;
  @IsOptional() @IsInt() @Min(1) @Max(6)                  estrato?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)                 habitaciones?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)                 banos?: number;
  @IsOptional() @IsInt() @Min(1)                          metros?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50)                 parqueaderos?: number;
  // null borra el valor (vuelve a "no informada" / estimado)
  @IsOptional() @IsInt() @Min(0) @Max(COSTO_MAX)          administracion?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(COSTO_MAX)          serviciosEst?: number | null;
  @IsOptional() @IsString() @MaxLength(2000)              descripcion?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_FOTOS)
  @Matches(FOTO_REGEX, { each: true, message: 'Cada foto debe ser una URL http(s) o un archivo subido' })
  fotos?: string[];

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  comodidades?: string[];

  // Enlaces de YouTube (watch, youtu.be, shorts…) se guardan como https://www.youtube.com/embed/ID
  @Transform(({ value }) => normalizarVideo(value))
  @IsOptional() @IsUrl(URL_OPTS, { message: 'El video debe ser una URL http(s)' })        video?: string;
  @IsOptional() @IsBoolean()                                                             tourVirtual?: boolean;
  @IsOptional() @IsUrl(URL_OPTS, { message: 'El tour virtual debe ser una URL http(s)' }) tourUrl?: string;
  @IsOptional() @IsString() @MaxLength(40)                                               tourTipo?: string;
  @IsOptional() @IsBoolean()                                                             mapa2d?: boolean;
}
