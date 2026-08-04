import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService }    from './auth.service';
import { JwtAuthGuard }   from './guards/jwt.guard';
import { CurrentUser }    from '../common/decorators/current-user.decorator';
import { Public }         from '../common/decorators/roles.decorator';
import { RegisterDto, LoginDto, RefreshDto, ForgotPasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Post('register')
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Public() @Post('login')
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Public() @Post('refresh')
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto); }

  @Post('logout')
  logout(@CurrentUser() user: any, @Req() req: any) {
    const token = req.body?.refresh_token;
    return this.auth.logout(user.id, token);
  }

  @Get('me')
  me(@CurrentUser() user: any) { return this.auth.me(user.id); }

  @Public() @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto); }
}
