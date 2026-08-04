import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto, ForgotPasswordDto } from './dto/auth.dto';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: any;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: any;
    }>;
    refresh(dto: RefreshDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(user: any, req: any): Promise<{
        ok: boolean;
    }>;
    me(user: any): Promise<any>;
    forgot(dto: ForgotPasswordDto): Promise<{
        ok: boolean;
        message: string;
    }>;
}
