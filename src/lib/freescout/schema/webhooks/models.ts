import { z } from 'zod'
import { createPaginatedSchema, NullableStringSchema, ResourceIdSchema } from '../shared'

export const WebhookSchema = z.looseObject({
  id: ResourceIdSchema,
  url: z.string(),
  events: z.array(z.string()),
  lastRunTime: NullableStringSchema,
  lastRunError: NullableStringSchema
})

export const PaginatedWebhooksSchema = createPaginatedSchema('webhooks', WebhookSchema)

export type Webhook = z.infer<typeof WebhookSchema>
export type PaginatedWebhooks = z.infer<typeof PaginatedWebhooksSchema>
