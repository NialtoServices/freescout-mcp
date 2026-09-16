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

/**
 * A list of email recipients (`to`, `cc`, `bcc`).
 *
 * FreeScout de-duplicates and filters these with `array_unique` / `array_diff`, which preserve keys, so a
 * list with a gap in its indexes is JSON-encoded as an object (`{"0": "a@example.com", "2": "b@example.com"}`)
 * rather than an array. Both shapes are accepted and normalised to an array of addresses in their original order.
 *
 * The final pipe gives the schema a plain string-array output. MCP publishes each tool's output schema as JSON
 * Schema in output mode, which cannot represent a bare transform.
 */
export const RecipientListSchema = z
  .union([z.array(z.string()), z.record(z.string(), z.string()).transform((recipients) => Object.values(recipients))])
  .pipe(z.array(z.string()))

export function createPaginatedSchema<Key extends string, Schema extends z.ZodTypeAny>(key: Key, schema: Schema) {
  return z.looseObject({
    _embedded: z.record(z.literal(key), z.array(schema)),
    page: PaginationSchema
  })
}

export type Pagination = z.infer<typeof PaginationSchema>
