import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { Role } from '../generated/prisma/enums';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Roles(Role.HEAD)
  @Get('users')
  listUsers(@Query('role') role?: Role) {
    return this.authService.listUsers(role);
  }
}
