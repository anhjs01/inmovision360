import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshDto, ForgotPasswordDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
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
    logout(userId: string, refreshToken?: string): Promise<{
        ok: boolean;
    }>;
    me(userId: string): Promise<any>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        ok: boolean;
        message: string;
    }>;
    private issueTokens;
}
