import { z } from 'zod'

export const PaginationSchema = z.looseObject({
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  number: z.number()
})

export const ResourceIdSchema = z.number().int().positive()
export const PageSchema = z.number().int().positive()
export const PageSizeSchema = z.number().int().positive()
export const IsoDateTimeSchema = z.iso.datetime()
export const NullableStringSchema = z.string().nullish()

export function createPaginatedSchema<Key extends string, Schema extends z.ZodTypeAny>(key: Key, schema: Schema) {
  return z.looseObject({
    _embedded: z.record(z.literal(key), z.array(schema)),
    page: PaginationSchema
  })
}

export type Pagination = z.infer<typeof PaginationSchema>
