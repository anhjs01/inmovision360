import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()  nombre:   string;
  @IsString()  @IsOptional() apellido?: string;
  @IsEmail()   email:    string;
  @IsString()  @MinLength(6) password: string;
  @IsIn(['arrendador','inquilino']) rol: string;
}

export class LoginDto {
  @IsEmail()  email:    string;
  @IsString() password: string;
}

export class RefreshDto {
  @IsString() refresh_token: string;
}

export class ForgotPasswordDto {
  @IsEmail() email: string;
}

export class ResetPasswordDto {
  @IsString() token:    string;
  @IsString() @MinLength(6) password: string;
}
