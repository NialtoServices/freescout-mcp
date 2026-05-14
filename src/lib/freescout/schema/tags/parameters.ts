import { z } from 'zod'
import { PageSchema, PageSizeSchema } from '../shared'

export const ListTagsParametersSchema = z
  .object({
    conversationId: z.number().optional(),
    page: PageSchema.optional(),
    pageSize: PageSizeSchema.optional()
  })
  .strict()

export type ListTagsParameters = z.infer<typeof ListTagsParametersSchema>
