import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { buildExpiredSessionCookie, buildSessionCookie } from '../utils/session-cookie.js';

@Controller('/api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  async register(@Body() body: { name?: string; password?: string }, @Res({ passthrough: true }) reply: FastifyReply) {
    const session = await this.authService.register(body.name ?? '', body.password ?? '');
    reply.header('set-cookie', buildSessionCookie(session.token, this.authService.getNodeEnv()));
    return { user: session.user };
  }

  @Post('/login')
  async login(@Body() body: { name?: string; password?: string }, @Res({ passthrough: true }) reply: FastifyReply) {
    const session = await this.authService.login(body.name ?? '', body.password ?? '');
    reply.header('set-cookie', buildSessionCookie(session.token, this.authService.getNodeEnv()));
    return { user: session.user };
  }

  @Post('/logout')
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.authService.logout(request.headers.cookie);
    reply.header('set-cookie', buildExpiredSessionCookie());
    return { ok: true };
  }

  @Get('/me')
  async me(@Req() request: FastifyRequest) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return { user };
  }
}
