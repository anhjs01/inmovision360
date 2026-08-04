import { Module }          from '@nestjs/common';
import { JwtModule }       from '@nestjs/jwt';
import { PassportModule }  from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService }     from './auth.service';
import { AuthController }  from './auth.controller';
import { JwtStrategy }     from './strategies/jwt.strategy';
import { JwtAuthGuard, RolesGuard } from './guards/jwt.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:     cfg.get('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRY', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports:     [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
