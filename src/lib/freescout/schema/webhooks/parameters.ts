import { z } from 'zod'
import { PageSchema, PageSizeSchema } from '../shared'

export const ListWebhooksParametersSchema = z
  .object({
    page: PageSchema.optional(),
    pageSize: PageSizeSchema.optional()
  })
  .strict()

export type ListWebhooksParameters = z.infer<typeof ListWebhooksParametersSchema>
