import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: SafeUser; accessToken: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        department: dto.department,
      },
    });

    return {
      user: this.toSafeUser(user),
      accessToken: await this.signToken(
        user.id,
        user.email,
        user.name,
        user.role,
      ),
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: SafeUser }> {
    const user = await this.validateUser(dto.email, dto.password);

    return {
      accessToken: await this.signToken(
        user.id,
        user.email,
        user.name,
        user.role,
      ),
      user: this.toSafeUser(user),
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return user;
  }

  private async signToken(
    userId: string,
    email: string,
    name: string,
    role: AuthUser['role'],
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      name,
      role,
    } satisfies AuthUser);
  }

  private toSafeUser(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
