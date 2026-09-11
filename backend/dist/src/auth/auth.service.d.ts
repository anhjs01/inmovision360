import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshDto, ForgotPasswordDto, CompleteProfileDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    private googleClient;
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
    googleLogin(idToken: string, mode?: string): Promise<{
        needsProfile: boolean;
        access_token: string;
        refresh_token: string;
        user: any;
    }>;
    completeProfile(userId: string, dto: CompleteProfileDto): Promise<any>;
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
