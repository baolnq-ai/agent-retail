import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import type { CartAgentLedgerDraft } from './cart-agent-private-tool.executor.js';

export interface CartAgentLedgerPersistenceResult {
  status: 'created' | 'replayed';
  idempotencyScope?: string;
  eventCreated: boolean;
  responseJson?: unknown;
}

export interface CartAgentLedgerClient {
  idempotencyKey: {
    findUnique(args: { where: { scope_key: { scope: string; key: string } } }): Promise<{ responseJson: unknown } | null>;
    create(args: { data: { scope: string; key: string; responseJson: unknown } }): Promise<unknown>;
  };
  cartEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

@Injectable()
export class CartAgentLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async persist(draft: CartAgentLedgerDraft, responseJson: unknown): Promise<CartAgentLedgerPersistenceResult> {
    return persistCartAgentLedgerDraft(this.prisma.client as unknown as CartAgentLedgerClient, draft, responseJson);
  }
}

export async function persistCartAgentLedgerDraft(
  client: CartAgentLedgerClient,
  draft: CartAgentLedgerDraft,
  responseJson: unknown,
): Promise<CartAgentLedgerPersistenceResult> {
  const idempotencyScope = draft.idempotencyKey ? cartAgentIdempotencyScope(draft.toolName) : undefined;
  if (draft.idempotencyKey && idempotencyScope) {
    const cached = await client.idempotencyKey.findUnique({ where: { scope_key: { scope: idempotencyScope, key: draft.idempotencyKey } } });
    if (cached) {
      return { status: 'replayed', idempotencyScope, eventCreated: false, responseJson: cached.responseJson };
    }
  }

  await client.cartEvent.create({
    data: {
      cartId: draft.cartId,
      userId: draft.userId,
      requestId: draft.requestId,
      idempotencyKey: draft.idempotencyKey,
      type: draft.type,
      productId: draft.productId,
      quantityBefore: draft.quantityBefore,
      quantityAfter: draft.quantityAfter,
      cartVersionBefore: draft.cartVersionBefore,
      cartVersionAfter: draft.cartVersionAfter,
      subtotalBefore: draft.subtotalBefore,
      subtotalAfter: draft.subtotalAfter,
      actorType: draft.actorType,
      actorAgent: draft.actorAgent,
      toolName: draft.toolName,
      sourceMessage: draft.sourceMessage,
      metadata: { preparedBy: 'cart-agent-private-tool-executor' } as Prisma.InputJsonValue,
    },
  });

  if (draft.idempotencyKey && idempotencyScope) {
    await client.idempotencyKey.create({ data: { scope: idempotencyScope, key: draft.idempotencyKey, responseJson: responseJson as Prisma.InputJsonValue } });
  }

  return { status: 'created', idempotencyScope, eventCreated: true, responseJson };
}

export function cartAgentIdempotencyScope(toolName: string): string {
  return `cart-agent:${toolName}`;
}
