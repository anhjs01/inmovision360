export declare class RegisterDto {
    nombre: string;
    apellido?: string;
    email: string;
    password: string;
    rol: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RefreshDto {
    refresh_token: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    password: string;
}
export declare class GoogleLoginDto {
    idToken: string;
    mode?: string;
}
export declare class CompleteProfileDto {
    nombre: string;
    apellido?: string;
    telefono: string;
    rol: string;
}
