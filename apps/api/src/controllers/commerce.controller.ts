import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { CommerceService } from '../services/commerce.service.js';

@Controller('/api/v1')
export class CommerceController {
  constructor(
    private readonly commerceService: CommerceService,
    private readonly authService: AuthService,
  ) {}

  @Get('/cart/current')
  async getCurrentCart(@Req() request: FastifyRequest) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return this.commerceService.getCurrentCart(user.id);
  }

  @Post('/cart/current/items')
  async addCurrentItem(@Req() request: FastifyRequest, @Body() body: { productId?: string; quantity?: number }) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    if (!body.productId || typeof body.quantity !== 'number') {
      throw new Error('productId and quantity are required');
    }
    return this.commerceService.addItemToCurrentCart(user.id, body.productId, body.quantity);
  }

  @Delete('/cart/current/items')
  async clearCurrentCart(@Req() request: FastifyRequest) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return this.commerceService.clearCurrentCart(user.id);
  }

  @Delete('/cart/current/items/:productId')
  async removeCurrentCartItem(@Req() request: FastifyRequest, @Param('productId') productId: string) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return this.commerceService.removeCurrentCartItem(user.id, productId);
  }

  @Patch('/cart/current/items/:productId')
  async updateCurrentCartItem(@Req() request: FastifyRequest, @Param('productId') productId: string, @Body() body: { quantity?: number }) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    if (typeof body.quantity !== 'number') {
      throw new Error('quantity is required');
    }
    return this.commerceService.updateCurrentCartItem(user.id, productId, body.quantity);
  }

  @Get('/cart/:cartId')
  async getCart(@Param('cartId') cartId: string) {
    return this.commerceService.getCart(cartId);
  }

  @Post('/cart/:cartId/items')
  async addItem(@Param('cartId') cartId: string, @Body() body: { productId?: string; quantity?: number }) {
    if (!body.productId || typeof body.quantity !== 'number') {
      throw new Error('productId and quantity are required');
    }
    return this.commerceService.addItem(cartId, body.productId, body.quantity);
  }

  @Post('/orders')
  async createOrder(@Body() body: { cartId?: string }, @Headers('idempotency-key') idempotencyKey = '') {
    if (!body.cartId || !idempotencyKey) {
      throw new Error('cartId and idempotency-key are required');
    }
    return this.commerceService.createOrder(body.cartId, idempotencyKey);
  }

  @Post('/orders/:orderId/confirm')
  async confirmOrder(@Param('orderId') orderId: string) {
    return this.commerceService.confirmOrder(orderId);
  }

  @Post('/payments/intents')
  async createPaymentIntent(@Body() body: { orderId?: string }, @Headers('idempotency-key') idempotencyKey = '') {
    if (!body.orderId || !idempotencyKey) {
      throw new Error('orderId and idempotency-key are required');
    }
    return this.commerceService.createPaymentIntent(body.orderId, idempotencyKey);
  }
}
