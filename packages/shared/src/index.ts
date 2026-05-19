import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const messageBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), version: z.literal(1), content: z.string() }),
  z.object({ type: z.literal('quick_replies'), version: z.literal(1), items: z.array(z.string()) }),
]);

export type MessageBlock = z.infer<typeof messageBlockSchema>;
