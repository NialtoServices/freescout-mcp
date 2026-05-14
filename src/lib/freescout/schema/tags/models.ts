import { z } from 'zod'
import { createPaginatedSchema, ResourceIdSchema } from '../shared'

export const TagSchema = z.looseObject({
  id: ResourceIdSchema,
  name: z.string(),
  counter: z.number().nullish(),
  color: z.number().nullish()
})

export const PaginatedTagsSchema = createPaginatedSchema('tags', TagSchema)

export type Tag = z.infer<typeof TagSchema>
export type PaginatedTags = z.infer<typeof PaginatedTagsSchema>
