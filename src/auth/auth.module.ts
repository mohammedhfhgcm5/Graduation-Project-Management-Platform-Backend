import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

const DEFAULT_JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

function parseJwtExpiryToSeconds(value: string | undefined): number {
  if (!value) {
    return DEFAULT_JWT_EXPIRY_SECONDS;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) {
    return DEFAULT_JWT_EXPIRY_SECONDS;
  }

  const amount = Number.parseInt(match[1], 10);
  const multiplier = units[match[2].toLowerCase()];

  return amount * multiplier;
}

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = parseJwtExpiryToSeconds(
          configService.get<string>('JWT_EXPIRES_IN'),
        );

        return {
          secret: configService.get<string>('JWT_SECRET') ?? 'change_me',
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
