import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendMensajeDto {
  @IsString()                                              destinatario_id: string;
  @IsString()                                              prop_id: string;
  @IsString() @MinLength(1) @MaxLength(2000)               texto: string;
}
