import { z } from 'zod'

/**
 * Built-in webhook event names documented by FreeScout. Third-party modules may register additional
 * events, so the schema does not reject unknown values; FreeScout itself silently discards them.
 * Surface this list in tool descriptions / UI hints to steer callers toward the documented set.
 */
export const KNOWN_WEBHOOK_EVENTS = [
  'convo.assigned',
  'convo.created',
  'convo.deleted',
  'convo.deleted_forever',
  'convo.restored',
  'convo.moved',
  'convo.status',
  'convo.customer.reply.created',
  'convo.agent.reply.created',
  'convo.note.created',
  'customer.created',
  'customer.updated'
] as const

export type KnownWebhookEvent = (typeof KNOWN_WEBHOOK_EVENTS)[number]

export const CreateWebhookBodySchema = z
  .object({
    url: z.url(),
    events: z.union([z.array(z.string()), z.string()])
  })
  .strict()

export type CreateWebhookBody = z.infer<typeof CreateWebhookBodySchema>
