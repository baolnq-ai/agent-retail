import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Cart, CartItem, Order, PaymentIntent } from '../models/commerce.models.js';
import { CatalogService } from './catalog.service.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class CommerceService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly prisma: PrismaService,
  ) {}

  async getCart(cartId = 'default'): Promise<Cart> {
    const cart = await this.prisma.client.cart.upsert({
      where: { id: cartId },
      update: {},
      create: { id: cartId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    return toCart(cart);
  }

  async getCurrentCart(userId: string): Promise<Cart> {
    const existing = await this.prisma.client.cart.findFirst({
      where: { userId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing) return toCart(existing);

    const cart = await this.prisma.client.cart.create({
      data: { id: `user-cart-${userId}-${Date.now()}`, userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    return toCart(cart);
  }

  async addItemToCurrentCart(userId: string, productId: string, quantity: number): Promise<Cart> {
    const cart = await this.getCurrentCart(userId);
    return this.addItem(cart.id, productId, quantity, userId);
  }

  async clearCurrentCart(userId: string): Promise<Cart> {
    const cart = await this.getCurrentCart(userId);
    await this.prisma.client.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.recalculateCart(cart.id);
  }

  async removeCurrentCartItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getCurrentCart(userId);
    await this.prisma.client.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return this.recalculateCart(cart.id);
  }

  async updateCurrentCartItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    if (quantity < 0) throw new Error('Invalid quantity');
    if (quantity === 0) return this.removeCurrentCartItem(userId, productId);

    const product = await this.catalogService.getProduct(productId);
    if (!product) throw new NotFoundException('Product not found');
    if (quantity > product.inventory) throw new Error('Invalid quantity');

    const cart = await this.getCurrentCart(userId);
    await this.prisma.client.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity, lineTotal: product.price * quantity },
      create: { cartId: cart.id, productId, quantity, unitPrice: product.price, lineTotal: product.price * quantity },
    });
    return this.recalculateCart(cart.id);
  }

  async incrementCurrentCartItem(userId: string, productId: string, delta: number): Promise<Cart> {
    if (delta < 1) throw new Error('Invalid quantity');
    const cart = await this.getCurrentCart(userId);
    const currentQuantity = cart.items.find((item) => item.productId === productId)?.quantity ?? 0;
    return this.updateCurrentCartItem(userId, productId, currentQuantity + delta);
  }

  async decrementCurrentCartItem(userId: string, productId: string, delta: number): Promise<Cart> {
    if (delta < 1) throw new Error('Invalid quantity');
    const cart = await this.getCurrentCart(userId);
    const currentQuantity = cart.items.find((item) => item.productId === productId)?.quantity ?? 0;
    if (currentQuantity === 0) throw new Error('Product is not in cart');
    return this.updateCurrentCartItem(userId, productId, Math.max(0, currentQuantity - delta));
  }

  async addItem(cartId: string, productId: string, quantity: number, userId?: string): Promise<Cart> {
    const product = await this.catalogService.getProduct(productId);
    if (!product) throw new NotFoundException('Product not found');
    if (quantity < 1 || quantity > product.inventory) throw new Error('Invalid quantity');

    const cart = await this.prisma.client.cart.upsert({ where: { id: cartId }, update: userId ? { userId } : {}, create: { id: cartId, userId } });
    const existing = await this.prisma.client.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > product.inventory) throw new Error('Invalid quantity');

    await this.prisma.client.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity: nextQuantity, lineTotal: product.price * nextQuantity },
      create: { cartId: cart.id, productId, quantity, unitPrice: product.price, lineTotal: product.price * quantity },
    });

    return this.recalculateCart(cartId);
  }

  async createOrder(cartId: string, idempotencyKey: string): Promise<Order> {
    const cached = await this.getIdempotentResponse<Order>('order', idempotencyKey);
    if (cached) return cached;

    const cart = await this.recalculateCart(cartId);
    if (cart.items.length === 0) throw new Error('Cart is empty');

    const order = await this.prisma.client.order.create({
      data: { cartId, status: 'pending_confirmation', total: cart.grandTotal, items: cart.items as unknown as Prisma.InputJsonValue },
    });
    const response = toOrder(order);
    await this.saveIdempotentResponse('order', idempotencyKey, response);
    return response;
  }

  async confirmOrder(orderId: string): Promise<Order> {
    const order = await this.prisma.client.order.update({ where: { id: orderId }, data: { status: 'confirmed' } }).catch(() => undefined);
    if (!order) throw new NotFoundException('Order not found');
    return toOrder(order);
  }

  async createPaymentIntent(orderId: string, idempotencyKey: string): Promise<PaymentIntent> {
    const cached = await this.getIdempotentResponse<PaymentIntent>('payment', idempotencyKey);
    if (cached) return cached;

    const order = await this.prisma.client.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'confirmed') throw new Error('Order must be confirmed before payment');

    const payment = await this.prisma.client.paymentIntent.create({
      data: { orderId, provider: 'mock', status: 'created', amount: order.total, paymentUrl: `https://payment.local/${orderId}` },
    });
    const response = toPaymentIntent(payment);
    await this.saveIdempotentResponse('payment', idempotencyKey, response);
    return response;
  }

  private async recalculateCart(cartId: string): Promise<Cart> {
    const cart = await this.prisma.client.cart.findUnique({ where: { id: cartId }, include: { items: { orderBy: { createdAt: 'asc' } } } });
    if (!cart) throw new NotFoundException('Cart not found');

    const subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const updated = await this.prisma.client.cart.update({
      where: { id: cartId },
      data: { version: { increment: 1 }, subtotal, grandTotal: subtotal },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    return toCart(updated);
  }

  private async getIdempotentResponse<T>(scope: string, key: string): Promise<T | undefined> {
    const row = await this.prisma.client.idempotencyKey.findUnique({ where: { scope_key: { scope, key } } });
    return row?.responseJson as T | undefined;
  }

  private async saveIdempotentResponse(scope: string, key: string, response: unknown): Promise<void> {
    await this.prisma.client.idempotencyKey.create({ data: { scope, key, responseJson: response as Prisma.InputJsonValue } });
  }
}

function toCart(cart: { id: string; version: number; status: string; subtotal: number; grandTotal: number; items: CartItem[] }): Cart {
  const items = cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    id: cart.id,
    version: cart.version,
    status: cart.status === 'ordered' ? 'ordered' : 'active',
    items,
    subtotal,
    grandTotal: subtotal,
  };
}

function toOrder(order: { id: string; cartId: string; status: string; total: number; items: unknown }): Order {
  return {
    id: order.id,
    cartId: order.cartId,
    status: order.status === 'confirmed' ? 'confirmed' : 'pending_confirmation',
    total: order.total,
    items: order.items as CartItem[],
  };
}

function toPaymentIntent(payment: { id: string; orderId: string; provider: string; status: string; amount: number; paymentUrl: string }): PaymentIntent {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: 'mock',
    status: 'created',
    amount: payment.amount,
    paymentUrl: payment.paymentUrl,
  };
}
