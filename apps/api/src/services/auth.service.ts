import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { loadEnvironment } from '../config/environment.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createSessionToken, hashSessionToken, readCookie, sessionCookieName, sessionMaxAgeSeconds } from '../utils/session-cookie.js';
import { PrismaService } from './prisma.service.js';

export interface AuthUser {
  id: string;
  name: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  private readonly environment = loadEnvironment();

  constructor(private readonly prisma: PrismaService) {}

  async register(name: string, password: string): Promise<AuthSession> {
    const normalizedName = validateName(name);
    const passwordHash = await hashPassword(validatePassword(password));

    const user = await this.prisma.client.user.create({
      data: { name: normalizedName, passwordHash },
      select: { id: true, name: true },
    }).catch((error: unknown) => {
      if (isUniqueConstraintError(error)) throw new ConflictException('name is already registered');
      throw error;
    });

    return this.createSession(user);
  }

  async login(name: string, password: string): Promise<AuthSession> {
    const normalizedName = validateName(name);
    const user = await this.prisma.client.user.findUnique({ where: { name: normalizedName } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('invalid credentials');
    }

    return this.createSession({ id: user.id, name: user.name });
  }

  async logout(cookieHeader: string | undefined): Promise<void> {
    const token = readCookie(cookieHeader, sessionCookieName);
    if (!token) return;
    await this.prisma.client.userSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  async getUserFromCookie(cookieHeader: string | undefined): Promise<AuthUser | undefined> {
    const token = readCookie(cookieHeader, sessionCookieName);
    if (!token) return undefined;

    const session = await this.prisma.client.userSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await this.prisma.client.userSession.delete({ where: { id: session.id } });
      return undefined;
    }

    return session.user;
  }

  getNodeEnv(): string {
    return this.environment.nodeEnv;
  }

  private async createSession(user: AuthUser): Promise<AuthSession> {
    const token = createSessionToken();
    await this.prisma.client.$transaction([
      this.prisma.client.userSession.deleteMany({ where: { userId: user.id } }),
      this.prisma.client.userSession.create({
        data: {
          tokenHash: hashSessionToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + sessionMaxAgeSeconds * 1000),
        },
      }),
    ]);
    return { token, user };
  }
}

function validateName(value: string): string {
  const name = value.trim().toLocaleLowerCase('vi-VN');
  if (!/^[a-z0-9_]{3,32}$/.test(name)) {
    throw new BadRequestException('name must be 3-32 characters and contain only lowercase letters, numbers, or underscore');
  }
  return name;
}

function validatePassword(value: string): string {
  if (value.length < 8 || value.length > 128) {
    throw new BadRequestException('password must be 8-128 characters');
  }
  return value;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}
